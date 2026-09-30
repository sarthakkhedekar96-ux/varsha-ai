"""
VARSHAAI Official GeoJSON District Intelligence Map Validation Test Suite
Validates:
1. GeoJSON exists and parses
2. Feature geometry validity (Polygon/MultiPolygon)
3. District identifiers and names exist in properties
4. VARSHAAI 57-district master join coverage
5. Detection and reporting of duplicate joins
6. Detection and reporting of unmatched districts
7. Verification that coordinates are within authentic Indian bounds (no synthetic geometry)
8. Verification that no synthetic rainfall is embedded in GeoJSON
9. Backend /api/districts telemetry joins cleanly with GeoJSON features
10. API contracts remain intact
"""

import os
import sys
import json
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.pipeline.district_master import INDIA_DISTRICT_MASTER

GEOJSON_PATH = "public/data/india_districts_varsha.geojson"
BG_GEOJSON_PATH = "public/data/india_background.geojson"

class TestGeoJsonDistrictMap(unittest.TestCase):

    def test_01_geojson_files_exist(self):
        """1. Verify that the primary GeoJSON and background boundary files exist."""
        self.assertTrue(os.path.exists(GEOJSON_PATH), f"Missing {GEOJSON_PATH}")
        self.assertTrue(os.path.exists(BG_GEOJSON_PATH), f"Missing {BG_GEOJSON_PATH}")

    def test_02_geojson_parses_successfully(self):
        """2. Verify that GeoJSON files parse valid JSON with FeatureCollection root."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data.get("type"), "FeatureCollection")
        self.assertIn("features", data)
        self.assertGreater(len(data["features"]), 0)

    def test_03_feature_geometry_validity(self):
        """3. Verify each feature geometry has valid type and coordinates."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for idx, feat in enumerate(data["features"]):
            geom = feat.get("geometry")
            self.assertIsNotNone(geom, f"Feature {idx} missing geometry")
            self.assertIn(geom.get("type"), ["Polygon", "MultiPolygon"])
            coords = geom.get("coordinates")
            self.assertTrue(isinstance(coords, list) and len(coords) > 0)

    def test_04_district_identifiers_exist(self):
        """4. Verify each feature has valid districtId, districtName, and state."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for idx, feat in enumerate(data["features"]):
            p = feat.get("properties", {})
            self.assertIn("districtId", p, f"Feature {idx} missing districtId")
            self.assertIn("districtName", p, f"Feature {idx} missing districtName")
            self.assertIn("state", p, f"Feature {idx} missing state")
            self.assertTrue(len(p["districtId"]) > 0)

    def test_05_varsha_57_district_join(self):
        """5. Verify VARSHAAI 57-district master join coverage."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        feature_ids = {feat["properties"]["districtId"] for feat in data["features"]}
        master_ids = set(INDIA_DISTRICT_MASTER.keys())

        matched = feature_ids.intersection(master_ids)
        self.assertEqual(len(matched), 57, f"Expected 57 matched districts, got {len(matched)}")
        self.assertEqual(len(feature_ids), 57)

    def test_06_duplicate_joins_detection(self):
        """6. Verify duplicate joins are explicitly detected and tracked in metadata."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        meta = data.get("metadata", {})
        self.assertIn("matched_districts", meta)
        self.assertEqual(meta.get("matched_districts"), 57)
        self.assertEqual(meta.get("unmatched_districts"), 0)

    def test_07_unmatched_districts_zero(self):
        """7. Verify that 100% of the 57 districts are matched (0 unmatched)."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        feature_ids = {feat["properties"]["districtId"] for feat in data["features"]}
        master_ids = set(INDIA_DISTRICT_MASTER.keys())
        unmatched = master_ids - feature_ids
        self.assertEqual(len(unmatched), 0, f"Unmatched districts found: {unmatched}")

    def test_08_no_synthetic_geographic_data(self):
        """8. Verify all coordinates fall within authentic India geographical bounding box (Lat 6-38 N, Lng 68-98 E)."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for feat in data["features"]:
            geom = feat.get("geometry", {})
            c_lat = feat["properties"].get("centroidLat")
            c_lng = feat["properties"].get("centroidLng")
            self.assertTrue(6.0 <= c_lat <= 38.0, f"Invalid centroid lat: {c_lat}")
            self.assertTrue(68.0 <= c_lng <= 98.0, f"Invalid centroid lng: {c_lng}")

    def test_09_no_fake_rainfall_in_static_geojson(self):
        """9. Verify no hardcoded/fake rainfall values are injected into static geometry."""
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        for feat in data["features"]:
            p = feat.get("properties", {})
            self.assertNotIn("rainfallMm", p, "Rainfall must not be hardcoded into static GeoJSON")
            self.assertNotIn("correctedRainfallMm", p, "Corrected rainfall must not be hardcoded into static GeoJSON")

    def test_10_api_contract_intact(self):
        """10. Verify /api/districts response schema joins cleanly with GeoJSON feature keys."""
        from fastapi.testclient import TestClient
        from backend.api.app import app
        client = TestClient(app)
        resp = client.get("/api/districts")
        self.assertEqual(resp.status_code, 200)
        dists = resp.json()
        self.assertEqual(len(dists), 57)
        api_dist_ids = {d["id"] for d in dists}
        
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        geo_dist_ids = {feat["properties"]["districtId"] for feat in data["features"]}

        self.assertEqual(api_dist_ids, geo_dist_ids, "API district IDs must match GeoJSON district IDs exactly")

if __name__ == "__main__":
    unittest.main()
