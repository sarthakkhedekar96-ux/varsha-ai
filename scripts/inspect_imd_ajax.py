import urllib.request
import re

urls = [
    "https://mausam.imd.gov.in/responsive/rainfallinformation.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_swd.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_msd.php",
    "https://mausam.imd.gov.in/responsive/rainfallinformation_state.php",
    "https://mausam.imd.gov.in/responsive/rainfall_statistics.php?PAGE=1",
    "https://mausam.imd.gov.in/responsive/rainfall_page_station_rainfall.php"
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

for url in urls:
    print(f"\n==================================================")
    print(f"SEARCHING AJAX IN: {url}")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as res:
            html = res.read().decode('utf-8', errors='ignore')
            
            # Find $.ajax / fetch / $.get / $.post
            ajax_blocks = re.findall(r'\$\.ajax\(\{.*?\}\)|\$\.(get|post)\(.*?\)|\bfetch\(.*?\)', html, re.DOTALL)
            print(f"AJAX blocks found: {len(ajax_blocks)}")
            for block in ajax_blocks:
                b_str = block if isinstance(block, str) else str(block)
                print("  AJAX Call snippet:", b_str[:250].replace('\n', ' '))
                
            # Find any PHP scripts referenced in javascript functions
            php_calls = re.findall(r'["\']([a-zA-Z0-9_\-/]+\.php\?[^"\']+|[a-zA-Z0-9_\-/]+\.php)["\']', html)
            print("  PHP files referenced:", set(php_calls))
    except Exception as e:
        print(f"Error: {e}")
