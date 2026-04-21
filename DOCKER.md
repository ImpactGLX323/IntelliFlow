# IntelliFlow Docker Setup

This setup runs the local web workspace as three containers:

- `postgres`: PostgreSQL 16 for application data.
- `backend`: FastAPI on `http://localhost:8000`.
- `frontend`: Next.js dev server on `http://localhost:3000`.

The mobile Expo app is intentionally not containerized because iOS simulator development should stay native on macOS.

## Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Backend health:

```text
http://localhost:8000/health
```

## Environment

Docker Compose reads values from your shell or a root `.env` file. To create one:

```bash
cp .env.docker.example .env
```

Then fill in Firebase and OpenAI values as needed.

## Documents And Secrets

Official RAG documents are mounted into the backend container at:

```text
/app/docs/official_docs
```

Firebase Admin credentials are mounted read-only from:

```text
backend/secrets
```

The default expected path inside Docker is:

```text
/app/secrets/firebase-admin-sdk.json
```

## Useful Commands

```bash
docker compose up --build
docker compose down
docker compose logs -f backend
docker compose logs -f frontend
docker compose exec backend alembic upgrade head
docker compose exec backend python -m pip check
```

## PyPI Network Issues

If the backend image fails while installing Python packages with `SSL:
CERTIFICATE_VERIFY_FAILED` or `403 Client Error: Forbidden` from
`files.pythonhosted.org`, Docker Desktop is likely using a network/proxy path
that cannot access PyPI correctly.

First try another network or disable VPN/proxy interception. If you still need
to build, set a temporary package mirror in your root `.env`:

```bash
PIP_INDEX_URL=https://pypi.org/simple
PIP_TRUSTED_HOSTS=pypi.org files.pythonhosted.org
```

Then rebuild:

```bash
export COMPOSE_BAKE=false
docker compose build --no-cache --progress=plain backend
```

To delete the local Docker database volume:

```bash
docker compose down -v
```
