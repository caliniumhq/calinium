'use strict';

const path = require('path');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const {
  withoutShopifyStorefrontPassword
} = require('../../../../ai/storefront-render/shopify-storefront-password-binding');

const DEFAULT_WORKER_TIMEOUT_MS = 30_000;

function workerError(code, message) {
  return Object.assign(new Error(message), { code });
}

function safeCode(value, fallback = 'shopify_cli_runtime_state_unavailable') {
  const code = String(value || '');
  return /^[a-z][a-z0-9_]{2,100}$/.test(code) ? code : fallback;
}

function sanitizedEnvironment(env) {
  return Object.fromEntries(Object.entries(withoutShopifyStorefrontPassword(env || {})).flatMap(([key, value]) => (
    typeof value === 'string' ? [[key, value]] : []
  )));
}

function sanitizeAttestation(result) {
  const safe = {
    ready: result?.ready === true,
    runtime_revision: String(result?.runtime_revision || ''),
    expected_version: String(result?.expected_version || ''),
    actual_version: String(result?.actual_version || ''),
    runtime_state_revision: String(result?.runtime_state_revision || ''),
    runtime_state_writable: result?.runtime_state_writable === true,
    package_immutable: result?.package_immutable === true,
    auto_upgrade_state: String(result?.auto_upgrade_state || ''),
    runtime_dependencies_ready: result?.runtime_dependencies_ready === true
  };
  if (!safe.ready || !safe.runtime_revision || !safe.expected_version || !safe.actual_version
    || !safe.runtime_state_revision || !safe.runtime_state_writable || !safe.package_immutable
    || safe.auto_upgrade_state !== 'off' || !safe.runtime_dependencies_ready) {
    throw workerError('shopify_cli_runtime_state_unavailable', 'Shopify CLI deep attestation returned an incomplete result.');
  }
  return safe;
}

function runControlledReadinessDeepAttestationWorker({
  root,
  env = process.env,
  timeoutMs = DEFAULT_WORKER_TIMEOUT_MS,
  signal = null,
  workerFactory = (filename, options) => new Worker(filename, options)
} = {}) {
  const repositoryRoot = path.resolve(root || path.join(__dirname, '../../../..'));
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer = null;
    let worker;

    function finish(error, value) {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener?.('abort', abort);
      if (error) reject(error);
      else resolve(value);
    }

    function abort() {
      void worker?.terminate?.();
      finish(workerError('controlled_beta_deep_attestation_aborted', 'Controlled readiness deep attestation was cancelled.'));
    }

    try {
      worker = workerFactory(__filename, {
        workerData: { root: repositoryRoot },
        env: sanitizedEnvironment(env)
      });
    } catch {
      finish(workerError('controlled_beta_deep_attestation_worker_unavailable', 'Controlled readiness deep-attestation worker could not start.'));
      return;
    }

    worker.once('message', (message) => {
      if (message?.ok === true) {
        try { finish(null, sanitizeAttestation(message.result)); }
        catch (error) { finish(error); }
        return;
      }
      finish(workerError(safeCode(message?.error?.code), 'Controlled readiness deep attestation failed.'));
    });
    worker.once('error', () => finish(workerError('controlled_beta_deep_attestation_worker_failed', 'Controlled readiness deep-attestation worker failed.')));
    worker.once('exit', (code) => {
      if (!settled && code !== 0) finish(workerError('controlled_beta_deep_attestation_worker_failed', 'Controlled readiness deep-attestation worker exited unexpectedly.'));
      else if (!settled) finish(workerError('controlled_beta_deep_attestation_result_missing', 'Controlled readiness deep-attestation worker returned no result.'));
    });

    timer = setTimeout(() => {
      void worker.terminate?.();
      finish(workerError('controlled_beta_deep_attestation_timeout', 'Controlled readiness deep attestation exceeded its bounded worker timeout.'));
    }, timeoutMs);
    timer.unref?.();
    if (signal?.aborted) abort();
    else signal?.addEventListener?.('abort', abort, { once: true });
  });
}

if (!isMainThread) {
  try {
    const { createShopifyCliRuntime } = require('../../../../ai/storefront-render/shopify-cli-runtime');
    const { executableAvailable } = require('../controlled-staging-runtime.cjs');
    const runtime = createShopifyCliRuntime({ root: workerData.root, env: process.env });
    const runtimeDependenciesReady = ['zip', 'unzip'].every((command) => executableAvailable(command));
    parentPort.postMessage({ ok: true, result: sanitizeAttestation({
      ...runtime.attestRuntimeStateReadiness(),
      runtime_dependencies_ready: runtimeDependenciesReady
    }) });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: { code: safeCode(error?.code) } });
  }
}

module.exports = {
  DEFAULT_WORKER_TIMEOUT_MS,
  sanitizedEnvironment,
  sanitizeAttestation,
  runControlledReadinessDeepAttestationWorker
};
