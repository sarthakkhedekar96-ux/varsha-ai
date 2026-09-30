"""
IMD Real Data Ingestion Manager
Orchestrates network fetches, parsing, and structured dataset assembly for all supported IMD rainfall products.
"""

import os
import sys
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from backend.data.imd_client import IMDClient
from backend.data.imd_parser import IMDParser
from backend.data.imd_schema import COLUMN_NORMALIZATION_MAP
from backend.pipeline.district_master import INDIA_DISTRICT_MASTER, normalize_district_name, get_district_metadata

class IMDIngestionManager:
    """
    Ingests real rainfall observations across multiple spatial and temporal products
    from the official IMD MAUSAM data service.
    """

    def __init__(self, raw_dir="data/raw/imd", processed_dir="data/processed"):
        self.raw_dir = raw_dir
        self.processed_dir = processed_dir
        os.makedirs(self.processed_dir, exist_ok=True)
        
        self.client = IMDClient(raw_dir=self.raw_dir)
        self.parser = IMDParser()

    def fetch_daily_rainfall(self) -> pd.DataFrame:
        """Fetch daily 24-hr observed rainfall dataset from IMD portal."""
        res = self.client.fetch_endpoint("all_india")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            records = self.parser.extract_country_data_provider(res["html"])
            if records:
                df = pd.DataFrame(records)
                df["period_type"] = "DAILY"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_district_rainfall(self) -> pd.DataFrame:
        """Fetch state-wise district rainfall statistics table."""
        res = self.client.fetch_endpoint("state_districts")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "DISTRICT_STATS"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_subdivision_rainfall(self) -> pd.DataFrame:
        """Fetch meteorological subdivision rainfall table."""
        res = self.client.fetch_endpoint("subdivisions")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "SUBDIVISION"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_state_rainfall(self) -> pd.DataFrame:
        """Fetch state-level summary rainfall table."""
        res = self.client.fetch_endpoint("states")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "STATE"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_weekly_rainfall(self) -> pd.DataFrame:
        """Fetch weekly rainfall statistics (PAGE=4)."""
        res = self.client.fetch_endpoint("stats_page4")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "WEEKLY"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_monthly_rainfall(self) -> pd.DataFrame:
        """Fetch monthly rainfall statistics (PAGE=5)."""
        res = self.client.fetch_endpoint("stats_page5")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "MONTHLY"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_cumulative_rainfall(self) -> pd.DataFrame:
        """Fetch seasonal cumulative rainfall statistics (PAGE=8)."""
        res = self.client.fetch_endpoint("stats_page8")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "CUMULATIVE_SEASONAL"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def fetch_station_rainfall(self) -> pd.DataFrame:
        """Fetch station-level in-situ rainfall observations."""
        res = self.client.fetch_endpoint("station_rainfall")
        if res["status"] in ["SUCCESS", "CACHED_STALE"]:
            df = self.parser.parse_stats_page(res["html"])
            if not df.empty:
                df["period_type"] = "STATION"
                df["retrieved_at"] = res.get("timestamp", datetime.now().isoformat())
                return df
        return pd.DataFrame()

    def ingest_all_products(self) -> Dict[str, pd.DataFrame]:
        """Ingest all available products and return dictionary of DataFrames."""
        print("[IMDIngestion] Starting ingestion across all IMD products...")
        results = {}
        
        products = [
            ("daily", self.fetch_daily_rainfall),
            ("district", self.fetch_district_rainfall),
            ("subdivision", self.fetch_subdivision_rainfall),
            ("state", self.fetch_state_rainfall),
            ("weekly", self.fetch_weekly_rainfall),
            ("monthly", self.fetch_monthly_rainfall),
            ("cumulative", self.fetch_cumulative_rainfall),
            ("station", self.fetch_station_rainfall)
        ]

        for name, func in products:
            try:
                df = func()
                results[name] = df
                print(f" - Product '{name}': {len(df)} rows ingested")
            except Exception as e:
                print(f" - Product '{name}' failed: {e}")
                results[name] = pd.DataFrame()

        return results

if __name__ == "__main__":
    manager = IMDIngestionManager()
    res = manager.ingest_all_products()
    for k, v in res.items():
        print(f"Product: {k}, Shape: {v.shape}")
