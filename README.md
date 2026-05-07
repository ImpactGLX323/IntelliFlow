# IntelliFlow

IntelliFlow is a supply-chain operations platform built with FastAPI, Next.js, and Expo / React Native. It combines ledger-first inventory control, sales and purchasing workflows, returns analytics, logistics intelligence, AI copilot workflows, notifications, CSV operations, free/public integrations, and LHDN-ready e-invoicing preparation.

This README reflects the current implemented state of the project and is aligned with [docs/FEATURE_COMPLETION_AUDIT.md](/Users/sami/IntelliFlow/docs/FEATURE_COMPLETION_AUDIT.md).

## Quick Start

If you cloned this project from GitHub and want to run it locally for the first time, follow this section first.

### 1. What you need installed

- `git`
- `Python 3.11+`
- `Node.js 20+`
- `npm`
- `PostgreSQL`
- `Expo Go` on your phone if you want to test the mobile app on a real device

### 2. Clone the project

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd IntelliFlow
```

### 3. Backend setup with `venv` and `requirements.txt`

The backend uses a Python virtual environment and installs dependencies from [backend/requirements.txt](/Users/sami/IntelliFlow/backend/requirements.txt).

Create and activate a virtual environment:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

Install backend dependencies:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Backend environment file

Create or update:

- [backend/.env](/Users/sami/IntelliFlow/backend/.env)

At minimum, make sure it contains working values for:

- database connection
- Firebase / auth configuration if you are not using demo-only access
- OpenAI provider values if you want live copilot answers

Important:
- do not commit real secrets
- if the OpenAI key is invalid, copilot will fall back to template behavior

### 5. Database setup

Make sure PostgreSQL is running, then apply migrations:

```bash
cd /Users/sami/IntelliFlow/backend
source venv/bin/activate
alembic upgrade head
```

### 6. Start the backend

```bash
cd /Users/sami/IntelliFlow/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Once it starts, check:

- Swagger UI: `http://127.0.0.1:8000/docs`
- health check: `http://127.0.0.1:8000/health`

### 7. Frontend setup

Open a new terminal:

```bash
cd /Users/sami/IntelliFlow/frontend
npm install
```

Set the backend URL for the web app:

```bash
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
rm -rf .next
npm run dev
```

Open:

- `http://localhost:3000`

### 8. Mobile setup

Open another terminal:

```bash
cd /Users/sami/IntelliFlow/mobile
npm install
```

If you are using the iOS simulator on the same Mac:

```bash
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npx expo start -c
```

If you are using a real phone on the same Wi-Fi:

```bash
ipconfig getifaddr en0
```

Then use the returned IP:

```bash
export EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8000
npx expo start -c
```

Then scan the Expo QR code with Expo Go.

### 9. First things to test

After all three apps are running:

1. Open the backend docs at `http://127.0.0.1:8000/docs`
2. Open the web app at `http://localhost:3000`
3. Open the mobile app in Expo
4. Log in or use demo mode if enabled
5. Check that dashboard, inventory, sales, and copilot load without backend errors

### 10. Common problems

- Backend does not start:
  - check PostgreSQL
  - run `alembic upgrade head`
  - verify `backend/.env`
- Frontend shows strange Next.js chunk errors:
  - run `rm -rf .next`
  - restart `npm run dev`
- Mobile says service unavailable:
  - make sure `EXPO_PUBLIC_API_URL` points to your real backend
  - phones cannot use `127.0.0.1` unless they are emulators on the same machine
- Copilot does not give live answers:
  - check `OPENAI_API_KEY` in `backend/.env`
  - backend may be in template fallback mode

## Installation Summary

```text
1. Clone repo
2. Create backend venv
3. pip install -r backend/requirements.txt
4. Configure backend/.env
5. Run alembic upgrade head
6. Start FastAPI backend
7. npm install in frontend and run dev
8. npm install in mobile and start Expo
```

## Scope

IntelliFlow currently covers:
- inventory and warehouse operations
- sales, sales orders, and fulfillment
- purchasing and inbound receiving
- returns and profit leakage analytics
- logistics and port-risk intelligence
- MCP + RAG operational assistant workflows
- AI copilot with plan-aware guardrails
- notifications and user preferences
- CSV import/export workflows
- free/public data integrations
- mobile and web workspace parity
- demo mode and branded startup/auth flows

## Functional Requirements

### Core workspace requirements
- Users must be able to authenticate through Firebase-backed flows or demo mode.
- Users must only see and operate on their own scoped data.
- Plans must be enforced on the backend, not only in the UI.
- Inventory must use ledger-derived truth for stock operations.
- Web and mobile must expose the same core workspace sections and plan concepts.

