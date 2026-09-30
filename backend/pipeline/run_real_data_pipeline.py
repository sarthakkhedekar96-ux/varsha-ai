"""
Master Automated Ingestion, Cleaning, Feature Engineering & Verification Runner
Usage: python -m backend.pipeline.run_real_data_pipeline [--no-retrain]
"""

import os
import sys
import argparse
from datetime import datetime

# Set up project root in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from backend.pipeline.preprocessing import PreprocessingPipeline
from backend.pipeline.model_training import ModelTrainingPipeline, ModelInferenceEngine

def run_pipeline(retrain_models: bool = True):
    print("\n=======================================================")
    print(f"[VARSHAAI] REAL-DATA PIPELINE RUNNER - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=======================================================")

    # Step 1: Preprocessing & Ingestion
    print("\n[Stage 1/3] Executing Preprocessing & Feature Engineering...")
    preprocessor = PreprocessingPipeline()
    df_clean, df_feat = preprocessor.run_full_pipeline()
    print(f"[OK] Processed dataset ready with {len(df_clean)} rows.")

    # Step 2: Model Training & Verification (if requested)
    if retrain_models:
        print("\n[Stage 2/3] Executing Model Training & Verification Evaluation...")
        trainer = ModelTrainingPipeline()
        perf = trainer.run_training()
        print(f"[OK] Models retrained. RMSE Skill Improvement: +{perf['rmse_improvement_pct']}%")
    else:
        print("\n[Stage 2/3] Skipping model retraining (data refresh only).")

    # Step 3: Verify Inference Engine Ready
    print("\n[Stage 3/3] Auditing Runtime Model Inference Engine...")
    inference_engine = ModelInferenceEngine()
    if inference_engine.is_ready():
        sample_feature = {
            'raw_nwp_rainfall_mm': 42.0,
            'previous_1day_rainfall': 35.0,
            'previous_3day_rainfall': 28.0,
            'rolling_3day_mean': 30.0,
            'rolling_7day_mean': 25.0,
            'latitude': 18.5204,
            'longitude': 73.8567,
            'elevation': 560,
            'day_of_year': datetime.now().timetuple().tm_yday,
            'terrain': 'Orographic/Ghats'
        }
        res = inference_engine.predict(sample_feature)
        print(f"[OK] Inference test passed for Pune (Western Ghats):")
        print(f"  - Raw NWP: {sample_feature['raw_nwp_rainfall_mm']} mm")
        print(f"  - AI Corrected: {res['aiCorrected']} mm (Delta: {res['delta']} mm)")
        print(f"  - Predicted Regime: {res['regime']}")
        print(f"  - Uncertainty Quantiles: P10={res['uncertainty']['p10']}mm, P50={res['uncertainty']['p50']}mm, P90={res['uncertainty']['p90']}mm")
        print(f"  - Heavy Rain Prob (>64.5mm): {res['heavyProb']['p64']}%")
    else:
        print("[WARN] Warning: Models not ready in data/models. Running on dynamic heuristic fallback.")

    print("\n=======================================================")
    print("[SUCCESS] VARSHAAI REAL-DATA PIPELINE EXECUTION SUCCEEDED")
    print("=======================================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run VARSHAAI Real-Data Pipeline")
    parser.add_argument("--no-retrain", dest="retrain", action="store_false", help="Skip model retraining")
    args = parser.parse_args()
    
    run_pipeline(retrain_models=args.retrain)
