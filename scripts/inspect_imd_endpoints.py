import urllib.request
import re

endpoints = [
    "https://mausam.imd.gov.in/responsive/rainfallinformation.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_swd.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_msd.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_state.php",
    "https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE=1",
    "https://mausam.imd.gov.in/responsive/rainfall_page_station_rainfall.php"
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

for url in endpoints:
    print(f"\n==================================================")
    print(f"FETCHING: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            content = res.read().decode('utf-8', errors='ignore')
            print(f"Bytes received: {len(content)}")
            
            # Check for table rows <tr> <td>
            trs = re.findall(r'<tr[^>]*>(.*?)</tr>', content, re.IGNORECASE | re.DOTALL)
            print(f"Table rows count: {len(trs)}")
            if len(trs) > 0:
                print("First 3 rows sample:")
                for tr in trs[:3]:
                    tds = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', tr, re.IGNORECASE | re.DOTALL)
                    clean_tds = [re.sub(r'<[^>]+>', '', td).strip() for td in tds]
                    print("  ROW:", clean_tds)
                    
            # Check for JSON variables or javascript arrays in page
            json_arrays = re.findall(r'var\s+([a-zA-Z0-9_]+)\s*=\s*(\[.*?\]|\{.*?\});', content, re.DOTALL)
            if json_arrays:
                print(f"Javascript data variables found: {[j[0] for j in json_arrays]}")

    except Exception as e:
        print(f"Error fetching {url}: {e}")
