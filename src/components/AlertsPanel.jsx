import React, { useState, useEffect } from 'react';
import { fetchActiveAlerts } from '../api/client';
import { Bell, X, AlertTriangle, Info, CheckCircle2, ExternalLink } from 'lucide-react';

export default function AlertsPanel({ isOpen, onClose, onSelectDistrict }) {
  const [filter, setFilter] = useState('ALL');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    fetchActiveAlerts()
      .then(res => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.alerts || []);
        const formatted = list.map(a => ({
          id: a.district_id || a.id || a.district,
          district: a.district || a.district_name || a.name,
          severity: a.severity || (a.heavy_rain_prob >= 40 || a.heavy_rain_probability >= 0.4 ? 'CRITICAL' : 'WARNING'),
          type: a.type || 'HEAVY RAIN DETECTED',
          title: `Heavy Rain Alert: ${a.district || a.name}`,
          message: `Predicted: ${a.forecast_mm != null ? Number(a.forecast_mm).toFixed(1) : (a.corrected_rainfall_mm != null ? Number(a.corrected_rainfall_mm).toFixed(1) : '0.0')} mm | Heavy Rain Prob: ${a.heavy_rain_prob != null ? Number(a.heavy_rain_prob).toFixed(1) : ((a.heavy_rain_probability || 0) * 100).toFixed(1)}% | Regime: ${a.regime || 'Monsoon'}`,
          timestamp: a.forecast_date || '2026-09-29',
          prob: a.heavy_rain_prob != null ? a.heavy_rain_prob : ((a.heavy_rain_probability || 0) * 100),
          rainfall: a.forecast_mm ?? a.corrected_rainfall_mm ?? a.predicted_rainfall_mm,
          regime: a.regime
        }));
        setAlerts(formatted);
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[AlertsPanel] Live alerts fetch error:', err);
          setAlerts([]);
        }
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter(alert => filter === 'ALL' || alert.severity === filter);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.35)', display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: 'var(--surface)', borderLeft: '1px solid var(--border)', height: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--red-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell style={{ width: '16px', height: '16px', color: 'var(--red)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Active Alerts</h3>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: 0 }}>VARSHA AI V2 Heavy Rain Decision Triggers</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Severity Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'CRITICAL', 'WARNING'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: '0.6875rem', fontWeight: 600,
                padding: '4px 10px', borderRadius: '4px',
                border: filter === f ? '1px solid var(--blue)' : '1px solid var(--border)',
                background: filter === f ? 'var(--blue-subtle)' : 'var(--surface)',
                color: filter === f ? 'var(--blue)' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {f} ({f === 'ALL' ? alerts.length : alerts.filter(a => a.severity === f).length})
            </button>
          ))}
        </div>

        {/* Alerts List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Checking active telemetry alerts...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', background: 'var(--surface-muted)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <CheckCircle2 style={{ width: '28px', height: '28px', color: 'var(--green)', margin: '0 auto 8px auto' }} />
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>No Active Weather Alerts</div>
              <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                All monitored districts currently below P(&ge;64.5mm) = 0.20 trigger.
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '12px',
                  borderRadius: '6px',
                  border: alert.severity === 'CRITICAL' ? '1px solid #FECACA' : '1px solid var(--border)',
                  background: alert.severity === 'CRITICAL' ? '#FEF2F2' : 'var(--surface)',
                  display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : 'badge-warning'}`}>
                    {alert.severity}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{alert.timestamp}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{alert.title}</div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{alert.message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <button
                    onClick={() => {
                      if (onSelectDistrict && alert.id) onSelectDistrict(alert.id);
                      onClose();
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.625rem', padding: '3px 8px' }}
                  >
                    Inspect <ExternalLink style={{ width: '10px', height: '10px' }} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