### Inventory and warehouse requirements
- Create and manage product records.
- Create and manage warehouses.
- Receive stock, adjust stock, and transfer stock.
- Show on-hand, reserved, damaged, quarantined, and available stock.
- Show low-stock risks and recent inventory movements.
- Support CSV import/export for products, warehouses, and suppliers.

### Sales requirements
- Create customers.
- Create and manage sales orders.
- Confirm orders, reserve stock, and fulfill order items.
- Record direct sales.
- Show best-seller and sales insight workflows.

### Purchasing requirements
- Create and manage suppliers.
- Create purchase orders.
- Mark POs ordered and receive PO items.
- Surface reorder suggestions where allowed by plan.

### Returns requirements
- Create and approve return orders.
- Receive returned items.
- Show return analytics, high-return products, and profit leakage.

### Logistics requirements
- Create and update shipments.
- Add shipment legs and status changes.
- Show delayed shipments and delay impact.
- Show Indo-Pacific flow and Malaysia port-risk intelligence with truthful preview/live labels.

### AI, MCP, and RAG requirements
- Route operational questions through backend MCP tools and resources.
- Enforce plan-aware copilot limits and allowed domains.
- Return structured answers, citations, warnings, and recommendations.
- Avoid fake “live” or fake “compliant” claims.

### Notifications requirements
- Store notifications in backend persistence.
- Track unread counts and mark-read state.
- Store per-category user preferences.
- Support device registration for push delivery.
- Support tiered categories for Free, Premium, and Boost.

### E-invoicing requirements
- Generate LHDN-ready e-invoicing documents from recorded sales.
- Show readiness and validation notes.
- Avoid unsupported claims such as official certification unless proven.

### Free/public integration requirements
- Show public or preview warehouse directory data.
- Show Malaysia demand signals as demand signals, not national confirmed sales.
- Show BNM rates where available.
- Show weather/marine and preview port-risk data without claiming live AIS.
- Return `not_configured` instead of fabricating premium or paid-provider data.

## Non-Functional Requirements

- Security
  - backend-only API keys and secrets
  - tenant-scoped data access
  - backend-enforced plan gating
- Reliability
  - cache and rate-limit public integrations
  - degrade safely when providers fail
  - allow copilot fallback when the configured model provider is unavailable
- Data truth
  - ledger-first stock truth
  - truthful preview/live provider labeling
  - no scraping-based fake intelligence
- Usability
  - responsive web layouts
  - portrait-first mobile UX
  - safe-area aware mobile layout
  - branded loading and failure states
- Maintainability
  - service-layer business logic
  - centralized web/mobile API clients
  - shared navigation metadata by platform
- Performance
  - server-side pagination and filtered queries where appropriate
  - structured data rendering instead of raw payload dumps
  - cached external integration responses

## Product Tiers

### Free
- inventory starter
- low-stock monitoring
- basic warehouse visibility
- public/free integrations
- basic inventory copilot workflows
- basic notifications

### Premium
- everything in Free
- sales, purchasing, and returns workflows
- reorder suggestions
- basic RAG/compliance workflows
- own-store marketplace integration stubs
- premium notification categories

### Boost
- everything in Premium
- logistics control tower
- route and port-pressure intelligence
- advanced MCP and recommendation workflows
- market-intelligence provider stubs
- boost notification categories

## Architecture

```text
Web / Mobile UI
  -> centralized API client
    -> Firebase token / demo token
      -> FastAPI router
        -> auth + plan enforcement
          -> services / MCP / integrations
            -> PostgreSQL + cached external provider data
              -> structured response
                -> web/mobile rendering
```

### Backend skeleton

```text
backend/
  app/
    main.py
    auth.py
    database.py
    models.py
    schemas.py
    core/
    routers/
    services/
    agents/
    mcp/
    integrations/
    jobs/
  alembic/
  scripts/
```

### Frontend skeleton

```text
frontend/
  app/
    (public)/
    (app)/
  components/
  contexts/
  lib/
    api/
    firebase/
    utils/
    navigation.ts
  types/
```

### Mobile skeleton

```text
mobile/
  src/
    MobileApp.js
    api.js
    config/
    services/
    navigation/
    components/
    screens/
    theme/
    types/
```

### MCP skeleton

```text
backend/app/mcp/
  client.py
  server.py
  schemas.py
  inventory_mcp.py
  sales_mcp.py
  returns_mcp.py
  logistics_mcp.py
  rag_mcp.py
  free_integrations_mcp.py
  integration_registry.py
```

