// Re-export from authoritative src/api/client.js
export * from '../api/client';

/**
 * Simulate What-If scenario dynamically using canonical physics rules
 */
export async function simulateHypotheticalScenario(districtId, gfsMm, regime) {
  const gfs = Number(gfsMm) || 0;
  // Two-Stage Gated ML Approximation logic for client-side What-If:
  let multiplier = 1.15;
  if (regime === 'Orographic / Western Ghats' || regime === 'OROGRAPHIC_RAINFALL') multiplier = 1.35;
  if (regime === 'Coastal Convergence' || regime === 'COASTAL_RAINFALL') multiplier = 1.25;
  if (regime === 'Break Monsoon' || regime === 'BREAK_MONSOON') multiplier = 0.85;
  if (regime === 'Monsoon Depression / Cyclonic' || regime === 'DEPRESSION') multiplier = 1.45;

  const v2 = gfs === 0 ? 0 : Math.round(gfs * multiplier * 10) / 10;
  const delta = Math.round((v2 - gfs) * 10) / 10;
  const heavyThreshold = 64.5;
  const heavyProb = v2 >= heavyThreshold ? Math.min(99, Math.round(50 + (v2 - heavyThreshold) * 1.5)) : (v2 >= 35.5 ? Math.round(15 + (v2 / 35.5) * 15) : Math.round((v2 / 35.5) * 12));
  const rainProb = gfs > 0 ? Math.min(99, Math.round(70 + Math.min(29, gfs))) : 12;

  return {
    v2,
    delta,
    gates: {
      occurrence: { prob: rainProb, passed: rainProb >= 60 },
      moderate: { prob: Math.min(rainProb, Math.round(heavyProb * 1.2)), passed: v2 >= 35.5 },
      heavy: { prob: heavyProb, passed: heavyProb >= 20, isAlert: heavyProb >= 20 },
      veryHeavy: { prob: Math.max(0, Math.round(heavyProb * 0.4)), passed: v2 >= 115.6 }
    }
  };
}
