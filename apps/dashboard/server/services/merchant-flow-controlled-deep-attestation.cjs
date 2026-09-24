'use strict';

const { controlledBetaReadiness } = require('./merchant-flow-controlled-readiness.cjs');
const {
  runControlledReadinessDeepAttestationWorker
} = require('../workers/controlled-readiness-deep-attestation-worker.cjs');
const {
  SHOPIFY_CLI_RUNTIME_REVISION,
  PINNED_SHOPIFY_CLI_VERSION
} = require('../../../../ai/storefront-render/shopify-cli-runtime');
const {
  SHOPIFY_CLI_RUNTIME_STATE_REVISION
} = require('../../../../ai/storefront-render/shopify-cli-runtime-state');

const CONTROLLED_BETA_DEEP_ATTESTATION_REVISION = 'controlled-beta-deep-attestation-v1';

function createControlledBetaDeepAttestation({
  root,
  env = process.env,
  clock = () => new Date(),
  probes = {},
  cliDeepAttestation = null,
  cliWorkerTimeoutMs,
  workerRunner = runControlledReadinessDeepAttestationWorker
} = {}) {
  const configuredCliDeepAttestation = cliDeepAttestation || probes.shopify_cli_deep || null;
  const componentProbes = { ...probes };
  delete componentProbes.shopify_cli_deep;

  return async function runControlledBetaDeepAttestation({ signal = null } = {}) {
    let sharedCliPromise = null;
    const inspectCli = () => {
      sharedCliPromise ||= Promise.resolve().then(() => (
        configuredCliDeepAttestation
          ? configuredCliDeepAttestation({ signal })
          : workerRunner({ root, env, timeoutMs: cliWorkerTimeoutMs, signal })
      ));
      return sharedCliPromise;
    };
    const deepProbes = {
      ...componentProbes,
      shopify_cli_runtime: async () => {
        const result = await inspectCli();
        return {
          ready: result?.ready === true
            && result.runtime_revision === SHOPIFY_CLI_RUNTIME_REVISION
            && result.expected_version === PINNED_SHOPIFY_CLI_VERSION
            && result.actual_version === PINNED_SHOPIFY_CLI_VERSION
            && result.runtime_dependencies_ready === true
        };
      },
      shopify_cli_runtime_state: async () => {
        const result = await inspectCli();
        return {
          ready: result?.ready === true
            && result.runtime_state_revision === SHOPIFY_CLI_RUNTIME_STATE_REVISION
            && result.runtime_state_writable === true
            && result.package_immutable === true
            && result.auto_upgrade_state === 'off'
        };
      }
    };
    const readiness = await controlledBetaReadiness({ env, probes: deepProbes, clock, signal });
    return {
      ...readiness,
      deep_attestation_revision: CONTROLLED_BETA_DEEP_ATTESTATION_REVISION
    };
  };
}

module.exports = {
  CONTROLLED_BETA_DEEP_ATTESTATION_REVISION,
  createControlledBetaDeepAttestation
};
