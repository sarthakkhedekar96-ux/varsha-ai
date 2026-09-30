"""
IMD Data Schemas and Canonical Column Normalization Specifications
"""

from dataclasses import dataclass
from typing import Optional, List, Dict

# Standard column mapping dictionary for normalizing raw column headers
COLUMN_NORMALIZATION_MAP = {
    # District names
    "district name": "district",
    "district": "district",
    "dist_name": "district",
    "district_name": "district",
    "districtname": "district",
    "dist": "district",
    "district (name)": "district",
    
    # State names
    "state name": "state",
    "state": "state",
    "state_name": "state",
    "statename": "state",
    
    # Subdivision
    "subdivision": "subdivision",
    "sub-division": "subdivision",
    "sub division": "subdivision",
    "met_subdivision": "subdivision",
    "met subdivision": "subdivision",
    
    # Rainfall measurements (mm)
    "actual (mm)": "observed_rainfall_mm",
    "actual rainfall (mm)": "observed_rainfall_mm",
    "actual rainfall": "observed_rainfall_mm",
    "actual": "observed_rainfall_mm",
    "rainfall (mm)": "observed_rainfall_mm",
    "observed (mm)": "observed_rainfall_mm",
    "observed_rainfall": "observed_rainfall_mm",
    "daily rainfall (mm)": "observed_rainfall_mm",
    
    # Normal / LPA baseline (mm)
    "normal (mm)": "normal_rainfall_mm",
    "normal rainfall (mm)": "normal_rainfall_mm",
    "normal": "normal_rainfall_mm",
    "lpa (mm)": "normal_rainfall_mm",
    "normal_rainfall": "normal_rainfall_mm",
    
    # Departure %
    "departure (%)": "rainfall_departure_percent",
    "departure %": "rainfall_departure_percent",
    "% departure": "rainfall_departure_percent",
    "% dep": "rainfall_departure_percent",
    "departure": "rainfall_departure_percent",
    "dep (%)": "rainfall_departure_percent",
    
    # Category
    "category": "rainfall_category",
    "cat": "rainfall_category",
    "status": "rainfall_category"
}

# IMD Standard Rainfall Intensity Thresholds (mm / 24 hours)
IMD_RAINFALL_THRESHOLDS = {
    "NO_RAIN": (0.0, 0.0),
    "VERY_LIGHT": (0.1, 2.4),
    "LIGHT": (2.5, 15.5),
    "MODERATE": (15.6, 64.4),
    "HEAVY": (64.5, 115.5),
    "VERY_HEAVY": (115.6, 204.4),
    "EXTREMELY_HEAVY": (204.5, float("inf"))
}

# IMD Departure Category Classifications
def classify_departure_category(departure_pct: float) -> str:
    """Classifies rainfall departure % into official IMD categories."""
    if departure_pct >= 60.0:
        return "LARGE_EXCESS"  # LE (>= +60%)
    elif 20.0 <= departure_pct < 60.0:
        return "EXCESS"        # E (+20% to +59%)
    elif -19.0 <= departure_pct <= 19.0:
        return "NORMAL"        # N (-19% to +19%)
    elif -59.0 <= departure_pct < -19.0:
        return "DEFICIENT"     # D (-20% to -59%)
    elif departure_pct <= -60.0:
        return "LARGE_DEFICIENT" # LD (-60% to -99%)
    else:
        return "NO_RAIN"       # NR (-100%)

@dataclass
class CanonicalRainfallRecord:
    date: str
    district_key: str
    district: str
    district_normalized: str
    state: str
    state_normalized: str
    subdivision: str
    latitude: float
    longitude: float
    elevation: float
    terrain: str
    observed_rainfall_mm: float
    raw_nwp_rainfall_mm: float
    normal_rainfall_mm: float
    rainfall_departure_percent: float
    rainfall_category: str
    synoptic_regime: str
    period_type: str
    source: str
    source_url: str
    retrieved_at: str
