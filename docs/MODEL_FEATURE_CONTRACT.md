# Model Feature Contract & Specifications
**Project:** VARSHAAI  
**Document Version:** 2.4.0  
**Target:** Regime-Aware Machine Learning & Quantile Post-Processing Models  

---

## 1. Overview
This contract formally specifies the exact input features, derivation rules, expected data types, source classifications, and target variables used by the VARSHAAI Machine Learning Pipeline.

Every feature belongs to one of five strict categories:
- **Category A:** Directly available from IMD observed rainfall data
- **Category B:** Derived from IMD historical observations (with strict shift/no-leakage rules)
- **Category C:** NWP numerical forecast variables
- **Category D:** Static geographical and terrain parameters
- **Category E:** Synoptic regime classification tags

---

## 2. Detailed Feature Contract

### Category A: Direct IMD Observations & Metadata
| Feature Name | Data Type | Nullable | Source | Description |
| :--- | :--- | :--- | :--- | :--- |
| `date` | `string` (`YYYY-MM-DD`) | No | IMD MAUSAM | Observation valid date (08:30 IST 24-hr accumulation period). |
| `district_key` | `string` | No | District Master | Standardized lowercase district identifier (e.g. `pune`, `wayanad`). |
| `district` | `string` | No | IMD / Master | Official district display name. |
| `state` | `string` | No | IMD / Master | Indian state or union territory. |
| `subdivision` | `string` | No | IMD MAUSAM | Official meteorological subdivision (36 subdivisions in India). |
| `observed_rainfall_mm` | `float64` | No | IMD MAUSAM | Actual observed rainfall in millimeters (Target Ground Truth). |
| `normal_rainfall_mm` | `float64` | No | IMD MAUSAM | Long-period average (LPA) climatological baseline rainfall. |
| `rainfall_departure_percent` | `float64` | No | IMD MAUSAM | Percentage departure from LPA: `((observed - normal) / normal) * 100`. |

---

### Category B: Derived Historical Lag & Rolling Features (Strict No-Leakage)
*Rule:* All historical features must be calculated from historical observations preceding the target forecast day.

| Feature Name | Data Type | Calculation Formula | Physical Meaning |
| :--- | :--- | :--- | :--- |
| `previous_1day_rainfall` | `float64` | `df.groupby('district_key')['observed_rainfall_mm'].shift(1).fillna(0.0)` | Antecedent 24h soil saturation index. |
| `previous_3day_rainfall` | `float64` | `df.groupby('district_key')['observed_rainfall_mm'].shift(3).fillna(0.0)` | Short-term multi-day precipitation pulse. |
| `previous_7day_rainfall` | `float64` | `df.groupby('district_key')['observed_rainfall_mm'].shift(7).fillna(0.0)` | Weekly cumulative antecedent rainfall. |
| `rolling_3day_mean` | `float64` | `shift(1).rolling(3, min_periods=1).mean().fillna(0.0)` | 3-day trailing mean rainfall intensity. |
| `rolling_7day_mean` | `float64` | `shift(1).rolling(7, min_periods=1).mean().fillna(0.0)` | 7-day trailing mean rainfall intensity. |
| `day_of_year` | `int32` | `date.timetuple().tm_yday` | Calendar day (1–366) capturing SW/NE monsoon seasonality. |

---

### Category C: NWP Numerical Guidance Variables
| Feature Name | Data Type | Source | Physical Description |
| :--- | :--- | :--- | :--- |
| `raw_nwp_rainfall_mm` | `float64` | NCUM / GFS Numerical Model Grid | Raw uncalibrated numerical model precipitation forecast for the district polygon centroid. |

---

### Category D: Static Geographical & Terrain Metadata
| Feature Name | Data Type | Source | Physical Description |
| :--- | :--- | :--- | :--- |
| `latitude` | `float64` | Survey of India / Master | District centroid latitude (WGS84 decimal degrees). |
| `longitude` | `float64` | Survey of India / Master | District centroid longitude (WGS84 decimal degrees). |
| `elevation` | `float64` | SRTM 90m DEM | Mean elevation above sea level in meters. |
| `terrain` | `string` | Geomorphological Atlas | Terrain category (`Orographic/Ghats`, `Coastal`, `Plains`, `Plateau`, `Himalayan`, `Arid Plains`). |

---

### Category E: Synoptic Weather Regime Labels
| Regime Key | Name | Meteorological Dynamics |
| :--- | :--- | :--- |
| `OROGRAPHIC_RAINFALL` | Orographic / Western Ghats | Strong windward ascent across Western Ghats crest line. |
| `COASTAL_RAINFALL` | Coastal Convergence Zone | Marine boundary layer sea-breeze squall confluence. |
| `MONSOON_LOW` | Monsoon Low Pressure System | Cyclonic vortex steering intense precipitation bands. |
| `DEPRESSION` | Monsoon Depression | Deep cyclonic depression delivering widespread heavy rain. |
| `ACTIVE_MONSOON` | Active Monsoon Trough | Monsoon trough south of normal with strong low-level jet. |
| `BREAK_MONSOON` | Break Monsoon | Trough shifted to Himalayan foothills; plains dryness. |
| `WESTERN_DISTURBANCE` | Western Disturbance | Extra-tropical upper-level trough crossing Western Himalayas. |
| `NORMAL_BACKGROUND` | Background Climatology | Typical seasonal background rainfall without synoptic forcing. |

---

## 3. Target Variables
| Target Name | Type | Definition | Loss Function / Model |
| :--- | :--- | :--- | :--- |
| `observed_rainfall_mm` | Continuous (`float64`) | Actual IMD observed ground truth | Squared Error / HistGradientBoostingRegressor |
| `quantile_p10` | Continuous (`float64`) | 10th percentile lower bound | Pinball Loss (`quantile=0.10`) |
| `quantile_p50` | Continuous (`float64`) | 50th percentile median | Pinball Loss (`quantile=0.50`) |
| `quantile_p90` | Continuous (`float64`) | 90th percentile upper bound | Pinball Loss (`quantile=0.90`) |
| `is_heavy_rain` | Binary (`0` or `1`) | Observed rainfall $\ge 64.5\text{ mm}$ | Log-Loss / HistGradientBoostingClassifier |
| `is_very_heavy_rain` | Binary (`0` or `1`) | Observed rainfall $\ge 115.6\text{ mm}$ | Log-Loss / HistGradientBoostingClassifier |
| `synoptic_regime` | Multi-class | Categorical regime assignment | Multi-class Cross-Entropy |
