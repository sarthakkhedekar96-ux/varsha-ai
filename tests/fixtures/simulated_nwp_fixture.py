"""
Historical Simulation Fixture (Unit Testing & Baseline Comparison Only)
DO NOT USE IN PRODUCTION PREPROCESSING OR MODEL TRAINING.
"""

import numpy as np

def generate_simulated_nwp_fixture(obs_val: float, terrain: str, seed: int = 42) -> float:
    """
    Historical simulated NWP calculation (retained strictly for regression tests).
    Not suitable for operational NWP claims.
    """
    rng = np.random.RandomState(seed=seed)
    nwp_bias_ratio = 0.58 if terrain == 'Orographic/Ghats' else 0.78 if terrain == 'Coastal' else 0.88
    nwp_noise = float(rng.normal(0, 4.0))
    return round(max(0.0, (obs_val * nwp_bias_ratio) + nwp_noise), 1)
