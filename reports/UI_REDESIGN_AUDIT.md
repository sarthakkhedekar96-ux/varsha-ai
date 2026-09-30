# VARSHAAI — FORENSIC UI/UX AUDIT & DESIGN SYSTEM SPECIFICATION
**Document Type:** Pre-Implementation Forensic UI Audit  
**Target Design Reference:** Maharashtra State Rainfall Reporting Portal (MahaRain) & Indian Government Hydrometeorological Data Portals  
**Date:** September 2026  
**Scope:** Complete frontend visual and information architecture overhaul (Zero scientific/model changes)

---

## 1. EXECUTIVE SUMMARY & CURRENT VISUAL DEFICIENCIES

A comprehensive audit of the current VARSHAAI frontend (`src/App.jsx`, `src/index.css`, and 13 components in `src/components/`) reveals a classic "AI SaaS prototype / dark cyberpunk" aesthetic that undermines its scientific credibility and practical utility for government officials, district collectors, disaster management teams, and meteorological researchers.

### Key Visual Problems Identified:
1. **Excessive Dark Glassmorphism:** Deep navy-black backgrounds (`#060913`, `#0D1322`) with heavy `backdrop-filter: blur(16px)` and low-contrast translucent panels (`rgba(15, 23, 42, 0.75)`).
2. **Neon Glows & Radiating Borders:** Cyan (`#00F2FE`), purple, and rose drop shadows (`box-shadow: 0 0 25px rgba(0, 242, 254, 0.15)`) that make meteorological telemetry look like a crypto dashboard.
3. **Internal Build Names Prominently Displayed:** Huge banner headers showing `"VARSHAAI v2.5 V2-INTEGRATED"` instead of authoritative institutional titles.
4. **Cramped, Competing Cards:** Dashboards feature 12+ floating rounded cards per viewport, lacking clear typographical hierarchy, logical grouping, or resting whitespace.
5. **Inconsistent Table Systems:** Tables use custom dark translucent styling with horizontal scrolling issues, centered numbers, and illegible muted grey text.
6. **Non-Standard GIS Map:** Map canvas is rendered on pitch black (`#080C16`) with cyan borders, rather than standard government cartographic tones with clear regional contrasts.
7. **Chatbot Cliché Elements:** RAINWISE AI Assistant features gradient bubbles and floating neon badges rather than a crisp meteorological intelligence drawer.
8. **Terminology Inconsistencies:** Residual occurrences of informal terms ("IMD Observation", "Ground Truth", "AI Improvement") where scientific disclosures require "ECMWF ERA5-Land Reanalysis Reference" and "Correction Difference".

---

## 2. EXISTING COMPONENT INVENTORY & ROUTE MAP

