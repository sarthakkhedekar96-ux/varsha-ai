import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WEATHER_REGIMES } from '../data/regimes';
import { INDIA_DISTRICTS_57, getDistrictMeta } from '../data/districtMaster';
import { 
  loadGeoJsonBoundaries, 
  loadDistrictsTelemetry, 
  normalizeDistrictData 
} from '../utils/mapDataLoader';
import { 
  Layers, 
  MapPin, 
  Info, 
  Eye, 
  ShieldAlert, 
  Sparkles,
  Zap,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  Compass,
  ArrowRight,
  TrendingUp,
  Filter,
  Flame,
  Check
} from 'lucide-react';

// Bounding box for India coordinate projection
const MIN_LNG = 68.0;
const MAX_LNG = 97.5;
const MIN_LAT = 8.0;
const MAX_LAT = 36.5;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 850;

function project(lng, lat, width = MAP_WIDTH, height = MAP_HEIGHT) {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * width;
  const y = ((MAX_LAT - lat) / (MAX_LAT - MIN_LAT)) * height;
  return [x, y];
}

function ringToPath(ring, width = MAP_WIDTH, height = MAP_HEIGHT) {
  if (!ring || ring.length < 2) return '';
  return ring
    .map((pt, i) => {
      const [x, y] = project(pt[0], pt[1], width, height);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ') + ' Z';
}

function geometryToPath(geometry, width = MAP_WIDTH, height = MAP_HEIGHT) {
  if (!geometry) return '';
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ring => ringToPath(ring, width, height)).join(' ');
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map(poly => poly.map(ring => ringToPath(ring, width, height)).join(' '))
      .join(' ');
  }
  return '';
}

const LAYERS_CONFIG = [
  { 
    id: 'ai', 
    label: 'AI Corrected Forecast', 
    icon: Sparkles, 
    tooltip: 'Calibrated VARSHA AI V2 precipitation estimate in mm/24h' 
  },
  { 
    id: 'nwp', 
    label: 'Raw GFS Forecast', 
    icon: Layers, 
    tooltip: 'Baseline NOAA NCEP GFS 0.25° NWP numerical guidance' 
  },
  { 
    id: 'diff', 
    label: 'AI Correction Lens (Delta)', 
    icon: Eye, 
    tooltip: 'Correction Lens = AI prediction minus raw GFS guidance' 
  },
  { 
    id: 'prob', 
    label: 'Heavy Rain Probability', 
    icon: Zap, 
    tooltip: 'Gate 1 calibrated probability P(≥64.5 mm/24h), alert threshold at 20%' 
  },
  { 
    id: 'regime', 
    label: 'Weather Regime Overlay', 
    icon: Sliders, 
    tooltip: 'Dominant synoptic circulation regime conditioning post-processing' 
  },
  { 
    id: 'risk', 
    label: 'Extreme Risk Level', 
    icon: ShieldAlert, 
    tooltip: 'Composite meteorological hazard tier (Low, Moderate, High, Critical)' 
  },
];

