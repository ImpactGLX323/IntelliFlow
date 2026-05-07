# IntelliFlow

IntelliFlow is a FastAPI, Next.js, and Expo platform for inventory control, sales and purchasing operations, returns analytics, logistics intelligence, MCP/RAG-backed copilots, notifications, CSV workflows, demo mode, and LHDN-ready e-invoicing preparation.

## Product Areas

- Inventory
  - ledger-first stock position
  - stock receiving, adjustment, reservation, release, consume, transfer
  - warehouse management
  - inventory risks and low-stock visibility
  - CSV import/export for products, suppliers, and warehouses
- Sales
  - customers
  - direct sales records
  - sales orders with confirmation and fulfillment
  - best-seller and sales insight surfaces
  - CSV export
- Purchasing
  - suppliers
  - purchase orders
  - ordered and received states
  - CSV export
- Returns
  - return orders
  - return intake and refund flows
  - profit leakage and high-return analytics
- Logistics
  - shipments, route legs, ports, routes
  - delayed shipment detection
  - delay impact analysis
  - Indo-Pacific and Malaysian port/route preview intelligence
- MCP + RAG
  - internal MCP registry and tool routing
  - inventory, sales, returns, logistics, RAG, and free integration MCP domains
  - AI Copilot orchestration with plan-aware guardrails
- E-Invoicing
  - LHDN-ready e-invoicing preparation from recorded sales
  - readiness and validation status tracking
- Notifications
  - unread list
  - mark-read flow
  - per-category preferences
  - tiered operational alert categories
- Free Integrations
  - warehouse directory preview
  - Malaysia port-risk preview
  - BNM rates
  - Malaysia demand signals
  - marketplace and market-intelligence provider stubs with truthful `not_configured` behavior

## Plan Tiers

- Free
  - inventory starter
  - public/free integrations
  - basic notifications
  - basic inventory MCP and copilot workflows
- Premium
  - multi-step operations
  - sales, purchasing, returns, reorder, basic RAG
  - own-store marketplace integration stubs
- Boost
  - logistics control tower
  - advanced logistics and compliance flows
  - advanced recommendations
  - market-intelligence provider stubs

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- OpenAI-compatible provider path for copilot and RAG
- Firebase-backed auth integration

### Web
- Next.js 14
- TypeScript
- Tailwind CSS

### Mobile
- Expo / React Native
- centralized API client
- branded loading, demo bootstrapping, and plan-aware workspaces

## Current Architecture

```text
Frontend / Mobile
  -> FastAPI routers
    -> service layer
      -> stock ledger / analytics / logistics / notifications / integrations
        -> MCP client and MCP tool registry
          -> AI Copilot orchestrator
```

Key backend areas:

- `backend/app/routers/`
- `backend/app/services/`
- `backend/app/mcp/`
- `backend/app/agents/`
- `backend/app/integrations/`

Key client areas:

- `frontend/app/`
- `frontend/components/`
- `mobile/src/`

## Main Backend Routes

### System and Demo
- `GET /health`
- `GET /ready`
- `GET /public/app-config`
- `POST /demo/bootstrap`
- `POST /demo/login`

### Auth
- `POST /api/auth/register`
- `GET /api/auth/me`

### Inventory and Operations
- `GET /api/products/`
- `POST /api/products/`
- `GET /api/inventory/transactions`
- `POST /api/inventory/receive`
- `POST /api/inventory/adjust`
- `POST /api/inventory/transfer`
- `GET /api/warehouses`
- `POST /api/warehouses`
- `GET /api/reorder/suggestions`

### Sales / Purchasing / Returns
- `GET /api/sales/`
- `POST /api/sales/`
- `GET /api/sales-orders/`
- `POST /api/sales-orders/`
- `GET /api/purchase-orders/`
- `POST /api/purchase-orders/`
- `GET /api/returns/`
- `POST /api/returns/`

### Logistics
- `GET /api/shipments`
- `POST /api/shipments`
- `GET /api/shipments/analytics/delayed`
- `GET /api/routes`
- `GET /api/ports`
- `GET /public/logistics/indo-pacific-ship-flow`

