// VARSHA AI Core Data Architecture & Domain Models
// Authoritative Observed Target: IMD MAUSAM Portal Data Standards

export const WEATHER_REGIMES = {
  MONSOON_LOW: {
    id: 'MONSOON_LOW',
    name: 'Monsoon Low System',
    code: 'MLO',
    color: '#00F2FE',
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
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
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
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
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    description: 'Terrain-forced forced ascent over Western Ghats or Northeast Himalayan foothills.',
    typicalNwpBias: 'Severe elevation smooth error; raw GFS/NCUM underestimates crest rainfall by up to 50%.',
    keyPredictors: ['Terrain Slope Aspect', 'Upslope Wind Component', 'Boundary Layer Stability'],
    recommendedModel: 'High-Res Elevation-Aware LightGBM'
  },
  COASTAL_RAINFALL: {
    id: 'COASTAL_RAINFALL',
    name: 'Coastal Convergence',
    code: 'CST',
    color: '#10B981',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    description: 'Sea-breeze front interactions and coastal land-sea friction gradients along Konkan & Malabar.',
    typicalNwpBias: 'Phase lag in diurnal cycle (peaks early morning); offshore offshore displacement errors.',
    keyPredictors: ['Land-Sea Delta T', 'Coastal Offshore Wind Convergence', 'Relative Humidity 925hPa'],
    recommendedModel: 'Coastal Microphysics XGBoost'
  },
  DEPRESSION: {
    id: 'DEPRESSION',
    name: 'Monsoon Depression / Cyclonic',
    code: 'DEP',
    color: '#EF4444',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    description: 'Well-marked deep low/depression with organized deep convection eyewall-like structure.',
    typicalNwpBias: 'Track bias leading to 80-120km spatial misplacement of maximum precipitation band.',
    keyPredictors: ['Central Pressure Deficit', 'Vertical Wind Shear', '850-200hPa Layer Moisture'],
    recommendedModel: 'Extreme Vortex Trajectory Regressor'
  },
  BREAK_MONSOON: {
    id: 'BREAK_MONSOON',
    name: 'Break Monsoon Phase',
    code: 'BRK',
    color: '#F59E0B',
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    description: 'Monsoon trough shifts to Himalayan foothills; central India dry while foothills get heavy rain.',
    typicalNwpBias: 'Fails to clear central India rainfall fast enough; underestimates foothill orographic surges.',
    keyPredictors: ['Trough Axis Distance', '500hPa Geopotential Ridge', 'Dry Air Advection'],
    recommendedModel: 'Break-Phase Anomaly Corrector'
  },
  WESTERN_DISTURBANCE: {
    id: 'WESTERN_DISTURBANCE',
    name: 'Western Disturbance (WD)',
    code: 'WDB',
    color: '#EC4899',
    badgeClass: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
    description: 'Extra-tropical upper-level trough originating in Mediterranean, affecting NW India.',
    typicalNwpBias: 'Underestimates hail probability and extreme mountain snow/rain transition line.',
    keyPredictors: ['Jet Stream Velocity (200hPa)', '500hPa Trough Depth', 'PWAT Transport'],
    recommendedModel: 'Mid-Latitude Synoptic Model'
  },
  CONVECTIVE_LOCAL: {
    id: 'CONVECTIVE_LOCAL',
    name: 'Localized Convective Cluster',
    code: 'CNV',
    color: '#6366F1',
    badgeClass: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
    description: 'Isolated severe afternoon convective storms driven by surface heating & moisture buildup.',
    typicalNwpBias: 'Poor pinpointing of sub-grid scale cells; misses peak 1-hour rainfall rates.',
    keyPredictors: ['SBCAPE (>2500 J/kg)', 'Lifted Index', 'CIN Breached', 'Dewpoint Depression'],
    recommendedModel: 'Sub-Grid Convective Quantile Estimator'
  },
  NORMAL_BACKGROUND: {
    id: 'NORMAL_BACKGROUND',
    name: 'Normal Climatological',
    code: 'NRM',
    color: '#94A3B8',
    badgeClass: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
    description: 'Standard monsoon background precipitation pattern without dominant synoptic drivers.',
    typicalNwpBias: 'Slight positive drizzle bias during dry spells.',
    keyPredictors: ['Climatological Mean', 'Soil Moisture', 'Surface Temp'],
    recommendedModel: 'Standard Linear Bias Corrector'
  }
};

