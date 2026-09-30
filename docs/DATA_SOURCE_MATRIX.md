# Data Source Matrix & Meteorological Observational Baseline
**Project:** VARSHAAI  
**Document Version:** 2.4.0  

---

## 1. Overview
The VARSHAAI system enforces strict scientific separation between:
1. **Forecast Inputs (NWP / Numerical Weather Guidance)**: Uncalibrated physics model outputs that exhibit systematic spatial, resolution, and terrain biases.
2. **Verification Targets & Training Labels (IMD Ground Truth Observations)**: In-situ rain gauge and calibrated automatic weather station observations provided by the India Meteorological Department.

---

## 2. Comprehensive Data Source Matrix

| Variable | Source | Frequency | Spatial Resolution | Available via Ingestion Layer? | Used For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **District Daily Observed Rainfall** | IMD MAUSAM (`rainfallinformation.php`, `stats_page1-8`) | Daily (24h ending 08:30 IST) | District Level (~700+ districts) | **YES** | Ground-truth verification target & historical lag features |
| **Subdivision-Wise Rainfall** | IMD MAUSAM (`rainfallinformation_msd.php`) | Daily / Weekly | 36 Meteorological Subdivisions | **YES** | Regional synoptic regime boundary calibration |
| **State-Wise Rainfall Summary** | IMD MAUSAM (`rainfallinformation_state.php`) | Daily / Weekly | State Level (36 States/UTs) | **YES** | State-level aggregation and QA checks |
| **Normal (LPA) Rainfall Baseline** | IMD MAUSAM Climatological Records | Daily / Monthly / Seasonal | District Level | **YES** | Rainfall departure percentage computation |
| **Station In-Situ Observations** | IMD MAUSAM (`rainfall_page_station_rainfall.php`) | Daily | AWS / Manual Gauge Stations | **YES** | High-resolution extreme hotspot validation |
| **Raw NWP Precipitation Forecast** | NCUM / GFS Numerical Model Grids | 6-hourly / Daily | 0.125° to 0.25° Grid | **Coupled / Forecast Input** | Baseline forecast input requiring regime-aware ML post-processing |
| **Geographic Coordinates (Lat/Lng)** | Survey of India / District Master | Static | District Centroid | **YES** | Spatial embedding and interpolation |
| **District Mean Elevation** | SRTM 90m Digital Elevation Model | Static | 90-meter grid aggregated to district | **YES** | Orographic slope-aspect and elevation bias correction |
| **Terrain / Geomorphology Classification** | Indian Geomorphological Atlas | Static | Discrete (Orographic, Coastal, Plains, Plateau, Himalayan) | **YES** | Regime categorization and regime-specific model routing |

---

## 3. Strict Scientific Rules
1. **Never substitute observed rainfall for NWP forecast rainfall**: The machine learning model learns the conditional correction transfer function $f(\text{NWP}, \text{Regime}, \text{Terrain}, \text{History}) \to \text{Observed}$. Equating the two destroys physical meaning.
2. **No Data Leakage**: Future rainfall or same-day observations must never be used to predict target day precipitation.
3. **Reproducible Archival**: Every scraped or ingested IMD response is archived with raw byte size, sha256 checksum, and ISO timestamp under `data/raw/imd/`.
