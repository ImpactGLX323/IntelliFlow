# IntelliFlow Quick Start Guide

## Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL database
- OpenAI API key (or compatible API)

## Quick Setup

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your settings:
```
DATABASE_URL=postgresql://user:password@localhost:5432/intelliflow
SECRET_KEY=your-secret-key-here
OPENAI_API_KEY=your-openai-api-key
```

Create the database:
```sql
CREATE DATABASE intelliflow;
```

Run migrations (if using Alembic):
```bash
alembic upgrade head
```

Or the tables will be created automatically on first run.

Start the backend:
```bash
python run.py
# or
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

### 3. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## First Steps

1. Register a new account at http://localhost:3000/register
2. Add products in the Products page
3. Record some sales
4. View your dashboard
5. Try the AI Copilot to get insights!

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in `.env`
- Verify database exists

### OpenAI API Issues
- Verify OPENAI_API_KEY is set
- Check API quota/limits
- For local LLMs, update OPENAI_BASE_URL

### Import Errors
- Ensure all dependencies are installed: `pip install -r requirements.txt`
- Activate virtual environment
- Check Python version (3.9+)

