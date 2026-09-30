import urllib.request
import re

url = "https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE=1"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as res:
    html = res.read().decode('utf-8', errors='ignore')

# Find heading section and surrounding html
pos = html.find("STATEWISE DISTRIBUTION")
if pos != -1:
    snippet = html[pos:pos+3000]
    print("=== SNIPPET AFTER HEADING ===")
    print(snippet)
else:
    print("Heading not found.")
