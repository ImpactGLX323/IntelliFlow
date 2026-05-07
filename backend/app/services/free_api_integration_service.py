from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_app_config, get_app_env
from app.integrations.base import ProviderDefinition, env_flag
from app.integrations.cache import get_cached_response, set_cached_response
from app.integrations.geo.osm_nominatim import OSM_NOMINATIM_PROVIDER
from app.integrations.geo.osm_overpass import OSM_OVERPASS_PROVIDER
from app.integrations.market_intelligence.google_trends_alpha import GOOGLE_TRENDS_ALPHA_PROVIDER, is_configured as google_trends_configured
from app.integrations.market_intelligence.paid_provider_stub import PAID_MARKET_INTELLIGENCE_PROVIDER, is_enabled as paid_market_enabled
from app.integrations.market_intelligence.preview_demand_provider import PREVIEW_DEMAND_PROVIDER
from app.integrations.marketplaces.lazada import LAZADA_PROVIDER, is_configured as lazada_configured
from app.integrations.marketplaces.shopee import SHOPEE_PROVIDER, is_configured as shopee_configured
from app.integrations.marketplaces.tiktok_shop import TIKTOK_SHOP_PROVIDER, is_configured as tiktok_configured
from app.integrations.public_data.bnm_openapi import BNM_OPENAPI_PROVIDER, get_preview_rates
from app.integrations.public_data.data_gov_my import DATA_GOV_MY_PROVIDER
from app.integrations.rate_limiter import allow_request
from app.integrations.warehouses.manual_provider import WAREHOUSE_SEEDED_PROVIDER
from app.integrations.warehouses.osm_warehouse_locator import OSM_WAREHOUSE_PROVIDER
from app.integrations.warehouses.paid_3pl_provider_stub import PAID_3PL_PROVIDER, is_enabled as paid_3pl_enabled
from app.integrations.weather.open_meteo import OPEN_METEO_PROVIDER
from app.integrations.weather.open_meteo_marine import OPEN_METEO_MARINE_PROVIDER
from app.models import ExternalApiConnection, ExternalApiProvider, User
from app.services.external_api_usage_service import list_usage_logs, log_external_api_usage
from app.services.malaysia_market_signal_service import list_market_signals, serialize_market_signals
from app.services.warehouse_discovery_service import find_nearby_warehouses, list_malaysia_warehouses, serialize_warehouse_records


PROVIDER_DEFINITIONS: list[ProviderDefinition] = [
    DATA_GOV_MY_PROVIDER,
    BNM_OPENAPI_PROVIDER,
    OSM_NOMINATIM_PROVIDER,
    OSM_OVERPASS_PROVIDER,
    OPEN_METEO_PROVIDER,
    OPEN_METEO_MARINE_PROVIDER,
    SHOPEE_PROVIDER,
    LAZADA_PROVIDER,
    TIKTOK_SHOP_PROVIDER,
    GOOGLE_TRENDS_ALPHA_PROVIDER,
    PREVIEW_DEMAND_PROVIDER,
    PAID_MARKET_INTELLIGENCE_PROVIDER,
    WAREHOUSE_SEEDED_PROVIDER,
    OSM_WAREHOUSE_PROVIDER,
    PAID_3PL_PROVIDER,
]

PROVIDER_MAP = {item.key: item for item in PROVIDER_DEFINITIONS}

MARKETPLACE_CONNECTION_FACTORIES = {
    "shopee": shopee_configured,
    "lazada": lazada_configured,
    "tiktok_shop": tiktok_configured,
}

PORTS = [
    {"port_name": "Port Klang", "state": "Selangor", "latitude": 3.0, "longitude": 101.4, "pressure_score": 0.52},
    {"port_name": "Tanjung Pelepas", "state": "Johor", "latitude": 1.37, "longitude": 103.55, "pressure_score": 0.48},
    {"port_name": "Pasir Gudang", "state": "Johor", "latitude": 1.45, "longitude": 103.9, "pressure_score": 0.61},
    {"port_name": "Penang / Perai", "state": "Penang", "latitude": 5.39, "longitude": 100.36, "pressure_score": 0.44},
    {"port_name": "Kuantan", "state": "Pahang", "latitude": 3.97, "longitude": 103.43, "pressure_score": 0.39},
    {"port_name": "Bintulu", "state": "Sarawak", "latitude": 3.27, "longitude": 113.03, "pressure_score": 0.35},
    {"port_name": "Kuching", "state": "Sarawak", "latitude": 1.56, "longitude": 110.35, "pressure_score": 0.31},
    {"port_name": "Kota Kinabalu", "state": "Sabah", "latitude": 5.98, "longitude": 116.07, "pressure_score": 0.41},
    {"port_name": "Sandakan", "state": "Sabah", "latitude": 5.84, "longitude": 118.12, "pressure_score": 0.46},
]


