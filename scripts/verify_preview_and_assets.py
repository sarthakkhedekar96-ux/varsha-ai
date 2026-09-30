"""
Preview & Asset Integration Verification Script
"""
import urllib.request
import json
import re

print("=" * 70)
print("FRONTEND PRODUCTION PREVIEW & ASSET INTEGRATION AUDIT")
print("=" * 70)

# 1. Test preview server root
res = urllib.request.urlopen('http://localhost:4173')
html = res.read().decode('utf-8')
print(f"1. Preview Server Root (http://localhost:4173): HTTP {res.getcode()} (HTML bytes: {len(html)})")

# Find JS bundle in HTML
js_match = re.search(r'src="(/assets/index-[^"]+\.js)"', html)
if js_match:
    js_path = js_match.group(1)
    js_url = f"http://localhost:4173{js_path}"
    js_res = urllib.request.urlopen(js_url)
    js_content = js_res.read().decode('utf-8', errors='ignore')
    print(f"   Bundle fetched: {js_path} -> HTTP {js_res.getcode()} (Bytes: {len(js_content)})")
    
    # Check for banner in code
    has_banner = "Historical validation / replay: 2026-04-02 to 2026-09-29" in js_content
    print(f"   Historical Replay Banner present: {has_banner}")
    
    # Check geojson path in bundle
    has_geo_ref = "/geo/india_districts_simplified.geojson" in js_content
    print(f"   GeoJSON route referenced in bundle: {has_geo_ref}")
else:
    print("   WARNING: Could not find main JS bundle tag in HTML")

# 2. Test GeoJSON serving from preview server
geo_url = 'http://localhost:4173/geo/india_districts_simplified.geojson'
geo_res = urllib.request.urlopen(geo_url)
geo_data = json.loads(geo_res.read().decode('utf-8'))
features = geo_data.get('features', [])
print(f"\n2. GeoJSON Asset (http://localhost:4173/geo/india_districts_simplified.geojson):")
print(f"   Status:           HTTP {geo_res.getcode()}")
print(f"   Feature Count:    {len(features)} districts")
print(f"   GeoJSON Type:     {geo_data.get('type')}")

# 3. Test API on port 8002
api_res = urllib.request.urlopen('http://localhost:8002/api/forecast/pune')
pune = json.loads(api_res.read().decode('utf-8'))
print(f"\n3. Live Backend Telemetry (http://localhost:8002/api/forecast/pune):")
print(f"   District:         {pune.get('name')}")
print(f"   Raw GFS:          {pune.get('raw_gfs_rainfall_mm')} mm")
print(f"   VARSHA AI V2:     {pune.get('corrected_rainfall_mm')} mm")
print(f"   Delta:            {pune.get('rainfall_change_mm')} mm")
print(f"   Heavy Rain Prob:  {pune.get('heavy_rain_probability')}")
print("=" * 70)
