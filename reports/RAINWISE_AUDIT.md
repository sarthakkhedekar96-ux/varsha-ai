# VARSHAAI — Forensic Audit Report: Feature #5
## RAINWISE AI Assistant Pre-Implementation Audit & Architectural Specification

**Document ID:** `VARSHAAI-REP-ASSISTANT-AUDIT-005`  
**Date:** 2026-09-29  
**Status:** AUDIT COMPLETED & SCIENTIFICALLY CONCLUDED  
**System:** VARSHAAI V2 (Meteorological Decision Support Engine)  

---

### Executive Summary

Prior to implementing **Feature #5 (RAINWISE AI Assistant)**, a forensic audit was executed across the VARSHAAI codebase, backend APIs, inference services, frontend architecture, and repository environment to establish the data availability, security boundaries, and architectural feasibility.

The audit established that:
1. **No external LLM provider API keys or SDKs are configured** (no OpenAI, Gemini, or Anthropic packages in `package.json` or backend). In strict adherence to scientific safety rules, **no fake API keys will be fabricated** and **no simulated LLM deception will be used**.
2. RAINWISE will be implemented as a **deterministic, rule-based semantic assistant** powered by structured intent classification, contextual district entity extraction, and live queries against genuine VARSHAAI endpoints.
3. A centralized **Scientific Language Filter** will enforce strict scientific disclosures: disallowing claims of "ground truth" for ERA5-Land, preventing false IMD observation claims, maintaining probabilistic phrasing for heavy rain, enforcing the PATH B multi-cycle deferral, and isolating operational queries from What-If hypothetical scenarios.
4. A dedicated backend assistant endpoint `POST /api/assistant/query` will be introduced to provide a single, robust, testable intelligence layer, complemented by client-side routing and fallback capabilities in `src/components/RainwiseAssistant.jsx` and `src/data/apiClient.js`.

---

### 1. Existing Backend Data Sources
- **NWP Guidance:** NOAA NCEP Global Forecast System (GFS) 0.25° seamless guidance (`models=gfs_seamless`).
- **Observational Reference Benchmark:** ECMWF ERA5-Land high-resolution gridded reanalysis (0.1° resolution).
- **Master Dataset:** 10,317 validated records (`data/features/real_forecast_observation_training_dataset.csv`, SHA-256: `279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39`).
- **Chronological Split:** Train: 7,182 rows (2026-04-02 to 2026-08-05); Validation: 1,539 rows (2026-08-06 to 2026-09-01); Test: 1,596 rows (2026-09-02 to 2026-09-29).

---

### 2. Existing Prediction Endpoints
- `GET /api/districts`: Returns current V2 forecasts, GFS baselines, regime assignments, rain occurrence probabilities, heavy-rain probabilities, decision gates, and risk levels across all 57 monitored districts.
- `GET /api/forecast/{district_id}`: Single-district detailed telemetry including `p10`, `p50`, `p90` predictive quantiles, occurrence threshold ($\tau = 0.60$), heavy-rain threshold ($\tau_{\text{heavy}} = 0.20$), and event threshold ($64.5\text{ mm}/24\text{h}$).
- `GET /api/forecast/{district_id}/comparison`: 4-tier model comparison (Raw GFS, Linear Bias, V1 Regime-Aware, V2 Two-Stage Gated).

---

### 3. Existing Verification Endpoints
- `GET /api/verification`: Exact frozen held-out test scorecard (1,596 records) comparing Raw GFS vs V1 vs V2 across RMSE, MAE, Bias, Pearson Correlation, CSI, POD, FAR, and dry-day false rain rate.
- `GET /api/verification/regimes`: Performance metrics across 7 verified synoptic regimes.
- `GET /api/verification/districts`: District-level improvements (28/57 districts improved on RMSE).

---

### 4. Existing District Metadata
- Registered in `backend/pipeline/district_master.py` and `INDIA_DISTRICT_MASTER`.
- 57 monitored districts with canonical names, normalized IDs, states, subdivisions, latitudes, longitudes, elevations, and terrain classifications.

---

### 5. Existing Provenance Information
- `GET /api/data/provenance`: Cryptographic SHA-256 hash `279a1e5c...`, total record count (10,317), model architecture summary, and spatial extraction methodology (`NEAREST_GRID_CENTROID`).
- `GET /api/data/quality`: Confirms status `PASS`, test leakage `NONE`, and physical independence `VERIFIED (NOAA GFS != ERA5-Land)`.

