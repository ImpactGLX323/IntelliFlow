# Demo Mode

IntelliFlow supports a zero-configuration demo flow for mobile and public app demos.

## Environment

Set these on the backend host:

```env
APP_ENV=demo
DEMO_MODE_ENABLED=true
DEMO_ORG_ID=demo-org
DEMO_USER_ID=demo-user
DEMO_USER_PLAN=BOOST
AI_PROVIDER=template
ENABLE_MCP_DEV_ENDPOINTS=true
```

Optional public config:

```env
APP_NAME=IntelliFlow
APP_VERSION=1.0.0
SUPPORT_EMAIL=support@intelliflow.local
CORS_ORIGINS=http://localhost:3000,http://localhost:8081,exp://localhost:8081
```

## Local Development

1. Start PostgreSQL.
2. Run migrations if your local database is not current.
3. Start the backend:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

4. Set the mobile app public backend URL:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000
```

5. Start Expo:

```bash
cd mobile
npm start
```

The mobile app will call `/health`, `/public/app-config`, `/demo/bootstrap`, and `/demo/login` automatically when demo mode is enabled.

## Demo Deployment

- Host the FastAPI backend at a stable public URL.
- Set `EXPO_PUBLIC_API_URL` in the mobile build environment to that hosted backend URL.
- Keep `DEMO_MODE_ENABLED=true` only for demo environments.
- Use `APP_ENV=demo` for hosted demo stacks.
- Do not expose secrets in public env or Expo config.

## Notes

- Demo users are authenticated with the isolated `demo-token` only when `DEMO_MODE_ENABLED=true`.
- Public endpoints never return database URLs, API keys, or Firebase admin credentials.
- The mobile app does not ask demo users for API URLs, ports, localhost addresses, or bearer tokens.
