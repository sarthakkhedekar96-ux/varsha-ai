import urllib.request
import re

url = "https://mausam.imd.gov.in/responsive/quantPrecipForecastGIS.php"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req, timeout=12) as response:
    html = response.read().decode('utf-8', errors='ignore')

scripts = re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', html, re.DOTALL | re.I)
if len(scripts) >= 3:
    s3 = scripts[2]
    # find geojson or layer or ajax or json loads
    print("Length of Script Block 3:", len(s3))
    for line in s3.split('\n'):
        if any(k in line.lower() for k in ['json', 'layer', 'ajax', 'get', 'url', 'feature', 'fmo', 'qpf', 'subbasin', 'php']):
            print("  ", line.strip())
