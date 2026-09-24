import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { GenerationWorkerRunner } = require('../server/custom-themes/generation-worker-runner.cjs');

class SuccessfulWorker extends EventEmitter {
  constructor(workerPath, options) {
    super();
    this.workerPath = workerPath;
    this.options = options;
    queueMicrotask(() => this.emit('message', { ok: true, result: { status: 'generated_for_review', input: options.workerData.input } }));
  }
}

class FailedWorker extends EventEmitter {
  constructor() {
    super();
    queueMicrotask(() => this.emit('message', { ok: false, error: { name: 'Error', message: 'Package validation failed.', validation: { valid: false, errors: ['invalid'] } } }));
  }
}

describe('Generation worker runner', () => {
  it('runs generation outside the caller and returns the worker result', async () => {
    const runner = new GenerationWorkerRunner({ root: '/safe/root', WorkerClass: SuccessfulWorker, workerPath: '/safe/worker.cjs' });
    await expect(runner.run({ generationId: 'generation-1' })).resolves.toEqual({ status: 'generated_for_review', input: { generationId: 'generation-1' } });
  });

  it('preserves validation failure classification without exposing worker internals', async () => {
    const runner = new GenerationWorkerRunner({ root: '/safe/root', WorkerClass: FailedWorker, workerPath: '/safe/worker.cjs' });
    await expect(runner.run({ generationId: 'generation-2' })).rejects.toMatchObject({ message: 'Package validation failed.', validation: { valid: false, errors: ['invalid'] } });
  });
});
