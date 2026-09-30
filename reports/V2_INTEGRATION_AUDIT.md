# Forensic Integration Audit: VARSHAAI Production Pipeline & Model V2 Readiness

**Document Version:** 1.0-AUDIT  
**Date:** 2026-09-29  
**System:** VARSHAAI (Ministry of Earth Sciences / NCMRWF / IMD)  
**Status:** **AUDIT COMPLETE — READY FOR V2 INTEGRATION**  
**Audit Scope:** Full repository analysis (Backend, Frontend, Data Pipeline, Models, Ingestion, Provenance, Mock Artifacts)  

---

## 1. Executive Summary

This audit evaluates the codebase architecture to prepare for integrating the scientifically validated **Model V2 (Two-Stage Gated Architecture with Calibrated Heavy Rain Classifier)** into the active production backend and frontend.

### Audit Key Findings
1. **Model Inconsistency:** The backend service (`backend/api/app.py`) currently initializes `ModelInferenceEngine`, which looks for outdated legacy files in `data/models/` rather than the validated V2 artifacts in `models/` (`v2_occurrence_classifier.joblib`, `v2_amount_regressor.joblib`, `v2_heavy_rain_classifier.joblib`).
2. **Hardcoded Mock Paths in API:**
   - `/api/alerts` returns static hardcoded JSON alerts (`ALT-001` to `ALT-004`).
   - `/api/verification` falls back to hardcoded mock metrics (`RMSE: 8.42 -> 4.96`, `CSI: 0.73`) if report files are absent.
   - `/api/districts` and `/api/forecast/{district_id}` contain hardcoded fallback dictionaries with static rainfall values if records fail.
3. **Frontend Mock Data Decoupling:** The frontend (`VerificationEngine.jsx`, `AlertsPanel.jsx`, `ExtremeRainfallMonitor.jsx`) imports fabricated metrics from `src/data/mockData.js` (`VERIFICATION_METRICS`) with fictional numbers (e.g., FSS = 0.82, CSI = 0.73).
4. **Terminology Mislabeling:** Several API responses and frontend labels designate ECMWF ERA5-Land reanalysis as "IMD MAUSAM Observed Ground Truth" rather than the scientifically required **"ECMWF ERA5-Land reanalysis/reference precipitation"**.
5. **Frozen Dataset & Provenance Integrity:** The underlying dataset `data/features/real_forecast_observation_training_dataset.csv` (SHA-256: `279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39`) and raw GFS files (`data/raw/forecast_gfs/`) are 100% genuine and strictly frozen.

---

## 2. Current Architecture Overview

### A. Backend Service Architecture
- **Framework:** FastAPI (`backend/api/app.py`) running on `127.0.0.1:8000`.
- **Pipeline Modules:**
  - `backend/pipeline/preprocessing.py`: Handles spatial district mapping, feature engineering, and temporal alignment.
  - `backend/pipeline/district_master.py`: Master dictionary of 57 districts (`INDIA_DISTRICT_MASTER`), coordinates, elevations, and terrain.
  - `backend/data/forecast_client.py`: Ingests genuine NOAA GFS 0.25° NWP via Open-Meteo with explicit `models=gfs_seamless`.
  - `backend/data/observation_client.py`: Ingests ECMWF ERA5-Land 0.1° reanalysis.
- **Inference Layer:** `ModelInferenceEngine` in `backend/pipeline/model_training.py` (needs replacement/refactoring to V2).

### B. Frontend Application Architecture
- **Framework:** React 18 + Vite + Tailwind CSS + Lucide React + Recharts.
- **Client Service:** `src/data/apiClient.js` connects to backend API endpoints with timeout and health check fallback.
- **Key Views:**
  - `CommandCenter.jsx`: Executive overview, national alert summary, district spotlight.
  - `InteractiveMap.jsx`: Geospatial district mapping with interactive pins.
  - `DistrictIntelligence.jsx`: Detailed single-district view with NWP vs AI comparison, quantile spread, and regime.
  - `RawVsAiLens.jsx`: Side-by-side NWP vs VARSHAAI visualizer.
  - `RegimeMonitor.jsx`: Monsoon regime classification and active synoptic systems.
  - `ExtremeRainfallMonitor.jsx`: Heavy-rain monitoring table.
  - `VerificationEngine.jsx`: Scorecard and validation metrics.
  - `AlertsPanel.jsx`: Slide-out drawer displaying operational warnings.

---

## 3. Data & Prediction Flow: Current vs. Target V2

