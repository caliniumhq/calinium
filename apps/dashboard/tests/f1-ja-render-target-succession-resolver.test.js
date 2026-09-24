import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { digest, selectArchitecture } = require('../../../ai/architecture');
const {
  createMerchantGenerationFlow,
  bindStoreIntelligence,
  bindMerchantIntent,
  startArchitectureSelection,
  freezeArchitecture,
  bindDesignDna,
  bindComposition,
  bindPaidIdentity,
  startGeneration,
  bindArtifact,
  startRenderQa,
  completeRenderQa,
  assertMerchantGenerationFlow
} = require('../../../ai/merchant-flow');
const { contractsForCase } = require('../../../scripts/test-automatic-architecture-selection');
const {
  CONTROLLED_BETA_RUNTIME_REVISION,
  CONTROLLED_RENDER_TARGETS_REVISION
} = require('../server/services/merchant-flow-controlled-runtime-configuration.cjs');
const {
  createControlledRenderArtifactBinding
} = require('../server/services/merchant-flow-controlled-runtime.cjs');
const {
  createMerchantFlowRenderTargetSuccessionResolver
} = require('../server/services/merchant-flow-render-target-succession-resolver.cjs');

const root = path.resolve(import.meta.dirname, '../../..');
const architectureFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/automatic-architecture-selection.json'), 'utf8'));
const flowFixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/merchant-generation-flow.json'), 'utf8'));
const now = new Date('2026-09-09T12:00:00.000Z');
const shop = 'controlled-preview.myshopify.com';
const connectionId = 'connection-f1-ja-resolver';
const oldThemeId = '100000000006';
const newThemeId = '100000000005';
const mainThemeId = '100000000001';
const sourceRevision = '2000000000000000000000000000000000000001';

function configuration(themeId) {
  return {
    enabled: true,
    configuration_revision: CONTROLLED_BETA_RUNTIME_REVISION,
    render_target_configuration_revision: CONTROLLED_RENDER_TARGETS_REVISION,
    controlled_shop_domains: [shop],
    render_targets: [{
      shop_domain: shop,
      theme_id: themeId,
      theme_gid: `gid://shopify/OnlineStoreTheme/${themeId}`,
      expected_theme_role: 'development'
    }],
    safety: {
      fixture_fallback_allowed: false,
      approved_replay_allowed: false,
      automatic_repair_allowed: false,
      shopify_write_allowed: false,
      live_theme_mutation_allowed: false
    },
    validation: { valid: true, reason_codes: [] }
  };
}

function canonical(flow) {
  const base = structuredClone(flow);
  delete base.checksum;
  return { ...base, checksum: digest(base) };
}

function previewReadyFlow() {
  const selectedCase = architectureFixture.cases.find((entry) => entry.id === 'commerce_dense_store');
  const { storeIntelligence, merchantIntent } = contractsForCase(selectedCase);
  const at = flowFixture.timestamps;
  let flow = createMerchantGenerationFlow({
    projectId: 'project-f1-ja-resolver',
    organizationId: 'organization-f1-ja-resolver',
    conversationRevision: 'conversation-f1-ja-resolver',
    storeContext: { connection_id: connectionId, shop },
    createdAt: at[0],
    root
  });
  flow = bindStoreIntelligence(flow, storeIntelligence, at[1], root);
  flow = bindMerchantIntent(flow, merchantIntent, at[2], root);
  flow = startArchitectureSelection(flow, at[3], root);
  flow = freezeArchitecture(flow, selectArchitecture({ merchantIntent, storeIntelligence, selectionMode: 'automatic_beta', root }), at[4], {}, root);
  flow = bindDesignDna(flow, flowFixture.design_dna, at[8], root);
  flow = bindComposition(flow, flowFixture.composition, at[9], root);
  flow = bindPaidIdentity(flow, flowFixture.paid_identity_frozen, at[10], root);
  flow = startGeneration(flow, flowFixture.generation_id, at[12], root);
  flow = bindArtifact(flow, flowFixture.artifact, at[13], root);
  flow = completeRenderQa(startRenderQa(flow, at[14], root), flowFixture.qa_passed, at[15], root);
  const artifact = createControlledRenderArtifactBinding({ configuration: configuration(oldThemeId), flow, artifact: flow.artifact });
  return assertMerchantGenerationFlow(canonical({ ...flow, artifact }), root);
}

function readiness(overrides = {}) {
  return {
    status: 'READY',
    snapshot_id: `controlled-readiness-snapshot-${'a'.repeat(20)}`,
    snapshot_checksum: 'b'.repeat(64),
    binding_checksum: 'c'.repeat(64),
    checked_at: '2026-09-09T11:59:00.000Z',
    valid_until: '2026-09-09T12:04:00.000Z',
    ...overrides
  };
}

