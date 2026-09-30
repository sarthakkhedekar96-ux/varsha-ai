import React, { useState, useMemo } from 'react';
import { WEATHER_REGIMES, getRegimeInfo } from '../data/regimes';
import { INDIA_DISTRICTS_57, getDistrictMeta } from '../data/districtMaster';
import { useDistricts } from '../api/client';
import { ShieldAlert, History, Zap, CheckCircle2, Info, RefreshCw, AlertTriangle } from 'lucide-react';

export default function ExtremeRainfallMonitor({ onSelectDistrict }) {
  const { districts: liveDistricts, loading, error, refresh } = useDistricts();
  const districtsList = liveDistricts && liveDistricts.length > 0 ? liveDistricts : INDIA_DISTRICTS_57;

  const [searchDistrictId, setSearchDistrictId] = useState('wayanad');
  const normSearchId = String(searchDistrictId || 'wayanad').toLowerCase().trim();

  // Find selected district in list
  const selectedDistrict = useMemo(() => {
    const found = districtsList.find(d => d.id.toLowerCase() === normSearchId) || getDistrictMeta(normSearchId);
    return found || districtsList[0] || INDIA_DISTRICTS_57[0];
  }, [districtsList, normSearchId]);

  // Identify extreme / high risk hotspots from live API
  const extremeDistricts = useMemo(() => {
    return (districtsList ?? []).filter(d => 
      d.heavy_rain_alert || 
      (d.heavy_rain_probability != null && d.heavy_rain_probability >= 0.20) ||
      (d.heavyProb && d.heavyProb.p64 >= 20) ||
      d.riskLevel === 'CRITICAL' ||
      d.riskLevel === 'HIGH' ||
      Number(d.aiCorrected || d.corrected_rainfall_mm || 0) >= 64.5
    );
  }, [districtsList]);

  const selectedRegime = getRegimeInfo(selectedDistrict?.regime);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Extreme Rainfall Monitor</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '700px' }}>
            Live monitoring of districts exceeding the operational heavy-rain decision threshold (&tau;<sub>heavy</sub> = 0.20 for &ge; 64.5 mm / 24h).
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px' }}
        >
          <RefreshCw style={{ width: '14px', height: '14px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Error State Banner if API failed */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.75rem', color: '#991B1B' }}>
          <AlertTriangle style={{ width: '16px', height: '16px', color: '#DC2626', flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={refresh} style={{ background: 'transparent', border: 'none', color: '#DC2626', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.75rem' }}>Retry</button>
        </div>
      )}

      {/* Threshold Info Cards */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div className="portal-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
          <ShieldAlert style={{ width: '18px', height: '18px', color: 'var(--red)' }} />
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Heavy Rain Threshold</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>64.5 mm / 24h</div>
          </div>
        </div>
        <div className="portal-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
          <Info style={{ width: '18px', height: '18px', color: 'var(--blue)' }} />
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decision Gate (&tau;<sub>heavy</sub>)</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>P &ge; 0.20 (20%)</div>
          </div>
        </div>
        <div className="portal-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
          <ShieldAlert style={{ width: '18px', height: '18px', color: extremeDistricts.length > 0 ? 'var(--red)' : 'var(--green)' }} />
          <div>
            <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Alert Hotspots</div>
            <div style={{ fontWeight: 700, color: extremeDistricts.length > 0 ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--font-mono)' }}>
              {loading ? '...' : `${extremeDistricts.length} Districts`}
            </div>
          </div>
        </div>
      </div>

      {/* Hotspots Table */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Active Heavy Rainfall Hotspots</span>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {extremeDistricts.length} districts flagged
          </span>
        </h3>

        {extremeDistricts.length === 0 ? (
          /* Empty State */
          <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <CheckCircle2 style={{ width: '36px', height: '36px', color: 'var(--green)', margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px 0' }}>
              No Extreme Rainfall Districts in Current 24h Window
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              All 57 monitored districts are currently below the calibrated heavy-rain trigger (P &lt; 0.20 for &ge; 64.5 mm).
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>District</th>
                  <th>State</th>
                  <th>V2 Forecast</th>
                  <th>P(&ge;64.5mm)</th>
                  <th>Regime</th>
                  <th>P90 Bound</th>
                  <th>Risk Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {extremeDistricts.map((district) => {
                  const regInfo = getRegimeInfo(district.regime);
                  const isExtreme = district.riskLevel === 'CRITICAL' || district.riskLevel === 'EXTREME' || district.heavy_rain_alert;
                  const heavyProbNum = district.heavy_rain_probability != null 
                    ? (district.heavy_rain_probability > 1 ? Math.round(district.heavy_rain_probability) : Math.round(district.heavy_rain_probability * 100))
                    : (district.heavyProb?.p64 ?? 0);
                  const aiVal = Number(district.aiCorrected ?? district.corrected_rainfall_mm ?? 0);
                  const p90Val = district.p90 != null ? Number(district.p90) : (district.uncertainty?.p90 != null ? Number(district.uncertainty.p90) : aiVal * 1.3);

                  return (
                    <tr key={district.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{district.name}</td>
                      <td>{district.state}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)', textAlign: 'right' }}>
                        {aiVal.toFixed(1)} mm
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'right', color: heavyProbNum >= 20 ? 'var(--red)' : 'var(--text-secondary)' }}>
                        {heavyProbNum}%
                      </td>
                      <td><span className="badge badge-info">{regInfo.code}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{p90Val.toFixed(1)} mm</td>
                      <td>
                        <span className={`badge ${isExtreme ? 'badge-critical' : 'badge-warning'}`}>
                          {district.riskLevel || (isExtreme ? 'CRITICAL' : 'HIGH')}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => { 
                            setSearchDistrictId(district.id); 
                            if (onSelectDistrict) onSelectDistrict(district.id); 
                          }} 
                          className="btn-secondary" 
                          style={{ fontSize: '0.6875rem', padding: '4px 10px' }}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Analog Search */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <History style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
              Historical Synoptic Analog Search
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Queries past 25-year atmospheric archives for top synoptic matches
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="extreme-target-district" style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target:</label>
            <select 
              id="extreme-target-district" 
              value={normSearchId} 
              onChange={(e) => setSearchDistrictId(e.target.value)} 
              className="portal-select" 
              style={{ fontSize: '0.75rem', padding: '6px 10px' }}
            >
              {(districtsList ?? []).map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.state})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="info-banner-blue" style={{ marginBottom: '16px' }}>
          <Zap style={{ width: '14px', height: '14px', color: 'var(--blue)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Matching synoptic state: <strong>{selectedRegime.name}</strong> with terrain: {selectedDistrict?.terrain || 'Plains'}
          </p>
        </div>

        <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Top Historical Matches</h4>
        
        {/* Clean Empty State as requested */}
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <Info style={{ width: '24px', height: '24px', color: 'var(--blue)', margin: '0 auto 8px auto' }} />
          <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--navy)', margin: '0 0 4px 0' }}>
            Historical Analog Records Not Available for this Operational Run
          </h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Synoptic analog similarity retrieval is computed on-demand via offline archival index and is not bundled in daily live operational inferences.
          </p>
        </div>

      </div>

    </div>
  );
}
