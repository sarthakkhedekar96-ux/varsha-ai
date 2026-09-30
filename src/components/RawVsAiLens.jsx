import React, { useState } from 'react';
import { WEATHER_REGIMES, getRegimeInfo } from '../data/regimes';
import { INDIA_DISTRICTS_57 } from '../data/districtMaster';
import { useDistricts } from '../api/client';
import { Layers, AlertTriangle, BarChart2, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

export default function RawVsAiLens({ onSelectDistrict }) {
  const { districts: liveDistricts, loading, error, refresh } = useDistricts();
  const districtsList = liveDistricts && liveDistricts.length > 0 ? liveDistricts : INDIA_DISTRICTS_57;

  const [filterRegime, setFilterRegime] = useState('ALL');
  
  const filteredDistricts = filterRegime === 'ALL' 
    ? districtsList 
    : districtsList.filter(d => d.regime === filterRegime);

  const disagreementDistricts = districtsList.filter(d => {
    const gfs = Number(d.nwpForecast ?? d.raw_gfs_rainfall_mm ?? 0);
    const ai = Number(d.aiCorrected ?? d.corrected_rainfall_mm ?? 0);
    const delta = Number(d.delta ?? (ai - gfs));
    return Math.abs(delta) >= 2.0;
  });

  const chartData = filteredDistricts.slice(0, 15).map(d => ({
    name: d.name,
    nwp: Number(d.nwpForecast ?? d.raw_gfs_rainfall_mm ?? 0),
    ai: Number(d.aiCorrected ?? d.corrected_rainfall_mm ?? 0),
    observed: Number(d.observed_reference_mm ?? d.observedReference ?? d.observedImd ?? 0)
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Raw GFS vs VARSHA AI V2 Lens</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '600px' }}>
            Comparison between raw numerical guidance and VARSHA AI's post-processed district rainfall output.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Regime:</label>
          <select value={filterRegime} onChange={(e) => setFilterRegime(e.target.value)} className="portal-select" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
            <option value="ALL">All Regimes</option>
            {Object.values(WEATHER_REGIMES).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Model Disagreement Alerts */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <AlertTriangle style={{ width: '16px', height: '16px', color: 'var(--amber)' }} />
              Model Correction Deltas across Reporting Districts
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Districts where VARSHA AI makes calibrated adjustments over raw GFS guidance
            </p>
          </div>
          <span className="badge badge-warning">{disagreementDistricts.length} Districts</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {(disagreementDistricts ?? []).slice(0, 6).map((district) => {
            const gfs = Number(district.nwpForecast ?? district.raw_gfs_rainfall_mm ?? 0);
            const ai = Number(district.aiCorrected ?? district.corrected_rainfall_mm ?? 0);
            const delta = Number(district.delta ?? (ai - gfs));
            const shiftPct = gfs > 0 ? ((delta / gfs) * 100).toFixed(0) : '0';
            const regInfo = getRegimeInfo(district.regime);

            return (
              <div key={district.id} className="portal-card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{district.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{district.state}</div>
                  </div>
                  <span className={`badge ${delta >= 0 ? 'badge-critical' : 'badge-info'}`}>
                    {delta >= 0 ? `+${shiftPct}%` : `${shiftPct}%`}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem', background: 'var(--surface-muted)', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Raw GFS</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{gfs.toFixed(1)} mm</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.625rem', color: 'var(--blue)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>VARSHA AI V2</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{ai.toFixed(1)} mm</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                  <strong style={{ color: 'var(--blue)' }}>Regime:</strong> {regInfo.name} ({regInfo.code})
                </p>

                <button onClick={() => onSelectDistrict && onSelectDistrict(district.id)} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.6875rem', padding: '6px' }}>
                  Inspect District
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
          <BarChart2 style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
          District-wise Guidance Comparison (Sample Monitored Divisions)
        </h3>

        <div style={{ height: '320px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} unit="mm" />
              <Tooltip 
                contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border-strong)', borderRadius: '6px', boxShadow: 'var(--shadow-md)' }}
                labelStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.75rem' }} />
              <Bar dataKey="nwp" name="Raw GFS (mm)" fill="#94A3B8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="ai" name="VARSHA AI V2 (mm)" fill="var(--blue)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="observed" name="ERA5-Land Ref (mm)" fill="var(--green)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
