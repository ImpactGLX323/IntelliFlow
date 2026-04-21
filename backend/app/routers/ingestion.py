import logging

from fastapi import APIRouter, HTTPException

from app.rag_ingestion import get_rag_ingestion_service
from app.schemas import IngestRequest, IngestResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse)
async def ingest_documents(request: IngestRequest) -> IngestResponse:
    try:
        summary = get_rag_ingestion_service().ingest_directory(
            source_directory=request.source_directory,
            collection_name=request.collection_name,
        )
        return IngestResponse(**summary.model_dump())
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("RAG ingestion failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"RAG ingestion failed: {exc}") from exc
