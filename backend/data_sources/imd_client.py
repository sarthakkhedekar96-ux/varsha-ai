import os
import sys
import json
import time
import urllib.request
import re
from datetime import datetime

class IMDClient:
    """
    Official India Meteorological Department (IMD) MAUSAM Data Source Ingestion Client.
    Primary Authoritative Source: https://mausam.imd.gov.in/responsive/rainfallinformation.php
    """
    
    BASE_URL = "https://mausam.imd.gov.in/responsive/"
    ENDPOINTS = {
        "all_india": "rainfallinformation.php",
        "state_districts": "rainfallinformation_swd.php",
        "subdivisions": "rainfallinformation_msd.php",
        "states": "rainfallinformation_state.php",
        "station_rainfall": "rainfall_page_station_rainfall.php",
        "stats_page1": "rainfall_statistics.php?PAGE=1",
        "stats_page4": "rainfall_statistics.php?PAGE=4",
        "stats_page5": "rainfall_statistics.php?PAGE=5",
        "stats_page8": "rainfall_statistics.php?PAGE=8"
    }

    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    def __init__(self, raw_dir="data/raw/imd"):
        self.raw_dir = raw_dir
        os.makedirs(self.raw_dir, exist_ok=True)

    def fetch_endpoint(self, name, timeout=20, retries=3):
        if name not in self.ENDPOINTS:
            raise ValueError(f"Unknown IMD endpoint name: {name}")
            
        url = self.BASE_URL + self.ENDPOINTS[name]
        req = urllib.request.Request(url, headers=self.HEADERS)
        
        for attempt in range(1, retries + 1):
            try:
                print(f"[IMDClient] Fetching {name} (Attempt {attempt}/{retries}): {url}")
                with urllib.request.urlopen(req, timeout=timeout) as response:
                    content = response.read().decode('utf-8', errors='ignore')
                    
                    # Archive raw response to file
                    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = os.path.join(self.raw_dir, f"{name}_{timestamp_str}.html")
                    with open(filename, "w", encoding="utf-8") as f:
                        f.write(content)
                        
                    # Also save latest snapshot
                    latest_filename = os.path.join(self.raw_dir, f"{name}_latest.html")
                    with open(latest_filename, "w", encoding="utf-8") as f:
                        f.write(content)

                    return {
                        "status": "SUCCESS",
                        "endpoint": name,
                        "url": url,
                        "timestamp": datetime.now().isoformat(),
                        "raw_bytes": len(content),
                        "saved_filepath": latest_filename,
                        "html": content
                    }
            except Exception as e:
                print(f"[IMDClient] Error fetching {name}: {e}")
                time.sleep(1)
                
        # If network error occurs, check if previous raw snapshot exists
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
            "error": "Failed to connect to IMD portal and no local cache available."
        }

    def extract_country_data_provider(self, html_content):
        """Extract embedded map JSON dataset (latitude, longitude, district, state) from IMD page JS"""
        match = re.search(r'var\s+countrydataprovider\s*=\s*(\{.*?\}|\[.*?\]);', html_content, re.DOTALL)
        if match:
            raw_js = match.group(1)
            # Sanitize JS object to JSON
            sanitized = re.sub(r'([a-zA-Z0-9_]+)\s*:', r'"\1":', raw_js)
            sanitized = re.sub(r':\s*([a-zA-Z0-9_]+)', r': "\1"', sanitized)
            try:
                return json.loads(raw_js)
            except:
                pass
        return None

if __name__ == "__main__":
    client = IMDClient()
    res = client.fetch_endpoint("state_districts")
    print(f"Status: {res['status']}, Bytes: {res.get('raw_bytes', 0)}")