export default function InteractiveMap({ onSelectDistrict }) {
  // Sync active layer with URL parameter if present
  const getInitialLayer = () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const layerParam = urlParams.get('layer');
      if (layerParam && LAYERS_CONFIG.some(l => l.id === layerParam)) {
        return layerParam;
      }
    } catch {
      // safe fallback
    }
    return 'ai';
  };

  const [activeLayer, setActiveLayer] = useState(getInitialLayer);
  const [selectedDistrictId, setSelectedDistrictId] = useState('pune');
  const [hoveredDistrict, setHoveredDistrict] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [hoveredLayerTooltip, setHoveredLayerTooltip] = useState(null);
  
  // Data states
  const [geoData, setGeoData] = useState(null);
  const [telemetryMap, setTelemetryMap] = useState({});
  const [loadingBoundaries, setLoadingBoundaries] = useState(true);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [loadMetrics, setLoadMetrics] = useState(null);
  const [showWakeupNotice, setShowWakeupNotice] = useState(false);

  const isMapLoading = loadingBoundaries || loadingTelemetry;

  // 5-second timer for waking up server notice
  useEffect(() => {
    let timer = null;
    if (isMapLoading) {
      timer = setTimeout(() => {
        setShowWakeupNotice(true);
      }, 5000);
    } else {
      setShowWakeupNotice(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isMapLoading]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');
  const [showTop10, setShowTop10] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Zoom, Pan & Fullscreen
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const mapContainerRef = useRef(null);
  const svgRef = useRef(null);
  const searchInputRef = useRef(null);

  // Synchronize URL query parameter when layer changes
  const handleLayerChange = (layerId) => {
    setActiveLayer(layerId);
    try {
      const url = new URL(window.location);
      url.searchParams.set('layer', layerId);
      window.history.replaceState({}, '', url);
    } catch {
      // safe fallback
    }
  };

  // 1. Initial Load: Boundaries First (Progressive), then Telemetry
  const initMapData = useCallback(async () => {
    setLoadingBoundaries(true);
    setLoadingTelemetry(true);
    setLoadError(null);

    const overallStart = performance.now();
    let firstPaintTime = null;

    try {
      // Step A: Load GeoJSON Boundaries
      const geoResult = await loadGeoJsonBoundaries();
      setGeoData(geoResult.data);
      setLoadingBoundaries(false);
      firstPaintTime = performance.now() - overallStart;
      console.log(`[Map Perf] First Boundary Paint: ${firstPaintTime.toFixed(1)}ms (${geoResult.source})`);

      // Step B: Load Telemetry & Join Client-Side
      const telemetry = await loadDistrictsTelemetry();
      setTelemetryMap(telemetry);
      setLoadingTelemetry(false);
      const fullyColoredTime = performance.now() - overallStart;
      console.log(`[Map Perf] Telemetry Joined & Fully Colored: ${fullyColoredTime.toFixed(1)}ms`);

      setLoadMetrics({
        source: geoResult.source,
        firstPaintMs: Math.round(firstPaintTime),
        fullyColoredMs: Math.round(fullyColoredTime)
      });
    } catch (err) {
      console.error("[InteractiveMap] Load error:", err);
      setLoadError(err.message || "Failed to load map data");
      setLoadingBoundaries(false);
      setLoadingTelemetry(false);
    }
  }, []);

  useEffect(() => {
    initMapData();
  }, [initMapData]);

  // Precompute SVG paths for features
  const districtPaths = useMemo(() => {
    if (!geoData || !geoData.features) return [];
    return geoData.features.map(feat => {
      const distId = String(feat.properties.districtId || feat.id || '').toLowerCase();
      const pathStr = geometryToPath(feat.geometry);
      const [cx, cy] = project(feat.properties.centroidLng, feat.properties.centroidLat);
      return {
        id: distId,
        properties: feat.properties,
        path: pathStr,
        cx,
        cy,
        centroidLng: feat.properties.centroidLng,
        centroidLat: feat.properties.centroidLat
      };
    });
  }, [geoData]);

  // Lookup active district data with fallback
  const activeDistrictData = useMemo(() => {
    const id = selectedDistrictId.toLowerCase();
    if (telemetryMap[id]) return telemetryMap[id];
    
    // Master district fallback
    const meta = getDistrictMeta(id) || INDIA_DISTRICTS_57.find(d => d.id.toLowerCase() === id) || INDIA_DISTRICTS_57[0];
    return normalizeDistrictData(meta, meta);
  }, [selectedDistrictId, telemetryMap]);

  // Unique States list for filter
  const statesList = useMemo(() => {
    const states = new Set();
    INDIA_DISTRICTS_57.forEach(d => {
      if (d.state) states.add(d.state);
    });
    return ['ALL', ...Array.from(states).sort()];
  }, []);

  // Top 10 Heaviest Rain Districts
  const top10Districts = useMemo(() => {
    const all = INDIA_DISTRICTS_57.map(d => {
      const id = d.id.toLowerCase();
      const live = telemetryMap[id];
      return live || normalizeDistrictData(d, d);
    });
    return all.sort((a, b) => (b.aiCorrected || 0) - (a.aiCorrected || 0)).slice(0, 10);
  }, [telemetryMap]);

  // Autocomplete search suggestions
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return INDIA_DISTRICTS_57.filter(d => 
      d.name.toLowerCase().includes(q) || 
      d.state.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Color calculation based on active layer
  const getPolygonColor = useCallback((distId) => {
    // If telemetry not yet loaded, render clean neutral slate boundary
    const data = telemetryMap[distId.toLowerCase()];
    if (!data) return '#E2E8F0';

    const nwp = data.nwpForecast ?? 0.0;
    const ai = data.aiCorrected ?? 0.0;
    const delta = data.delta ?? (ai - nwp);
    const heavyProb = (data.heavy_rain_probability ?? 0) * 100;
    const risk = data.riskLevel || 'LOW';
    const regime = data.regime || 'NORMAL_BACKGROUND';

    switch (activeLayer) {
      case 'nwp':
        if (nwp >= 64.5) return '#EF4444';
        if (nwp >= 35.5) return '#F59E0B';
        if (nwp >= 15.0) return '#06B6D4';
        if (nwp >= 2.5) return '#10B981';
        return '#0F3A4A';

      case 'ai':
        if (ai >= 64.5) return '#F43F5E';
        if (ai >= 35.5) return '#F59E0B';
        if (ai >= 15.0) return '#00F2FE';
        if (ai >= 2.5) return '#10B981';
        return '#0F3A4A';

      case 'diff':
        if (delta >= 15.0) return '#EF4444';
        if (delta >= 5.0) return '#F59E0B';
        if (delta >= -5.0) return '#3B82F6';
        return '#10B981';

      case 'prob':
        if (heavyProb >= 50) return '#EF4444';
        if (heavyProb >= 20) return '#F59E0B';
        if (heavyProb >= 5) return '#3B82F6';
        return '#1E293B';

      case 'regime':
        return (WEATHER_REGIMES[regime] || {}).color || '#8B5CF6';

      case 'risk':
        if (risk === 'CRITICAL' || data.heavy_rain_alert) return '#EF4444';
        if (risk === 'HIGH') return '#F59E0B';
        if (risk === 'MODERATE') return '#3B82F6';
        return '#10B981';

      default:
        return '#00F2FE';
    }
  }, [telemetryMap, activeLayer]);

  // Formatted layer metric value label
  const getLayerValueLabel = useCallback((district) => {
    if (!district) return 'N/A';
    switch (activeLayer) {
      case 'nwp': return `${(district.nwpForecast ?? 0).toFixed(1)} mm`;
      case 'ai': return `${(district.aiCorrected ?? 0).toFixed(1)} mm`;
      case 'diff': {
        const d = district.delta ?? ((district.aiCorrected ?? 0) - (district.nwpForecast ?? 0));
        return `${d > 0 ? '+' : ''}${d.toFixed(1)} mm`;
      }
      case 'prob': {
        const p = (district.heavy_rain_probability ?? 0) * 100;
        return `${p.toFixed(1)}%`;
      }
      case 'regime': return district.regime_readable || district.regime || 'NORMAL';
      case 'risk': return district.riskLevel || (district.heavy_rain_alert ? 'CRITICAL' : 'LOW');
      default: return `${(district.aiCorrected ?? 0).toFixed(1)} mm`;
    }
  }, [activeLayer]);

  // Zoom & Pan Actions
  const handleZoomIn = () => setZoomLevel(prev => Math.min(4.0, prev + 0.35));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.85, prev - 0.35));
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Fly/Zoom to a specific district coordinates
  const zoomToDistrict = (distId) => {
    const dPath = districtPaths.find(p => p.id === distId.toLowerCase());
    if (dPath) {
      setSelectedDistrictId(distId.toLowerCase());
      // Center on centroid
      const centerX = MAP_WIDTH / 2;
      const centerY = MAP_HEIGHT / 2;
      const targetZoom = 2.4;
      const targetPanX = (centerX - dPath.cx) * targetZoom;
      const targetPanY = (centerY - dPath.cy) * targetZoom;

      setZoomLevel(targetZoom);
      setPanOffset({ x: targetPanX, y: targetPanY });
    } else {
      setSelectedDistrictId(distId.toLowerCase());
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!mapContainerRef.current) return;
    if (!document.fullscreenElement) {
      mapContainerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation for Layer Switcher
  const handleLayerKeyDown = (e, index) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % LAYERS_CONFIG.length;
      handleLayerChange(LAYERS_CONFIG[nextIndex].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + LAYERS_CONFIG.length) % LAYERS_CONFIG.length;
      handleLayerChange(LAYERS_CONFIG[prevIndex].id);
    }
  };

  // Mouse Pan handlers
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'path') return; // Don't drag when clicking a polygon
    setIsPanning(true);
    setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPanOffset({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="portal-container space-y-5" style={{ paddingBottom: '32px' }}>
      
      {/* 5-Second Server Wakeup Notice */}
      {showWakeupNotice && (
        <div className="info-banner" style={{ background: '#EFF6FF', borderColor: '#93C5FD', color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1.5s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            Waking up the server, this can take up to a minute on first load.
          </span>
        </div>
      )}

      {/* Map Load Error Banner with Retry */}
      {loadError && (
        <div className="portal-card" style={{ background: '#FEF2F2', border: '1px solid #F87171', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontWeight: 600, fontSize: '0.8125rem' }}>
            <AlertTriangle style={{ width: '16px', height: '16px', color: '#DC2626', flexShrink: 0 }} />
            <span>Failed to load map telemetry: {loadError}</span>
          </div>
          <button onClick={initMapData} className="btn-primary" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
            <RefreshCw style={{ width: '12px', height: '12px' }} /> Retry
          </button>
        </div>
      )}

      {/* 1. Header with Layer Switcher & Performance Telemetry Badge */}
      <div className="glass-panel p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-watch" style={{ fontSize: '0.6875rem' }}>
                  NOAA GFS 0.25° vs VARSHA AI V2
                </span>
                <span className="badge badge-normal" style={{ fontSize: '0.6875rem' }}>
                  57 ADM2 Districts Mapped
                </span>
                {loadMetrics && (
                  <span className="hidden sm:inline-block" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Paint: {loadMetrics.firstPaintMs}ms • Color: {loadMetrics.fullyColoredMs}ms
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Layers style={{ width: '20px', height: '20px', color: 'var(--blue)' }} />
                  Rainfall Intelligence & Decision Support Map
                </h2>
                <button
                  onClick={() => setShowInfoModal(!showInfoModal)}
                  aria-label="View Map Intelligence details"
                  title="Scientific details & layer explanations"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                >
                  <Info style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>

            {/* Top Quick Action Bar (Search, State Filter, Top 10) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              
              {/* Search with Autocomplete */}
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-muted)', border: '1px solid var(--border-strong)', borderRadius: '6px', padding: '0 8px', height: '36px' }}>
                  <Search style={{ width: '14px', height: '14px', color: 'var(--text-muted)', marginRight: '6px' }} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearchOpen(true);
                    }}
                    onFocus={() => setIsSearchOpen(true)}
                    placeholder="Search 57 districts..."
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8125rem', color: 'var(--text-primary)', width: '140px' }}
                    aria-label="Search districts by name or state"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
                    >
                      <X style={{ width: '12px', height: '12px' }} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchOpen && searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 60, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '6px', boxShadow: 'var(--shadow-lg)', maxHeight: '240px', overflowY: 'auto' }}>
                    {searchResults.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => zoomToDistrict(d.id)}
                        style={{ width: '100%', padding: '8px 12px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', borderBottom: '1px solid var(--border)', background: d.id.toLowerCase() === selectedDistrictId.toLowerCase() ? 'var(--blue-subtle)' : 'transparent', cursor: 'pointer', fontSize: '0.8125rem' }}
                      >
                        <div>
                          <strong style={{ color: 'var(--navy)' }}>{d.name}</strong>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{d.state}</div>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--blue)', fontWeight: 600 }}>
                          {((telemetryMap[d.id]?.aiCorrected) ?? d.aiCorrected ?? 0).toFixed(1)} mm
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* State Filter Dropdown */}
              <select
                value={selectedStateFilter}
                onChange={(e) => setSelectedStateFilter(e.target.value)}
                className="portal-select"
                style={{ height: '36px', padding: '0 10px', fontSize: '0.75rem' }}
                aria-label="Filter districts by state"
              >
                {statesList.map(st => (
                  <option key={st} value={st}>{st === 'ALL' ? 'All States (57)' : st}</option>
                ))}
              </select>

              {/* Top 10 Heaviest Rain Toggle */}
              <button
                onClick={() => setShowTop10(!showTop10)}
                className={showTop10 ? "btn-primary" : "btn-secondary"}
                style={{ height: '36px', padding: '0 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                title="View Top 10 Heaviest Rainfall Districts"
              >
                <Flame style={{ width: '14px', height: '14px', color: showTop10 ? '#FFFFFF' : 'var(--amber)' }} />
                <span>Top 10 Rain</span>
              </button>

            </div>
          </div>

          {/* Scientific Info Popover Modal */}
          {showInfoModal && (
            <div className="info-banner-blue" style={{ marginTop: '8px', fontSize: '0.8125rem', position: 'relative' }}>
              <div>
                <strong>Scientific Post-Processing Architecture:</strong> VARSHA AI V2 deploys a Two-Stage Gated Architecture (Extreme Occurrence Classifier with tuned decision threshold τ_heavy = 0.20 + Conditional Amount Regressor). Boundaries are color-coded directly from live GFS 0.25° NWP forecast and AI inference telemetry.
              </div>
              <button 
                onClick={() => setShowInfoModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', position: 'absolute', top: '10px', right: '10px', color: 'var(--text-muted)' }}
              >
                <X style={{ width: '14px', height: '14px' }} />
              </button>
            </div>
          )}

          {/* 2. Redesigned Segmented Pill Layer Switcher */}
          <div 
            role="tablist" 
            aria-label="Weather Map Layer Selector"
            className="no-scrollbar"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              overflowX: 'auto', 
              padding: '4px',
              background: 'var(--surface-muted)',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}
          >
            {LAYERS_CONFIG.map((layer, idx) => {
              const Icon = layer.icon;
              const isActive = activeLayer === layer.id;
              
              return (
                <div key={layer.id} style={{ position: 'relative' }}>
                  <button
                    role="tab"
                    id={`layer-tab-${layer.id}`}
                    aria-selected={isActive}
                    aria-controls="map-visualizer-canvas"
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={(e) => handleLayerKeyDown(e, idx)}
                    onClick={() => handleLayerChange(layer.id)}
                    onMouseEnter={() => setHoveredLayerTooltip(layer.id)}
                    onMouseLeave={() => setHoveredLayerTooltip(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 700 : 500,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      border: isActive ? '1px solid var(--navy)' : '1px solid transparent',
                      background: isActive ? 'var(--navy)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                      boxShadow: isActive ? '0 2px 4px rgba(12,35,64,0.2)' : 'none'
                    }}
                  >
                    <Icon style={{ width: '15px', height: '15px', color: isActive ? '#00F2FE' : 'var(--blue)' }} />
                    <span>{layer.label}</span>
                  </button>

                  {/* Micro Tooltip */}
                  {hoveredLayerTooltip === layer.id && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '0.6875rem',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      boxShadow: 'var(--shadow-md)',
                      whiteSpace: 'nowrap',
                      zIndex: 80,
                      pointerEvents: 'none'
                    }}>
                      {layer.tooltip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Top 10 Heaviest Rain Collapsible Drawer */}
      {showTop10 && (
        <div className="glass-panel p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--navy)', fontSize: '0.875rem' }}>
              <Flame style={{ width: '16px', height: '16px', color: 'var(--red)' }} />
              Top 10 Monitored Rainfall Centers (24-Hour Forecast)
            </div>
            <button 
              onClick={() => setShowTop10(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
            {top10Districts.map((d, index) => {
              const isSelected = d.id === selectedDistrictId;
              return (
                <button
                  key={d.id}
                  onClick={() => zoomToDistrict(d.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--blue)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--blue-subtle)' : 'var(--surface-muted)',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: index < 3 ? 'var(--red)' : 'var(--navy)', color: '#FFFFFF', fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {index + 1}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--navy)' }}>{d.name}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{d.state}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: (d.aiCorrected || 0) >= 64.5 ? 'var(--red)' : 'var(--blue)', fontSize: '0.875rem' }}>
                      {(d.aiCorrected || 0).toFixed(1)} mm
                    </div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                      GFS: {(d.nwpForecast || 0).toFixed(1)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Main Grid: Map Visualizer (2/3 width on desktop) + Selected District Panel (1/3 width) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', alignItems: 'start' }}>
        
        {/* Map Canvas Column (8 of 12 columns on desktop) */}
        <div 
          ref={mapContainerRef}
          style={{ 
            gridColumn: 'span 12', 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            padding: '16px',
            boxShadow: 'var(--shadow-sm)',
            position: 'relative',
            minHeight: '540px'
          }}
          className="lg:col-span-8"
        >
          
          {/* Active Layer Header Strip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--navy)', color: '#FFFFFF', borderRadius: '6px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-indicator" style={{ background: '#00F2FE', boxShadow: '0 0 0 0 rgba(0,242,254,0.6)' }}></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Displaying:</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#00F2FE' }}>
                {LAYERS_CONFIG.find(l => l.id === activeLayer)?.label}
              </span>
            </div>
            <div style={{ fontSize: '0.6875rem', opacity: 0.8 }} className="hidden sm:block">
              Hover polygon for telemetry • Click to zoom & inspect
            </div>
          </div>

          {/* SVG Map Container */}
          <div 
            id="map-visualizer-canvas"
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '520px',
              height: '62vh',
              maxHeight: '760px',
              background: '#0B132B',
              borderRadius: '6px',
              border: '1px solid #1E293B',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isPanning ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Grid background styling */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              pointerEvents: 'none'
            }}></div>

            {/* Loading / Error States */}
            {loadingBoundaries ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 30 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #00F2FE', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
                <div style={{ fontSize: '0.8125rem', color: '#E2E8F0', fontWeight: 600 }}>
                  Loading Boundary Geometries & Cached Tiles...
                </div>
              </div>
            ) : loadError ? (
              <div style={{ textAlign: 'center', padding: '24px', zIndex: 30, background: 'rgba(15,23,42,0.9)', borderRadius: '8px', border: '1px solid #EF4444' }}>
                <AlertTriangle style={{ width: '32px', height: '32px', color: '#EF4444', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, color: '#F87171', fontSize: '0.875rem' }}>Failed to load map dataset</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '4px 0 12px' }}>{loadError}</div>
                <button 
                  onClick={initMapData}
                  className="btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '6px 14px' }}
                >
                  <RefreshCw style={{ width: '12px', height: '12px' }} />
                  Retry Load
                </button>
              </div>
            ) : (
              <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                style={{
                  width: '100%',
                  height: '100%',
                  transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                  transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                }}
              >
                {/* 57 Monitored Districts Polygons */}
                <g className="varsha-monitored-districts">
                  {districtPaths.map((d) => {
                    const isSelected = d.id === selectedDistrictId.toLowerCase();
                    const isHovered = hoveredDistrict?.id === d.id;
                    const matchesState = selectedStateFilter === 'ALL' || d.properties.state === selectedStateFilter;
                    
                    const fillColor = matchesState ? getPolygonColor(d.id) : '#1E293B';
                    const fillOpacity = isSelected ? 0.95 : (isHovered ? 0.90 : (matchesState ? 0.75 : 0.25));
                    const strokeColor = isSelected ? '#FFFFFF' : (isHovered ? '#00F2FE' : (matchesState ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)'));
                    const strokeWidth = isSelected ? 2.8 : (isHovered ? 2.0 : 0.8);

                    return (
                      <g key={d.id}>
                        <path
                          d={d.path}
                          fill={fillColor}
                          fillOpacity={fillOpacity}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeLinejoin="round"
                          style={{
                            cursor: 'pointer',
                            transition: 'fill 200ms ease, stroke 200ms ease, fill-opacity 200ms ease'
                          }}
                          onClick={() => setSelectedDistrictId(d.id)}
                          onMouseEnter={(e) => {
                            const rect = svgRef.current?.getBoundingClientRect();
                            if (rect) {
                              setTooltipPos({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top
                              });
                            }
                            setHoveredDistrict({
                              id: d.id,
                              name: d.properties.districtName,
                              state: d.properties.state,
                              data: telemetryMap[d.id] || DISTRICTS_DATA.find(x => x.id.toLowerCase() === d.id)
                            });
                          }}
                          onMouseMove={(e) => {
                            const rect = svgRef.current?.getBoundingClientRect();
                            if (rect) {
                              setTooltipPos({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredDistrict(null)}
                        />

                        {/* Selected / Alert District Centroid Marker */}
                        {isSelected && (
                          <g>
                            <circle
                              cx={d.cx}
                              cy={d.cy}
                              r={8}
                              fill="none"
                              stroke="#00F2FE"
                              strokeWidth={2}
                              opacity={0.8}
                            />
                            <circle
                              cx={d.cx}
                              cy={d.cy}
                              r={4}
                              fill="#FFFFFF"
                              stroke="var(--navy)"
                              strokeWidth={1.5}
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            )}

            {/* Hover Tooltip */}
            {hoveredDistrict && (
              <div
                style={{
                  position: 'absolute',
                  zIndex: 70,
                  left: `${Math.min(Math.max(12, tooltipPos.x + 16), 460)}px`,
                  top: `${Math.min(Math.max(12, tooltipPos.y - 60), 380)}px`,
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid #00F2FE',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  pointerEvents: 'none',
                  minWidth: '180px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '4px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.8125rem' }}>{hoveredDistrict.name}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#94A3B8' }}>{hoveredDistrict.state}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '3px 12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: '#94A3B8' }}>VARSHA AI V2:</span>
                  <span style={{ color: '#00F2FE', fontWeight: 700, textAlign: 'right' }}>
                    {((hoveredDistrict.data?.aiCorrected) ?? 0).toFixed(1)} mm
                  </span>
                  
                  <span style={{ color: '#94A3B8' }}>Raw GFS:</span>
                  <span style={{ color: '#E2E8F0', textAlign: 'right' }}>
                    {((hoveredDistrict.data?.nwpForecast) ?? 0).toFixed(1)} mm
                  </span>
                  
                  <span style={{ color: '#94A3B8' }}>Delta:</span>
                  <span style={{ 
                    color: ((hoveredDistrict.data?.delta) ?? 0) > 0 ? '#F87171' : '#34D399', 
                    textAlign: 'right', 
                    fontWeight: 700 
                  }}>
                    {((hoveredDistrict.data?.delta) ?? 0) > 0 ? '+' : ''}{((hoveredDistrict.data?.delta) ?? 0).toFixed(1)} mm
                  </span>

                  <span style={{ color: '#94A3B8' }}>P(≥64.5mm):</span>
                  <span style={{ color: '#FBBF24', textAlign: 'right' }}>
                    {((hoveredDistrict.data?.heavy_rain_probability ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Floating Top-Right Zoom, Reset & Fullscreen Controls */}
            <div style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              zIndex: 50,
              background: 'rgba(15, 23, 42, 0.85)',
              padding: '4px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)'
            }}>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                aria-label="Zoom in map"
                style={{ width: '34px', height: '34px', borderRadius: '4px', background: '#1E293B', border: '1px solid #334155', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ZoomIn style={{ width: '16px', height: '16px' }} />
              </button>
              
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                aria-label="Zoom out map"
                style={{ width: '34px', height: '34px', borderRadius: '4px', background: '#1E293B', border: '1px solid #334155', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ZoomOut style={{ width: '16px', height: '16px' }} />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset View"
                aria-label="Reset zoom and center map"
                style={{ width: '34px', height: '34px', borderRadius: '4px', background: '#1E293B', border: '1px solid #334155', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <RotateCcw style={{ width: '14px', height: '14px' }} />
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
                aria-label="Toggle map fullscreen"
                style={{ width: '34px', height: '34px', borderRadius: '4px', background: '#1E293B', border: '1px solid #334155', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {isFullscreen ? <Minimize2 style={{ width: '14px', height: '14px' }} /> : <Maximize2 style={{ width: '14px', height: '14px' }} />}
              </button>
            </div>

            {/* Dynamic Bottom-Left Legend Card */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '10px 12px',
              zIndex: 40,
              maxWidth: '300px'
            }}>
              <div style={{ fontWeight: 800, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', marginBottom: '6px' }}>
                {activeLayer.toUpperCase()} Scale & Legend
              </div>

              {activeLayer === 'ai' || activeLayer === 'nwp' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: '0.6875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#0F3A4A', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&lt; 2.5 mm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10B981', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>2.5 &ndash; 15 mm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#00F2FE', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>15 &ndash; 35 mm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#F59E0B', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>35 &ndash; 64.5 mm</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', gridColumn: 'span 2' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#F43F5E', display: 'inline-block' }}></span>
                    <span style={{ color: '#F43F5E', fontWeight: 700 }}>&ge; 64.5 mm (Heavy Rain)</span>
                  </div>
                </div>
              ) : activeLayer === 'diff' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: '0.6875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10B981', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&lt; -5 mm (AI Lower)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3B82F6', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&plusmn;5 mm (Neutral)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#F59E0B', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>+5..15 mm (Boost)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#EF4444', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&gt;+15 mm (Strong)</span>
                  </div>
                </div>
              ) : activeLayer === 'prob' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: '0.6875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#1E293B', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&lt; 5%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3B82F6', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>5 &ndash; 20%</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#F59E0B', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&ge; 20% (&tau;<sub>heavy</sub> Alert)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#EF4444', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>&ge; 50% High Risk</span>
                  </div>
                </div>
              ) : activeLayer === 'regime' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 8px', fontSize: '0.6875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3B82F6', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>Active Monsoon</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#8B5CF6', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>Orographic Ghats</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10B981', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>Coastal Convergence</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#00F2FE', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>Monsoon Low</span>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px 10px', fontSize: '0.6875rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#10B981', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>LOW Risk</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#3B82F6', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>MODERATE</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#F59E0B', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>HIGH</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#EF4444', display: 'inline-block' }}></span>
                    <span style={{ color: '#CBD5E1' }}>CRITICAL</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Scientific Disclaimer Footnote */}
          <div style={{ marginTop: '10px', fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span>
              ADM2 administrative boundaries for visualization. 57/57 monitored district identifiers mapped to polygons; historical/shared boundaries documented for NTR (Krishna) and Mumbai.
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              GADM ADM2 GeoJSON
            </span>
          </div>

        </div>

        {/* 4. Selected District Intelligence Panel (4 of 12 columns on desktop) */}
        <div 
          style={{ 
            gridColumn: 'span 12',
            position: 'sticky',
            top: '80px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
          className="lg:col-span-4"
        >
          
          {/* Header Row with District Title & Risk Badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Selected Target District
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0 0 0' }}>
                <MapPin style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
                {activeDistrictData.name}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                {activeDistrictData.state} &bull; {activeDistrictData.subdivision}
              </p>
            </div>

            {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
              <span className="skeleton-box" style={{ width: '70px', height: '20px', borderRadius: '12px' }}></span>
            ) : (
              <span className={`badge ${
                activeDistrictData.heavy_rain_alert || activeDistrictData.riskLevel === 'CRITICAL'
                  ? 'badge-critical'
                  : activeDistrictData.riskLevel === 'HIGH'
                    ? 'badge-warning'
                    : activeDistrictData.riskLevel === 'MODERATE'
                      ? 'badge-watch'
                      : 'badge-normal'
              }`}>
                {activeDistrictData.heavy_rain_alert ? 'ALERT TRIGGERED' : activeDistrictData.riskLevel}
              </span>
            )}
          </div>

          {/* 3 Metric Tiles Grid: Raw GFS | VARSHA AI V2 | Correction Lens Delta */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Raw GFS
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '2px' }}>
                {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
                  <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
                ) : (
                  activeDistrictData.nwpForecast.toFixed(1)
                )}
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>mm/24h</div>
            </div>

            <div style={{ background: 'var(--blue-subtle)', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>
                VARSHA AI V2
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--blue)', marginTop: '2px' }}>
                {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
                  <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
                ) : (
                  activeDistrictData.aiCorrected.toFixed(1)
                )}
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--blue)', fontWeight: 600 }}>mm/24h</div>
            </div>

            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                AI Lens Delta
              </div>
              <div style={{ 
                fontSize: '1.15rem', 
                fontWeight: 800, 
                fontFamily: 'var(--font-mono)', 
                color: activeDistrictData.delta > 0 ? 'var(--red)' : 'var(--green)', 
                marginTop: '2px' 
              }}>
                {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
                  <span className="skeleton-box" style={{ width: '45px', height: '18px' }}></span>
                ) : (
                  `${activeDistrictData.delta > 0 ? '+' : ''}${activeDistrictData.delta.toFixed(1)}`
                )}
              </div>
              <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>mm</div>
            </div>

          </div>

          {/* Active Layer Spotlight Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--navy-dark)', color: '#FFFFFF', borderRadius: '6px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {LAYERS_CONFIG.find(l => l.id === activeLayer)?.label}:
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem', color: '#00F2FE' }}>
              {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
                <span className="skeleton-box" style={{ width: '60px', height: '16px' }}></span>
              ) : (
                getLayerValueLabel(activeDistrictData)
              )}
            </span>
          </div>

          {/* Heavy Rain Gate Telemetry (Gate 1 with τ_heavy = 0.20 threshold marker) */}
          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Heavy Rain Gate (P &ge; 64.5mm)
              </span>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--amber)' }}>
                &tau;<sub>heavy</sub> = 0.20
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Calibrated Probability:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem', color: activeDistrictData.heavy_rain_alert ? 'var(--red)' : 'var(--amber)' }}>
                {loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? (
                  <span className="skeleton-box" style={{ width: '40px', height: '16px' }}></span>
                ) : (
                  `${(activeDistrictData.heavy_rain_probability * 100).toFixed(1)}%`
                )}
              </span>
            </div>

            {/* Progress bar with threshold tick */}
            <div style={{ position: 'relative', width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'visible' }}>
              <div 
                style={{
                  height: '100%',
                  borderRadius: '4px',
                  background: activeDistrictData.heavy_rain_alert ? 'var(--red)' : 'var(--amber)',
                  width: `${loadingTelemetry || !telemetryMap[selectedDistrictId.toLowerCase()] ? 0 : Math.min(100, Math.max(2, activeDistrictData.heavy_rain_probability * 100))}%`,
                  transition: 'width 0.3s ease'
                }}
              ></div>
              {/* 20% Threshold Marker */}
              <div 
                style={{
                  position: 'absolute',
                  top: '-3px',
                  bottom: '-3px',
                  left: '20%',
                  width: '2px',
                  background: 'var(--navy)',
                  zIndex: 2
                }}
                title="Alert Threshold (20%)"
              ></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>0%</span>
              <span style={{ fontWeight: 600, color: activeDistrictData.heavy_rain_alert ? 'var(--red)' : 'var(--green)' }}>
                {activeDistrictData.heavy_rain_alert ? 'Alert Gate Triggered (≥ 20%)' : 'Below Gate Threshold'}
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* Detected Synoptic Weather Regime Badge */}
          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Detected Synoptic Regime
              </span>
              <span className="badge badge-info" style={{ fontSize: '0.625rem' }}>
                {activeDistrictData.regime_readable || (WEATHER_REGIMES[activeDistrictData.regime]?.name || activeDistrictData.regime || 'Normal Background')}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              {(WEATHER_REGIMES[activeDistrictData.regime] || WEATHER_REGIMES.NORMAL_BACKGROUND).description}
            </p>
          </div>

          {/* Deep Dive Action Primary CTA Button */}
          <button
            onClick={() => onSelectDistrict(activeDistrictData.id)}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '0.875rem', marginTop: '4px' }}
          >
            <Compass style={{ width: '16px', height: '16px' }} />
            <span>Open Full District Intelligence & XAI</span>
            <ArrowRight style={{ width: '14px', height: '14px', marginLeft: 'auto' }} />
          </button>

        </div>

      </div>

    </div>
  );
}
