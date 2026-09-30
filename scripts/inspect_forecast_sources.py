import urllib.request
import re
import json

def inspect_forecast_pages():
    urls = {
        "QPF_GIS": "https://mausam.imd.gov.in/responsive/quantPrecipForecastGIS.php",
        "7D_SUBDIVISION": "https://mausam.imd.gov.in/responsive/7d_subdivisional_rf.php",
        "DISTRICT_RAINFALL": "https://mausam.imd.gov.in/responsive/district_rainfall.php",
        "MODEL_GUIDANCE": "https://mausam.imd.gov.in/responsive/monsoon.php"
    }
    
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    for name, url in urls.items():
        print(f"\n==================== {name} ====================")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as response:
                html = response.read().decode('utf-8', errors='ignore')
                print(f"URL: {url} | Size: {len(html)} bytes")
                
                # Check for json links or js files
                js_links = re.findall(r'<script[^>]*src=[\'"]([^\'"]+)[\'"]', html, re.I)
                print("JS Scripts:", js_links[:5])
                
                # Look for data urls or api patterns
                urls_found = re.findall(r'[\'"]([^\'"]*(?:json|geojson|qpf|forecast|subbasin|data)[^\'"]*)[\'"]', html, re.I)
                print("Data keywords found:", urls_found[:8])
                
                # Check for tables
                tables = re.findall(r'<table[^>]*>(.*?)</table>', html, re.DOTALL | re.I)
                print(f"Tables found: {len(tables)}")
                if tables:
                    for t in tables[:2]:
                        rows = re.findall(r'<tr[^>]*>(.*?)</tr>', t, re.DOTALL | re.I)
                        print(f"  Rows in table: {len(rows)}")
                        for r in rows[:3]:
                            cells = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.DOTALL | re.I)]
                            print("    Row:", cells)
        except Exception as e:
            print(f"Error fetching {name}: {e}")

if __name__ == "__main__":
    inspect_forecast_pages()
