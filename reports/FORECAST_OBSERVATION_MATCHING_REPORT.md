# Forecast-Observation Matching & Spatiotemporal Alignment Report

**Project:** VARSHAAI — Regime-Aware AI Rainfall Post-Processing Engine  
**Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Document Version:** 2.5.0  
**Generated Date:** 2026-09-29  

---

## 1. Matching Methodology & Spatiotemporal Specification

- **Forecast Model:** NOAA GFS 0.25° Seamless Numerical Model Guidance (`raw_forecast_rainfall_mm`).
- **Observation Source:** ECMWF ERA5-Land High-Resolution Reanalysis (`observed_rainfall_mm`).
- **Temporal Alignment:** 
  - `forecast_issue_time`: $T - 24\text{h}$ (00:00 UTC / 05:30 IST)
  - `forecast_valid_time`: $T$ (08:30 IST)
  - `lead_time_hours`: Exactly 24 Hours
  - `observation_date`: Exactly aligned to forecast valid day $T$.
- **Spatial Alignment:** 
  - Official WGS84 District Centroids mapped to nearest 0.25° grid coordinates.
  - Total Districts: 57
  - Total Matched Pairs: 10317
  - Date Range: 2026-04-02 to 2026-09-29 (181 days)

---

## 2. District Coverage & Matching Matrix

| District | State | Latitude | Longitude | GFS Grid Lat | GFS Grid Lng | Distance (km) | Total Matched Days | Missing Days |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Ahmedabad | Gujarat | 23.0225 | 72.5714 | 23.00 | 72.50 | 8.3 | 181 | 0 |
| Amritsar | Punjab | 31.6340 | 74.8723 | 31.75 | 74.75 | 18.7 | 181 | 0 |
| Chhatrapati Sambhaji Nagar (Aurangabad) | Maharashtra | 19.8762 | 75.3433 | 20.00 | 75.25 | 17.2 | 181 | 0 |
| Bengaluru Urban | Karnataka | 12.9716 | 77.5946 | 13.00 | 77.50 | 11.0 | 181 | 0 |
| Bhopal | Madhya Pradesh | 23.2599 | 77.4126 | 23.25 | 77.50 | 9.8 | 181 | 0 |
| Cachar (Silchar) | Assam | 24.8333 | 92.7789 | 24.75 | 92.75 | 9.8 | 181 | 0 |
| Chennai | Tamil Nadu | 13.0827 | 80.2707 | 13.00 | 80.25 | 9.5 | 181 | 0 |
| Coimbatore | Tamil Nadu | 11.0168 | 76.9558 | 11.00 | 77.00 | 5.2 | 181 | 0 |
| Cuttack | Odisha | 20.4625 | 85.8828 | 20.50 | 86.00 | 13.7 | 181 | 0 |
| Dakshina Kannada (Mangaluru) | Karnataka | 12.9141 | 74.8560 | 13.00 | 74.75 | 15.1 | 181 | 0 |
| Darjeeling | West Bengal | 27.0410 | 88.2663 | 27.00 | 88.25 | 4.9 | 181 | 0 |
| Dehradun | Uttarakhand | 30.3165 | 78.0322 | 30.25 | 78.00 | 8.2 | 181 | 0 |
| East Khasi Hills (Cherrapunji/Sohra) | Meghalaya | 25.2986 | 91.7324 | 25.25 | 91.75 | 5.7 | 181 | 0 |
| East Sikkim (Gangtok) | Sikkim | 27.3389 | 88.6065 | 27.25 | 88.50 | 15.4 | 181 | 0 |
| Ernakulam (Kochi) | Kerala | 9.9816 | 76.2999 | 10.00 | 76.25 | 5.9 | 181 | 0 |

*(Remaining 42 districts have 100% 181/181 continuous daily matching)*
