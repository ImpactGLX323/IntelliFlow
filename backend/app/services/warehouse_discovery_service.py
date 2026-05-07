from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Iterable

from sqlalchemy.orm import Session

from app.models import WarehouseDirectoryRecord


SEEDED_WAREHOUSES = [
    {
        "source": "seeded_preview",
        "name": "Port Klang Fulfillment Cluster",
        "provider_key": "seeded_preview",
        "state": "Selangor",
        "city": "Port Klang",
        "address": "Port Klang logistics preview location",
        "latitude": 3.0056,
        "longitude": 101.3927,
        "warehouse_type": "PORT_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Shah Alam Distribution Hub",
        "provider_key": "seeded_preview",
        "state": "Selangor",
        "city": "Shah Alam",
        "address": "Klang Valley logistics preview location",
        "latitude": 3.0733,
        "longitude": 101.5185,
        "warehouse_type": "URBAN_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Tanjung Pelepas Export Hub",
        "provider_key": "seeded_preview",
        "state": "Johor",
        "city": "Iskandar Puteri",
        "address": "Tanjung Pelepas logistics preview location",
        "latitude": 1.3644,
        "longitude": 103.5486,
        "warehouse_type": "PORT_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Pasir Gudang Inbound Center",
        "provider_key": "seeded_preview",
        "state": "Johor",
        "city": "Pasir Gudang",
        "address": "Pasir Gudang logistics preview location",
        "latitude": 1.4556,
        "longitude": 103.8997,
        "warehouse_type": "PORT_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Penang Perai Supply Hub",
        "provider_key": "seeded_preview",
        "state": "Penang",
        "city": "Perai",
        "address": "Perai logistics preview location",
        "latitude": 5.3833,
        "longitude": 100.3833,
        "warehouse_type": "REGIONAL_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Kuantan East Coast Depot",
        "provider_key": "seeded_preview",
        "state": "Pahang",
        "city": "Kuantan",
        "address": "Kuantan logistics preview location",
        "latitude": 3.8077,
        "longitude": 103.326,
        "warehouse_type": "REGIONAL_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Bintulu Energy Corridor Warehouse",
        "provider_key": "seeded_preview",
        "state": "Sarawak",
        "city": "Bintulu",
        "address": "Bintulu logistics preview location",
        "latitude": 3.1717,
        "longitude": 113.0414,
        "warehouse_type": "INDUSTRIAL_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Kuching Sarawak Distribution Point",
        "provider_key": "seeded_preview",
        "state": "Sarawak",
        "city": "Kuching",
        "address": "Kuching logistics preview location",
        "latitude": 1.5533,
        "longitude": 110.3592,
        "warehouse_type": "REGIONAL_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Kota Kinabalu Sabah Fulfillment Hub",
        "provider_key": "seeded_preview",
        "state": "Sabah",
        "city": "Kota Kinabalu",
        "address": "Kota Kinabalu logistics preview location",
        "latitude": 5.9804,
        "longitude": 116.0735,
        "warehouse_type": "REGIONAL_DC",
    },
    {
        "source": "seeded_preview",
        "name": "Sandakan East Malaysia Depot",
        "provider_key": "seeded_preview",
        "state": "Sabah",
        "city": "Sandakan",
        "address": "Sandakan logistics preview location",
        "latitude": 5.8387,
        "longitude": 118.1179,
        "warehouse_type": "REGIONAL_DC",
    },
]


def ensure_seeded_warehouse_directory(db: Session) -> None:
    for item in SEEDED_WAREHOUSES:
        existing = (
            db.query(WarehouseDirectoryRecord)
            .filter(
                WarehouseDirectoryRecord.name == item["name"],
                WarehouseDirectoryRecord.source == item["source"],
            )
            .first()
        )
        if existing is not None:
            continue
        db.add(
            WarehouseDirectoryRecord(
                **item,
                country="MY",
                is_verified=False,
                is_preview=True,
                metadata_json={"seeded": True},
            )
        )
    db.commit()


def list_malaysia_warehouses(
    db: Session,
    *,
    state: str | None = None,
    city: str | None = None,
    q: str | None = None,
    source: str = "seeded",
    limit: int = 50,
) -> list[WarehouseDirectoryRecord]:
    ensure_seeded_warehouse_directory(db)
    query = db.query(WarehouseDirectoryRecord).filter(WarehouseDirectoryRecord.country == "MY")
    if source == "seeded":
        query = query.filter(WarehouseDirectoryRecord.source == "seeded_preview")
    elif source == "osm":
        query = query.filter(WarehouseDirectoryRecord.source == "osm_overpass")
    if state:
        query = query.filter(WarehouseDirectoryRecord.state.ilike(f"%{state}%"))
    if city:
        query = query.filter(WarehouseDirectoryRecord.city.ilike(f"%{city}%"))
    if q:
        token = f"%{q}%"
        query = query.filter(
            (WarehouseDirectoryRecord.name.ilike(token))
            | (WarehouseDirectoryRecord.city.ilike(token))
            | (WarehouseDirectoryRecord.state.ilike(token))
        )
    return query.order_by(WarehouseDirectoryRecord.name.asc()).limit(limit).all()


def find_nearby_warehouses(
    db: Session,
    *,
    lat: float,
    lng: float,
    radius_km: float = 25,
    limit: int = 25,
) -> list[WarehouseDirectoryRecord]:
    ensure_seeded_warehouse_directory(db)
    records = db.query(WarehouseDirectoryRecord).filter(WarehouseDirectoryRecord.country == "MY").all()
    matches = [
        record for record in records
        if record.latitude is not None
        and record.longitude is not None
        and _distance_km(lat, lng, record.latitude, record.longitude) <= radius_km
    ]
    matches.sort(key=lambda item: _distance_km(lat, lng, item.latitude or 0, item.longitude or 0))
    return matches[:limit]


def serialize_warehouse_records(records: Iterable[WarehouseDirectoryRecord]) -> list[dict]:
    items: list[dict] = []
    for record in records:
        items.append(
            {
                "name": record.name,
                "state": record.state,
                "city": record.city,
                "address": record.address,
                "latitude": record.latitude,
                "longitude": record.longitude,
                "warehouse_type": record.warehouse_type,
                "is_verified": record.is_verified,
                "is_preview": record.is_preview,
                "source": record.source,
            }
        )
    return items


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    c = 2 * asin(sqrt(a))
    return earth_radius * c
