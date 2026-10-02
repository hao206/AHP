/**
 * Telemetry & Observability Utility - AHP Decision Studio
 * Handles:
 * - Request-ID generation and correlation tracking
 * - Client-side network logging (Latency, Status, Error causes)
 * - Sentry / APM error reporting (via VITE_SENTRY_DSN or console telemetry)
 */

export function generateRequestId() {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substring(2, 8);
  return `req-${ts}-${rnd}`;
}

const SENTRY_DSN = (import.meta.env?.VITE_SENTRY_DSN || '').trim();
const ENABLE_TELEMETRY = import.meta.env?.MODE !== 'test';

class TelemetryTracker {
  constructor() {
    this.breadcrumbs = [];
    this.sentryDsn = SENTRY_DSN;
    if (this.sentryDsn) {
      this.initSentry();
    }
  }

  initSentry() {
    console.info('%c[AHP-Telemetry] %cSentry DSN detected, client error tracing enabled.', 'color: #8b5cf6; font-weight: bold;', 'color: inherit;');
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, { context: 'unhandledrejection' });
    });
    window.addEventListener('error', (event) => {
      this.captureException(event.error || event.message, { context: 'window.onerror' });
    });
  }

  logRequest(method, url, requestId, payload = null) {
    if (!ENABLE_TELEMETRY) return;
    const entry = {
      type: 'request',
      method,
      url,
      requestId,
      time: new Date().toISOString()
    };
    this.addBreadcrumb(entry);
    console.log(
      `%c[AHP-API Out] %c${method} ${url} %c[ID: ${requestId}]`,
      'color: #3b82f6; font-weight: 700;',
      'color: inherit;',
      'color: #94a3b8;',
      payload || ''
    );
  }

  logResponse(method, url, requestId, status, durationMs) {
    if (!ENABLE_TELEMETRY) return;
    const isSuccess = status >= 200 && status < 300;
    const entry = {
      type: 'response',
      method,
      url,
      requestId,
      status,
      durationMs,
      time: new Date().toISOString()
    };
    this.addBreadcrumb(entry);
    console.log(
      `%c[AHP-API In]  %c${status} ${method} ${url} %c(${durationMs.toFixed(1)}ms) %c[ID: ${requestId}]`,
      isSuccess ? 'color: #10b981; font-weight: 700;' : 'color: #f59e0b; font-weight: 700;',
      'color: inherit;',
      'color: #a855f7;',
      'color: #94a3b8;'
    );
  }

  logError(method, url, requestId, error, durationMs = 0) {
    const entry = {
      type: 'error',
      method,
      url,
      requestId,
      durationMs,
      error: error?.message || String(error),
      time: new Date().toISOString()
    };
    this.addBreadcrumb(entry);
    console.error(
      `%c[AHP-API Error] %c${method} ${url} %c[ID: ${requestId}] %c(${durationMs.toFixed(1)}ms)`,
      'color: #ef4444; font-weight: 800;',
      'color: #f87171;',
      'color: #94a3b8;',
      'color: #cbd5e1;',
      error
    );

    this.captureException(error, { requestId, method, url, durationMs });
  }

  addBreadcrumb(crumb) {
    this.breadcrumbs.push(crumb);
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift();
    }
  }

  captureException(error, extra = {}) {
    if (!this.sentryDsn) return;
    try {
      // Direct Sentry HTTP ingestion if SENTRY_DSN provided without heavyweight SDK
      const dsnMatch = this.sentryDsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
      if (!dsnMatch) return;
      const [, publicKey, host, projectId] = dsnMatch;
      const endpoint = `https://${host}/api/${projectId}/store/?sentry_version=7&sentry_key=${publicKey}&sentry_client=ahp-web/2.0.0`;
      
      const payload = {
        event_id: requestIdToUuid(extra.requestId || generateRequestId()),
        timestamp: new Date().toISOString(),
        platform: 'javascript',
        level: 'error',
        message: error?.message || String(error),
        extra: {
          ...extra,
          breadcrumbs: this.breadcrumbs.slice(-10)
        }
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch {
      // Fail silently for telemetry reporting
    }
  }
}

function requestIdToUuid(reqId) {
  // Pad or hash to 32 hex chars for sentry event_id
  const clean = reqId.replace(/[^a-zA-Z0-9]/g, '');
  return (clean + '00000000000000000000000000000000').substring(0, 32);
}

export const telemetry = new TelemetryTracker();
