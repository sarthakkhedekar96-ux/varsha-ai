import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import CommandCenter from './components/CommandCenter';
import InteractiveMap from './components/InteractiveMap';
import DistrictIntelligence from './components/DistrictIntelligence';
import RegimeMonitor from './components/RegimeMonitor';
import RawVsAiLens from './components/RawVsAiLens';
import ExtremeRainfallMonitor from './components/ExtremeRainfallMonitor';
import VerificationEngine from './components/VerificationEngine';
import ImdDataExplorer from './components/ImdDataExplorer';
import RainwiseAssistant from './components/RainwiseAssistant';
import AlertsPanel from './components/AlertsPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { fetchDistricts, fetchSystemStatus, checkApiHealth, fetchActiveAlerts, IS_MOCK_ENABLED } from './api/client';
import { CloudRain, ExternalLink, Bot, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('command');
  const [selectedDistrictId, setSelectedDistrictId] = useState('pune');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAssistantDrawerOpen, setIsAssistantDrawerOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState(null);
  const [backendHealth, setBackendHealth] = useState({ isConnected: false, latencyMs: null });

  useEffect(() => {
    async function loadLiveData() {
      const health = await checkApiHealth();
      setBackendHealth(health);

      const st = await fetchSystemStatus().catch(() => null);
      if (st) setBackendStatus(st);

      const alerts = await fetchActiveAlerts().catch(() => []);
      if (Array.isArray(alerts)) setAlertCount(alerts.length);
      else if (alerts?.alerts) setAlertCount(alerts.alerts.length);
    }
    loadLiveData();

    const interval = setInterval(async () => {
      const health = await checkApiHealth();
      setBackendHealth(health);
      const alerts = await fetchActiveAlerts().catch(() => []);
      if (Array.isArray(alerts)) setAlertCount(alerts.length);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectDistrict = (districtId) => {
    setSelectedDistrictId(districtId);
    setActiveTab('district');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Demo Data Notice if mock mode is explicitly activated via env */}
      {IS_MOCK_ENABLED && (
        <div style={{ background: '#F59E0B', color: '#78350F', textAlign: 'center', padding: '4px', fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.05em' }}>
          ⚠️ DEMO / MOCK MODE ACTIVE (VITE_USE_MOCK=true)
        </div>
      )}

      {/* Top Application Bar & Horizontal Navigation */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        alertCount={alertCount}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        backendHealth={backendHealth}
      />

      {/* Main View Container */}
      <main style={{ flex: '1 0 auto', width: '100%', maxWidth: '1280px', margin: '0 auto', padding: '24px 16px 88px 16px' }}>
        {activeTab === 'command' && (
          <ErrorBoundary sectionName="Command Center">
            <CommandCenter 
              onSelectDistrict={handleSelectDistrict}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          </ErrorBoundary>
        )}

        {activeTab === 'map' && (
          <ErrorBoundary sectionName="Maps & Graphs">
            <div className="space-y-6">
              <InteractiveMap 
                onSelectDistrict={handleSelectDistrict}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'district' && (
          <ErrorBoundary sectionName="District Intelligence">
            <div className="space-y-6">
              <DistrictIntelligence 
                selectedDistrictId={selectedDistrictId}
                onSelectDistrict={setSelectedDistrictId}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'regime' && (
          <ErrorBoundary sectionName="Weather Regime Monitor">
            <div className="space-y-6">
              <RegimeMonitor />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'lens' && (
          <ErrorBoundary sectionName="Raw vs AI Lens">
            <div className="space-y-6">
              <RawVsAiLens 
                onSelectDistrict={handleSelectDistrict}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'extreme' && (
          <ErrorBoundary sectionName="Extreme Rainfall Monitor">
            <div className="space-y-6">
              <ExtremeRainfallMonitor 
                onSelectDistrict={handleSelectDistrict}
              />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'verification' && (
          <ErrorBoundary sectionName="Verification Engine">
            <div className="space-y-6">
              <VerificationEngine />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'imd' && (
          <ErrorBoundary sectionName="IMD MAUSAM Explorer">
            <div className="space-y-6">
              <ImdDataExplorer />
            </div>
          </ErrorBoundary>
        )}

        {activeTab === 'assistant' && (
          <ErrorBoundary sectionName="RAINWISE Assistant">
            <div className="space-y-6">
              <RainwiseAssistant 
                onSelectDistrict={handleSelectDistrict}
                currentDistrictId={selectedDistrictId}
              />
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Floating RAINWISE Assistant Button */}
      <button
        id="open-rainwise-floating-btn"
        onClick={() => setIsAssistantDrawerOpen(!isAssistantDrawerOpen)}
        className="btn-primary"
        style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 40,
          borderRadius: '6px', padding: '10px 16px',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.8125rem'
        }}
        title="Open RAINWISE AI Meteorological Assistant"
      >
        <Bot className="w-4 h-4" />
        <span>RAINWISE AI</span>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }}></span>
      </button>

      {/* Slide-out RAINWISE Assistant Drawer */}
      {isAssistantDrawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: '520px', height: '100%', padding: '8px' }}>
            <RainwiseAssistant
              isDrawer={true}
              onCloseDrawer={() => setIsAssistantDrawerOpen(false)}
              onSelectDistrict={handleSelectDistrict}
              currentDistrictId={selectedDistrictId}
            />
          </div>
        </div>
      )}

      {/* Side Alerts Drawer */}
      <AlertsPanel 
        isOpen={isAlertsOpen} 
        onClose={() => setIsAlertsOpen(false)}
        onSelectDistrict={handleSelectDistrict}
      />

      {/* Professional MahaRain-Style Portal Footer */}
      <footer style={{ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '24px 16px', marginTop: '32px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CloudRain style={{ width: '18px', height: '18px', color: '#FFFFFF' }} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.875rem' }}>
                  VARSHA AI — Regime-Aware Rainfall Intelligence & Decision Support
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Forecast Guidance: NOAA NCEP GFS 0.25° &nbsp;|&nbsp; Reference: ECMWF ERA5-Land Reanalysis
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', fontWeight: 600 }}>
              <a 
                href="https://mausam.imd.gov.in/responsive/rainfallinformation.php" 
                target="_blank" 
                rel="noreferrer"
                style={{ color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                IMD MAUSAM Reference <ExternalLink style={{ width: '12px', height: '12px' }} />
              </a>
              <span>•</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                {backendStatus ? `${backendStatus.total_records_processed} Validated Records` : '10,317 Validated Records'}
              </span>
              <span>•</span>
              <span style={{ fontWeight: 700, color: 'var(--navy)', fontFamily: 'var(--font-mono)' }}>
                Model: VARSHA AI V2
              </span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
            <div>
              57 Monitored Meteorological Districts &nbsp;|&nbsp; 24-Hour Forecast Window (00-24 UTC)
            </div>
            <div>
              Scientific note: VARSHA AI V2 is evaluated against ERA5-Land reference precipitation with verified RMSE skill and documented trade-offs.
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