---

### 6. Existing Alert Information
- `GET /api/alerts`: Dynamic heavy-rain alert pipeline triggering strictly when $P(\text{Rain} \ge 64.5\text{ mm}) \ge 0.20$.

---

### 7. Existing Regime Information
- `GET /api/regime/current`: Canonical registry of 8 synoptic proxy regimes, circulation indicators, NWP bias patterns, and physical mechanisms.

---

### 8. Existing What-If API
- `POST /api/simulate` & `GET /api/simulate`: Dedicated sensitivity simulation endpoint using frozen Model V2 artifacts. Strict isolation from operational feeds (`MODE: WHAT_IF_SENSITIVITY`).

---

### 9. Existing Forecast Progression PATH B Information
- Forensic audit documented in `reports/MULTI_CYCLE_DATA_AUDIT.md`.
- Concluded that Open-Meteo `gfs_seamless` provides only daily aggregated totals; nominal `00Z` and `24h` lead time are application-assigned operational mapping metadata.
- Multi-cycle comparison is formally deferred under PATH B.

---

### 10. Existing Frontend State Management
- `src/App.jsx`: Manages global state including `selectedDistrictId`, `activeTab`, `backendHealth`, `realDistricts`, and `backendStatus`.
- `DistrictIntelligence.jsx`: Manages district telemetry and What-If simulator inputs.

---

### 11. Existing API Client Functions
- Defined in `src/data/apiClient.js`: `fetchDistrictForecast`, `fetchActiveAlerts`, `fetchVerificationData`, `fetchDataProvenance`, `fetchCurrentRegimes`, `simulateHypotheticalScenario`, etc.

---

### 12. What RAINWISE Can Safely Answer
- District-specific operational rainfall forecasts (Raw GFS vs VARSHAAI V2).
- Rain occurrence probabilities ($P > 0.1\text{ mm}$) and Stage 1 gating ($\tau = 0.60$).
- Heavy rainfall probabilities ($P \ge 64.5\text{ mm}$), decision gate ($\tau_{\text{heavy}} = 0.20$), and alert status.
- Predictive quantiles ($P10, P50, P90$) and uncertainty spread.
- Synoptic proxy regime classification and physical circulation descriptions.
- Official held-out verification scorecard and documented scientific trade-offs.
- Data provenance, dataset hashes, and model architecture explanations.
- What-If sensitivity evaluations (strictly flagged as hypothetical).
- Active operational alerts meeting the decision threshold.
- Accurate explanation of why multi-cycle comparison is unavailable (Feature #4 PATH B).

---

### 13. What RAINWISE Must Refuse or Disclose
- **Refuse:** Flood predictions, dam breach forecasts, hurricane tracking, or unmodeled hazards ("VARSHAAI currently provides rainfall forecast post-processing and heavy-rain probability; it does not contain a validated hydrological flood prediction model").
- **Refuse:** Long-range or sub-daily weather forecasts outside the validated 24-hour operational window.
- **Disclose:** ERA5-Land is a reanalysis benchmark, NOT in-situ gauge ground truth.
- **Disclose:** Forecasts originate from NOAA NCEP GFS 0.25°, NOT IMD weather stations.
- **Disclose:** VARSHAAI V2 is NOT universally superior to raw GFS across all metrics (it has higher MAE and higher dry-day false rain rate).
- **Disclose:** What-If scenario results are hypothetical and must never be interpreted as operational forecasts.

---

### 14. Whether an LLM / API Integration is Available
- **Finding:** **UNAVAILABLE.**
- No LLM SDK, API keys, or cloud inference endpoints are configured.
- Fabricating a fake LLM or hardcoding fake API keys is strictly prohibited.
- **Decision:** Implement a **deterministic, rule-based semantic assistant** with regex-based intent classification and live backend data binding.

---

### 15. Implementation Architecture
- **Dual-Layer Architecture:**
  1. **Backend REST Endpoint:** `POST /api/assistant/query` in `backend/api/app.py` for server-side intent classification, data binding, and scientific safety filtering.
  2. **Frontend UI Component:** Full rewrite of `src/components/RainwiseAssistant.jsx` to replace the outdated mock with an interactive, responsive assistant interface featuring floating drawer integration, metric cards, source badges, and clickable prompt suggestions.
