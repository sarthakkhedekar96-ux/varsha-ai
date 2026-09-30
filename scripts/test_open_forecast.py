import urllib.request
import json

# Test fetching real GFS/ECMWF numerical weather prediction precipitation forecasts for Pune (lat: 18.52, lng: 73.85)
url = "https://api.open-meteo.com/v1/forecast?latitude=18.5204&longitude=73.8567&daily=precipitation_sum,precipitation_probability_max&timezone=Asia%2FKolkata&forecast_days=7"
headers = {"User-Agent": "Mozilla/5.0"}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read().decode('utf-8'))
        print("Real Numerical Weather Model (GFS/ECMWF) Response for Pune:")
        print("  Dates:", data.get("daily", {}).get("time", []))
        print("  Daily Precipitation Forecast (mm):", data.get("daily", {}).get("precipitation_sum", []))
        print("  Precipitation Probability (%):", data.get("daily", {}).get("precipitation_probability_max", []))
except Exception as e:
    print(f"Error: {e}")
