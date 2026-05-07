# IntelliFlow Feature Completion Audit

## 1. Executive Summary
- Overall status: `BLOCKED`
- Biggest blockers:
  - Backend tier enforcement is incomplete for core operational APIs. Sales, purchasing, returns, and logistics routers are authenticated but not subscription-gated.
  - Subscription truth is weak. MCP/copilot gating falls back to client-supplied plan values because the user model does not persist a reliable tier field.
  - Web coverage is incomplete for Premium/Boost. Purchasing, transfers, alerts, and several control-tower surfaces are still scaffold placeholders.
  - Notification system is effectively missing across backend, web, and mobile.
  - Navigation parity between web and mobile is only partial.
- Ready for finishing touches? `NO`
- Safe checks run:
  - `python3 -m py_compile ...` on backend app modules: `PASS`
  - `frontend npm run lint`: `PASS`
  - `frontend npm run build`: `PASS`
  - `mobile npx expo config --json`: `PASS`
  - `python3 scripts/feature_audit_static.py`: generated [docs/feature_audit_static.json](/Users/sami/IntelliFlow/docs/feature_audit_static.json)

## 2. Critical Blockers
| Priority | Area | Problem | Evidence | Required Fix |
| --- | --- | --- | --- | --- |
| P0 | Backend plan gating | Core operational APIs are not tier-gated. Free users can hit logistics, returns, purchase-order, and sales-order endpoints if authenticated. | [backend/app/routers/logistics.py](/Users/sami/IntelliFlow/backend/app/routers/logistics.py), [backend/app/routers/purchase_orders.py](/Users/sami/IntelliFlow/backend/app/routers/purchase_orders.py), [backend/app/routers/sales_orders.py](/Users/sami/IntelliFlow/backend/app/routers/sales_orders.py), [backend/app/routers/returns.py](/Users/sami/IntelliFlow/backend/app/routers/returns.py): all use `get_current_user` only, no plan gate. | Add server-side plan enforcement decorators/dependencies for Premium and Boost routes. |
| P0 | Subscription truth | Effective plan can come from the request instead of persisted account state. | [backend/app/mcp/client.py](/Users/sami/IntelliFlow/backend/app/mcp/client.py): `effective_plan_level()` falls back to `requested_plan`; `resolve_plan_level()` notes the user model does not yet persist subscription state. | Persist plan on the user/org/subscription model and make routing/MCP resolve from DB truth only. |
| P0 | Web product coverage | Premium/Boost sections are marketed but key app pages are still placeholders. | [frontend/app/(app)/purchasing/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/purchasing/page.tsx), [frontend/app/(app)/transfers/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/transfers/page.tsx), [frontend/app/(app)/alerts/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/alerts/page.tsx) all render `FeaturePlaceholder`. | Build real web screens for purchasing, transfers, and alerts before polish. |
| P0 | Notifications | Notification system is absent. | Repo-wide search only finds copy text in [frontend/app/(app)/alerts/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/alerts/page.tsx). No backend router/model/service, no mobile push registration. | Implement backend notification models/routes/preferences and mobile/web consumers, or de-scope the feature explicitly. |
| P0 | Navigation parity | Web and mobile do not expose the same product structure. | Web app sidebar: [frontend/components/layout/Sidebar.tsx](/Users/sami/IntelliFlow/frontend/components/layout/Sidebar.tsx). Mobile tracker config: [mobile/src/navigation/navigationConfig.js](/Users/sami/IntelliFlow/mobile/src/navigation/navigationConfig.js). Labels and section set do not fully match. | Normalize route metadata and expose the same sections, names, and plan expectations on both clients. |
| P1 | Copilot contract parity | Web still uses legacy `/api/ai/query` response shape while mobile uses `/ai-copilot/query`. | [frontend/lib/api/copilot.ts](/Users/sami/IntelliFlow/frontend/lib/api/copilot.ts), [frontend/types/copilot.ts](/Users/sami/IntelliFlow/frontend/types/copilot.ts), [mobile/src/services/apiClient.js](/Users/sami/IntelliFlow/mobile/src/services/apiClient.js). | Migrate web to the new copilot endpoint/response shape or maintain both contracts intentionally. |
| P1 | Hosted demo config | Mobile demo fallback still uses a placeholder hosted URL. | [mobile/app.json](/Users/sami/IntelliFlow/mobile/app.json): `extra.apiUrl` is `https://YOUR_HOSTED_DEMO_BACKEND_URL`. | Replace placeholder with real hosted demo backend before demo use. |

