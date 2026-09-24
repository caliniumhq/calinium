'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { INDUSTRY_SIGNALS } = require('../../../../ai/understanding/extract-business-understanding');

const NORMALIZATION_VERSION = 'store-intelligence-v1';
const DEFAULT_REFRESH_AGE_MS = 24 * 60 * 60 * 1000;
const RUN_STALE_MS = 5 * 60 * 1000;
const CONFIDENCE = Object.freeze({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', UNKNOWN: 'Unknown' });
const CATEGORY_LABELS = Object.freeze({
  beauty: { label: 'Beauty and personal care', offer: 'beauty and personal care products' },
  luxury_fashion: { label: 'Fashion and accessories', offer: 'fashion and accessories' },
  furniture: { label: 'Home and interiors', offer: 'home and interior products' },
  electronics: { label: 'Electronics', offer: 'electronics and devices' },
  food_beverage: { label: 'Food and beverage', offer: 'food and beverage products' },
  digital_products: { label: 'Digital products', offer: 'digital products' }
});
const SENSITIVE_SIGNALS = Object.freeze([
  ['handmade_or_artisan', /handmade|handcrafted|artisan/i],
  ['origin', /made in|sourced from|origin/i],
  ['sustainability', /sustainab|eco[- ]?friendly|carbon neutral|organic/i],
  ['award_or_certification', /award|certif|accredited/i],
  ['testimonial_or_result', /testimonial|reviews?|customer results?|clinically proven|best[- ]?sell(?:er|ing)?|(?:five|5)[- ]?star|\b[\d,]+\s+customers?|family[- ]?owned/i]
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function available(resources, type) { return resources.filter((item) => item.resource_type === type && item.availability_status === 'available'); }
function boundedNames(resources, maximum = 5) { return resources.map((item) => item.display_title).filter(Boolean).slice(0, maximum); }
function safeErrors(syncRun) {
  return (syncRun?.errors || []).map((item) => ({ resource_type: String(item.resource_type || 'unknown'), code: String(item.code || 'unavailable') })).sort((left, right) => `${left.resource_type}:${left.code}`.localeCompare(`${right.resource_type}:${right.code}`));
}
function categoryFromCatalog(products, collections) {
  const entries = [...products, ...collections].map((item) => String(item.display_title || '').trim()).filter(Boolean);
  if (!entries.length) return { id: null, label: null, offer: null, confidence: CONFIDENCE.UNKNOWN, evidence_count: 0 };
  const ranked = INDUSTRY_SIGNALS.map((signal) => ({ signal, count: entries.filter((entry) => signal.expression.test(entry)).length }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.signal.id.localeCompare(right.signal.id));
  if (!ranked.length) return { id: null, label: null, offer: null, confidence: CONFIDENCE.UNKNOWN, evidence_count: 0 };
  const winner = ranked[0];
  const ratio = winner.count / entries.length;
  const confidence = (winner.count >= 2 && ratio >= 0.4) || (entries.length === 1 && winner.count === 1) ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM;
  const publicLabel = CATEGORY_LABELS[winner.signal.id] || { label: winner.signal.id.replaceAll('_', ' '), offer: winner.signal.id.replaceAll('_', ' ') };
  return { id: winner.signal.id, ...publicLabel, confidence, evidence_count: winner.count };
}
function sensitiveObservations(resources) {
  const searchable = resources.filter((item) => ['product', 'collection', 'file'].includes(item.resource_type));
  return SENSITIVE_SIGNALS.map(([kind, expression]) => ({ kind, count: searchable.filter((item) => expression.test(item.display_title || '')).length }))
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, status: 'requires_merchant_confirmation' }));
}
function freshnessFor(connection, clock, refreshAgeMs) {
  const timestamp = connection?.last_synced_at ? new Date(connection.last_synced_at).getTime() : NaN;
  if (!Number.isFinite(timestamp)) return 'unknown';
  return clock().getTime() - timestamp > refreshAgeMs ? 'stale' : 'current';
}
function normalizeIntelligence({ connection, resources, approvals, fileMetadata, assets, syncRun, clock, refreshAgeMs }) {
  const products = available(resources, 'product');
  const variants = available(resources, 'variant');
  const collections = available(resources, 'collection');
  const productMedia = available(resources, 'product_media');
  const files = available(resources, 'file');
  const menus = available(resources, 'menu');
  const themes = available(resources, 'theme');
  const markets = available(resources, 'market');
  const category = categoryFromCatalog(products, collections);
  const usableImages = [...productMedia, ...files].filter((item) => item.preview_url && String(item.metadata?.media_type || item.resource_status || 'IMAGE').toUpperCase() !== 'VIDEO');
  const videos = files.filter((item) => String(item.metadata?.media_type || '').toUpperCase() === 'VIDEO');
  const readyAssets = assets.filter((item) => item.upload_status === 'ready');
  const logoResourceIds = new Set(fileMetadata.filter((item) => ['logo', 'alternate_logo'].includes(item.asset_category)).map((item) => item.resource_id));
  const approved = approvals.filter((item) => item.approval_status === 'approved');
  const errors = safeErrors(syncRun);
  const status = errors.length ? 'partial' : 'usable';
  const intelligence = {
    version: 1,
    source: 'shopify_authoritative_store_data',
    status,
    category,
    catalog: {
      product_count: products.length,
      active_product_count: products.filter((item) => String(item.resource_status || '').toUpperCase() === 'ACTIVE').length,
      variant_count: variants.length,
      available_variant_count: variants.filter((item) => item.metadata?.available_for_sale).length,
      collection_count: collections.length,
      representative_products: boundedNames(products),
      representative_collections: boundedNames(collections)
    },
    navigation: {
      menu_count: menus.length,
      representative_menus: boundedNames(menus, 3),
      link_count: menus.reduce((count, item) => count + Number(item.metadata?.item_count || 0), 0),
      confidence: menus.length ? CONFIDENCE.HIGH : CONFIDENCE.UNKNOWN
    },
    media: {
      product_media_count: productMedia.length,
      shopify_file_count: files.length,
      usable_image_count: usableImages.length,
      video_count: videos.length,
      project_asset_count: readyAssets.length,
      logo_candidate_count: logoResourceIds.size + readyAssets.filter((item) => item.asset_type === 'logo').length,
      confidence: usableImages.length ? CONFIDENCE.HIGH : files.length || readyAssets.length ? CONFIDENCE.MEDIUM : CONFIDENCE.UNKNOWN
    },
    store: {
      canonical_shop_domain: connection.shop_domain,
      display_name: connection.display_name || null,
      storefront_available: Boolean(connection.storefront_url),
      market_count: markets.length,
      enabled_market_count: markets.filter((item) => String(item.resource_status || '').toLowerCase() === 'enabled').length,
      theme_count: themes.length,
      unpublished_theme_count: themes.filter((item) => ['DEVELOPMENT', 'UNPUBLISHED'].includes(String(item.metadata?.role || item.resource_status || '').toUpperCase())).length
    },
    approvals: {
      approved_resource_count: approved.length,
      approved_resource_types: [...new Set(approved.map((item) => resources.find((resource) => resource.id === item.resource_id)?.resource_type).filter(Boolean))].sort()
    },
    source_health: {
      freshness: freshnessFor(connection, clock, refreshAgeMs),
      sync_status: syncRun?.status || 'not_run',
      unavailable_sources: errors.map((item) => item.resource_type),
      errors
    },
    sensitive_observations: sensitiveObservations(resources)
  };
  const fingerprintEvidence = {
    normalization_version: NORMALIZATION_VERSION,
    shop_domain: connection.shop_domain,
    resources: resources.map((item) => [item.resource_type, item.source_revision, item.availability_status]).sort((left, right) => left.join('|').localeCompare(right.join('|'))),
    project_assets: readyAssets.map((item) => [item.asset_type, item.checksum_sha256, item.processing_state]).sort((left, right) => left.join('|').localeCompare(right.join('|'))),
    approvals: approvals.map((item) => [item.resource_id, item.source_revision, item.approval_status]).sort((left, right) => left.join('|').localeCompare(right.join('|'))),
    source_errors: errors
  };
  return { intelligence, fingerprint: digest(fingerprintEvidence), status, errors };
}

class AutomaticMerchantIntakeService {
  constructor({ store, projectService, shopifyService, clock = () => new Date(), env = process.env }) {
    this.store = store;
    this.projectService = projectService;
    this.shopifyService = shopifyService;
    this.clock = clock;
    const configuredAge = Number(env.CALINIUM_INTAKE_REFRESH_MAX_AGE_MS || DEFAULT_REFRESH_AGE_MS);
    this.refreshAgeMs = Number.isFinite(configuredAge) && configuredAge >= 5 * 60 * 1000 && configuredAge <= 7 * DEFAULT_REFRESH_AGE_MS ? configuredAge : DEFAULT_REFRESH_AGE_MS;
    this.active = new Map();
  }
  now() { return isoNow(this.clock); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async assignment(project) { return this.store.findProjectShopifyConnection(project.id, project.organization_id); }
  async evidence(project, connection) {
    const [resources, approvals, fileMetadata, assets, syncRun] = await Promise.all([
      this.store.listShopifyResources(connection.id),
      this.store.listShopifyResourceApprovals(project.id),
      this.store.listShopifyFileCandidateMetadata(project.id, connection.id),
      this.store.listAssetsForProject(project.id, project.organization_id),
      this.store.latestShopifySyncRun(connection.id)
    ]);
    return { resources, approvals, fileMetadata, assets, syncRun };
  }
  shouldRefresh(connection, state, force) {
    if (force) return true;
    if (!state?.current_revision_id) return true;
    return freshnessFor(connection, this.clock, this.refreshAgeMs) === 'stale';
  }
  publicStatus(state, revision, connection) {
    if (!connection) return { version: 1, status: 'not_available', label: 'Store learning unavailable', usable: false, retry_available: false, revision_id: null, last_success_at: null, summary: null };
    let status = state?.status || 'not_started';
    if (revision && status !== 'learning' && freshnessFor(connection, this.clock, this.refreshAgeMs) === 'stale') status = 'stale';
    const labels = {
      not_started: 'Preparing store learning', learning: 'Learning from your Shopify store', usable: 'Store learning ready', partial: 'Store learning needs attention', stale: 'Store learning can be refreshed', refresh_failed: 'Store learning could not refresh'
    };
    const intelligence = revision?.store_intelligence || null;
    return {
      version: 1,
      status,
      label: labels[status] || labels.not_started,
      usable: Boolean(revision && ['usable', 'partial', 'stale', 'refresh_failed'].includes(status)),
      retry_available: ['partial', 'stale', 'refresh_failed'].includes(status),
      revision_id: revision?.revision_id || null,
      confidence: intelligence?.category?.confidence || CONFIDENCE.UNKNOWN,
      last_success_at: state?.last_success_at || null,
      summary: intelligence ? {
        products: intelligence.catalog.product_count,
        collections: intelligence.catalog.collection_count,
        media: intelligence.media.usable_image_count,
        menus: intelligence.navigation.menu_count,
        category: intelligence.category.label,
        unavailable_sources: intelligence.source_health.unavailable_sources
      } : null
    };
  }
  async get({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.assignment(project);
    if (!assignment?.connection) return this.publicStatus(null, null, null);
    const state = await this.store.findMerchantIntakeState(projectId);
    const revision = state?.current_revision_id ? await this.store.findMerchantIntakeRevision(state.current_revision_id, projectId) : null;
    return this.publicStatus(state, revision, assignment.connection);
  }
  async begin({ userId, projectId, force = false, awaitCompletion = false, useCurrentEvidence = false, trigger = 'automatic' }) {
    const project = await this.authorize({ userId, projectId, permission: force ? 'interview:edit' : 'project:view' });
    const assignment = await this.assignment(project);
    if (!assignment?.connection) return this.publicStatus(null, null, null);
    const connection = assignment.connection;
    const existingState = await this.store.findMerchantIntakeState(projectId);
    const needsWork = useCurrentEvidence || this.shouldRefresh(connection, existingState, force);
    const learningIsFresh = existingState?.status === 'learning' && new Date(existingState.updated_at).getTime() >= this.clock().getTime() - RUN_STALE_MS;
    if (!needsWork || learningIsFresh) {
      if (awaitCompletion && existingState?.status === 'learning' && this.active.has(projectId)) await this.active.get(projectId);
      return this.get({ userId, projectId });
    }
    const at = this.now();
    const run = { id: createId('mir'), project_id: projectId, connection_id: connection.id, initiated_by_user_id: userId, trigger_type: trigger, started_at: at };
    const claim = await this.store.transaction((transactionStore) => transactionStore.claimMerchantIntakeRun({
      state: { project_id: projectId, connection_id: connection.id, last_attempt_at: at },
      run,
      staleBefore: new Date(this.clock().getTime() - RUN_STALE_MS).toISOString()
    }));
    if (claim.claimed) {
      const execution = this.execute({ project, userId, connection, run, refreshRemote: !useCurrentEvidence });
      const work = execution
        .catch(() => null)
        .finally(() => { if (this.active.get(projectId) === work) this.active.delete(projectId); });
      this.active.set(projectId, work);
      if (awaitCompletion) await execution;
    } else if (awaitCompletion && this.active.has(projectId)) await this.active.get(projectId);
    return this.get({ userId, projectId });
  }
  async execute({ project, userId, connection, run, refreshRemote }) {
    let syncResult = null;
    try {
      if (refreshRemote) syncResult = await this.shopifyService.synchronize({ userId, projectId: project.id, connectionId: connection.id });
      const refreshedAssignment = await this.assignment(project);
      const currentConnection = refreshedAssignment?.connection || connection;
      const bundle = await this.evidence(project, currentConnection);
      const normalized = normalizeIntelligence({ connection: currentConnection, ...bundle, clock: this.clock, refreshAgeMs: this.refreshAgeMs });
      const current = await this.store.latestMerchantIntakeRevision(project.id);
      const sourceSyncRunId = syncResult?.sync_run?.id || bundle.syncRun?.id || null;
      let revision = current;
      let runStatus = normalized.status === 'usable' ? 'completed' : 'partial';
      await this.store.transaction(async (transactionStore) => {
        if (!current || current.evidence_fingerprint !== normalized.fingerprint) {
          revision = await transactionStore.createMerchantIntakeRevision({
            revision_id: createId('miv'), project_id: project.id, connection_id: currentConnection.id,
            parent_revision_id: current?.revision_id || null, normalization_version: NORMALIZATION_VERSION,
            evidence_fingerprint: normalized.fingerprint, intake_status: normalized.status,
            store_intelligence: normalized.intelligence,
            provenance: { version: 1, source_authority: 'Shopify Admin API via normalized project resources', source_sync_run_id: sourceSyncRunId, normalization_version: NORMALIZATION_VERSION },
            source_sync_run_id: sourceSyncRunId, created_at: this.now()
          });
        } else if (normalized.status === 'usable') runStatus = 'unchanged';
        await transactionStore.completeMerchantIntakeRun({
          runId: run.id, projectId: project.id, status: runStatus, revisionId: revision?.revision_id || null,
          sourceSyncRunId, errors: normalized.errors, completedAt: this.now(), successfulAt: this.now()
        });
      });
      await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type: revision?.revision_id === current?.revision_id ? 'merchant_intake_reused' : 'merchant_intake_revised', payload: { status: normalized.status, source_count: 7 }, created_at: this.now() });
      return revision;
    } catch (error) {
      const safeCode = error instanceof DashboardError ? error.code : 'store_intelligence_unavailable';
      await this.store.transaction((transactionStore) => transactionStore.completeMerchantIntakeRun({ runId: run.id, projectId: project.id, status: 'failed', errors: [{ resource_type: 'shopify', code: safeCode }], completedAt: this.now() }));
      await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type: 'merchant_intake_refresh_failed', payload: { code: safeCode }, created_at: this.now() });
      throw error;
    }
  }
  async refresh(input) { return this.begin({ ...input, force: true, awaitCompletion: true, trigger: 'explicit' }); }
  async rebuildFromCurrentEvidence(input) { return this.begin({ ...input, force: true, awaitCompletion: true, useCurrentEvidence: true, trigger: 'shopify_sync' }); }
  async conversationContext({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId });
    const assignment = await this.assignment(project);
    if (!assignment?.connection) return { status: 'not_available', preferred_question_paths: [], inferred_facts: [], suppress_question_paths: [] };
    const state = await this.store.findMerchantIntakeState(projectId);
    const revision = state?.current_revision_id ? await this.store.findMerchantIntakeRevision(state.current_revision_id, projectId) : null;
    const status = this.publicStatus(state, revision, assignment.connection);
    const category = revision?.store_intelligence?.category;
    const inferredFacts = category?.confidence === CONFIDENCE.HIGH && category.offer ? [{
      path: 'productsOrServices', value: [category.offer], source: 'inference', confidence: 0.88,
      rationale: 'The connected Shopify catalog consistently indicates this product category.'
    }] : [];
    return {
      version: 1, status: status.status, revision_id: status.revision_id,
      inferred_facts: inferredFacts,
      suppress_question_paths: inferredFacts.length ? ['productsOrServices'] : [],
      preferred_question_paths: ['preferences.desiredFeeling', 'targetAudience', 'primaryGoal'],
      safe_summary: status.summary
    };
  }
  async drain() { await Promise.allSettled([...this.active.values()]); }
}

module.exports = { AutomaticMerchantIntakeService, NORMALIZATION_VERSION, CONFIDENCE, normalizeIntelligence, categoryFromCatalog };
