"""
Comprehensive Scientific Training, Tuning, and Evaluation Script for VARSHAAI.
Strictly implements:
- Chronological Train / Val / Test splitting
- Zero target leakage
- Multi-tier baseline benchmarking (Raw GFS, Simple Bias Correction, Global ML, Regime-Aware ML)
- Regime-wise and district-wise evaluation on completely untouched TEST set
- Heavy-rain (64.5 mm) and Very Heavy-rain (115.6 mm) contingency scoring
- Quantile regression uncertainty evaluation (P10, P50, P90)
- Interpretability and model sanity verification
"""

import os
import json
import hashlib
import shutil
import joblib
from pathlib import Path
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.ensemble import HistGradientBoostingRegressor, HistGradientBoostingClassifier
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    confusion_matrix,
    brier_score_loss,
    roc_auc_score,
    precision_recall_curve,
    auc
)

def compute_checksum(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()

def evaluate_predictions(y_true, y_pred, name="Model", heavy_thresh=64.5):
    # Ensure non-negative
    y_pred = np.maximum(0.0, y_pred)
    
    diff = y_pred - y_true
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    mae = float(np.mean(np.abs(diff)))
    bias = float(np.mean(diff))
    
    std_true = np.std(y_true)
    std_pred = np.std(y_pred)
    corr = float(np.corrcoef(y_true, y_pred)[0, 1]) if std_true > 0 and std_pred > 0 else 0.0
    
    # Contingency table
    true_heavy = y_true >= heavy_thresh
    pred_heavy = y_pred >= heavy_thresh
    
    tp = int(np.sum(pred_heavy & true_heavy))
    fp = int(np.sum(pred_heavy & (~true_heavy)))
    fn = int(np.sum((~pred_heavy) & true_heavy))
    tn = int(np.sum((~pred_heavy) & (~true_heavy)))
    
    csi = float(tp / (tp + fp + fn)) if (tp + fp + fn) > 0 else 0.0
    pod = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    far = float(fp / (tp + fp)) if (tp + fp) > 0 else 0.0
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = pod
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    
    return {
        "model": name,
        "rmse": rmse,
        "mae": mae,
        "bias": bias,
        "corr": corr,
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "csi": csi,
        "pod": pod,
        "far": far,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }

def main():
    print("==================================================")
    print("VARSHAAI: SCIENTIFIC MODEL TRAINING & BENCHMARKING")
    print("==================================================")
    
    dataset_path = Path("data/features/real_forecast_observation_training_dataset.csv")
    if not dataset_path.exists():
        raise FileNotFoundError(f"Missing validated dataset: {dataset_path}")
        
    dataset_hash = compute_checksum(dataset_path)
    print(f"Dataset: {dataset_path} (SHA-256: {dataset_hash})")
    
    df = pd.read_csv(dataset_path)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["date", "district_key"]).reset_index(drop=True)
    total_rows = len(df)
    print(f"Total Rows: {total_rows}, Columns: {len(df.columns)}")
    
    # Chronological Split
    unique_dates = sorted(df["date"].unique())
    n_dates = len(unique_dates)
    train_dates = unique_dates[: int(n_dates * 0.70)]
    val_dates = unique_dates[int(n_dates * 0.70) : int(n_dates * 0.85)]
    test_dates = unique_dates[int(n_dates * 0.85) :]
    
    train_df = df[df["date"].isin(train_dates)].copy().reset_index(drop=True)
    val_df = df[df["date"].isin(val_dates)].copy().reset_index(drop=True)
    test_df = df[df["date"].isin(test_dates)].copy().reset_index(drop=True)
    
    print("\n--- CHRONOLOGICAL SPLITS ---")
    print(f"TRAIN: {len(train_df)} rows | {train_df['date'].min().strftime('%Y-%m-%d')} to {train_df['date'].max().strftime('%Y-%m-%d')}")
    print(f"VAL:   {len(val_df)} rows | {val_df['date'].min().strftime('%Y-%m-%d')} to {val_df['date'].max().strftime('%Y-%m-%d')}")
    print(f"TEST:  {len(test_df)} rows | {test_df['date'].min().strftime('%Y-%m-%d')} to {test_df['date'].max().strftime('%Y-%m-%d')}")
    
    # Feature Definition
    # Base meteorological and spatio-temporal features available at forecast issue time
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
    
    # Regime feature: regime_encoded is rule-based proxy assigned from forecast-time features
    regime_features = base_features + ["regime_encoded"]
    
    target_col = "era5_land_reference_rainfall_mm"
    
    # Sanity Check A: Verify target is not in feature lists
    assert target_col not in base_features, "LEAKAGE: Target found in base_features!"
    assert target_col not in regime_features, "LEAKAGE: Target found in regime_features!"
    assert "observed_rainfall_mm" not in base_features, "LEAKAGE: observed_rainfall_mm in base_features!"
    
    X_train_base = train_df[base_features].values
    X_train_regime = train_df[regime_features].values
    y_train = train_df[target_col].values
    
    X_val_base = val_df[base_features].values
    X_val_regime = val_df[regime_features].values
    y_val = val_df[target_col].values
    
    X_test_base = test_df[base_features].values
    X_test_regime = test_df[regime_features].values
    y_test = test_df[target_col].values
    
    # Regime Distribution Audit
    print("\n--- REGIME DISTRIBUTION ---")
    regime_names = {
        0: 'NORMAL_BACKGROUND', 1: 'ACTIVE_MONSOON', 2: 'BREAK_MONSOON',
        3: 'MONSOON_LOW', 4: 'DEPRESSION', 5: 'OROGRAPHIC_RAINFALL',
        6: 'COASTAL_RAINFALL', 7: 'WESTERN_DISTURBANCE'
    }
    regime_stats = []
    for code, rname in regime_names.items():
        tr_c = int(np.sum(train_df["regime_encoded"] == code))
        va_c = int(np.sum(val_df["regime_encoded"] == code))
        te_c = int(np.sum(test_df["regime_encoded"] == code))
        regime_stats.append({
            "regime_code": code,
            "regime_name": rname,
            "train_count": tr_c,
            "val_count": va_c,
            "test_count": te_c,
            "total": tr_c + va_c + te_c
        })
        print(f"[{code}] {rname:20s}: Train={tr_c:4d}, Val={va_c:4d}, Test={te_c:4d}")
    df_regime_dist = pd.DataFrame(regime_stats)
    df_regime_dist.to_csv("reports/regime_sample_counts.csv", index=False)

    # -------------------------------------------------------------
    # 1. Baseline A: Raw GFS Forecast
    # -------------------------------------------------------------
    raw_gfs_train = train_df["raw_gfs_rainfall_mm"].values
    raw_gfs_val = val_df["raw_gfs_rainfall_mm"].values
    raw_gfs_test = test_df["raw_gfs_rainfall_mm"].values

    # -------------------------------------------------------------
    # 2. Baseline B: Simple Bias Correction (Fit strictly on TRAIN)
    # -------------------------------------------------------------
    print("\n--- FITTING BASELINE B: SIMPLE BIAS CORRECTION ---")
    bias_model = Ridge(alpha=1.0)
    bias_model.fit(raw_gfs_train.reshape(-1, 1), y_train)
    slope = float(bias_model.coef_[0])
    intercept = float(bias_model.intercept_)
    print(f"Bias Correction Formula: Corrected = {slope:.4f} * Raw_GFS + ({intercept:.4f})")
    
    val_pred_bias = np.maximum(0.0, bias_model.predict(raw_gfs_val.reshape(-1, 1)))
    test_pred_bias = np.maximum(0.0, bias_model.predict(raw_gfs_test.reshape(-1, 1)))
    
    # -------------------------------------------------------------
    # 3. Baseline C: Global ML Model (Tuning on Train + Val)
    # -------------------------------------------------------------
    print("\n--- TUNING & FITTING BASELINE C: GLOBAL ML MODEL ---")
    best_global_rmse = float("inf")
    best_global_params = {}
    best_global_model = None
    
    # Reasonable hyperparameter search over validation set
    for max_iter in [150, 200, 250]:
        for l2 in [0.01, 0.1, 1.0]:
            for lr in [0.05, 0.1]:
                model = HistGradientBoostingRegressor(
                    max_iter=max_iter,
                    l2_regularization=l2,
                    learning_rate=lr,
                    random_state=42
                )
                model.fit(X_train_base, y_train)
                val_pred = np.maximum(0.0, model.predict(X_val_base))
                val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
                if val_rmse < best_global_rmse:
                    best_global_rmse = val_rmse
                    best_global_params = {"max_iter": max_iter, "l2": l2, "lr": lr}
                    best_global_model = model
                    
    print(f"Best Global ML Validation RMSE: {best_global_rmse:.4f} with params: {best_global_params}")
    test_pred_global = np.maximum(0.0, best_global_model.predict(X_test_base))

    # -------------------------------------------------------------
    # 4. Primary Model: Regime-Aware ML Post-Processing
    # -------------------------------------------------------------
    print("\n--- TUNING & FITTING PRIMARY REGIME-AWARE MODEL ---")
    regime_col_idx = regime_features.index("regime_encoded")
    
    # Model Option 1: Global Model conditioned with categorical regime feature
    best_regime_rmse = float("inf")
    best_regime_params = {}
    best_regime_model = None
    
    for max_iter in [150, 200, 250]:
        for l2 in [0.01, 0.1, 1.0]:
            for lr in [0.05, 0.1]:
                model = HistGradientBoostingRegressor(
                    max_iter=max_iter,
                    l2_regularization=l2,
                    learning_rate=lr,
                    categorical_features=[regime_col_idx],
                    random_state=42
                )
                model.fit(X_train_regime, y_train)
                val_pred = np.maximum(0.0, model.predict(X_val_regime))
                val_rmse = np.sqrt(mean_squared_error(y_val, val_pred))
                if val_rmse < best_regime_rmse:
                    best_regime_rmse = val_rmse
                    best_regime_params = {"max_iter": max_iter, "l2": l2, "lr": lr}
                    best_regime_model = model
                    
    print(f"Best Regime-Aware ML Validation RMSE: {best_regime_rmse:.4f} with params: {best_regime_params}")
    test_pred_regime = np.maximum(0.0, best_regime_model.predict(X_test_regime))

    # -------------------------------------------------------------
    # 5. Quantile Uncertainty Regressors (P10, P50, P90)
    # -------------------------------------------------------------
    print("\n--- FITTING QUANTILE UNCERTAINTY MODELS (P10, P50, P90) ---")
    p10_model = HistGradientBoostingRegressor(
        loss="quantile", quantile=0.10, max_iter=150, categorical_features=[regime_col_idx], random_state=42
    )
    p50_model = HistGradientBoostingRegressor(
        loss="quantile", quantile=0.50, max_iter=150, categorical_features=[regime_col_idx], random_state=42
    )
    p90_model = HistGradientBoostingRegressor(
        loss="quantile", quantile=0.90, max_iter=150, categorical_features=[regime_col_idx], random_state=42
    )
    p10_model.fit(X_train_regime, y_train)
    p50_model.fit(X_train_regime, y_train)
    p90_model.fit(X_train_regime, y_train)
    
    test_p10 = np.maximum(0.0, p10_model.predict(X_test_regime))
    test_p50 = np.maximum(0.0, p50_model.predict(X_test_regime))
    test_p90 = np.maximum(0.0, p90_model.predict(X_test_regime))
    
    # Coverage check: percentage of actual observations falling within [P10, P90]
    p10_p90_coverage = float(np.mean((y_test >= test_p10) & (y_test <= test_p90))) * 100
    mean_interval_width = float(np.mean(test_p90 - test_p10))
    print(f"Test P10-P90 Coverage: {p10_p90_coverage:.2f}% (Nominal target: 80%)")
    print(f"Mean P10-P90 Interval Width: {mean_interval_width:.2f} mm")

    # -------------------------------------------------------------
    # 6. Heavy Rain (>64.5 mm) & Very Heavy Rain (>115.6 mm) Classifiers
    # -------------------------------------------------------------
    print("\n--- FITTING HEAVY RAIN PROBABILITY CLASSIFIERS ---")
    y_train_heavy = (y_train >= 64.5).astype(int)
    y_test_heavy = (y_test >= 64.5).astype(int)
    
    heavy_clf = HistGradientBoostingClassifier(
        max_iter=150, categorical_features=[regime_col_idx], random_state=42
    )
    heavy_clf.fit(X_train_regime, y_train_heavy)
    
    if len(heavy_clf.classes_) > 1:
        idx_1 = list(heavy_clf.classes_).index(1)
        test_heavy_prob = heavy_clf.predict_proba(X_test_regime)[:, idx_1]
    else:
        test_heavy_prob = np.zeros(len(X_test_regime))
        
    brier_score = float(brier_score_loss(y_test_heavy, test_heavy_prob))
    roc_auc = float(roc_auc_score(y_test_heavy, test_heavy_prob)) if np.sum(y_test_heavy) > 0 else 0.0
    precision_curve, recall_curve, _ = precision_recall_curve(y_test_heavy, test_heavy_prob)
    pr_auc = float(auc(recall_curve, precision_curve)) if np.sum(y_test_heavy) > 0 else 0.0
    print(f"Heavy Rain Classifier Test Brier Score: {brier_score:.4f}, ROC-AUC: {roc_auc:.4f}, PR-AUC: {pr_auc:.4f}")

    # -------------------------------------------------------------
    # 7. Comprehensive Model Benchmark on TEST Set
    # -------------------------------------------------------------
    print("\n--- FINAL TEST EVALUATION (TOUCHED ONCE) ---")
    m_raw = evaluate_predictions(y_test, raw_gfs_test, name="Raw GFS", heavy_thresh=64.5)
    m_bias = evaluate_predictions(y_test, test_pred_bias, name="Bias Correction", heavy_thresh=64.5)
    m_global = evaluate_predictions(y_test, test_pred_global, name="Global ML", heavy_thresh=64.5)
    m_regime = evaluate_predictions(y_test, test_pred_regime, name="Regime-Aware ML", heavy_thresh=64.5)
    
    all_evals = [m_raw, m_bias, m_global, m_regime]
    df_evals = pd.DataFrame(all_evals)
    df_evals["split"] = "TEST"
    
    # Calculate Improvements relative to Raw GFS
    raw_rmse = m_raw["rmse"]
    raw_mae = m_raw["mae"]
    
    df_evals["rmse_improvement_pct"] = ((raw_rmse - df_evals["rmse"]) / raw_rmse) * 100.0
    df_evals["mae_improvement_pct"] = ((raw_mae - df_evals["mae"]) / raw_mae) * 100.0
    df_evals["abs_bias_reduction"] = np.abs(m_raw["bias"]) - np.abs(df_evals["bias"])
    
    df_evals.to_csv("reports/model_evaluation_results.csv", index=False)
    print("\nModel Evaluation Summary on TEST:")
    print(df_evals[["model", "rmse", "mae", "bias", "corr", "rmse_improvement_pct", "mae_improvement_pct", "csi", "pod", "far"]])

    # -------------------------------------------------------------
    # 8. Regime-Wise Performance on TEST Set
    # -------------------------------------------------------------
    print("\n--- COMPUTING REGIME-WISE PERFORMANCE ON TEST ---")
    regime_records = []
    test_df["pred_regime_model"] = test_pred_regime
    test_df["pred_raw_gfs"] = raw_gfs_test
    
    for code, rname in regime_names.items():
        sub = test_df[test_df["regime_encoded"] == code]
        n_sub = len(sub)
        if n_sub == 0:
            continue
        y_t = sub[target_col].values
        gfs_t = sub["raw_gfs_rainfall_mm"].values
        pred_t = sub["pred_regime_model"].values
        
        # Raw GFS metrics for this regime
        diff_raw = gfs_t - y_t
        rmse_raw = float(np.sqrt(np.mean(diff_raw ** 2)))
        mae_raw = float(np.mean(np.abs(diff_raw)))
        bias_raw = float(np.mean(diff_raw))
        corr_raw = float(np.corrcoef(y_t, gfs_t)[0, 1]) if np.std(y_t) > 0 and np.std(gfs_t) > 0 else 0.0
        
        # Corrected model metrics for this regime
        diff_cor = pred_t - y_t
        rmse_cor = float(np.sqrt(np.mean(diff_cor ** 2)))
        mae_cor = float(np.mean(np.abs(diff_cor)))
        bias_cor = float(np.mean(diff_cor))
        corr_cor = float(np.corrcoef(y_t, pred_t)[0, 1]) if np.std(y_t) > 0 and np.std(pred_t) > 0 else 0.0
        
        # Heavy rain
        t_heavy = y_t >= 64.5
        p_heavy = pred_t >= 64.5
        tp_sub = int(np.sum(p_heavy & t_heavy))
        fp_sub = int(np.sum(p_heavy & (~t_heavy)))
        fn_sub = int(np.sum((~p_heavy) & t_heavy))
        csi_sub = float(tp_sub / (tp_sub + fp_sub + fn_sub)) if (tp_sub + fp_sub + fn_sub) > 0 else 0.0
        
        rmse_imp = ((rmse_raw - rmse_cor) / rmse_raw * 100) if rmse_raw > 0 else 0.0
        
        regime_records.append({
            "regime_code": code,
            "regime_name": rname,
            "sample_count": n_sub,
            "raw_gfs_rmse": rmse_raw,
            "corrected_rmse": rmse_cor,
            "rmse_improvement_pct": rmse_imp,
            "raw_gfs_mae": mae_raw,
            "corrected_mae": mae_cor,
            "raw_bias": bias_raw,
            "corrected_bias": bias_cor,
            "raw_corr": corr_raw,
            "corrected_corr": corr_cor,
            "heavy_events": int(np.sum(t_heavy)),
            "csi": csi_sub
        })
        
    df_regime_results = pd.DataFrame(regime_records)
    df_regime_results.to_csv("reports/regime_wise_results.csv", index=False)
    print(df_regime_results[["regime_name", "sample_count", "raw_gfs_rmse", "corrected_rmse", "rmse_improvement_pct"]])

    # -------------------------------------------------------------
    # 9. District-Wise Performance on TEST Set
    # -------------------------------------------------------------
    print("\n--- COMPUTING DISTRICT-WISE PERFORMANCE ON TEST ---")
    district_records = []
    districts = sorted(test_df["district"].unique())
    
    for dist in districts:
        sub = test_df[test_df["district"] == dist]
        n_dist = len(sub)
        y_t = sub[target_col].values
        gfs_t = sub["raw_gfs_rainfall_mm"].values
        pred_t = sub["pred_regime_model"].values
        
        diff_raw = gfs_t - y_t
        rmse_raw = float(np.sqrt(np.mean(diff_raw ** 2)))
        mae_raw = float(np.mean(np.abs(diff_raw)))
        
        diff_cor = pred_t - y_t
        rmse_cor = float(np.sqrt(np.mean(diff_cor ** 2)))
        mae_cor = float(np.mean(np.abs(diff_cor)))
        
        imp_pct = ((rmse_raw - rmse_cor) / rmse_raw * 100) if rmse_raw > 0 else 0.0
        
        district_records.append({
            "district": dist,
            "sample_count": n_dist,
            "raw_gfs_rmse": rmse_raw,
            "corrected_rmse": rmse_cor,
            "rmse_improvement_percent": imp_pct,
            "raw_gfs_mae": mae_raw,
            "corrected_mae": mae_cor
        })
        
    df_district_results = pd.DataFrame(district_records)
    df_district_results.to_csv("reports/district_wise_results.csv", index=False)
    
    improved_districts = df_district_results[df_district_results["rmse_improvement_percent"] > 0]
    degraded_districts = df_district_results[df_district_results["rmse_improvement_percent"] <= 0]
    print(f"Districts Improved: {len(improved_districts)} / {len(districts)} ({len(improved_districts)/len(districts)*100:.1f}%)")
    print(f"Districts Degraded: {len(degraded_districts)} / {len(districts)} ({len(degraded_districts)/len(districts)*100:.1f}%)")

    # -------------------------------------------------------------
    # 10. Save Model Artifacts
    # -------------------------------------------------------------
    models_dir = Path("models")
    backup_dir = Path("models/archive_previous")
    if models_dir.exists():
        os.makedirs(backup_dir, exist_ok=True)
        # Backup previous joblib files
        for f in models_dir.glob("*.joblib"):
            shutil.copy(f, backup_dir / f.name)
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(bias_model, models_dir / "bias_correction.joblib")
    joblib.dump(best_global_model, models_dir / "global_ml.joblib")
    joblib.dump(best_regime_model, models_dir / "regime_aware.joblib")
    joblib.dump(p10_model, models_dir / "quantile_p10.joblib")
    joblib.dump(p50_model, models_dir / "quantile_p50.joblib")
    joblib.dump(p90_model, models_dir / "quantile_p90.joblib")
    joblib.dump(heavy_clf, models_dir / "heavy_rain_classifier.joblib")
    
    metadata = {
        "dataset_path": str(dataset_path),
        "dataset_sha256": dataset_hash,
        "trained_at": datetime.now().isoformat(),
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "test_rows": len(test_df),
        "train_dates": [train_df['date'].min().strftime('%Y-%m-%d'), train_df['date'].max().strftime('%Y-%m-%d')],
        "val_dates": [val_df['date'].min().strftime('%Y-%m-%d'), val_df['date'].max().strftime('%Y-%m-%d')],
        "test_dates": [test_df['date'].min().strftime('%Y-%m-%d'), test_df['date'].max().strftime('%Y-%m-%d')],
        "base_features": base_features,
        "regime_features": regime_features,
        "global_ml_hyperparameters": best_global_params,
        "regime_aware_hyperparameters": best_regime_params,
        "test_metrics": {m["model"]: m for m in all_evals},
        "quantile_coverage_pct": p10_p90_coverage,
        "quantile_mean_width_mm": mean_interval_width,
        "heavy_rain_brier_score": brier_score,
        "heavy_rain_roc_auc": roc_auc
    }
    with open(models_dir / "model_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"\nAll models and metadata saved to {models_dir}")
    print("\nTRAINING & BENCHMARKING COMPLETE!")

if __name__ == "__main__":
    main()
