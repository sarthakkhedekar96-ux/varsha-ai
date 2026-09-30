import React, { useState, useEffect } from 'react';
import { fetchCurrentRainfall } from '../api/client';
import { Database, ExternalLink, Layers, ShieldCheck, Info, RefreshCw } from 'lucide-react';

export default function ImdDataExplorer() {
  const [rainfallData, setRainfallData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentRainfall()
      .then(data => setRainfallData(data))
      .catch(err => console.warn('[ImdDataExplorer] Live fetch:', err))
      .finally(() => setLoading(false));
  }, []);

  const records = rainfallData?.data || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Reference Data Explorer</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '700px' }}>
            Model training, verification, and baseline validation targets are anchored to ECMWF ERA5-Land reanalysis precipitation.
          </p>
        </div>
        <a href="https://mausam.imd.gov.in" target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          Open IMD Portal <ExternalLink style={{ width: '12px', height: '12px' }} />
        </a>
      </div>

      {/* Data Provenance */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
          <Database style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
          Data Provenance &amp; Operational Setup
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {/* Reference Target */}
          <div style={{ padding: '16px', background: 'var(--green-subtle)', border: '1px solid var(--green-border)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>Evaluation Reference (Y)</span>
              <span className="badge badge-normal">Target</span>
            </div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>ECMWF ERA5-Land Reanalysis</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              ERA5-Land reanalysis precipitation evaluated against NOAA NCEP GFS 0.25° forecasts across 10,317 validated records.
            </p>
            <div style={{ fontSize: '0.6875rem', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '8px' }}>
              Frozen Dataset: 10,317 records &bull; Test: 1,596 rows
            </div>
          </div>

          {/* Predictors */}
          <div style={{ padding: '16px', background: 'var(--blue-subtle)', border: '1px solid var(--blue-border)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>Predictor Features (X)</span>
              <span className="badge badge-info">Input</span>
            </div>
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Raw NWP Forecast + Synoptic Atmosphere</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              GFS raw rainfall, wind shear, vorticity, CAPE, elevation, and terrain aspect used as predictor features.
            </p>
            <div style={{ fontSize: '0.6875rem', color: 'var(--blue)', fontFamily: 'var(--font-mono)', fontWeight: 600, marginTop: '8px' }}>
              Resolution: 0.25° Global &bull; Lead Time: +24h
            </div>
          </div>
        </div>
      </div>

      {/* Live Table */}
      <div className="portal-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
          Latest Reference Precipitation Table
        </h3>

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Loading reference precipitation records...
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Live reference stream records will populate dynamically with operational validation passes.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>District</th>
                  <th>State</th>
                  <th className="num">Reference Rain (mm)</th>
                  <th className="num">Normal (mm)</th>
                  <th className="num">Departure (%)</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 15).map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td style={{ fontWeight: 700 }}>{row.district}</td>
                    <td>{row.state}</td>
                    <td className="num font-mono">{Number(row.era5_land_reference_rainfall_mm ?? 0).toFixed(1)}</td>
                    <td className="num font-mono">{Number(row.normal_rainfall_mm ?? 0).toFixed(1)}</td>
                    <td className="num font-mono">{row.rainfall_departure_percent != null ? `${Number(row.rainfall_departure_percent).toFixed(0)}%` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
