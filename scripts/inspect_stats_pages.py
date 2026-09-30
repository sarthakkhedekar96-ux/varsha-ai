import urllib.request
import re

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

for p in range(1, 9):
    url = f"https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE={p}"
    print(f"\n==================================================")
    print(f"FETCHING PAGE {p}: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            html = res.read().decode('utf-8', errors='ignore')
            print(f"Size: {len(html)} bytes")
            
            # Find <table> or <iframe> or <tr>
            tables = re.findall(r'<table[^>]*>(.*?)</table>', html, re.DOTALL | re.IGNORECASE)
            print(f"Tables found: {len(tables)}")
            for t_idx, table in enumerate(tables):
                trs = re.findall(r'<tr[^>]*>(.*?)</tr>', table, re.DOTALL | re.IGNORECASE)
                print(f"  Table #{t_idx+1} rows: {len(trs)}")
                if trs:
                    for tr in trs[:4]:
                        tds = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.DOTALL | re.IGNORECASE)
                        clean = [re.sub(r'<[^>]+>', '', td).strip() for td in tds]
                        print("    ", clean)
    except Exception as e:
        print(f"Error: {e}")