export const DISTRICTS_DATA = [
  {
    id: 'pune',
    name: 'Pune',
    state: 'Maharashtra',
    subdivision: 'Madhya Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    elevation: 560,
    terrain: 'Orographic/Ghats',
    nwpForecast: 42.0,
    aiCorrected: 59.4,
    delta: 17.4,
    observedImd: 61.2,
    regime: 'ACTIVE_MONSOON',
    regimeConfidence: 91,
    regimeTrend: 'Intensifying',
    heavyProb: { p15: 94, p35: 82, p64: 67, p115: 18 },
    uncertainty: { p10: 44.0, p50: 59.4, p90: 82.1 },
    confidenceScore: {
      overall: 87,
      observationCoverage: 95,
      nwpCompleteness: 98,
      spatialConsistency: 89,
      historicalSimilarity: 87
    },
    shapExplanations: [
      { feature: 'Historical NWP Bias', value: 'Underprediction tendency in Active Regime', impactMm: 8.5 },
      { feature: 'Active Monsoon Regime', value: 'Strong Low-Level Jet advection', impactMm: 4.8 },
      { feature: 'Atmospheric Moisture', value: 'PWAT > 62 mm', impactMm: 2.7 },
      { feature: 'Western Ghats Orography', value: 'Upslope wind speed 28 knots', impactMm: 2.1 },
      { feature: 'Recent Rain Trend', value: 'Persistence ratio 1.24', impactMm: -0.7 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 32.0, ai: 41.5 },
      { time: 'T-18h', nwp: 36.5, ai: 48.0 },
      { time: 'T-12h', nwp: 39.0, ai: 52.8 },
      { time: 'T-6h', nwp: 41.2, ai: 57.0 },
      { time: 'T-0', nwp: 42.0, ai: 59.4 }
    ],
    riskLevel: 'HIGH',
    historicalAnalogs: [
      { date: '2021-07-18', similarity: 91, observedRain: 64.5, regime: 'ACTIVE_MONSOON' },
      { date: '2019-08-04', similarity: 87, observedRain: 58.2, regime: 'MONSOON_LOW' },
      { date: '2022-07-23', similarity: 84, observedRain: 62.0, regime: 'ACTIVE_MONSOON' }
    ]
  },
  {
    id: 'mumbai',
    name: 'Mumbai Suburban',
    state: 'Maharashtra',
    subdivision: 'Konkan & Goa',
    lat: 19.0760,
    lng: 72.8777,
    elevation: 14,
    terrain: 'Coastal',
    nwpForecast: 84.0,
    aiCorrected: 138.5,
    delta: 54.5,
    observedImd: 142.0,
    regime: 'COASTAL_RAINFALL',
    regimeConfidence: 94,
    regimeTrend: 'Strongly Intensifying',
    heavyProb: { p15: 99, p35: 96, p64: 91, p115: 64 },
    uncertainty: { p10: 108.0, p50: 138.5, p90: 176.0 },
    confidenceScore: {
      overall: 92,
      observationCoverage: 98,
      nwpCompleteness: 99,
      spatialConsistency: 92,
      historicalSimilarity: 91
    },
    shapExplanations: [
      { feature: 'Coastal Convergence Correction', value: 'High sea-breeze front friction', impactMm: 28.2 },
      { feature: 'Low Pressure Proximity', value: 'Bay depression trough extending west', impactMm: 16.4 },
      { feature: 'High Relative Humidity', value: 'Surface to 700hPa RH > 94%', impactMm: 7.1 },
      { feature: 'CAPE Release', value: 'SBCAPE 1850 J/kg', impactMm: 2.8 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 68.0, ai: 98.0 },
      { time: 'T-18h', nwp: 74.0, ai: 112.5 },
      { time: 'T-12h', nwp: 79.0, ai: 124.0 },
      { time: 'T-6h', nwp: 82.5, ai: 132.8 },
      { time: 'T-0', nwp: 84.0, ai: 138.5 }
    ],
    riskLevel: 'EXTREME',
    historicalAnalogs: [
      { date: '2020-08-05', similarity: 94, observedRain: 154.0, regime: 'COASTAL_RAINFALL' },
      { date: '2019-07-02', similarity: 89, observedRain: 135.0, regime: 'COASTAL_RAINFALL' },
      { date: '2021-07-16', similarity: 86, observedRain: 142.5, regime: 'MONSOON_LOW' }
    ]
  },
  {
    id: 'wayanad',
    name: 'Wayanad',
    state: 'Kerala',
    subdivision: 'Kerala & Mahe',
    lat: 11.6854,
    lng: 76.1320,
    elevation: 950,
    terrain: 'Orographic/Ghats',
    nwpForecast: 92.0,
    aiCorrected: 164.2,
    delta: 72.2,
    observedImd: 168.0,
    regime: 'OROGRAPHIC_RAINFALL',
    regimeConfidence: 96,
    regimeTrend: 'Extremely Severe Peak',
    heavyProb: { p15: 100, p35: 98, p64: 95, p115: 78 },
    uncertainty: { p10: 132.0, p50: 164.2, p90: 210.5 },
    confidenceScore: {
      overall: 89,
      observationCoverage: 91,
      nwpCompleteness: 98,
      spatialConsistency: 88,
      historicalSimilarity: 92
    },
    shapExplanations: [
      { feature: 'Topographic Moisture Squeeze', value: 'High ridge forcing at 950m elevation', impactMm: 42.0 },
      { feature: 'Offshore Trough Strength', value: 'Strong offshore vortex along Kerala coast', impactMm: 21.5 },
      { feature: 'Low-Level Jet Velocity', value: '850hPa wind speed 38 knots', impactMm: 8.7 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 62.0, ai: 110.0 },
      { time: 'T-18h', nwp: 75.0, ai: 132.0 },
      { time: 'T-12h', nwp: 84.0, ai: 148.5 },
      { time: 'T-6h', nwp: 89.0, ai: 158.0 },
      { time: 'T-0', nwp: 92.0, ai: 164.2 }
    ],
    riskLevel: 'EXTREME',
    historicalAnalogs: [
      { date: '2024-07-30', similarity: 96, observedRain: 180.0, regime: 'OROGRAPHIC_RAINFALL' },
      { date: '2019-08-08', similarity: 92, observedRain: 172.0, regime: 'OROGRAPHIC_RAINFALL' },
      { date: '2018-08-15', similarity: 88, observedRain: 195.0, regime: 'ACTIVE_MONSOON' }
    ]
  },
  {
    id: 'east_khasi',
    name: 'East Khasi Hills (Cherrapunji)',
    state: 'Meghalaya',
    subdivision: 'NMMT & Meghalaya',
    lat: 25.2986,
    lng: 91.7324,
    elevation: 1484,
    terrain: 'Orographic/Ghats',
    nwpForecast: 180.0,
    aiCorrected: 285.0,
    delta: 105.0,
    observedImd: 298.5,
    regime: 'OROGRAPHIC_RAINFALL',
    regimeConfidence: 97,
    regimeTrend: 'Extremely Severe',
    heavyProb: { p15: 100, p35: 100, p64: 98, p115: 92 },
    uncertainty: { p10: 230.0, p50: 285.0, p90: 345.0 },
    confidenceScore: {
      overall: 94,
      observationCoverage: 96,
      nwpCompleteness: 99,
      spatialConsistency: 91,
      historicalSimilarity: 95
    },
    shapExplanations: [
      { feature: 'Funnel Orographic Trap', value: 'Khasi Hills funneling Bay winds', impactMm: 68.0 },
      { feature: 'Bay Moisture Inflow', value: 'Continuous southerly 35 knot jet', impactMm: 28.0 },
      { feature: 'Historical GFS Deficit', value: 'Known GFS 40% undercount in Khasi plateau', impactMm: 9.0 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 140.0, ai: 220.0 },
      { time: 'T-18h', nwp: 155.0, ai: 245.0 },
      { time: 'T-12h', nwp: 168.0, ai: 265.0 },
      { time: 'T-6h', nwp: 175.0, ai: 278.0 },
      { time: 'T-0', nwp: 180.0, ai: 285.0 }
    ],
    riskLevel: 'EXTREME',
    historicalAnalogs: [
      { date: '2022-06-17', similarity: 97, observedRain: 310.0, regime: 'OROGRAPHIC_RAINFALL' },
      { date: '2020-07-21', similarity: 91, observedRain: 280.0, regime: 'OROGRAPHIC_RAINFALL' }
    ]
  },
  {
    id: 'cuttack',
    name: 'Cuttack',
    state: 'Odisha',
    subdivision: 'Odisha',
    lat: 20.4625,
    lng: 85.8828,
    elevation: 36,
    terrain: 'Plains',
    nwpForecast: 58.0,
    aiCorrected: 94.8,
    delta: 36.8,
    observedImd: 96.0,
    regime: 'MONSOON_LOW',
    regimeConfidence: 93,
    regimeTrend: 'Developing Core',
    heavyProb: { p15: 98, p35: 91, p64: 79, p115: 38 },
    uncertainty: { p10: 72.0, p50: 94.8, p90: 122.0 },
    confidenceScore: {
      overall: 91,
      observationCoverage: 96,
      nwpCompleteness: 97,
      spatialConsistency: 93,
      historicalSimilarity: 90
    },
    shapExplanations: [
      { feature: 'Bay Low Pressure Core', value: 'Depression landfall within 120km', impactMm: 22.4 },
      { feature: 'Vorticity Advection', value: 'Positive vorticity maximum 850hPa', impactMm: 11.2 },
      { feature: 'Coastal Convergence', value: 'High low-level moisture transport', impactMm: 3.2 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 38.0, ai: 55.0 },
      { time: 'T-18h', nwp: 45.0, ai: 68.0 },
      { time: 'T-12h', nwp: 51.0, ai: 80.0 },
      { time: 'T-6h', nwp: 55.0, ai: 89.0 },
      { time: 'T-0', nwp: 58.0, ai: 94.8 }
    ],
    riskLevel: 'HIGH',
    historicalAnalogs: [
      { date: '2020-09-20', similarity: 93, observedRain: 98.0, regime: 'MONSOON_LOW' },
      { date: '2021-09-13', similarity: 88, observedRain: 92.5, regime: 'DEPRESSION' }
    ]
  },
  {
    id: 'shimla',
    name: 'Shimla',
    state: 'Himachal Pradesh',
    subdivision: 'Himachal Pradesh',
    lat: 31.1048,
    lng: 77.1734,
    elevation: 2276,
    terrain: 'Himalayan',
    nwpForecast: 34.0,
    aiCorrected: 68.5,
    delta: 34.5,
    observedImd: 71.0,
    regime: 'WESTERN_DISTURBANCE',
    regimeConfidence: 89,
    regimeTrend: 'Interaction Peak',
    heavyProb: { p15: 95, p35: 84, p64: 62, p115: 14 },
    uncertainty: { p10: 48.0, p50: 68.5, p90: 95.0 },
    confidenceScore: {
      overall: 85,
      observationCoverage: 88,
      nwpCompleteness: 96,
      spatialConsistency: 84,
      historicalSimilarity: 86
    },
    shapExplanations: [
      { feature: 'Monsoon-WD Interaction', value: 'Upper trough meeting easterly moisture', impactMm: 21.0 },
      { feature: 'Complex Alpine Topography', value: 'Valley breeze convergence', impactMm: 9.8 },
      { feature: '500hPa Vorticity', value: 'Deep trough over J&K and HP', impactMm: 3.7 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 22.0, ai: 39.0 },
      { time: 'T-18h', nwp: 26.0, ai: 48.0 },
      { time: 'T-12h', nwp: 29.0, ai: 56.0 },
      { time: 'T-6h', nwp: 32.0, ai: 63.0 },
      { time: 'T-0', nwp: 34.0, ai: 68.5 }
    ],
    riskLevel: 'HIGH',
    historicalAnalogs: [
      { date: '2023-07-10', similarity: 92, observedRain: 76.0, regime: 'WESTERN_DISTURBANCE' },
      { date: '2021-10-18', similarity: 85, observedRain: 65.0, regime: 'WESTERN_DISTURBANCE' }
    ]
  },
  {
    id: 'nashik',
    name: 'Nashik',
    state: 'Maharashtra',
    subdivision: 'Madhya Maharashtra',
    lat: 19.9975,
    lng: 73.7898,
    elevation: 600,
    terrain: 'Orographic/Ghats',
    nwpForecast: 31.0,
    aiCorrected: 44.2,
    delta: 13.2,
    observedImd: 45.0,
    regime: 'ACTIVE_MONSOON',
    regimeConfidence: 88,
    regimeTrend: 'Steady',
    heavyProb: { p15: 88, p35: 64, p64: 28, p115: 4 },
    uncertainty: { p10: 32.0, p50: 44.2, p90: 59.0 },
    confidenceScore: {
      overall: 88,
      observationCoverage: 94,
      nwpCompleteness: 98,
      spatialConsistency: 87,
      historicalSimilarity: 86
    },
    shapExplanations: [
      { feature: 'Lee-Side Ghats Drag', value: 'Rainshadow effect correction', impactMm: 8.0 },
      { feature: 'Moisture Advection', value: 'Westerly flow across Trimbakeshwar', impactMm: 5.2 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 25.0, ai: 34.0 },
      { time: 'T-18h', nwp: 27.0, ai: 38.0 },
      { time: 'T-12h', nwp: 29.0, ai: 41.0 },
      { time: 'T-6h', nwp: 30.5, ai: 43.0 },
      { time: 'T-0', nwp: 31.0, ai: 44.2 }
    ],
    riskLevel: 'MODERATE',
    historicalAnalogs: [
      { date: '2022-07-14', similarity: 88, observedRain: 48.0, regime: 'ACTIVE_MONSOON' }
    ]
  },
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    subdivision: 'East Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    elevation: 431,
    terrain: 'Plains',
    nwpForecast: 18.0,
    aiCorrected: 12.5,
    delta: -5.5,
    observedImd: 11.0,
    regime: 'BREAK_MONSOON',
    regimeConfidence: 86,
    regimeTrend: 'Subsidence Dry Phase',
    heavyProb: { p15: 38, p35: 14, p64: 3, p115: 0 },
    uncertainty: { p10: 6.0, p50: 12.5, p90: 22.0 },
    confidenceScore: {
      overall: 90,
      observationCoverage: 95,
      nwpCompleteness: 98,
      spatialConsistency: 92,
      historicalSimilarity: 88
    },
    shapExplanations: [
      { feature: 'Break Monsoon Suppression', value: 'Anticyclonic flow at 700hPa', impactMm: -4.2 },
      { feature: 'Low PWAT', value: 'Moisture deficit in mid-troposphere', impactMm: -1.3 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 22.0, ai: 16.0 },
      { time: 'T-18h', nwp: 20.0, ai: 14.5 },
      { time: 'T-12h', nwp: 19.0, ai: 13.2 },
      { time: 'T-6h', nwp: 18.2, ai: 12.8 },
      { time: 'T-0', nwp: 18.0, ai: 12.5 }
    ],
    riskLevel: 'LOW',
    historicalAnalogs: [
      { date: '2021-08-12', similarity: 87, observedRain: 10.5, regime: 'BREAK_MONSOON' }
    ]
  },
  {
    id: 'lucknow',
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    subdivision: 'East Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
    elevation: 123,
    terrain: 'Plains',
    nwpForecast: 28.0,
    aiCorrected: 38.6,
    delta: 10.6,
    observedImd: 39.5,
    regime: 'MONSOON_LOW',
    regimeConfidence: 87,
    regimeTrend: 'Moderate Inflow',
    heavyProb: { p15: 84, p35: 52, p64: 18, p115: 2 },
    uncertainty: { p10: 26.0, p50: 38.6, p90: 54.0 },
    confidenceScore: {
      overall: 89,
      observationCoverage: 94,
      nwpCompleteness: 97,
      spatialConsistency: 88,
      historicalSimilarity: 89
    },
    shapExplanations: [
      { feature: 'Monsoon Trough Proximity', value: 'Trough axis positioned over central UP', impactMm: 7.4 },
      { feature: 'Low-Level Moisture Influx', value: 'Easterly wind speed 18 knots', impactMm: 3.2 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 20.0, ai: 29.0 },
      { time: 'T-18h', nwp: 23.0, ai: 32.5 },
      { time: 'T-12h', nwp: 25.0, ai: 35.0 },
      { time: 'T-6h', nwp: 27.0, ai: 37.2 },
      { time: 'T-0', nwp: 28.0, ai: 38.6 }
    ],
    riskLevel: 'MODERATE',
    historicalAnalogs: [
      { date: '2022-09-16', similarity: 89, observedRain: 41.0, regime: 'MONSOON_LOW' }
    ]
  },
  {
    id: 'kolkata',
    name: 'Kolkata',
    state: 'West Bengal',
    subdivision: 'Gangetic West Bengal',
    lat: 22.5726,
    lng: 88.3639,
    elevation: 9,
    terrain: 'Coastal',
    nwpForecast: 45.0,
    aiCorrected: 67.2,
    delta: 22.2,
    observedImd: 69.0,
    regime: 'COASTAL_RAINFALL',
    regimeConfidence: 92,
    regimeTrend: 'Bay Feeder Surge',
    heavyProb: { p15: 95, p35: 81, p64: 58, p115: 12 },
    uncertainty: { p10: 48.0, p50: 67.2, p90: 89.0 },
    confidenceScore: {
      overall: 93,
      observationCoverage: 97,
      nwpCompleteness: 99,
      spatialConsistency: 91,
      historicalSimilarity: 92
    },
    shapExplanations: [
      { feature: 'Bay Estuary Moisture Pulse', value: 'Strong maritime moisture convergence', impactMm: 15.2 },
      { feature: 'Convective Cell Sprawl', value: 'Afternoon radar cell mergers', impactMm: 7.0 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 32.0, ai: 48.0 },
      { time: 'T-18h', nwp: 37.0, ai: 54.0 },
      { time: 'T-12h', nwp: 40.0, ai: 60.0 },
      { time: 'T-6h', nwp: 43.0, ai: 64.5 },
      { time: 'T-0', nwp: 45.0, ai: 67.2 }
    ],
    riskLevel: 'HIGH',
    historicalAnalogs: [
      { date: '2021-09-29', similarity: 91, observedRain: 72.0, regime: 'COASTAL_RAINFALL' }
    ]
  },
  {
    id: 'patna',
    name: 'Patna',
    state: 'Bihar',
    subdivision: 'Bihar',
    lat: 25.5941,
    lng: 85.1376,
    elevation: 53,
    terrain: 'Plains',
    nwpForecast: 22.0,
    aiCorrected: 31.5,
    delta: 9.5,
    observedImd: 33.0,
    regime: 'CONVECTIVE_LOCAL',
    regimeConfidence: 84,
    regimeTrend: 'Afternoon Convection',
    heavyProb: { p15: 78, p35: 42, p64: 12, p115: 1 },
    uncertainty: { p10: 20.0, p50: 31.5, p90: 46.0 },
    confidenceScore: {
      overall: 86,
      observationCoverage: 92,
      nwpCompleteness: 96,
      spatialConsistency: 85,
      historicalSimilarity: 85
    },
    shapExplanations: [
      { feature: 'Local CAPE Buildup', value: 'SBCAPE 2650 J/kg', impactMm: 6.8 },
      { feature: 'Gangetic Trough Feeder', value: 'Humid easterlies', impactMm: 2.7 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 16.0, ai: 22.0 },
      { time: 'T-18h', nwp: 18.0, ai: 25.0 },
      { time: 'T-12h', nwp: 20.0, ai: 28.0 },
      { time: 'T-6h', nwp: 21.0, ai: 30.0 },
      { time: 'T-0', nwp: 22.0, ai: 31.5 }
    ],
    riskLevel: 'MODERATE',
    historicalAnalogs: [
      { date: '2022-08-19', similarity: 84, observedRain: 34.0, regime: 'CONVECTIVE_LOCAL' }
    ]
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru Urban',
    state: 'Karnataka',
    subdivision: 'South Interior Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    elevation: 920,
    terrain: 'Plateau',
    nwpForecast: 19.0,
    aiCorrected: 27.8,
    delta: 8.8,
    observedImd: 29.0,
    regime: 'CONVECTIVE_LOCAL',
    regimeConfidence: 86,
    regimeTrend: 'Evening Shear Convection',
    heavyProb: { p15: 75, p35: 36, p64: 9, p115: 0 },
    uncertainty: { p10: 17.0, p50: 27.8, p90: 41.0 },
    confidenceScore: {
      overall: 88,
      observationCoverage: 95,
      nwpCompleteness: 98,
      spatialConsistency: 87,
      historicalSimilarity: 86
    },
    shapExplanations: [
      { feature: 'Urban Heat Island Shear', value: 'Thermal gust front trigger', impactMm: 5.8 },
      { feature: 'Peninsular Shear Zone', value: 'East-west shearline at 700hPa', impactMm: 3.0 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 12.0, ai: 18.0 },
      { time: 'T-18h', nwp: 15.0, ai: 21.5 },
      { time: 'T-12h', nwp: 17.0, ai: 24.0 },
      { time: 'T-6h', nwp: 18.5, ai: 26.2 },
      { time: 'T-0', nwp: 19.0, ai: 27.8 }
    ],
    riskLevel: 'MODERATE',
    historicalAnalogs: [
      { date: '2022-10-10', similarity: 86, observedRain: 31.0, regime: 'CONVECTIVE_LOCAL' }
    ]
  },
  {
    id: 'guwahati',
    name: 'Kamrup Metropolitan (Guwahati)',
    state: 'Assam',
    subdivision: 'Assam & Meghalaya',
    lat: 26.1445,
    lng: 91.7362,
    elevation: 55,
    terrain: 'Plains',
    nwpForecast: 64.0,
    aiCorrected: 104.5,
    delta: 40.5,
    observedImd: 108.0,
    regime: 'DEPRESSION',
    regimeConfidence: 95,
    regimeTrend: 'Severe Landfall Surge',
    heavyProb: { p15: 99, p35: 94, p64: 83, p115: 46 },
    uncertainty: { p10: 82.0, p50: 104.5, p90: 135.0 },
    confidenceScore: {
      overall: 91,
      observationCoverage: 94,
      nwpCompleteness: 97,
      spatialConsistency: 90,
      historicalSimilarity: 92
    },
    shapExplanations: [
      { feature: 'Brahmaputra Valley Moisture Funnel', value: 'Strong valley wind channel', impactMm: 24.5 },
      { feature: 'Cyclonic Depression Remnants', value: 'Deep low remnant track across Assam', impactMm: 16.0 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 42.0, ai: 68.0 },
      { time: 'T-18h', nwp: 50.0, ai: 82.0 },
      { time: 'T-12h', nwp: 57.0, ai: 92.0 },
      { time: 'T-6h', nwp: 61.0, ai: 99.0 },
      { time: 'T-0', nwp: 64.0, ai: 104.5 }
    ],
    riskLevel: 'EXTREME',
    historicalAnalogs: [
      { date: '2022-05-18', similarity: 94, observedRain: 112.0, regime: 'DEPRESSION' }
    ]
  },
  {
    id: 'dehradun',
    name: 'Dehradun',
    state: 'Uttarakhand',
    subdivision: 'Uttarakhand',
    lat: 30.3165,
    lng: 78.0322,
    elevation: 640,
    terrain: 'Himalayan',
    nwpForecast: 52.0,
    aiCorrected: 88.0,
    delta: 36.0,
    observedImd: 91.5,
    regime: 'OROGRAPHIC_RAINFALL',
    regimeConfidence: 91,
    regimeTrend: 'Severe Foothill Convergence',
    heavyProb: { p15: 97, p35: 88, p64: 74, p115: 28 },
    uncertainty: { p10: 66.0, p50: 88.0, p90: 116.0 },
    confidenceScore: {
      overall: 87,
      observationCoverage: 91,
      nwpCompleteness: 96,
      spatialConsistency: 86,
      historicalSimilarity: 88
    },
    shapExplanations: [
      { feature: 'Shivalik Upslope Acceleration', value: 'Moisture collision with Outer Himalaya', impactMm: 22.0 },
      { feature: 'Monsoon Trough Foothill Axis', value: 'Trough aligned near Roorkee-Dehradun', impactMm: 14.0 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 34.0, ai: 56.0 },
      { time: 'T-18h', nwp: 40.0, ai: 67.0 },
      { time: 'T-12h', nwp: 46.0, ai: 76.0 },
      { time: 'T-6h', nwp: 49.5, ai: 83.0 },
      { time: 'T-0', nwp: 52.0, ai: 88.0 }
    ],
    riskLevel: 'HIGH',
    historicalAnalogs: [
      { date: '2023-08-14', similarity: 93, observedRain: 95.0, regime: 'OROGRAPHIC_RAINFALL' }
    ]
  },
  {
    id: 'delhi',
    name: 'New Delhi',
    state: 'Delhi',
    subdivision: 'Haryana, Chandigarh & Delhi',
    lat: 28.6139,
    lng: 77.2090,
    elevation: 216,
    terrain: 'Plains',
    nwpForecast: 24.0,
    aiCorrected: 36.4,
    delta: 12.4,
    observedImd: 38.0,
    regime: 'CONVECTIVE_LOCAL',
    regimeConfidence: 83,
    regimeTrend: 'Moderate Thunderstorm',
    heavyProb: { p15: 82, p35: 51, p64: 14, p115: 1 },
    uncertainty: { p10: 24.0, p50: 36.4, p90: 50.0 },
    confidenceScore: {
      overall: 91,
      observationCoverage: 98,
      nwpCompleteness: 99,
      spatialConsistency: 92,
      historicalSimilarity: 87
    },
    shapExplanations: [
      { feature: 'Moisture Shear Convergence', value: 'Arabian Sea + Bay humid stream blend', impactMm: 8.2 },
      { feature: 'Urban Thermal Dome', value: 'Afternoon surface temp 37.5C', impactMm: 4.2 }
    ],
    evolutionTimeline: [
      { time: 'T-24h', nwp: 15.0, ai: 23.0 },
      { time: 'T-18h', nwp: 18.0, ai: 27.5 },
      { time: 'T-12h', nwp: 21.0, ai: 31.0 },
      { time: 'T-6h', nwp: 23.0, ai: 34.2 },
      { time: 'T-0', nwp: 24.0, ai: 36.4 }
    ],
    riskLevel: 'MODERATE',
    historicalAnalogs: [
      { date: '2023-07-09', similarity: 88, observedRain: 42.0, regime: 'WESTERN_DISTURBANCE' }
    ]
  }
];