def ensure_provider_registry_seeded(db: Session) -> None:
    for provider in PROVIDER_DEFINITIONS:
        record = db.query(ExternalApiProvider).filter(ExternalApiProvider.key == provider.key).first()
        enabled = provider_enabled(provider.key)
        if record is None:
            db.add(
                ExternalApiProvider(
                    key=provider.key,
                    name=provider.name,
                    category=provider.category,
                    provider_type=provider.provider_type,
                    required_plan=provider.required_plan,
                    is_enabled=enabled,
                    is_live_capable=provider.is_live_capable,
                    notes=provider.notes,
                )
            )
        else:
            record.name = provider.name
            record.category = provider.category
            record.provider_type = provider.provider_type
            record.required_plan = provider.required_plan
            record.is_enabled = enabled
            record.is_live_capable = provider.is_live_capable
            record.notes = provider.notes
    db.commit()


def provider_enabled(provider_key: str) -> bool:
    flags = {
        "data_gov_my": env_flag("DATA_GOV_MY_ENABLED", True),
        "bnm_openapi": env_flag("BNM_OPENAPI_ENABLED", True),
        "osm_nominatim": env_flag("OSM_NOMINATIM_ENABLED", True),
        "osm_overpass": env_flag("OSM_OVERPASS_ENABLED", True),
        "open_meteo": env_flag("OPEN_METEO_ENABLED", True),
        "open_meteo_marine": env_flag("OPEN_METEO_MARINE_ENABLED", True),
        "google_trends_alpha": env_flag("GOOGLE_TRENDS_ALPHA_ENABLED", False),
        "paid_market_intelligence": env_flag("PAID_MARKET_INTELLIGENCE_ENABLED", False),
        "paid_3pl_provider": env_flag("PAID_WAREHOUSE_PROVIDER_ENABLED", False),
        "shopee": env_flag("SHOPEE_OPEN_PLATFORM_ENABLED", False),
        "lazada": env_flag("LAZADA_OPEN_PLATFORM_ENABLED", False),
        "tiktok_shop": env_flag("TIKTOK_SHOP_ENABLED", False),
    }
    return flags.get(provider_key, True)


def get_registry(db: Session) -> dict[str, Any]:
    ensure_provider_registry_seeded(db)
    providers = [provider.to_public_dict(enabled=provider_enabled(provider.key)) for provider in PROVIDER_DEFINITIONS]
    return {"providers": providers}


def get_status(db: Session) -> dict[str, Any]:
    ensure_provider_registry_seeded(db)
    configured = []
    preview_only = []
    warnings = []
    for provider in PROVIDER_DEFINITIONS:
        enabled = provider_enabled(provider.key)
        if provider.provider_type == "PREVIEW":
            preview_only.append(provider.key)
        if provider.key in MARKETPLACE_CONNECTION_FACTORIES and MARKETPLACE_CONNECTION_FACTORIES[provider.key]():
            configured.append(provider.key)
        if provider.key == "google_trends_alpha" and google_trends_configured():
            configured.append(provider.key)
        if provider.key == "paid_market_intelligence" and paid_market_enabled():
            configured.append(provider.key)
        if provider.key == "paid_3pl_provider" and paid_3pl_enabled():
            configured.append(provider.key)
        if enabled and provider.key in {"open_meteo", "open_meteo_marine"} and get_app_env() == "production":
            warnings.append("Review Open-Meteo commercial usage terms before relying on production traffic.")
    connections = db.query(ExternalApiConnection).all()
    return {
        "enabled_providers": [provider.key for provider in PROVIDER_DEFINITIONS if provider_enabled(provider.key)],
        "configured_providers": sorted(set(configured + [row.provider_key for row in connections if row.status == "CONNECTED"])),
        "preview_only_providers": sorted(set(preview_only + [row.provider_key for row in connections if row.status == "PREVIEW_ONLY"])),
        "warnings": warnings,
    }