### Current Flow (V1 Legacy Fallback):
```text
GFS NWP Forecast
      │
      ▼
Raw NWP Value (or hardcoded fallback)
      │
      ▼
Legacy Regressor (Single-Stage MSE Regression)
      │
      ▼
Continuous Output (overpredicts dry days; suppresses heavy rain)
```

### Target V2 Production Flow:
```text
NOAA NCEP GFS 0.25° Guidance (Day D-1 00:00 UTC)
      │
      ▼
Spatiotemporal & Moisture Feature Preparation (strictly antecedent shift(1))
      │
      ▼
Rule-Based Proxy Synoptic Regime Assignment (Forecast-Time)
      │
      ▼
[Stage 1: Rain Occurrence Classifier]
P(Rain > 0.1 mm)
      │
      ├── If P(Rain) < 0.60 ──────► Predict 0.0 mm (Dry Gated)
      │
      └── If P(Rain) >= 0.60 ─────► [Stage 2: Conditional Amount Regressor]
                                     Predict Expected Rainfall Amount (mm)
                                          │
                                          ▼
[Stage 3: Calibrated Heavy Rain Classifier]
P(Rain >= 64.5 mm)
      │
      ├── If P(Heavy) >= 0.20 ────► HEAVY RAIN ALERT: YES
      └── If P(Heavy) < 0.20  ────► HEAVY RAIN ALERT: NO
                                          │
                                          ▼
Output Payload: District-Level Calibrated Forecast, Regime, Probabilities, Alerts & Provenance
```

---

## 4. Model Artifacts Audit

| Artifact File | Location | Role / Status | Action for Integration |
| :--- | :--- | :--- | :--- |
| `v2_occurrence_classifier.joblib` | `models/` | Stage 1 Rain Occurrence Classifier | **Primary Production Model** |
| `v2_amount_regressor.joblib` | `models/` | Stage 2 Conditional Amount Regressor | **Primary Production Model** |
| `v2_heavy_rain_classifier.joblib` | `models/` | Calibrated Heavy Rain Probabilistic Classifier | **Primary Production Model** |
| `model_v2_metadata.json` | `models/` | V2 Hyperparameters & Thresholds | **Configuration Source** |
| `regime_aware.joblib` | `models/` | V1 Regime-Aware Single-Stage Model | **Preserve for Comparison** |
| `bias_correction.joblib` | `models/` | Linear Bias Correction Model | **Preserve for Baseline** |
| `quantile_p10.joblib` | `models/` | 10th Percentile Quantile Model | **Preserve for Uncertainty** |
| `quantile_p50.joblib` | `models/` | 50th Percentile Quantile Model | **Preserve for Uncertainty** |
| `quantile_p90.joblib` | `models/` | 90th Percentile Quantile Model | **Preserve for Uncertainty** |
| `legacy models` | `data/models/` | Outdated early-development weights | **Bypass / Do Not Use** |

---

## 5. API Endpoints Audit

| Route | Current Implementation | Issues Identified | Required Modifications |
| :--- | :--- | :--- | :--- |
| `GET /` | Root info & status | Claims IMD MAUSAM target | Update provenance to NOAA GFS + ERA5-Land reference |
| `GET /api/status` | System health & reports | Claims IMD MAUSAM | Point to V2 reports, update observation source |
| `GET /api/districts` | 57-district list | Calls V1 engine; fallback mock | Hook to V2 Two-Stage inference engine |
| `GET /api/forecast/{id}` | Single district forecast | Uses V1 single-stage model; mock fallback | Serve V2 calibrated prediction, rain prob, heavy prob, alert |
| `GET /api/forecast/{id}/comparison` | 4-tier comparison | Static multiplier | Compare Raw GFS vs Bias Corr vs V1 vs V2 |
| `GET /api/rainfall/current` | Latest observed table | Labeled IMD observed | Clearly label as ERA5-Land reference precipitation |
| `GET /api/regime/current` | Active regimes | Static descriptions | Keep regime taxonomy; align with 8 proxy regimes |
| `GET /api/alerts` | Active warnings | Hardcoded mock alerts (ALT-001..004) | **Dynamically generate real alerts from V2 heavy-rain classifier** |
| `GET /api/verification` | Model scorecard | Fallback hardcoded JSON | Serve real `model_v2_evaluation_results.csv` & metrics |
| `GET /api/verification/regimes` | **NEW** (Needed) | Absent | Expose `model_v2_regime_wise_results.csv` |
| `GET /api/verification/districts` | **NEW** (Needed) | Absent | Expose `model_v2_district_wise_results.csv` |
| `GET /api/data/provenance` | Lineage details | Claims IMD MAUSAM target | Accurately document NOAA GFS + ERA5-Land reference |

