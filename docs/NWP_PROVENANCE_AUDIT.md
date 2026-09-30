# NWP Provenance & Numerical Weather Guidance Traceability Audit
**Project:** VARSHAAI  
**Document Version:** 2.4.0  
**Audit Objective:** Trace the exact physical and computational lineage of `raw_forecast_rainfall_mm` across all stages of the pipeline.  

---

## 1. Provenance Lineage Diagram

```text
REAL NWP MODEL (NOAA GFS 0.25° Seamless / ECMWF IFS Atmospheric Guidance)
  ↓
Raw Ingestion (data/raw/forecast/nwp_hist_*.json) via ForecastClient
  ↓
Spatial & District Mapping (data/processed/forecast_district_mapping.csv)
  ↓
Processed Datasets (data/processed/forecast_rainfall_clean.csv & imd_rainfall_clean.csv)
  ↓
Feature Engineering with Strict Shift(1) Lags (data/features/forecast_observation_training_dataset.csv)
  ↓
Synoptic Regime Classification (8 discrete circulation states)
  ↓
Regime-Conditioned HistGradientBoosting Post-Processing (data/models/rainfall_regressor.joblib)
  ↓
Verification against True IMD Ground Observations (data/reports/real_forecast_verification_report.json)
```

---

## 2. Stage-by-Stage Forensic Lineage

| Stage | Filename | Function / Component | Column Name | Data Source | Date Range | Spatial Resolution | Forecast Lead Time | Retrieval Timestamp | Transformation / Equation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Source** | NOAA GFS 0.25° / Open-Meteo & IMD MAUSAM | Global NWP & IMD Portal | Numerical Precipitation & Gauge Observations | NOAA GFS 0.25° Model + IMD Ground Stations | 2026-04-02 to 2026-09-29 | 0.25° Grid + District Stations | 24h Lead (Valid 08:30 IST) | Live Query / Cached | Direct model physics & rain gauge measurements |
| **2. Raw Ingestion** | `data/raw/forecast/*.json` | `ForecastClient.fetch_historical_nwp_forecast()` | `raw_forecast_rainfall_mm` | NOAA GFS 0.25° API response | 2026-04-02 to 2026-09-29 | Centroid coordinates for 57 districts | 24h Lead | 2026-09-29T15:51:50 | Parsed JSON payload into numeric float |
| **3. Spatial Mapping** | `data/processed/forecast_district_mapping.csv` | `PreprocessingPipeline.run_full_pipeline()` | `forecast_spatial_id`, `district_id` | District Master centroid lookup | Invariant | 57 Indian Districts | N/A | 2026-09-29T15:49:57 | Nearest Grid Centroid matching (`INDIA_DISTRICT_MASTER`) |
| **4. Processed Dataset** | `data/processed/forecast_rainfall_clean.csv` | `PreprocessingPipeline.run_full_pipeline()` | `raw_forecast_rainfall_mm`, `observed_rainfall_mm` | Real GFS Forecasts + Real IMD Ground Truth | 2026-04-02 to 2026-09-29 | 57 Districts | 24h Lead | 2026-09-29T15:49:57 | Strict separation of forecast and ground truth |
| **5. Feature Engineering** | `data/features/forecast_observation_training_dataset.csv` | `df.groupby('district_key').shift(1)` | `previous_1day_rainfall`, `rolling_7day_mean`, `regime_encoded` | Derived historical lags + synoptic regime | 2026-04-02 to 2026-09-29 | District Level (10,317 rows) | Historical (T-1, T-3, T-7) | 2026-09-29T15:49:57 | Shifted rolling windows (Zero Future Leakage) |
| **6. Model Training** | `backend/pipeline/model_training.py` | `ModelTrainingPipeline.train_rainfall_regressor()` | `rainfall_regressor.joblib` | Gradient boosted tree on regime-conditioned features | Train split: 2026-04-02 to 2026-08-06 | 57 Districts | 24h Lead | 2026-09-29T15:52:05 | `HistGradientBoostingRegressor` |
| **7. Inference** | `backend/pipeline/model_training.py` | `ModelInferenceEngine.predict()` | `aiCorrected`, `uncertainty`, `regime` | Trained scikit-learn models | Live runtime / Test split | District Centroids | 24h Lead | Live | Regime-conditioned tree evaluation with enforced $P_{10} \le P_{50} \le P_{90}$ |
| **8. Verification** | `data/reports/real_forecast_verification_report.json` | `scientific_audit.py` | Multi-tier scorecard | Evaluated on Test Set (1,548 samples) | 2026-09-02 to 2026-09-29 | Test Split | 24h Lead | 2026-09-29T15:52:36 | Exact calculation of RMSE, MAE, Bias, CSI, POD, FAR, ETS, Brier Score |

---

## 3. Historical Development Results vs Operational Verification

### Historical Synthetic Prototype Result (For Record Retention Only)
- **Label:** `SIMULATED_BASELINE_DEVELOPMENT_RESULT`
- **Notice:** *Not suitable for operational NWP performance claims.*
- **Historical synthetic claim:** Raw NWP RMSE = 9.59 mm, VARSHAAI = 5.70 mm (40.62% improvement).
- **Location:** Decommissioned and archived in `tests/fixtures/simulated_nwp_fixture.py`.

### Operational Real-Data Benchmark Scorecard (Current Real Verification)
- **Label:** `OPERATIONAL_REAL_NWP_VERIFICATION_RESULT`
- **Dataset:** 1,548 out-of-sample test cases across 57 districts (2026-09-02 to 2026-09-29).
- **Forecast Model:** NOAA GFS 0.25° Seamless Numerical Guidance.
- **Results:**
  - **Tier 1 (Raw GFS 0.25° NWP):** RMSE = 20.0363 mm | MAE = 14.2868 mm | Bias = -18.7302 mm | CSI = 0.0000
  - **Tier 2 (Simple Multiplier):** RMSE = 20.3683 mm | MAE = 14.1953 mm | Bias = -18.3970 mm | CSI = 0.0000
  - **Tier 3 (Global ML Baseline):** RMSE = 36.5304 mm | MAE = 26.2711 mm | Bias = +10.2289 mm | CSI = 0.0469
  - **Tier 4 (Regime-Aware ML):** RMSE = 35.9192 mm | MAE = 25.7533 mm | Bias = +9.4442 mm | CSI = 0.0307

---

## 4. Audit Verdict

`REAL_NWP_DATA = PASS`  
`FORECAST_OBSERVATION_SEPARATION = PASS`
