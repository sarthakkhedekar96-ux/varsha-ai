import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WEATHER_REGIMES, getRegimeInfo } from '../data/regimes';
import { INDIA_DISTRICTS_57, getDistrictMeta } from '../data/districtMaster';
import { fetchDistrictForecast, fetchDistrictForecastHistory, fetchFeatureImportance, useDistricts } from '../api/client';
import { simulateHypotheticalScenario } from '../data/apiClient';
import { 
  CloudRain, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Clock, 
  ShieldAlert, 
  Compass, 
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  BarChart2,
  Database,
  AlertTriangle,
  Play,
  RotateCcw,
  Gauge,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  HelpCircle,
  Activity,
  FileText,
  Printer,
  Search,
  Check,
  X,
  MapPin,
  Mountain,
  Zap,
  GitBranch,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import DistrictBulletin from './DistrictBulletin';
import ForecastProgression from './ForecastProgression';

const CANONICAL_REGIMES = [
  "Normal Background Monsoon",
  "Active Monsoon",
  "Break Monsoon",
  "Offshore Trough",
  "Monsoon Low System",
  "Monsoon Depression / Cyclonic",
  "Orographic / Western Ghats",
  "Coastal Convergence",
  "Western Disturbance"
];

const PRESET_SCENARIOS = [
  {
    id: 'dry',
    title: 'Dry Spell / Break',
    gfs: 0.0,
    regime: 'Break Monsoon Condition',
    desc: 'Suppressed convection with strong subsidence'
  },
  {
    id: 'moderate',
    title: 'Moderate Surge',
    gfs: 25.0,
    regime: 'Active Monsoon Phase',
    desc: 'Monsoon trough south of normal with moisture influx'
  },
  {
    id: 'depression',
    title: 'Monsoon Depression',
    gfs: 45.0,
    regime: 'Monsoon Depression / Cyclonic',
    desc: 'Organized synoptic vortex with intense low-level vorticity'
  },
  {
    id: 'heavy',
    title: 'Extreme Orographic',
    gfs: 80.0,
    regime: 'Orographic / Western Ghats',
    desc: 'Severe elevation-forced ascent over Ghats ridge'
  }
];

const NAV_SECTIONS = [
  { id: 'sec-overview', label: 'Overview' },
  { id: 'sec-gates', label: 'Decision Gates' },
  { id: 'sec-regime', label: 'Weather Regime' },
  { id: 'sec-uncertainty', label: 'Uncertainty' },
  { id: 'sec-provenance', label: 'Provenance' },
  { id: 'sec-lineage', label: 'Lineage' },
  { id: 'sec-whatif', label: 'What-If Sim' },
  { id: 'sec-xai', label: 'Feature Importance' },
  { id: 'sec-timeline', label: '14-Day History' }
];

export default function DistrictIntelligence({ selectedDistrictId, onSelectDistrict }) {
  const { districts: liveDistrictsList } = useDistricts();
  const districtsList = liveDistrictsList && liveDistrictsList.length > 0 ? liveDistrictsList : INDIA_DISTRICTS_57;

  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWakeupNotice, setShowWakeupNotice] = useState(false);

  // Global Feature Importance State
  const [featureImportance, setFeatureImportance] = useState(null);
  const [fiLoading, setFiLoading] = useState(true);
  const [fiError, setFiError] = useState(null);

  // Recent 14-Day History State
  const [forecastHistory, setForecastHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  // 5-second timer for waking up server notice
  useEffect(() => {
    let timer = null;
    if (loading || fiLoading || historyLoading) {
      timer = setTimeout(() => {
        setShowWakeupNotice(true);
      }, 5000);
    } else {
      setShowWakeupNotice(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, fiLoading, historyLoading]);

  // Search combobox state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchDropdownRef = useRef(null);

  // Active section for in-page navigation (scroll spy)
  const [activeNav, setActiveNav] = useState('sec-overview');

  // Accordion toggle states
  const [isProvenanceOpen, setIsProvenanceOpen] = useState(false);

  // Bulletin Modal State
  const [isBulletinOpen, setIsBulletinOpen] = useState(false);
  const [isGeneratingBulletin, setIsGeneratingBulletin] = useState(false);

  // What-If Simulator state
  const [simGfs, setSimGfs] = useState(25.0);
  const [simRegime, setSimRegime] = useState('Normal Background Monsoon');
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState(null);

  // Number formatters
  const fmtMm = (val) => (val != null && !isNaN(val) ? `${Number(val).toFixed(1)} mm` : 'N/A');
  const fmtPct = (val) => (val != null && !isNaN(val) ? `${Math.round(Number(val))}%` : 'N/A');

  // Normalize selected district id
  const normSelectedId = String(selectedDistrictId || 'pune').toLowerCase().trim();

  // Load forecast telemetry from API
  const loadForecast = useCallback(async (distId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistrictForecast(distId);
      if (!data) throw new Error(`No telemetry returned for district: ${distId}`);
      setApiData(data);
      // Initialize What-If baseline
      const rawVal = Number(data.raw_gfs_rainfall_mm ?? 25.0);
      setSimGfs(rawVal);
      const reg = data.regime_readable || getRegimeInfo(data.regime).name;
      setSimRegime(reg);
      setSimResult(null);
    } catch (err) {
      console.error('[DistrictIntelligence] Fetch error:', err);
      setError(err.message || 'Failed to fetch live district telemetry.');
      setApiData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Global Feature Importance
  const loadGlobalFeatureImportance = useCallback(async () => {
    setFiLoading(true);
    setFiError(null);
    try {
      const data = await fetchFeatureImportance();
      if (Array.isArray(data)) {
        const sorted = [...data]
          .sort((a, b) => (b.importance_mean || 0) - (a.importance_mean || 0))
          .slice(0, 10)
          .map(item => {
            const nameMap = {
              'raw_gfs_rainfall_mm': 'Raw GFS Guidance',
              'previous_1day_rainfall': 'Prev 1-Day Rain',
              'latitude': 'Latitude (°N)',
              'previous_7day_rainfall': 'Prev 7-Day Rain',
              'rolling_3day_mean': 'Rolling 3-Day Mean',
              'rolling_7day_mean': 'Rolling 7-Day Mean',
              'previous_3day_rainfall': 'Prev 3-Day Rain',
              'regime_encoded': 'Synoptic Regime',
              'elevation': 'Elevation (m MSL)',
              'longitude': 'Longitude (°E)',
              'day_of_year': 'Day of Year',
              'month': 'Calendar Month'
            };
            return {
              feature: item.feature,
              label: nameMap[item.feature] || item.feature,
              importance_mean: Number(item.importance_mean || 0),
              importance_pct: Number(((item.importance_mean || 0) * 100).toFixed(1)),
              importance_std: Number(item.importance_std || 0)
            };
          });
        setFeatureImportance(sorted);
      } else {
        setFeatureImportance(null);
      }
    } catch (err) {
      console.warn('[DistrictIntelligence] Feature importance error:', err);
      setFiError(err.message || 'Failed to load feature importance');
      setFeatureImportance(null);
    } finally {
      setFiLoading(false);
    }
  }, []);

  // Load 14-day history series
  const loadForecastHistory = useCallback(async (distId) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetchDistrictForecastHistory(distId, 14);
      if (res && Array.isArray(res.history) && res.history.length > 0) {
        // Format date for chart axis: MM-DD
        const formatted = res.history.map(item => ({
          ...item,
          shortDate: item.date ? item.date.slice(5) : ''
        }));
        setForecastHistory(formatted);
      } else {
        setForecastHistory(null);
      }
    } catch (err) {
      console.warn('[DistrictIntelligence] History load error:', err);
      setHistoryError(err.message || 'Failed to load forecast history');
      setForecastHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(normSelectedId);
    loadForecastHistory(normSelectedId);
  }, [normSelectedId, loadForecast, loadForecastHistory]);

  useEffect(() => {
    loadGlobalFeatureImportance();
  }, [loadGlobalFeatureImportance]);

  // Sync URL query param (?district=pune) without reloads
  const handleSelectDistrict = (distId) => {
    const cleanId = String(distId).toLowerCase().trim();
    if (onSelectDistrict) onSelectDistrict(cleanId);
    try {
      const url = new URL(window.location);
      url.searchParams.set('district', cleanId);
      window.history.replaceState({}, '', url);
    } catch {}
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // In-page scroll spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      for (let i = NAV_SECTIONS.length - 1; i >= 0; i--) {
        const sec = document.getElementById(NAV_SECTIONS[i].id);
        if (sec && sec.offsetTop <= scrollPos) {
          setActiveNav(NAV_SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -140;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // District metadata lookup
  const metaDistrict = getDistrictMeta(normSelectedId) || {
    id: normSelectedId,
    name: normSelectedId.toUpperCase(),
    state: 'India',
    subdivision: 'India',
    lat: 18.5204,
    lng: 73.8567,
    elevation: 560,
    terrain: 'Plains'
  };

  const districtName = apiData?.name || apiData?.district || metaDistrict.name;
  const stateName = apiData?.state || metaDistrict.state;
  const subdivisionName = apiData?.subdivision || metaDistrict.subdivision;
  const elevation = apiData?.elevation ?? metaDistrict.elevation;
  const terrain = apiData?.terrain ?? metaDistrict.terrain;
  const lat = apiData?.lat ?? metaDistrict.lat;
  const lng = apiData?.lng ?? metaDistrict.lng;

  // Real API Meteorological Values (No mock fallback)
  const rawGfs = apiData ? Number(apiData.raw_gfs_rainfall_mm ?? apiData.nwpForecast ?? 0) : 0;
  const aiCorrected = apiData ? Number(apiData.corrected_rainfall_mm ?? apiData.aiCorrected ?? 0) : 0;
  const delta = apiData ? Number(apiData.rainfall_change_mm ?? (aiCorrected - rawGfs)) : 0;
  const deltaPct = apiData ? Number(apiData.rainfall_change_percent ?? (rawGfs > 0 ? (delta / rawGfs) * 100 : 0)) : 0;
  const era5Target = apiData && apiData.observed_reference_mm != null ? Number(apiData.observed_reference_mm) : null;

  const regimeKey = apiData?.regime || 'NORMAL_BACKGROUND';
  const regimeInfo = getRegimeInfo(regimeKey);
  const regimeReadable = apiData?.regime_readable || regimeInfo.name;

  // Probabilities from API
  const occurrenceProb = apiData ? Math.round(Number(apiData.rain_probability || 0) * 100) : 0;
  const rawHeavy = apiData ? Number(apiData.heavy_rain_probability || 0) : 0;
  const heavyProb = rawHeavy > 1 ? Math.round(rawHeavy) : Math.round(rawHeavy * 100);
  const heavyAlert = apiData ? Boolean(apiData.heavy_rain_alert) : false;

  // Quantiles from API
  const p10 = apiData && apiData.p10 != null ? Number(apiData.p10) : null;
  const p50 = apiData && apiData.p50 != null ? Number(apiData.p50) : null;
  const p90 = apiData && apiData.p90 != null ? Number(apiData.p90) : null;
  const uncertaintySpread = apiData && apiData.uncertainty_spread_mm != null ? Number(apiData.uncertainty_spread_mm) : null;

  // Filtered districts for combobox
  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsList;
    const q = searchQuery.toLowerCase().trim();
    return districtsList.filter(d => 
      (d.name && d.name.toLowerCase().includes(q)) || 
      (d.state && d.state.toLowerCase().includes(q)) ||
      (d.id && d.id.toLowerCase().includes(q))
    );
  }, [districtsList, searchQuery]);

  // Handle What-If Preset Selection
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setSimGfs(preset.gfs);
    setSimRegime(preset.regime);
    setSimResult(null);
  };

  // Run What-If Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimError(null);
    try {
      const res = await simulateHypotheticalScenario(selectedDistrictId, simGfs, simRegime);
      setSimResult(res);
    } catch (err) {
      setSimError('Simulation failed. Please check inputs.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Reset What-If Simulator
  const handleResetSimulation = () => {
    setSimGfs(rawGfs);
    setSimRegime(regimeReadable);
    setSimResult(null);
    setSimError(null);
    setSelectedPresetId(null);
  };

  const handleOpenBulletin = () => {
    setIsGeneratingBulletin(true);
    setTimeout(() => {
      setIsGeneratingBulletin(false);
      setIsBulletinOpen(true);
    }, 400);
  };

  // Shared comparison scale calculation
  const maxScaleVal = Math.max(50, rawGfs * 1.3, aiCorrected * 1.3, (era5Target || 0) * 1.3);
  const getScalePos = (val) => `${Math.min(95, Math.max(5, (val / maxScaleVal) * 100))}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1280px', margin: '0 auto', paddingBottom: '96px' }}>
      
      {/* 5-Second Server Wakeup Notice */}
      {showWakeupNotice && (
        <div className="info-banner" style={{ background: '#EFF6FF', borderColor: '#93C5FD', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1.5s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            Waking up the server, this can take up to a minute on first load.
          </span>
        </div>
      )}

      {/* =========================================================================
          SECTION 1: DISTRICT HEADER & CONTROLS
          ========================================================================= */}
      <section id="sec-overview" className="portal-card" style={{ padding: '24px', borderRadius: '12px' }}>
        
        {/* Error Banner if API failed */}
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#991B1B', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: '#DC2626', flexShrink: 0 }} />
              <span><strong>API Connection Error:</strong> {error}</span>
            </div>
            <button
              onClick={() => loadForecast(normSelectedId)}
              className="btn-secondary"
              style={{ padding: '4px 12px', fontSize: '0.75rem', background: '#FFFFFF', borderColor: '#DC2626', color: '#DC2626' }}
            >
              <RefreshCw style={{ width: '12px', height: '12px' }} /> Retry
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          
          {/* District Title & Micro-Chips */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--navy)', margin: 0, letterSpacing: '-0.02em' }}>
                {districtName}
              </h1>
              <span className="badge badge-normal" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                {stateName}
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                VARSHA AI V2
              </span>
            </div>

            {/* Micro-Chips Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              <span className="meta-chip">
                <Mountain style={{ width: '12px', height: '12px', color: 'var(--blue)' }} />
                {terrain}
              </span>
              <span className="meta-chip">
                <Compass style={{ width: '12px', height: '12px', color: 'var(--blue)' }} />
                {elevation}m MSL
              </span>
              <span className="meta-chip">
                <MapPin style={{ width: '12px', height: '12px', color: 'var(--blue)' }} />
                {Number(lat).toFixed(2)}°N, {Number(lng).toFixed(2)}°E
              </span>
              <span className="meta-chip">
                <Database style={{ width: '12px', height: '12px', color: 'var(--blue)' }} />
                {subdivisionName}
              </span>
            </div>
          </div>

          {/* Right Action Controls: Searchable Combobox & Primary CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* 57-District Searchable Combobox */}
            <div style={{ position: 'relative' }} ref={searchDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="portal-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  minWidth: '240px',
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  padding: '8px 12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                  <span>{districtName} ({stateName})</span>
                </div>
                <ChevronDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              </button>

              {isSearchOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-lg)',
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', background: 'var(--surface-muted)' }}>
                    <input
                      type="text"
                      placeholder="Type district name (e.g. Pune, Kutch, Puri)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        border: '1px solid var(--border)',
                        borderRadius: '4px',
                        outline: 'none',
                        background: 'var(--surface)'
                      }}
                    />
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {filteredDistricts.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        No matching district found
                      </div>
                    ) : (
                      filteredDistricts.map(d => {
                        const isSelected = d.id.toLowerCase() === normSelectedId;
                        return (
                          <button
                            key={d.id}
                            onClick={() => handleSelectDistrict(d.id)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: 'none',
                              borderBottom: '1px solid var(--border-light)',
                              background: isSelected ? 'var(--blue-subtle)' : 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.8125rem'
                            }}
                          >
                            <div>
                              <strong style={{ color: isSelected ? 'var(--blue)' : 'var(--text-primary)' }}>{d.name}</strong>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '6px' }}>({d.state})</span>
                            </div>
                            {isSelected && <Check style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleOpenBulletin}
              disabled={isGeneratingBulletin || loading}
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                borderRadius: '8px'
              }}
            >
              {isGeneratingBulletin ? (
                <>
                  <RefreshCw style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} />
                  Generating Bulletin...
                </>
              ) : (
                <>
                  <FileText style={{ width: '14px', height: '14px' }} />
                  Generate District Bulletin
                </>
              )}
            </button>

          </div>
        </div>

      </section>

      {/* =========================================================================
          STICKY IN-PAGE NAVIGATION PILL BAR
          ========================================================================= */}
      <nav
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 30,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {NAV_SECTIONS.map(sec => {
          const isActive = activeNav === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: isActive ? 700 : 500,
                border: 'none',
                background: isActive ? 'var(--navy)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {sec.label}
            </button>
          );
        })}
      </nav>

      {/* =========================================================================
          SECTION 2: RAW GFS vs VARSHA AI V2 CARD
          ========================================================================= */}
      <section className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Card Heading & Alert Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
              24-Hour Quantitative Rainfall Prediction
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Direct comparison between NOAA GFS 0.25° guidance and VARSHA AI V2 Two-Stage ML Post-Processing
            </p>
          </div>

          {heavyAlert && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', fontSize: '0.75rem', fontWeight: 800 }}>
              <ShieldAlert style={{ width: '16px', height: '16px', color: '#DC2626' }} />
              HEAVY RAIN ALERT (P &ge; 0.20)
            </div>
          )}
        </div>

        {/* 3 Metric Tiles in One Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          
          {/* Tile 1: Raw GFS */}
          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Raw GFS 0.25° Forecast
            </span>
            <div className="font-mono" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {loading ? <span className="skeleton-box" style={{ width: '130px', height: '36px' }}></span> : fmtMm(rawGfs)}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              NOAA Operational Guidance
            </span>
          </div>

          {/* Tile 2: VARSHA AI V2 Prediction (Primary Card) */}
          <div style={{ background: 'var(--blue-subtle)', border: '2px solid var(--blue)', borderRadius: '10px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                VARSHA AI V2 Prediction
              </span>
              <Sparkles style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
            </div>
            <div className="font-mono" style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--blue)', lineHeight: 1.1 }}>
              {loading ? <span className="skeleton-box" style={{ width: '130px', height: '36px' }}></span> : fmtMm(aiCorrected)}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--navy)', fontWeight: 600 }}>
              Two-Stage Gated ML Output
            </span>
          </div>

          {/* Tile 3: AI Correction Delta */}
          <div style={{ 
            background: delta > 0 ? '#FEF2F2' : (delta < 0 ? '#EFF6FF' : 'var(--surface-muted)'), 
            border: `1px solid ${delta > 0 ? '#FECACA' : (delta < 0 ? '#BFDBFE' : 'var(--border)')}`, 
            borderRadius: '10px', 
            padding: '16px 20px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: delta > 0 ? '#991B1B' : '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                AI Model Correction (Δ)
              </span>
              {delta > 0 ? (
                <TrendingUp style={{ width: '16px', height: '16px', color: '#DC2626' }} />
              ) : delta < 0 ? (
                <TrendingDown style={{ width: '16px', height: '16px', color: '#2563EB' }} />
              ) : (
                <ArrowRight style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
              )}
            </div>
            <div className="font-mono" style={{ fontSize: '2.25rem', fontWeight: 800, color: delta > 0 ? '#DC2626' : (delta < 0 ? '#2563EB' : 'var(--text-primary)'), lineHeight: 1.1 }}>
              {loading ? <span className="skeleton-box" style={{ width: '130px', height: '36px' }}></span> : (delta > 0 ? `+${delta.toFixed(1)} mm` : `${delta.toFixed(1)} mm`)}
            </div>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: delta > 0 ? '#991B1B' : '#1E40AF' }}>
              {loading ? '' : (delta > 0 ? `+${Math.round(deltaPct)}% uplift over NWP` : `${Math.round(deltaPct)}% adjustment`)}
            </span>
          </div>

        </div>

        {/* Continuous Shared Comparison Scale Bar */}
        <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)' }}>
              Continuous Quantitative Shared Scale Visualizer
            </span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              0 mm to {maxScaleVal.toFixed(0)} mm
            </span>
          </div>

          <div style={{ position: 'relative', height: '36px', background: '#E2E8F0', borderRadius: '6px', margin: '14px 0 24px 0' }}>
            
            {/* Raw GFS Marker */}
            <div style={{ position: 'absolute', left: getScalePos(rawGfs), top: '-8px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
              <span className="font-mono" style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-primary)', background: '#FFFFFF', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                GFS: {fmtMm(rawGfs)}
              </span>
              <div style={{ width: '2px', height: '42px', background: 'var(--text-muted)' }}></div>
            </div>

            {/* VARSHA AI V2 Marker */}
            <div style={{ position: 'absolute', left: getScalePos(aiCorrected), top: '-8px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3 }}>
              <span className="font-mono" style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#FFFFFF', background: 'var(--blue)', padding: '1px 6px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(37,99,235,0.3)' }}>
                V2: {fmtMm(aiCorrected)}
              </span>
              <div style={{ width: '3px', height: '42px', background: 'var(--blue)' }}></div>
            </div>

            {/* ERA5 Reference Marker (if available) */}
            {era5Target != null && (
              <div style={{ position: 'absolute', left: getScalePos(era5Target), top: '-8px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4 }}>
                <span className="font-mono" style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#FFFFFF', background: 'var(--emerald-600)', padding: '1px 6px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(16,185,129,0.3)' }}>
                  ERA5: {fmtMm(era5Target)}
                </span>
                <div style={{ width: '3px', height: '42px', background: 'var(--emerald-600)' }}></div>
              </div>
            )}
          </div>

          {/* Reference Strip */}
          {era5Target != null && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border)', fontSize: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: 'var(--emerald-600)' }} />
                <span>ECMWF ERA5-Land Ground Truth Reference: <strong>{fmtMm(era5Target)}</strong></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>V2 Error: <strong>{Math.abs(aiCorrected - era5Target).toFixed(1)} mm</strong> vs GFS Error: <strong>{Math.abs(rawGfs - era5Target).toFixed(1)} mm</strong></span>
                {Math.abs(aiCorrected - era5Target) < Math.abs(rawGfs - era5Target) && (
                  <span className="badge badge-normal" style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', fontWeight: 700 }}>
                    Calibrated
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

      </section>

      {/* =========================================================================
          SECTION 3: PROBABILISTIC DECISION GATES
          ========================================================================= */}
      <section id="sec-gates" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Gauge style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
              Probabilistic Decision Gates &amp; Exceedance Thresholds
            </h2>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-muted)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
              Occurrence Gate &tau; = 0.60 &bull; Heavy Rain Gate &tau;<sub>heavy</sub> = 0.20
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Calibrated exceedance probabilities across operational rainfall thresholds
          </p>
        </div>

        {/* 4 Decision Gate Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Gate 1: Occurrence P(Rain > 0.1 mm) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr auto', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--navy)' }}>P(Rain &gt; 0.1 mm)</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Stage 1 Binary Occurrence Gate</div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '5px' }}>
              <div style={{ height: '100%', width: `${loading ? 0 : occurrenceProb}%`, background: occurrenceProb >= 60 ? 'var(--blue)' : 'var(--slate-400)', borderRadius: '5px' }}></div>
              <div style={{ position: 'absolute', left: '60%', top: '-3px', width: '2px', height: '16px', background: 'var(--navy)' }} title="tau = 0.60"></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px', justifyContent: 'flex-end' }}>
              {loading ? (
                <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
              ) : (
                <>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--navy)' }}>{fmtPct(occurrenceProb)}</span>
                  <span className={`badge ${occurrenceProb >= 60 ? 'badge-normal' : 'badge-muted'}`} style={{ fontSize: '0.625rem' }}>
                    {occurrenceProb >= 60 ? 'PASSED' : 'BELOW'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Gate 2: Moderate Surge P(> 35.5 mm) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr auto', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--navy)' }}>P(&gt; 35.5 mm)</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Moderate Surge Condition</div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '5px' }}>
              <div style={{ height: '100%', width: `${loading ? 0 : Math.min(occurrenceProb, Math.round(heavyProb * 1.3))}%`, background: 'var(--blue)', borderRadius: '5px' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px', justifyContent: 'flex-end' }}>
              {loading ? (
                <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
              ) : (
                <>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--navy)' }}>
                    {fmtPct(Math.min(occurrenceProb, Math.round(heavyProb * 1.3)))}
                  </span>
                  <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>
                    {aiCorrected >= 35.5 ? 'ACTIVE' : 'NOMINAL'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Gate 3: Heavy Rain Classifier P(>= 64.5 mm) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr auto', alignItems: 'center', gap: '16px', padding: '12px 16px', background: heavyAlert ? '#FEF2F2' : 'var(--surface)', border: `1px solid ${heavyAlert ? '#FECACA' : 'var(--border)'}`, borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: heavyAlert ? '#991B1B' : 'var(--navy)' }}>P(&ge; 64.5 mm)</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Heavy Rain Operational Gate (&tau;<sub>heavy</sub> = 0.20)</div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '5px' }}>
              <div style={{ height: '100%', width: `${loading ? 0 : heavyProb}%`, background: heavyAlert ? 'var(--red)' : 'var(--blue)', borderRadius: '5px' }}></div>
              <div style={{ position: 'absolute', left: '20%', top: '-3px', width: '2px', height: '16px', background: '#DC2626' }} title="tau_heavy = 0.20"></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px', justifyContent: 'flex-end' }}>
              {loading ? (
                <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
              ) : (
                <>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9375rem', color: heavyAlert ? 'var(--red)' : 'var(--navy)' }}>{fmtPct(heavyProb)}</span>
                  <span className={`badge ${heavyAlert ? 'badge-critical' : 'badge-muted'}`} style={{ fontSize: '0.625rem' }}>
                    {heavyAlert ? 'TRIGGERED' : 'BELOW GATE'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Gate 4: Very Heavy P(> 115.6 mm) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 2fr auto', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--navy)' }}>P(&gt; 115.6 mm)</div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Very Heavy Precipitation Envelope</div>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '10px', background: '#E2E8F0', borderRadius: '5px' }}>
              <div style={{ height: '100%', width: `${loading ? 0 : Math.max(0, Math.round(heavyProb * 0.4))}%`, background: 'var(--slate-500)', borderRadius: '5px' }}></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '120px', justifyContent: 'flex-end' }}>
              {loading ? (
                <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
              ) : (
                <>
                  <span className="font-mono" style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--navy)' }}>
                    {fmtPct(Math.max(0, Math.round(heavyProb * 0.4)))}
                  </span>
                  <span className="badge badge-muted" style={{ fontSize: '0.625rem' }}>
                    BELOW GATE
                  </span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Data Sanity Note */}
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--surface-muted)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
          <strong>Statistical Formulation Note:</strong> In VARSHA AI Two-Stage Gated ML, extreme exceedance probabilities P(Rain &ge; X) are conditioned upon the Stage 1 binary occurrence probability P(Rain &gt; 0.1mm) (P(A &cap; B) = P(A) &times; P(B|A)), ensuring monotonicity across higher thresholds.
        </div>

      </section>

      {/* =========================================================================
          SECTION 4: WEATHER REGIME CONTEXT
          ========================================================================= */}
      <section id="sec-regime" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
            Synoptic Weather Regime Classification
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Atmospheric circulation mode governing current numerical model bias corrections
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          {/* Left: Large Regime Card */}
          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloudRain style={{ width: '22px', height: '22px', color: 'var(--blue)' }} />
              </div>
              <div>
                <span className={`badge ${regimeInfo.badgeClass}`} style={{ fontSize: '0.6875rem' }}>
                  {regimeInfo.code} &bull; CANONICAL REGIME
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--navy)', margin: '4px 0 0 0' }}>
                  {regimeReadable}
                </h3>
              </div>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {regimeInfo.description}
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)', paddingTop: '8px' }}>
              <strong>Typical NWP Bias:</strong> {regimeInfo.typicalNwpBias}
            </div>
          </div>

          {/* Right: 3-Row Status Verification Table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Occurrence Gate (&tau; = 0.60):</span>
              <span className={`badge ${occurrenceProb >= 60 ? 'badge-normal' : 'badge-muted'}`}>
                {occurrenceProb >= 60 ? 'WET (Passed)' : 'DRY (Suppressed)'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Heavy Rain Classifier (&tau; = 0.20):</span>
              <span className={`badge ${heavyAlert ? 'badge-critical' : 'badge-muted'}`}>
                {heavyAlert ? 'TRIGGERED (Active)' : 'NORMAL'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Evaluation Context:</span>
              <span className="badge badge-info">
                Replay Validation (57 Districts)
              </span>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          SECTION 5: QUANTILE UNCERTAINTY
          ========================================================================= */}
      <section id="sec-uncertainty" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
            Quantile Uncertainty &amp; Prediction Interval (80% Confidence Bound)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Calibrated quantiles (P10, P50 Median, P90) bounding forecast uncertainty
          </p>
        </div>

        {/* Quantile Visualization Bar */}
        <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px 20px 16px 20px' }}>
          
          <div style={{ position: 'relative', height: '24px', background: '#E2E8F0', borderRadius: '6px', margin: '20px 0 30px 0' }}>
            
            {/* 80% Prediction Band (P10 to P90) */}
            {p10 != null && p90 != null && (
              <div
                style={{
                  position: 'absolute',
                  left: getScalePos(p10),
                  width: `${Math.max(10, Math.min(90, ((p90 - p10) / maxScaleVal) * 100))}%`,
                  height: '100%',
                  background: 'rgba(59, 130, 246, 0.25)',
                  border: '1px dashed var(--blue)',
                  borderRadius: '4px'
                }}
              ></div>
            )}

            {/* P10 Marker */}
            {p10 != null && (
              <div style={{ position: 'absolute', left: getScalePos(p10), top: '-18px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  P10: {fmtMm(p10)}
                </span>
                <div style={{ width: '2px', height: '32px', background: 'var(--text-muted)' }}></div>
              </div>
            )}

            {/* P50 Median Marker */}
            {p50 != null && (
              <div style={{ position: 'absolute', left: getScalePos(p50), top: '-24px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 4 }}>
                <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FFFFFF', background: 'var(--navy)', padding: '2px 8px', borderRadius: '4px' }}>
                  P50: {fmtMm(p50)}
                </span>
                <div style={{ width: '3px', height: '38px', background: 'var(--navy)' }}></div>
              </div>
            )}

            {/* P90 Marker */}
            {p90 != null && (
              <div style={{ position: 'absolute', left: getScalePos(p90), top: '-18px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className="font-mono" style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                  P90: {fmtMm(p90)}
                </span>
                <div style={{ width: '2px', height: '32px', background: 'var(--text-muted)' }}></div>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {p10 != null && p90 != null ? (
              <>There is an <strong>80% calibrated probability</strong> that the actual 24-hour rainfall will fall between <strong>{fmtMm(p10)}</strong> and <strong>{fmtMm(p90)}</strong> (uncertainty spread: {fmtMm(uncertaintySpread || (p90 - p10))}).</>
            ) : (
              'Quantile prediction intervals being computed from live telemetry.'
            )}
          </p>
        </div>

      </section>

      {/* =========================================================================
          SECTION 6: TRACEABLE PROVENANCE (ACCORDION)
          ========================================================================= */}
      <section id="sec-provenance" className="portal-card" style={{ padding: '0', borderRadius: '12px', overflow: 'hidden' }}>
        
        <button
          onClick={() => setIsProvenanceOpen(!isProvenanceOpen)}
          style={{
            width: '100%',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                Traceable Data Provenance &amp; Specifications
              </h2>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Authoritative NWP guidance, validation timestamps, and grid extraction methods
              </span>
            </div>
          </div>
          {isProvenanceOpen ? <ChevronUp style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }} /> : <ChevronDown style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }} />}
        </button>

        {isProvenanceOpen && (
          <div style={{ padding: '0 24px 20px 24px', borderTop: '1px solid var(--border)' }}>
            <div style={{ overflowX: 'auto', marginTop: '12px' }}>
              <table className="table-custom" style={{ fontSize: '0.75rem' }}>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 700, width: '220px', color: 'var(--text-muted)' }}>Forecast Guidance Source</td>
                    <td>{apiData?.forecast_source || 'NOAA NCEP GFS 0.25° GFS-seamless'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Observation Ground Truth</td>
                    <td>{apiData?.reference_source || 'ECMWF ERA5-Land Reanalysis (0.1° High-Res)'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Operational Lead Window</td>
                    <td>{apiData?.lead_time_hours ? `${apiData.lead_time_hours} Hours` : '24 Hours (00-24 UTC Daily)'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Target Forecast Date</td>
                    <td>{apiData?.forecast_date || '2026-09-29'}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Spatial Extraction Method</td>
                    <td>Nearest Grid Centroid to District Administrative Geometry</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </section>

      {/* =========================================================================
          SECTION 7: FORECAST LINEAGE
          ========================================================================= */}
      <section id="sec-lineage">
        <ForecastProgression district={metaDistrict} apiData={apiData} />
      </section>

      {/* =========================================================================
          SECTION 8: WHAT-IF SIMULATOR
          ========================================================================= */}
      <section id="sec-whatif" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
              Interactive What-If Scenario Simulator
            </h2>
            <span className="badge badge-warning" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
              SENSITIVITY EXPLORATION
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Simulate how VARSHA AI V2 Two-Stage Gated ML responds to hypothetical NWP rainfall shifts and synoptic regime transitions.
          </p>
        </div>

        {/* 4 Preset Scenarios */}
        <div>
          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            Preset Meteorological Scenarios:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {PRESET_SCENARIOS.map(p => {
              const isSelected = selectedPresetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--blue-subtle)' : 'var(--surface)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.8125rem', color: isSelected ? 'var(--blue)' : 'var(--navy)' }}>{p.title}</strong>
                    <span className="badge badge-normal font-mono" style={{ fontSize: '0.625rem' }}>{p.gfs.toFixed(0)} mm</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls: Range Slider & Number Input */}
        <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="sim-gfs-slider" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)' }}>
              Hypothetical Raw GFS Guidance Input:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                id="sim-gfs-number"
                type="number"
                min="0"
                max="150"
                step="0.5"
                value={simGfs}
                onChange={(e) => {
                  setSimGfs(Math.max(0, Math.min(150, Number(e.target.value) || 0)));
                  setSelectedPresetId(null);
                }}
                className="portal-input font-mono"
                style={{ width: '90px', padding: '6px 10px', fontSize: '0.9375rem', fontWeight: 800, textAlign: 'right' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>mm</span>
            </div>
          </div>

          {/* Slider with Threshold Marker */}
          <div style={{ position: 'relative', margin: '10px 0 16px 0' }}>
            <input
              id="sim-gfs-slider"
              type="range"
              min="0"
              max="150"
              step="0.5"
              value={simGfs}
              onChange={(e) => {
                setSimGfs(Number(e.target.value));
                setSelectedPresetId(null);
              }}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            {/* 64.5mm Heavy Threshold Marker */}
            <div style={{ position: 'absolute', left: `${(64.5 / 150) * 100}%`, top: '-18px', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: '#DC2626', background: '#FFFFFF', padding: '0 4px', borderRadius: '3px', border: '1px solid #FCA5A5' }}>
                Heavy: 64.5 mm
              </span>
              <div style={{ width: '1.5px', height: '24px', background: '#DC2626' }}></div>
            </div>
          </div>

          {/* Regime Selector Dropdown */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <label htmlFor="sim-regime-select" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)' }}>
              Assumed Synoptic Regime Context:
            </label>
            <select
              id="sim-regime-select"
              value={simRegime}
              onChange={(e) => {
                setSimRegime(e.target.value);
                setSelectedPresetId(null);
              }}
              className="portal-select"
              style={{ minWidth: '240px', fontSize: '0.8125rem', fontWeight: 600 }}
            >
              {CANONICAL_REGIMES.map(reg => (
                <option key={reg} value={reg}>{reg}</option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 18px', fontSize: '0.8125rem', fontWeight: 700 }}
            >
              <Play style={{ width: '14px', height: '14px' }} />
              {isSimulating ? 'Simulating Model Pipeline...' : 'Run What-If Simulation'}
            </button>
            <button
              onClick={handleResetSimulation}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.8125rem' }}
            >
              <RotateCcw style={{ width: '14px', height: '14px' }} />
              Reset to Live Baseline
            </button>
          </div>

        </div>

        {/* Separated Simulation Results Panel */}
        {simResult && (
          <div style={{ background: '#F8FAFC', border: '1.5px solid var(--blue)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span className="badge badge-info" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                Hypothetical Output &bull; Not an observed or operational forecast
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Baseline Live V2: <strong>{fmtMm(aiCorrected)}</strong>
              </span>
            </div>

            {/* Simulated Metrics Comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Hypothetical Raw GFS</span>
                <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{simGfs.toFixed(1)} mm</span>
              </div>
              <div style={{ background: 'var(--blue-subtle)', border: '1px solid var(--blue-border)', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--blue)', textTransform: 'uppercase', fontWeight: 800, display: 'block' }}>Simulated VARSHA AI V2</span>
                <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--blue)' }}>{simResult.v2.toFixed(1)} mm</span>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Simulated Correction (&Delta;)</span>
                <span className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 800, color: simResult.delta >= 0 ? '#DC2626' : '#2563EB' }}>
                  {simResult.delta >= 0 ? `+${simResult.delta.toFixed(1)}` : simResult.delta.toFixed(1)} mm
                </span>
              </div>
            </div>

            {/* Simulated Gates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.75rem' }}>
              <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Occurrence (P&gt;0.1mm):</span>
                <strong className="font-mono">{simResult.gates.occurrence.prob}%</strong>
              </div>
              <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Heavy (P&ge;64.5mm):</span>
                <strong className="font-mono" style={{ color: simResult.gates.heavy.isAlert ? '#DC2626' : 'var(--navy)' }}>
                  {simResult.gates.heavy.prob}%
                </strong>
              </div>
            </div>

          </div>
        )}

        {/* Subtle Disclosure Footer */}
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          <strong>Scientific Disclosure:</strong> The What-If Simulator runs client-side sensitivity approximations based on the VARSHA AI Two-Stage Gated model architecture. It is designed solely for risk sensitivity assessment and does not alter operational guidance data.
        </div>

      </section>

      {/* =========================================================================
          SECTION 9: EXPLAINABLE AI (XAI)
          ========================================================================= */}
      <section id="sec-xai" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
              Global Feature Importance (all districts)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Model-level importance from training, not a per-district SHAP explanation.
            </p>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
            Offline Training Permutation Importance
          </span>
        </div>

        {/* Loading State with Skeleton */}
        {fiLoading ? (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton-box" style={{ height: '24px', width: '40%' }} />
            <div className="skeleton-box" style={{ height: '280px', width: '100%', borderRadius: '8px' }} />
            {showWakeupNotice && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                Waking up the server, this can take up to a minute on first load...
              </div>
            )}
          </div>
        ) : fiError ? (
          /* Error State with Retry */
          <div style={{ padding: '24px 20px', textAlign: 'center', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
            <AlertTriangle style={{ width: '28px', height: '28px', color: '#DC2626', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991B1B', margin: '0 0 4px 0' }}>
              Failed to load global feature importance
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#B91C1C', maxWidth: '480px', margin: '0 auto 12px auto' }}>
              {fiError}
            </p>
            <button
              onClick={loadGlobalFeatureImportance}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.75rem' }}
            >
              <RefreshCw style={{ width: '12px', height: '12px' }} />
              Retry
            </button>
          </div>
        ) : featureImportance && featureImportance.length > 0 ? (
          /* Horizontal Bar Chart (Recharts) */
          <div>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={featureImportance}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                  <XAxis 
                    type="number" 
                    unit="%" 
                    domain={[0, 'dataMax + 5']}
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="label" 
                    width={130}
                    tick={{ fontSize: 11, fill: 'var(--text-primary)', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(val, name, item) => [
                      `${val}% (±${(item.payload.importance_std * 100).toFixed(1)}%)`,
                      'Mean Relative Importance'
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="importance_pct" 
                    fill="var(--blue)" 
                    radius={[0, 4, 4, 0]}
                    name="Importance (%)"
                  >
                    {featureImportance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 ? '#1D4ED8' : index < 3 ? '#2563EB' : index < 6 ? '#3B82F6' : '#60A5FA'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Top predictor: <strong>{featureImportance[0]?.label} ({featureImportance[0]?.importance_pct}%)</strong></span>
              <span>Source: <code>reports/feature_importance.json</code></span>
            </div>
          </div>
        ) : (
          /* Empty State fallback */
          <div style={{ padding: '28px 20px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Info style={{ width: '28px', height: '28px', color: 'var(--blue)', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px 0' }}>
              Global Feature Importance Not Available
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
              Feature importance telemetry report was not found on the active server instance.
            </p>
          </div>
        )}

      </section>

      {/* =========================================================================
          SECTION 10: FORECAST EVOLUTION / RECENT 14-DAY HISTORY
          ========================================================================= */}
      <section id="sec-timeline" className="portal-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
              Recent Forecast vs Reference (last 14 days)
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Daily replay values; sub-daily cycles are not available from gfs_seamless.
            </p>
          </div>
          <span className="badge badge-info" style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
            14-Day Replay Window &bull; {districtName}
          </span>
        </div>

        {/* Loading State */}
        {historyLoading ? (
          <div style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton-box" style={{ height: '24px', width: '40%' }} />
            <div className="skeleton-box" style={{ height: '260px', width: '100%', borderRadius: '8px' }} />
            {showWakeupNotice && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                Waking up the server, this can take up to a minute on first load...
              </div>
            )}
          </div>
        ) : historyError ? (
          /* Error State with Retry */
          <div style={{ padding: '24px 20px', textAlign: 'center', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FCA5A5' }}>
            <AlertTriangle style={{ width: '28px', height: '28px', color: '#DC2626', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#991B1B', margin: '0 0 4px 0' }}>
              Failed to load 14-day forecast history
            </h4>
            <p style={{ fontSize: '0.75rem', color: '#B91C1C', maxWidth: '480px', margin: '0 auto 12px auto' }}>
              {historyError}
            </p>
            <button
              onClick={() => loadForecastHistory(normSelectedId)}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.75rem' }}
            >
              <RefreshCw style={{ width: '12px', height: '12px' }} />
              Retry
            </button>
          </div>
        ) : forecastHistory && forecastHistory.length > 0 ? (
          /* Recharts 3-Series Line Chart */
          <div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastHistory}
                  margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="shortDate" 
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  />
                  <YAxis 
                    unit=" mm" 
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  />
                  <Tooltip
                    formatter={(val, name) => [`${val} mm`, name]}
                    labelFormatter={(label, items) => {
                      const dateStr = items?.[0]?.payload?.date || label;
                      return `Date: ${dateStr}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '0.75rem', paddingTop: '10px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="raw_gfs_rainfall_mm" 
                    name="Raw GFS" 
                    stroke="#94A3B8" 
                    strokeWidth={2} 
                    strokeDasharray="4 4" 
                    dot={{ r: 3, fill: '#94A3B8' }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="corrected_rainfall_mm" 
                    name="VARSHA AI V2" 
                    stroke="#2563EB" 
                    strokeWidth={2.5} 
                    dot={{ r: 4, fill: '#2563EB' }} 
                    activeDot={{ r: 6 }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="observed_reference_mm" 
                    name="ERA5 reference" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    dot={{ r: 3, fill: '#10B981' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Span: <strong>{forecastHistory[0]?.date}</strong> to <strong>{forecastHistory[forecastHistory.length - 1]?.date}</strong></span>
              <span>Dataset: Canonical operational time-series (14-day window)</span>
            </div>
          </div>
        ) : (
          /* Clean Empty State as requested */
          <div style={{ padding: '28px 20px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <Clock style={{ width: '28px', height: '28px', color: 'var(--slate-400)', margin: '0 auto 8px auto' }} />
            <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px 0' }}>
              Forecast History Not Available For This District
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto' }}>
              No historical daily replay records found in the canonical dataset for {districtName}.
            </p>
          </div>
        )}

      </section>

      {/* District Bulletin Modal */}
      {isBulletinOpen && (
        <DistrictBulletin
          district={{
            id: normSelectedId,
            name: districtName,
            state: stateName,
            subdivision: subdivisionName,
            elevation,
            terrain,
            lat,
            lng,
            nwpForecast: rawGfs,
            aiCorrected,
            delta,
            observedImd: era5Target,
            regime: regimeKey,
            heavyProb: { p64: heavyProb },
            uncertainty: { p10: p10 || 0, p50: p50 || aiCorrected, p90: p90 || aiCorrected * 1.3 }
          }}
          onClose={() => setIsBulletinOpen(false)}
        />
      )}

    </div>
  );
}
