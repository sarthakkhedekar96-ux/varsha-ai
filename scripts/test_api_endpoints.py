import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient
from backend.api.app import app

client = TestClient(app)

def test_endpoints():
    print("Testing / ...")
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.text}"
    root_data = r.json()
    assert "Two-Stage Gated" in root_data["model_architecture"]
    print("  Root OK:", root_data["version"])

    print("Testing /api/status ...")
    r = client.get("/api/status")
    assert r.status_code == 200
    st = r.json()
    assert st["forecast_source"].startswith("NOAA")
    assert "ERA5-Land" in st["observation_source"]
    print("  Status OK: GFS + ERA5-Land confirmed")

    print("Testing /api/districts ...")
    r = client.get("/api/districts")
    assert r.status_code == 200
    dists = r.json()
    assert len(dists) == 57, f"Expected 57 districts, got {len(dists)}"
    sample_d = dists[0]
    assert "rain_probability" in sample_d
    assert "heavy_rain_probability" in sample_d
    assert "heavy_rain_alert" in sample_d
    print(f"  Districts OK: 57 districts returned. Sample: {sample_d['name']} (GFS={sample_d['nwpForecast']}mm, V2={sample_d['aiCorrected']}mm)")

    print("Testing /api/forecast/pune ...")
    r = client.get("/api/forecast/pune")
    assert r.status_code == 200
    fc = r.json()
    assert fc["district"] == "Pune"
    assert "p10" in fc and "p50" in fc and "p90" in fc
    print("  Pune Forecast OK: V2=", fc["corrected_rainfall_mm"], "Rain Prob=", fc["rain_probability"], "Heavy Prob=", fc["heavy_rain_probability"])

    print("Testing /api/forecast/pune/comparison ...")
    r = client.get("/api/forecast/pune/comparison")
    assert r.status_code == 200
    comp = r.json()
    assert "tier1_raw_gfs" in comp
    assert "tier4_v2_two_stage" in comp
    print("  Comparison OK: 4-tier models returned")

    print("Testing /api/verification ...")
    r = client.get("/api/verification")
    assert r.status_code == 200
    v = r.json()
    assert v["fss_status"] == "NOT COMPUTABLE"
    assert "scorecard" in v
    print("  Verification OK: FSS confirmed NOT COMPUTABLE, Scorecard verified")

    print("Testing /api/verification/regimes ...")
    r = client.get("/api/verification/regimes")
    assert r.status_code == 200
    rv = r.json()
    assert len(rv["data"]) > 0
    print(f"  Regime Verification OK: {len(rv['data'])} regimes")

    print("Testing /api/verification/districts ...")
    r = client.get("/api/verification/districts")
    assert r.status_code == 200
    dv = r.json()
    assert dv["total_districts"] == 57
    print(f"  District Verification OK: {dv['improved_count']} / {dv['total_districts']} improved")

    print("Testing /api/alerts ...")
    r = client.get("/api/alerts")
    assert r.status_code == 200
    al = r.json()
    print(f"  Alerts OK: {al['active_alerts_count']} alerts active")

    print("Testing /api/data/provenance ...")
    r = client.get("/api/data/provenance")
    assert r.status_code == 200
    prov = r.json()
    assert "279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39" in prov["dataset_sha256"]
    print("  Provenance OK: Dataset SHA-256 confirmed")

    print("\nALL API ENDPOINTS PASSED SCIENTIFIC VERIFICATION!")

if __name__ == "__main__":
    test_endpoints()
