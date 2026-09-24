import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { activePrice } = require('../server/custom-themes/price-catalog.cjs');
const { evaluateGenerationEligibility, shopifyRuntimeValue } = require('../server/custom-themes/eligibility-evaluator.cjs');
const { snapshotGenerationContext } = require('../server/custom-themes/custom-theme-service.cjs');
const { runtimeInventory } = require('../../../scripts/lib/theme-runtime-integrity.js');
const { repositoryPaths } = require('../../../scripts/lib/repository-paths.js');
const { architectureProvenance } = require('../../../ai/architecture');
const { effectiveResourcePlan } = require('../../../pipeline/resource-confirmation-eligibility');

const root = path.resolve(process.cwd(), '../..');
const password = 'custom-theme-test-password';
const generatedWorkspaces = [];

function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-custom-theme-')), 'dashboard.sqlite'); }
function clockFactory() { let tick = 0; const base = Date.parse('2026-07-24T12:20:00.000Z'); return () => new Date(base + (tick++ * 1000)); }
function testEnv(database) {
  return {
    NODE_ENV: 'test', CALINIUM_SQLITE_PATH: database, CALINIUM_PAYMENT_MODE: 'development_simulator', CALINIUM_PAYMENT_PROVIDER: 'development_simulator'
  };
}
function fakeGenerator({ result = 'valid', seen = [], privateReference = false } = {}) {
  return (input) => {
    seen.push(JSON.parse(JSON.stringify(input)));
    const id = input.generationId;
    const workspace = path.join(root, 'output', id);
    generatedWorkspaces.push(workspace);
    if (result === 'invalid') return { status: 'generated_for_review', next_step: 'Package validation failed.', read_only_theme_package: { validation: { valid: false, errors: ['Fixture validation failure.'], warnings: [] } } };
    fs.mkdirSync(path.join(workspace, 'exports'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'manifests'), { recursive: true });
    fs.mkdirSync(path.join(workspace, 'reports'), { recursive: true });
    const validation = { valid: true, errors: [], warnings: [] };
    const preset = input.approvedPresetRevision;
    const manifest = {
      generation_id: id,
      approved_preset_provenance: preset ? { revision_id: preset.revision_id, preset_id: preset.preset_id, preset_version: preset.preset_version, preset_checksum: preset.preset_checksum } : null,
      approved_recommendation_provenance: input.approvedRecommendationRevision ? { revision_id: input.approvedRecommendationRevision.revision_id } : null,
      approved_design_dna_provenance: input.approvedDesignDnaRevision ? { revision_id: input.approvedDesignDnaRevision.revision_id } : null,
      architecture_selection: input.architectureSelectionRevision ? architectureProvenance(input.architectureSelectionRevision, root) : null,
      shopify_operations: { write_operations: false, upload: false, publish: false, required_scope: 'none' }
    };
    const packageManifest = { generation_id: id, shopify_operations: manifest.shopify_operations };
    const packageRoot = path.join(workspace, 'fixture-theme');
    fs.mkdirSync(path.join(packageRoot, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(packageRoot, 'templates', 'index.json'), JSON.stringify({ sections: privateReference ? { hero: { type: 'full-screen-hero', settings: { image: 'dashboard://projects/private/assets/image' } } } : {}, order: privateReference ? ['hero'] : [] }));
    execFileSync('zip', ['-X', '-r', path.join(workspace, 'exports', 'calinium-storefront.zip'), 'templates'], { cwd: packageRoot, stdio: 'ignore' });
    fs.writeFileSync(path.join(workspace, 'manifests', 'theme-specification.json'), JSON.stringify({ version: 1 }));
    fs.writeFileSync(path.join(workspace, 'manifests', 'read-only-theme-package.json'), JSON.stringify(packageManifest));
    fs.writeFileSync(path.join(workspace, 'reports', 'theme-package-validation.json'), JSON.stringify(validation));
    return { status: 'generated_for_review', generated_theme: { manifest }, read_only_theme_package: { workspace, archive_path: path.join(workspace, 'exports', 'calinium-storefront.zip'), manifest: packageManifest, validation } };
  };
}
afterEach(() => {
  for (const workspace of generatedWorkspaces.splice(0)) fs.rmSync(workspace, { recursive: true, force: true });
});
async function servicesFor(database, options = {}) {
  return createDashboardServices({ root, env: testEnv(database), clock: clockFactory(), customThemeGenerator: options.generator || fakeGenerator(options), paymentProvider: options.paymentProvider });
}
async function servicesForEnvironment(database, environment, options = {}) {
  const dataRoot = path.dirname(database);
  const env = {
    ...testEnv(database),
    NODE_ENV: environment,
    CALINIUM_ENVIRONMENT: environment,
    CALINIUM_DASHBOARD_SESSION_SECRET: 'paid-generation-integrity-test-session-secret',
    CALINIUM_ASSET_STORAGE_PATH: path.join(dataRoot, 'assets')
  };
  return createDashboardServices({ root, env, clock: clockFactory(), customThemeGenerator: options.generator || fakeGenerator(options), paymentProvider: options.paymentProvider });
}
function controlledPaymentProvider({ status = 'ACTIVE', amountOffset = 0, currency = 'USD' } = {}) {
  const state = { status, amountOffset, currency, createCalls: 0, verifyCalls: 0 };
  return {
    name: 'development_simulator',
    isAvailable: () => true,
    checkoutRequired: () => false,
    createPurchase: async ({ order, price }) => {
      state.createCalls += 1;
      return { provider: 'development_simulator', provider_purchase_id: `controlled-${order.id}`, provider_status: 'PENDING', amount_cents: price.amount_cents, currency: price.currency, test_mode: true, confirmation_url: null, confirmation_url_status: 'not_required' };
    },
    verifyPurchase: async ({ order, purchase }) => {
      state.verifyCalls += 1;
      return { provider: 'development_simulator', provider_purchase_id: purchase.provider_purchase_id, provider_event_id: `controlled-event-${order.id}-${state.status}`, provider_status: state.status, payment_status: String(state.status).toUpperCase() === 'ACTIVE' ? 'paid' : String(state.status).toLowerCase(), amount_cents: order.amount_cents + state.amountOffset, currency: state.currency, test_mode: true, raw_event_digest: 'a'.repeat(64) };
    },
    state
  };
}
async function createReadyProject(services, email = 'paid-theme@example.com') {
  const registered = await services.auth.register({ email, password, fullName: 'Paid Merchant', organizationName: 'Paid Studio', ipAddress: '127.0.0.1' });
  const created = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Leather Bags', business_name: 'Northline Atelier', country: 'GB' } });
  const project = created.project;
  await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
  // This paid-order fixture intentionally selects a strategy without an
  // Approved Block Plan composition. It preserves the legacy shell-only path
  // while Craftsmanship strategies require their own merchant-reviewed plan.
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Natural skincare products' });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'People building a simple skincare routine' });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Help shoppers discover collections with clear product context' });
  await services.creativeDirector.respond({ userId: registered.user.id, projectId: project.id, message: 'Warm, calm, and modern' });
  await services.creativeDirector.createBrief({ userId: registered.user.id, projectId: project.id });
  await services.creativeDirector.approveBrief({ userId: registered.user.id, projectId: project.id });
  const strategyReview = await services.creativeDirector.load({ userId: registered.user.id, projectId: project.id });
  for (const recommendation of strategyReview.session.store_strategy.recommendations || []) {
    if (recommendation.requiresMerchantApproval) await services.creativeDirector.decideRecommendation({ userId: registered.user.id, projectId: project.id, recommendationPath: recommendation.id, status: 'approved' });
  }
  let approved = await services.creativeDirector.approveStrategy({ userId: registered.user.id, projectId: project.id });
  approved = await services.creativeDirector.approvePreset({ userId: registered.user.id, projectId: project.id, expectedVersion: approved.session.preset_selection.candidate_version });
  await services.store.updateCreativeDirector(project.id, { ...approved.session, resource_plan: { ...approved.session.resource_plan, fields: [], required_assets: [], required_confirmations: [] } });
  approved = await services.creativeDirector.updateResources({ userId: registered.user.id, projectId: project.id });
  expect(approved.session.stage).toBe('offer');
  return { user: registered.user, project, session: approved.session };
}

