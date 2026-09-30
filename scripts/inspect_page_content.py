import urllib.request
import re

url = "https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE=1"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as res:
    html = res.read().decode('utf-8', errors='ignore')

# Search for any text or tags inside body
print("=== PAGE HEADINGS / TITLES ===")
headings = re.findall(r'<h[1-6][^>]*>(.*?)</h[1-6]>', html, re.IGNORECASE | re.DOTALL)
for h in headings:
    print(" -", re.sub(r'<[^>]+>', '', h).strip())

print("\n=== IFRAMES OR EMBEDDED OBJECTS ===")
embeds = re.findall(r'src=["\']([^"\']+)["\']', html, re.IGNORECASE)
for e in embeds:
    if '.php' in e or '.json' in e or '.pdf' in e or 'api' in e or 'data' in e:
        print(" -", e)

print("\n=== JAVASCRIPT VARS ===")
vars_found = re.findall(r'var\s+([a-zA-Z0-9_]+)\s*=\s*(.*?);', html, re.DOTALL)
for vname, vval in vars_found[:10]:
    print(f" - {vname}: {vval[:100]}...")
