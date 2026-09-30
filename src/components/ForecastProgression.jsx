import React, { useState } from 'react';
import { GitBranch, Info, Clock, Database, Layers, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Feature #4: Forecast Evolution & Lineage Tracker (PATH B: Safe Fallback Lineage Disclosure)
 */
export default function ForecastProgression({ district, apiData }) {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const districtName = apiData?.name || apiData?.district || district?.name || 'Monitored District';
  const stateName = apiData?.state || district?.state || 'India';
  const rawGfs = apiData?.raw_gfs_rainfall_mm != null ? apiData.raw_gfs_rainfall_mm : (district?.nwpForecast ?? 0.0);
  const aiCorrected = apiData?.corrected_rainfall_mm != null ? apiData.corrected_rainfall_mm : (district?.aiCorrected ?? 0.0);
  const forecastDate = apiData?.forecast_date || '2026-09-29';

  return (
    <div className="portal-card" style={{ padding: '24px', borderRadius: '12px' }} id="forecast-progression-panel">
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <GitBranch style={{ width: '16px', height: '16px', color: 'var(--blue)' }} />
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Forecast Evolution & Lineage
            </span>
            <span className="badge badge-warning" style={{ fontSize: '0.625rem' }}>PATH B: SCIENTIFIC DISCLOSURE</span>
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
            Forecast Lineage &amp; Metadata Provenance <span style={{ fontWeight: 400, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>({districtName}, {stateName})</span>
          </h3>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: 'var(--surface-muted)', border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <Clock style={{ width: '13px', height: '13px', color: 'var(--blue)' }} />
          Target: <strong>{forecastDate}</strong>
        </div>
      </div>

      {/* Tidy Disclaimer Block */}
      <div className="info-banner" style={{ marginBottom: '16px', borderRadius: '8px' }}>
        <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--amber)', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--amber)', display: 'block', marginBottom: '2px' }}>
            Single Operational Run Disclosure
          </strong>
          The validated pipeline maps NOAA NCEP GFS 0.25° numerical guidance to a 24-hour Operational Window. Sub-daily initialization cycles (00Z/06Z/12Z/18Z) are aggregated in upstream reanalysis and should not be interpreted as multi-cycle ensemble comparison.
        </div>
      </div>

      {/* Lineage & Metadata Specifications (2 Column Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        
        {/* Source Specifications */}
        <div style={{ padding: '16px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Database style={{ width: '13px', height: '13px', color: 'var(--blue)' }} />
            Validated Forecast Source
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              ['Forecast Source', 'NOAA NCEP GFS 0.25° guidance'],
              ['Endpoint', 'historical-forecast-api.open-meteo.com'],
              ['Model Parameter', 'models=gfs_seamless'],
              ['Forecast Window', '24-hour Operational Window (00-24 UTC)'],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: '110px' }}>{label}:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Baseline Guidance:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>
                GFS: {rawGfs.toFixed(1)} mm &bull; V2: {aiCorrected.toFixed(1)} mm
              </span>
            </div>
          </div>
        </div>

        {/* Source vs Application Metadata */}
        <div style={{ padding: '16px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Layers style={{ width: '13px', height: '13px', color: 'var(--blue)' }} />
            Metadata Provenance Tier
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem' }}>
            {[
              ['Precipitation Field', 'SOURCE-PROVIDED', 'badge-normal', 'Extracted directly from numerical NWP dataset'],
              [`Target Date (${forecastDate})`, 'SOURCE-PROVIDED', 'badge-normal', 'Authoritative validation date index'],
              ['Nominal 00:00 UTC Initialization', 'APPLICATION-ASSIGNED', 'badge-info', 'Operational portal calendar mapping'],
              ['Nominal 24h Lead Window', 'APPLICATION-ASSIGNED', 'badge-info', 'Daily accumulation aggregation standard'],
              ['Independent Sub-daily Runs', 'NOT PROVIDED', 'badge-muted', 'Sub-daily initialization not retained in stream']
            ].map(([label, badgeText, badgeClass, tooltipText], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
                <span className={`badge ${badgeClass}`} title={tooltipText} style={{ fontSize: '0.625rem' }}>
                  {badgeText}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Collapsible Technical Note */}
      <div style={{ background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        <button
          onClick={() => setIsNoteOpen(!isNoteOpen)}
          style={{
            width: '100%',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            fontWeight: 600
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
            <span>Why multi-cycle comparison is not enabled</span>
          </div>
          {isNoteOpen ? <ChevronUp style={{ width: '14px', height: '14px' }} /> : <ChevronDown style={{ width: '14px', height: '14px' }} />}
        </button>

        {isNoteOpen && (
          <div style={{ padding: '0 14px 12px 14px', fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Open-Meteo's <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>models=gfs_seamless</code> parameter aggregates guidance into a continuous daily time-series and does not preserve separate sub-daily cycles (00Z, 06Z, 12Z, 18Z) for the same historical target date.
          </div>
        )}
      </div>

    </div>
  );
}

