import React, { useState, useEffect } from 'react';
import { WEATHER_REGIMES, getRegimeInfo } from '../data/regimes';
import { fetchCurrentRegimes } from '../api/client';
import { Cpu, ArrowRight, ShieldAlert, CheckCircle2, Sliders, Activity } from 'lucide-react';

export default function RegimeMonitor() {
  const [selectedRegimeKey, setSelectedRegimeKey] = useState('ACTIVE_MONSOON');
  const [liveRegimes, setLiveRegimes] = useState(null);

  useEffect(() => {
    fetchCurrentRegimes().then(res => {
      if (res && res.active_regimes) {
        setLiveRegimes(res.active_regimes);
      }
    }).catch(() => {});
  }, []);

  const selectedRegime = getRegimeInfo(selectedRegimeKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Forecast Regime Analysis</h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '700px' }}>
          VARSHA AI classifies each forecast scenario under a synoptic regime proxy to route predictions to specialized Two-Stage Gated post-processors.
        </p>
      </div>

      {/* Architecture Flow */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
          <Sliders style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
          Model Router Execution Flow
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'center', textAlign: 'center', fontSize: '0.75rem' }}>
          <div className="portal-card" style={{ padding: '14px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--blue-subtle)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>1</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Raw NWP Inputs</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>GFS 0.25° grid</div>
          </div>

          <div className="hidden md:flex" style={{ justifyContent: 'center', color: 'var(--text-dim)' }}>
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </div>

          <div className="portal-card" style={{ padding: '14px', borderColor: 'var(--blue-border)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--blue-subtle)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>2</div>
            <div style={{ fontWeight: 700, color: 'var(--blue)' }}>Regime Proxy</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Atmospheric predictors</div>
          </div>

          <div className="hidden md:flex" style={{ justifyContent: 'center', color: 'var(--text-dim)' }}>
            <ArrowRight style={{ width: '18px', height: '18px' }} />
          </div>

          <div className="portal-card" style={{ padding: '14px', borderColor: 'var(--green-border)' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--green-subtle)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>3</div>
            <div style={{ fontWeight: 700, color: 'var(--green)' }}>Two-Stage Post-Processor</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '4px' }}>Stage 1 Gate + Stage 2 Regressor</div>
          </div>
        </div>
      </div>

      {/* Regime Explorer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Regime List */}
        <div className="portal-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            Canonical Regimes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {Object.values(WEATHER_REGIMES).map((reg) => {
              const isSelected = selectedRegimeKey === reg.id;
              return (
                <button
                  key={reg.id}
                  onClick={() => setSelectedRegimeKey(reg.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                    background: isSelected ? 'var(--blue-subtle)' : 'var(--surface)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: isSelected ? 'var(--blue)' : 'var(--text-primary)' }}>
                      {reg.name}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                      Code: {reg.code}
                    </div>
                  </div>
                  <span className={`badge ${reg.badgeClass}`}>
                    {reg.code}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Regime Details */}
        <div className="portal-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <span className={`badge ${selectedRegime.badgeClass}`} style={{ marginBottom: '6px', display: 'inline-block' }}>
                {selectedRegime.code}
              </span>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                {selectedRegime.name}
              </h3>
            </div>
            <Activity style={{ width: '20px', height: '20px', color: 'var(--blue)' }} />
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
            {selectedRegime.description}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.6875rem', color: 'var(--red)', marginBottom: '6px' }}>
                <ShieldAlert style={{ width: '14px', height: '14px' }} /> Typical Raw NWP Bias Profile
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{selectedRegime.typicalNwpBias}</p>
            </div>

            <div>
              <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Key Atmospheric Predictors</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
                {(selectedRegime.keyPredictors ?? []).map((pred, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                    <CheckCircle2 style={{ width: '12px', height: '12px', color: 'var(--green)' }} />
                    {pred}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--blue-subtle)', border: '1px solid var(--blue-border)', borderRadius: '6px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommended Post-Processing Model</div>
                <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: '0.875rem' }}>{selectedRegime.recommendedModel}</div>
              </div>
              <span className="badge badge-info">V2 Two-Stage</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
