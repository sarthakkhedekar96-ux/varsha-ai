import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.services.v2_inference_service import get_v2_inference_service

svc = get_v2_inference_service()
res = svc.simulate({
    "district_id": "pune",
    "hypothetical_rainfall_mm": 0.0,
    "hypothetical_regime": "BREAK_MONSOON",
    "previous_1day_rainfall": 0.0,
    "previous_3day_rainfall": 0.0,
    "previous_7day_rainfall": 0.0,
    "rolling_3day_mean": 0.0,
    "rolling_7day_mean": 0.0,
    "latitude": 18.52,
    "longitude": 73.85,
    "elevation": 560.0,
    "day_of_year": 272,
    "month": 9
})
print("Pure 0.0mm with 0.0 lags:")
print("  prob_rain:", res.get("rain_probability"))
print("  occurrence_threshold:", res.get("occurrence_threshold"))
print("  decision:", res.get("occurrence_decision"))
print("  is_gated_dry:", res.get("is_rain_gated_dry"))
print("  corrected_rainfall:", res.get("corrected_rainfall_mm"))
