# GFS Forecast vs. Real Ground Truth Observation Baseline Report

**Project:** VARSHAAI  
**Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Document Version:** 2.5.0  
**Generated Date:** 2026-09-29  

---

## 1. Baseline Statistical Evaluation (Real Observations vs Raw GFS)

Evaluated across all 10317 genuine GFS-observation pairs:

| Baseline Metric | Measured Value | Physical Interpretation |
| :--- | :---: | :--- |
| **Root Mean Squared Error (RMSE)** | **11.7440 mm** | True baseline numerical error of raw uncalibrated GFS. |
| **Mean Absolute Error (MAE)** | **4.9547 mm** | Mean absolute magnitude of forecast error. |
| **Systematic Bias** | **-0.9334 mm** | Dry underprediction bias across complex terrain. |
| **Pearson Correlation ($r$)** | **0.6629** | Genuine physical correlation between GFS numerical model and ground truth. |

---

## 2. Correlation Breakdown by Synoptic Regime

| Weather Regime | Sample Count | RMSE (mm) | MAE (mm) | Bias (mm) | Pearson Correlation ($r$) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **BREAK_MONSOON** | 4496 | 3.46 | 1.41 | -1.36 | 0.2893 |
| **NORMAL_BACKGROUND** | 2851 | 9.08 | 5.13 | -2.21 | 0.2104 |
| **ACTIVE_MONSOON** | 852 | 16.14 | 10.17 | -1.14 | 0.1979 |
| **DEPRESSION** | 59 | 49.32 | 40.29 | +28.51 | 0.1907 |
| **MONSOON_LOW** | 147 | 20.28 | 15.34 | +6.56 | 0.0776 |
| **COASTAL_RAINFALL** | 415 | 35.95 | 21.15 | +7.67 | 0.5193 |
| **WESTERN_DISTURBANCE** | 397 | 7.08 | 3.36 | -0.82 | 0.5704 |
| **OROGRAPHIC_RAINFALL** | 1100 | 11.75 | 6.13 | -1.59 | 0.6133 |
