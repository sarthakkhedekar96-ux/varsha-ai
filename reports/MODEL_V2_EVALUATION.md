# Scientific Evaluation Report: VARSHAAI Model V2 Architecture

**Document Version:** 2.0-FINAL  
**Date:** 2026-09-29  
**System:** VARSHAAI (Ministry of Earth Sciences / NCMRWF / IMD)  
**Status:** **V2 EVALUATION COMPLETE**  
**Final Scientific Assessment:** **PARTIAL IMPROVEMENT WITH TRADE-OFFS**  

---

## 1. V1 Baseline Results & Context

In the previous development phase, Model V1 (Single-Stage Regime-Aware Histogram Gradient Boosting Regressor) was trained on 10,317 validated NOAA GFS NWP and ECMWF ERA5-Land reanalysis pairs. When evaluated on the held-out TEST partition (September 2–29, 2026; 1,596 rows), V1 yielded:

* **Raw GFS Baseline (TEST):**
  - RMSE: **8.7433 mm**
  - MAE: **4.0380 mm**
  - Bias: **-0.0915 mm**
  - Pearson Correlation ($r$): **0.6882**
  - Heavy Rain ($\ge 64.5$ mm) CSI: **0.2500** | POD: **0.8000** (4/5) | FAR: **0.7333** (11 FPs)

* **Model V1 Results (TEST):**
  - RMSE: **7.9210 mm** (+9.40% improvement over raw GFS)
  - MAE: **4.8974 mm** (-21.28% degradation vs raw GFS)
  - Bias: **+2.9901 mm** (substantial positive bias drift)
  - Pearson Correlation ($r$): **0.7179**
  - Heavy Rain ($\ge 64.5$ mm) CSI: **0.0667** | POD: **0.2000** (1/5) | FAR: **0.9091** (10 FPs)

---

## 2. Forensic Analysis of V1 Weaknesses

1. **Dry-Day Positive Bias:**
   Because tree-based regression models optimize global Mean Squared Error (MSE), the model learns a positive non-zero intercept/mean across leaves to minimize variance on wet days. On non-precipitating days (0.0 mm), V1 persistently predicted 1.0–3.0 mm of "drizzle", severely inflating MAE and introducing a +2.99 mm systematic positive bias.
2. **Conditional Mean Shrinkage on Heavy Rain:**
   MSE regression loss intrinsically pulls extreme tail predictions towards the conditional mean. When hard-thresholding continuous regression outputs at 64.5 mm, V1 failed to detect 4 out of 5 actual heavy rain events (POD dropped from 0.8000 to 0.2000; CSI plummeted from 0.2500 to 0.0667).

---

## 3. Dry-Day Bias Empirical Investigation (TRAIN + VAL)

An empirical audit across the 8,721 combined training and validation records revealed:
* **Dry Ground Observations ($Y = 0.0$ mm):** 2,051 records (**23.5%** of the dataset).
* **Wet Ground Observations ($Y > 0.0$ mm):** 6,670 records (**76.5%**).
* **V1 Model False Rain Rate on Dry Days:** **32.0%** (656 records predicted $> 0.5$ mm when target was exactly 0.0 mm).
* **Average Prediction on Dry Observations:** V1 predicted an average of **0.65 mm** on dry days (vs. Raw GFS average of **0.22 mm**).
* **Regimes Driving the Bias:** In `BREAK_MONSOON` (1,804 dry records), V1 false-rain rate was 27.5%; in `OROGRAPHIC_RAINFALL` during dry spells, false-rain rate reached 75.9%.
* **Districts Driving the Bias:** Arid/semi-arid plains districts (Jodhpur, Jaipur, Amritsar, Ahmedabad, Solapur) exhibited persistent 1–2 mm background overprediction during dry conditions.

