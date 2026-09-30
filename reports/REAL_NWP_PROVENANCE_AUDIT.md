# Forensic NWP Data Provenance Audit

**Project:** VARSHAAI — Regime-Aware AI Rainfall Post-Processing Engine  
**Organization:** Ministry of Earth Sciences (MoES) / NCMRWF  
**Document Version:** 2.5.0 (Forensic Audit Stage)  
**Audit Date:** September 29, 2026  
**Auditor Protocol:** Rigorous Forensic Lineage & Zero-Tolerance Integrity Check  

---

## 1. System-Wide Pipeline Inspection & Component Map

| Component / Subsystem | Repository Path | Exact Functional Mechanism | Real vs Synthetic vs Approximation |
| :--- | :--- | :--- | :--- |
| **NWP Ingestion Client** | `backend/data/forecast_client.py` | Queries Open-Meteo GFS 0.25° Seamless API (`historical-forecast-api.open-meteo.com`) for daily precipitation sum and probability | **REAL NOAA GFS 0.25° NWP guidance** saved in `data/raw/forecast/nwp_hist_{district}_*.json`. |
| **ECMWF Ingestion** | `backend/data/forecast_client.py` | Model name metadata contains `GFS-0.25-ECMWF-IFS`, but only GFS seamless numerical stream is fetched | **GFS ONLY** (ECMWF IFS is not queried or separated as an independent model feature). |
| **IMD Observation Client** | `backend/data/imd_client.py` | HTTP client fetching daily tables from `mausam.imd.gov.in/responsive/rainfallinformation.php` | Real portal requests executed and raw HTML saved to `data/raw/imd/`. |
| **IMD Parser** | `backend/data/imd_parser.py` | Extracts HTML tables and JavaScript country data providers | Operational for live web tables; returns 0 rows on historical archive pages. |
| **Preprocessing & Feature Gen** | `backend/pipeline/preprocessing.py` | Merges GFS raw forecast JSONs with observations and calculates shifted historical lags (`shift(1)`) | **CRITICAL FORENSIC FINDING:** While `raw_forecast_rainfall_mm` is genuine GFS, lines 121–142 generated `observed_rainfall_mm` using parameterized exponential distributions (`rng.exponential(scale=base_rain * seasonality)`). |
| **Spatial Mapping** | `data/processed/forecast_district_mapping.csv` | Nearest grid centroid mapping to 57 Indian district coordinates (`INDIA_DISTRICT_MASTER`) | Nearest centroid (0.25° horizontal grid $\approx 27\text{ km}$). |
| **Model Training** | `backend/pipeline/model_training.py` | Trains `HistGradientBoostingRegressor` and Quantile models ($P_{10}, P_{50}, P_{90}$) conditioned on `regime_encoded` | Retrained on real GFS forecasts vs the preprocessed target. |
| **Verification & REST API** | `backend/api/app.py`, `backend/pipeline/scientific_audit.py` | Evaluates 4-tier baselines on 1,548 out-of-sample test records | Independently audited and verified against stored test matrices. |

---

## 2. Forensic Trace of 20 Randomly Selected Dataset Rows

Below is the forensic lineage trace connecting individual rows in `data/features/forecast_observation_training_dataset.csv` directly to the raw cached GFS forecast JSON files in `data/raw/forecast/`:

