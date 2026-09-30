"""
Repo Hygiene Audit Script for VARSHA AI
"""
import os

exclude_dirs = {'node_modules', 'dist', '.venv', '.venv-test', 'venv', '__pycache__', '.vite', '.git'}

all_files = []
ignored_large_files = []

for root, dirs, files in os.walk('.'):
    # filter directories in place
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if file.startswith('.env') and file != '.env.example':
            continue
        path = os.path.join(root, file).replace('\\', '/')
        if path.startswith('./'):
            path = path[2:]
        if path == 'data/geo/india_district_full.geojson':
            ignored_large_files.append((path, os.path.getsize(path)))
            continue
        try:
            sz = os.path.getsize(path)
            all_files.append((path, sz))
        except Exception:
            pass

all_files.sort(key=lambda x: x[1], reverse=True)

print("=" * 70)
print("REPO HYGIENE & FILE SIZE AUDIT")
print("=" * 70)

print(f"Total tracked deployment candidate files: {len(all_files)}")
print(f"Any file over 50 MB (52,428,800 bytes): {'YES' if any(sz > 50*1024*1024 for _, sz in all_files) else 'NO (ALL UNDER 50MB)'}")

print("\nTop 5 Largest Deployment Candidate Files:")
for i, (path, sz) in enumerate(all_files[:5], 1):
    print(f"  {i}. {path:<60} : {sz / 1024 / 1024:6.2f} MB ({sz:,} bytes)")

print("\nMandatory Deployment Files Check:")
required_patterns = [
    'requirements.txt',
    'vercel.json',
    '.env.example',
    '.gitignore',
    'public/geo/india_districts_simplified.geojson',
    'data/features/real_forecast_observation_training_dataset.csv',
    'models/v2_occurrence_classifier.joblib',
    'models/v2_amount_regressor.joblib',
    'models/v2_heavy_rain_classifier.joblib',
    'models/quantile_p10.joblib',
    'models/quantile_p50.joblib',
    'models/quantile_p90.joblib',
]

for req in required_patterns:
    exists = any(path == req for path, _ in all_files)
    status = "PRESENT" if exists else "MISSING"
    print(f"  [{status}] {req}")

print("\nExcluded Large / Secret Files Check:")
excluded_candidates = [
    'node_modules',
    'dist',
    'data/geo/india_district_full.geojson'
]
for exc in excluded_candidates:
    included = any(path.startswith(exc) for path, _ in all_files)
    status = "PROPERLY EXCLUDED" if not included else "ACCIDENTALLY INCLUDED"
    print(f"  [{status}] {exc}")

secret_env_included = any(path == '.env' or (path.startswith('.env.') and path != '.env.example') for path, _ in all_files)
print(f"  [{'PROPERLY EXCLUDED' if not secret_env_included else 'ACCIDENTALLY INCLUDED'}] .env / .env.* secrets")
print("=" * 70)
