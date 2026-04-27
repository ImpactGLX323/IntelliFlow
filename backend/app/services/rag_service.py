from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.rag_system import rag_system


DISCLAIMER = "This is informational and not legal advice."
OFFICIAL_DOCS_DIR = Path(__file__).resolve().parents[2] / "docs" / "official_docs"


@dataclass(frozen=True)
class OfficialDocument:
    document_id: str
    title: str
    file_name: str
    category: str
    authority: str
    topics: tuple[str, ...]
    summary: str

    @property
    def path(self) -> Path:
        return OFFICIAL_DOCS_DIR / self.file_name

    @property
    def source_reference(self) -> dict[str, str]:
        return {
            "document_id": self.document_id,
            "title": self.title,
            "file_name": self.file_name,
            "path": str(self.path),
            "category": self.category,
            "authority": self.authority,
        }


OFFICIAL_DOCS: tuple[OfficialDocument, ...] = (
    OfficialDocument(
        document_id="road-transport-act-1987",
        title="Act 333 - Road Transport Act 1987",
        file_name="Act 333 - Road Transport Act 1987.pdf",
        category="road-transport",
        authority="Government of Malaysia",
        topics=("road", "transport", "vehicle", "fleet", "delivery", "logistics"),
        summary="Road transport operations, vehicle use, and transport-related regulatory obligations in Malaysia.",
    ),
    OfficialDocument(
        document_id="macc-s17a",
        title="MACC Section 17A",
        file_name="MACC-s17A.pdf",
        category="anti-corruption",
        authority="Malaysian Anti-Corruption Commission",
        topics=("anti-corruption", "governance", "bribery", "procurement", "third-party risk"),
        summary="Corporate liability and anti-corruption expectations relevant to procurement, suppliers, and intermediaries.",
    ),
    OfficialDocument(
        document_id="service-tax-act-my",
        title="STA_my",
        file_name="STA_my.pdf",
        category="tax",
        authority="Government of Malaysia",
        topics=("tax", "service tax", "sst", "indirect tax", "compliance"),
        summary="Malaysia service tax and related indirect tax compliance considerations.",
    ),
    OfficialDocument(
        document_id="trust-framework",
        title="Trust Framework",
        file_name="Trust-framework.pdf",
        category="general-compliance",
        authority="Government of Malaysia",
        topics=("trust", "digital", "governance", "framework", "controls"),
        summary="Trust and governance framework material relevant to operating controls and compliance posture.",
    ),
    OfficialDocument(
        document_id="customs-act-1967",
        title="Customs Act 1967",
        file_name="customs-act-1967-my.pdf",
        category="customs",
        authority="Royal Malaysian Customs Department",
        topics=("customs", "import", "export", "duty", "declaration", "border"),
        summary="Malaysia customs obligations for imports, exports, duties, declarations, and border controls.",
    ),
    OfficialDocument(
        document_id="tax-measures-my",
        title="Tax Measures Malaysia",
        file_name="tax-measures-my.pdf",
        category="tax",
        authority="Government of Malaysia",
        topics=("tax", "measures", "fiscal", "sst", "incentives"),
        summary="Malaysia tax measures and fiscal updates that may affect pricing, imports, and supply-chain decisions.",
    ),
)


def _citation_warning() -> list[str]:
    return [
        "Citation retrieval is not available in the current environment because the official PDFs are not text-indexed.",
        "Source references below identify relevant official documents, but the answer is not passage-level citation-backed.",
    ]


def _find_document(document_id: str) -> OfficialDocument | None:
    normalized = document_id.strip().lower()
    for document in OFFICIAL_DOCS:
        if document.document_id == normalized:
            return document
    return None


def _topic_documents(topic: str) -> list[OfficialDocument]:
    normalized = topic.strip().lower()
    results = []
    for document in OFFICIAL_DOCS:
        if document.category == normalized or normalized in document.topics:
            results.append(document)
    return results


def _search_documents(query: str) -> list[OfficialDocument]:
    q = query.lower()
    scored: list[tuple[int, OfficialDocument]] = []
    for document in OFFICIAL_DOCS:
        score = 0
        if q in document.document_id or q in document.title.lower() or q in document.file_name.lower():
            score += 5
        for topic in document.topics:
            if topic in q or q in topic:
                score += 2
        if document.category in q:
            score += 3
        if score > 0:
            scored.append((score, document))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [document for _, document in scored]


