from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.core.config import get_app_config, get_app_env
from app.core.plan import get_user_plan, has_plan_access, require_plan
from app.database import get_db
from app.models import User
from app.services.free_api_integration_service import (
    connect_marketplace_provider,
    get_bnm_rates,
    get_market_wide_best_sellers,
    get_malaysia_demand_signals,
    get_marketplace_providers,
    get_nearby_warehouse_directory,
    get_own_sales_best_sellers,
    get_port_risk_preview,
    get_registry,
    get_status,
    get_usage,
    get_warehouse_directory,
    log_endpoint_usage,
)


router = APIRouter()


def _enforce_plan_or_raise(current_user: User, required_plan: str) -> None:
    if has_plan_access(get_user_plan(current_user), required_plan):
        return
    label = "PREMIUM" if required_plan == "PRO" else required_plan
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "upgrade_required": True,
            "required_plan": label,
            "feature": f"{label.lower()}_feature",
            "message": "Upgrade required to use this feature.",
        },
    )


@router.get("/integrations/free/registry")
async def free_integrations_registry(db: Session = Depends(get_db)):
    payload = get_registry(db)
    log_endpoint_usage(db, provider_key="registry", endpoint="/integrations/free/registry")
    return payload


@router.get("/integrations/free/status")
async def free_integrations_status(db: Session = Depends(get_db)):
    payload = get_status(db)
    log_endpoint_usage(db, provider_key="registry", endpoint="/integrations/free/status")
    return payload


@router.get("/integrations/free/usage")
async def free_integrations_usage(
    provider_key: str | None = None,
    limit: int = Query(default=100, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    config = get_app_config()
    if not (config.demo_mode_enabled or get_app_env() == "development"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usage logs are restricted.")
    payload = get_usage(db, provider_key=provider_key, limit=limit)
    log_endpoint_usage(db, provider_key=provider_key or "registry", endpoint="/integrations/free/usage", user=current_user)
    return payload


@router.get("/integrations/free/warehouses/malaysia")
async def malaysia_warehouses(
    state: str | None = None,
    city: str | None = None,
    q: str | None = None,
    source: str = Query(default="seeded", pattern="^(seeded|osm|all)$"),
    limit: int = Query(default=50, le=100),
    db: Session = Depends(get_db),
):
    payload = get_warehouse_directory(db, state=state, city=city, q=q, source=source, limit=limit)
    log_endpoint_usage(db, provider_key="seeded_preview", endpoint="/integrations/free/warehouses/malaysia")
    return payload


@router.get("/integrations/free/warehouses/nearby")
async def nearby_warehouses(
    lat: float,
    lng: float,
    radius_km: float = Query(default=25, gt=0, le=200),
    limit: int = Query(default=25, le=100),
    db: Session = Depends(get_db),
):
    payload = get_nearby_warehouse_directory(db, lat=lat, lng=lng, radius_km=radius_km, limit=limit)
    log_endpoint_usage(db, provider_key="seeded_preview", endpoint="/integrations/free/warehouses/nearby")
    return payload


@router.get("/integrations/free/logistics/malaysia-port-risk")
async def malaysia_port_risk(
    include_weather: bool = True,
    include_marine: bool = True,
    db: Session = Depends(get_db),
):
    payload = get_port_risk_preview(db, include_weather=include_weather, include_marine=include_marine)
    log_endpoint_usage(db, provider_key="open_meteo", endpoint="/integrations/free/logistics/malaysia-port-risk")
    return payload


@router.get("/integrations/free/finance/bnm-rates")
async def bnm_rates(
    requested_date: date | None = Query(default=None, alias="date"),
    currency: str | None = None,
    db: Session = Depends(get_db),
):
    payload = get_bnm_rates(db, target_date=requested_date, currency=currency)
    log_endpoint_usage(db, provider_key="bnm_openapi", endpoint="/integrations/free/finance/bnm-rates")
    return payload


@router.get("/integrations/free/market/malaysia-demand-signals")
async def malaysia_demand_signals(
    week_start: date | None = None,
    week_end: date | None = None,
    category: str | None = None,
    source: str = Query(default="preview", pattern="^(preview|google_trends_alpha|all)$"),
    db: Session = Depends(get_db),
):
    payload = get_malaysia_demand_signals(db, week_start=week_start, week_end=week_end, category=category, source=source)
    log_endpoint_usage(db, provider_key="preview_demand_provider", endpoint="/integrations/free/market/malaysia-demand-signals")
    return payload


@router.get("/integrations/marketplaces/providers")
async def marketplace_providers(
    current_user: User = Depends(require_plan("PRO")),
    db: Session = Depends(get_db),
):
    _enforce_plan_or_raise(current_user, "PRO")
    payload = get_marketplace_providers()
    log_endpoint_usage(db, provider_key="marketplaces", endpoint="/integrations/marketplaces/providers", user=current_user)
    return payload


@router.post("/integrations/marketplaces/{provider}/connect")
async def connect_marketplace(
    provider: str,
    current_user: User = Depends(require_plan("PRO")),
    db: Session = Depends(get_db),
):
    _enforce_plan_or_raise(current_user, "PRO")
    if provider not in {"shopee", "lazada", "tiktok_shop"}:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provider not found")
    payload = connect_marketplace_provider(db, provider=provider, user=current_user)
    log_endpoint_usage(db, provider_key=provider, endpoint=f"/integrations/marketplaces/{provider}/connect", user=current_user)
    return payload


@router.get("/integrations/marketplaces/own-sales/best-sellers/weekly")
async def own_sales_best_sellers(
    provider: str | None = None,
    week_start: date | None = None,
    week_end: date | None = None,
    category: str | None = None,
    current_user: User = Depends(require_plan("PRO")),
    db: Session = Depends(get_db),
):
    _enforce_plan_or_raise(current_user, "PRO")
    payload = get_own_sales_best_sellers(
        db,
        user=current_user,
        provider=provider,
        week_start=week_start,
        week_end=week_end,
        category=category,
    )
    log_endpoint_usage(db, provider_key=provider or "marketplaces", endpoint="/integrations/marketplaces/own-sales/best-sellers/weekly", user=current_user)
    return payload


@router.get("/integrations/market-intelligence/malaysia-best-sellers/weekly")
async def market_wide_best_sellers(
    current_user: User = Depends(require_plan("BOOST")),
    db: Session = Depends(get_db),
):
    _enforce_plan_or_raise(current_user, "BOOST")
    payload = get_market_wide_best_sellers()
    log_endpoint_usage(db, provider_key="paid_market_intelligence", endpoint="/integrations/market-intelligence/malaysia-best-sellers/weekly", user=current_user)
    return payload
