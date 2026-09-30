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
    ajax_match = re.search(r'\$\.ajax\((.*?)\);', s3, re.DOTALL)
    if ajax_match:
        print("AJAX CALL FOUND:\n", ajax_match.group(1))
