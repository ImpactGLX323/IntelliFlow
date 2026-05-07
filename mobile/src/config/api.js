import Constants from 'expo-constants';

const BUNDLED_DEMO_API_URL = 'https://YOUR_HOSTED_DEMO_BACKEND_URL';
const DEV_LOCAL_API_URL = 'http://127.0.0.1:8000';
const PLACEHOLDER_MARKERS = ['YOUR_HOSTED_DEMO_BACKEND_URL', 'YOUR_COMPUTER_LAN_IP', 'localhost:8000'];

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

function isConfiguredUrl(value) {
  const normalized = clean(value);
  if (!normalized) {
    return false;
  }
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function extractExpoHost() {
  const candidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.expoGoConfig?.debuggerHost,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of candidates) {
    const normalized = clean(candidate);
    if (!normalized) {
      continue;
    }
    const host = normalized.split(':')[0];
    if (!host) {
      continue;
    }
    return `http://${host}:8000`;
  }

  return '';
}

export function getApiBaseUrl() {
  const envUrl = clean(process.env.EXPO_PUBLIC_API_URL);
  if (isConfiguredUrl(envUrl)) {
    return envUrl;
  }

  const expoUrl = clean(Constants?.expoConfig?.extra?.apiUrl);
  if (isConfiguredUrl(expoUrl)) {
    return expoUrl;
  }

  const bundledFallback = clean(BUNDLED_DEMO_API_URL);
  if (isConfiguredUrl(bundledFallback)) {
    return bundledFallback;
  }

  if (__DEV__) {
    const expoHostApiUrl = extractExpoHost();
    if (expoHostApiUrl) {
      return expoHostApiUrl;
    }
    return DEV_LOCAL_API_URL;
  }

  return '';
}

export function getBundledDemoApiUrl() {
  return BUNDLED_DEMO_API_URL;
}
