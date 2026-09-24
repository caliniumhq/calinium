'use strict';

class LiveDesignProviderError extends Error {
  constructor(code, message, {
    retryable = false,
    status = null,
    attempts = 0,
    retries = [],
    diagnostics = null,
    rejectedAttempts = [],
    providerCode = null,
    providerType = null,
    responseReceived = false,
    timeout = false,
    parseFailure = false,
    validationFailure = false
  } = {}) {
    super(message);
    this.name = 'LiveDesignProviderError';
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.attempts = attempts;
    this.retries = retries;
    this.diagnostics = diagnostics;
    this.rejectedAttempts = rejectedAttempts;
    this.providerCode = providerCode;
    this.providerType = providerType;
    this.responseReceived = responseReceived === true;
    this.timeout = timeout === true;
    this.parseFailure = parseFailure === true;
    this.validationFailure = validationFailure === true;
  }
}

function safeProviderToken(value) {
  const token = String(value || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_.-]{0,79}$/.test(token) ? token : null;
}

async function providerErrorMetadata(response) {
  try {
    const payload = await response.json();
    return {
      providerCode: safeProviderToken(payload?.error?.code),
      providerType: safeProviderToken(payload?.error?.type)
    };
  } catch {
    return { providerCode: null, providerType: null };
  }
}

function retryDelay(response, attempt, maximum) {
  const header = response?.headers?.get?.('retry-after');
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, maximum);
  return Math.min(250 * (2 ** Math.max(0, attempt - 1)), maximum);
}

function providerErrorForStatus(status, attempts, retries, metadata = {}) {
  const details = { status, attempts, retries, responseReceived: true, ...metadata };
  if (status === 401 || status === 403) return new LiveDesignProviderError('live_design_authentication_failed', 'Live design evaluation authentication failed.', details);
  if (status === 413) return new LiveDesignProviderError('live_design_request_too_large', 'Live design evaluation image input exceeded the provider request limit.', details);
  if (status === 429) {
    const quota = metadata.providerCode === 'insufficient_quota';
    return new LiveDesignProviderError(quota ? 'live_design_quota_failed' : 'live_design_rate_limited', quota ? 'Live design evaluation quota is unavailable.' : 'Live design evaluation was rate limited.', { ...details, retryable: !quota });
  }
  if (status >= 500) return new LiveDesignProviderError('live_design_provider_unavailable', 'Live design evaluation provider is temporarily unavailable.', { ...details, retryable: true });
  return new LiveDesignProviderError('live_design_provider_rejected', 'Live design evaluation provider rejected the request.', details);
}

async function requestOpenAiResponse({ configuration, credentials, body, fetchImpl = globalThis.fetch?.bind(globalThis), sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)), clock = () => Date.now() }) {
  if (!credentials?.apiKey) throw new LiveDesignProviderError('live_design_credentials_missing', 'Live multimodal design evaluation credentials are not configured.');
  if (typeof fetchImpl !== 'function') throw new LiveDesignProviderError('live_design_network_unavailable', 'Live design evaluation network transport is unavailable.');
  const retries = [];
  const startedAt = clock();
  for (let attempt = 1; attempt <= configuration.api.max_attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), configuration.api.timeout_ms);
    let response;
    try {
      const headers = { Authorization: `Bearer ${credentials.apiKey}`, 'Content-Type': 'application/json' };
      if (credentials.organization) headers['OpenAI-Organization'] = credentials.organization;
      if (credentials.project) headers['OpenAI-Project'] = credentials.project;
      response = await fetchImpl(configuration.api.endpoint, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
    } catch (cause) {
      clearTimeout(timer);
      const timeout = cause?.name === 'AbortError' || controller.signal.aborted;
      const code = timeout ? 'live_design_timeout' : 'live_design_network_failure';
      const message = timeout ? 'Live design evaluation timed out.' : 'Live design evaluation could not reach the provider.';
      if (attempt < configuration.api.max_attempts) {
        const delay_ms = Math.min(250 * (2 ** (attempt - 1)), configuration.api.maximum_retry_delay_ms);
        retries.push({ attempt, code, status: null, delay_ms });
        await sleep(delay_ms);
        continue;
      }
      throw new LiveDesignProviderError(code, message, { retryable: true, attempts: attempt, retries, timeout, responseReceived: false });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      // A structured quota code is the only safe way to distinguish exhausted
      // quota from transient HTTP 429 throttling. Inspect only the bounded code
      // and type before deciding whether another transport attempt is allowed.
      const metadata = response.status === 429 ? await providerErrorMetadata(response) : null;
      const provenQuotaFailure = metadata?.providerCode === 'insufficient_quota';
      const retryable = configuration.api.retry_statuses.includes(response.status) && !provenQuotaFailure;
      if (retryable && attempt < configuration.api.max_attempts) {
        const delay_ms = retryDelay(response, attempt, configuration.api.maximum_retry_delay_ms);
        retries.push({ attempt, code: response.status === 429 ? 'rate_limited' : 'provider_server_failure', status: response.status, delay_ms });
        await sleep(delay_ms);
        continue;
      }
      throw providerErrorForStatus(response.status, attempt, retries, metadata || await providerErrorMetadata(response));
    }
    let payload;
    try { payload = await response.json(); }
    catch (cause) { throw new LiveDesignProviderError('live_design_malformed_http_response', 'Live design evaluation returned an unreadable response.', { attempts: attempt, retries, responseReceived: true, parseFailure: true }); }
    return { payload, operation: { latency_ms: Math.max(0, clock() - startedAt), attempts: attempt, retry_count: retries.length, request_count: attempt, retries } };
  }
  throw new LiveDesignProviderError('live_design_provider_unavailable', 'Live design evaluation could not be completed.', { attempts: configuration.api.max_attempts, retries });
}

module.exports = { LiveDesignProviderError, safeProviderToken, providerErrorMetadata, retryDelay, providerErrorForStatus, requestOpenAiResponse };
