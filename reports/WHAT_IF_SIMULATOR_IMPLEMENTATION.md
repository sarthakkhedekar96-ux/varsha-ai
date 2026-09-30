# VARSHAAI V2 — What-If Synoptic Regime & Forecast Sensitivity Simulator
## Implementation & Scientific Architecture Report

**Document ID:** `VARSHAAI-REP-WHATIF-001`  
**Date:** 2026-09-29  
**Status:** IMPLEMENTED, SCIENTIFICALLY VERIFIED & LOCKED  
**Model Architecture:** VARSHAAI V2 Two-Stage Gated ML System  

---

### 1. Feature Purpose

The **Interactive "What-If" Synoptic Regime & Forecast Sensitivity Simulator** provides an interactive demonstration and sensitivity analysis tool embedded within the **District Intelligence** experience. 

It is designed for hackathon evaluators and domain experts to inspect exactly how the VARSHAAI V2 machine learning pipeline behaves when subjected to hypothetical meteorological conditions:
- How does the **Stage 1 Occurrence Gate** ($\tau = 0.60$) respond to varying precipitation amounts?
- How does changing the **Synoptic Regime** (e.g., *Break Monsoon* vs *Deep Depression*) shift the post-processed rainfall distribution?
- How does the **Stage 3 Heavy-Rain Gate** ($\tau_{\text{heavy}} = 0.20$, event $\ge 64.5\text{ mm} / 24\text{h}$) trigger alerts under severe hypothetical inputs?

#### Scientific Disclaimer & Operational Boundary
- **NOT an operational forecast:** The simulator produces hypothetical sensitivity outputs only. It does not represent an operational forecast and does not alter the actual operational prediction for any monitored district.
- **NO new NWP model run:** The user-defined rainfall input represents a hypothetical scenario, not an atmospheric forecast from NOAA GFS.
- **NO model modification:** All underlying model artifacts, training splits, and classification/regression thresholds remain 100% frozen.

---

### 2. End-to-End Decision Architecture

The simulation runs through the identical inference pipeline as the production V2 engine, operating on a single district at a time:

```
                  Hypothetical GFS Rainfall Input
                 + Hypothetical Synoptic Regime
                                │
                                ▼
                   Dynamic Feature Preparation
         (Geographic, Orographic, Proportional Lags,
               Synoptic Proxy One-Hot Encodings)
                                │
                                ▼
                 STAGE 1: RAIN OCCURRENCE GATE
              LightGBM Binary Classifier (Calibrated)
                  Output: P(Rain > 0.1 mm / 24h)
                                │
                 Is P(Rain) ≥ τ = 0.60?
               ┌────────────────┴────────────────┐
               │                                 │
           YES (Pass)                        NO (Fail)
               │                                 │
               ▼                                 ▼
   STAGE 2: RAINFALL AMOUNT           Gated Output: 0.0 mm
  XGBoost Conditional Regressor            (DRY REGIME)
   + Quantile Estimators (P10/50/90)             │
               │                                 │
               ▼                                 │
  STAGE 3: HEAVY RAIN CLASSIFIER                 │
 Calibrated Classifier for ≥ 64.5 mm             │
               │                                 │
         Is P(Heavy) ≥ 0.20?                     │
         ┌─────┴─────┐                           │
         │           │                           │
    ALERT (YES)  ALERT (NO)                      │
         └─────┬─────┘                           │
               │                                 │
               ▼                                 ▼
         Hypothetical VARSHAAI V2 Decision Pipeline Telemetry
```

---

### 3. Inputs & Supported Feature Registry

The simulator strictly exposes parameters that the existing V2 feature pipeline can safely condition without generating scientifically invalid out-of-distribution artifacts:

| Parameter | Type | Range / Options | Label in UI | Scientific Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `district_id` | `str` | 57 valid Maharashtra & Gujarat district identifiers | Monitored District | Provides real orographic elevation, latitude/longitude, and coastal proximity. |
| `hypothetical_rainfall_mm` | `float` | $0.0 \text{ to } 150.0\text{ mm}$ (Non-negative) | "Hypothetical GFS rainfall input" | Tests system response from dry days to extreme orographic and cyclonic precipitation events. |
| `regime` | `str` | 8 canonical synoptic proxy regimes | "Hypothetical regime" | Conditions atmospheric dynamics across known Indian monsoon synoptic types. |

#### Antecedent Context Scaling
When simulating extreme dry days (0.0 mm) or elevated events, historical lag features from preceding days are proportionally scaled to avoid inconsistent multi-day moisture artifacts:
$$\text{scale} = \min\left(2.5, \frac{\text{hypothetical\_rainfall}}{\text{baseline\_nwp}}\right) \quad (\text{scale} = 0.0 \text{ if rainfall} = 0.0)$$
This ensures that a hypothetical dry scenario ($0.0\text{ mm}$) cleanly reflects dry atmospheric physics ($P = 0.24 < 0.60$) without legacy antecedent moisture forcing false rain detections.