export const VERIFICATION_METRICS = {
  overallScorecard: [
    { metric: 'RMSE (mm)', rawNwp: 38.4, simpleBias: 31.2, varsahAi: 21.1, unit: 'mm', status: 'Best' },
    { metric: 'MAE (mm)', rawNwp: 22.6, simpleBias: 18.4, varsahAi: 12.8, unit: 'mm', status: 'Best' },
    { metric: 'Mean Bias (mm)', rawNwp: '+9.4', simpleBias: '+4.1', varsahAi: '+1.2', unit: 'mm', status: 'Best' },
    { metric: 'Correlation (r)', rawNwp: 0.62, simpleBias: 0.71, varsahAi: 0.89, unit: '', status: 'Best' },
    { metric: 'POD (Heavy Rain >64.5mm)', rawNwp: 0.54, simpleBias: 0.62, varsahAi: 0.84, unit: 'fraction', status: 'Best' },
    { metric: 'FAR (False Alarm Rate)', rawNwp: 0.38, simpleBias: 0.31, varsahAi: 0.16, unit: 'fraction', status: 'Best' },
    { metric: 'CSI (Critical Success Index)', rawNwp: 0.41, simpleBias: 0.49, varsahAi: 0.73, unit: 'score', status: 'Best' },
    { metric: 'ETS (Equitable Threat Score)', rawNwp: 0.32, simpleBias: 0.40, varsahAi: 0.65, unit: 'score', status: 'Best' },
    { metric: 'FSS (Fraction Skill Score 25km)', rawNwp: 0.51, simpleBias: 0.60, varsahAi: 0.82, unit: 'score', status: 'Best' },
    { metric: 'Brier Score (Heavy Rain)', rawNwp: 0.185, simpleBias: 0.142, varsahAi: 0.076, unit: 'score', status: 'Best' }
  ],
  regimePerformanceMatrix: [
    { regime: 'Active Monsoon', rawRmse: 34.2, aiRmse: 18.5, improvementPct: 45.9, rawCsi: 0.48, aiCsi: 0.78 },
    { regime: 'Break Monsoon', rawRmse: 22.1, aiRmse: 11.2, improvementPct: 49.3, rawCsi: 0.35, aiCsi: 0.69 },
    { regime: 'Monsoon Low', rawRmse: 46.8, aiRmse: 24.3, improvementPct: 48.1, rawCsi: 0.42, aiCsi: 0.79 },
    { regime: 'Depression / Cyclonic', rawRmse: 58.4, aiRmse: 29.1, improvementPct: 50.2, rawCsi: 0.38, aiCsi: 0.74 },
    { regime: 'Coastal Convergence', rawRmse: 42.5, aiRmse: 21.0, improvementPct: 50.6, rawCsi: 0.44, aiCsi: 0.81 },
    { regime: 'Orographic / Ghats', rawRmse: 62.0, aiRmse: 28.4, improvementPct: 54.2, rawCsi: 0.39, aiCsi: 0.82 },
    { regime: 'Western Disturbance', rawRmse: 31.5, aiRmse: 16.8, improvementPct: 46.7, rawCsi: 0.41, aiCsi: 0.72 },
    { regime: 'Convective Local', rawRmse: 28.4, aiRmse: 15.6, improvementPct: 45.1, rawCsi: 0.36, aiCsi: 0.68 },
    { regime: 'Normal Background', rawRmse: 14.2, aiRmse: 8.9, improvementPct: 37.3, rawCsi: 0.52, aiCsi: 0.76 }
  ],
  reliabilityCurves: [
    { forecastProb: 0.1, rawObsFreq: 0.04, aiObsFreq: 0.09 },
    { forecastProb: 0.2, rawObsFreq: 0.11, aiObsFreq: 0.19 },
    { forecastProb: 0.3, rawObsFreq: 0.18, aiObsFreq: 0.29 },
    { forecastProb: 0.4, rawObsFreq: 0.26, aiObsFreq: 0.39 },
    { forecastProb: 0.5, rawObsFreq: 0.34, aiObsFreq: 0.51 },
    { forecastProb: 0.6, rawObsFreq: 0.42, aiObsFreq: 0.61 },
    { forecastProb: 0.7, rawObsFreq: 0.51, aiObsFreq: 0.70 },
    { forecastProb: 0.8, rawObsFreq: 0.62, aiObsFreq: 0.79 },
    { forecastProb: 0.9, rawObsFreq: 0.71, aiObsFreq: 0.89 },
    { forecastProb: 1.0, rawObsFreq: 0.79, aiObsFreq: 0.97 }
  ]
};

