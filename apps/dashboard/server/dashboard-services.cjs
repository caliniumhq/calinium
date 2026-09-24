'use strict';

const path = require('path');
const fs = require('fs/promises');
const { createDashboardStore } = require('./storage/create-store.cjs');
const { createAuthProviderRegistry } = require('./auth/auth-provider-registry.cjs');
const { AuthService } = require('./auth/auth-service.cjs');
const { ProjectService } = require('./services/project-service.cjs');
const { InterviewPersistenceService } = require('./services/interview-persistence-service.cjs');
const { CreativeDirectorService } = require('./services/creative-director-service.cjs');
const { InterviewEngineAdapter } = require('./interview-engine-adapter.cjs');
const { CreativeDirectorAdapter } = require('./creative-director-adapter.cjs');
const { AssetService } = require('./assets/asset-service.cjs');
const { createAssetStorageProvider, createAuthoritativeStorageProvider } = require('./assets/create-storage-provider.cjs');
const { AuthoritativeObjectService } = require('./assets/authoritative-object-service.cjs');
const { DurableStorageProviderAcceptance, capabilityFromAcceptance } = require('./assets/durable-storage-provider-acceptance.cjs');
const { DashboardError } = require('./lib/errors.cjs');
const { ShopifyConnectionService } = require('./shopify/shopify-connection-service.cjs');
const { ShopifyEmbeddedAuthService } = require('./auth/shopify-embedded-auth-service.cjs');
const { ShopifyAdminApiAdapter } = require('./shopify/admin-api-adapter.cjs');
const { dashboardSessionSecret } = require('./shopify/runtime-configuration.cjs');
const { CustomThemeService } = require('./custom-themes/custom-theme-service.cjs');
const { AutomaticMerchantIntakeService } = require('./services/automatic-merchant-intake-service.cjs');
const { RecommendedResourceSetService } = require('./services/recommended-resource-set-service.cjs');
const { RecommendationDesignService } = require('./services/recommendation-design-service.cjs');
const { LivePreviewService } = require('./services/live-preview-service.cjs');
const { GenerationWorkerRunner } = require('./custom-themes/generation-worker-runner.cjs');
const { MerchantGenerationFlowService } = require('./services/merchant-generation-flow-service.cjs');
const { MerchantFlowJobRunner } = require('./services/merchant-flow-job-runner.cjs');
const { MerchantFlowOperatorAuthorizationService } = require('./services/merchant-flow-operator-authorization-service.cjs');
const { MerchantFlowOperatorEvidenceResolver } = require('./services/merchant-flow-operator-evidence-resolver.cjs');
const { AnalysisFirstMerchantExperienceService } = require('./services/analysis-first-merchant-experience-service.cjs');
const { createMerchantFlowPreviewBindingResolver } = require('./services/merchant-flow-preview-binding-resolver.cjs');
const { createMerchantFlowRenderTargetSuccessionResolver } = require('./services/merchant-flow-render-target-succession-resolver.cjs');
const {
  readControlledBetaRuntimeConfiguration,
  canonicalThemeId
} = require('./services/merchant-flow-controlled-runtime-configuration.cjs');
const { controlledBetaReadiness } = require('./services/merchant-flow-controlled-readiness.cjs');
const { createControlledBetaDeepAttestation } = require('./services/merchant-flow-controlled-deep-attestation.cjs');
const { createControlledBetaReadinessCoordinator } = require('./services/merchant-flow-controlled-readiness-snapshot.cjs');
const { createControlledMerchantFlowRuntime } = require('./services/merchant-flow-controlled-runtime.cjs');
const { createMerchantFlowProductionQaAdapter } = require('../../../ai/design-evaluation/merchant-flow-production-qa-adapter');
const { loadLiveDesignConfiguration } = require('../../../ai/design-evaluation/live-configuration');
const { createShopifyCliRuntime } = require('../../../ai/storefront-render/shopify-cli-runtime');
const {
  createShopifyStorefrontPasswordBindingFactory
} = require('../../../ai/storefront-render/shopify-storefront-password-binding');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

