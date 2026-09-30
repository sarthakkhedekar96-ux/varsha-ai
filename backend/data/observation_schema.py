"""
Authoritative Observation & Ground Truth Schema Definition
Defines strict schemas for observed rainfall, reanalysis records, and data quality flags.
"""

from typing import Dict, Any, Optional
from datetime import datetime

OBSERVATION_QUALITY_FLAGS = {
    "VALID": "Observation passed range, physical continuity, and format checks",
    "ESTIMATED": "Observation interpolated or aggregated from surrounding sub-daily readings",
    "MISSING": "Observation missing from source bulletin or archive",
    "INVALID": "Observation failed physical limit checks (e.g. negative value)",
    "EXTREME_HEAVY": "Observation exceeds 204.4 mm (Extremely heavy rainfall per IMD classification)"
}

class ObservationRecord:
    """Standardized representation of a single ground truth / observation measurement."""
    
    def __init__(
        self,
        observation_date: str,
        district: str,
        district_key: str,
        state: str,
        latitude: float,
        longitude: float,
        rainfall_mm: float,
        source: str = "ECMWF_ERA5_LAND_REANALYSIS",
        source_file: Optional[str] = None,
        source_url_or_identifier: Optional[str] = None,
        retrieval_timestamp: Optional[str] = None,
        quality_flag: str = "VALID"
    ):
        self.observation_date = observation_date
        self.district = district
        self.district_key = district_key
        self.state = state
        self.latitude = float(latitude)
        self.longitude = float(longitude)
        self.rainfall_mm = max(0.0, float(rainfall_mm)) if rainfall_mm is not None else 0.0
        self.source = source
        self.source_file = source_file
        self.source_url_or_identifier = source_url_or_identifier
        self.retrieval_timestamp = retrieval_timestamp or datetime.now().isoformat()
        self.quality_flag = quality_flag

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observation_date": self.observation_date,
            "district": self.district,
            "district_key": self.district_key,
            "state": self.state,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "rainfall_mm": self.rainfall_mm,
            "source": self.source,
            "source_file": self.source_file,
            "source_url_or_identifier": self.source_url_or_identifier,
            "retrieval_timestamp": self.retrieval_timestamp,
            "quality_flag": self.quality_flag
        }