---

### 4. Existing V2 Models Reused

The simulator directly reuses the pre-loaded in-memory model artifacts managed by `V2InferenceService`. **Zero new models were trained or loaded:**

1. **`models/v2_occurrence_classifier.joblib`**: Calibrated binary classifier predicting $P(\text{Rain} > 0.1\text{ mm})$.
2. **`models/v2_amount_regressor.joblib`**: XGBoost regressor predicting conditional rainfall amount ($mm / 24h$).
3. **`models/v2_heavy_rain_classifier.joblib`**: Calibrated classifier predicting probability of heavy rain ($\ge 64.5\text{ mm} / 24h$).
4. **`models/quantile_p10.joblib`**: Quantile gradient boosting regressor (10th percentile / lower bound).
5. **`models/quantile_p50.joblib`**: Quantile gradient boosting regressor (50th percentile / median).
6. **`models/quantile_p90.joblib`**: Quantile gradient boosting regressor (90th percentile / upper bound).
7. **`models/model_v2_metadata.json`**: Official model registry with frozen training hashes and metadata.

---

### 5. Frozen Scientific Thresholds Preserved

All scientific decision thresholds remain strictly frozen and uncompromised:

- **Rain Occurrence Gate:** $\tau = 0.60$ (Probability cutoff for $Rain > 0.1\text{ mm}$)
- **Heavy Rain Decision Gate:** $\tau_{\text{heavy}} = 0.20$ (Probability cutoff for $\ge 64.5\text{ mm} / 24h$)
- **Heavy Rain Event Criterion:** $\ge 64.5\text{ mm} / 24h$ (Standard IMD meteorological definition)
- **Occurrence Definition:** $\text{Precipitation} > 0.1\text{ mm}$ (Standard wet-day threshold)

---

### 6. API Contract

#### Endpoint Specification
- **Method:** `POST /api/simulate` (and `GET /api/simulate` for lightweight query execution)
- **Performance:** $< 25\text{ ms}$ execution time per single-district query (Target: $< 1000\text{ ms}$).

#### Request Schema (`POST /api/simulate`)
```json
{
  "district_id": "pune",
  "hypothetical_rainfall_mm": 45.0,
  "regime": "Deep Depression"
}
```

#### Response Schema
```json
{
  "mode": "WHAT_IF_SENSITIVITY",
  "is_operational_forecast": false,
  "district_id": "pune",
  "district_name": "Pune",
  "hypothetical_inputs": {
    "hypothetical_rainfall_mm": 45.0,
    "regime": "Deep Depression"
  },
  "regime": "Deep Depression",
  "rain_probability": 0.962,
  "occurrence_threshold": 0.6,
  "occurrence_decision": "RAIN_OCCURS",
  "corrected_rainfall_mm": 41.2,
  "p10_mm": 32.1,
  "p50_mm": 41.2,
  "p90_mm": 54.8,
  "heavy_rain_probability": 0.285,
  "heavy_threshold": 0.2,
  "heavy_rain_alert": true,
  "heavy_rain_event_threshold_mm": 64.5,
  "model_version": "VARSHAAI V2"
}
```

#### Validation & Error Handling
- Negative rainfall inputs are rejected with `HTTP 400 Bad Request`.
- Non-existent district IDs are rejected with `HTTP 404 Not Found`.
- Unrecognized synoptic regimes fall back safely to `'Normal Background'` without service disruption.

---

### 7. UI Behavior & Visual Separation

