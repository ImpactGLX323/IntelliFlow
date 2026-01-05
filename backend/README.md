# IntelliFlow Backend

FastAPI backend for the IntelliFlow e-commerce analytics and AI copilot platform.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up PostgreSQL database and update `.env` file:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

3. Run database migrations (if using Alembic):
```bash
alembic upgrade head
```

4. Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `OPENAI_API_KEY`: OpenAI API key for LLM
- `OPENAI_BASE_URL`: OpenAI API base URL (default: https://api.openai.com/v1)

