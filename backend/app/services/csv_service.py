from __future__ import annotations

import csv
from io import StringIO
from typing import Iterable

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Product, Sale, Supplier, User, Warehouse
from app.services.purchasing_service import list_purchase_orders
from app.services.stock_ledger_service import adjust_stock, get_available, get_default_warehouse, seed_product_stock_from_legacy_current_stock, sync_product_current_stock


def _read_rows(csv_text: str) -> list[dict[str, str]]:
    content = (csv_text or "").strip()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV text is empty.")
    reader = csv.DictReader(StringIO(content))
    if not reader.fieldnames:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV header row is required.")
    return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def _to_csv(fieldnames: list[str], rows: Iterable[dict[str, object]]) -> str:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for row in rows:
        writer.writerow({key: row.get(key, "") for key in fieldnames})
    return buffer.getvalue()


def _parse_int(value: str, *, field: str, row_number: int) -> int | None:
    if value == "":
        return None
    try:
        return int(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Row {row_number}: {field} must be an integer.",
        ) from exc


def _parse_float(value: str, *, field: str, row_number: int) -> float | None:
    if value == "":
        return None
    try:
        return float(value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Row {row_number}: {field} must be a number.",
        ) from exc


def _parse_bool(value: str, *, default: bool = True) -> bool:
    if value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def export_products_csv(db: Session, *, user: User) -> str:
    products = db.query(Product).filter(Product.owner_id == user.id).order_by(Product.name.asc()).all()
    rows = []
    for product in products:
        sync_product_current_stock(db, product.id)
        rows.append(
            {
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "description": product.description or "",
                "category": product.category or "",
                "price": product.price,
                "cost": product.cost,
                "current_stock": product.current_stock,
                "min_stock_threshold": product.min_stock_threshold,
                "supplier": product.supplier or "",
            }
        )
    return _to_csv(
        ["id", "name", "sku", "description", "category", "price", "cost", "current_stock", "min_stock_threshold", "supplier"],
        rows,
    )


