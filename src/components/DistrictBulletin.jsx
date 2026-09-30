import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Database, 
  Compass, 
  Layers, 
  BarChart2, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  FileText 
} from 'lucide-react';
import { fetchVerificationData, fetchDataProvenance } from '../data/apiClient';

/**
 * Single-District VARSHA AI Intelligence Bulletin / PDF Dossier
 * Feature #3: Operational Single-District Meteorological Intelligence Dossier.
 * 
 * Strictly isolated from What-If sensitivity values.
 * Uses window.print() with comprehensive A4-portrait print stylesheet.
 */
export default function DistrictBulletin({ isOpen, onClose, district, apiData, regimeInfo }) {
  const [provenance, setProvenance] = useState(null);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    fetchDataProvenance()
      .then(res => { if (res) setProvenance(res); })
      .catch(() => {});

    fetchVerificationData()
      .then(res => { if (res) setVerification(res); })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen || !district) return null;

  // Operational telemetry strictly from apiData or local baseline
  const districtName = apiData?.name || apiData?.district || district.name;
  const stateName = apiData?.state || district.state || 'India';
  const subdivision = apiData?.subdivision || district.subdivision || 'Meteorological Subdivision';
  const elevation = apiData?.elevation != null ? apiData.elevation : district.elevation;
  const terrain = apiData?.terrain || district.terrain || 'Plain';
  const lat = apiData?.lat != null ? apiData.lat : district.lat;
  const lng = apiData?.lng != null ? apiData.lng : district.lng;

  // Operational forecasts (Never What-If)
  const rawGfs = apiData?.raw_gfs_rainfall_mm != null ? apiData.raw_gfs_rainfall_mm : (district.nwpForecast ?? 0.0);
  const aiCorrected = apiData?.corrected_rainfall_mm != null ? apiData.corrected_rainfall_mm : (district.aiCorrected ?? 0.0);
  const delta = apiData?.rainfall_change_mm != null ? apiData.rainfall_change_mm : (aiCorrected - rawGfs);
  const rainProb = apiData?.rain_probability != null ? (apiData.rain_probability * 100) : 75.0;
  const heavyProb = apiData?.heavy_rain_probability != null ? (apiData.heavy_rain_probability * 100) : (district.heavyProb?.p64 ?? 12.0);
  const heavyAlert = apiData?.heavy_rain_alert != null ? apiData.heavy_rain_alert : (heavyProb >= 20.0);
  const regimeName = apiData?.regime || district.regime || 'Active Monsoon';
  const regimeReadable = apiData?.regime_readable || regimeName;

  // Quantiles
  const p10 = apiData?.p10 != null ? apiData.p10 : (district.uncertainty?.p10 ?? Math.max(0, aiCorrected * 0.4));
  const p50 = apiData?.p50 != null ? apiData.p50 : (district.uncertainty?.p50 ?? aiCorrected);
  const p90 = apiData?.p90 != null ? apiData.p90 : (district.uncertainty?.p90 ?? (aiCorrected * 1.6 + 5));

  // Risk Level
  const riskLevel = heavyAlert ? 'CRITICAL' : (aiCorrected > 35 ? 'HIGH' : (aiCorrected > 10 ? 'MODERATE' : 'LOW'));

  // Generation timestamp
  const forecastDate = apiData?.forecast_date;
  const displayGenerationTime = forecastDate ? `${forecastDate} (Operational Cycle)` : "Generation time: Application generated";

  // Provenance fallbacks
  const datasetSha = provenance?.dataset_sha256 || "279a1e5c02426d34bc40281e3f65accf5b3487b601045134d87d2b684ceeeb39";
  const totalRecords = provenance?.dataset_total_records || 10317;
  const forecastSource = provenance?.forecast_source || "NOAA NCEP Global Forecast System (GFS) 0.25° guidance";
  const referenceSource = provenance?.reference_source || "ECMWF ERA5-Land reanalysis/reference precipitation";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Print-specific style block */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .bulletin-sheet {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
          .print-text-muted {
            color: #475569 !important;
          }
          .print-bg-light {
            background-color: #f8fafc !important;
          }
          .print-border {
            border-color: #cbd5e1 !important;
          }
        }
      `}} />

      {/* Main Container */}
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden bulletin-sheet flex flex-col text-slate-100 print:text-slate-900 print:bg-white print:border-none print:shadow-none">
        
        {/* On-screen Action Toolbar (Hidden in Print) */}
        <div className="no-print bg-slate-800/90 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-20 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Operational District Intelligence Bulletin
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded border border-emerald-500/30">
                  READY TO PRINT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Single-district dossier for {districtName} ({stateName}) • Formatted for A4 / PDF Export
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              id="print-bulletin-btn"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all border border-cyan-400/30 cursor-pointer"
              title="Open browser print dialog to print or save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              id="close-bulletin-btn"
              className="p-2 hover:bg-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Bulletin"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulletin Document Body */}
        <div className="p-6 md:p-8 space-y-6 print:p-2 print:space-y-4">
          
          {/* ================================================================ */}
          {/* HEADER */}
          {/* ================================================================ */}
          <div className="border-b-2 border-cyan-500 pb-4 print:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black tracking-widest text-cyan-400 print:text-blue-700 uppercase">
                    VARSHA AI V2 METEOROLOGICAL INTELLIGENCE
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 print:bg-slate-200 print:text-slate-800 text-[10px] font-mono font-bold">
                    OFFICIAL DOSSIER
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-white print:text-slate-900 tracking-tight">
                  REGIME-AWARE AI RAINFALL INTELLIGENCE BULLETIN
                </h1>
                <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                  Post-processed numerical weather prediction calibrated against ERA5-Land reference framework
                </p>
              </div>

              {/* Mode & District Target Badge */}
              <div className="text-left md:text-right flex flex-col md:items-end">
                <div className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 print:border-slate-400 print:bg-slate-100 print:text-slate-800 text-xs font-bold font-mono uppercase tracking-wide">
                  MODE: OPERATIONAL DISTRICT BULLETIN
                </div>
                <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1 font-mono">
                  {displayGenerationTime}
                </div>
              </div>
            </div>

            {/* Target Metadata Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-800/50 print:bg-slate-50 p-2 rounded border border-slate-700/50 print:border-slate-200">
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">District</span>
                <span className="font-extrabold text-white print:text-slate-900 text-sm">{districtName}</span>
              </div>
              <div className="bg-slate-800/50 print:bg-slate-50 p-2 rounded border border-slate-700/50 print:border-slate-200">
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">State / Region</span>
                <span className="font-bold text-slate-200 print:text-slate-800">{stateName}</span>
              </div>
              <div className="bg-slate-800/50 print:bg-slate-50 p-2 rounded border border-slate-700/50 print:border-slate-200">
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">Forecast Window</span>
                <span className="font-bold text-slate-200 print:text-slate-800">24-hour Operational Window</span>
              </div>
              <div className="bg-slate-800/50 print:bg-slate-50 p-2 rounded border border-slate-700/50 print:border-slate-200">
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">Model Pipeline</span>
                <span className="font-bold text-cyan-300 print:text-slate-800 font-mono">VARSHA AI V2 (Two-Stage)</span>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 1. EXECUTIVE SUMMARY */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>1.</span> Executive Summary
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Rain Outlook */}
              <div className="p-3 rounded-xl bg-slate-800/70 print:bg-slate-50 border border-slate-700 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">
                  VARSHA AI Corrected Outlook
                </span>
                <div className="text-2xl font-black text-cyan-300 print:text-slate-900 mt-1">
                  {aiCorrected.toFixed(1)} <span className="text-xs font-normal text-slate-400 print:text-slate-600">mm</span>
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600">
                  Raw GFS: {rawGfs.toFixed(1)} mm
                </span>
              </div>

              {/* Rain Occurrence Prob */}
              <div className="p-3 rounded-xl bg-slate-800/70 print:bg-slate-50 border border-slate-700 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">
                  Rain Occurrence Prob (P &gt; 0.1mm)
                </span>
                <div className="text-2xl font-black text-blue-400 print:text-slate-900 mt-1">
                  {rainProb.toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600">
                  Stage 1 Gate: &tau; = 0.60
                </span>
              </div>

              {/* Heavy Rain Prob */}
              <div className="p-3 rounded-xl bg-slate-800/70 print:bg-slate-50 border border-slate-700 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">
                  Heavy Rain Prob (P &ge; 64.5mm)
                </span>
                <div className={`text-2xl font-black mt-1 ${heavyAlert ? 'text-rose-400 print:text-rose-700' : 'text-slate-200 print:text-slate-900'}`}>
                  {heavyProb.toFixed(1)}%
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600">
                  Decision Gate: &tau;<sub>heavy</sub> = 0.20
                </span>
              </div>

              {/* Heavy Rain Alert & Risk */}
              <div className="p-3 rounded-xl bg-slate-800/70 print:bg-slate-50 border border-slate-700 print:border-slate-300">
                <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">
                  Heavy-Rain Decision State
                </span>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 text-xs font-black rounded uppercase ${
                    heavyAlert 
                      ? 'bg-rose-500/20 text-rose-300 print:bg-rose-100 print:text-rose-800 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 print:bg-emerald-100 print:text-emerald-800 border border-emerald-500/30'
                  }`}>
                    {heavyAlert ? 'ALERT TRIGGERED' : 'NO ALERT'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 print:text-slate-600 block mt-1">
                  Risk Category: <strong className="text-slate-200 print:text-slate-800">{riskLevel}</strong>
                </span>
              </div>
            </div>

            {/* Synoptic Classification Badge in Executive Summary */}
            <div className="p-2.5 rounded-lg bg-slate-800/40 print:bg-slate-100 border border-slate-700/60 print:border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-300 print:text-slate-700">
                <strong>Assigned Synoptic Proxy Regime:</strong> {regimeReadable} ({regimeName})
              </span>
              <span className="text-[11px] font-mono text-cyan-400 print:text-blue-700 font-bold">
                Threshold: 64.5 mm / 24h
              </span>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 2. RAINFALL RANGE / UNCERTAINTY */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>2.</span> Rainfall Range &amp; Model Uncertainty
            </h2>
            
            <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-700 print:border-slate-300 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 print:text-slate-800">
                  Model uncertainty range:
                </span>
                <span className="font-mono text-slate-400 print:text-slate-600">
                  P10: <strong className="text-white print:text-slate-900">{p10.toFixed(1)} mm</strong> | 
                  P50: <strong className="text-white print:text-slate-900">{p50.toFixed(1)} mm</strong> | 
                  P90: <strong className="text-white print:text-slate-900">{p90.toFixed(1)} mm</strong>
                </span>
              </div>

              {/* Simple Horizontal Uncertainty Visualization Bar */}
              <div className="space-y-1">
                <div className="relative w-full h-7 bg-slate-900 print:bg-slate-200 rounded-lg overflow-hidden border border-slate-700 print:border-slate-300 flex items-center px-2">
                  {/* Visual uncertainty bar representing spread */}
                  <div 
                    className="h-3 rounded bg-gradient-to-r from-blue-500/40 via-cyan-400/60 to-purple-500/50 print:bg-slate-400"
                    style={{
                      marginLeft: `${Math.min(90, Math.max(0, (p10 / Math.max(p90 * 1.2, 10)) * 100))}%`,
                      width: `${Math.max(5, Math.min(95, ((p90 - p10) / Math.max(p90 * 1.2, 10)) * 100))}%`
                    }}
                  />
                  {/* Point markers */}
                  <span className="absolute left-2 text-[10px] font-mono text-slate-400 print:text-slate-700">
                    P10 ({p10.toFixed(1)}mm)
                  </span>
                  <span className="absolute right-2 text-[10px] font-mono text-slate-400 print:text-slate-700">
                    P90 ({p90.toFixed(1)}mm)
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 print:text-slate-500 px-1">
                  <span>Lower Bound (10th Percentile)</span>
                  <span className="font-bold text-cyan-400 print:text-slate-800">Median Estimate (P50: {p50.toFixed(1)} mm)</span>
                  <span>Upper Bound (90th Percentile)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 print:text-slate-600 italic">
                P10/P50/P90 represent model-derived predictive quantiles calibrated via gradient boosted quantile regression. 
                They capture algorithmic spread under historical regime uncertainty and are not Gaussian confidence intervals.
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 3. SYNOPTIC REGIME */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>3.</span> Synoptic Regime Proxy
            </h2>

            <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-700 print:border-slate-300 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400 print:text-slate-700" />
                  {regimeReadable} ({regimeName})
                </span>
                <span className="text-xs font-mono px-2 py-0.5 bg-slate-700 print:bg-slate-200 text-slate-300 print:text-slate-800 rounded">
                  PROXY CODE: {regimeInfo?.code || 'REGIME'}
                </span>
              </div>
              <p className="text-xs text-slate-300 print:text-slate-700">
                VARSHA AI classifies the forecast scenario under the following regime proxy: <strong className="text-cyan-300 print:text-slate-900">{regimeReadable}</strong>.
              </p>
              <p className="text-[11px] text-slate-400 print:text-slate-600">
                {regimeInfo?.description || 'Atmospheric circulation state categorized through synoptic domain indicators to guide orographic and convective bias post-processing.'}
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 4. RAW GFS vs VARSHA AI */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>4.</span> Raw GFS vs VARSHA AI V2
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-700 print:border-slate-300 rounded-lg">
                <thead className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-900 font-bold border-b border-slate-700 print:border-slate-300">
                  <tr>
                    <th className="p-2.5">Metric</th>
                    <th className="p-2.5">Raw GFS NWP Guidance</th>
                    <th className="p-2.5">VARSHA AI V2 AI Model</th>
                    <th className="p-2.5">Model Correction Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200">
                  <tr>
                    <td className="p-2.5 font-medium text-slate-300 print:text-slate-700">Forecast 24h Rainfall</td>
                    <td className="p-2.5 font-mono text-slate-200 print:text-slate-800">{rawGfs.toFixed(1)} mm</td>
                    <td className="p-2.5 font-mono font-bold text-cyan-300 print:text-slate-900">{aiCorrected.toFixed(1)} mm</td>
                    <td className="p-2.5 font-mono text-slate-300 print:text-slate-700">
                      {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)} mm
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-300 print:text-slate-700">Rain Occurrence Gate</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">Deterministic Threshold</td>
                    <td className="p-2.5 font-mono text-slate-200 print:text-slate-800">P = {rainProb.toFixed(1)}% (&tau; = 0.60)</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">Occurrence filter applied</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-300 print:text-slate-700">Heavy Rain Event Risk (&ge;64.5mm)</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">Raw Amount Inference</td>
                    <td className="p-2.5 font-mono text-slate-200 print:text-slate-800">P = {heavyProb.toFixed(1)}% (&tau;<sub>h</sub> = 0.20)</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">
                      {heavyAlert ? 'Decision gate active' : 'Decision gate quiescent'}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium text-slate-300 print:text-slate-700">Operational Risk Level</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">Unstratified</td>
                    <td className="p-2.5 font-bold text-cyan-300 print:text-slate-900">{riskLevel}</td>
                    <td className="p-2.5 text-slate-400 print:text-slate-600">Regime-conditioned classification</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-400 print:text-slate-600 italic">
              Note: Differences represent model correction differences under the two-stage pipeline. 
              VARSHA AI V2 is not universally superior to raw GFS across all meteorological regimes or metrics.
            </p>
          </div>

          {/* ================================================================ */}
          {/* 5. HEAVY RAIN INFORMATION */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>5.</span> Heavy Rain Information &amp; Decision Gate
            </h2>

            <div className={`p-4 rounded-xl border ${
              heavyAlert 
                ? 'bg-rose-950/20 border-rose-500/40 print:bg-rose-50 print:border-rose-300' 
                : 'bg-slate-800/50 border-slate-700 print:bg-slate-50 print:border-slate-300'
            } space-y-2`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 print:text-slate-800">
                  Heavy-rain event threshold: 64.5 mm / 24h
                </span>
                <span className="font-mono text-xs">
                  Decision gate: <strong>P &ge; 0.20</strong>
                </span>
              </div>

              <div className="text-sm font-bold">
                {heavyAlert ? (
                  <div className="text-rose-400 print:text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>VARSHA AI heavy-rain decision gate is triggered (Probability: {heavyProb.toFixed(1)}%).</span>
                  </div>
                ) : (
                  <div className="text-emerald-400 print:text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Heavy-rain decision gate not triggered (Probability: {heavyProb.toFixed(1)}% &lt; 0.20 threshold).</span>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 print:text-slate-600">
                Scientific Guidance: Decision gate triggers actionable catchment alerts. Heavy rain warnings represent probabilistic operational decision support; they do not guarantee deterministic rainfall.
              </p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 6. DISTRICT LOCATION SNAPSHOT */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>6.</span> District Location Snapshot
            </h2>

            <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-700 print:border-slate-300 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">District / State</span>
                <span className="font-bold text-white print:text-slate-900">{districtName}, {stateName}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">Centroid Coordinates</span>
                <span className="font-mono text-slate-200 print:text-slate-800">{lat}&deg;N, {lng}&deg;E</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">Elevation / Terrain</span>
                <span className="font-bold text-slate-200 print:text-slate-800">{elevation} m &bull; {terrain}</span>
              </div>
              <div>
                <span className="text-slate-400 print:text-slate-500 text-[10px] uppercase font-bold block">Meteorological Subdivision</span>
                <span className="font-bold text-slate-200 print:text-slate-800">{subdivision}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 print:text-slate-600">
              Boundary visualization available in Interactive Map. Centroid coordinates reflect project monitored reference point.
            </p>
          </div>

          {/* ================================================================ */}
          {/* 7. MODEL PROVENANCE */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>7.</span> Model Provenance &amp; Data Pipeline
            </h2>

            <div className="p-4 rounded-xl bg-slate-800/50 print:bg-slate-50 border border-slate-700 print:border-slate-300 space-y-2 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Forecast Source</span>
                  <span className="font-semibold text-slate-200 print:text-slate-800">{forecastSource}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Reference Source</span>
                  <span className="font-semibold text-slate-200 print:text-slate-800">{referenceSource}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Validated Dataset</span>
                  <span className="font-semibold text-slate-200 print:text-slate-800">{totalRecords.toLocaleString()} validated records (Train: 7,182 | Val: 1,539 | Test: 1,596)</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600 block">Dataset SHA-256 Hash</span>
                  <span className="font-mono text-[10px] text-cyan-300 print:text-slate-800 break-all">{datasetSha}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-700/50 print:border-slate-200 text-[11px] text-slate-400 print:text-slate-600">
                Architecture: Two-Stage Gated Architecture (Stage 1 Occurrence &tau;=0.60, Stage 2 Amount Regressor, Calibrated Heavy Rain Head &tau;<sub>heavy</sub>=0.20).
                ERA5-Land is utilized strictly as a gridded reanalysis reference benchmark, not as in-situ direct rain gauge ground truth.
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* 8. SCIENTIFIC VERIFICATION SUMMARY */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-3">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>8.</span> Scientific Verification Summary (Held-Out Test Set)
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-700 print:border-slate-300 rounded-lg">
                <thead className="bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-900 font-bold border-b border-slate-700 print:border-slate-300">
                  <tr>
                    <th className="p-2">Model Baseline</th>
                    <th className="p-2">RMSE (mm)</th>
                    <th className="p-2">MAE (mm)</th>
                    <th className="p-2">Bias (mm)</th>
                    <th className="p-2">Corr (r)</th>
                    <th className="p-2">CSI (&ge;64.5mm)</th>
                    <th className="p-2">POD</th>
                    <th className="p-2">FAR</th>
                    <th className="p-2">Dry-Day False Rain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200 text-slate-300 print:text-slate-700 font-mono">
                  <tr>
                    <td className="p-2 font-sans font-bold text-slate-200 print:text-slate-900">Raw GFS</td>
                    <td className="p-2">8.7433</td>
                    <td className="p-2">4.0380</td>
                    <td className="p-2">-0.0915</td>
                    <td className="p-2">0.6882</td>
                    <td className="p-2">0.2500</td>
                    <td className="p-2">0.8000</td>
                    <td className="p-2">0.7333</td>
                    <td className="p-2">13.0%</td>
                  </tr>
                  <tr className="bg-cyan-500/10 print:bg-slate-100 font-bold text-cyan-300 print:text-slate-900">
                    <td className="p-2 font-sans">VARSHA AI V2</td>
                    <td className="p-2">7.8428</td>
                    <td className="p-2">4.7963</td>
                    <td className="p-2">+2.8382</td>
                    <td className="p-2">0.7248</td>
                    <td className="p-2">0.3636</td>
                    <td className="p-2">0.8000</td>
                    <td className="p-2">0.6000</td>
                    <td className="p-2">49.7%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mandatory Scientific Assessment Disclosure */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 print:bg-amber-50 print:text-amber-900 print:border-amber-300 text-xs font-semibold">
              Evaluation results show partial improvement with documented trade-offs; VARSHA AI V2 is not uniformly superior to raw GFS across all metrics.
            </div>
          </div>

          {/* ================================================================ */}
          {/* 9. LIMITATIONS & SCIENTIFIC DISCLOSURE */}
          {/* ================================================================ */}
          <div className="print-break-inside-avoid space-y-2">
            <h2 className="text-sm font-extrabold text-cyan-400 print:text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 print:border-slate-300 pb-1">
              <span>9.</span> Limitations &amp; Scientific Disclosures
            </h2>

            <ul className="list-disc list-inside text-[11px] text-slate-300 print:text-slate-700 space-y-1">
              <li>Rainfall output is a model forecast/post-processing product, not a real-time observation.</li>
              <li>ERA5-Land is a reanalysis/reference dataset, not direct gauge observation.</li>
              <li>District boundaries are visualization boundaries; selected historical/shared boundaries are documented.</li>
              <li>Synoptic regime is an application-level proxy classification derived from regional indicators.</li>
              <li>Heavy-rain probability is probabilistic, not deterministic.</li>
              <li>FSS (Fraction Skill Score) is not computed from the current district-centroid dataset.</li>
              <li>Model performance varies by district and regime; evaluation is based on the documented held-out period (1,596 rows | 2026-09-02 to 2026-09-29).</li>
            </ul>
          </div>

          {/* ================================================================ */}
          {/* 10. FOOTER */}
          {/* ================================================================ */}
          <div className="border-t border-slate-800 print:border-slate-300 pt-3 text-[10px] text-slate-400 print:text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-1 print-break-inside-avoid">
            <span>VARSHA AI V2 &bull; Regime-Aware AI Post-Processing of Monsoon Rainfall Forecasts</span>
            <span>Generated by VARSHA AI application &bull; Operational Decision Support Only</span>
          </div>

        </div>
      </div>
    </div>
  );
}
