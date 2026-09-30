import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.services.v2_inference_service import V2InferenceService

service = V2InferenceService(models_dir="models")
print("V2 Service Ready:", service.is_ready())
assert service.is_ready(), "V2 models failed to load!"

test_feature = {
    "district": "Pune",
    "forecast_date": "2026-09-29",
    "raw_gfs_rainfall_mm": 12.4,
    "previous_1day_rainfall": 8.0,
    "previous_3day_rainfall": 15.0,
    "previous_7day_rainfall": 45.0,
    "rolling_3day_mean": 10.0,
    "rolling_7day_mean": 8.5,
    "latitude": 18.5204,
    "longitude": 73.8567,
    "elevation": 561.0,
    "day_of_year": 272,
    "month": 9,
    "terrain": "Orographic/Ghats"
}

output = service.predict(test_feature)
import json
print(json.dumps(output, indent=2))
assert output["model_version"].startswith("VARSHAAI V2"), "Model version mismatch!"
assert "corrected_rainfall_mm" in output, "Missing corrected_rainfall_mm!"
assert "heavy_rain_probability" in output, "Missing heavy_rain_probability!"
assert "rain_probability" in output, "Missing rain_probability!"
print("\nV2 Inference Test: PASS!")
