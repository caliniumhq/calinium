'use strict';

const crypto = require('crypto');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { createSchemaValidator } = require('../../../../ai/compiler/schema-validator');
const { evaluateGenerationEligibility, checksum, dashboardReferenceId, allowedTypesForField, shopifyRuntimeValue } = require('./eligibility-evaluator.cjs');
const { activePrice } = require('./price-catalog.cjs');
const { DevelopmentPaymentProvider } = require('./development-payment-provider.cjs');
const { ShopifyOneTimeBillingProvider } = require('./shopify-one-time-billing-provider.cjs');
const { StagingValidationPaymentProvider } = require('./staging-validation-payment-provider.cjs');
const { shopifyRuntimeConfiguration } = require('../shopify/runtime-configuration.cjs');
const { normalizeShopDomain } = require('../services/merchant-flow-controlled-runtime-configuration.cjs');
const { ApprovedBlockPlanTransportError, createApprovedBlockPlanTransport, provenance } = require('../../../../pipeline/resolve-approved-block-plan-transport');
const { storeStrategyForPreset } = require('../services/preset-service.cjs');
const { effectiveResourcePlan } = require('../../../../pipeline/resource-confirmation-eligibility');
const { contentPlanFlowEligibility, eligibilityIntegrity: contentPlanEligibilityIntegrity, effectiveStoreStrategy: resourceResolvedStoreStrategy, readyTargetCompositionIdentities } = require('../../../../pipeline/content-plan-eligibility');
const { assertApprovedPresetRevision, presetProvenance } = require('../../../../ai/presets/apply-approved-preset');
const { containsPrivateRuntimeReference } = require('../../../../ai/theme-generator/validate-read-only-theme-package');
const { withoutShopifyStorefrontPassword } = require('../../../../ai/storefront-render/shopify-storefront-password-binding');
const {
  createStoreIntelligenceContract,
  createMerchantIntent,
  selectArchitecture,
  assertFrozenArchitectureSelection,
  architectureProvenance
} = require('../../../../ai/architecture');
const { jobIdentity } = require('../../../../ai/merchant-flow');

