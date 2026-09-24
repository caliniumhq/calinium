import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { CreativeDirectorAdapter } = require('../server/creative-director-adapter.cjs');
const root = path.resolve(process.cwd(), '../..');

describe('CreativeDirectorAdapter generation handoff', () => {
  it('forwards the immutable approved Resource Plan to the storefront pipeline', () => {
    const generateStorefront = vi.fn((input) => input);
    const adapter = new CreativeDirectorAdapter({ root, conversation: {}, pipeline: { generateStorefront } });
    const resourcePlan = { revision: 3, fields: [{ setting_ref: 'split-hero.image', section_id: 'split-hero', instance_id: 'homepage-01-split-hero' }] };

    const result = adapter.generateStorefront({
      creativeBrief: { version: '1.0' }, storeStrategy: { version: '1.0' }, review: { version: '1.0' }, generation: { status: 'ready_for_generation' }, resourcePlan, generationId: 'generation-test', runThemeCheck: false
    });

    expect(generateStorefront).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ resourcePlan, root, generationId: 'generation-test', runThemeCheck: false, outputRoot: path.join(root, 'output') });
  });
});