describe('paid custom-theme service', () => {
  it('creates portable Shopify runtime bindings and refuses private dashboard references in paid snapshots', () => {
    expect(shopifyRuntimeValue({ resource_type: 'product', handle: 'travel-bag' }, { kind: 'product' })).toBe('travel-bag');
    expect(shopifyRuntimeValue({ resource_type: 'collection', handle: 'the-atlas' }, { kind: 'collection' })).toBe('the-atlas');
    expect(shopifyRuntimeValue({ resource_type: 'menu', handle: 'main-menu' }, { kind: 'menu' })).toBe('main-menu');
    expect(shopifyRuntimeValue({
      resource_type: 'product_media',
      preview_url: 'https://cdn.shopify.com/s/files/1/0000/0000/files/heirloom-77-41-in.jpg?v=1',
      metadata: { media_type: 'IMAGE', image_url: 'https://cdn.shopify.com/s/files/1/0000/0000/files/heirloom-77-41-in.jpg?v=1' }
    }, { kind: 'image' })).toBe('shopify://shop_images/heirloom-77-41-in.jpg');
    expect(shopifyRuntimeValue({ resource_type: 'file', preview_url: 'https://untrusted.example/image.jpg', metadata: { media_type: 'IMAGE' } }, { kind: 'image' })).toBeNull();

    const normalized = snapshotGenerationContext({
      merchant_references: {
        'homepage.hero.image': 'dashboard://projects/project/shopify-resources/image-resource',
        'homepage.hero.product': 'dashboard://projects/project/shopify-resources/product-resource'
      },
      asset_references: {}
    }, [
      { resource_id: 'image-resource', runtime_value: 'shopify://shop_images/heirloom.jpg' },
      { resource_id: 'product-resource', runtime_value: 'travel-bag' }
    ]);
    expect(normalized.merchant_references).toEqual({
      'homepage.hero.image': 'shopify://shop_images/heirloom.jpg',
      'homepage.hero.product': 'travel-bag'
    });
    expect(() => snapshotGenerationContext({ merchant_references: { 'homepage.hero.image': 'dashboard://projects/project/assets/private-asset' } }, [])).toThrowError(expect.objectContaining({ code: 'theme_resource_binding_unavailable' }));
  });

  it('fails closed before payment initialization when production pricing is missing or malformed', async () => {
    const provider = controlledPaymentProvider({ status: 'ACTIVE' });
    await expect(servicesForEnvironment(testDatabase(), 'production', { paymentProvider: provider })).rejects.toThrow(/CALINIUM_STORAGE_DRIVER=postgres/);
    expect(provider.state.createCalls).toBe(0);
    expect(activePrice({ root, env: { NODE_ENV: 'production', CALINIUM_ENVIRONMENT: 'production' } })).toBeNull();

    const invalidRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-invalid-price-'));
    fs.mkdirSync(path.join(invalidRoot, 'config'), { recursive: true });
    fs.writeFileSync(path.join(invalidRoot, 'config', 'custom-theme-price-catalog.json'), JSON.stringify({
      catalog_version: '1.0',
      products: [{ product_code: 'calinium_custom_storefront', display_name: 'Custom storefront', billing_type: 'one_time', prices: [{ price_version: 'invalid', amount_cents: 0, currency: 'USD', active: true, environments: ['production'] }] }]
    }));
    expect(() => activePrice({ root: invalidRoot, env: { NODE_ENV: 'production', CALINIUM_ENVIRONMENT: 'production' } })).toThrowError(expect.objectContaining({ code: 'custom_theme_price_catalog_invalid', status: 503 }));
  });

  it('requires the current server-verified preset approval for eligibility and direct purchase calls', async () => {
    const services = await servicesFor(testDatabase());
    const { user, project, session } = await createReadyProject(services, 'preset-approval-gate@example.com');
    const missing = { ...session, preset_selection: null };
    await services.store.updateCreativeDirector(project.id, missing);
    const missingEligibility = await services.customThemes.eligibility({ userId: user.id, projectId: project.id });
    expect(missingEligibility.eligibility.blocked.map((item) => item.id)).toContain('preset_approval');
    const bypass = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'preset-bypass' });
    expect(bypass.created).toBe(false);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_orders WHERE project_id = $1', [project.id])).toMatchObject({ count: 0 });
    expect(() => services.customThemes.presetFromSnapshot({ project, order: { approved_preset_revision_id: null }, snapshot: { approved_preset_revision: null } })).toThrowError(expect.objectContaining({ code: 'preset_approval_required' }));

    const stale = { ...session, preset_selection: { ...session.preset_selection, status: 'candidate' } };
    await services.store.updateCreativeDirector(project.id, stale);
    const staleEligibility = await services.customThemes.eligibility({ userId: user.id, projectId: project.id });
    expect(staleEligibility.eligibility.blocked.map((item) => item.id)).toContain('preset_approval');

    await services.store.updateCreativeDirector(project.id, session);
    const current = await services.customThemes.eligibility({ userId: user.id, projectId: project.id });
    expect(current.eligibility.requirements).toContainEqual({ id: 'preset_approval', label: 'Current approved storefront design', status: 'eligible', reason: null });
    expect(current.eligibility.eligible).toBe(true);
    await services.close();
  });

  it('requires a current final-review token and rejects a stale direct purchase before creating an order', async () => {
    const services = await servicesFor(testDatabase());
    const { user, project, session } = await createReadyProject(services, 'stale-readiness@example.com');
    const reviewed = await services.customThemes.eligibility({ userId: user.id, projectId: project.id });
    expect(reviewed.eligibility).toMatchObject({ eligible: true, readiness: { status: 'ready', blocker_count: 0 } });
    expect(reviewed.eligibility.readiness_token).toMatch(/^[a-f0-9]{64}$/);

    await services.store.updateCreativeDirector(project.id, {
      ...session,
      creative_brief: { ...session.creative_brief, business: { ...session.creative_brief.business, name: 'Northline Atelier Updated' } }
    });
    await expect(services.customThemes.createOrder({
      userId: user.id,
      projectId: project.id,
      idempotencyKey: 'stale-final-review',
      expectedReadinessToken: reviewed.eligibility.readiness_token
    })).rejects.toMatchObject({ code: 'custom_theme_readiness_stale', status: 409 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_orders WHERE project_id = $1', [project.id])).toMatchObject({ count: 0 });

    const refreshed = await services.customThemes.eligibility({ userId: user.id, projectId: project.id });
    expect(refreshed.eligibility.readiness_token).not.toBe(reviewed.eligibility.readiness_token);
    const created = await services.customThemes.createOrder({
      userId: user.id,
      projectId: project.id,
      idempotencyKey: 'current-final-review',
      expectedReadinessToken: refreshed.eligibility.readiness_token
    });
    expect(created).toMatchObject({ created: true, order: { payment_status: 'pending', generation_status: 'not_started' } });
    await services.close();
  });

  it('activates the existing test catalog only for staging validation while production remains fail-closed', async () => {
    const staging = activePrice({ root, env: { NODE_ENV: 'production', CALINIUM_ENVIRONMENT: 'staging' } });
    expect(staging).toMatchObject({ environment: 'staging', price_version: 'development-2026-07', amount_cents: 100, currency: 'USD' });
    expect(activePrice({ root, env: { NODE_ENV: 'production', CALINIUM_ENVIRONMENT: 'production' } })).toBeNull();
  });

  it('records a precise, sanitized payment-preparation failure and never starts generation', async () => {
    const provider = {
      name: 'shopify_admin_graphql_one_time',
      isAvailable: () => true,
      checkoutRequired: () => false,
      async createPurchase() {
        throw new DashboardError('shopify_billing_purchase_rejected', 'Shopify could not prepare the secure approval step. Review the requirement below and try again.', 409, {
          stage: 'payment_preparation', reasons: [{ field: 'returnUrl', message: 'The return URL is not permitted for this app.' }]
        });
      }
    };
    const services = await servicesFor(testDatabase(), { paymentProvider: provider });
    const { user, project } = await createReadyProject(services, 'payment-preparation-failure@example.com');
    const result = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'billing-failure', requestId: 'req_billing_failure' });
    expect(result.order).toMatchObject({ payment_status: 'failed', generation_status: 'not_started' });
    expect(result.order.failure).toMatchObject({ stage: 'payment_preparation', code: 'shopify_billing_purchase_rejected', request_id: 'req_billing_failure' });
    expect(result.order.failure.reasons).toEqual([{ field: 'returnUrl', message: 'The return URL is not permitted for this app.' }]);
    expect(result.order.failure_reason).not.toContain('server-only-token');
    expect(await services.store.findLatestCustomThemeGenerationRun(result.order.id)).toBeNull();
    await services.close();
  });

  it('blocks an unapproved plan and keeps direct generation unavailable before payment', async () => {
    const services = await servicesFor(testDatabase());
    const registered = await services.auth.register({ email: 'blocked-theme@example.com', password, fullName: 'Blocked', organizationName: 'Blocked Studio', ipAddress: '127.0.0.1' });
    const project = (await services.projects.createProject({ userId: registered.user.id, input: { name: 'Blocked', business_name: 'Blocked', country: 'GB' } })).project;
    await services.creativeDirector.start({ userId: registered.user.id, projectId: project.id });
    const blocked = await services.customThemes.createOrder({ userId: registered.user.id, projectId: project.id, idempotencyKey: 'blocked' });
    expect(blocked.created).toBe(false); expect(blocked.eligibility.eligible).toBe(false);
    await expect(services.creativeDirector.generate({ userId: registered.user.id, projectId: project.id })).rejects.toMatchObject({ code: 'custom_theme_purchase_required' });
    await services.close();
  });

  it('blocks a paid offer when a required merchant asset is missing', async () => {
    const services = await servicesFor(testDatabase());
    const { user, project, session } = await createReadyProject(services, 'missing-asset@example.com');
    await services.store.updateCreativeDirector(project.id, {
      ...session,
      resource_plan: { ...session.resource_plan, required_assets: [{ asset_id: 'logo_required', label: 'Logo', field_refs: [] }] }
    });
    const result = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'missing-asset' });
    expect(result.created).toBe(false);
    expect(result.eligibility.blocked.map((item) => item.id)).toContain('merchant_assets');
    await services.close();
  });

  it('accepts only an immutable Resource Set omission for a required optional-media field', async () => {
    const database = testDatabase();
    const services = await servicesFor(database);
    const { project, session } = await createReadyProject(services, 'approved-omission@example.com');
    const field = { setting_ref: 'full-screen-hero.video', setting_id: 'video', section_id: 'full-screen-hero', instance_id: 'homepage-01-full-screen-hero', kind: 'video', required: true };
    const scoped = {
      ...session,
      resource_plan: { ...session.resource_plan, fields: [field], groups: [], required_assets: [], required_confirmations: [] },
      generation_context: {
        ...session.generation_context,
        merchant_references: {},
        shopify_resource_references: {},
        resolved_empty_fields: [field.setting_ref],
        recommended_resource_set_approval: { omitted_field_refs: [field.setting_ref] }
      }
    };
    const evaluation = await evaluateGenerationEligibility({ root, store: services.store, session: scoped, project, price: activePrice({ root, env: testEnv(database) }) });
    expect(evaluation.requirements.find((item) => item.id === 'merchant_assets')).toMatchObject({ status: 'eligible' });
    await services.close();
  });

  it('requires payment, creates its immutable snapshot only after payment, and produces only read-only artifacts', async () => {
    const before = runtimeInventory(repositoryPaths(root).themeRoot);
    const seen = []; const services = await servicesFor(testDatabase(), { seen });
    const { user, project, session } = await createReadyProject(services);
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'purchase-one' });
    expect(created.created).toBe(true); expect(created.order.payment_status).toBe('pending');
    const pendingOrder = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(pendingOrder.snapshot).toBeNull();
    expect(pendingOrder.approved_preset_revision_id).toBe(session.preset_selection.approved_revision_id);
    await expect(services.customThemes.retryGeneration({ userId: user.id, projectId: project.id, orderId: created.order.id })).rejects.toMatchObject({ code: 'custom_theme_payment_required' });
    const duplicate = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'purchase-one' });
    expect(duplicate.order.id).toBe(created.order.id);
    const paid = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'payment-one' });
    expect(paid.order.payment_status).toBe('paid'); expect(paid.order.generation_status).toBe('ready');
    expect(seen).toHaveLength(1); expect(seen[0].creativeBrief.business.name).toBe('Northline Atelier');
    expect(seen[0].resourcePlan).toEqual(effectiveResourcePlan(session.resource_plan));
    expect(seen[0]).not.toHaveProperty('contentPlanEligibility');
    expect(seen[0].approvedPresetRevision.revision_id).toBe(session.preset_selection.approved_revision_id);
    expect(seen[0].architectureSelectionRevision.profile_id).toBe('profile.current_calinium.v1');
    const paidRecord = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(paidRecord.snapshot.approved_preset_revision.revision_id).toBe(session.preset_selection.approved_revision_id);
    expect(paidRecord.snapshot.generation_approval_binding.approved_preset.revision_id).toBe(session.preset_selection.approved_revision_id);
    expect(paidRecord.snapshot.architecture_selection_revision.profile_id).toBe('profile.current_calinium.v1');
    expect(paidRecord.snapshot.generation_approval_binding.architecture_selection.selection_revision_id).toBe(paidRecord.snapshot.architecture_selection_revision.revision_id);
    expect(paidRecord.snapshot.content_plan_eligibility).toMatchObject({ policy_version: 'content-plan-eligibility-v1', effective_composition_checksum: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(paidRecord.snapshot.merchant_intent.revision_id).toBe(paidRecord.snapshot.architecture_selection_revision.merchant_intent_revision);
    await services.store.updateCreativeDirector(project.id, { ...session, creative_brief: { ...session.creative_brief, business: { ...session.creative_brief.business, name: 'Changed after payment' } } });
    const repeat = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'payment-one' });
    expect(repeat.resumed).toBe(true);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_payment_events WHERE order_id = $1', [created.order.id])).toMatchObject({ count: 1 });
    const artifact = await services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' });
    expect(artifact.file).toContain(path.join('output', 'generation-run-order-')); expect(artifact.filename).toBe('calinium-storefront.zip');
    expect(await services.store.listActivity(project.organization_id, 20)).toContainEqual(expect.objectContaining({ type: 'custom_theme_artifact_downloaded', project_id: project.id, payload: { order_id: created.order.id, artifact: 'theme-zip' } }));
    const metadata = JSON.parse((await services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'generation-metadata' })).buffer.toString('utf8'));
    expect(metadata.approved_preset_provenance.revision_id).toBe(session.preset_selection.approved_revision_id);
    expect(metadata.approved_recommendation_provenance?.revision_id || null).toBe(seen[0].approvedRecommendationRevision?.revision_id || null);
    expect(metadata.approved_design_dna_provenance?.revision_id || null).toBe(seen[0].approvedDesignDnaRevision?.revision_id || null);
    expect(metadata.content_plan_provenance).toMatchObject({ policy_version: 'content-plan-eligibility-v1', effective_composition_checksum: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(metadata.architecture_selection.profile_id).toBe('profile.current_calinium.v1');
    expect((await services.customThemes.order({ userId: user.id, projectId: project.id, orderId: created.order.id })).order).not.toHaveProperty('snapshot');
    const after = runtimeInventory(repositoryPaths(root).themeRoot);
    expect(after).toEqual(before);
    await services.close();
  });

  it('never snapshots or generates changed approved inputs after a purchase is started', async () => {
    const seen = []; const services = await servicesFor(testDatabase(), { seen });
    const { user, project, session } = await createReadyProject(services, 'changed-while-paying@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'changed-inputs' });
    await services.store.updateCreativeDirector(project.id, { ...session, creative_brief: { ...session.creative_brief, business: { ...session.creative_brief.business, name: 'Edited while awaiting payment' } }, preset_selection: null });
    const result = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'changed-inputs-payment' });
    expect(result.order.payment_status).toBe('paid');
    expect(result.order.generation_status).toBe('blocked');
    expect(seen).toHaveLength(0);
    expect((await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id)).snapshot).toBeNull();
    await services.close();
  });

  it('keeps concurrent paid verification blocked when approved inputs change at the snapshot transaction boundary', async () => {
    const seen = [];
    const provider = controlledPaymentProvider({ status: 'ACTIVE' });
    const services = await servicesFor(testDatabase(), { paymentProvider: provider, seen });
    const { user, project, session } = await createReadyProject(services, 'concurrent-changed-while-paying@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'concurrent-changed-inputs' });
    const originalTransaction = services.store.transaction.bind(services.store);
    let arrivals = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    services.store.transaction = async (work) => {
      arrivals += 1;
      if (arrivals === 1) await gate;
      else if (arrivals === 2) {
        await services.store.updateCreativeDirector(project.id, {
          ...session,
          creative_brief: { ...session.creative_brief, business: { ...session.creative_brief.business, name: 'Concurrent edit at snapshot boundary' } },
          updated_at: '2026-07-24T13:00:00.000Z'
        });
        release();
      }
      return originalTransaction(work);
    };
    const results = await Promise.all([
      services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'concurrent-paid-a' }),
      services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: created.order.id, idempotencyKey: 'concurrent-paid-b' })
    ]);
    expect(results.every((result) => result.order.payment_status === 'paid' && result.order.generation_status === 'blocked')).toBe(true);
    const stored = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(stored.snapshot).toBeNull();
    expect(seen).toHaveLength(0);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_payment_events WHERE order_id = $1', [created.order.id])).toMatchObject({ count: 1 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs WHERE order_id = $1', [created.order.id])).toMatchObject({ count: 0 });
    await services.close();
  });

  it('marks failed package validation, resumes a paid order without another charge, and denies cross-project artifact reads', async () => {
    const database = testDatabase();
    const failed = await servicesFor(database, { result: 'invalid' });
    const owner = await createReadyProject(failed, 'retry-theme@example.com');
    const created = await failed.customThemes.createOrder({ userId: owner.user.id, projectId: owner.project.id, idempotencyKey: 'retry-one' });
    const failure = await failed.customThemes.confirmDevelopmentPayment({ userId: owner.user.id, projectId: owner.project.id, orderId: created.order.id, idempotencyKey: 'payment-retry' });
    expect(failure.order.payment_status).toBe('paid'); expect(failure.order.generation_status).toBe('validation_failed');
    await failed.close();
    const seen = []; const resumed = await servicesFor(database, { seen });
    const ready = await resumed.customThemes.retryGeneration({ userId: owner.user.id, projectId: owner.project.id, orderId: created.order.id });
    expect(ready.order.generation_status).toBe('ready'); expect(seen).toHaveLength(1);
    const outsider = await resumed.auth.register({ email: 'outside-theme@example.com', password, fullName: 'Outside', organizationName: 'Outside', ipAddress: '127.0.0.2' });
    await expect(resumed.customThemes.readArtifact({ userId: outsider.user.id, projectId: owner.project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    expect(await resumed.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_payment_events WHERE order_id = $1', [created.order.id])).toMatchObject({ count: 1 });
    await resumed.close();
  });

  it('isolates failed workspaces by order and execution attempt while preserving pinned inputs and payment ownership', async () => {
    const seen = [];
    let invocation = 0;
    const generator = (input) => {
      invocation += 1;
      const workspace = path.join(root, 'output', input.generationId);
      const observation = { input: JSON.parse(JSON.stringify(input)), workspace, preexisting: fs.existsSync(workspace) };
      seen.push(observation);
      generatedWorkspaces.push(workspace);
      if (invocation === 1) {
        fs.mkdirSync(workspace, { recursive: true });
        fs.writeFileSync(path.join(workspace, 'failed-attempt-marker.txt'), 'failed attempt');
        return { status: 'generated_for_review', next_step: 'Package validation failed.', read_only_theme_package: { validation: { valid: false, errors: ['Fixture validation failure after workspace creation.'], warnings: [] } } };
      }
      return fakeGenerator()(input);
    };
    const services = await servicesFor(testDatabase(), { generator });
    const firstProject = await createReadyProject(services, 'workspace-first@example.com');
    const firstOrder = await services.customThemes.createOrder({ userId: firstProject.user.id, projectId: firstProject.project.id, idempotencyKey: 'workspace-first' });
    const failed = await services.customThemes.confirmDevelopmentPayment({ userId: firstProject.user.id, projectId: firstProject.project.id, orderId: firstOrder.order.id, idempotencyKey: 'workspace-first-payment' });
    expect(failed.order.generation_status).toBe('validation_failed');

    const secondProject = await createReadyProject(services, 'workspace-second@example.com');
    const secondOrder = await services.customThemes.createOrder({ userId: secondProject.user.id, projectId: secondProject.project.id, idempotencyKey: 'workspace-second' });
    const secondReady = await services.customThemes.confirmDevelopmentPayment({ userId: secondProject.user.id, projectId: secondProject.project.id, orderId: secondOrder.order.id, idempotencyKey: 'workspace-second-payment' });
    expect(secondReady.order.generation_status).toBe('ready');

    const retried = await services.customThemes.retryGeneration({ userId: firstProject.user.id, projectId: firstProject.project.id, orderId: firstOrder.order.id });
    expect(retried.order.generation_status).toBe('ready');
    expect(seen.map((entry) => entry.preexisting)).toEqual([false, false, false]);
    expect(new Set(seen.map((entry) => entry.input.generationId)).size).toBe(3);
    expect(seen[0].input.generationId).toMatch(/-attempt-1$/);
    expect(seen[2].input.generationId).toMatch(/-attempt-2$/);
    expect(seen[2].input.creativeBrief).toEqual(seen[0].input.creativeBrief);
    expect(seen[2].input.resourcePlan).toEqual(seen[0].input.resourcePlan);
    expect(seen[2].input.approvedPresetRevision).toEqual(seen[0].input.approvedPresetRevision);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_orders WHERE project_id = $1', [firstProject.project.id])).toMatchObject({ count: 1 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_payment_events WHERE order_id = $1', [firstOrder.order.id])).toMatchObject({ count: 1 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs WHERE order_id = $1', [firstOrder.order.id])).toMatchObject({ count: 2 });
    await services.close();
  });

  it('verifies finalized artifact bytes at download time and fails closed for tampering, truncation, loss, or missing trust metadata', async () => {
    const services = await servicesFor(testDatabase());
    const { user, project } = await createReadyProject(services, 'artifact-integrity@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'artifact-integrity' });
    const ready = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id });
    expect(ready.order.generation_status).toBe('ready');
    const finalized = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(finalized.validation_result.artifact_integrity).toMatchObject({ version: 1, order_id: created.order.id, generation_id: expect.stringMatching(/-attempt-1$/), artifacts: { theme_zip: { size_bytes: expect.any(Number), sha256: expect.stringMatching(/^[a-f0-9]{64}$/), durable_reference: { reference_version: 'calinium-durable-object-reference-v1', immutable: true } } } });
    const trusted = await services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' });
    expect(trusted.buffer.length).toBeGreaterThan(100);
    const otherProject = (await services.projects.createProject({ userId: user.id, input: { name: 'Other project', business_name: 'Other project', country: 'GB' } })).project;
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: otherProject.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'custom_theme_order_not_found', status: 404 });
    const original = Buffer.from(trusted.buffer);

    fs.appendFileSync(trusted.file, 'tampered');
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'theme_artifact_integrity_failed', status: 409 });
    fs.writeFileSync(trusted.file, original);
    fs.truncateSync(trusted.file, 3);
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'theme_artifact_integrity_failed', status: 409 });
    fs.writeFileSync(trusted.file, original);
    fs.rmSync(trusted.file);
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'theme_artifact_integrity_failed', status: 409 });
    fs.writeFileSync(trusted.file, original);

    const stored = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    await services.store.updateCustomThemeOrder(stored.id, project.id, project.organization_id, { ...stored, validation_result: { valid: true, errors: [], warnings: [] }, updated_at: new Date().toISOString() });
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'theme_artifact_integrity_failed', status: 409 });
    await services.close();
  });

  it('fails closed at download time when a finalized ZIP contains a private dashboard resource reference', async () => {
    const services = await servicesFor(testDatabase(), { privateReference: true });
    const { user, project } = await createReadyProject(services, 'private-package-reference@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'private-package-reference' });
    const ready = await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id });
    expect(ready.order.generation_status).toBe('ready');
    const pinnedSnapshot = (await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id)).snapshot_checksum;
    await expect(services.customThemes.readArtifact({ userId: user.id, projectId: project.id, orderId: created.order.id, artifact: 'theme-zip' })).rejects.toMatchObject({ code: 'theme_artifact_integrity_failed', status: 409 });
    const rejected = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(rejected).toMatchObject({ payment_status: 'paid', generation_status: 'validation_failed', snapshot_checksum: pinnedSnapshot });
    expect(rejected.validation_result).toMatchObject({ valid: false, operation_failure: { stage: 'artifact_delivery', code: 'theme_artifact_integrity_failed' } });
    expect(rejected.artifacts.theme_zip).toBeTruthy();
    const run = await services.store.findLatestCustomThemeGenerationRun(created.order.id);
    expect(run).toMatchObject({ attempt: 1, generation_status: 'validation_failed' });
    const session = await services.store.findCreativeDirectorForProject(project.id);
    expect(session).toMatchObject({ stage: 'offer', generation_state: { status: 'validation_failed', order_id: created.order.id } });
    await services.close();
  });

  it('keeps pending, declined, and cancelled purchases out of generation until the provider confirms ACTIVE', async () => {
    const provider = controlledPaymentProvider({ status: 'PENDING' });
    const services = await servicesFor(testDatabase(), { paymentProvider: provider });
    const { user, project } = await createReadyProject(services, 'provider-status@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'pending-provider-status' });
    const pending = await services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: created.order.id });
    expect(pending.order.payment_status).toBe('pending');
    expect((await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id)).snapshot).toBeNull();
    provider.state.status = 'DECLINED';
    const declined = await services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: created.order.id });
    expect(declined.order.payment_status).toBe('declined');
    await expect(services.customThemes.retryGeneration({ userId: user.id, projectId: project.id, orderId: created.order.id })).rejects.toMatchObject({ code: 'custom_theme_payment_required' });
    provider.state.status = 'CANCELLED';
    const cancelledProject = await createReadyProject(services, 'provider-cancelled@example.com');
    const cancelledOrder = await services.customThemes.createOrder({ userId: cancelledProject.user.id, projectId: cancelledProject.project.id, idempotencyKey: 'cancelled-provider-status' });
    const cancelled = await services.customThemes.verifyPayment({ userId: cancelledProject.user.id, projectId: cancelledProject.project.id, orderId: cancelledOrder.order.id });
    expect(cancelled.order.payment_status).toBe('cancelled');
    await services.close();
  });

  it('rejects forged provider totals, preserves the pending order, and prevents a snapshot or package', async () => {
    const seen = []; const provider = controlledPaymentProvider({ status: 'ACTIVE', amountOffset: 1 });
    const services = await servicesFor(testDatabase(), { paymentProvider: provider, seen });
    const { user, project } = await createReadyProject(services, 'mismatched-total@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'mismatched-total' });
    await expect(services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: created.order.id })).rejects.toMatchObject({ code: 'payment_provider_invalid' });
    const stored = await services.store.findCustomThemeOrderForProject(created.order.id, project.id, project.organization_id);
    expect(stored.payment_status).toBe('pending'); expect(stored.snapshot).toBeNull(); expect(seen).toHaveLength(0);
    await services.close();
  });

  it('keeps one durable order, payment event, snapshot, and generation run across repeat verification', async () => {
    const seen = []; const provider = controlledPaymentProvider({ status: 'ACTIVE' });
    const services = await servicesFor(testDatabase(), { paymentProvider: provider, seen });
    const { user, project } = await createReadyProject(services, 'idempotent-verify@example.com');
    const first = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'same-intent-a' });
    const second = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'same-intent-b' });
    expect(second.order.id).toBe(first.order.id); expect(provider.state.createCalls).toBe(1);
    await Promise.all([
      services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: first.order.id, idempotencyKey: 'provider-return-a' }),
      services.customThemes.verifyPayment({ userId: user.id, projectId: project.id, orderId: first.order.id, idempotencyKey: 'provider-return-b' })
    ]);
    expect(seen).toHaveLength(1);
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_payment_events WHERE order_id = $1', [first.order.id])).toMatchObject({ count: 1 });
    expect(await services.store.driver.get('SELECT COUNT(*) AS count FROM custom_theme_generation_runs WHERE order_id = $1', [first.order.id])).toMatchObject({ count: 1 });
    await services.close();
  });

  it('records an audited refund without removing an already generated package', async () => {
    const services = await servicesFor(testDatabase());
    const { user, project } = await createReadyProject(services, 'refunded-theme@example.com');
    const created = await services.customThemes.createOrder({ userId: user.id, projectId: project.id, idempotencyKey: 'refund-record' });
    await services.customThemes.confirmDevelopmentPayment({ userId: user.id, projectId: project.id, orderId: created.order.id });
    const refunded = await services.customThemes.recordVerifiedRefund({ projectId: project.id, orderId: created.order.id, providerRefundReference: 'support-refund-001', reason: 'Verified test refund.' });
    expect(refunded.recorded).toBe(true); expect(refunded.order.payment_status).toBe('refunded'); expect(refunded.order.artifacts.theme_zip).toBe(true);
    const repeat = await services.customThemes.recordVerifiedRefund({ projectId: project.id, orderId: created.order.id, providerRefundReference: 'support-refund-001' });
    expect(repeat.recorded).toBe(false);
    await services.close();
  });
});