const ARTIFACTS = Object.freeze({
  'theme-zip': { key: 'theme_zip', contentType: 'application/zip', filename: 'calinium-storefront.zip' },
  'theme-specification': { key: 'theme_specification', contentType: 'application/json; charset=utf-8', filename: 'theme-specification.json' },
  'validation-report': { key: 'validation_report', contentType: 'application/json; charset=utf-8', filename: 'theme-package-validation.json' },
  'package-manifest': { key: 'package_manifest', contentType: 'application/json; charset=utf-8', filename: 'read-only-theme-package.json' },
  'generation-metadata': { key: 'generation_metadata', contentType: 'application/json; charset=utf-8', filename: 'generation-metadata.json' }
});
const EMPTY_ARTIFACTS = Object.freeze({ theme_zip: null, theme_specification: null, validation_report: null, package_manifest: null, generation_metadata: null });
const TERMINAL_PAYMENT_STATES = new Set(['failed', 'refunded', 'cancelled', 'declined', 'expired', 'invalid']);

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function now(clock) { return isoNow(clock); }
function contentPlanSourceRevision(env) {
  const revision = String(env?.CALINIUM_BUILD_SOURCE_REVISION || '').trim().toLowerCase();
  return /^[a-f0-9]{40,64}$/.test(revision) ? revision : 'unattested-local-source';
}
function safeError(error) {
  if (error instanceof DashboardError && error.message) return String(error.message).slice(0, 1000);
  if (error?.validation) return 'The storefront package did not pass validation. Review the validation result and retry when the issue is resolved.';
  return 'Calinium could not prepare the storefront package. Please retry or contact Calinium support.';
}
function safeFailureDetails(error, stage, requestId = null) {
  const details = error instanceof DashboardError ? error.details : null;
  return {
    stage,
    code: String(error?.code || (error?.validation ? 'theme_package_validation_failed' : 'theme_generation_failed')).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'theme_generation_failed',
    message: safeError(error),
    ...(requestId ? { request_id: String(requestId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 120) } : {}),
    ...(details?.reasons ? { reasons: details.reasons.slice(0, 5).map((reason) => ({ field: reason.field || null, message: String(reason.message || '').slice(0, 240) })) } : {})
  };
}
function safeStack(error, root) {
  return String(error?.stack || `${error?.name || 'Error'}: ${error?.message || 'Unknown error'}`)
    .replaceAll(String(root), '<repository>')
    .replace(/(access[_-]?token|client[_-]?secret|authorization)\s*[:=]\s*[^\s,}]+/gi, '$1=<redacted>')
    .slice(0, 12000);
}
function relativeOutputPath(root, target) {
  const output = path.resolve(root, 'output'); const resolved = path.resolve(target); const relative = path.relative(output, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new DashboardError('theme_artifact_invalid', 'The generated storefront artifact is outside the approved workspace.', 500);
  return relative.split(path.sep).join('/');
}
function artifactPath(root, reference) {
  const output = path.resolve(root, 'output'); const resolved = path.resolve(output, reference || ''); const relative = path.relative(output, resolved);
  if (!reference || relative.startsWith('..') || path.isAbsolute(relative)) throw new DashboardError('theme_artifact_invalid', 'The requested storefront artifact is unavailable.', 404);
  return resolved;
}
function artifactDigest(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function finalizeArtifactIntegrity({ root, artifacts, orderId, generationId, at }) {
  const expectedPrefix = `${generationId}/`;
  const finalized = {};
  for (const [artifact, reference] of Object.entries(artifacts)) {
    if (typeof reference !== 'string' || !reference.startsWith(expectedPrefix)) throw new DashboardError('theme_artifact_generation_mismatch', 'The generated storefront artifacts could not be finalized safely.', 500);
    const file = artifactPath(root, reference);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new DashboardError('theme_artifact_finalization_failed', 'The generated storefront artifacts could not be finalized safely.', 500);
    const stat = fs.statSync(file);
    finalized[artifact] = { reference, size_bytes: stat.size, sha256: artifactDigest(file) };
  }
  return { version: 1, order_id: orderId, generation_id: generationId, finalized_at: at, artifacts: finalized };
}
function sourceThemeChanged(root, snapshot) {
  const { runtimeInventory } = require('../../../../scripts/lib/theme-runtime-integrity');
  const { repositoryPaths } = require('../../../../scripts/lib/repository-paths');
  return runtimeInventory(repositoryPaths(root).themeRoot).checksum !== snapshot.source_theme?.checksum;
}
function orderSummary(order, billing = null) {
  if (!order) return null;
  return {
    id: order.id,
    order_type: order.order_type,
    product: { code: order.product_code, name: order.product_name, price_version: order.price_version },
    currency: order.currency,
    amount_cents: order.amount_cents,
    payment_status: order.payment_status,
    generation_status: order.generation_status,
    source_theme: order.source_theme,
    snapshot_id: order.snapshot_id,
    paid_at: order.paid_at,
    generated_at: order.generated_at,
    failure_reason: order.failure_reason,
    failure: order.validation_result?.operation_failure || null,
    billing: billing && {
      provider: billing.provider,
      provider_status: billing.provider_status,
      confirmation_required: billing.confirmation_url_status === 'issued',
      test_mode: Boolean(billing.test_mode),
      verified_at: billing.verified_at,
      failure_reason: billing.failure_reason || null
    },
    validation_result: order.validation_result ? { valid: Boolean(order.validation_result.valid), errors: order.validation_result.errors || [], warnings: order.validation_result.warnings || [] } : null,
    artifacts: Object.fromEntries(Object.entries(order.artifacts || {}).map(([key, value]) => [key, Boolean(value)])),
    created_at: order.created_at,
    updated_at: order.updated_at
  };
}
function isPriceForOrder(price, order) {
  return Boolean(price && order && price.product_code === order.product_code && price.price_version === order.price_version && price.amount_cents === order.amount_cents && price.currency === order.currency);
}
function approvedResourceSetProvenance(revision) {
  if (!revision) return null;
  return {
    revision_id: revision.revision_id,
    candidate_revision_id: revision.candidate_revision_id,
    approval_checksum: revision.approval_checksum
  };
}
function approvedCreativeDirectionProvenance(revision) {
  if (!revision) return null;
  return { revision_id: revision.revision_id, candidate_revision_id: revision.candidate_revision_id, approval_checksum: revision.approval_checksum };
}
function snapshotGenerationContext(generationContext, approvedShopifyResources = [], resourcePlan = null) {
  const approved = new Map((approvedShopifyResources || []).map((resource) => [resource.resource_id, resource.runtime_value]));
  const replace = (value) => {
    if (typeof value !== 'string' || !value.startsWith('dashboard://')) return value;
    const resourceId = value.match(/\/shopify-resources\/([^/?#]+)$/)?.[1] || null;
    const runtimeValue = resourceId ? approved.get(resourceId) : null;
    if (!runtimeValue || runtimeValue.startsWith('dashboard://')) {
      throw new DashboardError('theme_resource_binding_unavailable', 'One approved resource cannot be packaged safely yet. Choose another Shopify resource or omit it before generation.', 409);
    }
    return runtimeValue;
  };
  const next = clone(generationContext || {});
  if (resourcePlan) {
    const fields = new Set((resourcePlan.fields || []).map((field) => field.setting_ref));
    const assets = new Set((resourcePlan.required_assets || []).map((asset) => asset.asset_id));
    next.merchant_references = Object.fromEntries(Object.entries(next.merchant_references || {}).filter(([key]) => fields.has(key)));
    next.shopify_resource_references = Object.fromEntries(Object.entries(next.shopify_resource_references || {}).filter(([key]) => fields.has(key)));
    next.asset_references = Object.fromEntries(Object.entries(next.asset_references || {}).filter(([key]) => assets.has(key)));
  }
  next.merchant_references = Object.fromEntries(Object.entries(next.merchant_references || {}).map(([key, value]) => [key, replace(value)]));
  next.asset_references = Object.fromEntries(Object.entries(next.asset_references || {}).map(([key, value]) => [key, replace(value)]));
  return next;
}
function addEligibilityRequirement(evaluation, { id, label, valid, reason }) {
  const requirement = { id, label, status: valid ? 'eligible' : 'blocked', reason: valid ? null : reason };
  evaluation.requirements = [...(evaluation.requirements || []), requirement];
  if (!valid) {
    const blocker = { id, reason };
    evaluation.eligible = false;
    evaluation.blocked = [...(evaluation.blocked || []), blocker];
    evaluation.reasons = [...(evaluation.reasons || []), blocker];
  }
  return evaluation;
}

class CustomThemeService {
  constructor({ root, store, projectService, shopifyService = null, recommendedResourceSetService = null, recommendationDesignService = null, generator, paymentProvider = null, authoritativeObjectService = null, env = process.env, clock = () => new Date() }) {
    this.root = root; this.store = store; this.projectService = projectService; this.shopifyService = shopifyService; this.recommendedResourceSetService = recommendedResourceSetService; this.recommendationDesignService = recommendationDesignService; this.generator = generator; this.authoritativeObjectService = authoritativeObjectService; this.env = env; this.clock = clock;
    this.paymentProvider = paymentProvider || (env.CALINIUM_PAYMENT_PROVIDER === 'development_simulator'
      ? new DevelopmentPaymentProvider({ env })
      : env.CALINIUM_PAYMENT_PROVIDER === 'staging_validation_no_charge'
        ? new StagingValidationPaymentProvider({ shopifyService, env })
        : new ShopifyOneTimeBillingProvider({ shopifyService, env }));
    this.validator = createSchemaValidator(root);
    this.merchantFlowService = null;
    this.merchantFlowJobRunner = null;
  }

  setMerchantFlowService(service) { this.merchantFlowService = service || null; }
  setMerchantFlowJobRunner(runner) { this.merchantFlowJobRunner = runner || null; }

  async finalizeArtifactDurability({ project, order, artifacts, generationId, at }) {
    const integrity = finalizeArtifactIntegrity({ root: this.root, artifacts, orderId: order.id, generationId, at });
    if (!this.authoritativeObjectService) {
      if (this.env.CALINIUM_ENVIRONMENT === 'production') throw Object.assign(new Error('Public production authoritative artifact storage is unavailable.'), { code: 'artifact_storage_provider_not_configured' });
      return integrity;
    }
    const connection = order.shopify_connection_id
      ? await this.store.findShopifyConnectionForOrganization(order.shopify_connection_id, project.organization_id)
      : null;
    const descriptors = Object.fromEntries(Object.values(ARTIFACTS).map((descriptor) => [descriptor.key, descriptor]));
    for (const [key, entry] of Object.entries(integrity.artifacts)) {
      entry.durable_reference = await this.authoritativeObjectService.persistFile({
        scope: {
          organization_id: project.organization_id,
          project_id: project.id,
          connection_id: connection?.id || null,
          canonical_shop: connection?.shop_domain || null
        },
        file: artifactPath(this.root, entry.reference),
        contentType: descriptors[key]?.contentType || null,
        objectClass: 'generated_artifact',
        evidenceKind: `theme_artifact_${key}`,
        evidenceIdentity: `${generationId}:${key}`,
        lineageIdentity: generationId,
        retentionClassification: 'merchant_exportable'
      });
    }
    return integrity;
  }

  at() { return now(this.clock); }
  price() { return activePrice({ root: this.root, env: this.env }); }
  requirePrice() {
    const price = this.price();
    if (!price) throw new DashboardError('custom_theme_commercial_configuration_unavailable', 'Theme generation is temporarily unavailable because payment configuration is incomplete.', 503);
    return price;
  }
  async authorize({ userId, projectId, permission = 'interview:edit' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async session(projectId) {
    const session = await this.store.findCreativeDirectorForProject(projectId);
    if (!session) throw new DashboardError('creative_director_missing', 'Start designing before preparing a custom storefront.', 409);
    return session;
  }
  contentPlanEligibility(session, expectedShop = null) {
    const shop = normalizeShopDomain(expectedShop) || normalizeShopDomain(session.content_plan?.target_eligibility?.scope_binding?.shop);
    return contentPlanFlowEligibility(session.content_plan, {
      resourcePlan: session.resource_plan,
      generationContext: session.generation_context,
      presetRevisionId: session.preset_selection?.approved_revision_id || null,
      scope: { project_id: session.project_id, shop },
      sourceRevision: contentPlanSourceRevision(this.env)
    });
  }
  contentPlanBinding(session) {
    const contract = session.content_plan?.target_eligibility;
    if (!contract) return null;
    return {
      policy_version: contract.policy_version,
      revision_id: contract.revision_id,
      checksum: contract.checksum,
      effective_composition_checksum: contract.effective_composition?.checksum || null,
      stage_resolution_reference: contract.stage_resolution?.reference || null,
      effective_composition: clone(contract.effective_composition),
      targets: (contract.targets || []).map((target) => ({
        target_key: target.target_key,
        module_id: target.module_id,
        eligibility_state: target.eligibility_state,
        actionable: target.actionable === true,
        blocked: target.blocked === true,
        actor: target.actor,
        reason: target.reason
      }))
    };
  }
  effectiveStrategyForSession(session) {
    const original = storeStrategyForPreset(session.store_strategy, session.preset_selection);
    const contract = session.content_plan?.target_eligibility;
    if (!contract) {
      if (session.resource_plan?.confirmation_eligibility) throw new DashboardError('content_plan_eligibility_missing', 'Review the current storefront content decisions before generation.', 409);
      return original;
    }
    const shop = normalizeShopDomain(contract.scope_binding?.shop);
    const integrity = contentPlanEligibilityIntegrity(contract, session.content_plan, { project_id: session.project_id, shop });
    assert(integrity.valid, integrity.reason || 'content_plan_eligibility_invalid', 'Review the current storefront content decisions before generation.', 409);
    return resourceResolvedStoreStrategy(original, contract.effective_composition);
  }
  offerFor({ session, project }) {
    const strategy = this.effectiveStrategyForSession(session); const plan = effectiveResourcePlan(session.resource_plan || {});
    return {
      output_format: 'A validated Shopify theme ZIP for manual installation.',
      pages: ['Homepage', 'Collections', 'Product pages', 'Cart', 'Navigation', 'Footer'],
      sections: [...new Set([...(strategy.homepage?.sections || []).map((section) => section.id || section.section_id || section.title).filter(Boolean), ...(plan.fields || []).map((field) => field.section_id).filter(Boolean)])],
      selected_resource_count: Object.keys(session.generation_context?.merchant_references || {}).length + Object.keys(session.generation_context?.asset_references || {}).length,
      design_direction: strategy.designDirection?.name || strategy.design_direction?.name || null,
      notice: 'Calinium will prepare a downloadable storefront package. It will not modify or publish your Shopify theme automatically.',
      project_id: project.id
    };
  }
  async evaluate({ project, session, price = this.price() }) {
    const evaluation = await evaluateGenerationEligibility({ root: this.root, store: this.store, session, project, price, shopifyService: this.shopifyService });
    const resourceSetBinding = session.generation_context?.recommended_resource_set_approval || null;
    const resourceSetState = this.recommendedResourceSetService ? await this.store.findRecommendedResourceSetState(project.id) : null;
    if (resourceSetState?.current_revision_id || resourceSetBinding) {
      const verification = this.recommendedResourceSetService
        ? await this.recommendedResourceSetService.verifyBinding({ project, binding: resourceSetBinding, session })
        : { valid: false };
      addEligibilityRequirement(evaluation, {
        id: 'recommended_resource_set', label: 'Current approved resource recommendations', valid: Boolean(resourceSetBinding && verification.valid),
        reason: 'Review the current Recommended Resource Set before purchasing generation.'
      });
    }
    let presetApprovalValid = false;
    try {
      await this.resolveApprovedPresetForSession({ project, session });
      presetApprovalValid = true;
    } catch (error) {
      if (!(error instanceof DashboardError)) throw error;
    }
    if (!presetApprovalValid) {
      addEligibilityRequirement(evaluation, { id: 'preset_approval', label: 'Current approved storefront design', valid: false, reason: 'Approve the current storefront design recommendation before purchasing generation.' });
    } else {
      addEligibilityRequirement(evaluation, { id: 'preset_approval', label: 'Current approved storefront design', valid: true, reason: null });
    }
    if (this.recommendationDesignService) {
      try {
        const approved = await this.recommendationDesignService.resolveApprovedForSession({ project, session });
        if (approved.recommendation || approved.designDna) addEligibilityRequirement(evaluation, { id: 'creative_direction', label: 'Current approved creative direction', valid: true, reason: null });
      } catch (error) {
        if (!(error instanceof DashboardError)) throw error;
        addEligibilityRequirement(evaluation, { id: 'creative_direction', label: 'Current approved creative direction', valid: false, reason: error.message || 'Review the current creative direction before purchasing generation.' });
      }
    }
    if (session.resource_plan?.confirmation_eligibility) {
      const assignment = typeof this.store.findProjectShopifyConnection === 'function'
        ? await this.store.findProjectShopifyConnection(project.id, project.organization_id)
        : null;
      const assignedShop = normalizeShopDomain(assignment?.connection?.shop_domain);
      const boundShop = normalizeShopDomain(session.content_plan?.target_eligibility?.scope_binding?.shop);
      const contentEligibility = assignedShop && assignedShop !== boundShop
        ? { eligible: false, reason: 'content_plan_scope_mismatch' }
        : this.contentPlanEligibility(session, assignedShop || boundShop || null);
      const stageReady = ['offer', 'generation', 'delivery', 'preview', 'finish'].includes(session.stage);
      addEligibilityRequirement(evaluation, {
        id: 'content_plan',
        label: 'Current storefront content decisions',
        valid: contentEligibility.eligible && stageReady,
        reason: 'Review the remaining storefront content decisions before purchasing generation.'
      });
      return evaluation;
    }
    // Historical paid orders remain replayable from their immutable snapshots,
    // but a new purchase cannot infer readiness from a pre-policy session.
    addEligibilityRequirement(evaluation, { id: 'content_plan', label: 'Current storefront content decisions', valid: false, reason: 'Refresh Store Resources so Calinium can verify the current content composition before purchasing generation.' });
    return evaluation;
  }
  async eligibility({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'project:view' });
    if (this.recommendationDesignService) await this.recommendationDesignService.ensure({ userId, projectId });
    const session = await this.session(projectId); const evaluation = await this.evaluate({ project, session });
    let readinessToken = null;
    if (evaluation.eligible) {
      try {
        const inputs = await this.resolveCurrentGenerationInputs({ project, session });
        const intent = this.purchaseIntent({ session, eligibility: evaluation, ...inputs });
        readinessToken = this.readinessToken({ project, intent, evaluation });
      } catch (error) {
        if (!(error instanceof DashboardError)) throw error;
        addEligibilityRequirement(evaluation, { id: 'generation_bindings', label: 'Current approved generation inputs', valid: false, reason: error.message || 'Review the current approved inputs before generation.' });
      }
    }
    evaluation.readiness_token = readinessToken;
    evaluation.readiness = {
      status: evaluation.eligible && readinessToken ? 'ready' : 'review_required',
      blocker_count: (evaluation.blocked || []).length
    };
    return { eligibility: evaluation, offer: this.offerFor({ session, project }), payment: { provider: this.paymentProvider.name, available: this.paymentProvider.isAvailable(), checkout_required: this.paymentProvider.checkoutRequired(), ...(this.paymentProvider.presentation?.() || {}) } };
  }
  readinessToken({ project, intent, evaluation }) {
    return checksum({ version: 1, project_id: project.id, purchase_intent_checksum: intent, resource_plan_revision: evaluation.resource_plan_revision, payment_provider: this.paymentProvider.name });
  }
  purchaseIntent({ session, eligibility, approvedBlockPlanTransport = null, approvedPresetRevision = null, approvedResourceSetRevision = null, approvedRecommendationRevision = null, approvedDesignDnaRevision = null, architectureSelectionRevision = null, merchantIntent = null, storeIntelligence = null }) {
    return checksum({
      creative_brief: session.creative_brief,
      store_strategy: this.effectiveStrategyForSession(session),
      review: session.review,
      resource_plan: clone(eligibility.effective_resource_plan || effectiveResourcePlan(session.resource_plan)),
      generation_context: session.generation_context,
      content_plan_eligibility: this.contentPlanBinding(session),
      approved_shopify_resources: eligibility.approved_shopify_resources,
      source_theme: eligibility.source_theme,
      price: eligibility.price,
      approved_block_plan: approvedBlockPlanTransport ? provenance(approvedBlockPlanTransport) : null,
      approved_preset: approvedPresetRevision ? presetProvenance(approvedPresetRevision) : null,
      approved_resource_set: approvedResourceSetProvenance(approvedResourceSetRevision),
      approved_recommendation: approvedCreativeDirectionProvenance(approvedRecommendationRevision),
      approved_design_dna: approvedCreativeDirectionProvenance(approvedDesignDnaRevision),
      architecture_selection: architectureSelectionRevision ? architectureProvenance(architectureSelectionRevision, this.root) : null,
      merchant_intent_revision: merchantIntent?.revision_id || null,
      store_intelligence_revision: storeIntelligence?.revision_id || null
    });
  }
  async resolveApprovedCreativeDirectionForSession({ project, session }) {
    return this.recommendationDesignService
      ? this.recommendationDesignService.resolveApprovedForSession({ project, session })
      : { recommendation: null, designDna: null };
  }
  async resolveApprovedResourceSetForSession({ project, session }) {
    const binding = session.generation_context?.recommended_resource_set_approval || null;
    if (!binding) return null;
    assert(this.recommendedResourceSetService, 'recommended_resource_set_unavailable', 'The approved resource recommendations could not be verified.', 409);
    const verification = await this.recommendedResourceSetService.verifyBinding({ project, binding, session });
    assert(verification.valid, 'recommended_resource_set_stale', 'Review the current Recommended Resource Set before purchasing generation.', 409);
    return verification.revision;
  }
  async resolveApprovedPresetForSession({ project, session }) {
    const selection = session?.preset_selection || null;
    assert(selection?.approved_revision_id, 'preset_approval_required', 'Approve the current storefront design recommendation before purchasing generation.', 409);
    assert(selection.status === 'approved', 'preset_approval_required', 'Approve the selected storefront preset before purchasing generation.', 409);
    const stored = await this.store.findApprovedPresetRevision(selection.approved_revision_id, project.id, project.organization_id);
    assert(stored, 'approved_preset_revision_not_found', 'The approved storefront preset revision is unavailable for this project.', 409);
    let revision;
    try { revision = assertApprovedPresetRevision(stored, this.root); }
    catch (error) { throw new DashboardError(error.code || 'approved_preset_invalid', 'The approved storefront preset could not be verified.', 409); }
    assert(revision.project_id === project.id && revision.organization_id === project.organization_id, 'approved_preset_scope_mismatch', 'The approved storefront preset does not belong to this project.', 409);
    assert(revision.revision_id === selection.approved_revision_id && revision.preset_id === selection.selected_preset_id && revision.preset_version === selection.preset_version, 'approved_preset_binding_mismatch', 'The approved storefront preset no longer matches this project review.', 409);
    return revision;
  }
  presetFromSnapshot({ project, order, snapshot }) {
    const revision = snapshot.approved_preset_revision || null;
    if (!order.approved_preset_revision_id) throw new DashboardError('preset_approval_required', 'The paid storefront inputs do not contain the required approved design recommendation.', 409);
    if (!revision || revision.revision_id !== order.approved_preset_revision_id) throw new DashboardError('approved_preset_binding_mismatch', 'The stored preset revision does not match the paid generation approval.', 409);
    if (revision.project_id !== project.id || revision.organization_id !== project.organization_id) throw new DashboardError('approved_preset_scope_mismatch', 'The stored preset revision does not belong to this project.', 409);
    try { return assertApprovedPresetRevision(revision, this.root); }
    catch (error) { throw new DashboardError(error.code || 'approved_preset_invalid', 'The stored storefront preset could not be verified.', 409); }
  }
  async resolveApprovedBlockPlanTransport({ project, approvedBlockPlanRevisionId = null, approvedResourceSnapshotRevisionId = null }) {
    if (!approvedBlockPlanRevisionId && !approvedResourceSnapshotRevisionId) return null;
    if (!approvedBlockPlanRevisionId) throw new DashboardError('approved_block_plan_revision_required', 'Choose a fully approved Block Plan revision before generation.', 422);
    const planRevision = await this.store.findApprovedBlockPlanRevision(approvedBlockPlanRevisionId, project.id, project.organization_id);
    if (!planRevision) throw new DashboardError('approved_block_plan_revision_not_found', 'The selected Approved Block Plan revision is unavailable for this project.', 409);
    const snapshotRevisionId = approvedResourceSnapshotRevisionId || planRevision.resource_snapshot_revision_id;
    const resourceSnapshot = await this.store.findApprovedBlockPlanResourceSnapshot(snapshotRevisionId, project.id, project.organization_id);
    if (!resourceSnapshot) throw new DashboardError('approved_resource_snapshot_not_found', 'The selected approved resource snapshot is unavailable for this project.', 409);
    try {
      return createApprovedBlockPlanTransport({ planRevision, resourceSnapshot, root: this.root });
    } catch (error) {
      if (error instanceof ApprovedBlockPlanTransportError) throw new DashboardError(error.code, 'The approved Block Plan inputs could not be verified for generation.', 409);
      throw error;
    }
  }
  assertTransportMatchesReadyTargets(transport, readyTargets) {
    const expectedPlacements = readyTargetCompositionIdentities(readyTargets);
    const actualPlacements = [...new Set((transport?.plan_revision?.plan?.compositions || transport?.plan_revision?.compositions || [])
      .filter((composition) => composition.page_role && composition.section_role)
      .map((composition) => `${composition.page_role}|${composition.section_role}`))].sort();
    assert(expectedPlacements.length > 0 && JSON.stringify(actualPlacements) === JSON.stringify(expectedPlacements), 'approved_block_plan_content_scope_mismatch', 'The approved content revision no longer matches the effective storefront composition.', 409);
    return transport;
  }
  async resolveApprovedPlanForSession({ project, session, approvedBlockPlanRevisionId = null, approvedResourceSnapshotRevisionId = null }) {
    if (session.resource_plan?.confirmation_eligibility) {
      const eligibility = this.contentPlanEligibility(session);
      assert(eligibility.eligible, 'content_plan_approval_required', 'Review the required storefront content decisions before purchasing generation.', 409);
      const readyTargets = (session.content_plan?.target_eligibility?.targets || [])
        .filter((target) => target.eligibility_state === 'ready_from_authoritative_content');
      if (!readyTargets.length) {
        assert(!approvedBlockPlanRevisionId && !approvedResourceSnapshotRevisionId, 'approved_block_plan_caller_substitution', 'This storefront composition does not require an approved Block Plan revision.', 409);
        return null;
      }
      const plan = session.content_plan || {};
      assert(plan.approved_revision_id && plan.approved_resource_snapshot_revision_id, 'content_plan_approval_required', 'Approve the required storefront content plans before purchasing generation.', 409);
      assert(!approvedBlockPlanRevisionId || approvedBlockPlanRevisionId === plan.approved_revision_id, 'approved_block_plan_caller_substitution', 'The selected Block Plan revision is not the project’s approved content plan.', 409);
      assert(!approvedResourceSnapshotRevisionId || approvedResourceSnapshotRevisionId === plan.approved_resource_snapshot_revision_id, 'approved_resource_snapshot_caller_substitution', 'The selected resource snapshot is not the project’s approved content plan.', 409);
      const transport = await this.resolveApprovedBlockPlanTransport({ project, approvedBlockPlanRevisionId: plan.approved_revision_id, approvedResourceSnapshotRevisionId: plan.approved_resource_snapshot_revision_id });
      return this.assertTransportMatchesReadyTargets(transport, readyTargets);
    }
    throw new DashboardError('content_plan_eligibility_missing', 'Refresh Store Resources so Calinium can verify the current content composition before generation.', 409);
  }
  async resolveCurrentGenerationInputs({ project, session, approvedBlockPlanRevisionId = null, approvedResourceSnapshotRevisionId = null }) {
    const architectureInputs = await this.resolveArchitectureInputs({ session, project });
    const approvedBlockPlanTransport = await this.resolveApprovedPlanForSession({ project, session, approvedBlockPlanRevisionId, approvedResourceSnapshotRevisionId });
    const approvedPresetRevision = await this.resolveApprovedPresetForSession({ project, session });
    const approvedResourceSetRevision = await this.resolveApprovedResourceSetForSession({ project, session });
    const approvedCreativeDirection = await this.resolveApprovedCreativeDirectionForSession({ project, session });
    if (this.merchantFlowService && (await this.merchantFlowService.requireFrozenArchitecture({ project, session }))) {
      const designDna = approvedCreativeDirection.designDna;
      assert(designDna, 'merchant_flow_design_dna_required', 'Approve Design DNA after architecture selection before purchasing generation.', 409);
      const contentPlanBinding = this.contentPlanBinding(session);
      const compositionRevision = {
        revision_id: `merchant-composition-${checksum({
          architecture_selection_revision: architectureInputs.architectureSelectionRevision.revision_id,
          approved_preset_revision: approvedPresetRevision?.revision_id || null,
          approved_block_plan_revision: approvedBlockPlanTransport?.plan_revision?.revision_id || null,
          resource_plan: session.resource_plan,
          content_plan_eligibility: contentPlanBinding,
          content_eligibility_revision: 'theme-generator-content-eligibility-v1'
        }).slice(0, 20)}`,
        architecture_selection_revision: architectureInputs.architectureSelectionRevision.revision_id,
        content_eligibility_revision: 'theme-generator-content-eligibility-v1',
        content_plan_eligibility: contentPlanBinding
      };
      await this.merchantFlowService.bindDesignAndComposition({ project, session: await this.session(project.id), designDnaRevision: designDna, compositionRevision });
    }
    return {
      approvedBlockPlanTransport,
      approvedPresetRevision,
      approvedResourceSetRevision,
      approvedRecommendationRevision: approvedCreativeDirection.recommendation,
      approvedDesignDnaRevision: approvedCreativeDirection.designDna,
      ...architectureInputs
    };
  }
  async resolveArchitectureInputs({ project, session }) {
    if (this.merchantFlowService) {
      const frozen = await this.merchantFlowService.requireFrozenArchitecture({ project, session });
      if (frozen) return { architectureSelectionRevision: frozen.architectureSelectionRevision, merchantIntent: frozen.merchantIntent, storeIntelligence: frozen.storeIntelligence };
    }
    const intakeRevision = typeof this.store.latestMerchantIntakeRevision === 'function'
      ? await this.store.latestMerchantIntakeRevision(project.id)
      : null;
    const storeIntelligence = createStoreIntelligenceContract({
      revisionId: intakeRevision?.revision_id || null,
      normalizationVersion: intakeRevision?.normalization_version || null,
      intelligence: intakeRevision?.store_intelligence || null,
      status: intakeRevision?.intake_status || null,
      root: this.root
    });
    const merchantIntent = createMerchantIntent({ creativeBrief: session.creative_brief, storeStrategy: session.store_strategy, storeIntelligence, root: this.root });
    const architectureSelectionRevision = selectArchitecture({ merchantIntent, storeIntelligence, root: this.root });
    return { architectureSelectionRevision, merchantIntent, storeIntelligence };
  }
  async generationContextFromPaidSnapshot({ project, snapshot }) {
    const context = clone(snapshot.generation_context || {});
    const resources = clone(snapshot.approved_shopify_resources || []);
    const byId = new Map(resources.map((resource) => [resource.resource_id, resource]));
    const fields = new Map((snapshot.resource_plan?.fields || []).map((field) => [field.setting_ref, field]));
    const hydrate = async (reference, field = null) => {
      const resourceId = dashboardReferenceId(reference, 'shopify');
      if (!resourceId) return;
      const pinned = byId.get(resourceId);
      assert(pinned, 'theme_resource_binding_unavailable', 'A paid Shopify resource binding is missing from the immutable storefront snapshot.', 409);
      const allowedTypes = field ? allowedTypesForField(field) : [pinned.resource_type];
      const resolved = await this.shopifyService.resolveApprovedResource({ projectId: project.id, organizationId: project.organization_id, resourceId, allowedTypes });
      assert(resolved.resource.source_revision === pinned.source_revision && resolved.resource.resource_type === pinned.resource_type, 'theme_resource_binding_stale', 'A paid Shopify resource changed after approval. The preserved generation cannot use a different resource.', 409);
      const runtimeValue = shopifyRuntimeValue(resolved.resource, field || { kind: 'image' });
      assert(runtimeValue, 'theme_resource_binding_unavailable', 'A paid Shopify resource cannot be represented safely in this theme package.', 409);
      pinned.runtime_value = runtimeValue;
    };
    for (const [fieldRef, reference] of Object.entries(context.merchant_references || {})) await hydrate(reference, fields.get(fieldRef) || null);
    for (const reference of Object.values(context.asset_references || {})) await hydrate(reference, null);
    return snapshotGenerationContext(context, resources, snapshot.resource_plan);
  }
  transportFromSnapshot({ project, order, snapshot }) {
    const binding = snapshot.approved_block_plan_transport || null;
    if (!order.approved_block_plan_revision_id && !order.approved_resource_snapshot_revision_id) {
      if (binding !== null) throw new DashboardError('approved_block_plan_binding_mismatch', 'The stored storefront inputs contain an unexpected Block Plan binding.', 409);
      return null;
    }
    if (!binding || binding.plan_revision?.revision_id !== order.approved_block_plan_revision_id || binding.resource_snapshot?.revision_id !== order.approved_resource_snapshot_revision_id) {
      throw new DashboardError('approved_block_plan_binding_mismatch', 'The stored Block Plan binding does not match the paid generation approval.', 409);
    }
    if (binding.plan_revision.organization_id !== project.organization_id || binding.plan_revision.project_id !== project.id || binding.resource_snapshot.organization_id !== project.organization_id || binding.resource_snapshot.project_id !== project.id) {
      throw new DashboardError('approved_block_plan_scope_mismatch', 'The stored Block Plan binding does not belong to this project.', 409);
    }
    try {
      return createApprovedBlockPlanTransport({
        planRevision: binding.plan_revision,
        resourceSnapshot: binding.resource_snapshot,
        root: this.root
      });
    } catch (error) {
      if (error instanceof ApprovedBlockPlanTransportError) throw new DashboardError(error.code, 'The stored Approved Block Plan inputs could not be verified.', 409);
      throw error;
    }
  }
  architectureFromSnapshot(snapshot) {
    if (!snapshot.architecture_selection_revision) {
      // Paid snapshots created before Core 2.0 remain valid under the only
      // Phase A profile. No current project state is consulted.
      const storeIntelligence = createStoreIntelligenceContract({ root: this.root });
      const merchantIntent = createMerchantIntent({ storeIntelligence, root: this.root });
      return { architectureSelectionRevision: selectArchitecture({ merchantIntent, storeIntelligence, root: this.root }), merchantIntent, storeIntelligence };
    }
    const architectureSelectionRevision = assertFrozenArchitectureSelection(snapshot.architecture_selection_revision, this.root);
    const merchantIntent = clone(snapshot.merchant_intent);
    const storeIntelligence = clone(snapshot.store_intelligence);
    const expectedBinding = architectureProvenance(architectureSelectionRevision, this.root);
    if (JSON.stringify(snapshot.generation_approval_binding?.architecture_selection || null) !== JSON.stringify(expectedBinding)) {
      throw new DashboardError('architecture_selection_binding_mismatch', 'The stored storefront architecture selection could not be verified.', 409);
    }
    if (architectureSelectionRevision.merchant_intent_revision !== merchantIntent?.revision_id || architectureSelectionRevision.store_intelligence_revision !== (storeIntelligence?.revision_id || null)) {
      throw new DashboardError('architecture_selection_input_mismatch', 'The stored storefront architecture inputs could not be verified.', 409);
    }
    return { architectureSelectionRevision, merchantIntent, storeIntelligence };
  }
  snapshot({ project, session, eligibility, order, at, approvedBlockPlanTransport = null, approvedPresetRevision = null, approvedResourceSetRevision = null, approvedRecommendationRevision = null, approvedDesignDnaRevision = null, architectureSelectionRevision, merchantIntent, storeIntelligence }) {
    const approvedStoreStrategy = this.effectiveStrategyForSession(session);
    const effectivePlan = clone(eligibility.effective_resource_plan || effectiveResourcePlan(session.resource_plan));
    const contentPlanBinding = this.contentPlanBinding(session);
    assert(contentPlanBinding?.policy_version === 'content-plan-eligibility-v1'
      && typeof contentPlanBinding.revision_id === 'string'
      && typeof contentPlanBinding.checksum === 'string'
      && typeof contentPlanBinding.effective_composition_checksum === 'string'
      && Array.isArray(contentPlanBinding.targets)
      && contentPlanBinding.targets.length === 12,
    'content_plan_snapshot_binding_invalid', 'Calinium could not preserve the verified content composition for this purchase.', 500);
    const resolvedStoreIntelligence = storeIntelligence || createStoreIntelligenceContract({ root: this.root });
    const resolvedMerchantIntent = merchantIntent || createMerchantIntent({ creativeBrief: session.creative_brief, storeStrategy: session.store_strategy, storeIntelligence: resolvedStoreIntelligence, root: this.root });
    const resolvedArchitectureSelection = architectureSelectionRevision || selectArchitecture({ merchantIntent: resolvedMerchantIntent, storeIntelligence: resolvedStoreIntelligence, root: this.root });
    const snapshot = {
      version: 3, snapshot_id: createId('cts'), order_id: order.id, project_id: project.id, created_at: at,
      creative_brief: clone(session.creative_brief), store_strategy: clone(approvedStoreStrategy), review: clone(session.review), resource_plan: clone(effectivePlan), generation_context: snapshotGenerationContext(session.generation_context, eligibility.approved_shopify_resources, effectivePlan),
      content_plan_eligibility: clone(contentPlanBinding),
      approved_block_plan_transport: approvedBlockPlanTransport ? clone({ plan_revision: approvedBlockPlanTransport.plan_revision, resource_snapshot: approvedBlockPlanTransport.resource_snapshot, provenance: approvedBlockPlanTransport.provenance }) : null,
      approved_preset_revision: approvedPresetRevision ? clone(approvedPresetRevision) : null,
      approved_resource_set_revision: approvedResourceSetRevision ? clone(approvedResourceSetRevision) : null,
      approved_recommendation_revision: approvedRecommendationRevision ? clone(approvedRecommendationRevision) : null,
      approved_design_dna_revision: approvedDesignDnaRevision ? clone(approvedDesignDnaRevision) : null,
      architecture_selection_revision: clone(assertFrozenArchitectureSelection(resolvedArchitectureSelection, this.root)),
      merchant_intent: clone(resolvedMerchantIntent),
      store_intelligence: clone(resolvedStoreIntelligence),
      generation_approval_binding: { approval_reference: session.generation_context.approval_reference, approved_at: session.generation_context.approved_at, approved_block_plan: approvedBlockPlanTransport ? clone(provenance(approvedBlockPlanTransport)) : null, approved_preset: approvedPresetRevision ? clone(presetProvenance(approvedPresetRevision)) : null, approved_resource_set: approvedResourceSetProvenance(approvedResourceSetRevision), approved_recommendation: approvedCreativeDirectionProvenance(approvedRecommendationRevision), approved_design_dna: approvedCreativeDirectionProvenance(approvedDesignDnaRevision), architecture_selection: architectureProvenance(resolvedArchitectureSelection, this.root), content_plan_eligibility: clone(contentPlanBinding) },
      approved_shopify_resources: clone(eligibility.approved_shopify_resources), source_theme: clone(eligibility.source_theme), price: clone(eligibility.price),
      approval_timestamps: { creative_brief: session.updated_at, brand_blueprint: session.updated_at, store_strategy: session.updated_at, resource_plan: session.generation_context.approved_at }
    };
    snapshot.checksum = checksum(snapshot);
    const errors = this.validator.validateFile(snapshot, 'schemas/calinium-custom-theme-input-snapshot.schema.json', 'custom_theme_input_snapshot');
    if (errors.length) throw new DashboardError('custom_theme_snapshot_invalid', 'Calinium could not preserve the approved storefront inputs.', 500);
    return snapshot;
  }
  orderRecord({ orderId, project, userId, eligibility, shopifyConnectionId = null, idempotencyKey, intent, at, approvedBlockPlanTransport = null, approvedPresetRevision = null }) {
    return {
      version: 2, id: orderId, organization_id: project.organization_id, project_id: project.id, merchant_user_id: userId,
      shopify_connection_id: shopifyConnectionId,
      order_type: 'custom_theme', product_code: eligibility.price.product_code, product_name: eligibility.price.display_name, price_version: eligibility.price.price_version,
      currency: eligibility.price.currency, amount_cents: eligibility.price.amount_cents, payment_status: 'pending', generation_status: 'not_started',
      resource_plan_revision: eligibility.resource_plan_revision,
      approved_block_plan_revision_id: approvedBlockPlanTransport?.plan_revision.revision_id || null,
      approved_resource_snapshot_revision_id: approvedBlockPlanTransport?.resource_snapshot.revision_id || null,
      approved_preset_revision_id: approvedPresetRevision?.revision_id || null,
      purchase_intent_checksum: intent, source_theme: eligibility.source_theme,
      snapshot_id: null, snapshot: null, snapshot_checksum: null, idempotency_key: idempotencyKey, artifacts: clone(EMPTY_ARTIFACTS), validation_result: null,
      failure_reason: null, paid_at: null, generated_at: null, created_at: at, updated_at: at
    };
  }
  billingRecord({ order, idempotencyKey, at }) {
    return { version: 1, id: createId('ctb'), order_id: order.id, provider: this.paymentProvider.name, provider_purchase_id: null, provider_status: 'CREATING', confirmation_url: null, confirmation_url_status: 'unavailable', amount_cents: order.amount_cents, currency: order.currency, test_mode: false, idempotency_key: idempotencyKey, raw_event_digest: null, verified_at: null, cancelled_at: null, refunded_at: null, failure_reason: null, created_at: at, updated_at: at };
  }
  billingReturnUrl(projectId, orderId) {
    const config = shopifyRuntimeConfiguration(this.env, { requireCredentials: true });
    const url = new URL(`/projects/${encodeURIComponent(projectId)}/design`, config.applicationUrl);
    url.searchParams.set('calinium_order', orderId);
    url.searchParams.set('calinium_billing', 'return');
    return url.toString();
  }
  async createOrder({ userId, projectId, idempotencyKey = null, expectedReadinessToken = null, requestId = null, approvedBlockPlanRevisionId = null, approvedResourceSnapshotRevisionId = null }) {
    const project = await this.authorize({ userId, projectId });
    if (this.recommendationDesignService) await this.recommendationDesignService.ensure({ userId, projectId });
    const session = await this.session(projectId); const price = this.requirePrice(); const eligibility = await this.evaluate({ project, session, price });
    if (this.merchantFlowJobRunner && this.merchantFlowService) {
      const frozen = await this.merchantFlowService.requireFrozenArchitecture({ project, session });
      assert(frozen, 'merchant_flow_required', 'Start the storefront preparation flow before creating a generation purchase.', 409);
    }
    if (!eligibility.eligible) return { created: false, eligibility, order: null, checkout: null };
    if (!this.paymentProvider.isAvailable()) return { created: false, eligibility, order: null, checkout: null, payment_unavailable: true };
    const billingConnection = (this.paymentProvider.checkoutRequired() || this.paymentProvider.requiresShopifyConnection?.())
      ? await this.shopifyService.billingConnection({ projectId, organizationId: project.organization_id })
      : null;
    const inputs = await this.resolveCurrentGenerationInputs({ project, session, approvedBlockPlanRevisionId, approvedResourceSnapshotRevisionId });
    const intent = this.purchaseIntent({ session, eligibility, ...inputs });
    const currentReadinessToken = this.readinessToken({ project, intent, evaluation: eligibility });
    if (expectedReadinessToken !== null) assert(typeof expectedReadinessToken === 'string' && expectedReadinessToken === currentReadinessToken, 'custom_theme_readiness_stale', 'Your storefront changed after the final review. Review the current direction before generating.', 409);
    const { approvedBlockPlanTransport, approvedPresetRevision, approvedResourceSetRevision, approvedRecommendationRevision, approvedDesignDnaRevision } = inputs;
    const key = String(idempotencyKey || `purchase-${intent}`).slice(0, 180); const at = this.at();
    const prepared = await this.store.transaction(async (transaction) => {
      const freshSession = await transaction.findCreativeDirectorForProject(projectId);
      assert(freshSession?.updated_at === session.updated_at, 'custom_theme_readiness_stale', 'Your storefront changed after the final review. Review the current direction before generating.', 409);
      const byKey = await transaction.findCustomThemeOrderByIdempotency(projectId, key);
      if (byKey) {
        assert(byKey.purchase_intent_checksum === intent
          && byKey.amount_cents === eligibility.price.amount_cents
          && byKey.currency === eligibility.price.currency,
        'custom_theme_idempotency_conflict', 'This purchase request key was already used for different approved storefront inputs.', 409);
        return { created: false, order: byKey, billing: await transaction.findCustomThemeBillingPurchaseForOrder(byKey.id) };
      }
      const active = await transaction.findActiveCustomThemeOrder(projectId, intent);
      if (active) return { created: false, order: active, billing: await transaction.findCustomThemeBillingPurchaseForOrder(active.id) };
      const order = this.orderRecord({ orderId: createId('cto'), project, userId, eligibility, shopifyConnectionId: billingConnection?.id || null, idempotencyKey: key, intent, at, approvedBlockPlanTransport, approvedPresetRevision });
      const orderErrors = this.validator.validateFile(order, 'schemas/calinium-custom-theme-order.schema.json', 'custom_theme_order');
      if (orderErrors.length) throw new DashboardError('custom_theme_order_invalid', 'Calinium could not prepare the custom storefront order.', 500);
      const persisted = await transaction.createCustomThemeOrder(order);
      if (!persisted.created) return { created: false, order: persisted.order, billing: await transaction.findCustomThemeBillingPurchaseForOrder(persisted.order.id) };
      const saved = persisted.order;
      const billing = this.billingRecord({ order: saved, idempotencyKey: `billing-${key}`, at });
      const billingErrors = this.validator.validateFile(billing, 'schemas/calinium-shopify-billing-purchase.schema.json', 'custom_theme_billing_purchase');
      if (billingErrors.length) throw new DashboardError('custom_theme_billing_invalid', 'Calinium could not prepare the secure Shopify approval step.', 500);
      return { created: true, order: saved, billing: await transaction.createCustomThemeBillingPurchase(billing) };
    });
    let { order, billing } = prepared;
    if (this.merchantFlowService) await this.merchantFlowService.bindPaidOrder({ project, order });
    if (prepared.created) {
      try {
        const receipt = await this.paymentProvider.createPurchase({ order, price: eligibility.price, returnUrl: this.paymentProvider.checkoutRequired() ? this.billingReturnUrl(project.id, order.id) : null });
        assert(receipt?.provider_purchase_id && receipt.amount_cents === order.amount_cents && receipt.currency === order.currency, 'payment_provider_invalid', 'The payment provider did not prepare the expected storefront purchase.', 502);
        billing = await this.store.updateCustomThemeBillingPurchase(order.id, { ...billing, provider_purchase_id: receipt.provider_purchase_id, provider_status: receipt.provider_status, confirmation_url: receipt.confirmation_url || null, confirmation_url_status: receipt.confirmation_url_status || 'unavailable', test_mode: Boolean(receipt.test_mode), raw_event_digest: null, verified_at: null, cancelled_at: null, refunded_at: null, failure_reason: null, updated_at: this.at() });
        await this.activity(project, userId, 'custom_theme_purchase_started', { order_id: order.id, provider: receipt.provider, test_mode: Boolean(receipt.test_mode) });
      } catch (error) {
        const failure = safeFailureDetails(error, 'payment_preparation', requestId);
        this.captureFailure({ order, project, failure, error });
        billing = await this.store.updateCustomThemeBillingPurchase(order.id, { ...billing, provider_status: 'FAILED', confirmation_url: null, confirmation_url_status: 'unavailable', test_mode: billing.test_mode, failure_reason: failure.message, updated_at: this.at() });
        order = await this.updateOrder(order, project, { payment_status: 'failed', failure_reason: failure.message, validation_result: { operation_failure: failure } });
        await this.activity(project, userId, 'custom_theme_purchase_failed', { order_id: order.id, provider: this.paymentProvider.name, failure });
      }
    } else {
      await this.activity(project, userId, 'custom_theme_purchase_resumed', { order_id: order.id, payment_status: order.payment_status });
    }
    return { created: prepared.created, eligibility, order: orderSummary(order, billing), checkout: billing?.confirmation_url_status === 'issued' && billing.confirmation_url ? { redirect_url: billing.confirmation_url } : null };
  }
  async order({ userId, projectId, orderId }) {
    const project = await this.authorize({ userId, projectId, permission: 'project:view' }); const order = await this.store.findCustomThemeOrderForProject(orderId, projectId, project.organization_id);
    if (!order) throw new DashboardError('custom_theme_order_not_found', 'This custom storefront order is not available.', 404);
    return { order: orderSummary(order, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)) };
  }
  async latest({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'project:view' }); const order = (await this.store.listCustomThemeOrdersForProject(projectId, project.organization_id))[0] || null;
    return { order: orderSummary(order, order && await this.store.findCustomThemeBillingPurchaseForOrder(order.id)) };
  }
  async persistNonPaidVerification({ project, userId, order, billing, verification }) {
    const at = this.at(); const terminal = TERMINAL_PAYMENT_STATES.has(verification.payment_status);
    const nextBilling = await this.store.updateCustomThemeBillingPurchase(order.id, { ...billing, provider_status: verification.provider_status, confirmation_url: billing.confirmation_url, confirmation_url_status: terminal && verification.payment_status === 'expired' ? 'expired' : billing.confirmation_url_status === 'issued' ? 'visited' : billing.confirmation_url_status, test_mode: Boolean(verification.test_mode), raw_event_digest: verification.raw_event_digest || billing.raw_event_digest, verified_at: at, cancelled_at: verification.payment_status === 'cancelled' ? at : billing.cancelled_at, refunded_at: verification.payment_status === 'refunded' ? at : billing.refunded_at, failure_reason: terminal ? 'Shopify did not confirm this storefront purchase.' : null, updated_at: at });
    const nextOrder = terminal ? await this.updateOrder(order, project, { payment_status: verification.payment_status, failure_reason: verification.payment_status === 'declined' ? 'The storefront purchase was declined.' : 'The storefront purchase was not completed.' }) : order;
    await this.activity(project, userId, 'custom_theme_payment_checked', { order_id: order.id, payment_status: verification.payment_status, provider: verification.provider });
    return { order: orderSummary(nextOrder, nextBilling), resumed: false };
  }
  async verifyPayment({ userId, projectId, orderId, idempotencyKey = null, requestId = null }) {
    const project = await this.authorize({ userId, projectId }); let order = await this.store.findCustomThemeOrderForProject(orderId, projectId, project.organization_id);
    if (!order) throw new DashboardError('custom_theme_order_not_found', 'This custom storefront order is not available.', 404);
    let billing = await this.store.findCustomThemeBillingPurchaseForOrder(order.id);
    assert(billing && billing.provider === this.paymentProvider.name, 'custom_theme_billing_unavailable', 'This storefront purchase cannot be verified in the current environment.', 409);
    if (order.payment_status === 'paid') {
      if (!order.snapshot) return { order: orderSummary(order, billing), resumed: true };
      return this.queueOrProcessOrder({ userId, project, order, requestId });
    }
    assert(order.payment_status === 'pending', 'custom_theme_payment_invalid', 'This custom storefront order cannot be verified in its current state.', 409);
    assert(billing.provider_purchase_id, 'custom_theme_payment_pending', 'Shopify is still preparing the secure approval step. Refresh and try again.', 409);
    const verification = await this.paymentProvider.verifyPurchase({ order, purchase: billing, idempotencyKey });
    assert(verification?.provider_purchase_id === billing.provider_purchase_id && verification.amount_cents === order.amount_cents && verification.currency === order.currency, 'payment_provider_invalid', 'The payment provider did not verify the expected storefront purchase.', 502);
    if (verification.payment_status !== 'paid') return this.persistNonPaidVerification({ project, userId, order, billing, verification });
    const session = await this.session(projectId); const eligibility = await this.evaluate({ project, session });
    const approvedBlockPlanTransport = await this.resolveApprovedBlockPlanTransport({ project, approvedBlockPlanRevisionId: order.approved_block_plan_revision_id, approvedResourceSnapshotRevisionId: order.approved_resource_snapshot_revision_id });
    let approvedPresetRevision = null; let presetResolutionFailed = false;
    try { approvedPresetRevision = await this.resolveApprovedPresetForSession({ project, session }); }
    catch (error) {
      if (!(error instanceof DashboardError)) throw error;
      presetResolutionFailed = true;
    }
    let approvedResourceSetRevision = null; let resourceSetResolutionFailed = false;
    try { approvedResourceSetRevision = await this.resolveApprovedResourceSetForSession({ project, session }); }
    catch (error) {
      if (!(error instanceof DashboardError)) throw error;
      resourceSetResolutionFailed = true;
    }
    let approvedCreativeDirection = { recommendation: null, designDna: null }; let creativeDirectionResolutionFailed = false;
    try { approvedCreativeDirection = await this.resolveApprovedCreativeDirectionForSession({ project, session }); }
    catch (error) {
      if (!(error instanceof DashboardError)) throw error;
      creativeDirectionResolutionFailed = true;
    }
    const architectureInputs = await this.resolveArchitectureInputs({ project, session });
    const presetMatchesOrder = !presetResolutionFailed && approvedPresetRevision.revision_id === order.approved_preset_revision_id;
    const intentMatchesOrder = presetMatchesOrder && !resourceSetResolutionFailed && !creativeDirectionResolutionFailed && isPriceForOrder(eligibility.price, order) && this.purchaseIntent({ session, eligibility, approvedBlockPlanTransport, approvedPresetRevision, approvedResourceSetRevision, approvedRecommendationRevision: approvedCreativeDirection.recommendation, approvedDesignDnaRevision: approvedCreativeDirection.designDna, ...architectureInputs }) === order.purchase_intent_checksum;
    if (!eligibility.eligible || !intentMatchesOrder) {
      const at = this.at();
      billing = await this.store.updateCustomThemeBillingPurchase(order.id, { ...billing, provider_status: verification.provider_status, confirmation_url: billing.confirmation_url, confirmation_url_status: 'visited', test_mode: Boolean(verification.test_mode), raw_event_digest: verification.raw_event_digest, verified_at: at, cancelled_at: null, refunded_at: null, failure_reason: null, updated_at: at });
      order = await this.updateOrder(order, project, { payment_status: 'paid', generation_status: 'blocked', paid_at: at, failure_reason: 'Your approved storefront inputs changed while Shopify was confirming payment. Return to Store Resources to review them before generation.' });
      await this.activity(project, userId, 'custom_theme_paid_inputs_require_review', { order_id: order.id });
      return { order: orderSummary(order, billing), resumed: false };
    }
    const at = this.at();
    const recorded = await this.store.transaction(async (transaction) => {
      const event = await transaction.createCustomThemePaymentEvent({ id: createId('ctp'), order_id: order.id, provider: verification.provider, provider_event_id: verification.provider_event_id, payment_status: 'paid', amount_cents: order.amount_cents, currency: order.currency, received_at: at, processed_at: at });
      const current = await transaction.findCustomThemeOrderForProject(order.id, projectId, project.organization_id);
      const currentBilling = await transaction.findCustomThemeBillingPurchaseForOrder(order.id);
      if (!event.created || current.payment_status === 'paid') return { order: current, billing: currentBilling, created: false, inputs_stale: false };
      const freshSession = await transaction.findCreativeDirectorForProject(projectId);
      if (!freshSession || freshSession.updated_at !== session.updated_at) {
        const updatedBilling = await transaction.updateCustomThemeBillingPurchase(order.id, { ...currentBilling, provider_status: verification.provider_status, confirmation_url: currentBilling.confirmation_url, confirmation_url_status: 'visited', test_mode: Boolean(verification.test_mode), raw_event_digest: verification.raw_event_digest, verified_at: at, cancelled_at: null, refunded_at: null, failure_reason: null, updated_at: at });
        const updatedOrder = await transaction.updateCustomThemeOrder(order.id, projectId, project.organization_id, { ...current, payment_status: 'paid', generation_status: 'blocked', paid_at: at, failure_reason: 'Your approved storefront inputs changed while Shopify was confirming payment. Return to Store Resources to review them before generation.', updated_at: at });
        return { order: updatedOrder, billing: updatedBilling, created: true, inputs_stale: true };
      }
      const snapshot = this.snapshot({ project, session, eligibility, order: current, at, approvedBlockPlanTransport, approvedPresetRevision, approvedResourceSetRevision, approvedRecommendationRevision: approvedCreativeDirection.recommendation, approvedDesignDnaRevision: approvedCreativeDirection.designDna, ...architectureInputs });
      const updatedBilling = await transaction.updateCustomThemeBillingPurchase(order.id, { ...currentBilling, provider_status: verification.provider_status, confirmation_url: currentBilling.confirmation_url, confirmation_url_status: 'visited', test_mode: Boolean(verification.test_mode), raw_event_digest: verification.raw_event_digest, verified_at: at, cancelled_at: null, refunded_at: null, failure_reason: null, updated_at: at });
      const updatedOrder = await transaction.updateCustomThemeOrder(order.id, projectId, project.organization_id, { ...current, payment_status: 'paid', generation_status: 'queued', snapshot_id: snapshot.snapshot_id, snapshot, snapshot_checksum: snapshot.checksum, paid_at: at, failure_reason: null, updated_at: at });
      return { order: updatedOrder, billing: updatedBilling, created: true, inputs_stale: false };
    });
    order = recorded.order; billing = recorded.billing;
    if (recorded.inputs_stale) {
      await this.activity(project, userId, 'custom_theme_paid_inputs_require_review', { order_id: order.id });
      return { order: orderSummary(order, billing), resumed: false };
    }
    if (order.payment_status === 'paid' && !order.snapshot) {
      await this.activity(project, userId, 'custom_theme_paid_inputs_require_review', { order_id: order.id });
      return { order: orderSummary(order, billing), resumed: true };
    }
    if (this.merchantFlowService) await this.merchantFlowService.bindPaidOrder({ project, order });
    await this.activity(project, userId, recorded.created ? 'custom_theme_payment_verified' : 'custom_theme_payment_verification_resumed', { order_id: order.id, provider: verification.provider, test_mode: Boolean(verification.test_mode) });
    if (order.payment_status !== 'paid') return { order: orderSummary(order, billing), resumed: !recorded.created };
    return this.queueOrProcessOrder({ userId, project, order, requestId });
  }
  async confirmDevelopmentPayment({ userId, projectId, orderId, idempotencyKey = null }) {
    assert(this.paymentProvider.name === 'development_simulator' || this.paymentProvider.permitsServerConfirmation?.(), 'payment_provider_unavailable', 'Shopify approval is required before this storefront can be prepared.', 409);
    return this.verifyPayment({ userId, projectId, orderId, idempotencyKey });
  }
  // This server-only method is deliberately not a merchant-facing action.
  // A future billing-operations workflow may call it only after independently
  // verifying an administrative refund with the payment provider.
  async recordVerifiedRefund({ projectId, orderId, providerRefundReference, reason = null }) {
    assert(typeof providerRefundReference === 'string' && providerRefundReference.trim().length >= 4, 'custom_theme_refund_reference_invalid', 'A verified refund reference is required.', 422);
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    const order = await this.store.findCustomThemeOrderForProject(orderId, projectId, project.organization_id);
    if (!order) throw new DashboardError('custom_theme_order_not_found', 'This custom storefront order is not available.', 404);
    const billing = await this.store.findCustomThemeBillingPurchaseForOrder(order.id);
    assert(billing?.provider_purchase_id, 'custom_theme_billing_unavailable', 'This storefront purchase cannot be refunded in the current state.', 409);
    if (order.payment_status === 'refunded') return { order: orderSummary(order, billing), recorded: false };
    assert(order.payment_status === 'paid', 'custom_theme_refund_invalid', 'Only a verified paid storefront purchase can be marked refunded.', 409);
    const at = this.at();
    const eventId = `refund-${crypto.createHash('sha256').update(`${billing.provider_purchase_id}:${providerRefundReference.trim()}`).digest('hex')}`;
    const recorded = await this.store.transaction(async (transaction) => {
      const event = await transaction.createCustomThemePaymentEvent({ id: createId('ctp'), order_id: order.id, provider: billing.provider, provider_event_id: eventId, payment_status: 'refunded', amount_cents: order.amount_cents, currency: order.currency, received_at: at, processed_at: at });
      const current = await transaction.findCustomThemeOrderForProject(order.id, projectId, order.organization_id);
      const currentBilling = await transaction.findCustomThemeBillingPurchaseForOrder(order.id);
      if (!event.created || current.payment_status === 'refunded') return { order: current, billing: currentBilling, created: false };
      const updatedBilling = await transaction.updateCustomThemeBillingPurchase(order.id, { ...currentBilling, provider_status: 'REFUNDED', confirmation_url: currentBilling.confirmation_url, confirmation_url_status: currentBilling.confirmation_url_status, test_mode: currentBilling.test_mode, raw_event_digest: crypto.createHash('sha256').update(eventId).digest('hex'), verified_at: currentBilling.verified_at, cancelled_at: currentBilling.cancelled_at, refunded_at: at, failure_reason: reason ? String(reason).slice(0, 1000) : null, updated_at: at });
      const generationStatus = current.generation_status === 'not_started' || current.generation_status === 'queued' ? 'blocked' : current.generation_status;
      const updatedOrder = await transaction.updateCustomThemeOrder(order.id, projectId, order.organization_id, { ...current, payment_status: 'refunded', generation_status: generationStatus, failure_reason: generationStatus === 'blocked' ? 'This storefront purchase was refunded before package delivery.' : current.failure_reason, updated_at: at });
      return { order: updatedOrder, billing: updatedBilling, created: true };
    });
    return { order: orderSummary(recorded.order, recorded.billing), recorded: recorded.created };
  }
  async retryGeneration({ userId, projectId, orderId, requestId = null }) {
    const project = await this.authorize({ userId, projectId }); let order = await this.store.findCustomThemeOrderForProject(orderId, projectId, project.organization_id);
    if (!order) throw new DashboardError('custom_theme_order_not_found', 'This custom storefront order is not available.', 404);
    assert(order.payment_status === 'paid', 'custom_theme_payment_required', 'Shopify must confirm payment before Calinium can prepare your storefront.', 409);
    assert(['queued', 'generation_failed', 'validation_failed', 'blocked'].includes(order.generation_status), 'custom_theme_retry_invalid', 'This storefront order is already being prepared or is ready to download.', 409);
    if (!order.snapshot) {
      const session = await this.session(projectId); const eligibility = await this.evaluate({ project, session });
      const approvedBlockPlanTransport = await this.resolveApprovedBlockPlanTransport({ project, approvedBlockPlanRevisionId: order.approved_block_plan_revision_id, approvedResourceSnapshotRevisionId: order.approved_resource_snapshot_revision_id });
      const approvedPresetRevision = await this.resolveApprovedPresetForSession({ project, session });
      const approvedResourceSetRevision = await this.resolveApprovedResourceSetForSession({ project, session });
      const approvedCreativeDirection = await this.resolveApprovedCreativeDirectionForSession({ project, session });
      const architectureInputs = await this.resolveArchitectureInputs({ project, session });
      assert(eligibility.eligible && (approvedPresetRevision?.revision_id || null) === order.approved_preset_revision_id && isPriceForOrder(eligibility.price, order) && this.purchaseIntent({ session, eligibility, approvedBlockPlanTransport, approvedPresetRevision, approvedResourceSetRevision, approvedRecommendationRevision: approvedCreativeDirection.recommendation, approvedDesignDnaRevision: approvedCreativeDirection.designDna, ...architectureInputs }) === order.purchase_intent_checksum, 'custom_theme_review_required', 'Review Store Resources before Calinium can prepare this paid storefront.', 409);
      const snapshotAt = this.at();
      order = await this.store.transaction(async (transaction) => {
        const [freshSession, freshOrder] = await Promise.all([
          transaction.findCreativeDirectorForProject(projectId),
          transaction.findCustomThemeOrderForProject(order.id, projectId, project.organization_id)
        ]);
        assert(freshSession?.updated_at === session.updated_at, 'custom_theme_review_required', 'Review Store Resources before Calinium can prepare this paid storefront.', 409);
        if (freshOrder?.snapshot) return freshOrder;
        assert(freshOrder?.payment_status === 'paid' && ['queued', 'generation_failed', 'validation_failed', 'blocked'].includes(freshOrder.generation_status), 'custom_theme_retry_invalid', 'This storefront order cannot be retried in its current state.', 409);
        const snapshot = this.snapshot({ project, session, eligibility, order: freshOrder, at: snapshotAt, approvedBlockPlanTransport, approvedPresetRevision, approvedResourceSetRevision, approvedRecommendationRevision: approvedCreativeDirection.recommendation, approvedDesignDnaRevision: approvedCreativeDirection.designDna, ...architectureInputs });
        return transaction.updateCustomThemeOrder(order.id, projectId, project.organization_id, { ...freshOrder, generation_status: 'queued', snapshot_id: snapshot.snapshot_id, snapshot, snapshot_checksum: snapshot.checksum, failure_reason: null, updated_at: snapshotAt });
      });
      if (this.merchantFlowService) await this.merchantFlowService.bindPaidOrder({ project, order });
    }
    return this.queueOrProcessOrder({ userId, project, order, requestId });
  }
  async queueOrProcessOrder({ userId, project, order, requestId = null }) {
    if (!this.merchantFlowJobRunner || !this.merchantFlowService) return this.processOrder({ userId, project, order, requestId });
    const provenance = await this.merchantFlowService.generationProvenance({ project });
    if (!provenance?.flow_id) throw new DashboardError('merchant_flow_required', 'Start the storefront preparation flow before generation.', 409);
    const identity = jobIdentity({ flowId: provenance.flow_id, kind: 'generation', orderId: order.id });
    const queued = await this.merchantFlowJobRunner.enqueue({
      identity, projectId: project.id, organizationId: project.organization_id, sequence: 0,
      payload: { flow_id: provenance.flow_id, project_id: project.id, organization_id: project.organization_id, order_id: order.id }
    });
    const billing = await this.store.findCustomThemeBillingPurchaseForOrder(order.id);
    return { order: orderSummary(order, billing), resumed: !queued.created, job: { job_id: queued.job.id, kind: queued.job.job_kind, status: queued.job.status } };
  }
  async processQueuedOrder(job, control = null) {
    if (control) await control.checkpoint();
    const project = await this.store.findProjectById(job.project_id);
    if (!project || project.organization_id !== job.organization_id) throw Object.assign(new Error('The generation job no longer belongs to this project.'), { code: 'merchant_flow_ownership_mismatch', retryable: false });
    const order = await this.store.findCustomThemeOrderForProject(job.payload.order_id, project.id, project.organization_id);
    if (!order) throw Object.assign(new Error('The bound paid generation is unavailable.'), { code: 'custom_theme_order_not_found', retryable: false });
    try {
      const result = await this.processOrder({ userId: order.merchant_user_id, project, order, requestId: job.id, control });
      if (control) await control.checkpoint();
      const current = await this.store.findCustomThemeOrderForProject(order.id, project.id, project.organization_id);
      if (['generation_failed', 'validation_failed', 'blocked'].includes(current.generation_status)) throw Object.assign(new Error('Generation did not complete.'), { code: current.generation_status, retryable: current.payment_status === 'paid' });
      return { flow_id: job.flow_id, project_id: project.id, organization_id: project.organization_id, order_id: order.id, generation_id: result.order?.validation_result?.artifact_integrity?.generation_id || null, status: current.generation_status, job_id: job.id };
    } catch (error) {
      const cancelled = error?.code === 'merchant_flow_job_cancelled' || (control ? await control.isCancellationRequested() : false);
      if (cancelled) await this.projectCancelledMerchantFlow({ project, flow: { paid_identity: { order_id: order.id } } });
      throw error;
    }
  }
  async processOrder({ userId, project, order, requestId = null, control = null }) {
    if (control) await control.checkpoint();
    if (order.generation_status === 'ready') return { order: orderSummary(order, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: true };
    assert(order.payment_status === 'paid' && order.snapshot, 'custom_theme_payment_required', 'Shopify must confirm payment before Calinium can prepare your storefront.', 409);
    const storedSnapshot = { ...(order.snapshot || {}) }; const snapshotChecksum = storedSnapshot.checksum; delete storedSnapshot.checksum;
    if (!snapshotChecksum || snapshotChecksum !== order.snapshot_checksum || checksum(storedSnapshot) !== snapshotChecksum) {
      const blocked = await this.updateOrder(order, project, { generation_status: 'blocked', failure_reason: 'The approved storefront inputs could not be verified. Review the custom storefront offer before continuing.' }); return { order: orderSummary(blocked, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: false };
    }
    if (sourceThemeChanged(this.root, order.snapshot)) {
      const blocked = await this.updateOrder(order, project, { generation_status: 'blocked', failure_reason: 'Calinium One changed after this purchase. Review is required before creating a storefront package.' }); return { order: orderSummary(blocked, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: false };
    }
    const at = this.at();
    const claimed = await this.store.claimCustomThemeGeneration(order.id, project.id, project.organization_id, {
      generation_status: 'specification_building', failure_reason: null, updated_at: at
    });
    if (!claimed) {
      const current = await this.store.findCustomThemeOrderForProject(order.id, project.id, project.organization_id);
      return { order: orderSummary(current, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: true };
    }
    order = claimed;
    const previous = await this.store.findLatestCustomThemeGenerationRun(order.id);
    const run = await this.store.createCustomThemeGenerationRun({ id: createId('ctg'), order_id: order.id, attempt: (previous?.attempt || 0) + 1, generation_status: 'specification_building', progress: [{ status: 'queued', at }, { status: 'specification_building', at }], output_reference: null, failure_reason: null, started_at: at, completed_at: null, updated_at: at });
    await this.activity(project, userId, 'custom_theme_generation_started', { order_id: order.id, attempt: run.attempt });
    try {
      const snapshot = order.snapshot; const approvedBlockPlanTransport = this.transportFromSnapshot({ project, order, snapshot }); const approvedPresetRevision = this.presetFromSnapshot({ project, order, snapshot }); const approvedCreativeDirection = this.recommendationDesignService ? this.recommendationDesignService.fromSnapshot({ project, snapshot }) : { recommendation: null, designDna: null }; const architectureInputs = this.architectureFromSnapshot(snapshot); const started = this.at();
      await this.store.updateCustomThemeGenerationRun(run.id, { generation_status: 'package_generating', progress: [...run.progress, { status: 'package_generating', at: started }], output_reference: null, failure_reason: null, completed_at: null, updated_at: started });
      order = await this.updateOrder(order, project, { generation_status: 'package_generating', failure_reason: null });
      const generationId = `generation-run-order-${order.id.slice(4)}-attempt-${run.attempt}`;
      if (this.merchantFlowService) await this.merchantFlowService.generationStarted({ project, order, generationId });
      if (control) await control.checkpoint();
      const paidGenerationContext = await this.generationContextFromPaidSnapshot({ project, snapshot });
      if (control) await control.checkpoint();
      const result = await this.generator({ creativeBrief: snapshot.creative_brief, storeStrategy: snapshot.store_strategy, review: snapshot.review, generation: paidGenerationContext, resourcePlan: snapshot.resource_plan, approvedBlockPlanTransport, approvedPresetRevision, approvedRecommendationRevision: approvedCreativeDirection.recommendation, approvedDesignDnaRevision: approvedCreativeDirection.designDna, ...architectureInputs, generationId });
      const packageResult = result?.read_only_theme_package;
      if (result?.status !== 'generated_for_review' || !packageResult?.validation?.valid) throw Object.assign(new Error(packageResult?.validation?.errors?.join(' ') || result?.next_step || 'The approved storefront inputs could not be turned into a validated package.'), { validation: packageResult?.validation || null });
      assert(packageResult?.manifest?.generation_id === generationId, 'theme_artifact_generation_mismatch', 'The generated storefront artifacts do not belong to this generation attempt.', 500);
      const validatingAt = this.at(); await this.store.updateCustomThemeGenerationRun(run.id, { generation_status: 'validating', progress: [...run.progress, { status: 'package_generating', at: started }, { status: 'validating', at: validatingAt }], output_reference: relativeOutputPath(this.root, packageResult.workspace), failure_reason: null, completed_at: null, updated_at: validatingAt });
      const workspace = packageResult.workspace; const metadataPath = path.join(workspace, 'manifests', 'custom-theme-generation-metadata.json');
      const generatedManifest = result.generated_theme?.manifest || {};
      const merchantFlowProvenance = this.merchantFlowService && typeof this.merchantFlowService.generationProvenance === 'function' ? await this.merchantFlowService.generationProvenance({ project }) : null;
      const metadata = { version: 1, order_id: order.id, snapshot_id: order.snapshot_id, snapshot_checksum: order.snapshot_checksum, generation_id: packageResult.manifest.generation_id, source_theme: order.source_theme, approved_block_plan_provenance: generatedManifest.approved_block_plan_provenance || null, approved_preset_provenance: generatedManifest.approved_preset_provenance || null, approved_resource_set_provenance: approvedResourceSetProvenance(snapshot.approved_resource_set_revision), approved_recommendation_provenance: generatedManifest.approved_recommendation_provenance || null, approved_design_dna_provenance: generatedManifest.approved_design_dna_provenance || null, content_plan_provenance: snapshot.content_plan_eligibility ? { policy_version: snapshot.content_plan_eligibility.policy_version, revision_id: snapshot.content_plan_eligibility.revision_id, checksum: snapshot.content_plan_eligibility.checksum, effective_composition_checksum: snapshot.content_plan_eligibility.effective_composition_checksum, stage_resolution_reference: snapshot.content_plan_eligibility.stage_resolution_reference } : null, architecture_selection: generatedManifest.architecture_selection || null, merchant_flow_provenance: merchantFlowProvenance, generated_at: validatingAt, read_only: true, shopify_operations: packageResult.manifest.shopify_operations };
      fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, { mode: 0o600 });
      const artifacts = { theme_zip: relativeOutputPath(this.root, packageResult.archive_path), theme_specification: relativeOutputPath(this.root, path.join(workspace, 'manifests', 'theme-specification.json')), validation_report: relativeOutputPath(this.root, path.join(workspace, 'reports', 'theme-package-validation.json')), package_manifest: relativeOutputPath(this.root, path.join(workspace, 'manifests', 'read-only-theme-package.json')), generation_metadata: relativeOutputPath(this.root, metadataPath) };
      const readyAt = this.at();
      const artifactIntegrity = await this.finalizeArtifactDurability({ project, order, artifacts, generationId, at: readyAt });
      if (control) await control.checkpoint();
      order = await this.updateOrder(order, project, { generation_status: 'ready', artifacts, validation_result: { ...packageResult.validation, artifact_integrity: artifactIntegrity }, generated_at: readyAt, failure_reason: null });
      await this.store.updateCustomThemeGenerationRun(run.id, { generation_status: 'ready', progress: [...run.progress, { status: 'package_generating', at: started }, { status: 'validating', at: validatingAt }, { status: 'ready', at: readyAt }], output_reference: relativeOutputPath(this.root, workspace), failure_reason: null, completed_at: readyAt, updated_at: readyAt });
      const session = await this.store.findCreativeDirectorForProject(project.id);
      if (session) await this.store.updateCreativeDirector(project.id, { ...session, stage: 'delivery', generation_state: { ...session.generation_state, status: 'ready', order_id: order.id, generated_at: readyAt, error: null, stages: [{ id: 'purchase', status: 'complete', completed_at: order.paid_at, detail: 'Payment confirmed.' }, { id: 'package', status: 'complete', completed_at: readyAt, detail: 'Validated storefront package ready.' }] }, updated_at: readyAt });
      await this.activity(project, userId, 'custom_theme_generation_ready', { order_id: order.id, generation_id: packageResult.manifest.generation_id });
      const cancelledAfterGeneration = control ? await control.isCancellationRequested() : false;
      if (cancelledAfterGeneration) throw Object.assign(new Error('The merchant-flow job was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
      if (this.merchantFlowService && !cancelledAfterGeneration) await this.merchantFlowService.artifactReady({
        project,
        order,
        generationId,
        artifact: {
          artifact_id: `theme-artifact-${artifactIntegrity.artifacts.theme_zip.sha256.slice(0, 20)}`,
          reference: artifactIntegrity.artifacts.theme_zip.reference,
          checksum: artifactIntegrity.artifacts.theme_zip.sha256,
          generation_id: generationId
        }
      });
      return { order: orderSummary(order, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: false };
    } catch (error) {
      const cancellationRequested = error?.code === 'merchant_flow_job_cancelled' || (control ? await control.isCancellationRequested() : false);
      if (cancellationRequested) {
        const stoppedAt = this.at();
        order = await this.updateOrder(order, project, { generation_status: 'blocked', failure_reason: 'Storefront preparation was stopped safely. Payment and approved inputs were not changed.' });
        await this.store.updateCustomThemeGenerationRun(run.id, { generation_status: 'blocked', progress: [...run.progress, { status: 'blocked', at: stoppedAt }], output_reference: run.output_reference || null, failure_reason: 'Storefront preparation was stopped safely.', completed_at: stoppedAt, updated_at: stoppedAt });
        await this.activity(project, userId, 'custom_theme_generation_stopped', { order_id: order.id });
        throw Object.assign(new Error('The merchant-flow job was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
      }
      const status = error.validation ? 'validation_failed' : 'generation_failed'; const failedAt = this.at(); const failure = safeFailureDetails(error, order.generation_status || 'package_generating', requestId);
      if (this.merchantFlowService && typeof this.merchantFlowService.generationFailed === 'function') await this.merchantFlowService.generationFailed({ project, generationId: `generation-run-order-${order.id.slice(4)}-attempt-${run.attempt}` });
      this.captureFailure({ order, project, failure, error, run });
      const validationResult = error.validation ? { ...error.validation, operation_failure: failure } : { operation_failure: failure };
      const failed = await this.updateOrder(order, project, { generation_status: status, failure_reason: failure.message, validation_result: validationResult });
      await this.store.updateCustomThemeGenerationRun(run.id, { generation_status: status, progress: [...run.progress, { status, at: failedAt }], output_reference: null, failure_reason: failure.message, completed_at: failedAt, updated_at: failedAt });
      await this.activity(project, userId, 'custom_theme_generation_failed', { order_id: order.id, status, failure });
      return { order: orderSummary(failed, await this.store.findCustomThemeBillingPurchaseForOrder(order.id)), resumed: false };
      }
  }

  async projectCancelledMerchantFlow({ project, flow }) {
    const orderId = flow?.paid_identity?.order_id;
    if (!orderId) return null;
    const order = await this.store.findCustomThemeOrderForProject(orderId, project.id, project.organization_id);
    if (!order || ['blocked', 'generation_failed', 'validation_failed'].includes(order.generation_status)) return order;
    if (!['queued', 'specification_building', 'package_generating', 'validating', 'ready'].includes(order.generation_status)) return order;
    const at = this.at();
    const blocked = await this.updateOrder(order, project, {
      generation_status: 'blocked',
      failure_reason: 'Storefront preparation was stopped safely. Payment and approved inputs were not changed.'
    });
    const run = await this.store.findLatestCustomThemeGenerationRun(order.id);
    if (run && !['blocked', 'generation_failed', 'validation_failed'].includes(run.generation_status)) {
      await this.store.updateCustomThemeGenerationRun(run.id, {
        generation_status: 'blocked',
        progress: [...(run.progress || []), { status: 'blocked', at }],
        output_reference: run.output_reference || null,
        failure_reason: 'Storefront preparation was stopped safely.',
        completed_at: at,
        updated_at: at
      });
    }
    return blocked;
  }
  captureFailure({ order, project, failure, error, run = null }) {
    // Diagnostics are server-only, development-only, and deliberately never
    // become downloadable theme artifacts or API payloads. They retain a
    // redacted stack for local incident investigation without exposing secrets.
    if (this.env.NODE_ENV !== 'development' && this.env.CALINIUM_CAPTURE_OPERATION_DIAGNOSTICS !== 'true') return;
    try {
      const directory = path.join(this.root, 'output', 'custom-theme-diagnostics');
      fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
      const name = `${order.id}-${failure.request_id || run?.id || 'failure'}.json`.replace(/[^A-Za-z0-9_.-]/g, '-');
      fs.writeFileSync(path.join(directory, name), `${JSON.stringify({ version: 1, recorded_at: this.at(), project_id: project.id, order_id: order.id, generation_run_id: run?.id || null, failure, stack: safeStack(error, this.root) }, null, 2)}\n`, { mode: 0o600 });
    } catch {
      // Failure diagnostics must never mask a billing or generation result.
    }
  }
  async updateOrder(order, project, updates) { return this.store.updateCustomThemeOrder(order.id, project.id, project.organization_id, { ...order, ...updates, updated_at: this.at() }); }
  async readArtifact({ userId, projectId, orderId, artifact }) {
    const project = await this.authorize({ userId, projectId, permission: 'project:view' }); const order = await this.store.findCustomThemeOrderForProject(orderId, projectId, project.organization_id);
    if (!order) throw new DashboardError('custom_theme_order_not_found', 'This custom storefront order is not available.', 404);
    if (this.merchantFlowService && typeof this.merchantFlowService.requirePreviewReady === 'function') await this.merchantFlowService.requirePreviewReady({ project, order });
    const descriptor = ARTIFACTS[artifact];
    if (!descriptor || !order.artifacts?.[descriptor.key]) {
      await this.activity(project, userId, 'custom_theme_artifact_download_failed', { order_id: order.id, artifact: String(artifact || 'unknown').slice(0, 80), reason: 'not_available' });
      throw new DashboardError('theme_artifact_not_found', 'This storefront download is not available yet.', 404);
    }
    const integrity = order.validation_result?.artifact_integrity;
    const expected = integrity?.artifacts?.[descriptor.key];
    const reference = order.artifacts[descriptor.key];
    const productionRequiresDurable = this.env.CALINIUM_ENVIRONMENT === 'production';
    const integrityValid = order.generation_status === 'ready'
      && order.validation_result?.valid === true
      && integrity?.version === 1
      && integrity.order_id === order.id
      && typeof integrity.generation_id === 'string'
      && expected?.reference === reference
      && Number.isSafeInteger(expected?.size_bytes)
      && /^[a-f0-9]{64}$/.test(String(expected?.sha256 || ''))
      && reference.startsWith(`${integrity.generation_id}/`)
      && (!productionRequiresDurable || expected?.durable_reference?.reference_version === 'calinium-durable-object-reference-v1');
    if (!integrityValid) return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: 'metadata_invalid' });
    const file = artifactPath(this.root, reference);
    let buffer;
    try {
      if (expected.durable_reference && this.authoritativeObjectService) {
        const connection = order.shopify_connection_id
          ? await this.store.findShopifyConnectionForOrganization(order.shopify_connection_id, project.organization_id)
          : null;
        const scope = { organization_id: project.organization_id, project_id: project.id, connection_id: connection?.id || null, canonical_shop: connection?.shop_domain || null };
        if (this.env.CALINIUM_ENVIRONMENT !== 'production' && fs.existsSync(file)) {
          buffer = fs.readFileSync(file);
        } else {
          buffer = await this.authoritativeObjectService.read({ scope, reference: expected.durable_reference });
          if (!fs.existsSync(file)) await this.authoritativeObjectService.materialize({ scope, reference: expected.durable_reference, target: file });
        }
      } else {
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: 'file_missing' });
        buffer = fs.readFileSync(file);
      }
    } catch (error) {
      if (String(error?.code || '').startsWith('storage_provider_') || error?.retryable === true) {
        throw new DashboardError('theme_artifact_storage_unavailable', 'This storefront file is safely recorded but durable storage is temporarily unavailable.', 503);
      }
      return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: error?.code || 'file_missing' });
    }
    const digest = crypto.createHash('sha256').update(buffer).digest('hex');
    if (buffer.length !== expected.size_bytes || digest !== expected.sha256) return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: 'digest_mismatch' });
    if (artifact === 'theme-zip') {
      try {
        const index = JSON.parse(execFileSync('unzip', ['-p', file, 'templates/index.json'], {
          encoding: 'utf8',
          maxBuffer: 5 * 1024 * 1024,
          env: withoutShopifyStorefrontPassword(process.env)
        }));
        if (containsPrivateRuntimeReference(index)) return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: 'private_runtime_reference' });
      } catch {
        return this.rejectArtifactIntegrity({ project, userId, order, artifact, reason: 'package_unreadable' });
      }
    }
    await this.activity(project, userId, 'custom_theme_artifact_downloaded', { order_id: order.id, artifact });
    return { file, buffer, filename: descriptor.filename, content_type: descriptor.contentType };
  }
  async rejectArtifactIntegrity({ project, userId, order, artifact, reason }) {
    const at = this.at();
    const message = 'This theme file could not be verified for download. Your generation record is safe, and the file can be recovered without changing your design.';
    try {
      await this.store.transaction(async (transaction) => {
        const current = await transaction.findCustomThemeOrderForProject(order.id, project.id, project.organization_id);
        if (!current || current.generation_status !== 'ready') return;
        const failure = { stage: 'artifact_delivery', code: 'theme_artifact_integrity_failed', message };
        await transaction.updateCustomThemeOrder(current.id, project.id, project.organization_id, {
          ...current,
          generation_status: 'validation_failed',
          validation_result: {
            ...(current.validation_result || {}),
            valid: false,
            operation_failure: failure
          },
          failure_reason: message,
          updated_at: at
        });
        const run = await transaction.findLatestCustomThemeGenerationRun(current.id);
        if (run?.generation_status === 'ready') {
          await transaction.updateCustomThemeGenerationRun(run.id, {
            ...run,
            generation_status: 'validation_failed',
            progress: [...(run.progress || []), { status: 'validation_failed', at }],
            failure_reason: message,
            completed_at: run.completed_at || at,
            updated_at: at
          });
        }
        const session = await transaction.findCreativeDirectorForProject(project.id);
        if (session?.stage === 'delivery' && session.generation_state?.order_id === current.id) {
          await transaction.updateCreativeDirector(project.id, {
            ...session,
            stage: 'offer',
            generation_state: {
              ...session.generation_state,
              status: 'validation_failed',
              order_id: current.id,
              error: message
            },
            updated_at: at
          });
        }
      });
      await this.activity(project, userId, 'custom_theme_artifact_integrity_failed', { order_id: order.id, artifact, reason });
    }
    catch { /* Integrity failure reporting must not make an untrusted artifact downloadable. */ }
    throw new DashboardError('theme_artifact_integrity_failed', message, 409);
  }
  async summary({ userId, projectId }) { const current = await this.eligibility({ userId, projectId }); const latest = await this.latest({ userId, projectId }); return { ...current, order: latest.order }; }
  async activity(project, userId, type, payload) { await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type, payload, created_at: this.at() }); }
}

module.exports = { CustomThemeService, ARTIFACTS, EMPTY_ARTIFACTS, orderSummary, relativeOutputPath, artifactPath, artifactDigest, finalizeArtifactIntegrity, isPriceForOrder, snapshotGenerationContext };
