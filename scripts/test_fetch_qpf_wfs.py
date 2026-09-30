import urllib.request
import json
import re

url = "https://reactjs.imd.gov.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=imd:indian_river_basin&srsname=EPSG:4326&outputFormat=application/json"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

print("Fetching IMD QPF GeoServer WFS Layer...")
try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as res:
        content = res.read().decode('utf-8', errors='ignore')
        print(f"Response size: {len(content)} bytes")
        data = json.loads(content)
        features = data.get("features", [])
        print(f"Total river sub-basin features: {len(features)}")
        if features:
            for f in features[:5]:
                props = f.get("properties", {})
                print("  Feature:", {k: v for k, v in props.items() if k in ['FMO', 'SUBBASIN', 'issue_at', 'day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7']})
except Exception as e:
    print(f"JSON fetch failed: {e}. Trying JSONP format...")
    url_jsonp = "https://reactjs.imd.gov.in/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&typename=imd:indian_river_basin&srsname=EPSG:4326&outputFormat=text/javascript&format_options=callback:getJson"
    try:
        req = urllib.request.Request(url_jsonp, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            content = res.read().decode('utf-8', errors='ignore')
            print(f"JSONP response size: {len(content)} bytes")
            # extract JSON inside getJson(...)
            match = re.search(r'getJson\((.*)\);?', content, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                features = data.get("features", [])
                print(f"Total river sub-basin features from JSONP: {len(features)}")
                if features:
                    for f in features[:5]:
                        props = f.get("properties", {})
                        print("  Feature:", {k: v for k, v in props.items() if k in ['FMO', 'SUBBASIN', 'issue_at', 'day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7']})
    except Exception as e2:
        print(f"JSONP fetch also failed: {e2}")
