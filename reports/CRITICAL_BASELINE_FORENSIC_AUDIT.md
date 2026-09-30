# Critical Baseline Forensic Audit Report: GFS vs. ERA5-Land Target Identity

**Project:** VARSHAAI — Regime-Aware AI Rainfall Post-Processing Engine  
**Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Document Version:** 2.6.0 (Critical Forensic Audit)  
**Audit Date:** September 29, 2026  
**Status:** **INVESTIGATION COMPLETE — CRITICAL ANOMALY IDENTIFIED — EXECUTION HALTED**

---

## 1. Executive Summary: The 0.0000 Error Anomaly

During the baseline audit of the 1,548-sample test dataset (`2026-09-02` to `2026-09-29`), the raw forecast baseline was reported with:
- $\text{RMSE} = 0.0000\text{ mm}$
- $\text{MAE} = 0.0000\text{ mm}$
- $\text{Bias} = +0.0000\text{ mm}$
- $\text{Correlation } (r) = 1.0000$
- $\text{Heavy Rain CSI} = 1.0000$

Forensic tracing revealed that **`raw_forecast_rainfall_mm` and `observed_rainfall_mm` are 100% identical across all 1,548 test rows**.

---

## 2. Root Cause Forensic Analysis

### A. Endpoint Comparison
1. **Forecast Client Endpoint (`backend/data/forecast_client.py`):**
   ```text
   https://historical-forecast-api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&start_date=2026-04-02&end_date=2026-09-29&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata
   ```
2. **Observation Client Endpoint (`backend/data/observation_client.py`):**
   ```text
   https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date=2026-04-02&end_date=2026-09-29&daily=precipitation_sum,rain_sum&timezone=Asia%2FKolkata
   ```

### B. Why the Source Files Are Identical
In the Open-Meteo API ecosystem:
- `historical-forecast-api.open-meteo.com` provides a seamless reanalysis/reforecast blend that utilizes ECMWF ERA5-Land for historical ground truth precipitation.
- `archive-api.open-meteo.com` also serves ECMWF ERA5-Land gridded daily precipitation sum.
- Because both clients queried Open-Meteo for the same coordinates and dates (`2026-04-02` to `2026-09-29`), Open-Meteo returned **identical data arrays** in both `data/raw/forecast/nwp_hist_{district}_*.json` and `data/raw/observations/obs_hist_{district}_*.json`.

### C. Direct Row-Level Proof (Sample Traces)

| District | Date | Forecast Source File (`data/raw/forecast/`) | NWP Value (mm) | Observation Source File (`data/raw/observations/`) | Obs Value (mm) | Absolute Difference (mm) |
| :--- | :---: | :--- | :---: | :--- | :---: | :---: |
| **Pune** | `2026-04-02` | `nwp_hist_pune_...json` | 2.4 | `obs_hist_pune_...json` | 2.4 | **0.0** |
| **Pune** | `2026-04-03` | `nwp_hist_pune_...json` | 0.3 | `obs_hist_pune_...json` | 0.3 | **0.0** |
| **Pune** | `2026-09-10` | `nwp_hist_pune_...json` | 14.8 | `obs_hist_pune_...json` | 14.8 | **0.0** |
| **Mumbai City** | `2026-09-15` | `nwp_hist_mumbai city_...json` | 32.1 | `obs_hist_mumbai city_...json` | 32.1 | **0.0** |
| **Chennai** | `2026-09-20` | `nwp_hist_chennai_...json` | 8.4 | `obs_hist_chennai_...json` | 8.4 | **0.0** |
| **East Khasi Hills**| `2026-09-25` | `nwp_hist_east khasi hills_...json`| 44.2 | `obs_hist_east khasi hills_...json`| 44.2 | **0.0** |

---

## 3. Test Dataset Statistics (Untouched Test Split)

- **Total Test Rows:** 1,548 rows (`2026-09-02` to `2026-09-29` across 57 districts)
- **Rows Exactly Identical (`raw_gfs == observed`):** **1,548 / 1,548 (100.0%)**
- **Maximum Difference:** $0.0000\text{ mm}$
- **Minimum Difference:** $0.0000\text{ mm}$
- **Mean Difference:** $0.0000\text{ mm}$

---

## 4. Heavy-Rain Contingency Table (Threshold = 64.5 mm)

On the test split, because `raw_gfs_rainfall_mm == observed_rainfall_mm`:
- **True Positives (TP):** 12
- **False Positives (FP):** 0
- **False Negatives (FN):** 0
- **True Negatives (TN):** 1,536
- **Critical Success Index (CSI):** $\frac{12}{12 + 0 + 0} = \mathbf{1.0000}$
- **Probability of Detection (POD):** $\frac{12}{12 + 0} = \mathbf{1.0000}$
- **False Alarm Ratio (FAR):** $\frac{0}{12 + 0} = \mathbf{0.0000}$

---

## 5. Recomputed GFS Baseline Metrics

| Metric | Measured on Test Split | Status |
| :--- | :---: | :--- |
| **RMSE** | $0.0000\text{ mm}$ | **INVALID (Comparing dataset against itself)** |
| **MAE** | $0.0000\text{ mm}$ | **INVALID** |
| **Bias** | $+0.0000\text{ mm}$ | **INVALID** |
| **Correlation ($r$)** | $1.0000$ | **INVALID** |

---

## 6. Audit Verdict & Scientific Consequences

1. **Is GFS genuinely independent from the target in this dataset?**  
   **NO.** The two Open-Meteo endpoints returned the exact same underlying ERA5-Land data for historical dates.
2. **Can these metrics be presented to judges or evaluators?**  
   **NO.** Presenting an RMSE of $0.0000\text{ mm}$ and a CSI of $1.0000$ would constitute a false scientific claim resulting from testing against identical source streams.
3. **Status:** In accordance with the project's strict stop rules, **all further model training and UI modifications are halted** until an independent, decoupled operational forecast dataset and observation dataset are ingested.
