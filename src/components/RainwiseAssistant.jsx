import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Sliders, X, Database, Info, RefreshCw } from 'lucide-react';
import { fetchDistricts, fetchDistrictForecast } from '../api/client';
import { INDIA_DISTRICTS_57, getDistrictMeta } from '../data/districtMaster';
import { getRegimeInfo } from '../data/regimes';

export default function RainwiseAssistant({ 
  onSelectDistrict, 
  currentDistrictId = 'pune',
  isDrawer = false,
  onCloseDrawer
}) {
  const [districtsList, setDistrictsList] = useState(INDIA_DISTRICTS_57);
  const [selectedDistrict, setSelectedDistrict] = useState(currentDistrictId || 'pune');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Welcome to RAINWISE — your VARSHA AI weather intelligence assistant. I can explain live forecasts, regime proxies, heavy-rain decision gates, verification trade-offs, and data provenance. How can I help?",
      source: "VARSHA AI V2 Intelligence Core",
      mode: "OPERATIONAL"
    }
  ]);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchDistricts().then(dists => {
      if (dists && Array.isArray(dists) && dists.length > 0) {
        setDistrictsList(dists);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentDistrictId) setSelectedDistrict(currentDistrictId);
  }, [currentDistrictId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const normDistId = String(selectedDistrict || 'pune').toLowerCase().trim();
  const activeDistrictMeta = districtsList.find(d => d.id.toLowerCase() === normDistId) || 
    getDistrictMeta(normDistId) || 
    INDIA_DISTRICTS_57[0];

  const suggestedPrompts = [
    `Forecast for ${activeDistrictMeta.name}`,
    `Heavy rain probability for ${activeDistrictMeta.name}`,
    `Compare with raw GFS for ${activeDistrictMeta.name}`,
    `Current regime for ${activeDistrictMeta.name}`,
    "Verification summary",
    "Data provenance",
    "Model limitations",
    `What if GFS is 80 mm for ${activeDistrictMeta.name}?`
  ];

  const handleSendMessage = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      // Fetch live forecast for the active district
      const fc = await fetchDistrictForecast(normDistId);
      const q = textToSend.toLowerCase();

      let answer = "";
      let sourceTag = "VARSHA AI V2 Live Rest API (/api/forecast)";
      let dataCard = null;
      let mode = "OPERATIONAL";

      if (fc) {
        dataCard = {
          district: fc.name,
          state: fc.state,
          regime: fc.regime,
          corrected_rainfall_mm: fc.corrected_rainfall_mm,
          raw_gfs_rainfall_mm: fc.raw_gfs_rainfall_mm,
          p10: fc.p10,
          p50: fc.p50,
          p90: fc.p90
        };

        const gfs = Number(fc.raw_gfs_rainfall_mm).toFixed(1);
        const v2 = Number(fc.corrected_rainfall_mm).toFixed(1);
        const delta = Number(fc.rainfall_change_mm).toFixed(1);
        const deltaPct = Number(fc.rainfall_change_percent).toFixed(0);
        const heavyProb = (Number(fc.heavy_rain_probability || 0) * 100).toFixed(1);
        const rainProb = (Number(fc.rain_probability || 0) * 100).toFixed(0);
        const regInfo = getRegimeInfo(fc.regime);

        if (q.includes('what if') || q.includes('sensitivity')) {
          mode = "WHAT-IF / SENSITIVITY";
          sourceTag = "VARSHA AI Client Simulation Engine";
          answer = `[WHAT-IF SENSITIVITY TEST]\nFor ${fc.name}, if the raw GFS guidance increases, VARSHA AI V2 Two-Stage Gated ML will evaluate the occurrence gate (currently P=${rainProb}%) and scale the conditional amount based on the ${regInfo.name} regime dynamics.`;
        } else if (q.includes('heavy') || q.includes('alert') || q.includes('probability')) {
          answer = `For ${fc.name} (${fc.state}), the calibrated Heavy Rain Exceedance Probability P(≥64.5mm) is ${heavyProb}%. Operational heavy-rain alert threshold is τ_heavy = 0.20 (20%). Current status: ${fc.heavy_rain_alert ? "TRIGGERED (Critical Heavy Rain Alert)" : "NORMAL (Below Decision Gate)"}.`;
        } else if (q.includes('compare') || q.includes('gfs') || q.includes('raw')) {
          answer = `In ${fc.name}, raw NOAA GFS 0.25° guidance predicts ${gfs} mm. VARSHA AI V2 Two-Stage Gated ML post-processes this to ${v2} mm (correction: ${delta > 0 ? `+${delta}` : delta} mm, ${deltaPct}% shift). Uncertainty interval: 80% probability between P10 ${fc.p10} mm and P90 ${fc.p90} mm.`;
        } else if (q.includes('regime')) {
          answer = `${fc.name} is currently mapped to the "${regInfo.name}" (${regInfo.code}) synoptic regime proxy. Typical NWP bias: ${regInfo.typicalNwpBias}. Recommended model: ${regInfo.recommendedModel}.`;
        } else if (q.includes('verification') || q.includes('skill')) {
          answer = `Independent held-out test verification against ECMWF ERA5-Land reanalysis across 57 districts shows Model V2 reduces overall RMSE from 8.74 mm to 7.84 mm (-10.3% error reduction) and improves Heavy Rain CSI from 0.2500 to 0.3636 (+45.4% improvement).`;
        } else if (q.includes('provenance') || q.includes('data')) {
          answer = `Guidance: NOAA NCEP GFS 0.25° (gfs_seamless). Ground Truth Target: ECMWF ERA5-Land 0.1° reanalysis precipitation. Window: 24-hour daily accumulation (00-24 UTC). Target date: ${fc.forecast_date}.`;
        } else {
          answer = `For ${fc.name} (${fc.state}) on ${fc.forecast_date}:\n• Raw NOAA GFS 0.25° Guidance: ${gfs} mm\n• VARSHA AI V2 Calibrated Prediction: ${v2} mm\n• Correction Delta: ${delta > 0 ? `+${delta}` : delta} mm\n• P(Rain > 0.1mm): ${rainProb}%\n• P(≥64.5mm Heavy Rain): ${heavyProb}%\n• Synoptic Regime: ${regInfo.name} (${regInfo.code})`;
        }
      } else {
        answer = `Could not retrieve live telemetry for ${activeDistrictMeta.name}. Please ensure the FastAPI backend is running.`;
      }

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: answer,
        source: sourceTag,
        mode,
        data: dataCard
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `An error occurred while querying the intelligence engine: ${err.message}`,
          source: 'Error Handler',
          mode: 'ERROR'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSendMessage(); 
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: isDrawer ? '92vh' : '700px',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
      boxShadow: 'var(--shadow-md)', overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bot style={{ width: '18px', height: '18px', color: 'white' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'white', margin: 0 }}>RAINWISE</h2>
            <p style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Weather Intelligence Assistant (Live API Connected)</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select 
            aria-label="Select Target District"
            value={normDistId} 
            onChange={(e) => { 
              setSelectedDistrict(e.target.value); 
              if (onSelectDistrict) onSelectDistrict(e.target.value); 
            }}
            style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
          >
            {(districtsList ?? []).map(d => <option key={d.id} value={d.id} style={{ background: 'var(--navy)', color: 'white' }}>{d.name}</option>)}
          </select>
          {isDrawer && onCloseDrawer && (
            <button onClick={onCloseDrawer} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'white' }}>
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8125rem' }}>
        {(messages ?? []).map((m) => {
          const isUser = m.sender === 'user';
          const isWhatIf = m.mode === 'WHAT-IF / SENSITIVITY' || m.mode === 'WHAT_IF';
          return (
            <div key={m.id} style={{ display: 'flex', gap: '10px', justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              {!isUser && (
                <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Bot style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
                </div>
              )}
              <div style={{ maxWidth: '80%' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: '6px',
                  background: isUser ? 'var(--navy)' : 'var(--surface-muted)',
                  color: isUser ? 'white' : 'var(--text-primary)',
                  border: isUser ? 'none' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {!isUser && isWhatIf && (
                    <div className="info-banner" style={{ padding: '6px 8px', marginBottom: '10px', fontSize: '0.625rem', borderRadius: '4px' }}>
                      <Sliders style={{ width: '10px', height: '10px', color: 'var(--amber)' }} />
                      <span style={{ fontWeight: 700, color: 'var(--amber)' }}>WHAT-IF / SENSITIVITY — Not an operational forecast</span>
                    </div>
                  )}
                  {/* Structured data card */}
                  {!isUser && m.data && m.data.raw_gfs_rainfall_mm != null && (
                    <div style={{ marginBottom: '10px', padding: '10px', borderRadius: '4px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{m.data.district} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.6875rem' }}>({m.data.state})</span></span>
                        <span className="badge badge-info">{m.data.regime || 'NORMAL_BACKGROUND'}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.6875rem' }}>
                        <div style={{ padding: '6px 8px', background: 'var(--surface-muted)', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>VARSHA AI V2</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--blue)', fontSize: '0.9375rem' }}>{Number(m.data.corrected_rainfall_mm).toFixed(1)} mm</span>
                        </div>
                        <div style={{ padding: '6px 8px', background: 'var(--surface-muted)', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.5625rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Raw GFS</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9375rem' }}>{Number(m.data.raw_gfs_rainfall_mm).toFixed(1)} mm</span>
                        </div>
                      </div>
                      {m.data.p10 != null && (
                        <div style={{ marginTop: '6px', fontSize: '0.625rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Uncertainty:</span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>P10: {Number(m.data.p10).toFixed(1)} | P50: {Number(m.data.p50).toFixed(1)} | P90: {Number(m.data.p90).toFixed(1)} mm</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ whiteSpace: 'pre-line', lineHeight: 1.6, fontSize: '0.8125rem' }}>{m.text}</div>
                </div>
                {!isUser && m.source && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.5625rem', color: 'var(--text-dim)', marginTop: '4px', paddingLeft: '4px', fontFamily: 'var(--font-mono)' }}>
                    <Database style={{ width: '10px', height: '10px', color: 'var(--blue)' }} />
                    {m.source}
                  </div>
                )}
              </div>
              {isUser && (
                <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <User style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'var(--blue-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot style={{ width: '14px', height: '14px', color: 'var(--blue)' }} />
            </div>
            <div style={{ padding: '10px 14px', background: 'var(--surface-muted)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Consulting live V2 model intelligence...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div style={{ background: 'var(--surface-muted)', borderTop: '1px solid var(--border)', padding: '8px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
          Suggested queries for {activeDistrictMeta.name}:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(suggestedPrompts ?? []).slice(0, 6).map((prompt, idx) => (
            <button key={idx} onClick={() => handleSendMessage(prompt)}
              style={{ fontSize: '0.6875rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', color: 'var(--blue)', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            id="rainwise-query-input"
            type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={`Ask about ${activeDistrictMeta.name}'s forecast, regime, verification...`}
            disabled={loading}
            className="portal-input" style={{ flex: 1 }}
          />
          <button 
            onClick={() => handleSendMessage()} 
            disabled={loading || !inputQuery.trim()} 
            className="btn-primary" 
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Send style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

    </div>
  );
}
