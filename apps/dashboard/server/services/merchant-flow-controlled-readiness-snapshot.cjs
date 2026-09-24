'use strict';

const crypto = require('crypto');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_BETA_READINESS_REVISION,
  readControlledBetaRuntimeConfiguration
} = require('./merchant-flow-controlled-runtime-configuration.cjs');
const { COMPONENTS } = require('./merchant-flow-controlled-readiness.cjs');
const { CONTROLLED_BETA_DEEP_ATTESTATION_REVISION } = require('./merchant-flow-controlled-deep-attestation.cjs');

const CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION = 'controlled-beta-readiness-snapshot-v1';
const DEFAULT_SNAPSHOT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const DEFAULT_DEEP_ATTESTATION_TIMEOUT_MS = 60 * 1000;
const DEFAULT_MAX_AUTOMATIC_FAILURES = 3;
const SNAPSHOT_STATES = Object.freeze(['INITIALIZING', 'READY', 'NOT_READY']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
function iso(clock) { const value = clock(); return (value instanceof Date ? value : new Date(value)).toISOString(); }
function time(clock) { return Date.parse(iso(clock)); }
function safeReason(value, fallback = 'controlled_beta_deep_attestation_failed') {
  const code = String(value || '');
  return /^[a-z][a-z0-9_]{2,100}$/.test(code) ? code : fallback;
}
function uniqueReasons(values) { return [...new Set((values || []).map((value) => safeReason(value)))].sort(); }
function canonicalSnapshot(value) {
  const base = clone(value);
  delete base.checksum;
  return { ...base, checksum: digest(base) };
}
function checksumValid(value) {
  if (!value || !/^[a-f0-9]{64}$/.test(String(value.checksum || ''))) return false;
  const base = clone(value); const checksum = base.checksum; delete base.checksum;
  return digest(base) === checksum;
}

function readinessBinding({ env, configuration, processGenerationId }) {
  const targets = (configuration?.render_targets || []).map((target) => ({
    shop_domain: target.shop_domain,
    theme_id: target.theme_id,
    expected_theme_role: target.expected_theme_role
  })).sort((left, right) => left.shop_domain.localeCompare(right.shop_domain));
  const binding = {
    source_revision: String(env.CALINIUM_CONTROLLED_BETA_SOURCE_REVISION || configuration?.deployment_source_revision || ''),
    build_revision: String(env.CALINIUM_BUILD_SOURCE_REVISION || ''),
    controlled_runtime_revision: String(configuration?.configuration_revision || ''),
    readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
    render_target_configuration_revision: String(configuration?.render_target_configuration_revision || ''),
    shopify_cli_runtime_revision: String(env.CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION || configuration?.shopify_runtime?.runtime_revision || ''),
    shopify_cli_expected_version: String(env.CALINIUM_SHOPIFY_CLI_EXPECTED_VERSION || configuration?.shopify_runtime?.expected_version || ''),
    shopify_cli_runtime_state_revision: String(env.CALINIUM_SHOPIFY_CLI_RUNTIME_STATE_REVISION || configuration?.shopify_runtime?.runtime_state_revision || ''),
    shopify_cli_auto_upgrade_policy: String(env.CALINIUM_SHOPIFY_CLI_AUTOUPGRADE_POLICY || configuration?.shopify_runtime?.autoupgrade_policy || ''),
    shopify_storefront_password_binding_revision: String(configuration?.shopify_runtime?.storefront_password?.binding_revision || ''),
    shopify_storefront_password_requirements_revision: String(configuration?.shopify_runtime?.storefront_password?.requirements_revision || ''),
    shopify_storefront_password_status: String(configuration?.shopify_runtime?.storefront_password?.status || 'NOT_READY'),
    shopify_storefront_password_requirements: (configuration?.shopify_runtime?.storefront_password?.requirements || []).map((entry) => ({
      shop_domain: entry.shop_domain,
      requirement: entry.requirement
    })).sort((left, right) => left.shop_domain.localeCompare(right.shop_domain)),
    controlled_shop_domains: [...(configuration?.controlled_shop_domains || [])].sort(),
    development_targets: targets,
    main_theme_id: String(env.CALINIUM_SHOPIFY_MAIN_THEME_ID || ''),
    d1_required: configuration?.capabilities?.d1 === true,
    d2_7_required: configuration?.d2_7?.required === true,
    operator_operation_available: configuration?.capabilities?.operator_authorization === true,
    configuration_checksum: digest({
      enabled: configuration?.enabled === true,
      validation: {
        valid: configuration?.validation?.valid === true,
        reason_codes: [...(configuration?.validation?.reason_codes || [])].sort()
      },
      capabilities: configuration?.capabilities || {},
      d2_7: configuration?.d2_7 || {},
      shopify_runtime: configuration?.shopify_runtime || {},
      operator_roles: [...(configuration?.operator_roles || [])].sort(),
      operator_user_ids: [...(configuration?.operator_user_ids || [])].sort(),
      safety: configuration?.safety || {}
    }),
    process_generation_id: processGenerationId
  };
  return { ...binding, binding_checksum: digest(binding) };
}

function initialComponents(reasonCode) {
  return Object.fromEntries(COMPONENTS.map((name) => [name, { ready: false, reason_code: reasonCode }]));
}

function initialSnapshot({ binding, at, reasonCode = 'controlled_beta_readiness_initializing' }) {
  return canonicalSnapshot({
    schema_version: '1.0',
    snapshot_revision: CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
    deep_attestation_revision: CONTROLLED_BETA_DEEP_ATTESTATION_REVISION,
    readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
    snapshot_id: `controlled-readiness-snapshot-${digest({ binding: binding.binding_checksum, at, state: 'INITIALIZING' }).slice(0, 20)}`,
    process_generation_id: binding.process_generation_id,
    binding,
    binding_checksum: binding.binding_checksum,
    status: 'INITIALIZING',
    checked_at: null,
    valid_until: null,
    components: initialComponents(reasonCode),
    reason_codes: [reasonCode],
    deep_attestation: { status: 'pending', operation_id: null, trigger: null, started_at: null, completed_at: null, duration_ms: null }
  });
}

function completedSnapshot({ binding, readiness, operation, completedAt, ttlMs }) {
  const proposedCheckedAt = String(readiness?.checked_at || completedAt);
  const proposedCheckedTime = Date.parse(proposedCheckedAt);
  const checkedAt = Number.isFinite(proposedCheckedTime) ? proposedCheckedAt : completedAt;
  const checkedTime = Date.parse(checkedAt);
  const reportedComponents = readiness?.components || {};
  const reportedReasons = Array.isArray(readiness?.reason_codes) ? readiness.reason_codes : [];
  const ready = readiness?.status === 'READY'
    && readiness?.readiness_revision === CONTROLLED_BETA_READINESS_REVISION
    && COMPONENTS.every((name) => reportedComponents[name]?.ready === true)
    && reportedReasons.length === 0;
  const reasonCodes = ready
    ? []
    : reportedReasons.length
      ? reportedReasons
      : [readiness?.status === 'READY' ? 'controlled_beta_deep_attestation_incomplete' : 'controlled_beta_deep_attestation_failed'];
  return canonicalSnapshot({
    schema_version: '1.0',
    snapshot_revision: CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
    deep_attestation_revision: CONTROLLED_BETA_DEEP_ATTESTATION_REVISION,
    readiness_revision: readiness?.readiness_revision || CONTROLLED_BETA_READINESS_REVISION,
    snapshot_id: `controlled-readiness-snapshot-${digest({ binding: binding.binding_checksum, operation: operation.operation_id, checkedAt }).slice(0, 20)}`,
    process_generation_id: binding.process_generation_id,
    binding,
    binding_checksum: binding.binding_checksum,
    status: ready ? 'READY' : 'NOT_READY',
    checked_at: checkedAt,
    valid_until: new Date(checkedTime + ttlMs).toISOString(),
    components: clone(readiness?.components || initialComponents('controlled_beta_deep_attestation_failed')),
    reason_codes: uniqueReasons(reasonCodes),
    deep_attestation: {
      status: 'completed', operation_id: operation.operation_id, trigger: operation.trigger,
      started_at: operation.started_at, completed_at: completedAt,
      duration_ms: Math.max(0, Date.parse(completedAt) - Date.parse(operation.started_at))
    }
  });
}

function failedSnapshot({ binding, operation, completedAt, ttlMs, reasonCode }) {
  const reason = safeReason(reasonCode);
  return completedSnapshot({
    binding,
    readiness: {
      status: 'NOT_READY', readiness_revision: CONTROLLED_BETA_READINESS_REVISION,
      checked_at: completedAt, components: initialComponents(reason), reason_codes: [reason]
    },
    operation,
    completedAt,
    ttlMs
  });
}

function projectSnapshot({ snapshot, binding, now, refresh = null, automaticRefreshSuspended = false }) {
  const projectedRefresh = refresh ? clone(refresh) : { status: 'idle', operation_id: null, trigger: null, started_at: null, reused: false };
  if (!snapshot || !checksumValid(snapshot)) {
    return {
      schema_version: '1.0', snapshot_revision: CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
      readiness_revision: CONTROLLED_BETA_READINESS_REVISION, status: 'NOT_READY', snapshot_status: 'MISSING',
      binding_checksum: null,
      beta_source_version: binding.source_revision || null, runtime_configuration_revision: CONTROLLED_BETA_RUNTIME_REVISION,
      beta_feature_flag_status: 'enabled', checked_at: null, valid_until: null,
      components: initialComponents('controlled_beta_readiness_snapshot_missing'),
      reason_codes: ['controlled_beta_readiness_snapshot_missing'], refresh: projectedRefresh,
      automatic_refresh_suspended: automaticRefreshSuspended
    };
  }
  let snapshotStatus = snapshot.status;
  let status = snapshot.status === 'READY' ? 'READY' : 'NOT_READY';
  const reasons = [...snapshot.reason_codes];
  if (snapshot.binding_checksum !== binding.binding_checksum || snapshot.process_generation_id !== binding.process_generation_id) {
    snapshotStatus = 'MISMATCH'; status = 'NOT_READY'; reasons.push('controlled_beta_readiness_snapshot_mismatch');
  } else if (snapshot.status === 'READY' && (!snapshot.valid_until || Date.parse(snapshot.valid_until) <= now)) {
    snapshotStatus = 'STALE'; status = 'NOT_READY'; reasons.push('controlled_beta_readiness_snapshot_stale');
  }
  return {
    schema_version: snapshot.schema_version,
    snapshot_revision: snapshot.snapshot_revision,
    deep_attestation_revision: snapshot.deep_attestation_revision,
    readiness_revision: snapshot.readiness_revision,
    snapshot_id: snapshot.snapshot_id,
    snapshot_checksum: snapshot.checksum,
    binding_checksum: snapshot.binding_checksum,
    process_generation_id: snapshot.process_generation_id,
    status,
    snapshot_status: snapshotStatus,
    beta_source_version: snapshot.binding.source_revision || null,
    runtime_configuration_revision: snapshot.binding.controlled_runtime_revision || null,
    beta_feature_flag_status: 'enabled',
    checked_at: snapshot.checked_at,
    valid_until: snapshot.valid_until,
    components: clone(snapshot.components),
    reason_codes: uniqueReasons(reasons),
    refresh: projectedRefresh,
    automatic_refresh_suspended: automaticRefreshSuspended
  };
}

function createControlledBetaReadinessCoordinator({
  env = process.env,
  deepAttestation,
  clock = () => new Date(),
  configurationLoader = () => readControlledBetaRuntimeConfiguration(env, { strict: false }),
  processGenerationId = `readiness-process-${crypto.randomUUID()}`,
  snapshotTtlMs = DEFAULT_SNAPSHOT_TTL_MS,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  deepAttestationTimeoutMs = DEFAULT_DEEP_ATTESTATION_TIMEOUT_MS,
  maxAutomaticFailures = DEFAULT_MAX_AUTOMATIC_FAILURES,
  beforeReady = null,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
} = {}) {
  if (typeof deepAttestation !== 'function') throw new TypeError('A controlled readiness deep-attestation function is required.');
  let closed = false;
  let sequence = 0;
  let interval = null;
  let inFlight = null;
  let automaticFailures = 0;
  const currentBinding = () => readinessBinding({ env, configuration: configurationLoader(), processGenerationId });
  let snapshot = initialSnapshot({ binding: currentBinding(), at: iso(clock) });

  function current() {
    return projectSnapshot({
      snapshot,
      binding: currentBinding(),
      now: time(clock),
      refresh: inFlight ? { ...inFlight.operation, status: 'running', reused: false } : null,
      automaticRefreshSuspended: automaticFailures >= maxAutomaticFailures
    });
  }

  function requestRefresh({ trigger = 'operator' } = {}) {
    if (closed) return { status: 'closed', operation_id: null, trigger, started_at: null, reused: false };
    if (inFlight) return { ...inFlight.operation, status: 'running', reused: true };
    if (trigger !== 'operator' && automaticFailures >= maxAutomaticFailures) {
      return { status: 'suspended', operation_id: null, trigger, started_at: null, reused: false };
    }
    const binding = currentBinding();
    const startedAt = iso(clock);
    const operation = {
      operation_id: `controlled-readiness-refresh-${digest({ generation: processGenerationId, sequence: ++sequence, binding: binding.binding_checksum }).slice(0, 20)}`,
      trigger,
      started_at: startedAt
    };
    const controller = new AbortController();
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(Object.assign(new Error('Controlled readiness deep attestation timed out.'), { code: 'controlled_beta_deep_attestation_timeout' }));
      }, deepAttestationTimeoutMs);
      timer.unref?.();
    });
    const boundedOperation = Promise.resolve().then(async () => {
      const readiness = await deepAttestation({ signal: controller.signal });
      if (controller.signal.aborted || closed || currentBinding().binding_checksum !== binding.binding_checksum) return null;
      if (readiness?.status === 'READY' && typeof beforeReady === 'function') {
        const recovered = await beforeReady(readiness, { signal: controller.signal });
        if (recovered === false) {
          throw Object.assign(new Error('Controlled readiness worker recovery did not complete.'), { code: 'controlled_beta_worker_recovery_unavailable' });
        }
      }
      if (controller.signal.aborted || closed || currentBinding().binding_checksum !== binding.binding_checksum) return null;
      return readiness;
    });
    const promise = Promise.race([
      boundedOperation,
      timeout
    ]).then((readiness) => {
      if (!readiness) return null;
      if (closed || currentBinding().binding_checksum !== binding.binding_checksum) return null;
      const completedAt = iso(clock);
      snapshot = completedSnapshot({ binding, readiness, operation, completedAt, ttlMs: snapshotTtlMs });
      automaticFailures = readiness?.status === 'READY' ? 0 : automaticFailures + (trigger === 'operator' ? 0 : 1);
      return current();
    }).catch((error) => {
      if (closed || currentBinding().binding_checksum !== binding.binding_checksum) return null;
      const completedAt = iso(clock);
      snapshot = failedSnapshot({ binding, operation, completedAt, ttlMs: snapshotTtlMs, reasonCode: error?.code });
      if (trigger !== 'operator') automaticFailures += 1;
      return current();
    }).finally(() => {
      if (timer) clearTimeout(timer);
      if (inFlight?.operation.operation_id === operation.operation_id) inFlight = null;
    });
    inFlight = { operation, promise, controller };
    return { ...operation, status: 'running', reused: false };
  }

  function start() {
    const operation = requestRefresh({ trigger: 'startup' });
    if (!interval) {
      interval = setIntervalFn(() => { requestRefresh({ trigger: 'background' }); }, refreshIntervalMs);
      interval?.unref?.();
    }
    return operation;
  }

  async function waitForCurrentRefresh() {
    const active = inFlight?.promise;
    if (active) await active;
    return current();
  }

  async function close() {
    closed = true;
    if (interval) { clearIntervalFn(interval); interval = null; }
    inFlight?.controller.abort();
    await inFlight?.promise?.catch(() => null);
  }

  return Object.freeze({
    snapshot_revision: CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
    deep_attestation_revision: CONTROLLED_BETA_DEEP_ATTESTATION_REVISION,
    process_generation_id: processGenerationId,
    current,
    requestRefresh,
    start,
    waitForCurrentRefresh,
    close
  });
}

module.exports = {
  CONTROLLED_BETA_READINESS_SNAPSHOT_REVISION,
  DEFAULT_SNAPSHOT_TTL_MS,
  DEFAULT_REFRESH_INTERVAL_MS,
  DEFAULT_DEEP_ATTESTATION_TIMEOUT_MS,
  DEFAULT_MAX_AUTOMATIC_FAILURES,
  SNAPSHOT_STATES,
  digest,
  checksumValid,
  readinessBinding,
  initialSnapshot,
  completedSnapshot,
  projectSnapshot,
  createControlledBetaReadinessCoordinator
};