function inventory(themes, overrides = {}) {
  return {
    authoritative_source: 'shopify_admin_api',
    fresh: true,
    complete: true,
    verified_at: now.toISOString(),
    shop_domain: shop,
    connection_id: connectionId,
    themes,
    ...overrides
  };
}

function theme(id, role) {
  return { id: `gid://shopify/OnlineStoreTheme/${id}`, role, processing: false, processingFailed: false };
}

function resolverFor(authoritativeInventory, inspect = vi.fn(async () => authoritativeInventory)) {
  return {
    inspect,
    resolver: createMerchantFlowRenderTargetSuccessionResolver({
      root,
      configuration: configuration(newThemeId),
      shopifyService: { inspectControlledThemeInventory: inspect },
      mainThemeId,
      sourceRevision,
      clock: () => now
    })
  };
}

describe('F1-JA render-target succession resolver', () => {
  it('prepares an opaque request and accepts authoritative old-missing, DEVELOPMENT-successor, exact-MAIN inventory', async () => {
    const flow = previewReadyFlow();
    const { resolver, inspect } = resolverFor(inventory([
      theme(newThemeId, 'DEVELOPMENT'),
      theme(mainThemeId, 'MAIN')
    ]));

    const prepared = resolver.prepare({ flow, readiness: readiness() });
    expect(prepared).toMatchObject({ available: true, reason_code: null });
    expect(Object.keys(prepared.request).sort()).toEqual([
      'contract_version', 'expected_flow_checksum', 'expected_flow_sequence', 'flow_id', 'idempotency_key'
    ]);
    expect(JSON.stringify(prepared.request)).not.toContain(oldThemeId);
    expect(JSON.stringify(prepared.request)).not.toContain(newThemeId);
    expect(JSON.stringify(prepared.request)).not.toContain(mainThemeId);

    const verified = await resolver.verify({ flow, readiness: readiness() });
    expect(verified.verification).toMatchObject({
      prior_authority: { status: 'not_found', theme_id: oldThemeId },
      successor_authority: { status: 'verified', theme_id: newThemeId, theme_role: 'development' },
      main_target: { theme_id: mainThemeId, role: 'main' }
    });
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it('fails closed when authoritative inventory still contains the old target', async () => {
    const { resolver } = resolverFor(inventory([
      theme(oldThemeId, 'DEVELOPMENT'),
      theme(newThemeId, 'DEVELOPMENT'),
      theme(mainThemeId, 'MAIN')
    ]));
    await expect(resolver.verify({ flow: previewReadyFlow(), readiness: readiness() }))
      .rejects.toMatchObject({ code: 'merchant_flow_render_target_succession_old_target_present', retryable: false });
  });

  it('fails closed when the configured successor is MAIN', async () => {
    const { resolver } = resolverFor(inventory([
      theme(newThemeId, 'MAIN'),
      theme(mainThemeId, 'MAIN')
    ]));
    await expect(resolver.verify({ flow: previewReadyFlow(), readiness: readiness() }))
      .rejects.toMatchObject({ code: 'merchant_flow_render_target_succession_new_target_invalid', retryable: false });
  });

  it('fails closed when the authoritative theme inventory is not complete', async () => {
    const { resolver } = resolverFor(inventory([
      theme(newThemeId, 'DEVELOPMENT'),
      theme(mainThemeId, 'MAIN')
    ], { complete: false }));
    await expect(resolver.verify({ flow: previewReadyFlow(), readiness: readiness() }))
      .rejects.toMatchObject({ code: 'merchant_flow_render_target_succession_target_unverified', retryable: false });
  });

  it('rejects stale readiness before querying Shopify', async () => {
    const inspect = vi.fn(async () => inventory([theme(newThemeId, 'DEVELOPMENT'), theme(mainThemeId, 'MAIN')]));
    const { resolver } = resolverFor(null, inspect);
    const stale = readiness({ valid_until: '2026-09-09T11:59:59.000Z' });
    expect(resolver.prepare({ flow: previewReadyFlow(), readiness: stale })).toMatchObject({ available: false, reason_code: 'authority_invalid' });
    await expect(resolver.verify({ flow: previewReadyFlow(), readiness: stale }))
      .rejects.toMatchObject({ code: 'merchant_flow_render_target_succession_not_eligible', retryable: false });
    expect(inspect).not.toHaveBeenCalled();
  });
});
