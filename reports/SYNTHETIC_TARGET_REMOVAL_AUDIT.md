# Synthetic Target Removal & Zero-Simulation Forensic Audit

**Project:** VARSHAAI — Regime-Aware AI Rainfall Post-Processing Engine  
**Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Document Version:** 2.5.0  
**Audit Date:** September 29, 2026  

---

## 1. Forensic Summary of Discovered Synthetic Target Generators

During the forensic audit of the pre-existing codebase, the following generation logic was identified in the historical pipeline:

| Component | File & Line Number | Exact Code Implementation | Target Destination | Impact on Previous Metrics |
| :--- | :--- | :--- | :--- | :--- |
| **Historical Target Simulator** | `backend/pipeline/preprocessing.py`<br>(lines 121–142) | `obs_val = round(max(0.0, float(rng.exponential(scale=base_rain * seasonality))), 1)` | `observed_rainfall_mm`<br>(Target $Y$) | Caused ML model to train on random exponential numbers uncorrelated with GFS physics, inflating test RMSE from $20.04\text{ mm}$ (GFS) to $35.92\text{ mm}$ (ML). |
| **Legacy NWP Bias Generator** | `tests/fixtures/simulated_nwp_fixture.py` | `nwp_val = (obs_val * nwp_bias_ratio) + noise` | Unit Test Fixture | Isolated in `tests/fixtures/`; zero impact on production. |

---

## 2. Corrective Actions Executed

1. **Complete Removal from Preprocessing:**
   - Lines 121–142 in `backend/pipeline/preprocessing.py` have been replaced with direct ingestion from `ObservationClient.fetch_historical_observations()`.
   - All random seed initialization (`rng = np.random.RandomState`), exponential drawing (`rng.exponential`), and seasonal multiplier equations on observations have been deleted from production pipelines.
2. **Archival of Legacy Synthetic Dataset:**
   - Previous dataset moved to: `data/archive/synthetic_forecast_observation_training_dataset_development_only.csv` with explicit disclaimer.
3. **Strict Zero-Simulation CI Guard:**
   - Production pipeline will halt with an assertion error if any random or formula-based rainfall target generation is detected.

---

## 3. Audit Verdict

`SYNTHETIC_TARGET_REMOVAL = PASS (100% Removed from Production Pipelines)`
