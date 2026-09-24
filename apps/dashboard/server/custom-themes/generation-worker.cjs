'use strict';

const { parentPort, workerData } = require('worker_threads');
const { CreativeDirectorAdapter } = require('../creative-director-adapter.cjs');
const { createApprovedBlockPlanTransport } = require('../../../../pipeline/resolve-approved-block-plan-transport.js');

function serializedError(error) {
  return {
    name: String(error?.name || 'Error'),
    message: String(error?.message || 'Theme generation failed.'),
    code: error?.code || null,
    validation: error?.validation || null,
    details: error?.details || null,
    stack: String(error?.stack || '')
  };
}

try {
  const input = workerData.input;
  if (input.approvedBlockPlanTransport) {
    const serializedTransport = input.approvedBlockPlanTransport;
    input.approvedBlockPlanTransport = createApprovedBlockPlanTransport({
      planRevision: serializedTransport.plan_revision,
      resourceSnapshot: serializedTransport.resource_snapshot,
      root: workerData.root
    });
  }
  const adapter = new CreativeDirectorAdapter({ root: workerData.root });
  const result = adapter.generateStorefront(input);
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({ ok: false, error: serializedError(error) });
}
