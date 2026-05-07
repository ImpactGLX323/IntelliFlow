# IntelliFlow Free API Integrations

## Overview
IntelliFlow exposes public and preview integrations through the FastAPI backend so the web app, mobile app, MCP tools, and AI Copilot can use safe external data without exposing secrets or calling third-party APIs directly from clients.

These integrations follow three truth rules:

1. If the data is preview, IntelliFlow says preview.
2. If the data is a demand signal, IntelliFlow says demand signal, not confirmed sales.
3. If a paid or user-authorized provider is not configured, IntelliFlow returns `NOT_CONFIGURED` or a preview fallback instead of inventing live data.

## Provider Table
| Provider | Use | Plan | Live? | Data Type | Limitations |
| --- | --- | --- | --- | --- | --- |
| `data_gov_my` | Malaysian public/open datasets | FREE | Potentially live when adapter is connected | Official public data | Open datasets only. Not private operational data. |
| `bnm_openapi` | FX and financial dataset support | FREE | Potentially live when adapter is connected | Official public data | Used for rates only. Cached heavily. |
| `osm_nominatim` | Geocoding support | FREE | Public service | Public location data | Backend-only, cached, no bulk geocoding. |
| `osm_overpass` | Small warehouse/location discovery queries | FREE | Public service | Public map/location data | No heavy repeated queries. No verified capacity. |
| `open_meteo` | Weather risk around Malaysian routes and ports | FREE | Public service | Weather preview/risk | Not ship tracking, not congestion confirmation. |
| `open_meteo_marine` | Marine and sea-state risk preview | FREE | Public service | Marine preview/risk | Not live AIS or confirmed vessel positions. |
| `preview_demand_provider` | Malaysia demand-signal preview | FREE | No | Preview estimate | Not confirmed sales volume. No fake units sold or revenue. |
| `google_trends_alpha` | Search-interest proxy for trend estimation | BOOST | Limited/conditional | Search trend proxy | Alpha access required. Not actual sales data. |
| `shopee` | User-owned Shopee store connection | PREMIUM | Only when configured | User-authorized store data | Only the user’s own store. No nationwide best-seller claims. |
| `lazada` | User-owned Lazada store connection | PREMIUM | Only when configured | User-authorized store data | Only the user’s own store. No nationwide best-seller claims. |
| `tiktok_shop` | User-owned TikTok Shop connection | PREMIUM | Only when configured | User-authorized store data | Only the user’s own store. No nationwide best-seller claims. |
| `paid_market_intelligence` | Market-wide Malaysia best-seller intelligence | BOOST | Only when configured | Paid market estimate or verified commercial dataset | Not available for free. No scraping. |
| `paid_3pl_provider` | Advanced warehouse and 3PL provider integration | BOOST | Only when configured | Paid provider data | No fake capacity or partner claims. |

## Plan Access

### Free
Allowed:
- `GET /integrations/free/registry`
- `GET /integrations/free/status`
- `GET /integrations/free/warehouses/malaysia`
- `GET /integrations/free/warehouses/nearby`
- `GET /integrations/free/logistics/malaysia-port-risk`
- `GET /integrations/free/finance/bnm-rates`
- `GET /integrations/free/market/malaysia-demand-signals`
- MCP read-only tools/resources for the same public/preview datasets

Free limitations:
- No marketplace OAuth connection
- No own-store best sellers
- No paid 3PL/WMS provider
- No live AIS vessel positions
- No market-wide Malaysia best-seller claims

### Premium
Everything in Free, plus:
- Marketplace provider connection stubs
- Own-store weekly best sellers from user-authorized shops
- Existing Premium sales, returns, reorder, and basic RAG features

Premium limitations:
- Best sellers are only from the user’s own connected store data
- No market-wide Malaysia best-seller intelligence without Boost and a configured paid provider

### Boost
Everything in Premium, plus:
- Paid market-intelligence provider stubs
- Paid warehouse/3PL provider stubs
- Advanced logistics and market-provider readiness
- Existing Boost logistics control tower and advanced MCP/RAG features

Boost limitations:
- If a paid provider is not configured, IntelliFlow returns `not_configured`
- No fake live claims

## Data Truth Rules

### Malaysia Warehouse Directory
Label:
- `Public/preview warehouse directory`

Meaning:
- Directory and location data only
- No guaranteed capacity
- No verified partner relationship
- No booking or 3PL availability claim

### Malaysia Port Risk
Label:
- `Weather and preview port-risk signals`

Meaning:
- Weather and marine conditions may be public
- Port pressure may still be preview/simulated
- This is not live AIS
- This is not confirmed nationwide congestion

### Malaysia Demand Signals
Label:
- `Malaysia demand signals`

Meaning:
- Search-interest proxy or preview trend estimate
- Not a real-time nationwide best-seller feed
- No fake units sold or revenue for preview data

### Own-Store Best Sellers
Label:
- `User-authorized store sales only`

Meaning:
- Premium users may call this only for their own connected marketplace shops
- This can be called best sellers because it refers to the user’s actual store data

### Market-Wide Best Sellers
Label:
- `Market-wide provider required`

Meaning:
- Boost feature only
- Requires a real paid or approved market-intelligence source
- If the provider is not configured, IntelliFlow returns `not_configured`

## Cache and Rate-Limit Strategy

| Provider | Suggested Cache |
| --- | --- |
| data.gov.my | 15 minutes to 1 hour |
| BNM rates | 6 to 24 hours |
| Nominatim geocoding | Long cache / 30 days |
| Overpass warehouse queries | 24 hours |
| Open-Meteo weather/marine | 30 minutes to 3 hours |
| Demand preview | 24 hours |

Key rules:
- Cache all public/free responses
- Never call public APIs on every page render
- Log cache hits and misses
- On provider failure, return cached data or preview fallback
- Never expose stack traces or secrets

## Why National Best-Selling Products Are Not Free
Free public data does not reliably provide:
- real-time nationwide marketplace sales
- private store order volume
- paid market-intelligence coverage

That means IntelliFlow cannot honestly claim:
- nationwide real-time best-selling products
- real-time market share by category
- confirmed national sell-through rankings

So the free tier exposes demand signals and preview trends instead.

## Why Live AIS and Logistics Require Paid Providers
Free public APIs may support:
- weather
- marine conditions
- public map/location context

They do not reliably support:
- live AIS vessel tracking at production quality
- confirmed congestion intelligence
- private carrier or 3PL operational data
- revenue-at-risk style control-tower intelligence at commercial grade

That is why Boost uses provider stubs and `not_configured` responses until a real authorized provider is connected.

## Premium Marketplace Configuration
Premium uses user-owned marketplace data only.

Supported provider stubs:
- Shopee
- Lazada
- TikTok Shop

If provider credentials are missing, IntelliFlow returns:
- `status: not_configured`
- a user-facing connection prompt

No secrets are returned to the web app or mobile app.

## Boost Provider Configuration
Boost is the place for:
- market-wide best-seller provider integration
- paid warehouse and 3PL data integration
- more advanced logistics and control-tower provider connections

If a provider is not configured:
- IntelliFlow does not fake live data
- the endpoint returns `not_configured`
- preview or public fallbacks remain clearly labelled