async function resolvePaidMerchantArtifactEvidence({ root, store, flow, artifact, authoritativeObjectService = null }) {
  const orderId = flow?.paid_identity?.order_id;
  const order = orderId ? await store.findCustomThemeOrderForProject(orderId, flow.project_id, flow.organization_id) : null;
  if (!order || order.generation_status !== 'ready' || order.snapshot_id !== flow.paid_identity.snapshot_id
    || order.snapshot_checksum !== flow.paid_identity.snapshot_checksum) {
    throw Object.assign(new Error('The authoritative paid artifact record is unavailable or stale.'), { code: 'controlled_beta_paid_artifact_unavailable' });
  }
  const integrity = order.validation_result?.artifact_integrity;
  if (!integrity || integrity.order_id !== order.id || integrity.generation_id !== artifact?.generation_id) {
    throw Object.assign(new Error('The authoritative paid artifact integrity binding is unavailable.'), { code: 'controlled_beta_paid_artifact_integrity_invalid' });
  }
  if (authoritativeObjectService) {
    const scope = {
      organization_id: flow.organization_id,
      project_id: flow.project_id,
      connection_id: flow.store_context?.connection_id || null,
      canonical_shop: flow.store_context?.shop || null
    };
    for (const key of ['theme_zip', 'package_manifest']) {
      const entry = integrity.artifacts?.[key];
      if (!entry?.durable_reference) {
        if (authoritativeObjectService.environment === 'production') throw Object.assign(new Error('The paid artifact has no durable production storage reference.'), { code: 'controlled_beta_paid_artifact_durability_missing' });
        continue;
      }
      await authoritativeObjectService.materialize({ scope, reference: entry.durable_reference, target: path.resolve(root, 'output', entry.reference) });
    }
  }
  const pinned = [...(order.snapshot?.approved_shopify_resources || [])].sort((left, right) => String(left.resource_id).localeCompare(String(right.resource_id)));
  const routeEntities = {};
  for (const kind of ['collection', 'product']) {
    const binding = pinned.find((candidate) => candidate.resource_type === kind && candidate.runtime_value);
    if (!binding) throw Object.assign(new Error(`The paid artifact has no approved ${kind} route binding.`), { code: 'controlled_beta_route_binding_unavailable' });
    const resource = await store.findShopifyResource(binding.resource_id, flow.store_context.connection_id);
    const approval = await store.findShopifyResourceApproval(flow.project_id, binding.resource_id);
    if (!resource || !approval || resource.resource_type !== kind || resource.availability_status !== 'available'
      || approval.approval_status !== 'approved' || resource.source_revision !== binding.source_revision
      || approval.source_revision !== binding.source_revision || resource.handle !== binding.runtime_value
      || resource.handle !== String(resource.handle || '').toLowerCase()) {
      throw Object.assign(new Error(`The approved ${kind} route binding is stale.`), { code: 'controlled_beta_route_binding_stale' });
    }
    routeEntities[kind] = {
      kind,
      resource_id: resource.id,
      remote_gid: resource.remote_gid,
      handle: resource.handle,
      source_revision: resource.source_revision,
      resolution_source: 'approved_resource_snapshot'
    };
  }
  return { artifact_integrity: clone(integrity), route_entities: routeEntities };
}

async function verifyConfiguredControlledTargets({ configuration, store, shopify, expectedMainThemeId, signal = null }) {
  const expectedMain = canonicalThemeId(expectedMainThemeId);
  if (!expectedMain) return false;
  for (const target of configuration.render_targets) {
    if (signal?.aborted) throw Object.assign(new Error('Controlled target verification was cancelled.'), { code: 'controlled_beta_deep_attestation_aborted' });
    const connection = await store.findShopifyConnectionByDomain(target.shop_domain);
    if (!connection || connection.connection_status !== 'ready' || connection.credential_status !== 'active') return false;
    const page = await shopify.adapter.listResourcePage({
      shopDomain: target.shop_domain,
      accessToken: await shopify.connectionAccess(connection),
      resourceType: 'theme',
      first: 100,
      signal
    });
    const theme = (page?.nodes || []).find((candidate) => canonicalThemeId(candidate.id) === target.theme_id);
    const main = (page?.nodes || []).find((candidate) => String(candidate.role || '').toLowerCase() === 'main');
    if (!theme || String(theme.role || '').toLowerCase() !== target.expected_theme_role
      || String(theme.role || '').toLowerCase() !== 'development'
      || canonicalThemeId(main?.id) !== expectedMain
      || target.theme_id === expectedMain
      || theme.processing === true || theme.processingFailed === true || theme.processing_failed === true) return false;
  }
  return configuration.render_targets.length > 0;
}