| Component | File Path | Current Status / Role | Visual Issues | Target Redesign Action |
| :--- | :--- | :--- | :--- | :--- |
| **App Layout** | `src/App.jsx` | Root container, tab router, modals | Dark background, floating neon FAB | Light grey portal backdrop, official topbar, clean drawer overlay |
| **Header** | `src/components/Header.jsx` | Navigation, system status, alert trigger | 9 cramped button tabs, neon build badge, dark blur | Two-tier government portal header, institutional emblem/title, clean navigation |
| **Command Center** | `src/components/CommandCenter.jsx` | Primary operational overview | Dark hero, glowing cards, heavy-rain table | Compact 4-metric strip, clean government risk table with alternating rows |
| **Interactive Map** | `src/components/InteractiveMap.jsx` | India GeoJSON SVG projection & layer lens | Pitch-black SVG canvas, neon outlines | Light cartographic basemap, crisp district polygons, conventional GIS legend |
| **District Intelligence** | `src/components/DistrictIntelligence.jsx` | Deep-dive telemetry, charts, What-If | Translucent cards inside cards, dark charts | Clean horizontal white panels, high-contrast Recharts, clear What-If sandbox |
| **Regime Classifier** | `src/components/RegimeMonitor.jsx` | 8-regime proxy architecture display | Neon diagram blocks, purple dark glows | Meteorological analysis workflow cards, clean tabular specifications |
| **Raw vs AI Lens** | `src/components/RawVsAiLens.jsx` | NWP vs ML comparison lens | Dark bar charts, neon badges | Government comparison table with clear "Correction Difference" indicators |
| **Extreme Rain Monitor** | `src/components/ExtremeRainfallMonitor.jsx` | P(Heavy) ≥ 0.20 threshold monitor | Crimson glowing boxes, dark cards | Operational hazard monitoring console, clear amber/red severity flags |
| **Verification Engine** | `src/components/VerificationEngine.jsx` | Frozen held-out test set scorecard | Cluttered cards, dark table styling | Formal scientific verification report, crisp benchmark tables |
| **IMD / Data Explorer** | `src/components/ImdDataExplorer.jsx` | Provenance & reference source explorer | Dark panels, green glowing cards | Official provenance archive layout, clear data dictionary |
| **RAINWISE AI** | `src/components/RainwiseAssistant.jsx` | Natural language intelligence assistant | Floating neon bubble, dark drawer | Crisp white assistant panel, structured metric cards, provenance badges |
| **Alerts Drawer** | `src/components/AlertsPanel.jsx` | Slide-out early warning list | Pitch black panel, pulsing red borders | Clean alert center with structured cards (Normal, Watch, Warning, Critical) |
| **Forecast Progression** | `src/components/ForecastProgression.jsx` | Feature #4 PATH B lineage tracker | Dark panel, amber neon warnings | Professional data lineage disclosure panel |
| **District Bulletin** | `src/components/DistrictBulletin.jsx` | Feature #3 Single-District Dossier | Good print style, but dark modal preview | Official government bulletin presentation in both modal preview and print |

---

## 3. TARGET DESIGN SYSTEM: MAHARAIN INSPIRATION

### 3.1 Color Palette
```css
:root {
  /* Surfaces */
  --portal-bg: #F4F6F9;             /* Light grey-blue institutional canvas */
  --portal-surface: #FFFFFF;        /* Crisp white card surface */
  --portal-surface-subtle: #F8FAFC; /* Light contrast zebra rows & headers */
  --portal-border: #E2E8F0;         /* Light slate border */
  --portal-border-subtle: #CBD5E1;  /* Emphasized divider */
  
  /* Primary & Brand */
  --gov-navy: #0F2942;              /* Deep Indian government navy header */
  --gov-navy-light: #1A365D;        /* Secondary navy */
  --gov-blue: #1E40AF;              /* Active link / selected indicator */
  --gov-blue-subtle: #EFF6FF;       /* Soft blue highlight */
  
  /* Accents */
  --gov-green: #15803D;             /* Verified state / normal risk */
  --gov-green-subtle: #F0FDF4;      /* Soft green pill background */
  --gov-amber: #D97706;             /* Watch / advisory state */
  --gov-amber-subtle: #FFFBEB;      /* Soft amber warning background */
  --gov-red: #DC2626;               /* Warning / critical heavy-rain alert */
  --gov-red-subtle: #FEF2F2;        /* Soft red alert background */
  
  /* Typography */
  --text-primary: #0F172A;          /* High-contrast slate-900 */
  --text-secondary: #334155;        /* Readable slate-700 */
  --text-muted: #64748B;            /* Secondary metadata slate-500 */
  --text-inverse: #FFFFFF;          /* Pure white on navy headers */
}
```

