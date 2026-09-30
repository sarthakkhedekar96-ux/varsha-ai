import joblib
import json
import pandas as pd
import numpy as np
from sklearn.inspection import permutation_importance

df = pd.read_csv('data/features/real_forecast_observation_training_dataset.csv')
df['date'] = pd.to_datetime(df['date'])
unique_dates = sorted(df['date'].unique())
val_dates = unique_dates[int(len(unique_dates)*0.70):int(len(unique_dates)*0.85)]
val_df = df[df['date'].isin(val_dates)]

base_features = [
    'raw_gfs_rainfall_mm', 'previous_1day_rainfall', 'previous_3day_rainfall',
    'previous_7day_rainfall', 'rolling_3day_mean', 'rolling_7day_mean',
    'latitude', 'longitude', 'elevation', 'day_of_year', 'month'
]
regime_features = base_features + ['regime_encoded']

model = joblib.load('models/regime_aware.joblib')
X_val = val_df[regime_features].values
y_val = val_df['era5_land_reference_rainfall_mm'].values

r = permutation_importance(model, X_val, y_val, n_repeats=5, random_state=42)

results = []
for idx in r.importances_mean.argsort()[::-1]:
    feat = regime_features[idx]
    mean_imp = float(r.importances_mean[idx])
    std_imp = float(r.importances_std[idx])
    results.append({'feature': feat, 'importance_mean': mean_imp, 'importance_std': std_imp})
    print(f'{feat:25s}: {mean_imp:.4f} +/- {std_imp:.4f}')

with open('reports/feature_importance.json', 'w') as f:
    json.dump(results, f, indent=2)
