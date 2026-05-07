# IntelliFlow Manual

This manual is for a beginner GitHub user who wants to:

1. download the IntelliFlow project
2. clone or extract it
3. install everything
4. run the backend, web app, and mobile app

It includes commands for:

- macOS
- Windows
- iOS simulator
- Android emulator
- real phones with Expo Go

## 1. What IntelliFlow Uses

IntelliFlow has 3 main parts:

- `backend/`
  - FastAPI
  - Python
  - PostgreSQL
  - Python virtual environment (`venv`)
  - dependencies from `backend/requirements.txt`
- `frontend/`
  - Next.js
  - React
  - dependencies from `frontend/package.json`
- `mobile/`
  - Expo / React Native
  - dependencies from `mobile/package.json`

## 2. Minimum Requirements

Install these first.

### All users

- Git
- Python `3.11` or newer
- Node.js `20` or newer
- npm
- PostgreSQL

### For mobile testing

- `Expo Go` on Android or iPhone if using a real device

### For iOS simulator on macOS only

- Xcode

### For Android emulator

- Android Studio

## 3. Recommended Terminal Apps

### macOS

Use any of these:

- Terminal
- iTerm2
- VS Code terminal

Shell examples in this manual use:

- `zsh`

### Windows

Recommended:

- PowerShell
- Windows Terminal

You can also use:

- Command Prompt

PowerShell is the easiest option for this project.

## 4. Download the Project

You have 2 options.

### Option A: Clone from GitHub

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd IntelliFlow
```

### Option B: Download ZIP from GitHub

1. Open the GitHub repository page
2. Click `Code`
3. Click `Download ZIP`
4. Extract the ZIP
5. Open a terminal inside the extracted `IntelliFlow` folder

## 5. Project Folder Structure

```text
IntelliFlow/
  backend/
  frontend/
  mobile/
  README.md
  MANUAL.md
```

## 6. Backend Setup

The backend uses:

- Python
- `venv`
- `backend/requirements.txt`

### 6.1 macOS backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 6.2 Windows PowerShell backend setup

```powershell
cd backend
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate again:

```powershell
.\venv\Scripts\Activate.ps1
```

### 6.3 Windows Command Prompt backend setup

```cmd
cd backend
py -3.11 -m venv venv
venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## 7. Backend Environment File

The backend uses:

- [backend/.env](/Users/sami/IntelliFlow/backend/.env)

You must configure this file before expecting full runtime behavior.

At minimum, make sure it has valid values for:

- database connection
- auth / Firebase values if required
- OpenAI values if you want live copilot answers

Important:

- if the OpenAI key is invalid, copilot can fall back to template mode
- do not commit real secrets to GitHub

## 8. PostgreSQL Setup

You need PostgreSQL running before the backend can work.

### 8.1 macOS

If you installed PostgreSQL with Homebrew:

```bash
brew services start postgresql
```

Or if your version is specific:

```bash
brew services list
```

### 8.2 Windows

Start PostgreSQL from:

- Services
- pgAdmin
- or your normal PostgreSQL installer service

You must also make sure the database and credentials in `backend/.env` are correct.

## 9. Run Backend Migrations

After PostgreSQL is running, apply database migrations.

### macOS

```bash
cd /Users/sami/IntelliFlow/backend
source venv/bin/activate
alembic upgrade head
```

### Windows PowerShell

```powershell
cd <PATH_TO>\IntelliFlow\backend
.\venv\Scripts\Activate.ps1
alembic upgrade head
```

### Windows CMD

```cmd
cd <PATH_TO>\IntelliFlow\backend
venv\Scripts\activate.bat
alembic upgrade head
```

## 10. Start the Backend

### macOS

```bash
cd /Users/sami/IntelliFlow/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Windows PowerShell

```powershell
cd <PATH_TO>\IntelliFlow\backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Windows CMD

```cmd
cd <PATH_TO>\IntelliFlow\backend
venv\Scripts\activate.bat
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Backend URLs

Once running:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health: `http://127.0.0.1:8000/health`

## 11. Frontend Setup

The frontend uses:

- Node.js
- npm
- dependencies from `frontend/package.json`

### Install frontend dependencies

#### macOS / Linux

```bash
cd frontend
npm install
```

#### Windows PowerShell or CMD

```powershell
cd frontend
npm install
```

### Set backend URL for the frontend

#### macOS / Linux

```bash
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

#### Windows PowerShell

```powershell
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
```

#### Windows CMD

```cmd
set NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Start frontend

#### macOS / Linux