### AI / MCP
- `POST /ai-copilot/query`
- `GET /api/ai/capabilities`
- `GET /api/ai/recommendations`
- `GET /mcp-dev/registry`
- `POST /mcp-dev/tools/{tool_name}`
- `POST /mcp-dev/resources/read`

### Notifications
- `GET /api/notifications/`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/{notification_id}/read`
- `GET /api/notifications/preferences`
- `PUT /api/notifications/preferences/{category}`
- `POST /api/notifications/devices`

### E-Invoicing
- `GET /api/einvoicing/summary`
- `GET /api/einvoicing/documents`
- `POST /api/einvoicing/from-sale/{sale_id}`

### Free Integrations
- `GET /integrations/free/registry`
- `GET /integrations/free/status`
- `GET /integrations/free/warehouses/malaysia`
- `GET /integrations/free/warehouses/nearby`
- `GET /integrations/free/logistics/malaysia-port-risk`
- `GET /integrations/free/finance/bnm-rates`
- `GET /integrations/free/market/malaysia-demand-signals`

## Web App Coverage

The web app currently includes working pages for:

- Dashboard
- Inventory
- Sales
- Purchasing
- Transfers
- Returns
- Logistics
- Compliance / MCP + RAG
- E-Invoicing
- AI Copilot
- Notifications
- Plans

## Mobile App Coverage

The mobile app currently includes working screens for:

- startup, login, register, loading, service unavailable
- dashboard / overview
- inventory
- sales
- purchasing
- returns
- logistics
- compliance
- e-invoicing
- AI copilot
- plans
- notifications
- profile/account

## Copilot and RAG

The copilot is:

- plan-aware
- MCP-routed
- guarded against off-topic and oversized prompts on lower tiers
- able to fall back safely when provider/runtime issues occur

Important:

- preview data is labeled preview
- demand signals are not mislabeled as real national sales
- paid-provider workflows return `not_configured` instead of fake live claims

## Notifications

Implemented notification categories include:

- Free
  - low stock
  - stock received
  - stock adjusted
  - stock deducted
  - account/system alerts
- Premium
  - sales order alerts
  - purchase order due/overdue
  - reorder suggestions
  - return spike
  - profit leakage
  - weekly operations summary
  - basic RAG alerts
- Boost
  - shipment delayed
  - customs hold
  - port pressure high
  - route risk increased
  - supplier risk warning
  - AI recommendation created
  - compliance risk detected
  - approval required
  - daily operations brief

## CSV Support

Current CSV support:

- Products import/export
- Suppliers import/export
- Warehouses import/export
- Sales export
- Purchase orders export

## Local Startup

### Backend

```bash
cd backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
rm -rf .next
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

### Mobile

iOS simulator:

```bash
cd mobile
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npx expo start -c
```

Real device:

```bash
cd mobile
export EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8000
npm install
npx expo start -c
```

## Environment Notes

Backend `.env` commonly needs:

- `DATABASE_URL`
- `SECRET_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `AI_PROVIDER`
- Firebase admin configuration

Frontend:

- `NEXT_PUBLIC_API_URL`

Mobile:

- `EXPO_PUBLIC_API_URL`

## Demo Mode

The project supports demo mode with:

- backend bootstrap/login endpoints
- seeded operational demo data
- mobile auto-bootstrap support
- preview/offline fallback behavior

## Related Docs

- [docs/FEATURE_COMPLETION_AUDIT.md](/Users/sami/IntelliFlow/docs/FEATURE_COMPLETION_AUDIT.md)
- [docs/FREE_API_INTEGRATIONS.md](/Users/sami/IntelliFlow/docs/FREE_API_INTEGRATIONS.md)
- [backend/docs/demo_mode.md](/Users/sami/IntelliFlow/backend/docs/demo_mode.md)
- [DOCKER.md](/Users/sami/IntelliFlow/DOCKER.md)
