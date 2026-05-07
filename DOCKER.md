# IntelliFlow Docker

This Docker setup has been rebuilt from scratch around the current app shape:

- `postgres`: PostgreSQL 16
- `backend`: FastAPI + Alembic migrations on startup
- `frontend`: Next.js dev server

The Expo mobile app is still meant to run natively on macOS and connect to the
backend container through `http://YOUR_MAC_LAN_IP:8000`.

## Files

- [docker-compose.yml](./docker-compose.yml)
- [backend/Dockerfile](./backend/Dockerfile)
- [backend/scripts/docker-entrypoint.sh](./backend/scripts/docker-entrypoint.sh)
- [frontend/Dockerfile](./frontend/Dockerfile)
- [.env.docker.example](./.env.docker.example)

## First Run

1. Copy the Docker environment template:

```bash
cp .env.docker.example .env.docker
```

2. Start the stack:

```bash
docker compose --env-file .env.docker up --build
```

3. Open:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

## Behavior

- PostgreSQL persists in the `postgres_data` named volume.
- The backend runs `alembic upgrade head` before starting `uvicorn`.
- The frontend runs in development mode with live source mounts.
- Backend secrets are not baked into the image. Firebase Admin credentials are
  mounted read-only from `backend/secrets`.
- Docker uses `DOCKER_DATABASE_URL` so the backend container does not
  accidentally inherit a host-only `DATABASE_URL` that points at `localhost`.

## Mobile With Docker Backend

Run Expo natively and point it to your Mac:

```bash
cd mobile
export EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8000
npx expo start -c
```

## Useful Commands

Start:

```bash
docker compose --env-file .env.docker up --build
```

Stop:

```bash
docker compose down
```

Stop and remove database volume:

```bash
docker compose down -v
```

Backend logs:

```bash
docker compose logs -f backend
```

Frontend logs:

```bash
docker compose logs -f frontend
```

Postgres shell:

```bash
docker compose exec postgres psql -U intelliflow -d intelliflow
```

Backend shell:

```bash
docker compose exec backend sh
```

## Notes

- This setup intentionally does not containerize Expo/mobile.
- If you want a production container layout later, build from the `production`
  stage in [frontend/Dockerfile](./frontend/Dockerfile) and switch the backend
  command away from `--reload`.
- Keep real secrets out of `.env.docker.example`.