## 3. Free Plan Checklist
| Feature | Backend | Web | Mobile | Gating | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Basic product/SKU management | PASS | PASS | PASS | PASS | PASS | [backend/app/routers/products.py](/Users/sami/IntelliFlow/backend/app/routers/products.py) `create_product/get_products`; [frontend/app/(app)/products/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/products/page.tsx) `ProductsPage`; [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) `ProductsScreen` | CRUD exists end-to-end. |
| Basic inventory tracking | PASS | PARTIAL | PASS | PASS | PARTIAL | [backend/app/routers/inventory.py](/Users/sami/IntelliFlow/backend/app/routers/inventory.py); web [frontend/app/(app)/inventory/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/inventory/page.tsx) only shows analytics/recommendations; mobile `InventoryScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) | Web lacks operational receive/adjust UI. |
| Stock ledger history | PASS | MISSING | PASS | PASS | PARTIAL | [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) `create_inventory_transaction/get_stock_movements_by_sku`; mobile `InventoryScreen` shows `Recent inventory movements`; web inventory page has no transaction list | Backend is solid, web surface is missing. |
| On-hand / available / reserved stock | PASS | MISSING | PASS | PASS | PARTIAL | [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) `get_stock_position`; mobile `InventoryScreen`; web inventory page does not expose stock position | Core service exists. |
| Manual stock adjustment | PASS | MISSING | PASS | PASS | PARTIAL | [backend/app/routers/inventory.py](/Users/sami/IntelliFlow/backend/app/routers/inventory.py) `/inventory/adjust`; mobile `InventoryScreen` `adjustStock`; no real web adjustments page beyond placeholder [frontend/app/(app)/inventory/adjustments/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/inventory/adjustments/page.tsx) | Web incomplete. |
| Basic purchase receiving | PASS | MISSING | PASS | FAIL | PARTIAL | [backend/app/services/purchasing_service.py](/Users/sami/IntelliFlow/backend/app/services/purchasing_service.py) `receive_purchase_order_item`; mobile `PurchasingScreen`; web purchasing page placeholder | Free expectations may be limited, but surface is not present on web. |
| Basic sales stock deduction | PASS | PASS | PASS | PASS | PASS | [backend/app/services/sales_service.py](/Users/sami/IntelliFlow/backend/app/services/sales_service.py) `fulfill_sales_order_item`; [frontend/app/(app)/sales/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/sales/page.tsx); mobile `SalesScreen` | Fulfillment path consumes reservation through ledger. |
| Basic supplier/customer records | PASS | MISSING | PASS | PASS | PARTIAL | [backend/app/routers/customers.py](/Users/sami/IntelliFlow/backend/app/routers/customers.py), [backend/app/routers/suppliers.py](/Users/sami/IntelliFlow/backend/app/routers/suppliers.py); mobile `SalesScreen`/`PurchasingScreen`; no dedicated web pages found | APIs exist, web dedicated surfaces missing. |
| Low-stock alerts | PASS | PASS | PASS | PASS | PASS | [backend/app/routers/analytics.py](/Users/sami/IntelliFlow/backend/app/routers/analytics.py) `get_inventory_risks`; web `InventoryPage`; mobile `InventoryScreen` | Treated as analytics/risk board rather than notification center. |
| Recent stock movements | PASS | MISSING | PASS | PASS | PARTIAL | Same evidence as stock ledger history | Web missing. |
| Basic inventory dashboard | PASS | PASS | PASS | PASS | PASS | [backend/app/routers/analytics.py](/Users/sami/IntelliFlow/backend/app/routers/analytics.py) `get_dashboard_stats`; [frontend/app/(app)/dashboard/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/dashboard/page.tsx); mobile `DashboardScreen` | Basic overview exists. |
| CSV import/export | MISSING | MISSING | MISSING | LOCKED_OK | MISSING | No CSV import/export routes or UI found in static scan | Not implemented. |
| Basic in-app notifications | MISSING | MISSING | MISSING | FAIL | MISSING | Repo-wide notification scan found no implementation beyond placeholder copy | Core gap. |
| Basic inventory assistant / MCP inventory access | PASS | PASS | PASS | PASS | PASS | [backend/app/mcp/inventory_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/inventory_mcp.py) `inventory.get_stock_position`, `inventory.get_low_stock_items`; web `CopilotPage`; mobile `CopilotScreen` | MCP inventory read-only Free access exists. |
| Premium/Boost features locked from Free | PARTIAL | PARTIAL | PARTIAL | FAIL | FAIL | Backend MCP gating exists in [backend/app/mcp/authz.py](/Users/sami/IntelliFlow/backend/app/mcp/authz.py), but operational routers are ungated; web/mobile show plan notices in some screens | Frontend lock copy exists, backend route protection is incomplete. |

## 4. Premium Plan Checklist
| Feature | Backend | Web | Mobile | Gating | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Multi-location inventory | PASS | PARTIAL | PASS | FAIL | PARTIAL | Backend warehouses/transfers: [backend/app/routers/inventory.py](/Users/sami/IntelliFlow/backend/app/routers/inventory.py), [backend/app/routers/warehouse_workflows.py](/Users/sami/IntelliFlow/backend/app/routers/warehouse_workflows.py); mobile `InventoryScreen`; web lacks real transfers UI | No Premium route gate. |
| Warehouse transfers | PASS | MISSING | PASS | FAIL | PARTIAL | [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) `transfer_stock`; web transfers placeholder; mobile `api.transferInventory` and `InventoryScreen` | Web missing, route ungated. |
| Sales orders with reservation and partial fulfillment | PASS | PARTIAL | PASS | FAIL | PARTIAL | [backend/app/routers/sales_orders.py](/Users/sami/IntelliFlow/backend/app/routers/sales_orders.py), [backend/app/services/sales_service.py](/Users/sami/IntelliFlow/backend/app/services/sales_service.py); web sales page records simple sales only; mobile `SalesScreen` handles order create/confirm/fulfill | Backend strong, web light. |
| Purchase orders with partial receiving | PASS | MISSING | PASS | FAIL | PARTIAL | [backend/app/routers/purchase_orders.py](/Users/sami/IntelliFlow/backend/app/routers/purchase_orders.py), [backend/app/services/purchasing_service.py](/Users/sami/IntelliFlow/backend/app/services/purchasing_service.py); mobile `PurchasingScreen`; web placeholder | Missing on web and ungated. |
| Stock reservations / ATP | PASS | MISSING | PARTIAL | FAIL | PARTIAL | Reservation services in [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py); MCP ATP tool in [backend/app/mcp/inventory_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/inventory_mcp.py); mobile surfaces reservation quantities on sales orders; no web ATP UI | Service exists, client surface incomplete. |
| Reorder points / suggestions | PASS | MISSING | PASS | FAIL | PARTIAL | [backend/app/routers/reorder.py](/Users/sami/IntelliFlow/backend/app/routers/reorder.py); mobile `InventoryScreen` `getReorderSuggestions`; no web UI found | Route not plan-gated. |
| Best-selling product analytics | PASS | PASS | PASS | PARTIAL | PARTIAL | Sales MCP in [backend/app/mcp/sales_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/sales_mcp.py); web `SalesPage` uses `copilotAPI.query('What are my best-selling products this week?')`; mobile `SalesScreen` uses `api.askCopilot` | Depends on weak plan truth and legacy web copilot contract. |
| Sales velocity / anomaly | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Tool definitions in [backend/app/mcp/sales_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/sales_mcp.py); no dedicated web/mobile velocity or anomaly UI found | Only indirectly reachable via copilot. |
| Returns orders / reasons / refund tracking | PASS | PASS | PASS | FAIL | PARTIAL | [backend/app/routers/returns.py](/Users/sami/IntelliFlow/backend/app/routers/returns.py), [backend/app/services/returns_service.py](/Users/sami/IntelliFlow/backend/app/services/returns_service.py); web `ReturnsPage`; mobile `ReturnsScreen` | Feature exists but route is ungated. |
| Return-adjusted profit / leakage | PASS | PASS | PASS | PARTIAL | PARTIAL | Returns MCP in [backend/app/mcp/returns_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/returns_mcp.py); web `ReturnsPage`; mobile `ReturnsScreen` | UI exists; plan trust still weak. |
| Basic RAG copilot | PASS | PASS | PASS | PARTIAL | PARTIAL | [backend/app/mcp/rag_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/rag_mcp.py); web `CompliancePage`; mobile `ComplianceScreen` | Backend gating depends on plan truth. |
| Premium notifications / weekly summary | MISSING | MISSING | MISSING | FAIL | MISSING | No notification service/router/jobs/preferences found | Not implemented. |
| Boost features locked from Premium | PARTIAL | PARTIAL | PARTIAL | FAIL | FAIL | Logistics CRUD routes are ungated; UI notices exist in [frontend/app/(app)/logistics/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/logistics/page.tsx) and mobile `PlanNotice` | Backend enforcement missing for non-MCP routes. |

## 5. Boost Plan Checklist
| Feature | Backend | Web | Mobile | Gating | Status | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Logistics control tower | PASS | PARTIAL | PASS | FAIL | PARTIAL | [backend/app/routers/logistics.py](/Users/sami/IntelliFlow/backend/app/routers/logistics.py), [backend/app/services/logistics_service.py](/Users/sami/IntelliFlow/backend/app/services/logistics_service.py); web `LogisticsPage` only shows copilot/recommendations; mobile `LogisticsScreen` includes operational flows | Web is not a real control tower yet. |
| Shipments / legs / origin-destination / carrier tracking | PASS | MISSING | PASS | FAIL | PARTIAL | Backend shipment CRUD in [backend/app/routers/logistics.py](/Users/sami/IntelliFlow/backend/app/routers/logistics.py); mobile `createShipment`, `addShipmentLeg`, `updateShipmentStatus`; no web shipment CRUD UI found | No backend Boost gate. |
| Delay detection and delay impact | PASS | PARTIAL | PASS | FAIL | PARTIAL | [backend/app/services/logistics_service.py](/Users/sami/IntelliFlow/backend/app/services/logistics_service.py) `detect_late_shipments/calculate_delay_impact`; mobile uses `getDelayImpact`; web logistics page only uses copilot output | Web lacks direct operational view. |
| Indo-Pacific ship-flow map / Malaysia port pressure | PASS | PASS | PASS | PASS | PASS | [backend/app/routers/public_logistics.py](/Users/sami/IntelliFlow/backend/app/routers/public_logistics.py), [frontend/components/home/IndoPacificShipFlowMap.tsx](/Users/sami/IntelliFlow/frontend/components/home/IndoPacificShipFlowMap.tsx), mobile `ShipFlowMapPanel`/`LogisticsScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) | Public preview feature is implemented and labelled. |
| Preview vs live truth labeling | PASS | PASS | PASS | PASS | PASS | Backend response model in [backend/app/routers/public_logistics.py](/Users/sami/IntelliFlow/backend/app/routers/public_logistics.py); web badges in `IndoPacificShipFlowMap`; mobile badge in `LogisticsScreen` | No fake live claim found in map UI. |
| Advanced MCP logistics tools | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL | [backend/app/mcp/logistics_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/logistics_mcp.py); clients mostly reach them via copilot, not direct tool UX | Tool layer exists, UI thin. |
| Advanced RAG compliance tools | PASS | PARTIAL | PARTIAL | PARTIAL | PARTIAL | Boost-only `rag.check_customs_risk` and `rag.check_transport_compliance` in [backend/app/mcp/rag_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/rag_mcp.py); no dedicated advanced-risk UI found | Only reachable indirectly. |
| Citations or warning in compliance answers | PASS | PARTIAL | PARTIAL | PASS | PARTIAL | [backend/app/services/rag_service.py](/Users/sami/IntelliFlow/backend/app/services/rag_service.py) always returns warnings and source refs; web/mobile only dump raw JSON | Truth is there, UI is not curated. |
| Agent recommendations persisted | PASS | PASS | PASS | PARTIAL | PARTIAL | [backend/app/models.py](/Users/sami/IntelliFlow/backend/app/models.py) `AgentRecommendation`; [backend/app/services/agent_recommendation_service.py](/Users/sami/IntelliFlow/backend/app/services/agent_recommendation_service.py); web `RecommendationsPage`; mobile dashboard/recommendations | Plan filtering depends on weak plan truth. |
| Approval workflows | PARTIAL | MISSING | MISSING | UNKNOWN | PARTIAL | Non-mutating review requests exist in [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) `create_stock_adjustment_request/create_transfer_request`; no approval UI/router workflow found beyond return approval | Not a full approval system. |
| Advanced notifications / route risk alerts / port pressure alerts | MISSING | MISSING | MISSING | FAIL | MISSING | No notification implementation found | Major Boost gap. |
| LHDN-ready e-invoicing workflow/readiness | PARTIAL | PASS | PARTIAL | LOCKED_OK | PARTIAL | Marketing/readiness copy exists in [frontend/components/home/EInvoicingSection.tsx](/Users/sami/IntelliFlow/frontend/components/home/EInvoicingSection.tsx), mobile navigation maps E-Invoicing to compliance in [mobile/src/navigation/navigationConfig.js](/Users/sami/IntelliFlow/mobile/src/navigation/navigationConfig.js) | Readiness/marketing exists; no invoice workflow or integration found. |