## Backend APIs

### System and demo
- `GET /health`
- `GET /ready`
- `GET /public/app-config`
- `POST /demo/bootstrap`
- `POST /demo/login`

### Auth
- `POST /api/auth/register`
- `GET /api/auth/me`

### Inventory and products
- `GET /api/products/`
- `POST /api/products/`
- `PUT /api/products/{product_id}`
- `GET /api/products/export/csv`
- `POST /api/products/import/csv`
- `GET /api/inventory/transactions`
- `POST /api/inventory/receive`
- `POST /api/inventory/adjust`
- `POST /api/inventory/transfer`
- `GET /api/warehouses`
- `POST /api/warehouses`
- `GET /api/reorder/suggestions`

### Sales
- `GET /api/customers/`
- `POST /api/customers/`
- `GET /api/sales/`
- `POST /api/sales/`
- `GET /api/sales/export/csv`
- `GET /api/sales-orders/`
- `POST /api/sales-orders/`
- `POST /api/sales-orders/{order_id}/confirm`
- `POST /api/sales-orders/{order_id}/items/{item_id}/fulfill`

### Purchasing
- `GET /api/suppliers/`
- `POST /api/suppliers/`
- `GET /api/suppliers/export/csv`
- `POST /api/suppliers/import/csv`
- `GET /api/purchase-orders/`
- `POST /api/purchase-orders/`
- `GET /api/purchase-orders/export/csv`
- `POST /api/purchase-orders/{purchase_order_id}/mark-ordered`
- `POST /api/purchase-orders/{order_id}/items/{item_id}/receive`

### Returns
- `GET /api/returns/`
- `POST /api/returns/`
- `POST /api/returns/{return_id}/approve`
- `POST /api/returns/{return_id}/items/{item_id}/receive`
- `GET /api/returns/analytics/profit-leakage`
- `GET /api/returns/analytics/high-return-products`

### Logistics
- `GET /api/shipments`
- `POST /api/shipments`
- `POST /api/shipments/{shipment_id}/status`
- `POST /api/shipments/{shipment_id}/legs`
- `GET /api/shipments/analytics/delayed`
- `GET /api/shipments/{shipment_id}/delay-impact`
- `GET /api/routes`
- `GET /api/ports`
- `GET /public/logistics/indo-pacific-ship-flow`

### AI / MCP / recommendations
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

### E-invoicing
- `GET /api/einvoicing/summary`
- `GET /api/einvoicing/documents`
- `POST /api/einvoicing/from-sale/{sale_id}`

### Free/public integrations
- `GET /integrations/free/registry`
- `GET /integrations/free/status`
- `GET /integrations/free/usage`
- `GET /integrations/free/warehouses/malaysia`
- `GET /integrations/free/warehouses/nearby`
- `GET /integrations/free/logistics/malaysia-port-risk`
- `GET /integrations/free/finance/bnm-rates`
- `GET /integrations/free/market/malaysia-demand-signals`
- `GET /integrations/marketplaces/providers`
- `POST /integrations/marketplaces/{provider}/connect`
- `GET /integrations/marketplaces/own-sales/best-sellers/weekly`
- `GET /integrations/market-intelligence/malaysia-best-sellers/weekly`

## External APIs and Providers

### Currently integrated or scaffolded through backend adapters
- OpenAI-compatible provider path
  - purpose: copilot / answer generation
  - scope: backend only
- data.gov.my
  - purpose: public Malaysian data
  - tier: Free
- BNM OpenAPI
  - purpose: financial / FX rates
  - tier: Free
- OpenStreetMap Nominatim / Overpass
  - purpose: geocoding and public warehouse directory discovery
  - tier: Free
- Open-Meteo / Open-Meteo Marine
  - purpose: weather and marine-risk preview
  - tier: Free
- Google Trends alpha provider stub
  - purpose: demand-signal proxy
  - tier: Boost or configured advanced usage
- Shopee / Lazada / TikTok Shop stubs
  - purpose: user-owned marketplace integrations
  - tier: Premium
- Paid market intelligence / 3PL / warehouse provider stubs
  - purpose: Boost-only live provider readiness
  - tier: Boost

### Data truth rules
- Public/preview integrations must be labeled as preview or public when not truly live.
- Demand signals must not be mislabeled as confirmed market sales.
- Marketplace “best sellers” are only valid for user-owned connected store data.
- Paid-provider sections must return `not_configured` when credentials or provider contracts are absent.

