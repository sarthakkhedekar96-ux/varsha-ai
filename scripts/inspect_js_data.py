import urllib.request
import re
import json

url = "https://mausam.imd.gov.in/responsive/rainfallinformation_swd.php"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as res:
    html = res.read().decode('utf-8', errors='ignore')
    
# Find countrydataprovider
match = re.search(r'var\s+countrydataprovider\s*=\s*(\{.*?\}|\[.*?\]);', html, re.DOTALL)
if match:
    data_str = match.group(1)
    print("Found countrydataprovider! Length:", len(data_str))
    print("Sample (first 500 chars):")
    print(data_str[:500])
    
    # Try parsing JSON
    try:
        data = json.loads(data_str)
        print("JSON parse successful!")
        if isinstance(data, dict):
            print("Keys:", list(data.keys()))
            if 'areas' in data:
                print("Total areas (districts/states):", len(data['areas']))
                print("First 3 areas sample:", data['areas'][:3])
        elif isinstance(data, list):
            print("Total items:", len(data))
            print("First 3 items sample:", data[:3])
    except Exception as e:
        print("JSON parse error:", e)
else:
    print("countrydataprovider variable not matched by regex.")

# Let's search for any json or data arrays across the page
var_matches = re.findall(r'var\s+([a-zA-Z0-9_]+)\s*=\s*([\[\{].*?[\]\}]);', html, re.DOTALL)
print("\nAll JavaScript variables found:")
for name, val in var_matches:
    print(f" - Variable '{name}': {len(val)} chars")
    print(f"   Preview: {val[:150]}...")