## 6. Backend API Coverage
| Endpoint | Exists | Auth/Gating | Service Layer | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| `GET /health` | Yes | Public | N/A | PASS | [backend/app/routers/public_system.py](/Users/sami/IntelliFlow/backend/app/routers/public_system.py) `health` |
| `GET /ready` | Yes | Public | DB probe + config checks | PASS | [backend/app/routers/public_system.py](/Users/sami/IntelliFlow/backend/app/routers/public_system.py) `ready` |
| `GET /public/app-config` | Yes | Public | Config only | PASS | [backend/app/routers/public_system.py](/Users/sami/IntelliFlow/backend/app/routers/public_system.py) `public_app_config` |
| `POST /demo/bootstrap` | Yes | Demo env gate | `ensure_demo_data_seeded` | PASS | [backend/app/routers/demo.py](/Users/sami/IntelliFlow/backend/app/routers/demo.py) |
| `POST /demo/login` | Yes | Demo env gate | `ensure_demo_data_seeded` | PASS | [backend/app/routers/demo.py](/Users/sami/IntelliFlow/backend/app/routers/demo.py) |
| `POST /ai-copilot/query` | Yes | Public request-supplied plan | `handle_copilot_query` | PARTIAL | [backend/app/routers/ai_copilot.py](/Users/sami/IntelliFlow/backend/app/routers/ai_copilot.py), [backend/app/agents/orchestrator.py](/Users/sami/IntelliFlow/backend/app/agents/orchestrator.py) |
| `GET /mcp-dev/registry` | Yes | Enabled only when env flag is on | `InternalMCPClient` | PASS | [backend/app/main.py](/Users/sami/IntelliFlow/backend/app/main.py), [backend/app/routers/mcp_dev.py](/Users/sami/IntelliFlow/backend/app/routers/mcp_dev.py) |
| `POST /mcp-dev/tools/{tool_name}` | Yes | Env-gated dev router | `InternalMCPClient.call_tool` | PASS | [backend/app/routers/mcp_dev.py](/Users/sami/IntelliFlow/backend/app/routers/mcp_dev.py) |
| `POST /mcp-dev/resources/read` | Yes | Env-gated dev router | `InternalMCPClient.read_resource` | PASS | [backend/app/routers/mcp_dev.py](/Users/sami/IntelliFlow/backend/app/routers/mcp_dev.py) |
| Inventory endpoints | Yes | Auth only | Ledger service | PASS | [backend/app/routers/inventory.py](/Users/sami/IntelliFlow/backend/app/routers/inventory.py), [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) |
| Sales order endpoints | Yes | Auth only, no Premium gate | Sales service | FAIL | [backend/app/routers/sales_orders.py](/Users/sami/IntelliFlow/backend/app/routers/sales_orders.py) |
| Purchase order endpoints | Yes | Auth only, no Premium gate | Purchasing service | FAIL | [backend/app/routers/purchase_orders.py](/Users/sami/IntelliFlow/backend/app/routers/purchase_orders.py) |
| Returns endpoints | Yes | Auth only, no Premium gate | Returns service | FAIL | [backend/app/routers/returns.py](/Users/sami/IntelliFlow/backend/app/routers/returns.py) |
| Logistics endpoints | Yes | Auth only, no Boost gate | Logistics service | FAIL | [backend/app/routers/logistics.py](/Users/sami/IntelliFlow/backend/app/routers/logistics.py) |
| Public ship-flow endpoint | Yes | Public preview/live truth model | Indo-Pacific flow service | PASS | [backend/app/routers/public_logistics.py](/Users/sami/IntelliFlow/backend/app/routers/public_logistics.py), [backend/app/services/indo_pacific_flow_service.py](/Users/sami/IntelliFlow/backend/app/services/indo_pacific_flow_service.py) |
| Notification endpoints | No | N/A | N/A | MISSING | Static scan and grep found none |