## Web Features

The web app currently includes:
- landing page and plan messaging
- login, register, and reset-password flows
- dashboard with operational overview
- inventory workspace
- products workspace
- sales workspace
- purchasing workspace
- transfers workspace
- returns workspace
- logistics control tower workspace
- MCP + RAG / compliance workspace
- e-invoicing workspace
- AI copilot workspace
- notifications workspace
- profile workspace
- plans workspace
- recommendations workspace

Implemented web workflow coverage:
- product quick-create inside operational flows
- receive / adjust / transfer inventory
- create customers and suppliers
- create/confirm/fulfill sales orders
- create/mark/receive purchase orders
- create and receive return orders
- CSV import/export panels
- structured copilot and analytics rendering
- branded sidebar, topbar, and navigation parity

## Mobile Features

The mobile app currently includes:
- startup / landing flow
- sign-in, sign-up, password reset, and demo session support
- branded loading and service-unavailable states
- overview dashboard
- inventory screen
- sales screen
- purchasing screen
- returns screen
- logistics screen
- MCP + RAG screen
- e-invoicing screen
- AI copilot screen
- plans screen
- notifications screen
- profile screen

Implemented mobile workflow coverage:
- centralized backend API client
- inventory receive / adjust / transfer flows
- customers, suppliers, sales orders, purchase orders, returns
- CSV import/export surfaces
- structured copilot result rendering
- Leaflet-based logistics map via WebView
- notification preferences and device registration path
- light-mode branded workspace shell

## Notification System

### Free categories
- low stock
- stock received
- stock adjusted
- stock deducted
- account and system alerts

### Premium categories
- sales order alerts
- purchase order due / overdue
- reorder suggestions
- return spike
- profit leakage
- weekly operations summary
- basic RAG alerts

### Boost categories
- shipment delayed
- customs hold
- port pressure high
- route risk increased
- supplier risk warning
- AI recommendation created
- compliance risk detected
- approval required
- daily operations brief

### Delivery model
- in-app notifications: default
- push notifications: urgent or actionable events
- email: reserved for future summaries, reports, and security workflows

## CSV Support

### Backend-supported CSV flows
- products import/export
- suppliers import/export
- warehouses import/export
- sales export
- purchase orders export

### Web surfaces
- inventory CSV panels
- sales export
- purchasing export

### Mobile surfaces
- inventory CSV panels
- sales export
- purchasing export

## Test and Verification Suite

### Backend checks
- static compile checks with `python3 -m py_compile`
- focused sanity scripts in `backend/scripts/`
  - `free_integrations_sanity_check.py`
  - `demo_flow_sanity_check.py`

### Frontend checks
- `npm run lint`
- `npm run build`

### Mobile checks
- `npx expo config --json`
- `npx expo export --platform ios --output-dir /private/tmp/<export-dir>`

### Recently validated in the audit
- backend core app, routers, MCP, and services compile
- frontend lint passes
- frontend production build passes
- mobile Expo config passes
- mobile iOS export passes

See the latest verification summary in [docs/FEATURE_COMPLETION_AUDIT.md](/Users/sami/IntelliFlow/docs/FEATURE_COMPLETION_AUDIT.md).

## Local Run Commands

### Backend
```bash
cd /Users/sami/IntelliFlow/backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd /Users/sami/IntelliFlow/frontend
rm -rf .next
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npm run dev
```

### Mobile on iOS simulator
```bash
cd /Users/sami/IntelliFlow/mobile
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npm install
npx expo start -c
```

### Mobile on a real device
```bash
cd /Users/sami/IntelliFlow/mobile
export EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8000
npm install
npx expo start -c
```

## Known Current Risks

- Live copilot output still depends on a valid OpenAI key in `backend/.env`.
- Push notification delivery now has a real client registration path, but physical-device delivery still needs runtime confirmation.
- Some compatibility `current_stock` paths remain alongside ledger-derived stock fields for import/update bridging.
- `mobile/src/MobileApp.js` still contains a relatively large app-shell composition and should continue to be broken into smaller components over time.

## Source of Truth Documents

- Audit and current feature coverage:
  - [docs/FEATURE_COMPLETION_AUDIT.md](/Users/sami/IntelliFlow/docs/FEATURE_COMPLETION_AUDIT.md)
- Primary code entry points:
  - [backend/app/main.py](/Users/sami/IntelliFlow/backend/app/main.py)
  - [frontend/lib/api/client.ts](/Users/sami/IntelliFlow/frontend/lib/api/client.ts)
  - [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js)
