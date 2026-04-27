from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.rag_system import rag_system


def generate_roadmap(*, db: Session, user_id: int, query: str) -> dict[str, Any]:
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)


def get_quick_insights(*, db: Session, user_id: int) -> dict[str, Any]:
    query = (
        "Provide 3-5 key insights about my business performance, "
        "inventory status, and sales trends. Be concise and actionable."
    )
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)


def get_compliance_context(*, db: Session, user_id: int, query: str) -> dict[str, Any]:
    # This is a Phase 1 wrapper so MCP tools can call a stable service entrypoint
    # instead of reaching into the RAG system directly.
    return rag_system.generate_roadmap(query=query, db=db, user_id=user_id)
