"""
Pre-Deployment Endpoint Verification Script for VARSHA AI FastAPI Backend
"""
import sys
import os
import urllib.parse
from fastapi.testclient import TestClient

# Ensure repo root is on python path
sys.path.insert(0, os.path.abspath("."))
from backend.api.app import app

client = TestClient(app)

endpoints = [
    ('/', 200),
    ('/health', 200),
    ('/api/status', 200),
    ('/api/districts', 200),
    ('/api/rainfall/current', 200),
    ('/api/forecast/pune', 200),
    ('/api/forecast/' + urllib.parse.quote('mumbai city'), 200),
    ('/api/forecast/' + urllib.parse.quote('mumbai suburban'), 200),
    ('/api/forecast/puri', 200),
    ('/api/forecast/kutch', 200),
    ('/api/forecast/kolkata', 200),
    ('/api/forecast/pune/comparison', 200),
    ('/api/forecast/' + urllib.parse.quote('mumbai city') + '/comparison', 200),
    ('/api/regime/current', 200),
    ('/api/verification', 200),
    ('/api/verification/regimes', 200),
    ('/api/verification/districts', 200),
    ('/api/alerts', 200),
    ('/api/data/provenance', 200),
    ('/api/data/quality', 200),
]

print("=" * 70)
print("VARSHA AI PRE-DEPLOYMENT BACKEND ENDPOINT AUDIT")
print("=" * 70)

all_passed = True
results = []
for ep, expected in endpoints:
    res = client.get(ep)
    status = res.status_code
    passed = (status == expected)
    if not passed:
        all_passed = False
    status_str = "PASS" if passed else "FAIL"
    print(f"  [{status_str}] {ep:50s} -> HTTP {status}")
    results.append((ep, status_str, status))

print("=" * 70)
if all_passed:
    print("AUDIT RESULT: 20/20 ENDPOINTS PASSED (0 HTTP 500s / 0 ERRORS)")
else:
    print("AUDIT RESULT: FAILURES ENCOUNTERED")
print("=" * 70)

# Check /api/status payload
status_res = client.get('/api/status').json()
print("\n/api/status verification:")
print(f"  System:        {status_res.get('system')}")
print(f"  Model Version: {status_res.get('model_version')}")
print(f"  Models Loaded: {status_res.get('models_loaded')}")
print(f"  Districts:     {status_res.get('monitored_districts_count')}")

# Check /health payload
health_res = client.get('/health').json()
print("\n/health verification:")
print(f"  Health:        {health_res}")

# Compare Pune, Mumbai City, Puri, Kutch, Kolkata
print("\n" + "=" * 70)
print("5-DISTRICT FORECAST COMPARISON TABLE (Real JSON Output)")
print("=" * 70)
print(f"{'District':<16} | {'Raw GFS':<8} | {'V2 Pred':<8} | {'Delta':<7} | {'Regime':<20} | {'P(Heavy)':<8} | {'P10':<6} | {'P50':<6} | {'P90':<6}")
print("-" * 105)

for d_id in ['pune', 'mumbai city', 'puri', 'kutch', 'kolkata']:
    encoded = urllib.parse.quote(d_id)
    fc = client.get(f'/api/forecast/{encoded}').json()
    d_name = fc.get('name', d_id.title())
    gfs = fc.get('raw_gfs_rainfall_mm', 0.0)
    v2 = fc.get('corrected_rainfall_mm', 0.0)
    delta = fc.get('rainfall_change_mm', 0.0)
    regime = fc.get('regime', 'N/A')
    p_heavy = fc.get('heavy_rain_probability', 0.0) * 100
    p10 = fc.get('p10', 0.0)
    p50 = fc.get('p50', 0.0)
    p90 = fc.get('p90', 0.0)
    delta_str = f"{'+' if delta >= 0 else ''}{delta:.1f}"
    print(f"{d_name:<16} | {gfs:<8.1f} | {v2:<8.1f} | {delta_str:<7} | {regime:<20} | {p_heavy:<7.1f}% | {p10:<6.1f} | {p50:<6.1f} | {p90:<6.1f}")
print("=" * 105)
