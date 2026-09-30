import urllib.request
import json

# Test fetching real past numerical weather prediction (GFS 0.25° / ECMWF IFS 9km) forecast runs
url = "https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&start_date=2026-06-01&end_date=2026-09-20&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=12) as res:
        data = json.loads(res.read().decode('utf-8'))
        times = data.get("daily", {}).get("time", [])
        precip = data.get("daily", {}).get("precipitation_sum", [])
        print(f"Historical Numerical Forecast API returned {len(times)} days for Pune (2026-06-01 to 2026-09-20)!")
        print("  Sample first 5 days:", list(zip(times[:5], precip[:5])))
        print("  Sample last 5 days:", list(zip(times[-5:], precip[-5:])))
except Exception as e:
    print(f"Error fetching historical forecast: {e}")
