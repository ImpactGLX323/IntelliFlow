import logging
import os
import re
from pathlib import Path
from typing import TYPE_CHECKING, Any

from google.cloud import firestore
from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
from pydantic import BaseModel, Field

if TYPE_CHECKING:
    from llama_index.core.schema import Document
    from llama_index.embeddings.openai import OpenAIEmbedding
    from llama_index.node_parser.docling import DoclingNodeParser
    from llama_index.readers.docling import DoclingReader
    from llama_index_vector_store_firestore import FirestoreVectorStore

logger = logging.getLogger(__name__)


class IndexedDocumentResult(BaseModel):
    file_name: str
    authority: str
    country: str = "MY"
    category: str
    nodes_indexed: int


class IngestionSummary(BaseModel):
    source_directory: str
    collection_name: str
    total_files_discovered: int
    indexed_documents: int
    indexed_nodes: int
    embedding_dimensions: int
    failed_files: list[str] = Field(default_factory=list)
    documents: list[IndexedDocumentResult] = Field(default_factory=list)


class FirestoreRAGIngestionService:
    def __init__(self) -> None:
        backend_root = Path(__file__).resolve().parents[1]
        repo_root = Path(__file__).resolve().parents[2]
        self.embedding_model = os.getenv("RAG_EMBEDDING_MODEL", "text-embedding-3-large")
        self.embedding_dimensions = int(os.getenv("RAG_EMBEDDING_DIMENSIONS", "2048"))
        self.firestore_project = os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("FIREBASE_PROJECT_ID")
        self.default_collection_name = os.getenv("RAG_FIRESTORE_COLLECTION", "rag_embeddings")
        self.default_source_directory = os.getenv(
            "RAG_SOURCE_DIRECTORY",
            str(backend_root / "docs" / "official_docs"),
        )
        self.fallback_source_directory = repo_root / "frontend" / "docs" / "official_docs"
        self.reader: Any | None = None
        self.node_parser: Any | None = None
        self.embed_model: Any | None = None

    def ingest_directory(self, source_directory: str | None = None, collection_name: str | None = None) -> IngestionSummary:
        self._ensure_runtime_dependencies()
        source_path = Path(source_directory or self.default_source_directory).expanduser().resolve()
        if (not source_directory) and (not source_path.exists()) and self.fallback_source_directory.exists():
            source_path = self.fallback_source_directory.resolve()
        if not source_path.exists() or not source_path.is_dir():
            raise FileNotFoundError(f"Source directory not found: {source_path}")

        pdf_paths = sorted(source_path.rglob("*.pdf"))
        target_collection = collection_name or self.default_collection_name

        summary = IngestionSummary(
            source_directory=str(source_path),
            collection_name=target_collection,
            total_files_discovered=len(pdf_paths),
            indexed_documents=0,
            indexed_nodes=0,
            embedding_dimensions=self.embedding_dimensions,
        )

        if not pdf_paths:
            return summary

        from llama_index.core import StorageContext, VectorStoreIndex

        vector_store = self._build_vector_store(target_collection)
        storage_context = StorageContext.from_defaults(vector_store=vector_store)

        for pdf_path in pdf_paths:
            try:
                documents = self._load_pdf_documents(pdf_path)
                if not documents:
                    logger.warning("Docling returned no documents for %s", pdf_path)
                    summary.failed_files.append(str(pdf_path))
                    continue

                tagged_documents = [self._tag_document(doc, pdf_path) for doc in documents]
                nodes = self.node_parser.get_nodes_from_documents(tagged_documents)
                self._validate_node_embeddings(nodes)

                VectorStoreIndex(
                    nodes=nodes,
                    storage_context=storage_context,
                    embed_model=self.embed_model,
                    transformations=[],
                    show_progress=False,
                )

                document_metadata = tagged_documents[0].metadata
                summary.documents.append(
                    IndexedDocumentResult(
                        file_name=pdf_path.name,
                        authority=document_metadata["authority"],
                        country=document_metadata["country"],
                        category=document_metadata["category"],
                        nodes_indexed=len(nodes),
                    )
                )
                summary.indexed_documents += 1
                summary.indexed_nodes += len(nodes)
            except Exception as exc:
                logger.exception("Failed to ingest PDF %s: %s", pdf_path, exc)
                summary.failed_files.append(str(pdf_path))

        return summary

    def _build_vector_store(self, collection_name: str) -> Any:
        from llama_index_vector_store_firestore import FirestoreVectorStore

        if not self.firestore_project:
            raise RuntimeError(
                "GOOGLE_CLOUD_PROJECT or FIREBASE_PROJECT_ID must be set for Firestore vector storage."
            )

        firestore_client = firestore.Client(project=self.firestore_project)
        return FirestoreVectorStore(
            firestore_client=firestore_client,
            collection_name=collection_name,
            distance_strategy=DistanceMeasure.COSINE,
        )

    def _load_pdf_documents(self, pdf_path: Path) -> list[Any]:
        if self.reader is None:
            raise RuntimeError("Docling reader not initialized.")
        from llama_index.core.schema import Document

        loaded = self.reader.load_data(file_path=str(pdf_path))
        return [doc for doc in loaded if isinstance(doc, Document)]

    def _tag_document(self, document: Any, pdf_path: Path) -> Any:
        metadata = dict(document.metadata or {})
        inferred = self._infer_metadata(pdf_path)
        metadata.update(
            {
                "source_file": pdf_path.name,
                "source_path": str(pdf_path),
                "authority": inferred["authority"],
                "country": inferred["country"],
                "category": inferred["category"],
            }
        )
        document.metadata = metadata

        ref_doc_id = self._build_ref_doc_id(pdf_path)
        if hasattr(document, "doc_id"):
            document.doc_id = ref_doc_id
        if hasattr(document, "id_"):
            document.id_ = ref_doc_id

        return document

    def _infer_metadata(self, pdf_path: Path) -> dict[str, str]:
        lowered_parts = [part.lower() for part in pdf_path.parts]
        stem = pdf_path.stem.lower()
        joined = " ".join(lowered_parts + [stem])

        authority = "UNKNOWN"
        if "lhdn" in joined:
            authority = "LHDN"
        elif "jkdm" in joined or "kastam" in joined or "customs" in joined:
            authority = "JKDM"

        parent_category = pdf_path.parent.name.strip().replace("_", " ").replace("-", " ")
        category = (
            parent_category
            if parent_category and parent_category.lower() not in {"", "pdf", "pdfs", "official docs", "official_docs"}
            else self._infer_category(stem)
        )

        return {
            "authority": authority,
            "country": "MY",
            "category": category,
        }

    def _infer_category(self, name: str) -> str:
        keyword_map = {
            "tax": "tax",
            "sst": "tax",
            "invoice": "e-invoicing",
            "invois": "e-invoicing",
            "custom": "customs",
            "trade": "trade",
            "import": "trade",
            "export": "trade",
            "duty": "customs",
        }
        for keyword, category in keyword_map.items():
            if keyword in name:
                return category
        return "general"

    def _build_ref_doc_id(self, pdf_path: Path) -> str:
        safe_name = re.sub(r"[^a-zA-Z0-9]+", "-", str(pdf_path).lower()).strip("-")
        return safe_name[:240]

    def _validate_node_embeddings(self, nodes: list[Any]) -> None:
        if self.embed_model is None:
            raise RuntimeError("Embedding model not initialized.")
        for node in nodes:
            embedding = self.embed_model.get_text_embedding(node.get_content(metadata_mode="all"))
            if len(embedding) != self.embedding_dimensions:
                raise ValueError(
                    f"Embedding dimension mismatch for node {getattr(node, 'node_id', 'unknown')}: "
                    f"expected {self.embedding_dimensions}, got {len(embedding)}"
                )
            node.embedding = embedding


    def _ensure_runtime_dependencies(self) -> None:
        if self.reader is None:
            from llama_index.readers.docling import DoclingReader

            self.reader = DoclingReader(export_type="json")
        if self.node_parser is None:
            from llama_index.node_parser.docling import DoclingNodeParser

            self.node_parser = DoclingNodeParser()
        if self.embed_model is None:
            from llama_index.embeddings.openai import OpenAIEmbedding

            self.embed_model = OpenAIEmbedding(
                model=self.embedding_model,
                dimensions=self.embedding_dimensions,
            )


_rag_ingestion_service: FirestoreRAGIngestionService | None = None


def get_rag_ingestion_service() -> FirestoreRAGIngestionService:
    global _rag_ingestion_service
    if _rag_ingestion_service is None:
        _rag_ingestion_service = FirestoreRAGIngestionService()
    return _rag_ingestion_service