def _build_basic_compliance_answer(query: str, matched_documents: list[OfficialDocument]) -> dict[str, Any]:
    if not matched_documents:
        return {
            "answer": "No directly matched official Malaysia compliance document was found in the local corpus for this query.",
            "sources": [],
            "warnings": _citation_warning(),
            "disclaimer": DISCLAIMER,
        }
    answer = (
        "Likely relevant Malaysia official documents were identified for this query. "
        "Use the listed sources for manual review because the current environment cannot extract passage-level citations from the PDFs."
    )
    return {
        "answer": answer,
        "sources": [document.source_reference for document in matched_documents],
        "warnings": _citation_warning(),
        "disclaimer": DISCLAIMER,
    }


def generate_roadmap(*, db: Session, user_id: int, query: str) -> dict[str, Any]:
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)


def get_quick_insights(*, db: Session, user_id: int) -> dict[str, Any]:
    query = (
        "Provide 3-5 key insights about my business performance, "
        "inventory status, and sales trends. Be concise and actionable."
    )
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)


def get_compliance_context(*, db: Session, user_id: int, query: str) -> dict[str, Any]:
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)


def get_official_document(document_id: str) -> dict[str, Any]:
    document = _find_document(document_id)
    if document is None:
        raise ValueError("document not found")
    return {
        **document.source_reference,
        "summary": document.summary,
        "topics": list(document.topics),
        "available_locally": document.path.exists(),
        "warnings": _citation_warning(),
        "disclaimer": DISCLAIMER,
    }


def get_documents_by_topic(topic: str) -> dict[str, Any]:
    documents = _topic_documents(topic)
    return {
        "topic": topic,
        "documents": [
            {
                **document.source_reference,
                "summary": document.summary,
                "topics": list(document.topics),
                "available_locally": document.path.exists(),
            }
            for document in documents
        ],
        "warnings": _citation_warning(),
        "disclaimer": DISCLAIMER,
    }


def search_official_docs(query: str) -> dict[str, Any]:
    documents = _search_documents(query)
    return {
        "query": query,
        "results": [
            {
                **document.source_reference,
                "summary": document.summary,
                "topics": list(document.topics),
                "available_locally": document.path.exists(),
            }
            for document in documents
        ],
        "warnings": _citation_warning(),
        "disclaimer": DISCLAIMER,
    }


def answer_with_citations(query: str) -> dict[str, Any]:
    documents = _search_documents(query)
    return _build_basic_compliance_answer(query, documents[:3])


def check_customs_risk(query: str) -> dict[str, Any]:
    documents = _topic_documents("customs")
    return {
        **_build_basic_compliance_answer(query, documents),
        "risk_area": "customs",
        "risk_level": "REVIEW_REQUIRED",
        "recommended_checks": [
            "Verify declaration and documentation completeness.",
            "Review customs duty and import/export classification obligations.",
            "Confirm whether cross-border movement triggers additional approvals or reporting.",
        ],
    }


def check_transport_compliance(query: str) -> dict[str, Any]:
    documents = _topic_documents("road-transport")
    return {
        **_build_basic_compliance_answer(query, documents),
        "risk_area": "transport",
        "risk_level": "REVIEW_REQUIRED",
        "recommended_checks": [
            "Review road transport operating obligations and fleet compliance requirements.",
            "Check whether delivery or vehicle handling processes require updated controls or permits.",
            "Validate carrier and driver compliance against applicable transport rules.",
        ],
    }


def summarize_relevant_regulation(query: str, *, topic: Optional[str] = None) -> dict[str, Any]:
    documents = _topic_documents(topic) if topic else _search_documents(query)
    return {
        "query": query,
        "topic": topic,
        "summary": (
            "Relevant official Malaysia regulatory documents were identified. "
            "Review the cited source files directly because passage extraction is not currently available."
        ),
        "sources": [document.source_reference for document in documents[:5]],
        "warnings": _citation_warning(),
        "disclaimer": DISCLAIMER,
    }
