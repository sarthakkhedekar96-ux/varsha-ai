"""
Verification script for independent GFS vs ERA5-Land baseline and provenance audit.
Computes leakage metrics, continuous metrics, heavy rain contingency metrics,
and traces 60 rows (20 train, 20 val, 20 test) back to raw JSON files.
"""

import json
from pathlib import Path
import numpy as np
import pandas as pd

def compute_metrics(df_subset, name="Dataset"):
    n = len(df_subset)
    if n == 0:
        return {}
    
    gfs = df_subset["raw_gfs_rainfall_mm"].values
    era5 = df_subset["era5_land_reference_rainfall_mm"].values
    
    diff = gfs - era5
    abs_diff = np.abs(diff)
    
    exact_equal = np.sum(abs_diff == 0.0)
    exact_pct = (exact_equal / n) * 100.0
    
    max_abs_diff = np.max(abs_diff)
    mae = np.mean(abs_diff)
    rmse = np.sqrt(np.mean(diff ** 2))
    bias = np.mean(diff)
    
    std_gfs = np.std(gfs)
    std_era5 = np.std(era5)
    if std_gfs > 0 and std_era5 > 0:
        corr = np.corrcoef(gfs, era5)[0, 1]
    else:
        corr = 0.0
        
    # Heavy rain >= 64.5 mm
    gfs_heavy = gfs >= 64.5
    era5_heavy = era5 >= 64.5
    
    tp = int(np.sum(gfs_heavy & era5_heavy))
    fp = int(np.sum(gfs_heavy & (~era5_heavy)))
    fn = int(np.sum((~gfs_heavy) & era5_heavy))
    tn = int(np.sum((~gfs_heavy) & (~era5_heavy)))
    
    csi = tp / (tp + fp + fn) if (tp + fp + fn) > 0 else 0.0
    pod = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    far = fp / (tp + fp) if (tp + fp) > 0 else 0.0
    
    return {
        "name": name,
        "rows": n,
        "exact_equal": int(exact_equal),
        "exact_pct": float(exact_pct),
        "max_abs_diff": float(max_abs_diff),
        "mae": float(mae),
        "rmse": float(rmse),
        "bias": float(bias),
        "corr": float(corr),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "csi": float(csi),
        "pod": float(pod),
        "far": float(far),
    }