export const IMD_MAUSAM_PORTAL_DATA = {
  portalName: 'IMD MAUSAM Rainfall Information Portal',
  url: 'https://mausam.imd.gov.in/responsive/rainfallinformation.php',
  lastSync: '2026-09-29 08:30 IST',
  provenance: {
    authoritativeTarget: 'IMD Rain Gauge & Gridded Observations (0.25° x 0.25° IMD4)',
    nwpSource: 'NCMRWF Unified Model (NCUM) & GFS 0.125° Raw Ensemble',
    qcChecksPassed: 7,
    totalDistrictsMonitored: 724
  },
  subdivisionSummary: [
    { name: 'Konkan & Goa', actualMm: 124.5, normalMm: 82.0, departurePct: +52, category: 'Large Excess' },
    { name: 'Madhya Maharashtra', actualMm: 54.2, normalMm: 41.0, departurePct: +32, category: 'Excess' },
    { name: 'Kerala & Mahe', actualMm: 148.0, normalMm: 95.0, departurePct: +56, category: 'Large Excess' },
    { name: 'Gangetic West Bengal', actualMm: 64.0, normalMm: 58.0, departurePct: +10, category: 'Normal' },
    { name: 'East Rajasthan', actualMm: 12.0, normalMm: 22.0, departurePct: -45, category: 'Deficient' },
    { name: 'Odisha', actualMm: 88.0, normalMm: 62.0, departurePct: +42, category: 'Excess' },
    { name: 'Assam & Meghalaya', actualMm: 210.0, normalMm: 130.0, departurePct: +61, category: 'Large Excess' }
  ]
};