def import_products_csv(db: Session, *, user: User, csv_text: str) -> dict[str, object]:
    rows = _read_rows(csv_text)
    created = 0
    updated = 0
    warnings: list[str] = []

    for index, row in enumerate(rows, start=2):
        sku = row.get("sku", "")
        name = row.get("name", "")
        if not sku or not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Row {index}: name and sku are required.")

        price = _parse_float(row.get("price", ""), field="price", row_number=index)
        cost = _parse_float(row.get("cost", ""), field="cost", row_number=index)
        min_stock_threshold = _parse_int(row.get("min_stock_threshold", ""), field="min_stock_threshold", row_number=index)
        requested_stock = _parse_int(row.get("current_stock", ""), field="current_stock", row_number=index)

        existing = db.query(Product).filter(Product.owner_id == user.id, Product.sku == sku).first()
        if existing is None:
            if price is None or cost is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Row {index}: price and cost are required for new products.")
            product = Product(
                owner_id=user.id,
                name=name,
                sku=sku,
                description=row.get("description") or None,
                category=row.get("category") or None,
                price=price,
                cost=cost,
                current_stock=0,
                min_stock_threshold=min_stock_threshold if min_stock_threshold is not None else 10,
                supplier=row.get("supplier") or None,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            if requested_stock and requested_stock > 0:
                seed_product_stock_from_legacy_current_stock(db, product=product, quantity=requested_stock, created_by=user.id)
                db.refresh(product)
            created += 1
            continue

        existing.name = name
        existing.description = row.get("description") or None
        existing.category = row.get("category") or None
        existing.supplier = row.get("supplier") or None
        if price is not None:
            existing.price = price
        if cost is not None:
            existing.cost = cost
        if min_stock_threshold is not None:
            existing.min_stock_threshold = min_stock_threshold
        db.add(existing)
        db.commit()
        db.refresh(existing)

        if requested_stock is not None:
            sync_product_current_stock(db, existing.id, commit=True)
            current_available = get_available(db, existing.id, None)
            delta = requested_stock - current_available
            if delta != 0:
                warehouse = get_default_warehouse(db, owner_id=user.id)
                adjust_stock(
                    db,
                    product_id=existing.id,
                    warehouse_id=warehouse.id,
                    quantity=abs(delta),
                    adjustment_type="POSITIVE" if delta > 0 else "NEGATIVE",
                    reason="CSV import stock sync",
                    notes="Applied through CSV import to preserve ledger truth.",
                    created_by=user.id,
                )
        else:
            warnings.append(f"Row {index}: current_stock omitted for {sku}; ledger stock left unchanged.")
        updated += 1

    return {"entity": "products", "created": created, "updated": updated, "warnings": warnings}


def export_warehouses_csv(db: Session, *, user: User) -> str:
    warehouses = db.query(Warehouse).filter(Warehouse.owner_id == user.id).order_by(Warehouse.name.asc()).all()
    rows = [
        {
            "id": warehouse.id,
            "name": warehouse.name,
            "code": warehouse.code,
            "address": warehouse.address or "",
            "is_active": warehouse.is_active,
        }
        for warehouse in warehouses
    ]
    return _to_csv(["id", "name", "code", "address", "is_active"], rows)


def import_warehouses_csv(db: Session, *, user: User, csv_text: str) -> dict[str, object]:
    rows = _read_rows(csv_text)
    created = 0
    updated = 0
    for index, row in enumerate(rows, start=2):
        name = row.get("name", "")
        code = row.get("code", "")
        if not name or not code:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Row {index}: name and code are required.")
        existing = db.query(Warehouse).filter(Warehouse.owner_id == user.id, Warehouse.code == code).first()
        if existing is None:
            existing = Warehouse(owner_id=user.id, name=name, code=code)
            created += 1
        else:
            updated += 1
        existing.name = name
        existing.address = row.get("address") or None
        existing.is_active = _parse_bool(row.get("is_active", ""), default=True)
        db.add(existing)
        db.commit()
    return {"entity": "warehouses", "created": created, "updated": updated, "warnings": []}


def export_suppliers_csv(db: Session, *, user: User) -> str:
    suppliers = db.query(Supplier).filter(Supplier.owner_id == user.id).order_by(Supplier.name.asc()).all()
    rows = [
        {
            "id": supplier.id,
            "name": supplier.name,
            "email": supplier.email or "",
            "phone": supplier.phone or "",
            "address": supplier.address or "",
            "lead_time_days": supplier.lead_time_days if supplier.lead_time_days is not None else "",
        }
        for supplier in suppliers
    ]
    return _to_csv(["id", "name", "email", "phone", "address", "lead_time_days"], rows)


def import_suppliers_csv(db: Session, *, user: User, csv_text: str) -> dict[str, object]:
    rows = _read_rows(csv_text)
    created = 0
    updated = 0
    for index, row in enumerate(rows, start=2):
        name = row.get("name", "")
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Row {index}: name is required.")
        lead_time_days = _parse_int(row.get("lead_time_days", ""), field="lead_time_days", row_number=index)
        existing = db.query(Supplier).filter(Supplier.owner_id == user.id, Supplier.name == name).first()
        if existing is None:
            existing = Supplier(owner_id=user.id, name=name)
            created += 1
        else:
            updated += 1
        existing.email = row.get("email") or None
        existing.phone = row.get("phone") or None
        existing.address = row.get("address") or None
        existing.lead_time_days = lead_time_days
        db.add(existing)
        db.commit()
    return {"entity": "suppliers", "created": created, "updated": updated, "warnings": []}


def export_sales_csv(db: Session, *, user: User) -> str:
    sales = (
        db.query(Sale, Product)
        .join(Product, Product.id == Sale.product_id)
        .filter(Sale.owner_id == user.id)
        .order_by(Sale.sale_date.desc())
        .all()
    )
    rows = [
        {
            "sale_id": sale.id,
            "sale_date": sale.sale_date.isoformat() if sale.sale_date else "",
            "sku": product.sku,
            "product_name": product.name,
            "quantity": sale.quantity,
            "unit_price": sale.unit_price,
            "total_amount": sale.total_amount,
            "customer_id": sale.customer_id or "",
            "order_id": sale.order_id or "",
        }
        for sale, product in sales
    ]
    return _to_csv(
        ["sale_id", "sale_date", "sku", "product_name", "quantity", "unit_price", "total_amount", "customer_id", "order_id"],
        rows,
    )


def export_purchase_orders_csv(db: Session, *, user: User) -> str:
    orders = list_purchase_orders(db, owner_id=user.id)
    rows: list[dict[str, object]] = []
    for order in orders:
        if not order.items:
            rows.append(
                {
                    "po_number": order.po_number,
                    "status": order.status,
                    "supplier_id": order.supplier_id or "",
                    "order_date": order.order_date.isoformat() if order.order_date else "",
                    "expected_arrival_date": order.expected_arrival_date.isoformat() if order.expected_arrival_date else "",
                    "product_id": "",
                    "warehouse_id": "",
                    "quantity_ordered": "",
                    "quantity_received": "",
                    "unit_cost": "",
                    "notes": order.notes or "",
                }
            )
            continue
        for item in order.items:
            rows.append(
                {
                    "po_number": order.po_number,
                    "status": order.status,
                    "supplier_id": order.supplier_id or "",
                    "order_date": order.order_date.isoformat() if order.order_date else "",
                    "expected_arrival_date": order.expected_arrival_date.isoformat() if order.expected_arrival_date else "",
                    "product_id": item.product_id,
                    "warehouse_id": item.warehouse_id or "",
                    "quantity_ordered": item.quantity_ordered,
                    "quantity_received": item.quantity_received,
                    "unit_cost": item.unit_cost,
                    "notes": order.notes or "",
                }
            )
    return _to_csv(
        [
            "po_number",
            "status",
            "supplier_id",
            "order_date",
            "expected_arrival_date",
            "product_id",
            "warehouse_id",
            "quantity_ordered",
            "quantity_received",
            "unit_cost",
            "notes",
        ],
        rows,
    )
