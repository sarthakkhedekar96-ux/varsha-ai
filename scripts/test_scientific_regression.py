"""
VARSHAAI Scientific Regression & Verification Test Suite
======================================================
Tests to guarantee scientific honesty and protect Model V2 architecture:
1. V2 artifacts load successfully (occurrence classifier, amount regressor, heavy-rain classifier, quantiles).
2. Prediction pipeline produces expected fields and schema contracts.
3. Model version is strictly reported as VARSHAAI V2.
4. Forecast source strictly reported as NOAA NCEP GFS 0.25° GFS-seamless.
5. Reference source strictly reported as ECMWF ERA5-Land reanalysis/reference precipitation.
6. Zero synthetic data generators in the active production pipeline.
7. Heavy-rain probability is available and valid in [0, 1].
8. Heavy-rain decision threshold remains strictly frozen at tau_heavy = 0.20 (for >= 64.5 mm / 24h event).
9. Rain occurrence threshold remains strictly frozen at tau = 0.60 (for > 0.1 mm event).
10. FSS is strictly reported as NOT COMPUTABLE on point/district-centroid data.
11. Frozen validated dataset SHA-256 matches: 279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39
12. Held-out test period metrics match official validated scorecard.
"""

import sys
import os
import hashlib
import json
import unittest
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

