#!/bin/sh
set -eu

echo "Waiting for database migrations to apply..."
alembic upgrade head

echo "Starting IntelliFlow backend..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
