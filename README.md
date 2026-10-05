# VARSHA AI

**Regime-Aware Rainfall Intelligence & Decision Support Portal**

Smart India Hackathon 2026
Problem Statement **SIH26080**
Use Case: **Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts**
Domain: **Weather & Climate Intelligence | Rainfall Forecasting & Decision Support**
Organization Context: **Ministry of Earth Sciences (MoES)**

VARSHA AI is a web-based meteorological intelligence platform that delivers calibrated daily precipitation guidance across 57 monitored Indian administrative districts.

It post-processes raw numerical weather prediction (NWP) guidance from NOAA NCEP GFS 0.25° (`gfs_seamless`) against independent ECMWF ERA5-Land 0.1° reanalysis benchmarks, using a Two-Stage Gated Machine Learning architecture (**VARSHA AI V2**) with quantile uncertainty and a dedicated heavy-rain alerting head.

## Live Demo

**[Open VARSHA AI](https://varsha-ai-six.vercel.app)**

The deployed frontend provides the primary demonstration interface for the prototype.

> ⚠️ **Historical Validation & Replay Data Disclaimer**
> All telemetry and forecasts rendered by default in this portal represent **historical validation / replay data spanning April 2, 2026 to September 29, 2026 (10,317 validated records)**. This is a scientific decision-support system and model-verification benchmark. It is **not** an official real-time meteorological forecast issued by the India Meteorological Department (IMD).

## Problem Statement

Raw NWP rainfall guidance is useful but imperfect at district scale. Common issues include:

- False drizzle during dry or break-monsoon spells
- Biased rainfall amounts relative to observed/reanalysis benchmarks
- No calibrated uncertainty range around a single predicted value
- Under-detection of heavy-rainfall events
- Difficulty turning raw model output into actionable district-level guidance

Operational users need rainfall guidance that is calibrated, uncertainty-aware, and verifiable against an independent reference, accessible from a single portal.

VARSHA AI aims to provide that: improved district-level precipitation guidance, clear uncertainty bounds, and heavy-rain alerts, together with transparent verification of how the model performs.

## What VARSHA AI Does

VARSHA AI follows the workflow:

**Ingest → Calibrate → Gate → Quantify → Alert → Decide**

The platform helps answer questions such as:

- How much rain is expected in a district over the next 24 hours?
- Is rain likely to occur at all, or should the forecast be treated as dry?
- What is the plausible range (P10 / P50 / P90) around the predicted amount?
- Which districts have an elevated probability of heavy rainfall?
- How does the calibrated forecast compare with raw GFS guidance?
- How was the model verified, and what are its trade-offs?

## Key Platform Capabilities

### 1. Rainfall Intelligence Portal
Provides a consolidated view of district-level precipitation guidance across 57 monitored Indian administrative districts.

### 2. Two-Stage Gated Prediction
A rain-occurrence gate decides whether rain is expected, and a conditional regressor then estimates the amount, so dry spells are no longer polluted by false drizzle.

### 3. Quantile Uncertainty (P10 / P50 / P90)
Calibrated gradient-boosted quantile regressors provide 80% confidence bounds around each prediction rather than a single unqualified number.

### 4. Heavy-Rain Alerting
A dedicated, calibrated classifier estimates the probability of heavy rainfall (≥ 64.5 mm / 24 h) and triggers operational alerts when the probability crosses the alert threshold.

### 5. Reference-Based Verification
Forecasts are evaluated against independent ECMWF ERA5-Land 0.1° reanalysis benchmarks, with objective held-out testing reported openly, including trade-offs.

### 6. Decision Support Interface
A React-based web interface exposes district-level guidance, uncertainty, and alerts, backed by a documented REST API.

## System Architecture

### Data & Intelligence Pipeline

Raw NWP guidance (NOAA NCEP GFS 0.25°) is post-processed through the VARSHA AI V2 model stack and verified against ECMWF ERA5-Land 0.1° reference data before being served through the API to the web portal.

## Machine Learning

VARSHA AI V2 is a multi-stage model:

| Stage | Component | Purpose |
| --- | --- | --- |
| Stage 1 | Rain Occurrence Gate (LightGBM classifier, τ = 0.60) | Estimates P(Rain > 0.1 mm). If probability is below 0.60, predicted precipitation is gated to 0.0 mm. |
| Stage 2 | Conditional Amount Regressor | Estimates non-zero precipitation amounts conditioned on synoptic regime dynamics. |
| Uncertainty | Quantile Regressors (P10 / P50 / P90) | Provides calibrated 80% confidence bounds. |
| Stage 3 | Calibrated Heavy-Rain Head (τ_heavy = 0.20) | Predicts exceedance probability for ≥ 64.5 mm / 24 h and raises an alert when P ≥ 0.20. |

### Objective Held-Out Verification

Held-out evaluation on **1,596 records (September 2–29, 2026)** shows:

| Metric | Raw Baseline | VARSHA AI V2 | Change |
| --- | --- | --- | --- |
| Overall RMSE | 8.74 mm | 7.84 mm | −10.3% error |
| Heavy Rain CSI | 0.2500 | 0.3636 | +45.4% |

Documented trade-offs are described in the project documentation.

### Important model note

The current prototype model is intended for decision support and demonstration, not as an autonomous replacement for official meteorological forecasts.

Model outputs should be interpreted together with official IMD advisories, observational data, and domain expertise.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React / Vite |
| Backend | Python / FastAPI (served with Uvicorn) |
| Machine Learning | LightGBM / gradient-boosted quantile regression |
| NWP Input | NOAA NCEP GFS 0.25° (`gfs_seamless`) |
| Reference Data | ECMWF ERA5-Land 0.1° |
| Linting | Oxlint |
| Deployment | Vercel (frontend) + Render (backend) |

## Project Structure

```
varsha-ai/
│
├── backend/          # FastAPI application and API routes
├── src/              # React frontend source
├── public/           # Static frontend assets
├── models/           # Trained model artifacts
├── data/             # Datasets
├── reports/          # Verification and evaluation reports
├── docs/             # Project documentation
├── scripts/          # Audit and pre-deployment test scripts
├── tests/fixtures/   # Test fixtures
├── index.html
├── package.json
├── vite.config.js
├── vercel.json       # Vercel SPA rewrites
├── render.yaml       # Render backend configuration
├── requirements.txt
├── .env.example
└── README.md
```

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/sarthakkhedekar96-ux/varsha-ai.git
cd varsha-ai
```

### 2. Backend setup (FastAPI)

Requires Python 3.10+.

```bash
pip install -r requirements.txt

# Start FastAPI server on port 8001
uvicorn backend.api.app:app --host 127.0.0.1 --port 8001 --reload
```

API docs will be available at `http://127.0.0.1:8001/docs`.

### 3. Frontend setup (React + Vite)

Requires Node.js 18+.

```bash
npm install
npm run dev
```

The UI will normally be available at `http://localhost:5173` (or `http://localhost:5174`).

## Environment Variables

Create a local `.env` file from `.env.example`.

| Variable | Description | Default (Local) | Production Example |
| --- | --- | --- | --- |
| `VITE_API_URL` | Base REST API endpoint URL | `http://127.0.0.1:8001/api` | `https://varsha-ai-api.onrender.com/api` |
| `ALLOWED_ORIGINS` | Comma-separated CORS whitelist | `http://localhost:5173,http://localhost:5174` | `https://varsha-ai.vercel.app,http://localhost:5173` |

Never commit `.env` or real credentials to GitHub.

## Production Deployment

### Backend on Render (Web Service)

- **Service Name:** `varsha-ai-api`
- **Environment:** Python 3
- **Root Directory:** `.` (repo root)
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.api.app:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/health`
- **Environment Variables:** `ALLOWED_ORIGINS` set to the deployed frontend URL

### Frontend on Vercel (SPA)

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Routing:** SPA rewrites via `vercel.json` (`/(.*)` → `/index.html`)
- **Environment Variables:** `VITE_API_URL` set to the deployed backend API URL

## Validation

Pre-deployment checks used during repository cleanup:

```bash
# Backend endpoint audit (all 20 routes)
python scripts/test_predeployment_endpoints.py

# Repo hygiene and file size audit
python scripts/audit_repo_hygiene.py

# Verify frontend production build
npm run build
```

## Documentation

Detailed project documentation is available under:

```
docs/
```

Verification and evaluation outputs are available under:

```
reports/
```

## Why VARSHA AI?

VARSHA AI focuses on turning raw NWP output into guidance that operational users can trust and interrogate:

- Raw NWP Guidance
- Reference-Based Calibration
- Rain Occurrence Gating
- Conditional Amount Estimation
- Quantile Uncertainty
- Heavy-Rain Alerting
- Transparent Verification
- Decision Support

The objective is not simply to display forecast data, but to help users move from:

**Raw Guidance → Calibrated Guidance → Quantified Uncertainty → Actionable Alerts**

## Prototype Disclaimer

VARSHA AI is a Smart India Hackathon prototype intended to demonstrate an integrated rainfall-intelligence and decision-support workflow.

Predictions, uncertainty bounds, and heavy-rain alerts should be treated as analytical support and validated against official IMD advisories and authoritative observations before being used for operational decisions.

## Team FAFNIR1127

**Smart India Hackathon 2026**

| Role | Member |
| --- | --- |
| Team Leader | Neha Suryawanshi |
| Team Member | Tarun Sawant |
| Team Member | Sarthak Khedekar |
| Team Member | Sanket Gayakhe |
| Team Member | Samarth Darole |
| Team Member | Atif Shaikh |

**Smart India Hackathon**
Problem Statement: SIH26080
Title: **Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts**
Project: VARSHA AI
Team: FAFNIR1127

## License

This project is intended to be released under the MIT License.

A `LICENSE` file should be present in the repository root.
