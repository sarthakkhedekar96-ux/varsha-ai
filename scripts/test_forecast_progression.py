"""
Validation suite for Feature #4: Multi-Cycle Forecast Progression & Lineage Tracker (PATH B).
Verifies that:
1. Multi-cycle comparison is explicitly stated as unavailable from the validated GFS lineage.
2. No fabricated sub-daily cycle data (00Z/06Z/12Z/18Z) or fake rainfall comparisons exist.
3. Current forecast lineage (NOAA GFS 0.25°, gfs_seamless, 24h operational window) is accurately presented.
4. Clear distinction between source-provided vs application-assigned metadata is maintained.
5. What-If values are isolated and not consumed by the progression tracker.
6. Integration into DistrictIntelligence.jsx is verified.
7. Existing API behavior and endpoints remain unchanged.
"""

import sys
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from fastapi.testclient import TestClient
from backend.api.app import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("TESTING FEATURE #4: FORECAST PROGRESSION & LINEAGE (PATH B)")
    print("=" * 70)
    passed_tests = 0
    total_tests = 8

    # ---------------------------------------------------------
    # TEST 1: ForecastProgression component exists
    # ---------------------------------------------------------
    prog_path = REPO_ROOT / "src" / "components" / "ForecastProgression.jsx"
    assert prog_path.exists(), f"Missing {prog_path}"
    prog_code = prog_path.read_text(encoding="utf-8")
    print("[PASS] Test 1: ForecastProgression.jsx component exists.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 2: Integration in DistrictIntelligence.jsx
    # ---------------------------------------------------------
    di_path = REPO_ROOT / "src" / "components" / "DistrictIntelligence.jsx"
    assert di_path.exists()
    di_code = di_path.read_text(encoding="utf-8")
    assert "ForecastProgression" in di_code, "ForecastProgression not imported/rendered in DistrictIntelligence.jsx"
    assert "<ForecastProgression" in di_code, "ForecastProgression JSX tag missing from DistrictIntelligence"
    print("[PASS] Test 2: ForecastProgression integrated into DistrictIntelligence.jsx.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 3: Feature explicitly states multi-cycle comparison unavailable
    # ---------------------------------------------------------
    assert "multi-cycle comparison is not currently available from the validated forecast lineage" in prog_code.lower(), \
        "Missing explicit statement that multi-cycle comparison is unavailable"
    assert "do not interpret this panel as a multi-cycle forecast comparison" in prog_code.lower(), \
        "Missing cautionary interpretation disclaimer"
    print("[PASS] Test 3: Multi-cycle unavailability and cautionary disclaimer verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 4: No fake cycles or fabricated sub-daily data
    # ---------------------------------------------------------
    # Must not contain fabricated 00Z/06Z/12Z/18Z rainfall numbers or cycle series
    assert "00z rainfall" not in prog_code.lower()
    assert "06z rainfall" not in prog_code.lower()
    assert "12z rainfall" not in prog_code.lower()
    assert "18z rainfall" not in prog_code.lower()
    assert "Math.random" not in prog_code, "Zero random generation permitted"
    print("[PASS] Test 4: Confirmed zero fake cycles and zero synthetic rainfall series.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 5: Current forecast lineage correctly presented
    # ---------------------------------------------------------
    assert "NOAA NCEP GFS 0.25° guidance" in prog_code, "Missing genuine GFS source name"
    assert "models=gfs_seamless" in prog_code, "Missing gfs_seamless query parameter"
    assert "24-hour Operational Window" in prog_code, "Missing 24h operational window specification"
    print("[PASS] Test 5: Genuine NOAA GFS lineage and operational window verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 6: Source-provided vs application-assigned metadata distinction
    # ---------------------------------------------------------
    assert "SOURCE-PROVIDED" in prog_code, "Missing SOURCE-PROVIDED label"
    assert "APPLICATION-ASSIGNED" in prog_code, "Missing APPLICATION-ASSIGNED label"
    assert "Nominal 00:00 UTC Run" in prog_code, "Missing nominal 00Z distinction"
    assert "Nominal 24h Lead Window" in prog_code, "Missing nominal 24h lead distinction"
    print("[PASS] Test 6: Clear distinction between source-provided and application-assigned metadata verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 7: What-If isolation verified
    # ---------------------------------------------------------
    invoc = re.search(r"<ForecastProgression[\s\S]*?/>", di_code)
    assert invoc, "Could not find <ForecastProgression ... /> invocation"
    invoc_text = invoc.group(0)
    assert "simResult" not in invoc_text, "What-If contamination: simResult passed to ForecastProgression"
    assert "apiData={apiData}" in invoc_text, "ForecastProgression must consume operational apiData"
    print("[PASS] Test 7: What-If isolation verified; only operational baseline passed.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 8: Live API endpoints remain operational and unaffected
    # ---------------------------------------------------------
    r_fc = client.get("/api/forecast/pune")
    assert r_fc.status_code == 200
    fc = r_fc.json()
    assert "raw_gfs_rainfall_mm" in fc
    assert "corrected_rainfall_mm" in fc

    r_prov = client.get("/api/data/provenance")
    assert r_prov.status_code == 200
    prov = r_prov.json()
    assert "models=gfs_seamless" in prov["forecast_provider_url"]
    print("[PASS] Test 8: Live API endpoints operational; forecast lineage confirmed.")
    passed_tests += 1

    print("=" * 70)
    print(f"ALL {passed_tests}/{total_tests} FEATURE #4 PROGRESSION TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
