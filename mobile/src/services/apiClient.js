import { getApiBaseUrl } from '../config/api';

const DEFAULT_TIMEOUT_MS = 10000;
const TRANSIENT_MESSAGES = ['Network request failed', 'The operation was aborted', 'timeout'];

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

function normalizeBaseUrl(value) {
  return (value || getApiBaseUrl()).replace(/\/+$/, '');
}

function buildUrl(baseUrl, path, params) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${normalizedBase}${normalizedPath}`);

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }
  return response.json();
}

async function normalizeError(response) {
  const data = await parseResponse(response);
  if (typeof data?.detail === 'string') {
    return new Error(data.detail);
  }
  if (typeof data?.message === 'string') {
    return new Error(data.message);
  }
  if (data?.detail && typeof data.detail === 'object') {
    return new Error(JSON.stringify(data.detail));
  }
  return new Error(`Request failed with status ${response.status}`);
}

function isTransientError(error) {
  const message = String(error?.message || '');
  return TRANSIENT_MESSAGES.some((token) => message.includes(token));
}

export function resolveSession(session) {
  return {
    ...session,
    apiUrl: normalizeBaseUrl(session?.apiUrl),
  };
}

export async function requestJson(session, path, options = {}, attempt = 0) {
  const { params, body, headers, timeoutMs, ...rest } = options;
  const activeSession = resolveSession(session);
  const url = buildUrl(activeSession.apiUrl, path, params);
  const mergedHeaders = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(headers || {}),
  };

  if (activeSession?.token) {
    mergedHeaders.Authorization = `Bearer ${activeSession.token}`;
  }

  if (body instanceof FormData) {
    delete mergedHeaders['Content-Type'];
  }

  const { controller, timer } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      ...rest,
      headers: mergedHeaders,
      signal: controller.signal,
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await normalizeError(response);
    }

    return await parseResponse(response);
  } catch (error) {
    if (attempt === 0 && isTransientError(error)) {
      return requestJson(activeSession, path, options, 1);
    }
    throw error instanceof Error ? error : new Error('Unable to reach IntelliFlow service.');
  } finally {
    clearTimeout(timer);
  }
}

export async function healthCheck(session) {
  return requestJson(session, '/health', { method: 'GET', timeoutMs: 5000 });
}

export async function readyCheck(session) {
  return requestJson(session, '/ready', { method: 'GET', timeoutMs: 5000 });
}

export async function getPublicAppConfig(session) {
  return requestJson(session, '/public/app-config', { method: 'GET', timeoutMs: 5000 });
}

export async function demoBootstrap(session) {
  return requestJson(session, '/demo/bootstrap', { method: 'POST', timeoutMs: 8000 });
}

export async function demoLogin(session) {
  return requestJson(session, '/demo/login', { method: 'POST', timeoutMs: 8000 });
}

export async function copilotQuery(session, payload) {
  return requestJson(session, '/ai-copilot/query', {
    method: 'POST',
    body: payload,
  });
}

export async function getInventorySummary(session) {
  return requestJson(session, '/api/analytics/dashboard', { method: 'GET' });
}

export async function getMcpRegistry(session) {
  return requestJson(session, '/mcp-dev/registry', { method: 'GET' });
}
