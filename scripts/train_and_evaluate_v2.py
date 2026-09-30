"""
VARSHAAI Model V2 Training, Validation, and Scientific Benchmarking.
- Step 2: Dry-Day Bias Analysis on TRAIN & VALIDATION.
- Step 3-5: Two-Stage Architecture (Occurrence Classifier + Rainy Amount Regressor).
- Step 6-9: Heavy Rain Classifier with threshold tuning on VALIDATION only.
- Step 10: Comparison of Global Two-Stage vs Regime-Aware Two-Stage.
- Step 11-15: Final evaluation on held-out TEST, regime-wise and district-wise analysis.
- Preserves all V1 artifacts and saves V2 separately.
"""

import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    confusion_matrix,
    brier_score_loss,
    roc_auc_score,
    precision_recall_curve,
    auc
)

def evaluate_contingency(y_true_binary, y_pred_binary):
    tn, fp, fn, tp = confusion_matrix(y_true_binary, y_pred_binary, labels=[0, 1]).ravel()
    csi = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
    pod = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    far = float(fp / (tp + fp)) if (tp + fp) > 0 else 0.0
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = pod
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    return {
        "tp": int(tp), "fp": int(fp), "fn": int(fn), "tn": int(tn),
        "csi": csi, "pod": pod, "far": far, "precision": precision, "recall": recall, "f1": f1
    }

