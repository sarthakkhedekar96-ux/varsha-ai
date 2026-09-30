import urllib.request
import re

url = "https://mausam.imd.gov.in/responsive/quantPrecipForecastGIS.php"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=12) as response:
    html = response.read().decode('utf-8', errors='ignore')

# Find all inline javascript
scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.DOTALL | re.I)
print(f"Inline script blocks: {len(scripts)}")
for i, s in enumerate(scripts):
    print(f"\n--- Script Block #{i+1} ---")
    lines = [l.strip() for l in s.split('\n') if l.strip() and not l.strip().startswith('//')]
    for line in lines[:25]:
        print("  ", line)