async function createDashboardServices({
  root = path.resolve(__dirname, '../../..'),
  env = process.env,
  clock,
  shopifyAdapter,
  shopifyEnvelope,
  customThemeGenerator,
  paymentProvider,
  merchantFlowRuntime = null,
  controlledBetaConfiguration = null,
  controlledBetaQaAdapter = null,
  controlledBetaReadinessProbes = null,
  controlledBetaDeepAttestation = null,
  controlledBetaReadinessCoordinatorOptions = null,
  assetStorageProvider = null,
  authoritativeStorageProvider = null,
  objectStorageClient = null,
  durableStorageProviderAcceptance = null
} = {}) {
  const store = await createDashboardStore({ root, env, clock });
  const providers = createAuthProviderRegistry({ store });
  const auth = new AuthService({ store, providers, clock, sessionSecret: dashboardSessionSecret(env, { required: env.NODE_ENV === 'production' }) });
  const projects = new ProjectService({ store, clock });
  const assetProvider = createAssetStorageProvider({ root, env, provider: assetStorageProvider, objectStorageClient });
  const authoritativeProvider = createAuthoritativeStorageProvider({ root, env, provider: authoritativeStorageProvider, objectStorageClient });
  const authoritativeObjects = new AuthoritativeObjectService({
    root, store, provider: authoritativeProvider,
    environment: String(env.CALINIUM_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase(),
    clock: clock || (() => new Date())
  });
  const environment = String(env.CALINIUM_ENVIRONMENT || (env.NODE_ENV === 'production' ? 'production' : 'development')).toLowerCase();
  const providerAcceptance = environment === 'production'
    ? durableStorageProviderAcceptance || new DurableStorageProviderAcceptance({ provider: authoritativeProvider, clock: clock || (() => new Date()) })
    : null;
  await fs.mkdir(path.resolve(root, 'output'), { recursive: true });
  const assets = new AssetService({ store, projectService: projects, provider: assetProvider, clock });
  const shopify = new ShopifyConnectionService({ store, projectService: projects, adapter: shopifyAdapter || new ShopifyAdminApiAdapter({ env }), envelope: shopifyEnvelope, authoritativeObjectService: authoritativeObjects, env, clock });
  const merchantIntake = new AutomaticMerchantIntakeService({ store, projectService: projects, shopifyService: shopify, env, clock });
  const recommendedResources = new RecommendedResourceSetService({ store, projectService: projects, clock });
  const creativeDirection = new RecommendationDesignService({ root, store, projectService: projects, recommendedResourceSetService: recommendedResources, clock });
  const livePreview = new LivePreviewService({ store, projectService: projects, recommendedResourceSetService: recommendedResources, recommendationDesignService: creativeDirection, clock });
  const embeddedAuth = new ShopifyEmbeddedAuthService({ store, auth, shopifyService: shopify, adapter: shopify.adapter, env, clock });
  const interview = new InterviewPersistenceService({ store, projectService: projects, assetService: assets, adapter: new InterviewEngineAdapter({ root }), clock });
  const creativeDirectorAdapter = new CreativeDirectorAdapter({ root });
  const generationWorker = customThemeGenerator ? null : new GenerationWorkerRunner({ root });
  const customThemes = new CustomThemeService({ root, store, projectService: projects, shopifyService: shopify, recommendedResourceSetService: recommendedResources, recommendationDesignService: creativeDirection, generator: customThemeGenerator || ((input) => generationWorker.run(input)), paymentProvider, authoritativeObjectService: authoritativeObjects, env, clock });
  const merchantFlowJobs = new MerchantFlowJobRunner({ store, clock });
  const merchantFlowBetaEnabled = env.CALINIUM_MERCHANT_FLOW_BETA_ENABLED === 'true';
  const analysisFirstMerchantExperienceEnabled = env.CALINIUM_ANALYSIS_FIRST_MERCHANT_EXPERIENCE_ENABLED === 'true';
  const betaConfiguration = controlledBetaConfiguration || readControlledBetaRuntimeConfiguration(env, { strict: merchantFlowBetaEnabled });
  const previewBindingResolver = createMerchantFlowPreviewBindingResolver({
    root,
    mainThemeId: env.CALINIUM_SHOPIFY_MAIN_THEME_ID || null,
    runtimeConfigurationRevision: betaConfiguration.configuration_revision || null,
    renderTargetConfigurationRevision: betaConfiguration.render_target_configuration_revision || null,
    sourceRevision: betaConfiguration.deployment_source_revision || null,
    renderTargets: betaConfiguration.render_targets
  });
  const renderTargetSuccessionResolver = merchantFlowBetaEnabled ? createMerchantFlowRenderTargetSuccessionResolver({
    root,
    configuration: betaConfiguration,
    shopifyService: shopify,
    mainThemeId: env.CALINIUM_SHOPIFY_MAIN_THEME_ID || null,
    sourceRevision: betaConfiguration.deployment_source_revision || null,
    clock: clock || (() => new Date())
  }) : null;
  const shopifyCliRuntime = merchantFlowBetaEnabled ? createShopifyCliRuntime({ root, env }) : null;
  let storefrontPasswordBindingFactory = null;
  let qaAdapter = controlledBetaQaAdapter;
  if (merchantFlowBetaEnabled && !merchantFlowRuntime) {
    storefrontPasswordBindingFactory = createShopifyStorefrontPasswordBindingFactory({
      env,
      requirements: betaConfiguration.shopify_runtime.storefront_password
    });
    const liveConfiguration = loadLiveDesignConfiguration(root, { env, requireCredentials: false }).configuration;
    qaAdapter ||= createMerchantFlowProductionQaAdapter({
      root,
      resolveArtifactEvidence: ({ flow, artifact }) => resolvePaidMerchantArtifactEvidence({ root, store, flow, artifact, authoritativeObjectService: authoritativeObjects }),
      authoritativeObjectService: authoritativeObjects,
      runtimeConfigurationRevision: betaConfiguration.configuration_revision,
      renderTargetConfigurationRevision: betaConfiguration.render_target_configuration_revision,
      d27Required: betaConfiguration.d2_7.required,
      d27ProviderRevision: betaConfiguration.d2_7.provider_revision,
      d27ModelId: betaConfiguration.d2_7.model_id,
      deploymentSourceRevision: betaConfiguration.deployment_source_revision,
      mainThemeId: env.CALINIUM_SHOPIFY_MAIN_THEME_ID,
      liveConfiguration,
      liveEnvironment: env,
      captureOptions: { shopifyCliRuntime, storefrontPasswordBindingFactory }
    });
    merchantFlowRuntime = createControlledMerchantFlowRuntime({
      configuration: betaConfiguration,
      shopifyService: shopify,
      renderArtifact: qaAdapter.renderArtifact,
      evaluateD1: qaAdapter.evaluateD1,
      evaluateD27: betaConfiguration.d2_7.required ? qaAdapter.evaluateD27 : null,
      resumeD27: betaConfiguration.d2_7.required ? qaAdapter.resumeD27 : null,
      validateTerminalD27Recovery: betaConfiguration.d2_7.required ? qaAdapter.validateTerminalD27Recovery : null,
      resolveLegacyD27Lineage: betaConfiguration.d2_7.required ? qaAdapter.resolveLegacyD27Lineage : null,
      recoverLegacyD27Failure: betaConfiguration.d2_7.required ? qaAdapter.recoverLegacyD27Failure : null,
      clock: clock || (() => new Date())
    });
  }
  const operatorAuthorization = merchantFlowBetaEnabled
    ? new MerchantFlowOperatorAuthorizationService({ store, configuration: betaConfiguration, root })
    : null;
  const operatorEvidenceResolver = merchantFlowBetaEnabled
    ? new MerchantFlowOperatorEvidenceResolver({
      root,
      sourceRevision: betaConfiguration.deployment_source_revision,
      runtimeRevision: betaConfiguration.configuration_revision,
      authoritativeObjectService: authoritativeObjects,
      clock: clock || (() => new Date())
    })
    : null;
  let workersRecovered = false;
  let workerRecoveryPromise = null;
  let merchantFlow = null;
  const defaultBetaReadinessProbes = {
    source_attestation: () => ({ ready: true, revision: env.CALINIUM_BUILD_SOURCE_REVISION }),
    database: async () => ({ ready: Number((await store.driver.get('SELECT 1 AS healthy'))?.healthy) === 1 }),
    artifact_storage: async () => authoritativeObjects.healthCheck(),
    durable_job_storage: async () => { await store.driver.get('SELECT id FROM merchant_flow_jobs LIMIT 1'); return { ready: true }; },
    generation_worker: () => ({ ready: typeof customThemes.processQueuedOrder === 'function' }),
    render_qa_worker: () => ({ ready: typeof merchantFlowRuntime?.runRenderQa === 'function' && merchantFlowRuntime?.runtime_kind === 'production_controlled_shopify_render_qa' }),
    controlled_shopify_target: async ({ signal } = {}) => ({ ready: await verifyConfiguredControlledTargets({ configuration: betaConfiguration, store, shopify, expectedMainThemeId: env.CALINIUM_SHOPIFY_MAIN_THEME_ID, signal }) }),
    d1: () => ({ ready: typeof qaAdapter?.evaluateD1 === 'function' || Boolean(merchantFlowRuntime?.runtime_kind) }),
    d2_7_provider: () => ({ ready: !betaConfiguration.d2_7.required || typeof qaAdapter?.evaluateD27 === 'function' }),
    operator_authorization: async () => ({
      ready: Boolean(operatorAuthorization)
        && Boolean(operatorEvidenceResolver?.verify)
        && await operatorAuthorization.hasEligibleOperator()
    }),
    telemetry: async () => { await store.driver.get('SELECT id FROM merchant_flow_operational_events LIMIT 1'); return { ready: true }; }
  };
  const readinessProbes = { ...defaultBetaReadinessProbes, ...(controlledBetaReadinessProbes || {}) };
  const runDeepAttestation = merchantFlowBetaEnabled
    ? controlledBetaDeepAttestation || createControlledBetaDeepAttestation({
      root,
      env,
      clock: clock || (() => new Date()),
      probes: readinessProbes,
      cliWorkerTimeoutMs: controlledBetaReadinessCoordinatorOptions?.cliWorkerTimeoutMs
    })
    : null;
  // Both protected readiness components are supplied by the same worker-thread
  // deep result: shopify_cli_runtime and shopify_cli_runtime_state.
  const recoverWorkersOnce = async (_readiness, { signal = null } = {}) => {
    if (workersRecovered) return true;
    if (signal?.aborted) return false;
    workerRecoveryPromise ||= merchantFlowJobs.recoverAll(100, { signal }).then(() => {
      if (signal?.aborted) return false;
      workersRecovered = true;
      return true;
    }).finally(() => { workerRecoveryPromise = null; });
    return workerRecoveryPromise;
  };
  const readinessCoordinator = merchantFlowBetaEnabled ? createControlledBetaReadinessCoordinator({
    env,
    deepAttestation: runDeepAttestation,
    clock: clock || (() => new Date()),
    beforeReady: recoverWorkersOnce,
    ...(controlledBetaReadinessCoordinatorOptions || {})
  }) : null;
  const inspectControlledBetaReadiness = () => readinessCoordinator?.current() || controlledBetaReadiness({ env, probes: readinessProbes, clock: clock || (() => new Date()) });
  const checkControlledBetaReadiness = inspectControlledBetaReadiness;
  merchantFlow = new MerchantGenerationFlowService({
    root,
    store,
    projectService: projects,
    runtime: merchantFlowRuntime,
    controlledRuntimeConfiguration: betaConfiguration,
    operatorAuthorization,
    operatorEvidenceResolver,
    previewBindingResolver,
    renderTargetSuccessionResolver,
    cancellationProjector: ({ project, flow }) => customThemes.projectCancelledMerchantFlow({ project, flow }),
    betaReadiness: checkControlledBetaReadiness,
    clock
  });
  if (merchantFlowBetaEnabled) {
    if (typeof merchantFlowRuntime?.runRenderQa !== 'function') throw new Error('Controlled beta activation requires a configured non-live merchant-flow render/QA runtime.');
    merchantFlowJobs.register('generation', (job, control) => customThemes.processQueuedOrder(job, control));
    merchantFlowJobs.register('render_qa', (job, control) => merchantFlow.executeRenderQaJob(job, control));
    merchantFlow.setJobRunner(merchantFlowJobs);
    customThemes.setMerchantFlowJobRunner(merchantFlowJobs);
  }
  customThemes.setMerchantFlowService(merchantFlow);
  const creativeDirector = new CreativeDirectorService({ root, store, projectService: projects, assetService: assets, shopifyService: shopify, merchantIntakeService: merchantIntake, recommendedResourceSetService: recommendedResources, recommendationDesignService: creativeDirection, livePreviewService: livePreview, adapter: creativeDirectorAdapter, customThemeService: customThemes, merchantFlowService: merchantFlow, previewBindingResolver, merchantFlowBetaEnabled, analysisFirstMerchantExperienceEnabled, sourceRevision: env.CALINIUM_BUILD_SOURCE_REVISION, clock });
  const analysisFirstExperience = new AnalysisFirstMerchantExperienceService({
    root,
    store,
    projectService: projects,
    merchantFlowService: merchantFlow,
    previewBindingResolver,
    enabled: analysisFirstMerchantExperienceEnabled,
    bindingSecret: dashboardSessionSecret(env, { required: analysisFirstMerchantExperienceEnabled }),
    clock
  });
  async function baseReadiness() {
    const probe = await store.driver.get('SELECT 1 AS healthy');
    if (!probe || Number(probe.healthy) !== 1) throw new Error('Dashboard persistence is unavailable.');
    const [assetStorage, artifactResult] = await Promise.all([
      assetProvider.healthCheck(),
      environment === 'production' ? providerAcceptance.run() : authoritativeObjects.healthCheck()
    ]);
    const artifactAcceptance = environment === 'production' ? capabilityFromAcceptance(artifactResult) : null;
    return {
      persistence: 'ready',
      asset_storage: 'ready',
      asset_storage_durability: assetStorage.durable ? 'durable' : 'local',
      artifact_storage: 'ready',
      artifact_storage_durability: authoritativeProvider.durable ? 'durable' : 'local',
      artifact_storage_acceptance: artifactAcceptance
    };
  }
  return {
    env, store, providers, auth, projects, assets, authoritativeObjects, providerAcceptance, shopify, merchantIntake, recommendedResources, creativeDirection, livePreview, embeddedAuth, interview, creativeDirector, customThemes, merchantFlow, merchantFlowJobs, merchantFlowBetaEnabled, previewBindingResolver, analysisFirstExperience, analysisFirstMerchantExperienceEnabled,
    betaConfiguration,
    baseReadiness,
    controlledBetaReadiness: inspectControlledBetaReadiness,
    requestControlledBetaReadinessRefresh: (input) => readinessCoordinator?.requestRefresh(input) || { status: 'disabled', operation_id: null },
    startControlledReadiness: () => readinessCoordinator?.start() || { status: 'disabled', operation_id: null },
    waitForControlledReadinessRefresh: () => readinessCoordinator?.waitForCurrentRefresh() || Promise.resolve(null),
    async readiness() {
      if (!merchantFlowBetaEnabled) return { ...(await baseReadiness()), controlled_beta: 'disabled' };
      const beta = await checkControlledBetaReadiness();
      if (beta.status !== 'READY') {
        throw new DashboardError('dashboard_not_ready', 'The dashboard is not ready to accept controlled traffic.', 503, {
          status: 'NOT_READY',
          snapshot_status: beta.snapshot_status || 'MISSING',
          snapshot_revision: beta.snapshot_revision || null,
          reason_codes: beta.reason_codes || ['controlled_beta_readiness_snapshot_missing']
        });
      }
      return {
        persistence: beta.components?.database?.ready === true ? 'ready' : 'not_ready',
        asset_storage: beta.components?.artifact_storage?.ready === true ? 'ready' : 'not_ready',
        artifact_storage: beta.components?.artifact_storage?.ready === true ? 'ready' : 'not_ready',
        controlled_beta: 'ready',
        snapshot_revision: beta.snapshot_revision,
        checked_at: beta.checked_at,
        valid_until: beta.valid_until
      };
    },
    async close() { await readinessCoordinator?.close(); await merchantIntake.drain(); await merchantFlowJobs.drain(); await store.driver.close(); }
  };
}

module.exports = { createDashboardServices, resolvePaidMerchantArtifactEvidence, verifyConfiguredControlledTargets };
