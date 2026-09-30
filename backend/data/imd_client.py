"""
IMD MAUSAM Authoritative Data Client
Preserves raw payload with SHA-256 integrity checksums, timestamps, and reproducible file storage.
"""

import os
import sys
import json
import time
import hashlib
import urllib.request
from datetime import datetime

class IMDClient:
    """
    Official India Meteorological Department (IMD) Ingestion Client.
    Portal: https://mausam.imd.gov.in/responsive/rainfallinformation.php
    """
    
    BASE_URL = "https://mausam.imd.gov.in/responsive/"
    
    ENDPOINTS = {
        "all_india": "rainfallinformation.php",
        "state_districts": "rainfallinformation_swd.php",
        "subdivisions": "rainfallinformation_msd.php",
        "states": "rainfallinformation_state.php",
        "station_rainfall": "rainfall_page_station_rainfall.php",
        "stats_page1": "rainfall_statistics.php?PAGE=1",
        "stats_page2": "rainfall_statistics.php?PAGE=2",
        "stats_page3": "rainfall_statistics.php?PAGE=3",
        "stats_page4": "rainfall_statistics.php?PAGE=4",
        "stats_page5": "rainfall_statistics.php?PAGE=5",
        "stats_page6": "rainfall_statistics.php?PAGE=6",
        "stats_page7": "rainfall_statistics.php?PAGE=7",
        "stats_page8": "rainfall_statistics.php?PAGE=8"
    }

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }

    def __init__(self, raw_dir="data/raw/imd"):
        self.raw_dir = raw_dir
        os.makedirs(self.raw_dir, exist_ok=True)

    def fetch_endpoint(self, name: str, timeout: int = 15, retries: int = 3) -> dict:
        """
        Fetches an IMD endpoint, computes sha256 checksum, archives raw HTML/JSON to disk,
        and returns structured response metadata.
        """
        if name not in self.ENDPOINTS:
            raise ValueError(f"Unknown IMD endpoint name: {name}")
            
        url = self.BASE_URL + self.ENDPOINTS[name]
        req = urllib.request.Request(url, headers=self.HEADERS)
        
        for attempt in range(1, retries + 1):
            try:
                print(f"[IMDClient] Fetching {name} (Attempt {attempt}/{retries}): {url}")
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    content_bytes = response.read()
                    content = content_bytes.decode('utf-8', errors='ignore')
                    
                    # Compute sha256 checksum for audit trail
                    sha256_hash = hashlib.sha256(content_bytes).hexdigest()
                    
                    # Timestamped archival filename
                    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = os.path.join(self.raw_dir, f"{name}_{timestamp_str}.html")
                    with open(filename, "w", encoding="utf-8") as f:
                        f.write(content)
                        
                    # Latest snapshot
                    latest_filename = os.path.join(self.raw_dir, f"{name}_latest.html")
                    with open(latest_filename, "w", encoding="utf-8") as f:
                        f.write(content)

                    # Metadata json
                    meta_filename = os.path.join(self.raw_dir, f"{name}_{timestamp_str}_meta.json")
                    meta_info = {
                        "source": "India Meteorological Department (IMD MAUSAM)",
                        "endpoint": name,
                        "url": url,
                        "retrieved_at": datetime.now().isoformat(),
                        "raw_bytes": len(content_bytes),
                        "sha256": sha256_hash,
                        "archived_filepath": filename,
                        "status": "SUCCESS"
                    }
                    with open(meta_filename, "w", encoding="utf-8") as f:
                        json.dump(meta_info, f, indent=2)

                    return {
                        "status": "SUCCESS",
                        "endpoint": name,
                        "url": url,
                        "timestamp": datetime.now().isoformat(),
                        "raw_bytes": len(content),
                        "sha256": sha256_hash,
                        "saved_filepath": filename,
                        "html": content
                    }
            except Exception as e:
                print(f"[IMDClient] Warning on attempt {attempt}: {e}")
                time.sleep(1)
                
        # Stale cache fallback if live portal times out
        latest_filename = os.path.join(self.raw_dir, f"{name}_latest.html")
        if os.path.exists(latest_filename):
            print(f"[IMDClient] Using cached raw snapshot for {name}")
            with open(latest_filename, "r", encoding="utf-8") as f:
                content = f.read()
            return {
                "status": "CACHED_STALE",
                "endpoint": name,
                "url": url,
                "timestamp": datetime.fromtimestamp(os.path.getmtime(latest_filename)).isoformat(),
                "raw_bytes": len(content),
                "saved_filepath": latest_filename,
                "html": content
            }

        return {
            "status": "FAILED",
            "endpoint": name,
            "url": url,
            "timestamp": datetime.now().isoformat(),
            "error": f"Failed to connect to IMD portal after {retries} attempts and no local cache found."
        }

if __name__ == "__main__":
    client = IMDClient()
    res = client.fetch_endpoint("all_india")
    print(f"Status: {res['status']}, Bytes: {res.get('raw_bytes', 0)}")