The simulator is located in [`src/components/DistrictIntelligence.jsx`](file:///c:/Users/Dell/OneDrive/Desktop/VARSA/src/components/DistrictIntelligence.jsx) between Grid 1 (Operational Forecast) and Grid 2 (SHAP Explainable AI):

1. **Clear Visual Differentiation:**
   - Wrapped in a dedicated glassmorphism panel with dual-tone purple/amber styling.
   - Prominent badge: `WHAT-IF / SENSITIVITY MODE` (`Interactive Pipeline Demonstration`).
   - Mandatory disclosure banner highlighting that all outputs are hypothetical simulations.
2. **Interactive Controls:**
   - Slider ($0.0 \to 150.0\text{ mm}$, step $0.5\text{ mm}$).
   - Numeric input with instant synchronization and unit suffix (`mm / 24h`).
   - Synoptic proxy regime dropdown with all 8 canonical regimes.
   - 4 Demonstration Presets:
     - *Dry Day* ($0.0\text{ mm}$, Break Monsoon) $\to$ Demonstrates Stage 1 dry gating.
     - *Moderate Surge* ($25.0\text{ mm}$, Active Monsoon) $\to$ Demonstrates conditional amount regression.
     - *Deep Depression* ($45.0\text{ mm}$, Deep Depression) $\to$ Demonstrates cyclonic low-pressure response.
     - *Heavy Rain Scenario* ($80.0\text{ mm}$, Offshore Trough) $\to$ Demonstrates Stage 3 heavy alert triggering.
3. **Pipeline Decision Visualization:**
   - Displays 4 discrete stages: `Hypothetical Input` $\to$ `Stage 1: Rain Occurrence (τ=0.60)` $\to$ `Stage 2: Rainfall Amount (P10/50/90)` $\to$ `Stage 3: Heavy Rain (τheavy=0.20)`.
4. **Side-by-Side Comparison:**
   - **Real District Forecast Card (Production):** Shows real operational Raw GFS, V2 Prediction, Detected Regime, and operational alert status.
   - **What-If Scenario Card (Hypothetical):** Shows hypothetical GFS input, V2 simulated output, hypothetical regime, and sensitivity alert status.

---

### 8. Scientific Limitations & Boundaries

1. **No Real-Time NWP Modification:** The simulator does not rerun atmospheric physics or Navier-Stokes equations; it tests the ML post-processing bias correction function.
2. **Single-District Context:** The simulator isolates individual district responses; it does not simulate spatial mesoscale spatial feedback loops across adjacent basins.
3. **Domain Validity Boundary:** The simulator is calibrated for monsoon precipitation up to $150\text{ mm} / 24h$; extreme out-of-distribution values beyond this range are bounded.

---

### 9. Test Verification Suite

Three independent test suites were executed to ensure scientific regression safety and full feature compliance:

1. **`scripts/test_simulation_endpoint.py` (12 / 12 Tests PASS):**
   - Test 1: Valid simulation endpoint response
   - Test 2: Zero rainfall suppresses output to $0.0\text{ mm}$ via Stage 1 gate
   - Test 3: Moderate rainfall ($25\text{ mm}$) produces positive amount without false heavy alert
   - Test 4: Heavy rainfall ($80\text{ mm}$) correctly triggers heavy-rain alert ($\tau_{\text{heavy}} = 0.20$)
   - Test 5: Rejection of non-numeric rainfall inputs
   - Test 6: HTTP 400 rejection of negative rainfall
   - Test 7: HTTP 404 rejection of invalid district identifiers
   - Test 8: Safe fallback for unrecognized regimes
   - Test 9: Complete API contract and response schema verification
   - Test 10: Verification that $\tau = 0.60$ and $\tau_{\text{heavy}} = 0.20$ remain intact
   - Test 11: Model version verified as `VARSHAAI V2`
   - Test 12: `is_operational_forecast == False` verified

2. **`scripts/test_scientific_regression.py` (10 / 10 Tests PASS):**
   - Verified that all 10 core scientific regression invariants, data splits, and model behaviors remain undisturbed.

3. **`scripts/test_api_endpoints.py` (12 / 12 Tests PASS):**
   - Verified that all production operational endpoints (`/api/forecast/{district}`, `/api/districts`, `/api/verification`, `/api/alerts`, etc.) continue functioning normally.

4. **Frontend Production Build (`npm run build` PASS):**
   - Built cleanly via Vite in 2.77s with zero errors or bundle failures.

---

### 10. Summary of Files Changed & Created

| File | Status | Description |
| :--- | :--- | :--- |
| `backend/services/v2_inference_service.py` | Modified | Added safe `simulate()` method reusing existing loaded V2 models with dynamic antecedent scaling. |
| `backend/api/app.py` | Modified | Added `SimulationRequest` Pydantic model and `POST /api/simulate` + `GET /api/simulate` endpoints. |
| `src/data/apiClient.js` | Modified | Added `simulateHypotheticalScenario()` helper calling backend simulation endpoint. |
| `src/components/DistrictIntelligence.jsx` | Modified | Embedded interactive What-If Simulator panel with presets, slider, regime dropdown, 3-stage pipeline flow, and side-by-side comparison. |
| `scripts/test_simulation_endpoint.py` | Created | Automated test suite validating 12 behavioral and scientific requirements. |
| `reports/WHAT_IF_SIMULATOR_IMPLEMENTATION.md` | Created | Comprehensive implementation and scientific architecture documentation. |

---

### 11. Confirmation of Production Pipeline Integrity

- **Operational forecast behavior untouched:** `/api/forecast/{district_id}` continues returning authentic operational V2 inference without modification.
- **Model weights & parameters untouched:** All `.joblib` model artifacts and `model_v2_metadata.json` remain bit-for-bit identical.
- **Dataset integrity intact:** The frozen 10,317-row dataset (`279a1e5c...`) and 1,596-row test split remain completely untouched.
- **No prohibited claims introduced:** Zero instances of forbidden phrases ("ground truth", "IMD observation", "perfect forecast", etc.) exist in the codebase.