def get_usage(db: Session, *, provider_key: str | None = None, limit: int = 100) -> dict[str, Any]:
    rows = list_usage_logs(db, provider_key=provider_key, limit=limit)
    return {
        "items": [
            {
                "provider_key": row.provider_key,
                "endpoint": row.endpoint,
                "status_code": row.status_code,
                "cache_hit": row.cache_hit,
                "plan": row.plan,
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
    }


def get_warehouse_directory(
    db: Session,
    *,
    state: str | None = None,
    city: str | None = None,
    q: str | None = None,
    source: str = "seeded",
    limit: int = 50,
) -> dict[str, Any]:
    records = list_malaysia_warehouses(db, state=state, city=city, q=q, source=source, limit=limit)
    source_label = "seeded_preview" if source == "seeded" else "mixed" if source == "all" else "osm_overpass"
    return {
        "is_live": False,
        "source": source_label,
        "data_truth": "Directory/location data only. Availability and capacity are not verified.",
        "items": serialize_warehouse_records(records),
    }


def get_nearby_warehouse_directory(
    db: Session,
    *,
    lat: float,
    lng: float,
    radius_km: float = 25,
    limit: int = 25,
) -> dict[str, Any]:
    records = find_nearby_warehouses(db, lat=lat, lng=lng, radius_km=radius_km, limit=limit)
    return {
        "is_live": False,
        "source": "seeded_preview",
        "data_truth": "Directory/location data only. Availability and capacity are not verified.",
        "items": serialize_warehouse_records(records),
    }


def get_port_risk_preview(db: Session, *, include_weather: bool = True, include_marine: bool = True) -> dict[str, Any]:
    cache_key = f"port-risk:{include_weather}:{include_marine}"
    cached = get_cached_response(db, provider_key="open_meteo", cache_key=cache_key)
    if cached:
        return cached
    ports = []
    for port in PORTS:
        score = port["pressure_score"]
        ports.append(
            {
                "port_name": port["port_name"],
                "pressure_status": _pressure_status(score),
                "pressure_score": score,
                "weather_risk": {"level": "ELEVATED" if include_weather and score >= 0.55 else "LOW", "source": "preview_weather"} if include_weather else {},
                "marine_risk": {"level": "MODERATE" if include_marine and score >= 0.45 else "LOW", "source": "preview_marine"} if include_marine else {},
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "is_preview": True,
            }
        )
    response = {
        "is_live": False,
        "source": "open_meteo_plus_preview" if include_weather or include_marine else "preview",
        "data_truth": "Weather/marine risk and preview port pressure only. Not live AIS or confirmed congestion.",
        "ports": ports,
    }
    set_cached_response(db, provider_key="open_meteo", cache_key=cache_key, response_json=response, ttl_seconds=min(get_app_config().free_api_cache_ttl_seconds, 1800))
    return response


def get_bnm_rates(db: Session, *, target_date: date | None = None, currency: str | None = None) -> dict[str, Any]:
    cache_key = f"bnm-rates:{target_date}:{currency or 'all'}"
    cached = get_cached_response(db, provider_key="bnm_openapi", cache_key=cache_key)
    if cached:
        return cached
    if not allow_request("bnm_openapi", requests_per_minute=4):
        cached_or_preview = cached or get_preview_rates(target_date=target_date, currency=currency)
        cached_or_preview.setdefault("warnings", []).append("Rate-limited. Returned cached or preview data.")
        return cached_or_preview
    response = get_preview_rates(target_date=target_date, currency=currency)
    set_cached_response(db, provider_key="bnm_openapi", cache_key=cache_key, response_json=response, ttl_seconds=max(get_app_config().free_api_cache_ttl_seconds, 21600))
    return response


def get_malaysia_demand_signals(
    db: Session,
    *,
    week_start: date | None = None,
    week_end: date | None = None,
    category: str | None = None,
    source: str = "preview",
) -> dict[str, Any]:
    items = list_market_signals(db, week_start=week_start, week_end=week_end, category=category, source=source)
    return {
        "is_live": False,
        "source": "google_trends_alpha" if source == "google_trends_alpha" and google_trends_configured() else "preview",
        "data_truth": "Demand signal only. Not confirmed sales volume.",
        "items": serialize_market_signals(items),
    }


def get_marketplace_providers() -> dict[str, Any]:
    items = []
    for provider in (SHOPEE_PROVIDER, LAZADA_PROVIDER, TIKTOK_SHOP_PROVIDER):
        configured = MARKETPLACE_CONNECTION_FACTORIES[provider.key]()
        items.append(
            {
                "key": provider.key,
                "name": provider.name,
                "required_plan": provider.required_plan,
                "status": "ready_for_oauth_stub" if configured else "not_configured",
                "data_truth": provider.data_truth,
            }
        )
    return {"providers": items}


def connect_marketplace_provider(db: Session, *, provider: str, user: User) -> dict[str, Any]:
    configured = MARKETPLACE_CONNECTION_FACTORIES.get(provider, lambda: False)()
    record = (
        db.query(ExternalApiConnection)
        .filter(ExternalApiConnection.provider_key == provider, ExternalApiConnection.user_id == user.id)
        .first()
    )
    desired_status = "CONNECTED" if configured else "NOT_CONFIGURED"
    if record is None:
        record = ExternalApiConnection(
            organization_id=getattr(user, "organization_id", None),
            user_id=user.id,
            provider_key=provider,
            status=desired_status,
            metadata_json={"todo": "OAuth token persistence requires encryption before real secrets can be stored."},
        )
        db.add(record)
    else:
        record.status = desired_status
    db.commit()
    return {
        "provider_key": provider,
        "status": "connected_stub" if configured else "not_configured",
        "message": "OAuth stub is ready for implementation." if configured else "Provider credentials are not configured.",
        "todo": "Do not persist raw secrets until encryption helper is added.",
    }


def get_own_sales_best_sellers(db: Session, *, user: User, provider: str | None = None, week_start: date | None = None, week_end: date | None = None, category: str | None = None) -> dict[str, Any]:
    _ = week_start
    _ = week_end
    _ = category
    query = db.query(ExternalApiConnection).filter(ExternalApiConnection.user_id == user.id)
    if provider:
        query = query.filter(ExternalApiConnection.provider_key == provider)
    else:
        query = query.filter(ExternalApiConnection.provider_key.in_(list(MARKETPLACE_CONNECTION_FACTORIES.keys())))
    connection = query.first()
    if connection is None or connection.status != "CONNECTED":
        return {
            "status": "not_configured",
            "message": "Connect your marketplace store to view your weekly best-selling products.",
        }
    return {
        "is_live": False,
        "source": f"{connection.provider_key}_user_store_stub",
        "data_type": "OWN_SALES",
        "data_truth": "User-authorized store sales only.",
        "items": [],
        "status": "connected_stub",
        "message": "Marketplace sync stub is connected, but live ingestion is not implemented yet.",
    }


def get_market_wide_best_sellers() -> dict[str, Any]:
    if not paid_market_enabled():
        return {
            "status": "not_configured",
            "message": "Market-wide Malaysia best-seller intelligence requires a configured market-intelligence provider.",
            "preview_available": True,
        }
    return {
        "status": "not_configured",
        "message": "Paid market-intelligence adapter stub is registered but not connected.",
        "preview_available": True,
    }


def log_endpoint_usage(db: Session, *, provider_key: str, endpoint: str, user: User | None = None, cache_hit: bool = False, status_code: int | None = 200) -> None:
    from app.core.plan import get_user_plan

    log_external_api_usage(
        db,
        provider_key=provider_key,
        endpoint=endpoint,
        user=user,
        status_code=status_code,
        cache_hit=cache_hit,
        plan=get_user_plan(user) if user is not None else "FREE",
    )


def _pressure_status(score: float) -> str:
    if score <= 0.30:
        return "LOW"
    if score <= 0.60:
        return "MEDIUM"
    if score <= 0.80:
        return "HIGH"
    return "CRITICAL"
