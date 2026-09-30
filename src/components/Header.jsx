import React, { useState, useRef, useEffect } from 'react';
import { 
  CloudRain, Map, Cpu, Layers, ShieldAlert, BarChart3, 
  Database, Bot, Activity, Bell, Menu, X, ChevronDown, CheckCircle2
} from 'lucide-react';
import { prefetchMapAssets } from '../utils/mapDataLoader';

export default function Header({ activeTab, setActiveTab, alertCount, onOpenAlerts, backendHealth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'forecast' | 'maps' | null
  const dropdownRef = useRef(null);

  const isConnected = backendHealth?.isConnected;
  const latency = backendHealth?.latencyMs;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setOpenDropdown(null);
    setMobileMenuOpen(false);
  };

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => prev === name ? null : name);
  };

  // Check if a dropdown child is currently active (exclude direct top-level nav items)
  const isForecastActive = ['lens', 'regime'].includes(activeTab);
  const isMapsActive = ['extreme'].includes(activeTab);

  return (
    <header className="portal-header-wrapper">
      {/* 1. TOP NAVY STRIP (36-40px) */}
      <div className="portal-top-bar">
        <div className="portal-top-bar-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, letterSpacing: '0.04em' }}>VARSHA AI</span>
            <span style={{ opacity: 0.4 }}>|</span>
            <span style={{ opacity: 0.9, fontWeight: 500 }}>Regime-Aware Rainfall Intelligence Portal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FDE68A', fontWeight: 600, fontSize: '0.6875rem' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FDE68A', display: 'inline-block' }}></span>
              Historical validation / replay: 2026-04-02 to 2026-09-29
            </span>
            {isConnected ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#86EFAC', fontWeight: 600 }}>
                <span className="pulse-indicator"></span>
                Operational {latency ? `(${latency}ms)` : ''}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FDE68A', fontWeight: 600 }}>
                API Offline
              </span>
            )}
            <span style={{ opacity: 0.3 }}>•</span>
            <span style={{ opacity: 0.9, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              Model: VARSHA AI V2
            </span>
          </div>
        </div>
      </div>

      {/* 2. MAIN BRANDING HEADER (75-85px) */}
      <div className="portal-main-brand-row">
        <div className="portal-main-brand-content">
          
          {/* Official Portal Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => handleNavClick('command')}>
            <div style={{ width: '42px', height: '42px', borderRadius: '6px', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(12,35,64,0.2)' }}>
              <CloudRain style={{ width: '24px', height: '24px', color: '#FFFFFF' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  VARSHA AI
                </span>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 6px', background: 'var(--blue-subtle)', color: 'var(--blue)', borderRadius: '3px', border: '1px solid var(--blue-border)' }}>
                  PORTAL
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
                Regime-Aware Rainfall Intelligence &amp; Decision Support
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Scientific Provenance Tag */}
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '4px', background: 'var(--surface-muted)', border: '1px solid var(--border)', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Guidance:</span>
              <strong style={{ color: 'var(--navy)' }}>NOAA GFS 0.25°</strong>
              <span style={{ color: 'var(--border-strong)' }}>|</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Reference:</span>
              <strong style={{ color: 'var(--navy)' }}>ERA5-Land</strong>
            </div>

            {/* Active Alerts Button */}
            <button 
              id="header-alerts-btn"
              onClick={onOpenAlerts}
              className="btn-secondary"
              style={{ padding: '7px 12px', fontSize: '0.75rem', position: 'relative' }}
              title="View Active Weather Alerts"
            >
              <Bell style={{ width: '15px', height: '15px', color: alertCount > 0 ? 'var(--red)' : 'var(--text-secondary)' }} />
              <span className="hidden sm:inline">Alerts</span>
              {alertCount > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', minWidth: '18px', height: '18px', borderRadius: '50%', background: 'var(--red)', color: 'white', fontSize: '0.625rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', boxShadow: '0 2px 4px rgba(220,38,38,0.3)' }}>
                  {alertCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              className="md:hidden btn-secondary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ padding: '7px 10px' }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X style={{ width: '18px', height: '18px' }} /> : <Menu style={{ width: '18px', height: '18px' }} />}
            </button>
          </div>
        </div>
      </div>

      {/* 3. HORIZONTAL PORTAL NAVIGATION BAR (48-52px) */}
      <nav className="portal-navbar" ref={dropdownRef}>
        <div className="portal-navbar-content">
          
          {/* Desktop Horizontal Navigation List */}
          <div className="hidden md:flex" style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            <ul className="portal-nav-list">
              
              {/* Command Center */}
              <li className="portal-nav-item">
                <button
                  id="nav-command"
                  onClick={() => handleNavClick('command')}
                  className={`portal-nav-btn ${activeTab === 'command' ? 'active' : ''}`}
                >
                  <Activity style={{ width: '15px', height: '15px' }} />
                  <span>Command Center</span>
                </button>
              </li>

              {/* Forecast Dropdown */}
              <li className="portal-nav-item">
                <button
                  id="nav-forecast-dropdown"
                  onClick={() => toggleDropdown('forecast')}
                  className={`portal-nav-btn ${isForecastActive ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <CloudRain style={{ width: '15px', height: '15px' }} />
                  <span>Forecast</span>
                  <ChevronDown style={{ width: '13px', height: '13px', opacity: 0.7, transform: openDropdown === 'forecast' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>

                {openDropdown === 'forecast' && (
                  <div className="portal-dropdown-menu">
                    <button 
                      onClick={() => handleNavClick('district')}
                      className={`portal-dropdown-item ${activeTab === 'district' ? 'active' : ''}`}
                    >
                      <CloudRain style={{ width: '14px', height: '14px' }} />
                      <span>District Forecast</span>
                    </button>
                    <button 
                      onClick={() => handleNavClick('lens')}
                      className={`portal-dropdown-item ${activeTab === 'lens' ? 'active' : ''}`}
                    >
                      <Layers style={{ width: '14px', height: '14px' }} />
                      <span>Raw GFS vs VARSHA AI</span>
                    </button>
                    <button 
                      onClick={() => handleNavClick('regime')}
                      className={`portal-dropdown-item ${activeTab === 'regime' ? 'active' : ''}`}
                    >
                      <Cpu style={{ width: '14px', height: '14px' }} />
                      <span>Regime Analysis</span>
                    </button>
                    <button 
                      onClick={() => handleNavClick('district')}
                      className="portal-dropdown-item"
                    >
                      <CheckCircle2 style={{ width: '14px', height: '14px' }} />
                      <span>Forecast Progression</span>
                    </button>
                  </div>
                )}
              </li>

              {/* Maps & Graphs Dropdown */}
              <li className="portal-nav-item" onMouseEnter={prefetchMapAssets}>
                <button
                  id="nav-maps-dropdown"
                  onClick={() => toggleDropdown('maps')}
                  onFocus={prefetchMapAssets}
                  className={`portal-nav-btn ${isMapsActive ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Map style={{ width: '15px', height: '15px' }} />
                  <span>Maps & Graphs</span>
                  <ChevronDown style={{ width: '13px', height: '13px', opacity: 0.7, transform: openDropdown === 'maps' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>

                {openDropdown === 'maps' && (
                  <div className="portal-dropdown-menu">
                    <button 
                      onClick={() => handleNavClick('map')}
                      className={`portal-dropdown-item ${activeTab === 'map' ? 'active' : ''}`}
                    >
                      <Map style={{ width: '14px', height: '14px' }} />
                      <span>Rainfall Intelligence Map</span>
                    </button>
                    <button 
                      onClick={() => handleNavClick('extreme')}
                      className={`portal-dropdown-item ${activeTab === 'extreme' ? 'active' : ''}`}
                    >
                      <ShieldAlert style={{ width: '14px', height: '14px' }} />
                      <span>Heavy Rain Monitor</span>
                    </button>
                    <button 
                      onClick={() => handleNavClick('map')}
                      className="portal-dropdown-item"
                    >
                      <Layers style={{ width: '14px', height: '14px' }} />
                      <span>District Risk Map</span>
                    </button>
                  </div>
                )}
              </li>

              {/* District Intelligence */}
              <li className="portal-nav-item">
                <button
                  id="nav-district"
                  onClick={() => handleNavClick('district')}
                  className={`portal-nav-btn ${activeTab === 'district' ? 'active' : ''}`}
                >
                  <CloudRain style={{ width: '15px', height: '15px' }} />
                  <span>District Intelligence</span>
                </button>
              </li>

              {/* Verification Scorecard */}
              <li className="portal-nav-item">
                <button
                  id="nav-verification"
                  onClick={() => handleNavClick('verification')}
                  className={`portal-nav-btn ${activeTab === 'verification' ? 'active' : ''}`}
                >
                  <BarChart3 style={{ width: '15px', height: '15px' }} />
                  <span>Verification</span>
                </button>
              </li>

              {/* Extreme Rain */}
              <li className="portal-nav-item">
                <button
                  id="nav-extreme"
                  onClick={() => handleNavClick('extreme')}
                  className={`portal-nav-btn ${activeTab === 'extreme' ? 'active' : ''}`}
                >
                  <ShieldAlert style={{ width: '15px', height: '15px' }} />
                  <span>Extreme Rain</span>
                </button>
              </li>

              {/* Reference Data */}
              <li className="portal-nav-item">
                <button
                  id="nav-imd"
                  onClick={() => handleNavClick('imd')}
                  className={`portal-nav-btn ${activeTab === 'imd' ? 'active' : ''}`}
                >
                  <Database style={{ width: '15px', height: '15px' }} />
                  <span>Reference Data</span>
                </button>
              </li>

              {/* RAINWISE Assistant */}
              <li className="portal-nav-item">
                <button
                  id="nav-assistant"
                  onClick={() => handleNavClick('assistant')}
                  className={`portal-nav-btn ${activeTab === 'assistant' ? 'active' : ''}`}
                  style={{ color: activeTab === 'assistant' ? '#FFFFFF' : 'var(--blue)', fontWeight: 700 }}
                >
                  <Bot style={{ width: '15px', height: '15px' }} />
                  <span>RAINWISE</span>
                </button>
              </li>

            </ul>

            {/* Quick Status Tag (Hidden on narrow screens to prevent overlap with RAINWISE) */}
            <div className="hidden xl:block" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap', paddingLeft: '12px' }}>
              57 Districts Monitored &nbsp;|&nbsp; 24h Window
            </div>
          </div>

          {/* Mobile Current Section Tag */}
          <div className="md:hidden" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)' }}>
            <span>Active: {activeTab.toUpperCase()}</span>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Tap menu to navigate</span>
          </div>

        </div>
      </nav>

      {/* 4. MOBILE NAVIGATION DRAWER */}
      {mobileMenuOpen && (
        <div className="portal-mobile-menu md:hidden">
          
          <button
            onClick={() => handleNavClick('command')}
            className={`portal-mobile-btn ${activeTab === 'command' ? 'active' : ''}`}
          >
            <Activity style={{ width: '16px', height: '16px' }} />
            <span>Command Center</span>
          </button>

          <div className="portal-mobile-section-title">Forecast & Models</div>
          <button
            onClick={() => handleNavClick('district')}
            className={`portal-mobile-btn ${activeTab === 'district' ? 'active' : ''}`}
          >
            <CloudRain style={{ width: '16px', height: '16px' }} />
            <span>District Forecast & Intelligence</span>
          </button>
          <button
            onClick={() => handleNavClick('lens')}
            className={`portal-mobile-btn ${activeTab === 'lens' ? 'active' : ''}`}
          >
            <Layers style={{ width: '16px', height: '16px' }} />
            <span>Raw GFS vs VARSHA AI</span>
          </button>
          <button
            onClick={() => handleNavClick('regime')}
            className={`portal-mobile-btn ${activeTab === 'regime' ? 'active' : ''}`}
          >
            <Cpu style={{ width: '16px', height: '16px' }} />
            <span>Regime Analysis</span>
          </button>

          <div className="portal-mobile-section-title">Maps & Risk</div>
          <button
            onClick={() => handleNavClick('map')}
            className={`portal-mobile-btn ${activeTab === 'map' ? 'active' : ''}`}
          >
            <Map style={{ width: '16px', height: '16px' }} />
            <span>Rainfall Intelligence Map</span>
          </button>
          <button
            onClick={() => handleNavClick('extreme')}
            className={`portal-mobile-btn ${activeTab === 'extreme' ? 'active' : ''}`}
          >
            <ShieldAlert style={{ width: '16px', height: '16px' }} />
            <span>Extreme Rain Monitor</span>
          </button>

          <div className="portal-mobile-section-title">Evaluation & Tools</div>
          <button
            onClick={() => handleNavClick('verification')}
            className={`portal-mobile-btn ${activeTab === 'verification' ? 'active' : ''}`}
          >
            <BarChart3 style={{ width: '16px', height: '16px' }} />
            <span>Verification Scorecard</span>
          </button>
          <button
            onClick={() => handleNavClick('imd')}
            className={`portal-mobile-btn ${activeTab === 'imd' ? 'active' : ''}`}
          >
            <Database style={{ width: '16px', height: '16px' }} />
            <span>Reference Data Provenance</span>
          </button>
          <button
            onClick={() => handleNavClick('assistant')}
            className={`portal-mobile-btn ${activeTab === 'assistant' ? 'active' : ''}`}
          >
            <Bot style={{ width: '16px', height: '16px' }} />
            <span>RAINWISE AI Assistant</span>
          </button>

        </div>
      )}
    </header>
  );
}