## 7. Web Coverage
| Page/Component | Expected | Found | Status | Evidence |
| --- | --- | --- | --- | --- |
| Public landing page | Brand, headline, plans, MCP/RAG, logistics map, e-invoicing | Found | PASS | [frontend/components/home/LandingPage.tsx](/Users/sami/IntelliFlow/frontend/components/home/LandingPage.tsx) |
| Public plans page | Free/Premium/Boost cards | Found | PASS | [frontend/app/(public)/plans/page.tsx](/Users/sami/IntelliFlow/frontend/app/(public)/plans/page.tsx) |
| Dashboard | Cross-tier overview | Found | PASS | [frontend/app/(app)/dashboard/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/dashboard/page.tsx) |
| Products | Product CRUD | Found | PASS | [frontend/app/(app)/products/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/products/page.tsx) |
| Inventory | Risk board and recommendations | Found | PARTIAL | [frontend/app/(app)/inventory/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/inventory/page.tsx) |
| Sales | Sales recording + locked insights | Found | PARTIAL | [frontend/app/(app)/sales/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/sales/page.tsx) |
| Purchasing | Real purchasing workflow | Placeholder only | MISSING | [frontend/app/(app)/purchasing/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/purchasing/page.tsx) |
| Transfers | Real transfer workflow | Placeholder only | MISSING | [frontend/app/(app)/transfers/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/transfers/page.tsx) |
| Returns | Profit leakage / recommendations | Found | PASS | [frontend/app/(app)/returns/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/returns/page.tsx) |
| Logistics | Real control tower | Thin copilot/recommendations only | PARTIAL | [frontend/app/(app)/logistics/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/logistics/page.tsx) |
| Compliance | Basic/advanced RAG view | Found | PASS | [frontend/app/(app)/compliance/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/compliance/page.tsx) |
| Copilot | MCP-backed query UI | Found, legacy endpoint | PARTIAL | [frontend/app/(app)/copilot/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/copilot/page.tsx), [frontend/lib/api/copilot.ts](/Users/sami/IntelliFlow/frontend/lib/api/copilot.ts) |
| Recommendations | Recommendation list | Found | PASS | [frontend/app/(app)/recommendations/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/recommendations/page.tsx) |
| Alerts | Real notifications | Placeholder only | MISSING | [frontend/app/(app)/alerts/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/alerts/page.tsx) |

