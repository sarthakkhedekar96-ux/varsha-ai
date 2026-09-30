"""
Validation suite for Feature #3: Single-District VARSHAAI Intelligence Bulletin / PDF Dossier.
Verifies component structure, 10 required sections, What-If isolation, V2 threshold preservation,
scientific disclosures, and API telemetry integration.
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
    print("TESTING FEATURE #3: SINGLE-DISTRICT VARSHAAI INTELLIGENCE BULLETIN")
    print("=" * 70)
    passed_tests = 0
    total_tests = 11

    # ---------------------------------------------------------
    # TEST 1: Bulletin component file exists
    # ---------------------------------------------------------
    bulletin_path = REPO_ROOT / "src" / "components" / "DistrictBulletin.jsx"
    assert bulletin_path.exists(), f"Missing {bulletin_path}"
    bulletin_code = bulletin_path.read_text(encoding="utf-8")
    print("[PASS] Test 1: DistrictBulletin.jsx exists.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 2: Entry point and integration in DistrictIntelligence.jsx
    # ---------------------------------------------------------
    di_path = REPO_ROOT / "src" / "components" / "DistrictIntelligence.jsx"
    assert di_path.exists()
    di_code = di_path.read_text(encoding="utf-8")
    assert "DistrictBulletin" in di_code, "DistrictBulletin not imported/rendered in DistrictIntelligence.jsx"
    assert "Generate District Bulletin" in di_code, "Missing 'Generate District Bulletin' button text"
    assert "id=\"generate-bulletin-btn\"" in di_code, "Missing generate-bulletin-btn id"
    print("[PASS] Test 2: 'Generate District Bulletin' entry point integrated in DistrictIntelligence.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 3: What-If isolation (No hypothetical values contaminated into bulletin)
    # ---------------------------------------------------------
    # Verify that DistrictBulletin does not consume simResult, only apiData and baseline district metadata
    assert "<DistrictBulletin" in di_code
    bulletin_invocation = re.search(r"<DistrictBulletin[\s\S]*?/>", di_code)
    assert bulletin_invocation, "Could not find <DistrictBulletin ... /> in DistrictIntelligence.jsx"
    invoc_text = bulletin_invocation.group(0)
    assert "simResult" not in invoc_text, "Contamination hazard: simResult passed to DistrictBulletin"
    assert "apiData={apiData}" in invoc_text, "Operational apiData must be passed to DistrictBulletin"
    assert "MODE: OPERATIONAL DISTRICT BULLETIN" in bulletin_code, "Missing explicit operational mode label"
    print("[PASS] Test 3: What-If isolation verified; only operational telemetry passed.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 4: Required 10 sections exist
    # ---------------------------------------------------------
    sections = [
        ("Header", "REGIME-AWARE AI RAINFALL INTELLIGENCE BULLETIN"),
        ("1. Executive Summary", "Executive Summary"),
        ("2. Rainfall Range / Uncertainty", "Rainfall Range"),
        ("3. Synoptic Regime Proxy", "Synoptic Regime Proxy"),
        ("4. Raw GFS vs VARSHAAI", "Raw GFS vs VARSHAAI V2"),
        ("5. Heavy Rain Information", "Heavy Rain Information"),
        ("6. District Location Snapshot", "District Location Snapshot"),
        ("7. Model Provenance", "Model Provenance"),
        ("8. Scientific Verification Summary", "Scientific Verification Summary"),
        ("9. Limitations & Disclosures", "Limitations"),
        ("10. Footer", "Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts")
    ]
    for sec_num, sec_title in sections:
        assert sec_title.lower() in bulletin_code.lower(), f"Missing section '{sec_title}' in DistrictBulletin.jsx"
    print("[PASS] Test 4: All 10 required bulletin sections verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 5: V2 Thresholds preserved (tau=0.60, tau_heavy=0.20, heavy_event=64.5mm)
    # ---------------------------------------------------------
    assert "0.60" in bulletin_code, "Missing occurrence threshold tau=0.60"
    assert "0.20" in bulletin_code, "Missing heavy-rain decision gate tau=0.20"
    assert "64.5" in bulletin_code, "Missing heavy rain event threshold 64.5 mm"
    print("[PASS] Test 5: V2 scientific thresholds strictly preserved (tau=0.60, tau_heavy=0.20, 64.5 mm).")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 6: ERA5-Land is not called 'ground truth' & no certainty claims
    # ---------------------------------------------------------
    assert "ground truth" not in bulletin_code.lower() or "not as in-situ direct rain gauge ground truth" in bulletin_code.lower(), \
        "ERA5-Land must not be referred to as ground truth."
    assert "heavy rain will definitely occur" not in bulletin_code.lower(), "No certainty claims permitted"
    assert "atmosphere is definitely in" not in bulletin_code.lower(), "No absolute atmospheric state claims permitted"
    print("[PASS] Test 6: Scientific honesty preserved; ERA5-Land not claimed as ground truth, no false certainty.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 7: IMD observation claims are not falsely introduced
    # ---------------------------------------------------------
    assert "forecast source: imd" not in bulletin_code.lower()
    assert "source: imd forecast" not in bulletin_code.lower()
    assert "NOAA NCEP Global Forecast System (GFS) 0.25°" in bulletin_code
    print("[PASS] Test 7: Forecast origin accurately identified as NOAA GFS 0.25; no false IMD claims.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 8: Predictive quantile and uncertainty terminology
    # ---------------------------------------------------------
    assert "model uncertainty range" in bulletin_code.lower(), "Must label horizontal range as 'Model uncertainty range'"
    assert "model-derived predictive quantiles" in bulletin_code.lower(), "Must state P10/P50/P90 are model-derived predictive quantiles"
    assert "confidence interval" not in bulletin_code.lower() or "not gaussian confidence intervals" in bulletin_code.lower(), \
        "Quantiles must not be termed confidence intervals without explicit qualification"
    print("[PASS] Test 8: Uncertainty terminology accurately qualified as model predictive quantiles.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 9: Complete held-out scorecard & mandatory trade-off disclosure
    # ---------------------------------------------------------
    assert "8.7433" in bulletin_code, "Raw GFS RMSE 8.7433 missing"
    assert "7.8428" in bulletin_code, "V2 RMSE 7.8428 missing"
    assert "4.0380" in bulletin_code, "Raw GFS MAE 4.0380 missing"
    assert "4.7963" in bulletin_code, "V2 MAE 4.7963 missing"
    assert "49.7%" in bulletin_code, "Dry-day false rain rate 49.7% missing"
    assert "13.0%" in bulletin_code, "Raw GFS dry-day false rain rate 13.0% missing"
    assert "Evaluation results show partial improvement with documented trade-offs; VARSHAAI V2 is not uniformly superior to raw GFS across all metrics." in bulletin_code, \
        "Mandatory evaluation trade-off disclosure missing from bulletin"
    print("[PASS] Test 9: Complete held-out scorecard and mandatory trade-offs disclosure present.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 10: Print stylesheet & window.print() mechanism
    # ---------------------------------------------------------
    assert "window.print()" in bulletin_code, "Missing window.print() execution"
    assert "@media print" in bulletin_code, "Missing @media print CSS styles"
    assert "A4 portrait" in bulletin_code, "Missing A4 portrait print specification"
    assert "no-print" in bulletin_code, "Missing no-print class for hiding UI buttons"
    print("[PASS] Test 10: Print-friendly layout (A4 portrait, ink conservation, button suppression) verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 11: Live API endpoints supply necessary telemetry
    # ---------------------------------------------------------
    r_fc = client.get("/api/forecast/pune")
    assert r_fc.status_code == 200
    fc_data = r_fc.json()
    assert "raw_gfs_rainfall_mm" in fc_data
    assert "corrected_rainfall_mm" in fc_data
    assert "p10" in fc_data and "p50" in fc_data and "p90" in fc_data
    assert "heavy_rain_probability" in fc_data
    assert "heavy_rain_alert" in fc_data
    assert "regime" in fc_data

    r_prov = client.get("/api/data/provenance")
    assert r_prov.status_code == 200
    prov_data = r_prov.json()
    assert "279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39" in prov_data["dataset_sha256"]

    r_ver = client.get("/api/verification")
    assert r_ver.status_code == 200
    ver_data = r_ver.json()
    assert "scorecard" in ver_data
    print("[PASS] Test 11: Live API endpoints supply all required bulletin telemetry seamlessly.")
    passed_tests += 1

    print("=" * 70)
    print(f"ALL {passed_tests}/{total_tests} FEATURE #3 BULLETIN TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
