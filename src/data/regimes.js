// VARSHA AI Canonical Weather Regimes Definition & Static Glossary
// Meteorological classifications for Indian Monsoon dynamics.

export const WEATHER_REGIMES = {
  NORMAL_BACKGROUND: {
    id: 'NORMAL_BACKGROUND',
    name: 'Normal Background Monsoon',
    code: 'NORM',
    color: '#38BDF8',
    badgeClass: 'badge-normal',
    description: 'Quasi-stationary synoptic monsoon background flow without localized convective vortex or depression forcing.',
    typicalNwpBias: 'Slight positive bias in light rainfall over broad plains; well-handled by standard parameterization.',
    keyPredictors: ['Zonal Wind 850hPa', 'Column Water Vapor', 'Surface Pressure Gradient', 'Low-level Convergence'],
    recommendedModel: 'Two-Stage Gated GBDT Regressor'
  },
  MONSOON_LOW: {
    id: 'MONSOON_LOW',
    name: 'Monsoon Low System',
    code: 'MLO',
    color: '#00F2FE',
    badgeClass: 'badge-info',
    description: 'Low pressure system over Bay of Bengal or Central India causing intense regional convergence.',
    typicalNwpBias: 'Underpredicts rainfall core intensity by 20-35%; overspreads light rain on peripheries.',
    keyPredictors: ['Geopotential Height Anomaly (850hPa)', 'Vorticity', 'Precipitable Water', 'CAPE'],
    recommendedModel: 'Low-Pressure Synoptic XGBoost Regressor'
  },
  ACTIVE_MONSOON: {
    id: 'ACTIVE_MONSOON',
    name: 'Active Monsoon Phase',
    code: 'ACT',
    color: '#3B82F6',
    badgeClass: 'badge-info',
    description: 'Monsoon trough south of normal position; strong cross-equatorial flow and widespread rainfall.',
    typicalNwpBias: 'High spatial variance; tends to overestimate light rain frequency but underestimate peak squalls.',
    keyPredictors: ['Monsoon Trough Latitude', 'Low-Level Jet Speed (850hPa)', 'Specific Humidity'],
    recommendedModel: 'Active Dynamics Quantile Forest'
  },
  OROGRAPHIC_RAINFALL: {
    id: 'OROGRAPHIC_RAINFALL',
    name: 'Orographic / Western Ghats',
    code: 'ORO',
    color: '#8B5CF6',
    badgeClass: 'badge-normal',
    description: 'Terrain-forced ascent over Western Ghats or Northeast Himalayan foothills.',
    typicalNwpBias: 'Severe elevation smooth error; raw GFS/NCUM underestimates crest rainfall by up to 50%.',
    keyPredictors: ['Terrain Slope Aspect', 'Upslope Wind Component', 'Boundary Layer Stability'],
    recommendedModel: 'High-Res Elevation-Aware LightGBM'
  },
  COASTAL_RAINFALL: {
    id: 'COASTAL_RAINFALL',
    name: 'Coastal Convergence',
    code: 'CST',
    color: '#10B981',
    badgeClass: 'badge-normal',
    description: 'Sea-breeze front interactions and coastal land-sea friction gradients along Konkan & Malabar.',
    typicalNwpBias: 'Phase lag in diurnal cycle (peaks early morning); offshore displacement errors.',
    keyPredictors: ['Land-Sea Delta T', 'Coastal Offshore Wind Convergence', 'Relative Humidity 925hPa'],
    recommendedModel: 'Coastal Microphysics XGBoost'
  },
  DEPRESSION: {
    id: 'DEPRESSION',
    name: 'Monsoon Depression / Cyclonic',
    code: 'DEP',
    color: '#EF4444',
    badgeClass: 'badge-critical',
    description: 'Well-marked deep low/depression with organized deep convection eyewall-like structure.',
    typicalNwpBias: 'Track bias leading to 80-120km spatial misplacement of maximum precipitation band.',
    keyPredictors: ['Central Pressure Deficit', 'Vertical Wind Shear', '850-200hPa Layer Moisture'],
    recommendedModel: 'Extreme Vortex Trajectory Regressor'
  },
  BREAK_MONSOON: {
    id: 'BREAK_MONSOON',
    name: 'Break Monsoon Condition',
    code: 'BRK',
    color: '#F59E0B',
    badgeClass: 'badge-warning',
    description: 'Monsoon trough shifted north to Himalayan foothills; dry spell across central and peninsular India.',
    typicalNwpBias: 'Spurious rainfall triggers in central India; fails to fully suppress convective parameterization.',
    keyPredictors: ['Trough Axis Latitude', 'Central India Humidity Deficit', 'Foothill Orographic Convergence'],
    recommendedModel: 'Zero-Inflated Gated Classifier'
  },
  WESTERN_DISTURBANCE: {
    id: 'WESTERN_DISTURBANCE',
    name: 'Western Disturbance',
    code: 'WD',
    color: '#6366F1',
    badgeClass: 'badge-normal',
    description: 'Extra-tropical storm originating in the Mediterranean bringing non-monsoonal precipitation to north India.',
    typicalNwpBias: 'Underpredicts snowfall/rainfall in leeward valleys; timing offset of 6-12 hours.',
    keyPredictors: ['Upper-Air Westerly Jet 200hPa', '500hPa Trough Amplitude', 'Low-level Moisture Advection'],
    recommendedModel: 'Sub-Tropical Jet Aware Gradient Booster'
  },
  OFFSHORE_TROUGH: {
    id: 'OFFSHORE_TROUGH',
    name: 'Offshore Trough / Vortex',
    code: 'OST',
    color: '#06B6D4',
    badgeClass: 'badge-info',
    description: 'Narrow trough of low pressure off the West Coast of India extending from South Gujarat to Kerala.',
    typicalNwpBias: 'Underpredicts extreme narrow coastal downpours; smooths intense 10-km rain bands.',
    keyPredictors: ['Along-Coast Pressure Gradient', 'Surface Wind Shear', 'Offshore SST Gradient'],
    recommendedModel: 'Coastal Boundary Layer Regressor'
  }
};

export function getRegimeInfo(regimeKey) {
  if (!regimeKey) return WEATHER_REGIMES.NORMAL_BACKGROUND;
  const cleanKey = String(regimeKey).toUpperCase().replace(/\s+/g, '_');
  return WEATHER_REGIMES[cleanKey] || {
    id: cleanKey,
    name: String(regimeKey).replace(/_/g, ' '),
    code: cleanKey.slice(0, 3).toUpperCase(),
    color: '#3B82F6',
    badgeClass: 'badge-info',
    description: 'Identified meteorological regime state.',
    typicalNwpBias: 'Standard numerical NWP bias pattern.',
    keyPredictors: ['Zonal Wind', 'Moisture Convergence', 'Surface Temperature'],
    recommendedModel: 'VARSHA AI V2 Post-Processor'
  };
}
