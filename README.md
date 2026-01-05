# IntelliFlow - E-commerce Analytics & AI Copilot

A comprehensive web application that helps e-commerce sellers and dropshippers analyze inventory and sales data, identify best-selling products, detect risks, and generate AI-powered actionable task roadmaps using Retrieval-Augmented Generation (RAG).

## Features

- **Analytics Dashboard**: Real-time insights into revenue, orders, products, and stock alerts
- **Product Management**: Track inventory, prices, costs, and suppliers
- **Sales Tracking**: Record and analyze sales data
- **Risk Detection**: Automated alerts for low stock and inventory issues
- **AI Copilot**: Generate actionable roadmaps using RAG-powered AI analysis
- **Best Sellers Analysis**: Identify top-performing products
- **Trend Visualization**: Interactive charts for revenue and sales trends

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Vector Store**: FAISS for RAG
- **LLM**: LangChain + OpenAI-compatible API
- **Authentication**: JWT

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **HTTP Client**: Axios

## Project Structure

```
IntelliFlow/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── auth.py
│   │   ├── rag_system.py
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── products.py
│   │       ├── sales.py
│   │       ├── analytics.py
│   │       └── ai_copilot.py
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── register/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── sales/
│   │   └── copilot/
│   ├── components/
│   ├── contexts/
│   ├── lib/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up PostgreSQL database and create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

5. Update `.env` with:
   - `DATABASE_URL`: PostgreSQL connection string
   - `SECRET_KEY`: JWT secret key
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_BASE_URL`: OpenAI API base URL (default: https://api.openai.com/v1)

6. Run the server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.local.example .env.local
# Update NEXT_PUBLIC_API_URL if needed
```

4. Run the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Register/Login**: Create an account or sign in
2. **Add Products**: Go to Products page and add your inventory
3. **Record Sales**: Record sales transactions
4. **View Dashboard**: See analytics and trends
5. **Use AI Copilot**: Ask questions and get AI-powered roadmaps

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products/` - List products
- `POST /api/products/` - Create product
- `GET /api/products/{id}` - Get product
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Sales
- `GET /api/sales/` - List sales
- `POST /api/sales/` - Create sale
- `GET /api/sales/{id}` - Get sale

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard stats
- `GET /api/analytics/best-sellers` - Get best sellers
- `GET /api/analytics/inventory-risks` - Get inventory risks

### AI Copilot
- `POST /api/ai/roadmap` - Generate roadmap
- `GET /api/ai/insights` - Get quick insights

## Development

### Database Migrations

If you need to create database migrations:
```bash
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## License

MIT