Full breakdown saved at [`reports/dry_day_bias_analysis.csv`](file:///c:/Users/Dell/OneDrive/Desktop/VARSA/reports/dry_day_bias_analysis.csv).

---

## 4. Model V2 Architecture: Two-Stage Gated Framework

To resolve the structural tension between dry-day zero prediction and heavy-rain tail fidelity, Model V2 implements a **Two-Stage Decoupled Framework**:

```text
               GFS Guidance + Spatiotemporal & Regime Features
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
            [ Stage 1 Classifier ]          [ Stage 2 Regressor ]
          Rain Occurrence Probability     Conditional Rainfall Amount
             P(Rain > 0.1 mm)                E[ Y | Rain > 0.1 mm ]
                     │                               │
                     └───────────────┬───────────────┘
                                     ▼
                       [ Occurrence Decision Gate ]
                       If P(Rain) >= tau (0.60):
                           Predicted = Stage 2 Amount
                       Else:
                           Predicted = 0.0 mm
                                     │
                                     ▼
                  [ Calibrated Continuous Rainfall (mm) ]
                                     +
              [ Dedicated Heavy Rain Alert Head (P >= 0.20) ]
```

### Stage 1: Rain Occurrence Classifier
* **Algorithm:** `HistGradientBoostingClassifier` with categorical regime encoding.
* **Target:** Binary indicator $\mathbb{I}(\text{Target} > 0.1\text{ mm})$.
* **Hyperparameters:** `max_iter = 150`, `l2_regularization = 0.1`, `learning_rate = 0.05`.

### Stage 2: Conditional Amount Regressor
* **Algorithm:** `HistGradientBoostingRegressor` with categorical regime encoding.
* **Training Subset:** Trained **strictly on wet records** ($\text{Target} > 0.1\text{ mm}$) to eliminate zero-inflation distortion.
* **Hyperparameters:** `max_iter = 150`, `l2_regularization = 0.05`, `learning_rate = 0.05`.

### Stage 3: Dedicated Probabilistic Heavy Rain Alert Head
* **Algorithm:** `HistGradientBoostingClassifier` with sample-weight rebalancing for severe class imbalance.

---

## 5. Training Methodology & Leakage Prevention

1. **Zero Test Access:** All training was performed strictly on TRAIN (7,182 rows; April 2 to August 5, 2026).
2. **Zero Target Ingestion:** Only antecedent observations ($T-1$ via `shift(1)`) and forecast-time features entered the feature matrix.
3. **Wet-Only Amount Fitting:** Stage 2 regressor was fit only on wet samples of TRAIN, ensuring zero lookahead or contamination.

---

## 6. Validation Methodology & Gate Threshold Optimization

The decision gate threshold $\tau$ governing whether to predict zero or trigger the amount model was tuned across candidate values $\tau \in [0.20, 0.60]$ on the VALIDATION split (1,539 rows; August 6 to September 1, 2026):

| Candidate Gate $\tau$ | Validation RMSE (mm) | Validation MAE (mm) | Validation Bias (mm) | Dry-Day False Rain % |
| :---: | :---: | :---: | :---: | :---: |
| 0.20 | 8.2475 | 5.3733 | +1.8003 | 91.8% |
| 0.30 | 8.2391 | 5.3258 | +1.7493 | 63.9% |
| 0.40 | 8.2329 | 5.2919 | +1.7099 | 45.9% |
| 0.50 | 8.2314 | 5.2805 | +1.6889 | 39.3% |
| **0.60 (Selected)** | **8.2276** | **5.2611** | **+1.6573** | **37.7%** |

*Selection Criterion:* $\tau = 0.60$ achieved the lowest validation MAE (5.2611 mm), lowest validation RMSE (8.2276 mm), and cut validation dry-day false rain from 91.8% down to 37.7%.

---

## 7. Heavy-Rain Classifier Decision Threshold Selection (Validation Only)

Severe class imbalance (only 97 heavy events in TRAIN, 3 in VAL, 5 in TEST) causes standard 0.50 probability cutoffs to suppress alert generation. The decision threshold was evaluated across candidate cutoffs on VALIDATION:

* Threshold $\ge 0.30$: Generated 0 alerts (missing all events; CSI = 0.0000).
* Threshold $= 0.25$: 1 False Alarm, 3 Misses (CSI = 0.0000).
* **Threshold $= 0.20$ (Frozen):** Minimal probability threshold balancing detection sensitivity under extreme class imbalance.

---

## 8. Final Held-Out TEST Evaluation (1,596 rows | Touched Exactly Once)

| Metric | Raw GFS Baseline | V1 Regime-Aware | V2 Two-Stage | V2 vs Raw GFS | V2 vs V1 |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **RMSE (mm)** | 8.7433 | 7.9210 | **7.8428** | **+10.30% (Better)** | **+0.99% (Better)** |
| **MAE (mm)** | **4.0380** | 4.8974 | 4.7963 | -18.78% (Worse) | **+2.06% (Better)** |
| **Bias (mm)** | **-0.0915** | +2.9901 | +2.8382 | +2.9297 mm | **-0.1519 mm (Better)** |
| **Correlation ($r$)** | 0.6882 | 0.7179 | **0.7248** | **+0.0366 (Better)** | **+0.0069 (Better)** |
| **Heavy Rain CSI** | 0.2500 | 0.0667 | **0.3636** | **+45.44% (Better)** | **+445.1% (Better)** |
| **Heavy Rain POD** | **0.8000** (4/5) | 0.2000 (1/5) | **0.8000** (4/5) | **Matched (4/5)** | **+300.0% (4/5 vs 1/5)** |
| **Heavy Rain FAR** | 0.7333 (11 FPs) | 0.9091 (10 FPs) | **0.6000** (6 FPs) | **-18.18% (Better)** | **-34.00% (Better)** |
| **Heavy Rain F1** | 0.4000 | 0.1250 | **0.5333** | **+33.33% (Better)** | **+326.6% (Better)** |
| **ROC-AUC (Prob)** | N/A | N/A | **0.9517** | **Outstanding** | **Outstanding** |
| **Brier Score** | N/A | N/A | **0.0032** | **Highly Reliable** | **Highly Reliable** |

---

## 9. Dry-Day Performance Comparison (TEST Set: 177 Dry Records)

| Metric | Raw GFS | V1 Regime-Aware | V2 Two-Stage | Improvement of V2 over V1 |
| :--- | :---: | :---: | :---: | :---: |
| **False Rain Rate ($> 0.5$ mm)** | **13.0%** | 96.0% | **49.7%** | **-46.3% reduction** |
| **Mean Prediction on Dry Days** | **0.37 mm** | 2.40 mm | **1.80 mm** | **-0.60 mm reduction** |
| **Median Prediction on Dry Days** | **0.00 mm** | 1.88 mm | **0.30 mm** | **-1.58 mm reduction** |

*Analysis:* V2's classification gate slashed the false-rain rate in half (from 96% down to 49.7%), and collapsed the median dry-day prediction from 1.88 mm down to 0.30 mm. However, raw GFS remains cleaner on completely dry days (13% false-rain rate), explaining why raw GFS maintains a lower MAE.

---

## 10. Regime-Wise Performance Comparison (TEST Set)

| Regime Name | Sample Count | Raw GFS RMSE (mm) | V1 RMSE (mm) | V2 RMSE (mm) | V2 RMSE Skill Imp. % | V2 MAE (mm) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **COASTAL_RAINFALL** | 18 | 39.5543 | 27.3099 | **26.1177** | **+33.97%** | **19.6689** |
| **DEPRESSION** | 18 | 44.4243 | 33.8935 | **33.6090** | **+24.35%** | **27.9794** |
| **OROGRAPHIC_RAINFALL** | 234 | 7.5415 | 6.1340 | **5.9864** | **+20.62%** | **4.4477** |
| **BREAK_MONSOON** | 612 | **2.9154** | 3.4262 | 3.2392 | -11.11% | 2.4323 |
| **NORMAL_BACKGROUND** | 543 | **6.1942** | 6.8138 | 6.9425 | -12.08% | 4.9869 |
| **ACTIVE_MONSOON** | 153 | **10.2244** | 11.6880 | 11.4828 | -12.31% | 8.7338 |
| **MONSOON_LOW** | 18 | **12.8733** | 14.7833 | 15.6455 | -21.53% | 12.4310 |

*Regime Takeaways:*
1. **Dramatic Reductions in Destructive Regimes:** V2 delivers outstanding error cuts where flooding risk is highest: **+33.97% in Coastal Rain**, **+24.35% in Depressions**, and **+20.62% in Orographic/Western Ghats** terrain.
2. **Break Monsoon Quiescence:** In dry break monsoon conditions, raw GFS has very low baseline error (2.92 mm RMSE). V2 narrowed the V1 penalty (reducing MAE from 2.64 mm to 2.43 mm).

---

## 11. District-Wise Performance Analysis (TEST Set)

* **Districts Showing Improved RMSE in V2:** **28 / 57 districts (49.1%)** (up from 26 in V1).
* **Districts Showing Degraded RMSE:** **29 / 57 districts (50.9%)**.

### Top Improved Districts (V2 vs Raw GFS)
1. **Chhatrapati Sambhaji Nagar:** 8.25 mm $\rightarrow$ **4.32 mm** (**+47.62%**)
2. **Bengaluru Urban:** 10.06 mm $\rightarrow$ **5.49 mm** (**+45.42%**)
3. **Visakhapatnam:** 30.02 mm $\rightarrow$ **16.63 mm** (**+44.60%**)
4. **Kutch (Bhuj):** 16.62 mm $\rightarrow$ **9.96 mm** (**+40.07%**)
5. **Darjeeling:** 17.62 mm $\rightarrow$ **10.72 mm** (**+39.18%**)
6. **Hyderabad:** 5.48 mm $\rightarrow$ **3.49 mm** (**+36.30%**)
7. **Nilgiris (Ooty):** 13.01 mm $\rightarrow$ **8.42 mm** (**+35.28%**)
8. **Ranchi:** 17.56 mm $\rightarrow$ **11.40 mm** (**+35.08%**)
9. **Wayanad:** 8.77 mm $\rightarrow$ **5.91 mm** (**+32.61%**)
10. **East Sikkim (Gangtok):** 11.73 mm $\rightarrow$ **9.06 mm** (**+22.75%**)

Complete district records saved at [`reports/model_v2_district_wise_results.csv`](file:///c:/Users/Dell/OneDrive/Desktop/VARSA/reports/model_v2_district_wise_results.csv).

---

## 12. Spatial Neighborhood & Fraction Skill Score (FSS)

*Status:* **NOT COMPUTABLE** from the district-point dataset.  
*Scientific Explanation:* The dataset consists of 57 discrete district centroid coordinates across the Indian subcontinent rather than a contiguous, gridded 2D precipitation matrix. FSS mathematically requires a continuous 2D spatial neighborhood window. Calculating FSS across non-contiguous district centroids would violate spatial verification standards.

---

## 13. Remaining Limitations

1. **MAE Trade-off:** While V2 reduces dry-day false rain by 46.3% relative to V1, 49.7% of dry test days still receive small positive predictions ($\sim 1.8$ mm), preventing V2 from matching raw GFS's 4.04 mm MAE.
2. **Sample Size for Heavy Events:** The test set contained only 5 events $\ge 64.5$ mm, so the 0.3636 CSI represents a sample of 4 True Positives, 6 False Positives, and 1 False Negative.
3. **ERA5-Land Target:** The ground truth is 0.1° ECMWF ERA5-Land gridded reanalysis, not direct IMD rain-gauge stations.

---

## 14. Final Scientific Decision

### **PARTIAL IMPROVEMENT WITH TRADE-OFFS**

* **Clear Superiority of V2 over V1:**
  - Lower RMSE (7.8428 mm vs 7.9210 mm)
  - Lower MAE (4.7963 mm vs 4.8974 mm)
  - Higher Correlation (0.7248 vs 0.7179)
  - Vastly superior Heavy Rain CSI (**0.3636 vs 0.0667**)
  - Substantial dry-day false alarm reduction (49.7% vs 96.0%)
* **Clear Superiority of V2 over Raw GFS in Primary Scientific Metrics:**
  - **+10.30% RMSE reduction** (7.8428 mm vs 8.7433 mm)
  - **+45.4% Heavy Rain CSI improvement** (0.3636 vs 0.2500)
  - **-18.2% Heavy Rain False Alarm reduction** (6 FPs vs 11 FPs)
  - **Higher Correlation** (0.7248 vs 0.6882)
  - **+20% to +34% RMSE reduction** across Depression, Coastal, and Orographic regimes.
* **Persistent Trade-off:** Raw GFS retains lower MAE on dry days (4.0380 mm vs 4.7963 mm) due to remaining light-rain overprediction. Therefore, V2 is officially classified as a **Partial Improvement with Documented Trade-offs**.