---

## 6. Frontend Components Audit & Mock Paths

1. **`VerificationEngine.jsx`:**
   - *Problem:* Directly maps `VERIFICATION_METRICS.overallScorecard` from `mockData.js` with fictional numbers (`RMSE 21.1 mm`, `FSS 0.82`).
   - *Fix:* Fetch real validated numbers from `/api/verification` (Raw GFS: 8.74 mm, V1: 7.92 mm, V2: 7.84 mm; CSI: 0.3636, POD: 0.80, FAR: 0.60). Explicitly state FSS is NOT COMPUTABLE.
2. **`AlertsPanel.jsx` & `ExtremeRainfallMonitor.jsx`:**
   - *Problem:* Display `SYSTEM_ALERTS` from `mockData.js`.
   - *Fix:* Fetch dynamic alerts from `/api/alerts` populated by the V2 heavy rain classifier ($\tau_{\text{heavy}} = 0.20$).
3. **`DistrictIntelligence.jsx`:**
   - *Problem:* Heavy rain probability is displayed as a mock dictionary (`{"p15": 92, "p35": 75, ...}`).
   - *Fix:* Render real `rain_probability` ($P > 0.1$ mm) and `heavy_rain_probability` ($P \ge 64.5$ mm) from V2 output contract.
4. **`CommandCenter.jsx`:**
   - *Problem:* Displays "IMD Station Verified" and uses old summary metrics.
   - *Fix:* Update cards to show NOAA GFS 0.25°, Model V2, ERA5-Land reference, and real test verification metrics.
5. **Scientific Honesty Panel:**
   - Add neutral methodology banner acknowledging partial improvement with documented trade-offs.

---

## 7. Exact Files That Need Modification

### Backend:
1. `backend/api/app.py`:
   - Replace legacy inference engine with a dedicated `V2InferenceService`.
   - Update all endpoints to return V2 prediction schema, dynamic alerts, and accurate provenance.
   - Add endpoints for regime-wise and district-wise verification results.
2. `backend/pipeline/model_training.py`:
   - Update `ModelInferenceEngine` to support V2 two-stage gating and V2 heavy rain classifier.

### Frontend:
1. `src/data/apiClient.js`:
   - Add helper functions to fetch regime-wise and district-wise verification data.
2. `src/components/VerificationEngine.jsx`:
   - Display real validated multi-model comparison table (Raw GFS vs V1 vs V2).
   - Display regime-wise and district-wise V2 results.
   - Add dry-day bias comparison (Raw: 13%, V1: 96%, V2: 49.7%).
   - Add prominent FSS notice: "FSS: Not computable with current district-centroid point dataset."
   - Add Scientific Validation honesty badge.
3. `src/components/AlertsPanel.jsx`:
   - Connect to real dynamic alerts from `/api/alerts`.
4. `src/components/ExtremeRainfallMonitor.jsx`:
   - Display real V2 heavy-rain predictions and alert statuses.
5. `src/components/DistrictIntelligence.jsx`:
   - Display V2 rain probability, heavy-rain probability, gate status, and correct provenance labels.
6. `src/components/CommandCenter.jsx`:
   - Update headline metrics and status badges to match validated V2 numbers.

---

## 8. Exact Files That Must NOT Be Modified

1. `data/features/real_forecast_observation_training_dataset.csv` (**FROZEN**: SHA-256 `279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39`).
2. `data/raw/forecast_gfs/` (57 genuine GFS forecast files).
3. `data/raw/observations/` (57 genuine ERA5-Land observation files).
4. `data/archive/` (Quarantined contaminated forecast data).
5. `models/v2_occurrence_classifier.joblib` (Trained V2 model).
6. `models/v2_amount_regressor.joblib` (Trained V2 model).
7. `models/v2_heavy_rain_classifier.joblib` (Trained V2 model).
8. `models/regime_aware.joblib` (Preserved V1 model).
9. `reports/MODEL_V2_EVALUATION.md` (Scientific evaluation report).
10. `reports/model_v2_evaluation_results.csv` (Held-out test results).
11. `reports/model_v2_regime_wise_results.csv` (Held-out regime results).
12. `reports/model_v2_district_wise_results.csv` (Held-out district results).

---

## 9. Audit Conclusion & Readiness Decision

**AUDIT RESULT: PASS**  
The repository structure is thoroughly mapped. All V2 artifacts and evaluation results are intact and verified. We can now proceed to **Step 6: Real V2 Model Integration**.