```bash
cd /Users/sami/IntelliFlow/frontend
rm -rf .next
npm run dev
```

#### Windows PowerShell

```powershell
cd <PATH_TO>\IntelliFlow\frontend
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run dev
```

#### Windows CMD

```cmd
cd <PATH_TO>\IntelliFlow\frontend
rmdir /s /q .next
npm run dev
```

### Frontend URL

Open:

- `http://localhost:3000`

## 12. Mobile Setup

The mobile app uses:

- Expo
- React Native
- dependencies from `mobile/package.json`

### Install mobile dependencies

#### macOS / Linux

```bash
cd mobile
npm install
```

#### Windows PowerShell or CMD

```powershell
cd mobile
npm install
```

## 13. Run Mobile on iPhone Simulator (macOS only)

Use this if you are on a Mac and want the iOS simulator.

```bash
cd /Users/sami/IntelliFlow/mobile
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npx expo start -c
```

Then press:

- `i` in the Expo terminal

Or run:

```bash
npx expo start --ios
```

## 14. Run Mobile on Android Emulator

### macOS / Linux

```bash
cd /Users/sami/IntelliFlow/mobile
export EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
npx expo start -c
```

Then press:

- `a`

Or run:

```bash
npx expo start --android
```

### Windows PowerShell

```powershell
cd <PATH_TO>\IntelliFlow\mobile
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000"
npx expo start -c
```

### Windows CMD

```cmd
cd <PATH_TO>\IntelliFlow\mobile
set EXPO_PUBLIC_API_URL=http://10.0.2.2:8000
npx expo start -c
```

Note:

- `10.0.2.2` is the Android emulator’s way to reach your host machine

## 15. Run Mobile on a Real Phone with Expo Go

### Step 1: Find your local IP

#### macOS

```bash
ipconfig getifaddr en0
```

If empty:

```bash
ipconfig getifaddr en1
```

#### Windows PowerShell or CMD

```powershell
ipconfig
```

Look for your local IPv4 address, for example:

- `192.168.1.23`

### Step 2: Start Expo with that backend URL

#### macOS / Linux

```bash
cd /Users/sami/IntelliFlow/mobile
export EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
npx expo start -c
```

#### Windows PowerShell

```powershell
cd <PATH_TO>\IntelliFlow\mobile
$env:EXPO_PUBLIC_API_URL="http://YOUR_LOCAL_IP:8000"
npx expo start -c
```

#### Windows CMD

```cmd
cd <PATH_TO>\IntelliFlow\mobile
set EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
npx expo start -c
```

### Step 3: Open the app

1. Install `Expo Go` on your phone
2. Make sure phone and computer are on the same Wi-Fi
3. Scan the QR code from Expo

## 16. Recommended Startup Order

Always start the apps in this order:

1. PostgreSQL
2. Backend
3. Frontend
4. Mobile

## 17. First Tests After Startup

After everything is running:

### Backend

Open:

- `http://127.0.0.1:8000/docs`

Check:

- `GET /health`
- `GET /ready`
- `GET /public/app-config`

### Frontend

Open:

- `http://localhost:3000`

Check:

- landing page
- login/register
- dashboard after login
- inventory page
- sales page
- notifications page

### Mobile

Check:

- loading screen
- login or demo mode
- dashboard
- inventory
- sales
- copilot
- notifications

## 18. Examiner Prompts for Premium and Boost

If an examiner wants to verify Premium and Boost behavior quickly, use the prompts below in the web or mobile copilot screens.

Important:

- these prompts assume the backend is running
- for live OpenAI-style answers, `OPENAI_API_KEY` in `backend/.env` must be valid
- if the AI provider is unavailable, copilot may still answer in fallback/template mode
- if marketplace or paid provider integrations are not configured, the correct result is `not_configured`, not fake live data

### Premium prompts

Use these to test Premium-level operations intelligence.

#### Prompt 1: weekly best sellers from own-store sales

```text
What are my best-selling products this week?
```

Expected result:

- Premium or Boost should allow the request
- if a marketplace store is not connected, the response should clearly say connection is required
- it should not invent national market-wide best-seller data

#### Prompt 2: sales velocity

```text
Show sales velocity for my products.
```

Expected result:

- Premium or Boost should return sales-oriented analysis
- Free should be gated or redirected with upgrade messaging where applicable

#### Prompt 3: return-adjusted margin

```text
Calculate return-adjusted margin for my products.
```

Expected result:

- Premium or Boost should return returns/profit analysis
- the answer should be about the user workspace data, not public market estimates

#### Prompt 4: reorder suggestions

