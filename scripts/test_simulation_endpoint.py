"""
Test Suite for What-If Synoptic Regime & Forecast Sensitivity Simulator Endpoint
================================================================================
Validates:
1. Valid simulation (normal inputs)
2. Zero rainfall (Stage 1 Occurrence gate τ=0.60 must cleanly gate to 0.0 mm)
3. Moderate rainfall (Stage 1 passes, conditional amount predicted)
4. Heavy rainfall (P(≥64.5mm) evaluated, alert triggers if P >= 0.20)
5. Invalid rainfall (non-numeric string rejected with HTTP 422/400)
6. Negative rainfall (rejected with HTTP 400)
7. Invalid district (rejected with HTTP 404)
8. Invalid / arbitrary regime (handled safely without crash)
9. Response schema conforms strictly to contract
10. Scientific thresholds remain frozen (occurrence τ=0.60, heavy τ=0.20, event=64.5mm)
11. Model version is strictly labeled 'VARSHAAI V2'
12. is_operational_forecast is strictly False and mode is WHAT_IF_SENSITIVITY
"""

import sys
import unittest
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.api.app import app
from starlette.testclient import TestClient

class TestSimulationEndpoint(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_valid_simulation_post(self):
        """1. Valid POST simulation returns 200 OK and expected fields."""
        payload = {
            "district_id": "pune",
            "hypothetical_rainfall_mm": 25.0,
            "hypothetical_regime": "Orographic / Western Ghats"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("mode"), "WHAT_IF_SENSITIVITY")
        self.assertEqual(data.get("is_operational_forecast"), False)
        self.assertIn("corrected_rainfall_mm", data)
        self.assertIn("rain_probability", data)
        self.assertIn("heavy_rain_probability", data)

    def test_02_zero_rainfall_gated_dry(self):
        """2. Zero rainfall (0.0 mm) triggers Stage 1 occurrence gate failure and yields 0.0 mm."""
        payload = {
            "district_id": "pune",
            "hypothetical_rainfall_mm": 0.0,
            "hypothetical_regime": "Break Monsoon"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("is_rain_gated_dry"))
        self.assertEqual(data.get("occurrence_decision"), "FAIL")
        self.assertEqual(data.get("corrected_rainfall_mm"), 0.0)

    def test_03_moderate_rainfall_active(self):
        """3. Moderate rainfall produces non-negative conditional amount."""
        payload = {
            "district_id": "mumbai suburban",
            "hypothetical_rainfall_mm": 35.0,
            "hypothetical_regime": "Coastal Convergence Zone"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data.get("corrected_rainfall_mm"), 0.0)
        self.assertGreaterEqual(data.get("rain_probability"), 0.0)

    def test_04_heavy_rainfall_alert_logic(self):
        """4. Heavy rainfall scenario (e.g. 95 mm) triggers heavy-rain alert if P >= 0.20."""
        payload = {
            "district_id": "wayanad",
            "hypothetical_rainfall_mm": 95.0,
            "hypothetical_regime": "Orographic / Western Ghats"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        heavy_prob = data.get("heavy_rain_probability")
        self.assertTrue(0.0 <= heavy_prob <= 1.0)
        if heavy_prob >= 0.20:
            self.assertTrue(data.get("heavy_rain_alert"))
            self.assertEqual(data.get("heavy_rain_decision"), "ALERT TRIGGERED")
        else:
            self.assertFalse(data.get("heavy_rain_alert"))

    def test_05_invalid_rainfall_rejected(self):
        """5. Non-numeric rainfall is rejected with 422 Unprocessable Entity."""
        payload = {
            "district_id": "pune",
            "hypothetical_rainfall_mm": "invalid_string"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertIn(res.status_code, [400, 422])

    def test_06_negative_rainfall_rejected(self):
        """6. Negative rainfall is rejected with HTTP 400 Bad Request."""
        payload = {
            "district_id": "pune",
            "hypothetical_rainfall_mm": -15.0
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertIn("non-negative", data.get("detail", "").lower())

    def test_07_invalid_district_rejected(self):
        """7. Invalid non-existent district returns HTTP 404."""
        payload = {
            "district_id": "fictional_district_atlantis_9999",
            "hypothetical_rainfall_mm": 20.0
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 404)

    def test_08_invalid_regime_fallback(self):
        """8. Arbitrary regime string falls back safely to default/detected regime without crash."""
        payload = {
            "district_id": "pune",
            "hypothetical_rainfall_mm": 15.0,
            "hypothetical_regime": "NonExistentAlienRegime"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("regime", data)

    def test_09_response_schema_contract(self):
        """9. Response schema conforms strictly to What-If contract."""
        payload = {
            "district_id": "nagpur",
            "hypothetical_rainfall_mm": 40.0,
            "hypothetical_regime": "Deep Depression / Cyclonic"
        }
        res = self.client.post("/api/simulate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        mandatory_fields = [
            "mode",
            "is_operational_forecast",
            "district_id",
            "district_name",
            "hypothetical_inputs",
            "regime",
            "regime_readable",
            "rain_probability",
            "occurrence_threshold",
            "occurrence_decision",
            "is_rain_gated_dry",
            "stage2_raw_amount_mm",
            "corrected_rainfall_mm",
            "p10_mm",
            "p50_mm",
            "p90_mm",
            "heavy_rain_probability",
            "heavy_threshold",
            "heavy_rain_alert",
            "heavy_rain_decision",
            "heavy_rain_event_threshold_mm",
            "model_version"
        ]
        for field in mandatory_fields:
            self.assertIn(field, data, f"Missing required field '{field}' in simulation response")

    def test_10_frozen_thresholds_preservation(self):
        """10. Frozen scientific thresholds remain exactly tau=0.60 and tau_heavy=0.20."""
        payload = {"district_id": "pune", "hypothetical_rainfall_mm": 20.0}
        res = self.client.post("/api/simulate", json=payload)
        data = res.json()
        self.assertEqual(data.get("occurrence_threshold"), 0.60)
        self.assertEqual(data.get("heavy_threshold"), 0.20)
        self.assertEqual(data.get("heavy_rain_event_threshold_mm"), 64.5)

    def test_11_model_version_label(self):
        """11. Model version must be strictly VARSHAAI V2."""
        payload = {"district_id": "pune", "hypothetical_rainfall_mm": 20.0}
        res = self.client.post("/api/simulate", json=payload)
        data = res.json()
        self.assertEqual(data.get("model_version"), "VARSHAAI V2")

    def test_12_non_operational_flag(self):
        """12. is_operational_forecast is strictly False."""
        payload = {"district_id": "pune", "hypothetical_rainfall_mm": 20.0}
        res = self.client.post("/api/simulate", json=payload)
        data = res.json()
        self.assertFalse(data.get("is_operational_forecast"))
        self.assertEqual(data.get("mode"), "WHAT_IF_SENSITIVITY")

if __name__ == "__main__":
    unittest.main()