## 8. Mobile Coverage
| Screen/Component | Expected | Found | Status | Evidence |
| --- | --- | --- | --- | --- |
| Startup / login / sign-up | Demo-safe startup, Firebase auth, branded loading | Found | PASS | [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) `SetupScreen`; [mobile/src/screens/LoadingScreen.js](/Users/sami/IntelliFlow/mobile/src/screens/LoadingScreen.js) |
| Service unavailable | No API setup prompt | Found | PASS | [mobile/src/screens/ServiceUnavailableScreen.js](/Users/sami/IntelliFlow/mobile/src/screens/ServiceUnavailableScreen.js) |
| Dashboard | Welcome + overview + recommendations | Found | PASS | `DashboardScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Products | Product CRUD | Found | PASS | `ProductsScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Inventory | Warehouses, stock position, receive, adjust, reorder, transactions | Found | PASS | `InventoryScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Sales | Customers, sales orders, fulfillment, insights | Found | PASS | `SalesScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Purchasing | Suppliers, POs, receiving | Found | PASS | `PurchasingScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Returns | Return flows and profit leakage | Found | PASS | `ReturnsScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Logistics | Shipments, delay impact, map, routes | Found | PASS | `LogisticsScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| MCP + RAG / Compliance | Found | Found | PASS | `ComplianceScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Plans | Plan cards | Found | PASS | `PlansScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| AI Copilot | MCP-backed assistant | Found | PASS | `CopilotScreen` in [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) |
| Notifications | Bell/list/preferences/push | Not found | MISSING | Notification grep found no implementation |

## 9. Navigation Parity
| Section | Web | Mobile | Required Plan | Status | Evidence |
| --- | --- | --- | --- | --- | --- |
| Home | Public landing + dashboard | Dashboard/home | FREE | PASS | [frontend/components/layout/Sidebar.tsx](/Users/sami/IntelliFlow/frontend/components/layout/Sidebar.tsx), [mobile/src/navigation/navigationConfig.js](/Users/sami/IntelliFlow/mobile/src/navigation/navigationConfig.js) |
| Inventory | `Inventory` | `Inventory` | FREE | PASS | Same evidence |
| Sales | `Sales` | Present as screen, not top-level tracker item | PREMIUM | PARTIAL | Web sidebar includes Sales; mobile tracker config does not list Sales |
| Purchasing | `Purchasing` | Present as screen, not tracker item | PREMIUM | PARTIAL | Web sidebar includes Purchasing; mobile tracker config omits it |
| Returns | `Returns` | Present as screen, not tracker item | PREMIUM | PARTIAL | Same evidence |
| Logistics | `Logistics` | `Logistics` | BOOST | PASS | Same evidence |
| MCP + RAG | Web label is `Compliance`; public marketing says `MCP + RAG` | Mobile label `MCP + RAG` mapped to `compliance` | PREMIUM | PARTIAL | [frontend/components/Header.tsx](/Users/sami/IntelliFlow/frontend/components/Header.tsx), [frontend/components/layout/Sidebar.tsx](/Users/sami/IntelliFlow/frontend/components/layout/Sidebar.tsx), [mobile/src/navigation/navigationConfig.js](/Users/sami/IntelliFlow/mobile/src/navigation/navigationConfig.js) |
| E-Invoicing | Public header only, no app section | Mobile maps `E-Invoicing` to `compliance` route | PREMIUM | FAIL | No dedicated web app route; mobile aliases it |
| Plans | Public plans page only | Mobile `Plans` screen | FREE | PARTIAL | [frontend/app/(public)/plans/page.tsx](/Users/sami/IntelliFlow/frontend/app/(public)/plans/page.tsx), [mobile/src/navigation/navigationConfig.js](/Users/sami/IntelliFlow/mobile/src/navigation/navigationConfig.js) |
| AI Copilot | `Copilot` | `AI Copilot` | FREE | PARTIAL | Label mismatch between web sidebar and mobile config |
| Notifications | `Alerts` placeholder | No notification screen | N/A | FAIL | [frontend/app/(app)/alerts/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/alerts/page.tsx) |
| Profile / Settings | No obvious web profile page found | `Profile` screen | FREE | PARTIAL | Mobile has `AccountScreen`; web profile/account route not found in static scan |

## 10. MCP/RAG Coverage
| Domain | Tool/Resource | Tier | Implemented | Gated | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Inventory | `inventory.get_stock_position` | FREE | Yes | Yes | PASS | [backend/app/mcp/inventory_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/inventory_mcp.py) |
| Inventory | `inventory.get_low_stock_items` | FREE | Yes | Yes | PASS | Same file |
| Inventory | `inventory.calculate_days_of_cover` | PREMIUM | Yes | Yes | PASS | Same file |
| Inventory | `inventory.recommend_stock_transfer` | Expected Premium-ish, implemented Boost | Yes | Yes | PARTIAL | Same file; over-gated relative to Premium operations expectation |
| Sales | `sales.get_best_selling_products` | PREMIUM | Yes | Yes | PASS | [backend/app/mcp/sales_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/sales_mcp.py) |
| Sales | `sales.calculate_sales_velocity` | PREMIUM | Yes | Yes | PASS | Same file |
| Sales | `sales.detect_sales_anomaly` | PREMIUM | Yes | Yes | PASS | Same file |
| Sales | `sales.calculate_product_margin` | PREMIUM | Yes | Yes | PASS | Same file |
| Returns | `returns.get_return_rate` | PREMIUM | Yes | Yes | PASS | [backend/app/mcp/returns_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/returns_mcp.py) |
| Returns | `returns.calculate_return_adjusted_margin` | PREMIUM | Yes | Yes | PASS | Same file |
| Returns | `returns.detect_return_spike` | PREMIUM | Yes | Yes | PASS | Same file |
| Returns | `returns.create_quality_investigation` | BOOST | Yes | Yes | PASS | Same file |
| Logistics | `logistics.get_active_shipments` | BOOST | Yes | Yes | PASS | [backend/app/mcp/logistics_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/logistics_mcp.py) |
| Logistics | `logistics.detect_late_shipments` | BOOST | Yes | Yes | PASS | Same file |
| Logistics | `logistics.calculate_delay_impact` | BOOST | Yes | Yes | PASS | Same file |
| Logistics | `logistics.recommend_reroute` | BOOST | Yes | Yes | PASS | Same file |
| RAG | `rag.search_official_docs` | PREMIUM | Yes | Yes | PASS | [backend/app/mcp/rag_mcp.py](/Users/sami/IntelliFlow/backend/app/mcp/rag_mcp.py) |
| RAG | `rag.answer_with_citations` | PREMIUM | Yes | Yes | PASS | Same file |
| RAG | `rag.check_customs_risk` | BOOST | Yes | Yes | PASS | Same file |
| RAG | `rag.check_transport_compliance` | BOOST | Yes | Yes | PASS | Same file |
| RAG truth | Citations or warning | PREMIUM/BOOST | Warning-based only | N/A | PARTIAL | [backend/app/services/rag_service.py](/Users/sami/IntelliFlow/backend/app/services/rag_service.py) returns source refs + warnings, but not passage-level citations |

## 11. Notification Coverage
| Category | Backend | Mobile | Web | Tier | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Low stock notifications | Missing | Missing | Placeholder only | FREE | MISSING | No models/routes/push/device registration found |
| Sales / purchasing / returns notifications | Missing | Missing | Missing | PREMIUM | MISSING | Repo-wide grep found nothing |
| Logistics / route risk / port pressure alerts | Missing | Missing | Missing | BOOST | MISSING | Repo-wide grep found nothing |
| Preferences / unread count / mark read | Missing | Missing | Missing | All | MISSING | No notification router/model/UI |
| Push registration / device tokens | Missing | Missing | N/A | All | MISSING | No `expo-notifications` usage or device registration route |

## 12. Demo Mode Coverage
| Flow | Backend | Mobile | Status | Evidence |
| --- | --- | --- | --- | --- |
| Public health/config discovery | `/health`, `/public/app-config` | App startup calls both | PASS | [backend/app/routers/public_system.py](/Users/sami/IntelliFlow/backend/app/routers/public_system.py), [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) around startup `healthCheck/getPublicAppConfig` |
| Demo bootstrap/login | `/demo/bootstrap`, `/demo/login` | Mobile auto-calls when demo mode is enabled | PASS | [backend/app/routers/demo.py](/Users/sami/IntelliFlow/backend/app/routers/demo.py), [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js) `bootstrapDemoSession` |
| Demo token auth | `demo-token` accepted only when demo mode enabled | Used in mobile session | PASS | [backend/app/auth.py](/Users/sami/IntelliFlow/backend/app/auth.py), [backend/app/core/security.py](/Users/sami/IntelliFlow/backend/app/core/security.py) |
| Demo seed data | Idempotent bootstrap with products, warehouses, POs, returns, shipments, recommendations | Consumed by mobile | PASS | [backend/app/services/demo_seed_service.py](/Users/sami/IntelliFlow/backend/app/services/demo_seed_service.py) |
| No API setup prompt for demo users | N/A | Clean startup + service unavailable flow | PASS | [mobile/src/config/api.js](/Users/sami/IntelliFlow/mobile/src/config/api.js), [mobile/src/screens/ServiceUnavailableScreen.js](/Users/sami/IntelliFlow/mobile/src/screens/ServiceUnavailableScreen.js) |

## 13. Security/Data Truth Issues
- `FAIL`: Core tier enforcement is not trustworthy for operational APIs.
  - Evidence: [backend/app/routers/logistics.py](/Users/sami/IntelliFlow/backend/app/routers/logistics.py), [backend/app/routers/purchase_orders.py](/Users/sami/IntelliFlow/backend/app/routers/purchase_orders.py), [backend/app/routers/sales_orders.py](/Users/sami/IntelliFlow/backend/app/routers/sales_orders.py), [backend/app/routers/returns.py](/Users/sami/IntelliFlow/backend/app/routers/returns.py)
- `FAIL`: MCP/copilot plan resolution can trust client-supplied `user_plan`.
  - Evidence: [backend/app/mcp/client.py](/Users/sami/IntelliFlow/backend/app/mcp/client.py) `effective_plan_level`; [backend/app/agents/orchestrator.py](/Users/sami/IntelliFlow/backend/app/agents/orchestrator.py)
- `PARTIAL`: Inventory source of truth is ledger-first, but `Product.current_stock` remains a synced cached field and is still displayed directly in some clients.
  - Evidence: [backend/app/services/stock_ledger_service.py](/Users/sami/IntelliFlow/backend/app/services/stock_ledger_service.py) `sync_product_current_stock`; [backend/app/routers/products.py](/Users/sami/IntelliFlow/backend/app/routers/products.py); [frontend/app/(app)/products/page.tsx](/Users/sami/IntelliFlow/frontend/app/(app)/products/page.tsx); [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js)
- `PASS`: No backend secrets, Firebase admin credentials, or database URLs were found exposed by public endpoints.
  - Evidence: [backend/app/routers/public_system.py](/Users/sami/IntelliFlow/backend/app/routers/public_system.py)
- `PASS`: Public ship-flow preview/live truth is labelled correctly.
  - Evidence: [frontend/components/home/IndoPacificShipFlowMap.tsx](/Users/sami/IntelliFlow/frontend/components/home/IndoPacificShipFlowMap.tsx), [mobile/src/MobileApp.js](/Users/sami/IntelliFlow/mobile/src/MobileApp.js)
- `PASS`: Compliance wording appears readiness-oriented, not fake-certified.
  - Evidence: [frontend/components/home/EInvoicingSection.tsx](/Users/sami/IntelliFlow/frontend/components/home/EInvoicingSection.tsx), [frontend/app/(public)/register/page.tsx](/Users/sami/IntelliFlow/frontend/app/(public)/register/page.tsx)
- `PARTIAL`: Frontend web API client still defaults to localhost.
  - Evidence: [frontend/lib/api/client.ts](/Users/sami/IntelliFlow/frontend/lib/api/client.ts)
- `PARTIAL`: Mobile bundled fallback API URL is still a placeholder, not a deployable endpoint.
  - Evidence: [mobile/app.json](/Users/sami/IntelliFlow/mobile/app.json), [mobile/src/config/api.js](/Users/sami/IntelliFlow/mobile/src/config/api.js)

## 14. Missing Work by Priority
- `P0`
  - Enforce subscription tiers on sales order, purchase order, returns, logistics, and advanced workflow routers.
  - Replace request-supplied plan trust with persisted subscription/org plan truth.
  - Implement real notification infrastructure or explicitly remove notification promises from plan copy.
  - Build the missing web purchasing, transfers, and alerts surfaces.
  - Align navigation structure and labels between web and mobile.
- `P1`
  - Migrate web copilot to `/ai-copilot/query` and the new response contract.
  - Add direct web/mobile UIs for sales velocity, anomaly, ATP, and delay-impact instead of only JSON/copilot dumps.
  - Replace placeholder hosted demo API URL in mobile config.
  - Split E-Invoicing from generic compliance if it is intended as a distinct product section.
- `P2`
  - Curate RAG citations/warnings into clearer UI cards instead of raw JSON.
  - Reduce reliance on `product.current_stock` in product-list UIs and display ledger-derived availability explicitly.
  - Add deeper parity for profile/account/settings between web and mobile.

## 15. Recommended Next Codex Prompts
- `Backend plan enforcement`
  - `Audit and fix backend subscription enforcement so sales orders, purchase orders, returns, logistics, and advanced workflow routes are gated by persisted plan truth instead of request-supplied user_plan values. Show every router change and add tests for FREE, PREMIUM, and BOOST access.`
- `Subscription source of truth`
  - `Implement a persisted subscription/org plan model for IntelliFlow, wire it into auth and MCP plan resolution, and remove client-driven tier escalation paths without breaking demo mode.`
- `Web operational gaps`
  - `Build the missing real web screens for purchasing, transfers, and alerts using the existing backend APIs. Do not redesign the whole app; just replace placeholders with working flows and correct plan notices.`
- `Notifications`
  - `Implement the notification system end to end for IntelliFlow: backend models/routes/preferences/device registration plus mobile unread list and preference UI. Keep tiers aligned: Free basic stock alerts, Premium operational alerts, Boost logistics/compliance alerts.`
- `Copilot parity`
  - `Migrate the Next.js web app from the legacy /api/ai/query contract to /ai-copilot/query, update types/components accordingly, and preserve plan-aware upgrade messaging.`
- `Navigation parity`
  - `Align web and mobile navigation metadata so both apps expose the same IntelliFlow product sections, labels, descriptions, and required plans: Home, Inventory, Sales, Purchasing, Returns, Logistics, MCP + RAG, E-Invoicing, Plans, AI Copilot, Notifications, Profile.`

Can we move to finishing touches?

`NO — fix P0 blockers first.`
