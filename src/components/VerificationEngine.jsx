import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, ShieldCheck, Sliders, Layers, MapPin, Info, Check, X, Flame } from 'lucide-react';
import { fetchVerificationData, fetchRegimeVerification, fetchDistrictVerification } from '../data/apiClient';

export default function VerificationEngine() {
  const [verificationData, setVerificationData] = useState(null);
  const [regimeData, setRegimeData] = useState(null);
  const [districtData, setDistrictData] = useState(null);
  const [districtSearch, setDistrictSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllVerification() {
      try {
        const v = await fetchVerificationData();
        const r = await fetchRegimeVerification();
        const d = await fetchDistrictVerification();
        if (v) setVerificationData(v);
        if (r && r.data) setRegimeData(r.data);
        if (d && d.data) setDistrictData(d.data);
      } catch (err) {
        console.error("Failed to load verification metrics:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAllVerification();
  }, []);

  const filteredDistricts = (districtData || []).filter(item => 
    item.district.toLowerCase().includes(districtSearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Model Verification</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '700px' }}>
            Held-out evaluation of Raw GFS and VARSHA AI V2 against the ECMWF ERA5-Land reference dataset. Test period: September 2–29, 2026 (1,596 records).
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>PARTIAL IMPROVEMENT WITH TRADE-OFFS</span>
          <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>Dataset SHA-256: 279a1e...eb39</span>
        </div>
      </div>

      {/* Scientific Integrity Protocol */}
      <div className="portal-card" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
          <ShieldCheck style={{ width: '14px', height: '14px', color: 'var(--green)' }} />
          Scientific Integrity & Methodology Protocol
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.75rem' }}>
          {[
            { icon: <Check style={{ width: '12px', height: '12px', color: 'var(--green)' }} />, title: 'Source Separation', text: 'NOAA GFS NWP forecast evaluated against independent ECMWF ERA5-Land reanalysis. Zero ERA5 leakage.' },
            { icon: <Check style={{ width: '12px', height: '12px', color: 'var(--green)' }} />, title: 'Zero Synthetic Data', text: '100% of rows are real meteorological guidance and reanalysis. Zero mock or interpolated rain.' },
            { icon: <Check style={{ width: '12px', height: '12px', color: 'var(--green)' }} />, title: 'Chronological Split', text: 'Train (70%), Val (15%), Test (15%). Thresholds tuned on validation only.' },
            { icon: <AlertTriangle style={{ width: '12px', height: '12px', color: 'var(--amber)' }} />, title: 'FSS: Not Computable', text: 'Dataset consists of 57 discrete district centroids. FSS requires continuous 2D spatial fields.' },
          ].map((item, idx) => (
            <div key={idx} style={{ padding: '10px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {item.icon} {item.title}
              </div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Scorecard Table */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
          <BarChart3 style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
          Held-Out Test Set Scorecard
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          Objective comparison of Raw GFS, Model V1 (Single-Stage), and Model V2 (Two-Stage Gated). Threshold: ≥64.5 mm / 24h.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Raw GFS 0.25°</th>
                <th>V1 (Regime-Aware)</th>
                <th>V2 (Two-Stage Gated)</th>
                <th>V2 vs GFS Change</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'RMSE (mm)', gfs: '8.7433', v1: '7.9210', v2: '7.8428', change: '+10.30%', better: true, note: 'Significant Error Reduction' },
                { metric: 'MAE (mm)', gfs: '4.0380', v1: '4.8974', v2: '4.7963', change: '-18.78%', better: false, note: 'Raw GFS cleaner on dry days (Known Trade-off)', gfsBest: true },
                { metric: 'Mean Bias (mm)', gfs: '-0.0915', v1: '+2.9901', v2: '+2.8382', change: '+2.93 mm', better: null, note: 'Light overprediction on dry days' },
                { metric: 'Pearson r', gfs: '0.6882', v1: '0.7179', v2: '0.7248', change: '+0.0366', better: true, note: 'Strongest linear association' },
                { metric: 'Heavy Rain CSI (≥64.5mm)', gfs: '0.2500', v1: '0.0667', v2: '0.3636', change: '+45.44%', better: true, note: 'Substantial CSI Gain', highlight: true },
                { metric: 'Heavy Rain POD', gfs: '0.8000 (4/5)', v1: '0.2000 (1/5)', v2: '0.8000 (4/5)', change: 'Matched', better: null, note: '4 of 5 events detected' },
                { metric: 'Heavy Rain FAR', gfs: '0.7333 (11 FPs)', v1: '0.9091 (10 FPs)', v2: '0.6000 (6 FPs)', change: '-18.18%', better: true, note: 'False alarms cut from 11 to 6' },
              ].map((row, idx) => (
                <tr key={idx} style={row.highlight ? { background: 'var(--blue-subtle)' } : {}}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.metric}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: row.gfsBest ? 'var(--green)' : 'var(--text-muted)', fontWeight: row.gfsBest ? 700 : 400 }}>{row.gfs}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{row.v1}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{row.v2}</td>
                  <td>
                    <span className={`badge ${row.better === true ? 'badge-normal' : row.better === false ? 'badge-critical' : 'badge-muted'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                      {row.change}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dry-Day & Heavy Rain Classifier */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Dry-Day */}
        <div className="portal-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
            <Sliders style={{ width: '16px', height: '16px', color: 'var(--amber)' }} />
            Dry-Day False-Rain Analysis
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>Test set: 177 non-precipitating days (0.0 mm)</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: 'Raw GFS', value: '13.0%', sub: 'Mean: 0.37 mm', color: 'var(--green)' },
              { label: 'V1 Regressor', value: '96.0%', sub: 'Mean: 2.40 mm', color: 'var(--red)' },
              { label: 'V2 Two-Stage', value: '49.7%', sub: 'Mean: 1.80 mm', color: 'var(--blue)' },
            ].map((item, idx) => (
              <div key={idx} style={{ padding: '10px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{item.value}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginTop: '2px' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--blue)' }}>Takeaway:</strong> V2's classification gate (τ = 0.60) cuts false-rain from 96% to 49.7%. However, raw GFS remains cleaner on completely dry days (13%), explaining the MAE trade-off.
          </div>
        </div>

        {/* Heavy Rain Classifier */}
        <div className="portal-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
            <Flame style={{ width: '16px', height: '16px', color: 'var(--red)' }} />
            Heavy Rainfall Classifier
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>Dedicated probabilistic head with class-weight rebalancing</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            {[
              { label: 'ROC-AUC', value: '0.9517', sub: 'High Discrimination', color: 'var(--blue)' },
              { label: 'Brier Score', value: '0.0032', sub: 'Highly Calibrated', color: 'var(--green)' },
              { label: 'Decision τ', value: '0.20', sub: 'Validation Frozen', color: 'var(--amber)' },
            ].map((item, idx) => (
              <div key={idx} style={{ padding: '10px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: item.color, fontFamily: 'var(--font-mono)', marginTop: '4px' }}>{item.value}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginTop: '2px' }}>{item.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--red)' }}>Alert Design:</strong> With only 5 heavy events in the test split, the standard 0.50 cutoff suppresses alerts. The frozen τ = 0.20 captures 4/5 events while cutting false alarms from 11 to 6.
          </div>
        </div>
      </div>

      {/* Regime-Wise Table */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px 0' }}>
          <Layers style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
          Regime-Wise Performance Breakdown
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          Performance by synoptic regime on the held-out test set.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-custom">
            <thead>
              <tr>
                <th>Regime</th>
                <th>Samples</th>
                <th>Raw GFS RMSE</th>
                <th>V1 RMSE</th>
                <th>V2 RMSE</th>
                <th>V2 Skill Change</th>
                <th>V2 MAE</th>
              </tr>
            </thead>
            <tbody>
              {(regimeData || []).map((r, idx) => {
                const isPositive = r.v2_rmse_improvement_pct > 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.regime_name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.sample_count}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.raw_rmse} mm</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.v1_rmse} mm</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{r.v2_rmse} mm</td>
                    <td>
                      <span className={`badge ${isPositive ? 'badge-normal' : 'badge-critical'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                        {isPositive ? `+${r.v2_rmse_improvement_pct}%` : `${r.v2_rmse_improvement_pct}%`}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.v2_mae} mm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* District-Wise Table */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <MapPin style={{ width: '16px', height: '16px', color: 'var(--green)' }} />
              District-Wise Verification (57 Districts)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              28 improved (up to +47.6%), 29 degraded (predominantly dry interior plains)
            </p>
          </div>
          <input type="text" placeholder="Search district..." value={districtSearch} onChange={(e) => setDistrictSearch(e.target.value)}
            className="portal-input" style={{ width: '220px' }} />
        </div>

        <div style={{ overflowX: 'auto', maxHeight: '384px', overflowY: 'auto' }}>
          <table className="table-custom">
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th>District</th>
                <th>Samples</th>
                <th>Raw GFS RMSE</th>
                <th>V1 RMSE</th>
                <th>V2 RMSE</th>
                <th>V2 Change %</th>
                <th>V2 MAE</th>
              </tr>
            </thead>
            <tbody>
              {filteredDistricts.map((d, idx) => {
                const isImproved = d.v2_rmse_improvement_percent > 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.district}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.sample_count}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.raw_rmse} mm</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.v1_rmse} mm</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--blue)' }}>{d.v2_rmse} mm</td>
                    <td>
                      <span className={`badge ${isImproved ? 'badge-normal' : 'badge-critical'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                        {isImproved ? `+${d.v2_rmse_improvement_percent}%` : `${d.v2_rmse_improvement_percent}%`}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{d.v2_mae} mm</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
