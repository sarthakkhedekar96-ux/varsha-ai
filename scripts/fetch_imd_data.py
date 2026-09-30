import os
import sys
import argparse
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.pipeline.preprocessing import PreprocessingPipeline
from backend.pipeline.model_training import ModelTrainingPipeline

def main():
    parser = argparse.ArgumentParser(description="Automated IMD Real-Data Ingestion & ML Pipeline Runner")
    parser.add_argument("--force", action="store_true", help="Force re-fetch from IMD MAUSAM portal")
    parser.add_argument("--train-only", action="store_true", help="Skip ingestion and run model training on existing clean CSV")
    
    args = parser.parse_args()

    print(f"=== IMD PIPELINE EXECUTION STARTED: {datetime.now().isoformat()} ===")
    
    if not args.train_only:
        print("[Pipeline] Step 1 & 2: Executing Real IMD Ingestion & Preprocessing...")
        preprocessing = PreprocessingPipeline()
        preprocessing.run_full_pipeline()

    print("[Pipeline] Step 3: Executing Model Training & Verification Evaluation...")
    trainer = ModelTrainingPipeline()
    trainer.run_training()

    print("\n[Pipeline] SUCCESS: Real IMD Data Pipeline Execution Complete!")

if __name__ == "__main__":
    main()
