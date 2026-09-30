"""
VARSHA AI V2 Production Inference Service
Serves calibrated two-stage predictions, heavy-rain probabilities, and provenance.
Architecture:
- Stage 1: Rain Occurrence Classifier (P(Rain > 0.1 mm), gate tau = 0.60)
- Stage 2: Conditional Rainfall Amount Regressor
- Stage 3: Dedicated Calibrated Heavy Rain Classifier (decision threshold tau = 0.20)
- Quantile Uncertainty Regressors (P10, P50, P90)
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional

REGIME_ENCODING = {
    'NORMAL_BACKGROUND': 0,
    'ACTIVE_MONSOON': 1,
    'BREAK_MONSOON': 2,
    'MONSOON_LOW': 3,
    'DEPRESSION': 4,
    'OROGRAPHIC_RAINFALL': 5,
    'COASTAL_RAINFALL': 6,
    'WESTERN_DISTURBANCE': 7
}

REGIME_NAMES_READABLE = {
    'NORMAL_BACKGROUND': 'Normal Background',
    'ACTIVE_MONSOON': 'Active Monsoon',
    'BREAK_MONSOON': 'Break Monsoon',
    'MONSOON_LOW': 'Monsoon Low Pressure System',
    'DEPRESSION': 'Deep Depression / Cyclonic',
    'OROGRAPHIC_RAINFALL': 'Orographic / Western Ghats',
    'COASTAL_RAINFALL': 'Coastal Convergence Zone',
    'WESTERN_DISTURBANCE': 'Western Disturbance'
}

class V2InferenceService:
    def __init__(self, models_dir="models"):
        self.models_dir = models_dir
        self.models = {}
        self.metadata = {}
        self.gate_threshold = 0.60
        self.heavy_threshold = 0.20
        self.load_models()

    def load_models(self):
        v2_files = {
            "occur": "v2_occurrence_classifier.joblib",
            "amount": "v2_amount_regressor.joblib",
            "heavy": "v2_heavy_rain_classifier.joblib",
            "v1": "regime_aware.joblib",
            "p10": "quantile_p10.joblib",
            "p50": "quantile_p50.joblib",
            "p90": "quantile_p90.joblib"
        }
        for key, fname in v2_files.items():
            path = os.path.join(self.models_dir, fname)
            if os.path.exists(path):
                try:
                    self.models[key] = joblib.load(path)
                except Exception as e:
                    print(f"[V2InferenceService] Warning: failed to load {fname}: {e}")

        meta_path = os.path.join(self.models_dir, "model_v2_metadata.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                    self.gate_threshold = float(self.metadata.get("gate_threshold", 0.60))
                    self.heavy_threshold = float(self.metadata.get("heavy_rain_decision_threshold", 0.20))
            except Exception as e:
                print(f"[V2InferenceService] Warning loading metadata: {e}")

    def is_ready(self) -> bool:
        return "occur" in self.models and "amount" in self.models and "heavy" in self.models

    def detect_regime(self, raw_gfs: float, terrain: str, day_of_year: int) -> str:
        """Deterministic rule-based proxy regime classification from forecast-time features."""
        if terrain == 'Orographic/Ghats' and (raw_gfs > 25.0 or 150 <= day_of_year <= 270):
            return 'OROGRAPHIC_RAINFALL'
        elif terrain == 'Coastal' and raw_gfs > 20.0:
            return 'COASTAL_RAINFALL'
        elif raw_gfs > 45.0:
            return 'DEPRESSION'
        elif raw_gfs > 25.0:
            return 'MONSOON_LOW'
        elif 150 <= day_of_year <= 270 and raw_gfs > 10.0:
            return 'ACTIVE_MONSOON'
        elif terrain == 'Himalayan' and day_of_year < 150:
            return 'WESTERN_DISTURBANCE'
        elif raw_gfs < 1.0:
            return 'BREAK_MONSOON'
        return 'NORMAL_BACKGROUND'

    def predict(self, feature_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes Two-Stage Gated V2 Inference.
        Input features:
          raw_gfs_rainfall_mm, previous_1day_rainfall, previous_3day_rainfall,
          previous_7day_rainfall, rolling_3day_mean, rolling_7day_mean,
          latitude, longitude, elevation, day_of_year, month, terrain
        """
        raw_gfs = float(feature_dict.get('raw_gfs_rainfall_mm', feature_dict.get('raw_forecast_rainfall_mm', 0.0)))
        terrain = feature_dict.get('terrain', 'Plains')
        doy = int(feature_dict.get('day_of_year', datetime.now().timetuple().tm_yday))
        month = int(feature_dict.get('month', datetime.now().month))
        district_name = feature_dict.get('district', 'District')
        forecast_date = feature_dict.get('forecast_date', datetime.now().strftime("%Y-%m-%d"))

        regime = self.detect_regime(raw_gfs, terrain, doy)
        regime_code = REGIME_ENCODING.get(regime, 0)

        # Build feature vector matching training contract (as numpy array)
        feature_row = [
            raw_gfs,
            float(feature_dict.get('previous_1day_rainfall', 0.0)),
            float(feature_dict.get('previous_3day_rainfall', 0.0)),
            float(feature_dict.get('previous_7day_rainfall', 0.0)),
            float(feature_dict.get('rolling_3day_mean', 0.0)),
            float(feature_dict.get('rolling_7day_mean', 0.0)),
            float(feature_dict.get('latitude', 20.0)),
            float(feature_dict.get('longitude', 78.0)),
            float(feature_dict.get('elevation', 200.0)),
            doy,
            month,
            regime_code
        ]
        X_in = np.array([feature_row])

        if not self.is_ready():
            return {
                "error": "Model V2 artifacts not loaded. Check models/ directory.",
                "district": district_name,
                "raw_gfs_rainfall_mm": raw_gfs,
                "corrected_rainfall_mm": raw_gfs
            }

        # 1. Stage 1 Occurrence Probability
        prob_rain = float(self.models['occur'].predict_proba(X_in)[0, 1])

        # 2. Stage 2 Conditional Amount
        raw_amount_pred = float(self.models['amount'].predict(X_in)[0])
        pred_amount = max(0.0, raw_amount_pred)

        # 3. Gating Logic (tau = 0.60)
        if prob_rain >= self.gate_threshold:
            corrected_rainfall = round(pred_amount, 1)
            is_rain_gated = False
        else:
            corrected_rainfall = 0.0
            is_rain_gated = True

        # 4. Heavy Rain Probability & Alert Head (tau_heavy = 0.20)
        heavy_classes = list(self.models['heavy'].classes_)
        if 1 in heavy_classes:
            idx_1 = heavy_classes.index(1)
            heavy_prob = float(self.models['heavy'].predict_proba(X_in)[0, idx_1])
        else:
            heavy_prob = 0.0
        heavy_alert = bool(heavy_prob >= self.heavy_threshold)

        # 5. V1 Model Prediction (for comparison)
        v1_pred = round(max(0.0, float(self.models['v1'].predict(X_in)[0])), 1) if 'v1' in self.models else corrected_rainfall

        # 6. Quantile Uncertainty (P10, P50, P90)
        p10 = round(max(0.0, float(self.models['p10'].predict(X_in)[0])), 1) if 'p10' in self.models else round(corrected_rainfall * 0.75, 1)
        p50 = round(max(0.0, float(self.models['p50'].predict(X_in)[0])), 1) if 'p50' in self.models else corrected_rainfall
        p90 = round(max(0.0, float(self.models['p90'].predict(X_in)[0])), 1) if 'p90' in self.models else round(corrected_rainfall * 1.35, 1)
        
        # Enforce quantile ordering
        p10 = min(p10, p50)
        p90 = max(p90, p50)

        delta = round(corrected_rainfall - raw_gfs, 1)
        change_pct = round((delta / raw_gfs * 100), 1) if raw_gfs > 0 else (0.0 if delta == 0 else 100.0)

        return {
            "district": district_name,
            "forecast_date": forecast_date,
            "forecast_source": "NOAA NCEP GFS 0.25° GFS-seamless",
            "reference_source": "ECMWF ERA5-Land reanalysis/reference precipitation",
            "model_version": "VARSHA AI V2",
            "raw_gfs_rainfall_mm": round(raw_gfs, 1),
            "corrected_rainfall_mm": corrected_rainfall,
            "v1_rainfall_mm": v1_pred,
            "rainfall_change_mm": delta,
            "rainfall_change_percent": change_pct,
            "regime": regime,
            "regime_readable": REGIME_NAMES_READABLE.get(regime, regime),
            "rain_probability": round(prob_rain, 3),
            "rain_gate_threshold": self.gate_threshold,
            "is_rain_gated_dry": is_rain_gated,
            "heavy_rain_probability": round(heavy_prob, 3),
            "heavy_rain_decision_threshold": self.heavy_threshold,
            "heavy_rain_event_threshold_mm": 64.5,
            "heavy_rain_alert": heavy_alert,
            "confidence_or_probability": "PROBABILITY_CALIBRATED",
            "p10": p10,
            "p50": p50,
            "p90": p90,
            "uncertainty_spread_mm": round(p90 - p10, 1),
            "provenance": {
                "forecast_model": "GFS_0.25_SEAMLESS",
                "forecast_window": "24-hour operational forecast window",
                "spatial_extraction": "NEAREST_GRID_CENTROID",
                "scientific_status": "PARTIAL IMPROVEMENT WITH DOCUMENTED TRADE-OFFS"
            }
        }

    @property
    def occurrence_classifier(self):
        return self.models.get("occur")

    @property
    def amount_regressor(self):
        return self.models.get("amount")

    @property
    def heavy_rain_classifier(self):
        return self.models.get("heavy")

    @property
    def occurrence_threshold(self) -> float:
        return self.gate_threshold

    @property
    def heavy_rain_threshold(self) -> float:
        return self.heavy_threshold

    @property
    def heavy_event_mm(self) -> float:
        return 64.5

    def simulate(self, sim_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes What-If Sensitivity Simulation using frozen V2 model artifacts.
        DOES NOT alter operational predictions or forecast feeds.
        Inputs:
          district_id (str)
          hypothetical_rainfall_mm (float >= 0.0)
          hypothetical_regime (str, optional)
          latitude, longitude, elevation, terrain, antecedent stats (optional)
        """
        if not self.is_ready():
            return {
                "error": "Model V2 artifacts not loaded. Check models/ directory.",
                "mode": "WHAT_IF_SENSITIVITY",
                "is_operational_forecast": False
            }

        # 1. Validate hypothetical rainfall
        hypo_raw = sim_params.get("hypothetical_rainfall_mm")
        if hypo_raw is None:
            raise ValueError("Missing 'hypothetical_rainfall_mm' parameter.")
        try:
            hypo_rain = float(hypo_raw)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid hypothetical rainfall value: '{hypo_raw}'. Must be a valid number.")

        if np.isnan(hypo_rain) or np.isinf(hypo_rain):
            raise ValueError("Hypothetical rainfall must be a finite number.")
        if hypo_rain < 0.0:
            raise ValueError("Hypothetical rainfall must be a non-negative number.")

        # Cap max to reasonable meteorological bounds (0 to 500 mm)
        hypo_rain = min(hypo_rain, 500.0)

        district_id = str(sim_params.get("district_id", "pune")).lower().strip()
        district_name = str(sim_params.get("district_name", district_id.title()))
        
        # 2. Extract or resolve regime
        regime_input = str(sim_params.get("hypothetical_regime", "")).strip()
        regime_key = None
        if regime_input.upper() in REGIME_ENCODING:
            regime_key = regime_input.upper()
        else:
            for k, readable in REGIME_NAMES_READABLE.items():
                if regime_input.lower() == readable.lower() or regime_input.lower() in readable.lower():
                    regime_key = k
                    break

        terrain = sim_params.get("terrain", "Plains")
        doy = int(sim_params.get("day_of_year", datetime.now().timetuple().tm_yday))
        month = int(sim_params.get("month", datetime.now().month))
        if not regime_key:
            regime_key = self.detect_regime(hypo_rain, terrain, doy)

        regime_code = REGIME_ENCODING.get(regime_key, 0)
        readable_regime = REGIME_NAMES_READABLE.get(regime_key, regime_key)

        # 3. Construct input vector using district's geographic context
        lat = float(sim_params.get("latitude", 18.52))
        lng = float(sim_params.get("longitude", 73.85))
        elevation = float(sim_params.get("elevation", 560.0))
        prev_1d = float(sim_params.get("previous_1day_rainfall", hypo_rain * 0.7))
        prev_3d = float(sim_params.get("previous_3day_rainfall", hypo_rain * 1.5))
        prev_7d = float(sim_params.get("previous_7day_rainfall", hypo_rain * 3.0))
        roll_3d = float(sim_params.get("rolling_3day_mean", (hypo_rain + prev_1d) / 2.0))
        roll_7d = float(sim_params.get("rolling_7day_mean", (hypo_rain + prev_3d) / 4.0))

        feature_row = [
            hypo_rain,
            prev_1d,
            prev_3d,
            prev_7d,
            roll_3d,
            roll_7d,
            lat,
            lng,
            elevation,
            doy,
            month,
            regime_code
        ]
        X_in = np.array([feature_row])

        # Stage 1: Rain Occurrence Classifier
        prob_rain = float(self.models['occur'].predict_proba(X_in)[0, 1])

        # Stage 2: Conditional Amount Regressor
        raw_amount_pred = float(self.models['amount'].predict(X_in)[0])

        # Stage 3: Dedicated Calibrated Heavy-Rain Classifier
        heavy_classes = list(self.models['heavy'].classes_)
        if 1 in heavy_classes:
            idx_1 = heavy_classes.index(1)
            heavy_prob = float(self.models['heavy'].predict_proba(X_in)[0, idx_1])
        else:
            heavy_prob = 0.0

        # Gating Decision (tau = 0.60)
        if prob_rain >= self.gate_threshold:
            corrected_rainfall = round(max(0.0, raw_amount_pred), 1)
            occurrence_decision = "PASS"
            is_rain_gated_dry = False
            p10 = round(max(0.0, float(self.models['p10'].predict(X_in)[0])), 1) if 'p10' in self.models else round(corrected_rainfall * 0.75, 1)
            p50 = round(max(0.0, float(self.models['p50'].predict(X_in)[0])), 1) if 'p50' in self.models else corrected_rainfall
            p90 = round(max(0.0, float(self.models['p90'].predict(X_in)[0])), 1) if 'p90' in self.models else round(corrected_rainfall * 1.35, 1)
            p10 = min(p10, p50)
            p90 = max(p90, p50)
        else:
            corrected_rainfall = 0.0
            occurrence_decision = "FAIL"
            is_rain_gated_dry = True
            p10 = 0.0
            p50 = 0.0
            p90 = 0.0

        heavy_alert = bool(heavy_prob >= self.heavy_threshold)
        heavy_decision = "ALERT TRIGGERED" if heavy_alert else "NO HEAVY-RAIN ALERT"

        delta = round(corrected_rainfall - hypo_rain, 1)
        change_pct = round((delta / hypo_rain * 100), 1) if hypo_rain > 0 else (0.0 if delta == 0 else 100.0)

        return {
            "mode": "WHAT_IF_SENSITIVITY",
            "is_operational_forecast": False,
            "district_id": district_id,
            "district_name": district_name,
            "hypothetical_inputs": {
                "hypothetical_rainfall_mm": round(hypo_rain, 1),
                "hypothetical_regime": regime_key,
                "hypothetical_regime_readable": readable_regime
            },
            "regime": regime_key,
            "regime_readable": readable_regime,
            "rain_probability": round(prob_rain, 3),
            "occurrence_threshold": self.gate_threshold,
            "occurrence_decision": occurrence_decision,
            "is_rain_gated_dry": is_rain_gated_dry,
            "stage2_raw_amount_mm": round(max(0.0, raw_amount_pred), 1),
            "corrected_rainfall_mm": corrected_rainfall,
            "rainfall_change_mm": delta,
            "rainfall_change_percent": change_pct,
            "p10_mm": p10,
            "p50_mm": p50,
            "p90_mm": p90,
            "heavy_rain_probability": round(heavy_prob, 3),
            "heavy_threshold": self.heavy_threshold,
            "heavy_rain_alert": heavy_alert,
            "heavy_rain_decision": heavy_decision,
            "heavy_rain_event_threshold_mm": 64.5,
            "model_version": "VARSHA AI V2",
            "provenance_note": "Hypothetical scenario using existing VARSHA AI V2 models. This is not an operational NOAA GFS forecast."
        }

    def predict_single(self, district_name: str, raw_gfs_rainfall_mm: float, regime: str = "Normal Background", forecast_date: str = "2026-09-29", **kwargs) -> Dict[str, Any]:
        """Convenience helper for single district prediction."""
        feature_dict = {
            "district": district_name,
            "raw_gfs_rainfall_mm": raw_gfs_rainfall_mm,
            "forecast_date": forecast_date,
            **kwargs
        }
        pred = self.predict(feature_dict)
        # Ensure model_version is VARSHA AI V2
        pred["model_version"] = "VARSHA AI V2"
        return pred

# Global singleton
inference_service = V2InferenceService()

def get_v2_inference_service() -> V2InferenceService:
    """Return the global V2 inference service singleton."""
    return inference_service

