# VARSHAAI — Forensic Data Audit Report
## Feature #4: Multi-Cycle Forecast Initialization & Progression Audit

**Document ID:** `VARSHAAI-REP-CYCLE-AUDIT-004`  
**Date:** 2026-09-29  
**Status:** AUDIT COMPLETED & SCIENTIFICALLY CONCLUDED  
**Audit Finding:** **MULTI-CYCLE INITIALIZATION DATA NOT VERIFIED (DECISION: PATH B)**

---

### Executive Summary

A forensic audit of the VARSHAAI V2 forecast data pipeline, ingestion client (`backend/data/forecast_client.py`), preprocessing pipeline (`backend/pipeline/preprocessing.py`), raw GFS cache archives (`data/raw/forecast_gfs/`), and the upstream Open-Meteo GFS API endpoint was performed to evaluate whether independent sub-daily forecast initialization cycles ($00\text{Z}, 06\text{Z}, 12\text{Z}, 18\text{Z}$) exist for the same target valid period.

The audit conclusively established that:
1. The validated forecast source uses Open-Meteo's `gfs_seamless` historical endpoint (`https://historical-forecast-api.open-meteo.com/v1/forecast?models=gfs_seamless`).
2. Upstream Open-Meteo historical responses provide only a single seamless daily accumulation per date (`daily.precipitation_sum`); they do not provide sub-daily initialization cycle metadata.
3. Initialization timestamps (`00:00:00 UTC`), valid times (`03:00:00 UTC / 08:30 IST`), and lead time (`24 hours`) recorded in the dataset are **application-assigned operational mapping metadata**, not upstream source-provided cycle headers.
4. Independent $00\text{Z}, 06\text{Z}, 12\text{Z}, 18\text{Z}$ runs targeting the identical forecast window cannot be retrieved from the validated historical lineage.
5. In adherence to strict scientific integrity rules, VARSHAAI **rejects data fabrication, artificial perturbation, and synthetic cycle generation**. Consequently, **PATH B** (Safe Fallback Progression & Lineage Disclosure) is selected.

---

### Detailed Forensic Audit Questions (1–13)

#### 1. What GFS model is being used?
- **Model:** NOAA NCEP Global Forecast System (GFS) 0.25° horizontal resolution numerical atmospheric prediction model.

#### 2. What endpoint is being used?
- **Base Endpoint:** `https://historical-forecast-api.open-meteo.com/v1/forecast`
- **Full Query String Template:**
  ```text
  https://historical-forecast-api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&start_date={start}&end_date={end}&daily=precipitation_sum,precipitation_probability_max&models=gfs_seamless&timezone=Asia%2FKolkata
  ```

#### 3. What model parameter is being passed?
- `models=gfs_seamless`

#### 4. Is `models=gfs_seamless` still being used?
- **Yes.** Confirmed in `backend/data/forecast_client.py` line 58 and `backend/api/app.py` line 629. This parameter was introduced to ensure genuine physical divergence from ERA5-Land reanalysis.

#### 5. What forecast initialization/run information is actually supplied by the upstream source?
- **None.** The raw JSON payload returned by the upstream Open-Meteo server contains exclusively:
  ```json
  {
    "latitude": 18.568176,
    "longitude": 73.828125,
    "generationtime_ms": 0.129,
    "utc_offset_seconds": 19800,
    "timezone": "Asia/Kolkata",
    "timezone_abbreviation": "GMT+5:30",
    "elevation": 561.0,
    "daily_units": {
      "time": "iso8601",
      "precipitation_sum": "mm"
    },
    "daily": {
      "time": ["2026-09-28", "2026-09-29"],
      "precipitation_sum": [2.7, 2.2]
    }
  }
  ```
  There is zero initialization cycle metadata (no cycle identifiers, no run hour stamps, no initialization dates).

#### 6. What valid time is supplied?
- Upstream provides calendar dates (`YYYY-MM-DD`) mapped to `timezone=Asia/Kolkata`. No explicit accumulation boundary timestamps (e.g. `08:30 IST`) are provided in the raw payload.

#### 7. What lead time is supplied?
- **None.** The upstream API does not provide a `lead_hours` or `lead_time` field in historical mode.

#### 8. Is initialization time source-provided or application-assigned?
- **Application-assigned.**
- Evidence from `backend/pipeline/preprocessing.py` (lines 190–199):
  ```python
  issue_time = (obs_date - timedelta(days=1)).strftime("%Y-%m-%d 00:00:00")
  valid_time = obs_date.strftime("%Y-%m-%d 08:30:00")
  record = {
      "forecast_issue_time": issue_time,
      "forecast_valid_time": valid_time,
      "lead_time_hours": 24,
      "gfs_initialization_time": issue_time,
      "gfs_valid_time": valid_time,
      "gfs_lead_hours": 24,
      ...
  }
  ```
- Evidence from `backend/data/forecast_client.py` (lines 79–81):
  ```python
  "initialization_time_utc": f"{t}T00:00:00Z",
  "valid_time_utc": f"{t}T03:00:00Z",
  "lead_hours": 24,
  ```
- This confirms that nominal `00Z` and `24h` lead time are application-level operational conventions, not upstream NOAA metadata.

#### 9. Are multiple historical initialization cycles actually available?
- **No.** Open-Meteo's `gfs_seamless` model compiles a single unified time-series per district. It does not maintain or serve historical archives of separate runs ($00\text{Z}, 06\text{Z}, 12\text{Z}, 18\text{Z}$) for past dates.

#### 10. Can 00Z, 06Z, 12Z and 18Z be retrieved independently?
- **No.** Empirical test requests passing cycle parameters (e.g. `&cycle=00`, `&run=06Z`) confirm that the Open-Meteo historical forecast API ignores cycle parameters and returns the exact same seamless time-series.

#### 11. Can those cycles be matched to the SAME target valid period?
- **No.** Because separate initialization cycles do not exist in the archive, multi-cycle alignment against a single valid day is mathematically impossible without fabricating data.

#### 12. Are those cycles genuinely different forecasts or merely retrospective/reconstructed values?
- Distinct cycles do not exist. Any synthetic generation of $00\text{Z}, 06\text{Z}, 12\text{Z}, 18\text{Z}$ differences would be artificial noise or synthetic interpolation, directly violating project rules.

#### 13. Does the existing data contain enough information to construct a scientifically valid cycle comparison?
- **No.** The existing lineage lacks verified multiple initialization cycles for common valid times.

---

### Decision Gate Determination

Based on the forensic audit findings, **PATH A is scientifically rejected** and **PATH B is selected**:

> **PATH B (SELECTED):**  
> *"Multi-cycle comparison was not enabled because independently verified multiple forecast initialization cycles for a common target valid time were not available in the validated lineage."*

A transparent, scientifically honest **Forecast Evolution & Lineage Panel** will be implemented to present:
1. Authoritative GFS forecast source and endpoint parameters.
2. Current documented 24-hour operational forecast window.
3. Explicit distinction between upstream source-provided data (`daily.precipitation_sum`) and application-assigned metadata (`nominal 00Z initialization`, `lead_hours = 24`).
4. Formal disclosure explaining why multi-cycle comparison is deferred rather than simulated or fabricated.