```text
========================================================================================
SAMPLE 1:
district: Thiruvananthapuram
observation_date: 2026-04-20
observation_value_mm: 9.6
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_thiruvananthapuram_2026-04-02_2026-09-29.json
issue_time: 2026-04-19 00:00:00
valid_time: 2026-04-20 08:30:00
lead_hours: 24
latitude: 8.5241
longitude: 76.9366
grid_latitude: 8.50
grid_longitude: 77.00
raw_nwp_rainfall_mm: 3.0
final_training_feature_value: 3.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 2:
district: Chennai
observation_date: 2026-08-11
observation_value_mm: 34.2
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_chennai_2026-04-02_2026-09-29.json
issue_time: 2026-08-10 00:00:00
valid_time: 2026-08-11 08:30:00
lead_hours: 24
latitude: 13.0827
longitude: 80.2707
grid_latitude: 13.00
grid_longitude: 80.25
raw_nwp_rainfall_mm: 9.3
final_training_feature_value: 9.3 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 3:
district: East Khasi Hills (Cherrapunji/Sohra)
observation_date: 2026-05-27
observation_value_mm: 6.2
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_east khasi hills_2026-04-02_2026-09-29.json
issue_time: 2026-05-26 00:00:00
valid_time: 2026-05-27 08:30:00
lead_hours: 24
latitude: 25.2986
longitude: 91.7303
grid_latitude: 25.25
grid_longitude: 91.75
raw_nwp_rainfall_mm: 26.7
final_training_feature_value: 26.7 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 4:
district: Nilgiris (Udhagamandalam)
observation_date: 2026-05-18
observation_value_mm: 22.5
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_nilgiris_2026-04-02_2026-09-29.json
issue_time: 2026-05-17 00:00:00
valid_time: 2026-05-18 08:30:00
lead_hours: 24
latitude: 11.4102
longitude: 76.6950
grid_latitude: 11.50
grid_longitude: 76.75
raw_nwp_rainfall_mm: 17.1
final_training_feature_value: 17.1 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 5:
district: Ahmedabad
observation_date: 2026-07-07
observation_value_mm: 34.5
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_ahmedabad_2026-04-02_2026-09-29.json
issue_time: 2026-07-06 00:00:00
valid_time: 2026-07-07 08:30:00
lead_hours: 24
latitude: 23.0225
longitude: 72.5714
grid_latitude: 23.00
grid_longitude: 72.50
raw_nwp_rainfall_mm: 34.3
final_training_feature_value: 34.3 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 6:
district: Cuttack
observation_date: 2026-06-01
observation_value_mm: 4.6
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_cuttack_2026-04-02_2026-09-29.json
issue_time: 2026-05-31 00:00:00
valid_time: 2026-06-01 08:30:00
lead_hours: 24
latitude: 20.4625
longitude: 85.8828
grid_latitude: 20.50
grid_longitude: 86.00
raw_nwp_rainfall_mm: 0.1
final_training_feature_value: 0.1 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 7:
district: Jodhpur
observation_date: 2026-09-09
observation_value_mm: 0.8
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_jodhpur_2026-04-02_2026-09-29.json
issue_time: 2026-09-08 00:00:00
valid_time: 2026-09-09 08:30:00
lead_hours: 24
latitude: 26.2389
longitude: 73.0243
grid_latitude: 26.25
grid_longitude: 73.00
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 8:
district: Hyderabad
observation_date: 2026-05-10
observation_value_mm: 1.8
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_hyderabad_2026-04-02_2026-09-29.json
issue_time: 2026-05-09 00:00:00
valid_time: 2026-05-10 08:30:00
lead_hours: 24
latitude: 17.3850
longitude: 78.4867
grid_latitude: 17.50
grid_longitude: 78.50
raw_nwp_rainfall_mm: 0.2
final_training_feature_value: 0.2 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 9:
district: Varanasi
observation_date: 2026-07-03
observation_value_mm: 5.3
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_varanasi_2026-04-02_2026-09-29.json
issue_time: 2026-07-02 00:00:00
valid_time: 2026-07-03 08:30:00
lead_hours: 24
latitude: 25.3176
longitude: 82.9739
grid_latitude: 25.25
grid_longitude: 83.00
raw_nwp_rainfall_mm: 6.3
final_training_feature_value: 6.3 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 10:
district: Ranchi
observation_date: 2026-09-29
observation_value_mm: 2.0
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_ranchi_2026-04-02_2026-09-29.json
issue_time: 2026-09-28 00:00:00
valid_time: 2026-09-29 08:30:00
lead_hours: 24
latitude: 23.3441
longitude: 85.3096
grid_latitude: 23.25
grid_longitude: 85.25
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 11:
district: Nashik
observation_date: 2026-06-06
observation_value_mm: 1.2
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_nashik_2026-04-02_2026-09-29.json
issue_time: 2026-06-05 00:00:00
valid_time: 2026-06-06 08:30:00
lead_hours: 24
latitude: 19.9975
longitude: 73.7898
grid_latitude: 20.00
grid_longitude: 73.75
raw_nwp_rainfall_mm: 0.1
final_training_feature_value: 0.1 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 12:
district: Ahmedabad
observation_date: 2026-05-05
observation_value_mm: 1.1
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_ahmedabad_2026-04-02_2026-09-29.json
issue_time: 2026-05-04 00:00:00
valid_time: 2026-05-05 08:30:00
lead_hours: 24
latitude: 23.0225
longitude: 72.5714
grid_latitude: 23.00
grid_longitude: 72.50
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 13:
district: Ahmedabad
observation_date: 2026-05-11
observation_value_mm: 1.1
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_ahmedabad_2026-04-02_2026-09-29.json
issue_time: 2026-05-10 00:00:00
valid_time: 2026-05-11 08:30:00
lead_hours: 24
latitude: 23.0225
longitude: 72.5714
grid_latitude: 23.00
grid_longitude: 72.50
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 14:
district: Madurai
observation_date: 2026-07-27
observation_value_mm: 39.3
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_madurai_2026-04-02_2026-09-29.json
issue_time: 2026-07-26 00:00:00
valid_time: 2026-07-27 08:30:00
lead_hours: 24
latitude: 9.9252
longitude: 78.1198
grid_latitude: 10.00
grid_longitude: 78.00
raw_nwp_rainfall_mm: 1.5
final_training_feature_value: 1.5 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 15:
district: Chennai
observation_date: 2026-05-07
observation_value_mm: 0.6
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_chennai_2026-04-02_2026-09-29.json
issue_time: 2026-05-06 00:00:00
valid_time: 2026-05-07 08:30:00
lead_hours: 24
latitude: 13.0827
longitude: 80.2707
grid_latitude: 13.00
grid_longitude: 80.25
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 16:
district: Solapur
observation_date: 2026-06-07
observation_value_mm: 9.3
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_solapur_2026-04-02_2026-09-29.json
issue_time: 2026-06-06 00:00:00
valid_time: 2026-06-07 08:30:00
lead_hours: 24
latitude: 17.6599
longitude: 75.9064
grid_latitude: 17.75
grid_longitude: 76.00
raw_nwp_rainfall_mm: 0.1
final_training_feature_value: 0.1 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 17:
district: Chennai
observation_date: 2026-04-28
observation_value_mm: 0.7
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_chennai_2026-04-02_2026-09-29.json
issue_time: 2026-04-27 00:00:00
valid_time: 2026-04-28 08:30:00
lead_hours: 24
latitude: 13.0827
longitude: 80.2707
grid_latitude: 13.00
grid_longitude: 80.25
raw_nwp_rainfall_mm: 0.0
final_training_feature_value: 0.0 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 18:
district: Ratnagiri
observation_date: 2026-07-26
observation_value_mm: 59.9
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_ratnagiri_2026-04-02_2026-09-29.json
issue_time: 2026-07-25 00:00:00
valid_time: 2026-07-26 08:30:00
lead_hours: 24
latitude: 16.9902
longitude: 73.3120
grid_latitude: 17.00
grid_longitude: 73.25
raw_nwp_rainfall_mm: 33.3
final_training_feature_value: 33.3 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 19:
district: Cachar (Silchar)
observation_date: 2026-07-08
observation_value_mm: 17.7
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_cachar_2026-04-02_2026-09-29.json
issue_time: 2026-07-07 00:00:00
valid_time: 2026-07-08 08:30:00
lead_hours: 24
latitude: 24.8333
longitude: 92.7789
grid_latitude: 24.75
grid_longitude: 92.75
raw_nwp_rainfall_mm: 33.1
final_training_feature_value: 33.1 (Matches raw JSON entry exactly)

========================================================================================
SAMPLE 20:
district: Madurai
observation_date: 2026-06-09
observation_value_mm: 5.3
nwp_model: NOAA-GFS-0.25-SEAMLESS
nwp_source_file: data/raw/forecast/nwp_hist_madurai_2026-04-02_2026-09-29.json
issue_time: 2026-06-08 00:00:00
valid_time: 2026-06-09 08:30:00
lead_hours: 24
latitude: 9.9252
longitude: 78.1198
grid_latitude: 10.00
grid_longitude: 78.00
raw_nwp_rainfall_mm: 0.5
final_training_feature_value: 0.5 (Matches raw JSON entry exactly)
========================================================================================
```

---

## 3. Forensic Conclusion on Data Separation

1. **GFS Numerical Forecasts:** Confirmed **GENUINE**. All 20 sample rows match their raw JSON forecast payloads from the NOAA GFS 0.25° gridded model archive.
2. **Ground Observations:** While live IMD daily scraping works on `all_india_latest.html`, historical daily 180-day observations in `preprocessing.py` were parameterized via `rng.exponential(scale=base_rain * seasonality)`. This uncoupling between real GFS physical runs and synthetic exponential observation targets explains the RMSE divergence ($20.04\text{ mm}$ GFS vs $35.92\text{ mm}$ ML).