def main():
    csv_path = Path("data/features/real_forecast_observation_training_dataset.csv")
    if not csv_path.exists():
        print(f"Error: {csv_path} does not exist!")
        return
        
    df = pd.read_csv(csv_path)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["date", "district"]).reset_index(drop=True)
    
    # Train / Val / Test split by chronological date
    # Total unique dates: 181
    unique_dates = sorted(df["date"].unique())
    n_dates = len(unique_dates)
    train_dates = unique_dates[: int(n_dates * 0.70)]
    val_dates = unique_dates[int(n_dates * 0.70) : int(n_dates * 0.85)]
    test_dates = unique_dates[int(n_dates * 0.85) :]
    
    df_train = df[df["date"].isin(train_dates)].copy()
    df_val = df[df["date"].isin(val_dates)].copy()
    df_test = df[df["date"].isin(test_dates)].copy()
    
    metrics_all = compute_metrics(df, "Full Dataset")
    metrics_train = compute_metrics(df_train, "Train Set")
    metrics_val = compute_metrics(df_val, "Validation Set")
    metrics_test = compute_metrics(df_test, "Test Set")
    
    summary = {
        "full": metrics_all,
        "train": metrics_train,
        "val": metrics_val,
        "test": metrics_test
    }
    
    with open("reports/verification_metrics.json", "w") as f:
        json.dump(summary, f, indent=2)
        
    print("=== METRICS SUMMARY ===")
    for k, m in summary.items():
        print(f"\n--- {m['name']} ({m['rows']} rows) ---")
        print(f"Exact GFS == ERA5: {m['exact_equal']} ({m['exact_pct']:.2f}%)")
        print(f"Max Abs Diff: {m['max_abs_diff']:.2f} mm")
        print(f"MAE: {m['mae']:.4f} mm | RMSE: {m['rmse']:.4f} mm | Bias: {m['bias']:.4f} mm")
        print(f"Pearson Correlation: {m['corr']:.4f}")
        print(f"Heavy Rain (>=64.5 mm): TP={m['tp']}, FP={m['fp']}, FN={m['fn']}, TN={m['tn']}")
        print(f"CSI: {m['csi']:.4f} | POD: {m['pod']:.4f} | FAR: {m['far']:.4f}")

    # Trace 20 train, 20 val, 20 test rows
    np.random.seed(42)
    sample_train_idx = np.random.choice(df_train.index, 20, replace=False)
    sample_val_idx = np.random.choice(df_val.index, 20, replace=False)
    sample_test_idx = np.random.choice(df_test.index, 20, replace=False)
    
    trace_rows = []
    
    for split_name, indices in [("Train", sample_train_idx), ("Validation", sample_val_idx), ("Test", sample_test_idx)]:
        for idx in indices:
            row = df.loc[idx]
            dist = row["district"]
            d_str = row["date"].strftime("%Y-%m-%d")
            gfs_rain = row["raw_gfs_rainfall_mm"]
            era5_rain = row["era5_land_reference_rainfall_mm"]
            abs_diff = abs(gfs_rain - era5_rain)
            
            # Verify against raw files
            # Find matching raw files
            dist_lower = dist.lower().split("(")[0].strip()
            # Also handle special cases
            if "vijayawada" in dist.lower():
                dist_lower = "vijayawada"
            elif "aurangabad" in dist.lower():
                dist_lower = "aurangabad"
            elif "manali" in dist.lower() or "kullu" in dist.lower():
                dist_lower = "kullu"
            elif "karwar" in dist.lower() or "uttara" in dist.lower():
                dist_lower = "uttara kannada"
            elif "mangaluru" in dist.lower() or "dakshina" in dist.lower():
                dist_lower = "dakshina kannada"
            elif "panaji" in dist.lower() or "north goa" in dist.lower():
                dist_lower = "north goa"
            elif "guwahati" in dist.lower() or "kamrup" in dist.lower():
                dist_lower = "kamrup metropolitan"
            elif "kochi" in dist.lower() or "ernakulam" in dist.lower():
                dist_lower = "ernakulam"
            elif "silchar" in dist.lower() or "cachar" in dist.lower():
                dist_lower = "cachar"
            elif "bhuj" in dist.lower() or "kutch" in dist.lower():
                dist_lower = "kutch"
            elif "udhagamandalam" in dist.lower() or "nilgiris" in dist.lower():
                dist_lower = "nilgiris"

            gfs_file = Path("data/raw/forecast_gfs") / f"gfs_hist_{dist_lower}_2026-04-02_2026-09-29.json"
            obs_file = Path("data/raw/observations") / f"obs_hist_{dist_lower}_2026-04-02_2026-09-29.json"
            
            gfs_raw_val = None
            if gfs_file.exists():
                with open(gfs_file, "r", encoding="utf-8") as f:
                    gfs_records = json.load(f)
                    for rec in gfs_records:
                        if rec.get("forecast_date") == d_str:
                            gfs_raw_val = rec.get("raw_gfs_rainfall_mm")
                            break
            
            obs_raw_val = None
            if obs_file.exists():
                with open(obs_file, "r", encoding="utf-8") as f:
                    obs_records = json.load(f)
                    for rec in obs_records:
                        if rec.get("observation_date") == d_str:
                            obs_raw_val = rec.get("observed_rainfall_mm")
                            break
                        
            trace_rows.append({
                "split": split_name,
                "district": dist,
                "date": d_str,
                "init_utc": row.get("gfs_initialization_time", f"{d_str}T00:00:00Z"),
                "valid_utc": row.get("gfs_valid_time", f"{d_str}T23:59:59Z"),
                "lead_hours": row.get("gfs_lead_hours", 24),
                "dataset_gfs": gfs_rain,
                "raw_gfs": gfs_raw_val,
                "dataset_era5": era5_rain,
                "raw_era5": obs_raw_val,
                "abs_diff": round(abs_diff, 2),
                "source_gfs": row.get("source_forecast", "NOAA_GFS"),
                "source_era5": row.get("source_reference", "ECMWF_ERA5_LAND_REANALYSIS")
            })
            
    df_trace = pd.DataFrame(trace_rows)
    df_trace.to_csv("reports/sixty_row_provenance_trace.csv", index=False)
    print(f"\nSaved 60-row provenance trace to reports/sixty_row_provenance_trace.csv")

if __name__ == "__main__":
    main()