def main():
    print("==================================================")
    print("VARSHAAI MODEL V2: TWO-STAGE & DRY-DAY CORRECTION")
    print("==================================================")

    # 1. Load validated dataset
    dataset_path = Path("data/features/real_forecast_observation_training_dataset.csv")
    df = pd.read_csv(dataset_path)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["date", "district_key"]).reset_index(drop=True)

    unique_dates = sorted(df["date"].unique())
    n_dates = len(unique_dates)
    train_dates = unique_dates[: int(n_dates * 0.70)]
    val_dates = unique_dates[int(n_dates * 0.70) : int(n_dates * 0.85)]
    test_dates = unique_dates[int(n_dates * 0.85) :]

    train_df = df[df["date"].isin(train_dates)].copy().reset_index(drop=True)
    val_df = df[df["date"].isin(val_dates)].copy().reset_index(drop=True)
    test_df = df[df["date"].isin(test_dates)].copy().reset_index(drop=True)

    print(f"TRAIN: {len(train_df)} | VAL: {len(val_df)} | TEST: {len(test_df)}")

    target_col = "era5_land_reference_rainfall_mm"

    base_features = [
        "raw_gfs_rainfall_mm",
        "previous_1day_rainfall",
        "previous_3day_rainfall",
        "previous_7day_rainfall",
        "rolling_3day_mean",
        "rolling_7day_mean",
        "latitude",
        "longitude",
        "elevation",
        "day_of_year",
        "month"
    ]
    regime_features = base_features + ["regime_encoded"]
    regime_col_idx = regime_features.index("regime_encoded")

    # Load V1 model to inspect dry-day bias on TRAIN and VALIDATION
    v1_model_path = Path("models/regime_aware.joblib")
    if not v1_model_path.exists():
        raise FileNotFoundError("Missing V1 model: models/regime_aware.joblib")
    v1_model = joblib.load(v1_model_path)

    # -------------------------------------------------------------
    # STEP 2 — DRY-DAY BIAS INVESTIGATION (TRAIN + VAL ONLY)
    # -------------------------------------------------------------
    print("\n--- STEP 2: DRY-DAY BIAS ANALYSIS (TRAIN + VAL) ---")
    train_val_df = pd.concat([train_df, val_df], ignore_index=True)
    X_tv_regime = train_val_df[regime_features].values
    y_tv = train_val_df[target_col].values
    gfs_tv = train_val_df["raw_gfs_rainfall_mm"].values
    
    pred_v1_tv = np.maximum(0.0, v1_model.predict(X_tv_regime))
    train_val_df["pred_v1"] = pred_v1_tv

    # Dry observations (target == 0)
    dry_mask = y_tv == 0.0
    rain_mask = y_tv > 0.0
    rain_1mm_mask = y_tv >= 1.0

    n_dry = int(np.sum(dry_mask))
    n_rain = int(np.sum(rain_mask))
    n_rain_1mm = int(np.sum(rain_1mm_mask))

    dry_false_alarm_c = int(np.sum((train_val_df["pred_v1"] > 0.5) & dry_mask))
    dry_false_pct = (dry_false_alarm_c / n_dry) * 100 if n_dry > 0 else 0.0
    avg_pred_on_dry = float(np.mean(train_val_df.loc[dry_mask, "pred_v1"]))
    med_pred_on_dry = float(np.median(train_val_df.loc[dry_mask, "pred_v1"]))
    avg_gfs_on_dry = float(np.mean(train_val_df.loc[dry_mask, "raw_gfs_rainfall_mm"]))

    print(f"Total Train+Val records: {len(train_val_df)}")
    print(f"Dry observations (0 mm): {n_dry} ({n_dry/len(train_val_df)*100:.1f}%)")
    print(f"Wet observations (>0 mm): {n_rain} ({n_rain/len(train_val_df)*100:.1f}%)")
    print(f"Wet observations (>=1 mm): {n_rain_1mm} ({n_rain_1mm/len(train_val_df)*100:.1f}%)")
    print(f"V1 average prediction on dry observations: {avg_pred_on_dry:.2f} mm (Raw GFS: {avg_gfs_on_dry:.2f} mm)")
    print(f"V1 median prediction on dry observations: {med_pred_on_dry:.2f} mm")
    print(f"V1 false light-rain predictions (>0.5mm on dry days): {dry_false_alarm_c} ({dry_false_pct:.1f}%)")

    # Regime-wise breakdown of dry-day overprediction
    regime_names = {
        0: 'NORMAL_BACKGROUND', 1: 'ACTIVE_MONSOON', 2: 'BREAK_MONSOON',
        3: 'MONSOON_LOW', 4: 'DEPRESSION', 5: 'OROGRAPHIC_RAINFALL',
        6: 'COASTAL_RAINFALL', 7: 'WESTERN_DISTURBANCE'
    }
    dry_bias_rows = []
    for code, rname in regime_names.items():
        sub = train_val_df[train_val_df["regime_encoded"] == code]
        sub_dry = sub[sub[target_col] == 0.0]
        n_d = len(sub_dry)
        if n_d > 0:
            avg_pred_d = float(np.mean(sub_dry["pred_v1"]))
            avg_gfs_d = float(np.mean(sub_dry["raw_gfs_rainfall_mm"]))
            fp_d = int(np.sum(sub_dry["pred_v1"] > 0.5))
            dry_bias_rows.append({
                "category": "regime",
                "identifier": rname,
                "total_samples": len(sub),
                "dry_samples": n_d,
                "raw_gfs_avg_on_dry": round(avg_gfs_d, 2),
                "v1_model_avg_on_dry": round(avg_pred_d, 2),
                "false_rain_count": fp_d,
                "false_rain_pct": round((fp_d / n_d) * 100, 1)
            })

    # District-wise breakdown (top 10 worst dry-day bias)
    for dist in sorted(train_val_df["district"].unique()):
        sub = train_val_df[train_val_df["district"] == dist]
        sub_dry = sub[sub[target_col] == 0.0]
        n_d = len(sub_dry)
        if n_d > 0:
            avg_pred_d = float(np.mean(sub_dry["pred_v1"]))
            avg_gfs_d = float(np.mean(sub_dry["raw_gfs_rainfall_mm"]))
            fp_d = int(np.sum(sub_dry["pred_v1"] > 0.5))
            dry_bias_rows.append({
                "category": "district",
                "identifier": dist,
                "total_samples": len(sub),
                "dry_samples": n_d,
                "raw_gfs_avg_on_dry": round(avg_gfs_d, 2),
                "v1_model_avg_on_dry": round(avg_pred_d, 2),
                "false_rain_count": fp_d,
                "false_rain_pct": round((fp_d / n_d) * 100, 1)
            })

    df_dry_bias = pd.DataFrame(dry_bias_rows)
    df_dry_bias.to_csv("reports/dry_day_bias_analysis.csv", index=False)
    print("Saved reports/dry_day_bias_analysis.csv")

    # -------------------------------------------------------------
    # STEP 3-5 — TWO-STAGE MODEL ARCHITECTURE (TRAIN + VAL)
    # -------------------------------------------------------------
    print("\n--- STEP 3-5: TWO-STAGE MODEL TRAINING & TUNING ---")
    # Stage 1: Rain Occurrence (Rain / No-Rain)
    # Threshold for occurrence: target > 0.1 mm (meteorologically measurable rainfall)
    y_train_occur = (train_df[target_col] > 0.1).astype(int)
    y_val_occur = (val_df[target_col] > 0.1).astype(int)

    X_train_regime = train_df[regime_features].values
    X_val_regime = val_df[regime_features].values
    X_test_regime = test_df[regime_features].values

    y_train = train_df[target_col].values
    y_val = val_df[target_col].values
    y_test = test_df[target_col].values

    # Train Occurrence Classifier
    print("Training Stage 1: Rain Occurrence Classifier...")
    occur_clf = HistGradientBoostingClassifier(
        max_iter=150,
        l2_regularization=0.1,
        learning_rate=0.05,
        categorical_features=[regime_col_idx],
        random_state=42
    )
    occur_clf.fit(X_train_regime, y_train_occur)

    val_prob_rain = occur_clf.predict_proba(X_val_regime)[:, 1]
    test_prob_rain = occur_clf.predict_proba(X_test_regime)[:, 1]

    # Stage 2: Rainfall Amount Regressor (Trained only on rainy cases > 0.1 mm)
    print("Training Stage 2: Rainfall Amount Regressor (on wet samples)...")
    rainy_train_idx = np.where(y_train > 0.1)[0]
    X_train_rainy = X_train_regime[rainy_train_idx]
    y_train_rainy = y_train[rainy_train_idx]

    amount_reg = HistGradientBoostingRegressor(
        max_iter=150,
        l2_regularization=0.05,
        learning_rate=0.05,
        categorical_features=[regime_col_idx],
        random_state=42
    )
    amount_reg.fit(X_train_rainy, y_train_rainy)

    val_pred_amount = np.maximum(0.0, amount_reg.predict(X_val_regime))
    test_pred_amount = np.maximum(0.0, amount_reg.predict(X_test_regime))

    # Also train global two-stage model for Step 10 comparison
    print("Training Global (non-regime) Two-Stage model...")
    X_train_base = train_df[base_features].values
    X_val_base = val_df[base_features].values
    X_test_base = test_df[base_features].values

    occur_global = HistGradientBoostingClassifier(max_iter=150, l2_regularization=0.1, learning_rate=0.05, random_state=42)
    occur_global.fit(X_train_base, y_train_occur)
    amount_global = HistGradientBoostingRegressor(max_iter=150, l2_regularization=0.05, learning_rate=0.05, random_state=42)
    amount_global.fit(X_train_base[rainy_train_idx], y_train_rainy)

    # Tuning occurrence gate threshold on VALIDATION ONLY
    print("\n--- TUNING TWO-STAGE GATE THRESHOLD ON VALIDATION ---")
    best_gate_thresh = 0.50
    best_val_mae = float("inf")
    best_val_rmse = float("inf")

    gate_search_results = []
    for tau in [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]:
        # Hard gating: if prob >= tau then amount, else 0.0
        val_pred_gated = np.where(val_prob_rain >= tau, val_pred_amount, 0.0)
        v_rmse = float(np.sqrt(mean_squared_error(y_val, val_pred_gated)))
        v_mae = float(mean_absolute_error(y_val, val_pred_gated))
        v_bias = float(np.mean(val_pred_gated - y_val))
        
        # Check dry-day false rain on validation
        val_dry_mask = y_val == 0.0
        fp_dry = float(np.mean(val_pred_gated[val_dry_mask] > 0.5)) * 100
        
        gate_search_results.append({
            "tau": tau, "rmse": v_rmse, "mae": v_mae, "bias": v_bias, "dry_fp_pct": fp_dry
        })
        print(f"Tau={tau:.2f} | Val RMSE={v_rmse:.4f} | Val MAE={v_mae:.4f} | Bias={v_bias:+.4f} | Dry FP%={fp_dry:.1f}%")

        # Criterion: Select threshold that dramatically cuts dry false alarms while keeping RMSE competitive
        # In validation, tau=0.35 or 0.40 provides excellent balance between RMSE and MAE
        if v_mae < best_val_mae:
            best_val_mae = v_mae
            best_val_rmse = v_rmse
            best_gate_thresh = tau

    print(f"Selected Occurrence Gate Threshold: {best_gate_thresh:.2f} (Val MAE={best_val_mae:.4f}, RMSE={best_val_rmse:.4f})")

    # Compare Global vs Regime-Aware Two-Stage on Validation
    val_pred_global_two_stage = np.where(occur_global.predict_proba(X_val_base)[:, 1] >= best_gate_thresh, np.maximum(0.0, amount_global.predict(X_val_base)), 0.0)
    global_val_rmse = float(np.sqrt(mean_squared_error(y_val, val_pred_global_two_stage)))
    global_val_mae = float(mean_absolute_error(y_val, val_pred_global_two_stage))
    print(f"Validation Comparison: Regime-Aware Two-Stage (RMSE={best_val_rmse:.4f}, MAE={best_val_mae:.4f}) vs Global Two-Stage (RMSE={global_val_rmse:.4f}, MAE={global_val_mae:.4f})")

    # -------------------------------------------------------------
    # STEP 6-9 — HEAVY RAIN CLASSIFIER THRESHOLD TUNING (ON VALIDATION)
    # -------------------------------------------------------------
    print("\n--- STEP 6-9: HEAVY RAIN CLASSIFIER THRESHOLD OPTIMIZATION (VALIDATION ONLY) ---")
    heavy_thresh = 64.5
    y_train_heavy = (train_df[target_col] >= heavy_thresh).astype(int)
    y_val_heavy = (val_df[target_col] >= heavy_thresh).astype(int)
    y_test_heavy = (test_df[target_col] >= heavy_thresh).astype(int)

    n_train_heavy = int(np.sum(y_train_heavy))
    n_val_heavy = int(np.sum(y_val_heavy))
    n_test_heavy = int(np.sum(y_test_heavy))
    print(f"Heavy Rain Events: Train={n_train_heavy} / {len(train_df)}, Val={n_val_heavy} / {len(val_df)}, Test={n_test_heavy} / {len(test_df)}")

    # Class imbalance handling: compute class weight
    weight_neg = len(train_df) / (2 * (len(train_df) - n_train_heavy))
    weight_pos = len(train_df) / (2 * n_train_heavy)
    sample_weights_train = np.where(y_train_heavy == 1, weight_pos, weight_neg)

    v2_heavy_clf = HistGradientBoostingClassifier(
        max_iter=150,
        l2_regularization=0.1,
        learning_rate=0.05,
        categorical_features=[regime_col_idx],
        random_state=42
    )
    v2_heavy_clf.fit(X_train_regime, y_train_heavy, sample_weight=sample_weights_train)

    val_heavy_probs = v2_heavy_clf.predict_proba(X_val_regime)[:, 1]
    test_heavy_probs = v2_heavy_clf.predict_proba(X_test_regime)[:, 1]

    # Evaluate candidate decision thresholds on VALIDATION ONLY
    # In validation, there are 3 positive events (August). We search candidate thresholds:
    print("Evaluating Heavy Rain Decision Thresholds on Validation:")
    best_heavy_threshold = 0.25
    best_val_f1 = -1.0
    best_val_csi = -1.0

    threshold_audit = []
    for cand_t in [0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]:
        val_pred_bin = (val_heavy_probs >= cand_t).astype(int)
        c_res = evaluate_contingency(y_val_heavy, val_pred_bin)
        threshold_audit.append({"cand_threshold": cand_t, **c_res})
        print(f"Prob Thresh={cand_t:.2f} | CSI={c_res['csi']:.4f} | POD={c_res['pod']:.4f} | FAR={c_res['far']:.4f} | F1={c_res['f1']:.4f} (TP={c_res['tp']}, FP={c_res['fp']}, FN={c_res['fn']})")

        # Optimize for CSI / balanced F1
        if c_res["csi"] > best_val_csi or (c_res["csi"] == best_val_csi and c_res["f1"] > best_val_f1):
            best_val_csi = c_res["csi"]
            best_val_f1 = c_res["f1"]
            best_heavy_threshold = cand_t

    # Fallback to balanced 0.20 if all had 0 CSI due to tiny positive sample in val
    if best_val_csi <= 0.0:
        best_heavy_threshold = 0.20
    print(f"Frozen Heavy-Rain Decision Threshold (Selected on Validation): {best_heavy_threshold:.2f}")

    # -------------------------------------------------------------
    # STEP 11 — FINAL TEST SET EVALUATION (TOUCHED EXACTLY ONCE)
    # -------------------------------------------------------------
    print("\n--- FINAL TEST EVALUATION (TOUCHED ONCE) ---")
    raw_gfs_test = test_df["raw_gfs_rainfall_mm"].values
    
    # 1. Raw GFS Baseline
    pred_raw_test = raw_gfs_test
    
    # 2. V1 Regime-Aware Continuous Regressor
    pred_v1_test = np.maximum(0.0, v1_model.predict(X_test_regime))

    # 3. V2 Two-Stage Model
    pred_v2_test = np.where(test_prob_rain >= best_gate_thresh, test_pred_amount, 0.0)

    # 4. Heavy Rain Classifiers
    # Raw GFS heavy rain alert: raw >= 64.5 mm
    raw_heavy_test_bin = (raw_gfs_test >= 64.5).astype(int)
    # V1 heavy rain alert: continuous prediction >= 64.5 mm
    v1_heavy_test_bin = (pred_v1_test >= 64.5).astype(int)
    # V2 heavy rain alert: probability >= best_heavy_threshold
    v2_heavy_test_bin = (test_heavy_probs >= best_heavy_threshold).astype(int)

    def compute_all_metrics(y_true, y_pred, y_true_heavy, y_pred_heavy, name):
        diff = y_pred - y_true
        rmse = float(np.sqrt(np.mean(diff ** 2)))
        mae = float(np.mean(np.abs(diff)))
        bias = float(np.mean(diff))
        corr = float(np.corrcoef(y_true, y_pred)[0, 1]) if np.std(y_true) > 0 and np.std(y_pred) > 0 else 0.0
        c_res = evaluate_contingency(y_true_heavy, y_pred_heavy)
        return {
            "model": name,
            "rmse": rmse,
            "mae": mae,
            "bias": bias,
            "corr": corr,
            **c_res
        }

    m_raw = compute_all_metrics(y_test, pred_raw_test, y_test_heavy, raw_heavy_test_bin, "Raw GFS")
    m_v1 = compute_all_metrics(y_test, pred_v1_test, y_test_heavy, v1_heavy_test_bin, "V1 Regime-Aware")
    m_v2 = compute_all_metrics(y_test, pred_v2_test, y_test_heavy, v2_heavy_test_bin, "V2 Two-Stage")

    test_eval_summary = pd.DataFrame([m_raw, m_v1, m_v2])
    test_eval_summary.to_csv("reports/model_v2_evaluation_results.csv", index=False)
    print("\n--- HELD-OUT TEST SCORECARD ---")
    print(test_eval_summary[["model", "rmse", "mae", "bias", "corr", "csi", "pod", "far"]])

    # -------------------------------------------------------------
    # STEP 13 — DRY-DAY PERFORMANCE ON TEST SET
    # -------------------------------------------------------------
    print("\n--- STEP 13: TEST DRY-DAY COMPARISON ---")
    test_dry_mask = y_test == 0.0
    n_test_dry = int(np.sum(test_dry_mask))

    raw_dry_fp_rate = float(np.mean(pred_raw_test[test_dry_mask] > 0.5)) * 100
    v1_dry_fp_rate = float(np.mean(pred_v1_test[test_dry_mask] > 0.5)) * 100
    v2_dry_fp_rate = float(np.mean(pred_v2_test[test_dry_mask] > 0.5)) * 100

    raw_avg_dry = float(np.mean(pred_raw_test[test_dry_mask]))
    v1_avg_dry = float(np.mean(pred_v1_test[test_dry_mask]))
    v2_avg_dry = float(np.mean(pred_v2_test[test_dry_mask]))

    raw_med_dry = float(np.median(pred_raw_test[test_dry_mask]))
    v1_med_dry = float(np.median(pred_v1_test[test_dry_mask]))
    v2_med_dry = float(np.median(pred_v2_test[test_dry_mask]))

    print(f"Test Dry Days: {n_test_dry} / {len(test_df)} ({n_test_dry/len(test_df)*100:.1f}%)")
    print(f"Raw GFS: False Rain Rate={raw_dry_fp_rate:.1f}%, Mean={raw_avg_dry:.2f} mm, Median={raw_med_dry:.2f} mm")
    print(f"V1:      False Rain Rate={v1_dry_fp_rate:.1f}%, Mean={v1_avg_dry:.2f} mm, Median={v1_med_dry:.2f} mm")
    print(f"V2:      False Rain Rate={v2_dry_fp_rate:.1f}%, Mean={v2_avg_dry:.2f} mm, Median={v2_med_dry:.2f} mm")

    # Probabilistic Heavy Rain metrics on Test
    brier_test = float(brier_score_loss(y_test_heavy, test_heavy_probs))
    roc_auc_test = float(roc_auc_score(y_test_heavy, test_heavy_probs)) if np.sum(y_test_heavy) > 0 else 0.0
    prec_c, rec_c, _ = precision_recall_curve(y_test_heavy, test_heavy_probs)
    pr_auc_test = float(auc(rec_c, prec_c)) if np.sum(y_test_heavy) > 0 else 0.0

    print(f"\nV2 Heavy Rain Classifier on Test: ROC-AUC={roc_auc_test:.4f}, Brier={brier_test:.4f}, PR-AUC={pr_auc_test:.4f}")

    # -------------------------------------------------------------
    # STEP 14 — REGIME-WISE RESULTS ON TEST SET
    # -------------------------------------------------------------
    print("\n--- STEP 14: REGIME-WISE RESULTS (TEST) ---")
    test_df["pred_raw"] = pred_raw_test
    test_df["pred_v1"] = pred_v1_test
    test_df["pred_v2"] = pred_v2_test
    test_df["heavy_pred_bin"] = v2_heavy_test_bin

    regime_v2_rows = []
    for code, rname in regime_names.items():
        sub = test_df[test_df["regime_encoded"] == code]
        n_s = len(sub)
        if n_s == 0:
            continue
        y_s = sub[target_col].values
        gfs_s = sub["pred_raw"].values
        v1_s = sub["pred_v1"].values
        v2_s = sub["pred_v2"].values

        # RMSE
        rmse_raw = float(np.sqrt(np.mean((gfs_s - y_s) ** 2)))
        rmse_v1 = float(np.sqrt(np.mean((v1_s - y_s) ** 2)))
        rmse_v2 = float(np.sqrt(np.mean((v2_s - y_s) ** 2)))

        # MAE
        mae_raw = float(np.mean(np.abs(gfs_s - y_s)))
        mae_v1 = float(np.mean(np.abs(v1_s - y_s)))
        mae_v2 = float(np.mean(np.abs(v2_s - y_s)))

        # Bias
        bias_raw = float(np.mean(gfs_s - y_s))
        bias_v1 = float(np.mean(v1_s - y_s))
        bias_v2 = float(np.mean(v2_s - y_s))

        # Correlation
        corr_raw = float(np.corrcoef(y_s, gfs_s)[0, 1]) if np.std(y_s) > 0 and np.std(gfs_s) > 0 else 0.0
        corr_v1 = float(np.corrcoef(y_s, v1_s)[0, 1]) if np.std(y_s) > 0 and np.std(v1_s) > 0 else 0.0
        corr_v2 = float(np.corrcoef(y_s, v2_s)[0, 1]) if np.std(y_s) > 0 and np.std(v2_s) > 0 else 0.0

        regime_v2_rows.append({
            "regime_code": code,
            "regime_name": rname,
            "sample_count": n_s,
            "raw_rmse": round(rmse_raw, 4),
            "v1_rmse": round(rmse_v1, 4),
            "v2_rmse": round(rmse_v2, 4),
            "v2_rmse_improvement_pct": round(((rmse_raw - rmse_v2) / rmse_raw * 100), 2) if rmse_raw > 0 else 0.0,
            "raw_mae": round(mae_raw, 4),
            "v1_mae": round(mae_v1, 4),
            "v2_mae": round(mae_v2, 4),
            "raw_bias": round(bias_raw, 4),
            "v1_bias": round(bias_v1, 4),
            "v2_bias": round(bias_v2, 4),
            "raw_corr": round(corr_raw, 4),
            "v1_corr": round(corr_v1, 4),
            "v2_corr": round(corr_v2, 4)
        })

    df_regime_v2 = pd.DataFrame(regime_v2_rows)
    df_regime_v2.to_csv("reports/model_v2_regime_wise_results.csv", index=False)
    print(df_regime_v2[["regime_name", "sample_count", "raw_rmse", "v1_rmse", "v2_rmse", "v2_rmse_improvement_pct", "v2_mae"]])

    # -------------------------------------------------------------
    # STEP 15 — DISTRICT-WISE RESULTS ON TEST SET
    # -------------------------------------------------------------
    print("\n--- STEP 15: DISTRICT-WISE RESULTS (TEST) ---")
    districts = sorted(test_df["district"].unique())
    district_v2_rows = []

    for dist in districts:
        sub = test_df[test_df["district"] == dist]
        n_d = len(sub)
        y_d = sub[target_col].values
        gfs_d = sub["pred_raw"].values
        v1_d = sub["pred_v1"].values
        v2_d = sub["pred_v2"].values

        rmse_raw = float(np.sqrt(np.mean((gfs_d - y_d) ** 2)))
        rmse_v1 = float(np.sqrt(np.mean((v1_d - y_d) ** 2)))
        rmse_v2 = float(np.sqrt(np.mean((v2_d - y_d) ** 2)))

        mae_raw = float(np.mean(np.abs(gfs_d - y_d)))
        mae_v1 = float(np.mean(np.abs(v1_d - y_d)))
        mae_v2 = float(np.mean(np.abs(v2_d - y_d)))

        imp_v2 = ((rmse_raw - rmse_v2) / rmse_raw * 100) if rmse_raw > 0 else 0.0

        district_v2_rows.append({
            "district": dist,
            "sample_count": n_d,
            "raw_rmse": round(rmse_raw, 4),
            "v1_rmse": round(rmse_v1, 4),
            "v2_rmse": round(rmse_v2, 4),
            "raw_mae": round(mae_raw, 4),
            "v1_mae": round(mae_v1, 4),
            "v2_mae": round(mae_v2, 4),
            "v2_rmse_improvement_percent": round(imp_v2, 2)
        })

    df_dist_v2 = pd.DataFrame(district_v2_rows)
    df_dist_v2.to_csv("reports/model_v2_district_wise_results.csv", index=False)
    v2_improved = df_dist_v2[df_dist_v2["v2_rmse_improvement_percent"] > 0]
    print(f"Districts with V2 RMSE improvement: {len(v2_improved)} / {len(districts)} ({len(v2_improved)/len(districts)*100:.1f}%)")

    # -------------------------------------------------------------
    # STEP 19 — SAVE V2 MODEL ARTIFACTS SEPARATELY
    # -------------------------------------------------------------
    models_dir = Path("models")
    joblib.dump(occur_clf, models_dir / "v2_occurrence_classifier.joblib")
    joblib.dump(amount_reg, models_dir / "v2_amount_regressor.joblib")
    joblib.dump(v2_heavy_clf, models_dir / "v2_heavy_rain_classifier.joblib")

    v2_metadata = {
        "architecture": "Two-Stage Gated Occurrence + Conditional Amount",
        "gate_threshold": best_gate_thresh,
        "heavy_rain_decision_threshold": best_heavy_threshold,
        "base_features": base_features,
        "regime_features": regime_features,
        "test_results": {
            "raw_gfs": m_raw,
            "v1_regime_aware": m_v1,
            "v2_two_stage": m_v2
        },
        "dry_day_metrics": {
            "test_dry_samples": n_test_dry,
            "raw_false_rain_pct": raw_dry_fp_rate,
            "v1_false_rain_pct": v1_dry_fp_rate,
            "v2_false_rain_pct": v2_dry_fp_rate,
            "v2_avg_on_dry": v2_avg_dry,
            "v2_median_on_dry": v2_med_dry
        },
        "heavy_classifier_metrics": {
            "roc_auc": roc_auc_test,
            "brier_score": brier_test,
            "pr_auc": pr_auc_test
        }
    }
    with open(models_dir / "model_v2_metadata.json", "w") as f:
        json.dump(v2_metadata, f, indent=2)

    print("\nSaved V2 models and metadata to models/v2_*")
    print("V2 TRAINING & EVALUATION COMPLETE!")

if __name__ == "__main__":
    main()
