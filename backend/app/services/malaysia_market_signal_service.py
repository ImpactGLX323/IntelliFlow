from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.integrations.market_intelligence.preview_demand_provider import get_preview_demand_signals
from app.models import MarketDemandSignal


def ensure_seeded_market_signals(db: Session) -> None:
    week_end = date.today()
    week_start = week_end - timedelta(days=6)
    if (
        db.query(MarketDemandSignal)
        .filter(
            MarketDemandSignal.source == "preview",
            MarketDemandSignal.week_start == week_start,
            MarketDemandSignal.week_end == week_end,
        )
        .first()
        is not None
    ):
        return
    for item in get_preview_demand_signals(week_start=week_start, week_end=week_end):
        db.add(
            MarketDemandSignal(
                country="MY",
                week_start=week_start,
                week_end=week_end,
                source="preview",
                data_type=item["data_type"],
                category=item["category"],
                keyword_or_product=item["keyword_or_product"],
                rank=item["rank"],
                score=item["score"],
                units_sold=None,
                revenue=None,
                currency="MYR",
                confidence=item["confidence"],
                is_live=False,
                is_estimated=True,
                metadata_json={"seeded": True},
            )
        )
    db.commit()


def list_market_signals(
    db: Session,
    *,
    week_start: date | None = None,
    week_end: date | None = None,
    category: str | None = None,
    source: str | None = None,
) -> list[MarketDemandSignal]:
    ensure_seeded_market_signals(db)
    query = db.query(MarketDemandSignal).filter(MarketDemandSignal.country == "MY")
    if week_start:
        query = query.filter(MarketDemandSignal.week_start == week_start)
    if week_end:
        query = query.filter(MarketDemandSignal.week_end == week_end)
    if category:
        query = query.filter(MarketDemandSignal.category.ilike(f"%{category}%"))
    if source and source != "all":
        mapped = "preview" if source == "preview" else source
        query = query.filter(MarketDemandSignal.source == mapped)
    return query.order_by(MarketDemandSignal.rank.asc().nullslast(), MarketDemandSignal.score.desc().nullslast()).all()


def serialize_market_signals(items: list[MarketDemandSignal]) -> list[dict]:
    return [
        {
            "rank": item.rank,
            "keyword_or_product": item.keyword_or_product,
            "category": item.category,
            "score": item.score,
            "data_type": item.data_type,
            "confidence": item.confidence,
            "is_estimated": item.is_estimated,
            "is_live": item.is_live,
            "week_start": item.week_start.isoformat(),
            "week_end": item.week_end.isoformat(),
        }
        for item in items
    ]