```text
Which products should I reorder now based on current stock and demand?
```

Expected result:

- Premium or Boost should provide reorder suggestions
- output should reference stock levels, low-stock pressure, or movement patterns

### Boost prompts

Use these to test Boost-level control-tower and advanced intelligence behavior.

#### Prompt 1: Malaysia port risk

```text
What is the current port risk in Malaysia?
```

Expected result:

- Boost should return logistics risk or preview port-pressure information
- if only preview/public data is available, it must say preview rather than claiming live congestion

#### Prompt 2: delayed shipment impact

```text
Show delayed shipments and their impact on inventory and orders.
```

Expected result:

- Boost should return shipment-delay impact analysis
- response should mention affected SKUs, orders, or workflow impact if data exists

#### Prompt 3: supplier and route risk

```text
Which supplier or route risks need attention right now?
```

Expected result:

- Boost should return risk-oriented recommendations
- it should not fabricate paid provider data if that provider is not configured

#### Prompt 4: customs and compliance

```text
Check customs and transport compliance risk for my operations.
```

Expected result:

- Boost should return MCP + RAG compliance-style output
- if citations are available, they should be shown
- if no provider or no citation source is available, the app should warn instead of overclaiming

### Useful Free vs Premium vs Boost comparison prompts

These help an examiner compare plan behavior.

#### Free-safe prompt

```text
What products are low on stock?
```

Expected result:

- should work in Free, Premium, and Boost
- should use inventory/low-stock tooling

#### Premium-gated prompt

```text
What are my best-selling products this week from my store?
```

Expected result:

- Free should not get unrestricted access
- Premium and Boost should be allowed
- if no store is connected, the result should say so clearly

#### Boost-gated prompt

```text
Show Malaysia market-wide best-seller intelligence.
```

Expected result:

- Boost only
- if no paid market-intelligence provider is configured, it should return `not_configured`
- it must not invent national market-wide sales data

### Manual page checks for examiner

Premium and Boost should also be checked directly in the UI, not only through copilot.

#### Premium UI checks

- sales analytics page
- purchasing page
- returns page
- reorder suggestions
- notifications for sales / purchasing / returns categories

#### Boost UI checks

- logistics page
- ship-flow or port-risk view
- compliance / MCP + RAG page
- advanced notifications
- recommendations / control-tower outputs

## 19. Useful Commands

### Backend

Activate venv again on macOS:

```bash
cd backend
source venv/bin/activate
```

Activate venv again on Windows PowerShell:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

Activate venv again on Windows CMD:

```cmd
cd backend
venv\Scripts\activate.bat
```

### Check backend health

```bash
curl http://127.0.0.1:8000/health
```

### Check Expo config

```bash
cd mobile
npx expo config --json
```

### Frontend lint

```bash
cd frontend
npm run lint
```

### Frontend build

```bash
cd frontend
npm run build
```

## 20. Common Errors and Fixes

### Problem: backend does not start

Check:

- PostgreSQL is running
- `backend/.env` is valid
- migrations were applied

Run:

```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

### Problem: frontend chunk or `.next` errors

Fix:

#### macOS / Linux

```bash
cd frontend
rm -rf .next
npm run dev
```

#### Windows PowerShell

```powershell
cd frontend
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run dev
```

### Problem: mobile says service unavailable

Check:

- backend is running on port `8000`
- phone is using the correct IP
- simulator or emulator backend URL is correct

### Problem: copilot works but gives fallback-style answers

Check:

- `OPENAI_API_KEY` in `backend/.env`
- OpenAI provider configuration

### Problem: PowerShell cannot activate `venv`

Run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then:

```powershell
.\venv\Scripts\Activate.ps1
```

## 21. One-Page Install Summary

### macOS summary

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd IntelliFlow

cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

New terminal:

```bash
cd /Users/sami/IntelliFlow/frontend
npm install
export NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
rm -rf .next
npm run dev
```

New terminal:

```bash
cd /Users/sami/IntelliFlow/mobile
npm install
export EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
npx expo start -c
```

### Windows summary

```powershell
git clone <YOUR_GITHUB_REPO_URL>
cd IntelliFlow

cd backend
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

New terminal:

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm run dev
```

New terminal:

```powershell
cd mobile
npm install
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:8000"
npx expo start -c
```

## 22. Where to Read Next

- Main project overview:
  - [README.md](/Users/sami/IntelliFlow/README.md)
- Current implementation status:
  - [docs/FEATURE_COMPLETION_AUDIT.md](/Users/sami/IntelliFlow/docs/FEATURE_COMPLETION_AUDIT.md)
