"""
Live HTTP Test Script for VARSHA AI running instances.
"""
import urllib.request
import urllib.parse
import json
import time

def test_url(url):
    t0 = time.time()
    try:
        req = urllib.request.urlopen(url, timeout=5)
        dt = (time.time() - t0) * 1000
        code = req.getcode()
        body = req.read()
        return code, dt, body
    except Exception as e:
        return 0, 0, str(e).encode('utf-8')

port = 8000
try:
    urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=1)
except Exception:
    port = 8001

print(f"Testing Backend Routes on port {port}:")
routes = [
    "/",
    "/health",
    "/api/status",
    "/api/districts",
    "/api/rainfall/current",
    "/api/forecast/pune",
    "/api/forecast/" + urllib.parse.quote("mumbai city"),
    "/api/forecast/" + urllib.parse.quote("mumbai suburban"),
    "/api/forecast/puri",
    "/api/forecast/kutch",
    "/api/forecast/kolkata",
    "/api/forecast/pune/comparison",
    "/api/forecast/" + urllib.parse.quote("mumbai city") + "/comparison",
    "/api/regime/current",
    "/api/verification",
    "/api/verification/regimes",
    "/api/verification/districts",
    "/api/alerts",
    "/api/data/provenance",
    "/api/data/quality"
]

all_success = True
for r in routes:
    code, dt, body = test_url(f"http://127.0.0.1:{port}{r}")
    status_str = "PASS" if code == 200 else "FAIL"
    if code != 200:
        all_success = False
    print(f"  [{status_str}] {r:45s} -> Status={code:3d} ({dt:5.1f}ms)")

print(f"\nOverall Backend Endpoints Status: {'ALL PASS' if all_success else 'FAILURES DETECTED'}")
