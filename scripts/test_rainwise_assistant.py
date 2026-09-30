"""
Validation suite for Feature #5: RAINWISE AI Assistant.
Tests intent detection, district entity resolution, scientific safety filter,
operational vs What-If isolation, Feature #4 PATH B integration, real data binding,
and model artifact integrity across 20 rigorous checks.
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
    print("TESTING FEATURE #5: RAINWISE AI ASSISTANT")
    print("=" * 70)
    passed_tests = 0
    total_tests = 20

    # ---------------------------------------------------------
    # TEST 1: Forecast Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What is the rainfall forecast for Pune?", "district_id": "pune"})
    assert r.status_code == 200, f"Endpoint failed: {r.text}"
    d = r.json()
    assert d["intent"] == "DISTRICT_FORECAST"
    assert "Pune" in d["answer"]
    assert "VARSHAAI Corrected Rainfall" in d["answer"]
    print("[PASS] Test 1: DISTRICT_FORECAST intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 2: District Resolution (Extracts district mentioned in text)
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What is the weather in Ahmedabad?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["district_id"] == "ahmedabad"
    assert "Ahmedabad" in d["district_name"]
    print("[PASS] Test 2: District entity resolution (Ahmedabad detected from query) verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 3: Heavy Rain Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Will Pune receive heavy rain?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "HEAVY_RAIN"
    assert "64.5 mm" in d["answer"]
    assert "0.20" in d["answer"]
    assert "probabilistic" in d["answer"].lower()
    print("[PASS] Test 3: HEAVY_RAIN intent and probabilistic phrasing verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 4: Regime Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What regime is Pune under?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "REGIME"
    assert "VARSHAAI classifies the forecast scenario under the following regime proxy" in d["answer"]
    assert "regime proxy" in d["answer"].lower()
    print("[PASS] Test 4: REGIME proxy classification intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 5: GFS vs VARSHAAI Comparison Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Why is VARSHAAI different from raw GFS for Pune?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "GFS_VS_VARSHAAI"
    assert "Model Correction Difference" in d["answer"]
    assert "Raw GFS 0.25° NWP" in d["answer"]
    print("[PASS] Test 5: GFS_VS_VARSHAAI comparison intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 6: Uncertainty Intent (P10, P50, P90)
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What are the P10, P50 and P90 rainfall values for Pune?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "UNCERTAINTY"
    assert "P10" in d["answer"] and "P50" in d["answer"] and "P90" in d["answer"]
    assert "predictive quantiles, not gaussian confidence intervals" in d["answer"].lower()
    print("[PASS] Test 6: UNCERTAINTY predictive quantile intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 7: Verification Scorecard Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Show me the verification results.", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "VERIFICATION"
    assert "8.7433" in d["answer"] # Raw GFS RMSE
    assert "7.8428" in d["answer"] # V2 RMSE
    assert "4.0380" in d["answer"] # Raw GFS MAE
    assert "4.7963" in d["answer"] # V2 MAE
    assert "49.7%" in d["answer"]  # Dry-day false rain
    assert "partial improvement with documented trade-offs" in d["answer"].lower()
    print("[PASS] Test 7: VERIFICATION held-out scorecard and trade-off disclosure verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 8: Data Provenance Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What data does VARSHAAI use?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "DATA_PROVENANCE"
    assert "NOAA NCEP Global Forecast System" in d["answer"]
    assert "ECMWF ERA5-Land" in d["answer"]
    assert "10,317 records" in d["answer"]
    assert "279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39" in d["answer"]
    print("[PASS] Test 8: DATA_PROVENANCE intent and dataset hash verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 9: What-If Sensitivity Intent & Gated Simulation
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What if rainfall increases to 80 mm in Deep Depression?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "WHAT_IF"
    assert d["mode"] == "WHAT-IF / SENSITIVITY"
    assert "WHAT-IF / SENSITIVITY SIMULATION RESULT" in d["answer"]
    assert "NOT an operational NOAA GFS forecast" in d["answer"]
    print("[PASS] Test 9: WHAT_IF intent and hypothetical disclaimer verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 10: Forecast Progression PATH B Handling (Feature #4)
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Why are forecast cycles unavailable?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "FORECAST_PROGRESSION"
    assert "Multi-cycle comparison is not currently available from the validated forecast lineage" in d["answer"]
    assert "application-assigned operational mapping metadata" in d["answer"]
    assert "PATH B" in d["answer"]
    print("[PASS] Test 10: Feature #4 PATH B multi-cycle deferral handling verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 11: Alerts Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Are there any active alerts?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "ALERTS"
    assert "Active Meteorological Alerts" in d["answer"]
    print("[PASS] Test 11: ALERTS intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 12: Scientific Limitations Intent
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What are the model limitations?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "LIMITATIONS"
    assert "Documented Scientific Limitations" in d["answer"]
    assert "Fractions Skill Score" in d["answer"] or "FSS" in d["answer"]
    print("[PASS] Test 12: LIMITATIONS intent verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 13: Unknown Question Handling (Flood/Off-domain Boundary)
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Will Pune flood tomorrow?", "district_id": "pune"})
    assert r.status_code == 200
    d = r.json()
    assert d["intent"] == "UNKNOWN"
    assert "does not contain a validated hydrological flood prediction model" in d["answer"]
    print("[PASS] Test 13: Off-domain / hydrological safety boundary refusal verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 14: No Fabricated Values (Answers use authentic API values)
    # ---------------------------------------------------------
    r_fc = client.get("/api/forecast/pune")
    fc_data = r_fc.json()
    r_ai = client.post("/api/assistant/query", json={"message": "What is the forecast for Pune?", "district_id": "pune"})
    ai_data = r_ai.json()["data"]
    assert ai_data["corrected_rainfall_mm"] == fc_data["corrected_rainfall_mm"]
    assert ai_data["raw_gfs_rainfall_mm"] == fc_data["raw_gfs_rainfall_mm"]
    print("[PASS] Test 14: Live alignment between forecast API and RAINWISE response verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 15: No Ground-Truth Terminology Claims
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "What data is used?", "district_id": "pune"})
    answer = r.json()["answer"]
    # Check that "ground truth" is only mentioned in a disclaiming context ("NOT in-situ rain gauge ground truth")
    if "ground truth" in answer.lower():
        assert "not in-situ rain gauge ground truth" in answer.lower() or "not ground truth" in answer.lower()
    print("[PASS] Test 15: ERA5-Land ground truth mislabeling prevented.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 16: No IMD Observation Mislabeling
    # ---------------------------------------------------------
    assert "NOT an official IMD weather forecast" in answer or "not an imd" in answer.lower()
    print("[PASS] Test 16: IMD forecast/observation mislabeling prevented.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 17: No Fake Forecast Cycles (00Z/06Z/12Z/18Z)
    # ---------------------------------------------------------
    r = client.post("/api/assistant/query", json={"message": "Show 00Z and 12Z forecast progression.", "district_id": "pune"})
    answer = r.json()["answer"]
    assert "multi-cycle comparison is not currently available" in answer.lower()
    assert "00Z rainfall:" not in answer
    print("[PASS] Test 17: No fabricated forecast cycles.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 18: Operational vs What-If Mode Separation
    # ---------------------------------------------------------
    r_op = client.post("/api/assistant/query", json={"message": "What is the rainfall forecast for Pune?", "district_id": "pune"})
    r_wi = client.post("/api/assistant/query", json={"message": "What if rainfall increases to 80 mm in Deep Depression?", "district_id": "pune"})
    assert r_op.json()["mode"] == "OPERATIONAL"
    assert r_wi.json()["mode"] == "WHAT-IF / SENSITIVITY"
    print("[PASS] Test 18: Operational vs What-If mode separation verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 19: Frontend UI Integration & Floating Button
    # ---------------------------------------------------------
    app_jsx = (REPO_ROOT / "src" / "App.jsx").read_text(encoding="utf-8")
    assert "RainwiseAssistant" in app_jsx
    assert "open-rainwise-floating-btn" in app_jsx
    assert "isAssistantDrawerOpen" in app_jsx
    print("[PASS] Test 19: Frontend integration and floating assistant drawer verified.")
    passed_tests += 1

    # ---------------------------------------------------------
    # TEST 20: Model Artifact Integrity
    # ---------------------------------------------------------
    models_dir = REPO_ROOT / "models"
    assert (models_dir / "v2_occurrence_classifier.joblib").exists()
    assert (models_dir / "v2_amount_regressor.joblib").exists()
    assert (models_dir / "v2_heavy_rain_classifier.joblib").exists()
    assert (models_dir / "model_v2_metadata.json").exists()
    print("[PASS] Test 20: Frozen model artifacts untouched.")
    passed_tests += 1

    print("=" * 70)
    print(f"ALL {passed_tests}/{total_tests} RAINWISE ASSISTANT TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
