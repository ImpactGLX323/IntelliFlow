import Constants from 'expo-constants';

const BUNDLED_DEMO_API_URL = 'https://YOUR_HOSTED_DEMO_BACKEND_URL';
const DEV_LOCAL_API_URL = 'http://localhost:8000';

function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
}

export function getApiBaseUrl() {
  const envUrl = clean(process.env.EXPO_PUBLIC_API_URL);
  if (envUrl) {
    return envUrl;
  }

  const expoUrl = clean(Constants?.expoConfig?.extra?.apiUrl);
  if (expoUrl) {
    return expoUrl;
  }

  const bundledFallback = clean(BUNDLED_DEMO_API_URL);
  if (bundledFallback && !bundledFallback.includes('YOUR_HOSTED_DEMO_BACKEND_URL')) {
    return bundledFallback;
  }

  if (__DEV__) {
    return DEV_LOCAL_API_URL;
  }

  return bundledFallback;
}

export function getBundledDemoApiUrl() {
  return BUNDLED_DEMO_API_URL;
}
