'use strict';

const path = require('path');
const { Worker } = require('worker_threads');
const { withoutShopifyStorefrontPassword } = require('../../../../ai/storefront-render/shopify-storefront-password-binding');

function generationError(payload = {}) {
  const error = new Error(String(payload.message || 'Theme generation failed.'));
  error.name = String(payload.name || 'Error');
  if (payload.code) error.code = payload.code;
  if (payload.validation) error.validation = payload.validation;
  if (payload.details) error.details = payload.details;
  if (payload.stack) error.stack = payload.stack;
  return error;
}

class GenerationWorkerRunner {
  constructor({ root, WorkerClass = Worker, workerPath = path.join(__dirname, 'generation-worker.cjs') }) {
    this.root = root;
    this.WorkerClass = WorkerClass;
    this.workerPath = workerPath;
  }

  run(input) {
    return new Promise((resolve, reject) => {
      const worker = new this.WorkerClass(this.workerPath, {
        workerData: { root: this.root, input },
        env: withoutShopifyStorefrontPassword(process.env)
      });
      let settled = false;
      worker.once('message', (message) => {
        settled = true;
        if (message?.ok) resolve(message.result);
        else reject(generationError(message?.error));
      });
      worker.once('error', (error) => {
        if (!settled) reject(error);
      });
      worker.once('exit', (code) => {
        if (!settled && code !== 0) reject(new Error('The isolated theme-generation worker stopped unexpectedly.'));
        else if (!settled) reject(new Error('The isolated theme-generation worker returned no result.'));
      });
    });
  }
}

module.exports = { GenerationWorkerRunner, generationError };