export const SYSTEM_ALERTS = [
  {
    id: 'alt-1',
    type: 'MODEL_DISAGREEMENT',
    severity: 'HIGH',
    district: 'Mumbai Suburban',
    title: 'Significant Forecast Correction (+65% Shift)',
    message: 'Raw NWP predicts 84.0 mm whereas VARSHA AI predicts 138.5 mm. Primary driver: Coastal Convergence + High Sea Breeze Friction.',
    timestamp: '12 mins ago'
  },
  {
    id: 'alt-2',
    type: 'REGIME_TRANSITION',
    severity: 'MEDIUM',
    district: 'Cuttack & Coastal Odisha',
    title: 'Regime Transition: Normal → Monsoon Low',
    message: 'Bay depression developing with 93% classification confidence. Rainfall trend escalating sharply.',
    timestamp: '28 mins ago'
  },
  {
    id: 'alt-3',
    type: 'HEAVY_RAINFALL_RISK',
    severity: 'CRITICAL',
    district: 'Wayanad',
    title: 'Extreme Rainfall Alert (P > 115.6mm = 78%)',
    message: 'VARSHA AI P50 forecast 164.2 mm with P90 bound extending to 210.5 mm. Terrain-forced moisture squeeze.',
    timestamp: '45 mins ago'
  },
  {
    id: 'alt-4',
    type: 'HIGH_UNCERTAINTY',
    severity: 'MEDIUM',
    district: 'Shimla',
    title: 'High Orographic Uncertainty (P10-P90 Spread: 47mm)',
    message: 'Western disturbance trough interacting with easterly monsoon surge. Higher ensemble variance detected.',
    timestamp: '1 hour ago'
  }
];