### 3.2 Typography Hierarchy
- **Font Family:** `'Plus Jakarta Sans', system-ui, -apple-system, sans-serif`
- **Numerical / Telemetry Font:** `'JetBrains Mono', monospace` (for millimeters, coordinates, probabilities)
- **H1 (Portal Title):** 20px / 1.25rem, SemiBold / Bold, Pure White on Navy
- **H2 (Section Header):** 18px / 1.125rem, Bold, `--text-primary`
- **H3 (Card Title):** 14px / 0.875rem, SemiBold, `--text-primary`
- **Body:** 13px / 0.8125rem, Regular, `--text-secondary`, line-height 1.5
- **Metadata / Labels:** 11px / 0.6875rem, Medium / SemiBold, `--text-muted`

### 3.3 Card & Container Architecture
- Background: `#FFFFFF`
- Border: `1px solid var(--portal-border)` (`#E2E8F0`)
- Border Radius: `6px` to `8px` maximum (Strictly no pill containers for content)
- Box Shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)` (Subtle, clean elevation)
- Padding: `16px` to `20px`

### 3.4 Table Design System
- Header: Dark Navy (`#0F2942`) or Light Slate (`#F1F5F9`) with uppercase 11px bold text
- Zebra Striping: Alternating white (`#FFFFFF`) and very light slate (`#F8FAFC`)
- Border: Crisp horizontal lines (`#E2E8F0`)
- Numerical Alignment: Strictly right-aligned with monospace font
- Status Cells: Compact rectangular badges (4px border radius, no oversized pills)

---

## 4. FUNCTIONALITY & SCIENTIFIC SAFEGUARDS (FROZEN)

The following components and behaviors must remain **100% untouched** in code and logic:
1. Two-Stage V2 model inference and feature pipelines.
2. Calibration thresholds: $\tau=0.60$ for rain occurrence; $\tau_{\text{heavy}}=0.20$ for heavy rain decision gate; $64.5\text{ mm}/24\text{h}$ heavy threshold.
3. Frozen held-out scorecard metrics (Raw GFS RMSE 8.7433 vs V2 7.8428; MAE 4.0380 vs 4.7963; CSI 0.2500 vs 0.3636).
4. Data provenance: NOAA NCEP GFS 0.25° guidance evaluated against ECMWF ERA5-Land reanalysis.
5. All 57 monitored Indian districts in `INDIA_DISTRICT_MASTER`.
6. Feature #1 What-If simulator endpoint (`/api/simulate`) with `MODE = WHAT-IF / SENSITIVITY` isolation.
7. Feature #4 PATH B Forecast Evolution disclosure (multi-cycle deferral).
8. Feature #5 RAINWISE AI Assistant deterministic query API (`/api/assistant/query`).
9. All 7 regression test suites and FastAPI REST endpoints.

---

## 5. REDESIGN EXECUTION PLAN

1. **Tokens & Global Styles:** Rebuild `src/index.css` with government portal variables, replacing all dark glassmorphism with crisp light portal styles.
2. **App Header & Navigation:** Refactor `src/components/Header.jsx` to feature an institutional header bar, clear navigation tabs, and system status indicators.
3. **App Shell & Footer:** Update `src/App.jsx` with light theme container, accessible drawer toggles, and institutional footer.
4. **Command Center:** Redesign `src/components/CommandCenter.jsx` with summary strip, clean metric cards, and government district risk table.
5. **District Intelligence & What-If:** Redesign `src/components/DistrictIntelligence.jsx` with clean panels and high-contrast charts.
6. **Cartographic Map:** Redesign `src/components/InteractiveMap.jsx` with light GIS basemap, crisp polygon borders, and clean legend.
7. **Scorecard & Monitoring Components:** Redesign `VerificationEngine.jsx`, `ExtremeRainfallMonitor.jsx`, `RegimeMonitor.jsx`, `RawVsAiLens.jsx`, and `ImdDataExplorer.jsx`.
8. **RAINWISE Assistant & Drawers:** Polish `RainwiseAssistant.jsx` and `AlertsPanel.jsx` into clean slide-out panels.
9. **Verification & Visual QA:** Run all 7 test suites, verify production build (`npm run build`), and inspect rendered pages in browser.
