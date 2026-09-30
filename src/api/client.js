import { useState, useEffect, useCallback } from 'react';

// Authoritative API Client for VARSHA AI Production Backend
const envApiUrl = import.meta.env.VITE_API_URL;
const isDev = Boolean(import.meta.env.DEV);

let rawBaseUrl = '';
if (envApiUrl && envApiUrl.trim()) {
  rawBaseUrl = envApiUrl.trim();
} else if (isDev) {
  rawBaseUrl = 'http://127.0.0.1:8000/api';
} else {
  // In production with no VITE_API_URL configured, do NOT fallback to localhost
  rawBaseUrl = '';
}

export const API_BASE_URL = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : '';
export const ROOT_URL = API_BASE_URL ? API_BASE_URL.replace(/\/api$/, '') : '';
export const IS_API_CONFIGURED = Boolean(API_BASE_URL);

// Mock data is strictly disallowed in production builds
export const IS_MOCK_ENABLED = isDev && (import.meta.env.VITE_USE_MOCK === 'true');

function assertApiConfigured() {
  if (!API_BASE_URL) {
    throw new Error("API not configured: VITE_API_URL environment variable is not defined for this production deployment. Please set VITE_API_URL in your hosting provider's dashboard.");
  }
}

// In-memory cache for districts list to avoid redundant multi-component roundtrips
let cachedDistricts = null;
let districtsFetchPromise = null;

/**
 * Health check for FastAPI backend
 */
export async function checkApiHealth() {
  if (!ROOT_URL) {
    return { isConnected: false, latencyMs: null, error: 'API not configured (missing VITE_API_URL)' };
  }
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${ROOT_URL}/`, { signal: controller.signal });
    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      return { isConnected: true, latencyMs: latency };
    }
    return { isConnected: false, latencyMs: null };
  } catch {
    return { isConnected: false, latencyMs: null };
  }
}

/**
 * Fetch system operational status
 */
export async function fetchSystemStatus() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/status`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch system status`);
  return await res.json();
}

/**
 * Fetch all monitored districts with latest V2 predictions
 */
export async function fetchDistricts(forceRefresh = false) {
  if (!forceRefresh && cachedDistricts) {
    return cachedDistricts;
  }
  if (!forceRefresh && districtsFetchPromise) {
    return districtsFetchPromise;
  }

  districtsFetchPromise = (async () => {
    try {
      assertApiConfigured();
      const res = await fetch(`${API_BASE_URL}/districts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch districts telemetry`);
      const data = await res.json();
      cachedDistricts = Array.isArray(data) ? data : [];
      return cachedDistricts;
    } finally {
      districtsFetchPromise = null;
    }
  })();

  return districtsFetchPromise;
}

/**
 * Fetch live V2 forecast telemetry for a single district
 */
export async function fetchDistrictForecast(districtId) {
  if (!districtId) return null;
  assertApiConfigured();
  const encoded = encodeURIComponent(String(districtId).toLowerCase().trim());
  const res = await fetch(`${API_BASE_URL}/forecast/${encoded}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch forecast for ${districtId}`);
  return await res.json();
}

/**
 * Fetch multi-tier comparison for a single district
 */
export async function fetchDistrictComparison(districtId) {
  if (!districtId) return null;
  assertApiConfigured();
  const encoded = encodeURIComponent(String(districtId).toLowerCase().trim());
  const res = await fetch(`${API_BASE_URL}/forecast/${encoded}/comparison`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch comparison for ${districtId}`);
  return await res.json();
}

/**
 * Fetch historical forecast vs reference replay series for a district
 */
export async function fetchDistrictForecastHistory(districtId, days = 14) {
  if (!districtId) return null;
  assertApiConfigured();
  const encoded = encodeURIComponent(String(districtId).toLowerCase().trim());
  const res = await fetch(`${API_BASE_URL}/forecast/${encoded}/history?days=${days}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch forecast history for ${districtId}`);
  return await res.json();
}

/**
 * Fetch global feature importance report
 */
export async function fetchFeatureImportance() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/model/feature-importance`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch model feature importance`);
  return await res.json();
}

/**
 * Fetch active weather alerts
 */
export async function fetchActiveAlerts() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/alerts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch alerts`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch verification summary scorecards
 */
export async function fetchVerification() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/verification`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch verification telemetry`);
  return await res.json();
}

/**
 * Fetch verification by regime
 */
export async function fetchVerificationRegimes() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/verification/regimes`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch regime verification`);
  return await res.json();
}

/**
 * Fetch verification by district
 */
export async function fetchVerificationDistricts() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/verification/districts`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch district verification`);
  return await res.json();
}

export const fetchVerificationData = fetchVerification;
export const fetchRegimeVerification = fetchVerificationRegimes;
export const fetchDistrictVerification = fetchVerificationDistricts;
export const fetchRealDistricts = fetchDistricts;

/**
 * Fetch active synoptic regimes
 */
export async function fetchCurrentRegimes() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/regime/current`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch current regimes`);
  return await res.json();
}

/**
 * Fetch current IMD / ERA5 reference precipitation
 */
export async function fetchCurrentRainfall() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/rainfall/current`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch current reference rainfall`);
  return await res.json();
}

/**
 * Fetch data provenance metadata
 */
export async function fetchDataProvenance() {
  assertApiConfigured();
  const res = await fetch(`${API_BASE_URL}/data/provenance`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch data provenance`);
  return await res.json();
}

/**
 * Shared React hook to load and cache the 57 districts dataset
 */
export function useDistricts() {
  const [districts, setDistricts] = useState(cachedDistricts || []);
  const [loading, setLoading] = useState(!cachedDistricts);
  const [error, setError] = useState(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDistricts(force);
      setDistricts(data);
    } catch (err) {
      console.error('[useDistricts] Error loading districts:', err);
      setError(err.message || 'Failed to load districts telemetry from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cachedDistricts) {
      load(false);
    }
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { districts, loading, error, refresh };
}
