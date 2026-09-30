"""
IMD Data Quality Auditor & Normalization Report Engine
Audits data completeness, numeric ranges, duplicate rows, missing values, and district normalization confidence.
"""

import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List

from backend.pipeline.district_master import INDIA_DISTRICT_MASTER, normalize_district_name, get_district_metadata

class IMDQualityAuditor:
    """
    Validates canonical rainfall dataset quality and generates automated compliance reports.
    """

    def __init__(self, reports_dir="data/reports"):
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)

    def generate_district_normalization_report(self, raw_district_names: List[str]) -> pd.DataFrame:
        """
        Audit each unique raw district string and log normalization status, alias match, and confidence.
        """
        records = []
        for raw in set(raw_district_names):
            if not raw or pd.isna(raw):
                continue
            
            clean_raw = str(raw).strip()
            norm_key = normalize_district_name(clean_raw)
            
            if norm_key in INDIA_DISTRICT_MASTER:
                meta = INDIA_DISTRICT_MASTER[norm_key]
                method = "EXACT_MATCH" if norm_key == clean_raw.lower() else "ALIAS_FUZZY_MATCH"
                confidence = 100 if method == "EXACT_MATCH" else 95
                status = "RESOLVED"
                state = meta["state"]
                norm_name = meta["name"]
            else:
                method = "UNRESOLVED_PASSTHROUGH"
                confidence = 50
                status = "UNRESOLVED"
                state = "Unknown"
                norm_name = clean_raw.title()

            records.append({
                "original_name": clean_raw,
                "normalized_key": norm_key,
                "normalized_name": norm_name,
                "state": state,
                "normalization_status": status,
                "method": method,
                "confidence_score": confidence,
                "audited_at": datetime.now().isoformat()
            })

        df_report = pd.DataFrame(records).sort_values("original_name").reset_index(drop=True)
        csv_path = os.path.join(self.reports_dir, "district_normalization_report.csv")
        df_report.to_csv(csv_path, index=False)
        print(f"[IMDQuality] Saved district normalization report: {csv_path} ({len(df_report)} records)")
        return df_report

    def audit_dataset(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Runs comprehensive data quality checks on the canonical DataFrame.
        """
        if df.empty:
            return {"status": "FAIL", "reason": "DataFrame is empty"}

        total_rows = len(df)
        cols = list(df.columns)
        
        # Missing values check
        missing_counts = df.isnull().sum().to_dict()
        missing_total = int(df.isnull().sum().sum())
        missing_pct = round((missing_total / (total_rows * len(cols))) * 100, 2)

        # Date range
        date_min = str(df['date'].min()) if 'date' in df.columns else "N/A"
        date_max = str(df['date'].max()) if 'date' in df.columns else "N/A"

        # District & State counts
        unique_districts = int(df['district_key'].nunique()) if 'district_key' in df.columns else int(df['district'].nunique()) if 'district' in df.columns else 0
        unique_states = int(df['state'].nunique()) if 'state' in df.columns else 0

        # Numeric rain stats
        rain_col = 'observed_rainfall_mm' if 'observed_rainfall_mm' in df.columns else 'rainfall_mm'
        if rain_col in df.columns:
            rain_series = pd.to_numeric(df[rain_col], errors='coerce').fillna(0.0)
            zero_rain_count = int((rain_series == 0.0).sum())
            heavy_rain_count = int((rain_series >= 64.5).sum())
            very_heavy_rain_count = int((rain_series >= 115.6).sum())
            extreme_rain_count = int((rain_series >= 204.5).sum())
            min_rain = float(rain_series.min())
            max_rain = float(rain_series.max())
            mean_rain = round(float(rain_series.mean()), 2)
            std_rain = round(float(rain_series.std()), 2)
        else:
            zero_rain_count = heavy_rain_count = very_heavy_rain_count = extreme_rain_count = 0
            min_rain = max_rain = mean_rain = std_rain = 0.0

        # Duplicates check
        dup_count = int(df.duplicated(subset=['date', 'district_key']).sum()) if ('date' in df.columns and 'district_key' in df.columns) else int(df.duplicated().sum())

        # Quality status
        quality_status = "PASS" if missing_pct < 5.0 and dup_count == 0 else "WARN"

        report = {
            "title": "IMD Real-Data Quality & Validation Audit Report",
            "source_name": "India Meteorological Department (IMD MAUSAM)",
            "source_url": "https://mausam.imd.gov.in/responsive/rainfallinformation.php",
            "retrieved_at": datetime.now().isoformat(),
            "data_quality_status": quality_status,
            "total_records": total_rows,
            "total_columns": len(cols),
            "columns_list": cols,
            "date_range_start": date_min,
            "date_range_end": date_max,
            "unique_districts": unique_districts,
            "unique_states": unique_states,
            "missing_values_count": missing_total,
            "missing_values_pct": missing_pct,
            "missing_by_column": missing_counts,
            "duplicate_rows": dup_count,
            "zero_rainfall_count": zero_rain_count,
            "heavy_rainfall_count_gte_64_5mm": heavy_rain_count,
            "very_heavy_rainfall_count_gte_115_6mm": very_heavy_rain_count,
            "extreme_rainfall_count_gte_204_5mm": extreme_rain_count,
            "min_rainfall_mm": min_rain,
            "max_rainfall_mm": max_rain,
            "mean_rainfall_mm": mean_rain,
            "std_rainfall_mm": std_rain
        }

        # Save JSON Report
        json_path = os.path.join(self.reports_dir, "data_quality_report.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        # Save Flat CSV Summary
        summary_rows = [{"metric": k, "value": str(v)} for k, v in report.items() if not isinstance(v, (dict, list))]
        csv_path = os.path.join(self.reports_dir, "data_quality_report.csv")
        pd.DataFrame(summary_rows).to_csv(csv_path, index=False)

        print(f"[IMDQuality] Generated quality reports: {json_path} and {csv_path}")
        return report
