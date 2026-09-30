# VARSHA AI — Regime-Aware Rainfall Intelligence & Decision Support Portal

**VARSHA AI** is an operational meteorological intelligence platform delivering calibrated daily precipitation guidance across 57 monitored Indian administrative districts.

The system post-processes raw numerical weather prediction (NWP) guidance from **NOAA NCEP GFS 0.25°** (`gfs_seamless`) against independent **ECMWF ERA5-Land 0.1°** reanalysis reference benchmarks using a Two-Stage Gated Machine Learning architecture (**VARSHA AI V2**).

---

## ⚠️ Historical Validation & Replay Data Disclaimer

> **IMPORTANT:** All telemetry and forecasts rendered by default within this portal represent **historical validation / replay data spanning April 2, 2026 to September 29, 2026 (10,317 validated records)**. This is a scientific decision-support system and model verification benchmark; it is **NOT** an official real-time meteorological forecast issued by the India Meteorological Department (IMD).

---

## 🏛️ System Architecture & Scientific Methodology

- **Stage 1: Rain Occurrence Gate ($\tau = 0.60$):** LightGBM classifier estimates $P(\text{Rain} > 0.1\text{ mm})$. If probability is below 0.60, predicted precipitation is strictly gated to $0.0\text{ mm}$, eliminating false drizzle in dry/break monsoon spells.
- **Stage 2: Conditional Amount Regressor:** Non-zero precipitation amounts are estimated conditionally based on synoptic regime dynamics.
- **Quantile Uncertainty (P10 / P50 / P90):** Calibrated gradient boosted quantile regressors generate 80% confidence bounds.
- **Stage 3: Calibrated Heavy-Rain Head ($\tau_{\text{heavy}} = 0.20$):** Dedicated classifier predicts exceedance probability for heavy rainfall ($\ge 64.5\text{ mm}/24\text{h}$) and triggers operational alerts when $P \ge 0.20$.
- **Objective Held-Out Verification:** Held-out test evaluation on 1,596 records (Sep 2–29, 2026) shows Model V2 reduces overall RMSE from 8.74 mm to 7.84 mm (-10.3% error) and increases Heavy Rain CSI from 0.2500 to 0.3636 (+45.4%), with documented trade-offs.

---

## 🚀 Local Development Setup

### 1. Backend (FastAPI)
The backend requires Python 3.10+ and exact pinned dependencies:

```bash
# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8001
uvicorn backend.api.app:app --host 127.0.0.1 --port 8001 --reload
```

The API docs will be available at `http://127.0.0.1:8001/docs`.

### 2. Frontend (React + Vite)
The frontend requires Node.js 18+:

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The UI will be accessible at `http://localhost:5173` (or `http://localhost:5174`).

---

## ⚙️ Environment Variables

Copy `.env.example` to create your environment configurations:

| Variable | Description | Default (Local) | Production Example |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base REST API endpoint URL | `http://127.0.0.1:8001/api` | `https://varsha-ai-api.onrender.com/api` |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist | `http://localhost:5173,http://localhost:5174` | `https://varsha-ai-six.vercel.app,http://localhost:5173` |

---

## 🌐 Production Deployment Configuration

### 1. Backend on Render (Web Service)
- **Service Name:** `varsha-ai-api`
- **Environment:** `Python 3`
- **Root Directory:** `.` (repo root)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.api.app:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Instance Type:** Free tier (512 MB RAM) / Starter
- **Environment Variables:**
  - `ALLOWED_ORIGINS`: `varsha-ai-six.vercel.app`

### 2. Frontend on Vercel (SPA)
- **Project Name:** `varsha-ai`
- **Framework Preset:** `Vite`
- **Root Directory:** `./`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Routing:** Handled via `vercel.json` SPA rewrites (`/(.*) -> /index.html`)
- **Environment Variables:**
  - `VITE_API_URL`: `https://varsha-ai-api.onrender.com/api`

---

## 🧪 Pre-Deployment Quality & Verification Commands

```bash
# Run backend pre-deployment endpoint audit (all 20 routes)
python scripts/test_predeployment_endpoints.py

# Run repo hygiene and file size audit
python scripts/audit_repo_hygiene.py

# Verify frontend production build
npm run build
```