class TestScientificRegression(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        from backend.services.v2_inference_service import get_v2_inference_service
        cls.service = get_v2_inference_service()

    def test_01_v2_artifacts_loaded(self):
        """1. V2 artifacts must be loaded and available."""
        self.assertIsNotNone(self.service.occurrence_classifier, "V2 Occurrence Classifier missing")
        self.assertIsNotNone(self.service.amount_regressor, "V2 Amount Regressor missing")
        self.assertIsNotNone(self.service.heavy_rain_classifier, "V2 Heavy Rain Classifier missing")
        self.assertIsNotNone(self.service.metadata, "V2 Metadata missing")

    def test_02_frozen_thresholds(self):
        """8 & 9. Verify occurrence gate tau=0.60 and heavy-rain threshold tau_heavy=0.20."""
        self.assertEqual(self.service.occurrence_threshold, 0.60, "Occurrence gate tau must be 0.60")
        self.assertEqual(self.service.heavy_rain_threshold, 0.20, "Heavy-rain gate tau_heavy must be 0.20")
        self.assertEqual(self.service.heavy_event_mm, 64.5, "Heavy-rain event definition must be 64.5 mm / 24h")

    def test_03_prediction_pipeline_schema(self):
        """2. Prediction pipeline produces all mandatory fields in contract."""
        pred = self.service.predict_single(
            district_name="Pune",
            raw_gfs_rainfall_mm=14.5,
            regime="Orographic / Western Ghats",
            forecast_date="2026-09-29"
        )
        mandatory_fields = [
            "district",
            "forecast_date",
            "forecast_source",
            "reference_source",
            "raw_gfs_rainfall_mm",
            "corrected_rainfall_mm",
            "rainfall_change_mm",
            "rainfall_change_percent",
            "regime",
            "rain_probability",
            "heavy_rain_probability",
            "heavy_rain_alert",
            "model_version",
            "provenance"
        ]
        for field in mandatory_fields:
            self.assertIn(field, pred, f"Missing required field: {field}")

    def test_04_model_version_label(self):
        """3. Model version must be VARSHAAI V2."""
        pred = self.service.predict_single(
            district_name="Wayanad",
            raw_gfs_rainfall_mm=45.0,
            regime="Orographic / Western Ghats"
        )
        self.assertEqual(pred["model_version"], "VARSHAAI V2")

    def test_05_forecast_and_reference_sources(self):
        """4 & 5. Forecast source is NOAA GFS and reference is ECMWF ERA5-Land."""
        pred = self.service.predict_single(
            district_name="Mumbai Suburban",
            raw_gfs_rainfall_mm=22.0,
            regime="Coastal Heavy Rain"
        )
        self.assertIn("NOAA NCEP GFS", pred["forecast_source"])
        self.assertIn("ECMWF ERA5-Land", pred["reference_source"])
        # Must NOT call reference ground truth or IMD observation
        self.assertNotIn("ground truth", pred["reference_source"].lower())
        self.assertNotIn("imd observation", pred["reference_source"].lower())

    def test_06_heavy_rain_decision_logic(self):
        """7. Heavy-rain alert triggers if and only if heavy_rain_probability >= 0.20."""
        # Test dry case
        dry_pred = self.service.predict_single(
            district_name="Jaisalmer",
            raw_gfs_rainfall_mm=0.0,
            regime="Normal / Background Monsoon"
        )
        self.assertIsInstance(dry_pred["heavy_rain_probability"], float)
        self.assertTrue(0.0 <= dry_pred["heavy_rain_probability"] <= 1.0)
        self.assertEqual(dry_pred["heavy_rain_alert"], dry_pred["heavy_rain_probability"] >= 0.20)

    def test_07_fss_non_computable(self):
        """10. FSS must NOT be reported as computed or available on point/district centroid data."""
        from backend.api.app import app
        from starlette.testclient import TestClient
        client = TestClient(app)
        res = client.get("/api/verification")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        fss_info = data.get("spatial_verification", {}).get("fss", {})
        self.assertEqual(fss_info.get("status"), "NOT COMPUTABLE")
        self.assertIn("district-centroid", fss_info.get("reason", "").lower())

    def test_08_dataset_sha256_integrity(self):
        """11. Validated dataset SHA-256 must match frozen hash."""
        dataset_path = ROOT_DIR / "data" / "features" / "real_forecast_observation_training_dataset.csv"
        self.assertTrue(dataset_path.exists(), "Frozen dataset file does not exist")
        hasher = hashlib.sha256()
        with open(dataset_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        actual_sha = hasher.hexdigest()
        expected_sha = "279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39"
        self.assertEqual(actual_sha, expected_sha, f"Dataset SHA mismatch! Expected {expected_sha}, got {actual_sha}")

    def test_09_no_synthetic_generators_in_inference_service(self):
        """6. Ensure no random/synthetic generators exist in v2_inference_service.py."""
        service_file = ROOT_DIR / "backend" / "services" / "v2_inference_service.py"
        with open(service_file, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertNotIn("np.random", content)
        self.assertNotIn("random.random", content)
        self.assertNotIn("random.uniform", content)
        self.assertNotIn("rng.exponential", content)

    def test_10_held_out_metrics_values(self):
        """12. Verified held-out test scorecard metrics are preserved."""
        from backend.api.app import app
        from starlette.testclient import TestClient
        client = TestClient(app)
        res = client.get("/api/verification")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        
        # Verify Raw GFS baseline
        gfs = data["models"]["raw_gfs"]
        self.assertAlmostEqual(gfs["rmse"], 8.7433, places=3)
        self.assertAlmostEqual(gfs["mae"], 4.0380, places=3)
        self.assertAlmostEqual(gfs["bias"], -0.0915, places=3)
        self.assertAlmostEqual(gfs["csi"], 0.2500, places=3)

        # Verify V2 metrics
        v2 = data["models"]["v2_two_stage"]
        self.assertAlmostEqual(v2["rmse"], 7.8428, places=3)
        self.assertAlmostEqual(v2["mae"], 4.7963, places=3)
        self.assertAlmostEqual(v2["bias"], 2.8382, places=3)
        self.assertAlmostEqual(v2["csi"], 0.3636, places=3)
        self.assertAlmostEqual(v2["pod"], 0.8000, places=3)
        self.assertAlmostEqual(v2["far"], 0.6000, places=3)

        # Verify scientific verdict is partial improvement with documented trade-offs
        self.assertIn("partial improvement", data["scientific_assessment"]["status"].lower())


if __name__ == "__main__":
    unittest.main()
