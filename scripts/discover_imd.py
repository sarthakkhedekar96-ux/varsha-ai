import urllib.request
import re
import json

def inspect_imd():
    url = "https://mausam.imd.gov.in/responsive/rainfallinformation.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode('utf-8', errors='ignore')
            print(f"IMD HTML size: {len(html)} bytes")
            
            # Find all iframe src attributes
            iframes = re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE)
            print("\n=== IFRAMES FOUND ===")
            for iframe in iframes:
                print(f" - {iframe}")
                
            # Find all hyperlinks
            links = re.findall(r'<a[^>]+href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
            print("\n=== RAINFALL DATA LINKS FOUND ===")
            for href, text in links:
                clean_text = re.sub(r'<[^>]+>', '', text).strip()
                if any(k in href.lower() or k in clean_text.lower() for k in ['rainfall', 'district', 'state', 'subdivision', 'cum', 'stat', 'daily', 'weekly', 'map']):
                    print(f"Text: '{clean_text}' -> URL: '{href}'")
                    
            # Find all script src or ajax endpoints
            scripts = re.findall(r'src=["\']([^"\']+\.js)["\']|url:\s*["\']([^"\']+)["\']', html, re.IGNORECASE)
            print("\n=== SCRIPT / AJAX ENDPOINTS ===")
            for s1, s2 in scripts:
                endpoint = s1 or s2
                if any(k in endpoint.lower() for k in ['rain', 'map', 'district', 'state', 'data']):
                    print(f" - {endpoint}")

    except Exception as e:
        print(f"Error fetching IMD: {e}")

if __name__ == "__main__":
    inspect_imd()
