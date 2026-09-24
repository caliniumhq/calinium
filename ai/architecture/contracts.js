'use strict';

const crypto = require('crypto');
const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');

const CONFIDENCE = Object.freeze(['High', 'Medium', 'Low', 'Unknown']);
const STORE_SIGNAL_DERIVATION_REVISION = 'architecture-store-signal-derivation-v1';
const ARCHITECTURE_INTENT_PATHS = Object.freeze({
  shopping_mode: 'storefront.shopping_mode',
  discovery_priority: 'storefront.discovery_priority',
  storytelling_emphasis: 'storefront.storytelling_emphasis',
  navigation_priority: 'storefront.navigation_priority',
  product_density: 'storefront.product_density',
  architecture_direction: 'storefront.architecture_direction'
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function assertSchema(value, schemaPath, label, root = path.resolve(__dirname, '../..')) {
  const errors = createSchemaValidator(root).validateFile(value, schemaPath, label);
  if (errors.length) {
    const error = new Error(`${label} validation failed: ${errors.join('; ')}`);
    error.name = 'ArchitectureContractValidationError';
    error.validation = { valid: false, errors, warnings: [] };
    throw error;
  }
  return value;
}

function normalizedConfidence(value) {
  return CONFIDENCE.includes(value) ? value : 'Unknown';
}

function fact(pathname, value, confidence = 'High', sourceRevision = null, normalizationVersion = null) {
  return {
    path: pathname,
    value,
    confidence: normalizedConfidence(confidence),
    source: 'shopify_authoritative_store_data',
    derivation_revision: 'store-intelligence-direct-projection-v1',
    provenance: {
      source_authority: 'shopify_authoritative_store_data',
      source_revision: sourceRevision,
      normalization_version: normalizationVersion,
      source_paths: [pathname]
    }
  };
}

function numericFact(facts, pathname) {
  const entry = facts.find((candidate) => candidate.path === pathname);
  if (!entry || !Number.isFinite(Number(entry.value))) return null;
  return { value: Number(entry.value), confidence: normalizedConfidence(entry.confidence) };
}

function derivedConfidence(entries, status) {
  const statusCeiling = { usable: 'High', partial: 'Medium', stale: 'Low', refresh_failed: 'Low', not_available: 'Unknown' }[status] || 'Unknown';
  if (!entries.length || entries.some((entry) => !entry) || statusCeiling === 'Unknown') return 'Unknown';
  const rank = { Unknown: 0, Low: 1, Medium: 2, High: 3 };
  return [...entries.map((entry) => entry.confidence), statusCeiling].sort((left, right) => rank[left] - rank[right])[0];
}

function derivedSignal(pathname, value, confidence, sourcePaths, sourceRevision, normalizationVersion) {
  return {
    path: pathname,
    value,
    confidence: normalizedConfidence(confidence),
    derivation_revision: STORE_SIGNAL_DERIVATION_REVISION,
    provenance: {
      source_authority: 'shopify_authoritative_store_data',
      source_revision: sourceRevision,
      normalization_version: normalizationVersion,
      source_paths: [...sourcePaths]
    }
  };
}

function band(value, boundaries) {
  for (const boundary of boundaries) if (value <= boundary.maximum) return boundary.value;
  return boundaries.at(-1).overflow;
}

function deriveStoreSelectionSignals({ facts = [], revisionId = null, normalizationVersion = null, status = 'not_available' } = {}) {
  const productFact = numericFact(facts, 'catalog.active_product_count') || numericFact(facts, 'catalog.product_count');
  const variantFact = numericFact(facts, 'catalog.variant_count');
  const collectionFact = numericFact(facts, 'catalog.collection_count');
  const menuFact = numericFact(facts, 'navigation.menu_count');
  const linkFact = numericFact(facts, 'navigation.link_count');
  const mediaFact = numericFact(facts, 'media.product_media_count') || numericFact(facts, 'media.usable_image_count');
  const products = productFact?.value ?? 0;
  const variants = variantFact?.value ?? 0;
  const collections = collectionFact?.value ?? 0;
  const menus = menuFact?.value ?? 0;
  const links = linkFact?.value ?? 0;
  const productMedia = mediaFact?.value ?? 0;
  const catalogConfidence = derivedConfidence([productFact], status);
  const variantConfidence = derivedConfidence([productFact, variantFact], status);
  const navigationConfidence = derivedConfidence([menuFact, linkFact], status);
  const mediaConfidence = derivedConfidence([productFact, mediaFact], status);
  const collectionConfidence = derivedConfidence([collectionFact], status);
  const averageVariants = productFact && variantFact && products > 0 ? Number((variants / products).toFixed(4)) : null;
  const mediaPerProduct = productFact && mediaFact && products > 0 ? Number((productMedia / products).toFixed(4)) : null;
  return [
    derivedSignal('selection.catalog_scale', productFact ? (products === 0 ? 'none' : band(products, [
      { maximum: 39, value: 'small' },
      { maximum: 249, value: 'moderate', overflow: 'large' }
    ])) : 'unknown', catalogConfidence, ['catalog.active_product_count', 'catalog.product_count'], revisionId, normalizationVersion),
    derivedSignal('selection.variant_complexity', averageVariants === null ? 'unknown' : band(averageVariants, [
      { maximum: 2, value: 'simple' },
      { maximum: 5, value: 'moderate', overflow: 'complex' }
    ]), averageVariants === null ? 'Unknown' : variantConfidence, ['catalog.variant_count', 'catalog.active_product_count', 'catalog.product_count'], revisionId, normalizationVersion),
    derivedSignal('selection.navigation_complexity', menuFact && linkFact ? band(Math.max(links, menus * 10), [
      { maximum: 20, value: 'minimal' },
      { maximum: 60, value: 'moderate', overflow: 'complex' }
    ]) : 'unknown', navigationConfidence, ['navigation.menu_count', 'navigation.link_count'], revisionId, normalizationVersion),
    derivedSignal('selection.media_richness', mediaPerProduct === null ? 'unknown' : band(mediaPerProduct, [
      { maximum: 0.7499, value: 'weak' },
      { maximum: 2.4999, value: 'adequate', overflow: 'strong' }
    ]), mediaPerProduct === null ? 'Unknown' : mediaConfidence, ['media.product_media_count', 'catalog.active_product_count', 'catalog.product_count'], revisionId, normalizationVersion),
    derivedSignal('selection.collection_breadth', collectionFact ? band(collections, [
      { maximum: 5, value: 'small' },
      { maximum: 20, value: 'moderate', overflow: 'broad' }
    ]) : 'unknown', collectionConfidence, ['catalog.collection_count'], revisionId, normalizationVersion),
    derivedSignal('selection.average_variants_per_product', averageVariants, averageVariants === null ? 'Unknown' : variantConfidence, ['catalog.variant_count', 'catalog.active_product_count', 'catalog.product_count'], revisionId, normalizationVersion),
    derivedSignal('selection.product_media_per_product', mediaPerProduct, mediaPerProduct === null ? 'Unknown' : mediaConfidence, ['media.product_media_count', 'catalog.active_product_count', 'catalog.product_count'], revisionId, normalizationVersion)
  ];
}

function createStoreIntelligenceContract({ revisionId = null, normalizationVersion = null, intelligence = null, status = null, root } = {}) {
  const source = intelligence && typeof intelligence === 'object' ? intelligence : null;
  const sourceConfidence = (sourcePath) => source?.source_health?.unavailable_sources?.includes(sourcePath) ? 'Unknown' : source ? 'High' : 'Unknown';
  const facts = source ? [
    fact('category.id', source.category?.id ?? null, source.category?.confidence, revisionId, normalizationVersion),
    fact('catalog.product_count', Number(source.catalog?.product_count || 0), sourceConfidence('product'), revisionId, normalizationVersion),
    fact('catalog.active_product_count', Number(source.catalog?.active_product_count ?? source.catalog?.product_count ?? 0), sourceConfidence('product'), revisionId, normalizationVersion),
    fact('catalog.variant_count', Number(source.catalog?.variant_count || 0), sourceConfidence('product'), revisionId, normalizationVersion),
    fact('catalog.available_variant_count', Number(source.catalog?.available_variant_count || 0), sourceConfidence('product'), revisionId, normalizationVersion),
    fact('catalog.collection_count', Number(source.catalog?.collection_count || 0), sourceConfidence('collection'), revisionId, normalizationVersion),
    fact('navigation.menu_count', Number(source.navigation?.menu_count || 0), source.navigation?.confidence, revisionId, normalizationVersion),
    fact('navigation.link_count', Number(source.navigation?.link_count || 0), source.navigation?.confidence, revisionId, normalizationVersion),
    fact('media.product_media_count', Number(source.media?.product_media_count ?? source.media?.usable_image_count ?? 0), source.media?.confidence, revisionId, normalizationVersion),
    fact('media.usable_image_count', Number(source.media?.usable_image_count || 0), source.media?.confidence, revisionId, normalizationVersion),
    fact('media.video_count', Number(source.media?.video_count || 0), source.media?.confidence, revisionId, normalizationVersion),
    fact('media.project_asset_count', Number(source.media?.project_asset_count || 0), source.media?.confidence, revisionId, normalizationVersion),
    fact('store.market_count', Number(source.store?.market_count || 0), 'High', revisionId, normalizationVersion),
    fact('store.theme_count', Number(source.store?.theme_count || 0), 'High', revisionId, normalizationVersion),
    fact('store.unpublished_theme_count', Number(source.store?.unpublished_theme_count || 0), 'High', revisionId, normalizationVersion)
  ] : [];
  const contractStatus = source ? (['usable', 'partial', 'stale', 'refresh_failed'].includes(status || source.status) ? (status || source.status) : 'partial') : 'not_available';
  const contract = {
    schema_version: '1.0',
    contract_version: 'store-intelligence-contract-v1',
    revision_id: revisionId,
    normalization_version: normalizationVersion,
    status: contractStatus,
    facts,
    derived_signals: deriveStoreSelectionSignals({ facts, revisionId, normalizationVersion, status: contractStatus }),
    capability_signals: {
      has_products: Number(source?.catalog?.product_count || 0) > 0,
      has_collections: Number(source?.catalog?.collection_count || 0) > 0,
      has_navigation: Number(source?.navigation?.menu_count || 0) > 0,
      has_usable_media: Number(source?.media?.usable_image_count || 0) > 0,
      has_video: Number(source?.media?.video_count || 0) > 0,
      has_unpublished_theme: Number(source?.store?.unpublished_theme_count || 0) > 0
    },
    confidence: normalizedConfidence(source?.category?.confidence),
    provenance: {
      source_authority: 'shopify_authoritative_store_data',
      source_revision: revisionId,
      normalization_version: normalizationVersion
    }
  };
  return assertSchema(contract, 'schemas/calinium-store-intelligence-contract.schema.json', 'Store Intelligence contract', root);
}

function item(pathname, value, confidence, sourceType, sourceRevision) {
  return { path: pathname, value, confidence: normalizedConfidence(confidence), source_type: sourceType, source_revision: sourceRevision || null };
}

function profileAnswers(merchantProfile) {
  if (!merchantProfile) return [];
  const revision = merchantProfile.profile_id || null;
  return [
    item('business.name', merchantProfile.business?.name ?? null, 'High', 'merchant_answer', revision),
    item('business.offer', merchantProfile.business?.offer || [], 'High', 'merchant_answer', revision),
    item('audience.primary', merchantProfile.audience?.primary ?? null, 'High', 'merchant_answer', revision),
    item('goals.primary', merchantProfile.goals?.primary ?? null, 'High', 'merchant_answer', revision)
  ].filter((entry) => entry.value !== null && (!Array.isArray(entry.value) || entry.value.length));
}

function briefAnswers(creativeBrief) {
  if (!creativeBrief) return [];
  const revision = creativeBrief.version ? String(creativeBrief.version) : null;
  return [
    item('business.name', creativeBrief.business?.name ?? null, 'High', 'merchant_answer', revision),
    item('business.offer', creativeBrief.business?.offer || [], 'High', 'merchant_answer', revision),
    item('audience.primary', creativeBrief.audience?.primary ?? null, 'High', 'merchant_answer', revision),
    item('goals.primary', creativeBrief.goals?.primary ?? null, 'High', 'merchant_answer', revision)
  ].filter((entry) => entry.value !== null && (!Array.isArray(entry.value) || entry.value.length));
}

function profilePreferences(merchantProfile) {
  if (!merchantProfile) return [];
  const revision = merchantProfile.profile_id || null;
  return [
    item('brand.personality', merchantProfile.brand?.personality || [], 'High', 'merchant_preference', revision),
    item('brand.desired_feeling', merchantProfile.brand?.desired_feeling || [], 'High', 'merchant_preference', revision),
    item('brand.constraints', merchantProfile.brand?.constraints || [], 'High', 'merchant_preference', revision)
  ].filter((entry) => entry.value.length);
}

function briefPreferences(creativeBrief) {
  if (!creativeBrief) return [];
  const revision = creativeBrief.version ? String(creativeBrief.version) : null;
  return [
    item('brand.personality', creativeBrief.brand?.personality || [], 'High', 'merchant_preference', revision),
    item('brand.desired_feeling', creativeBrief.brand?.desiredFeeling || [], 'High', 'merchant_preference', revision),
    item('brand.constraints', creativeBrief.brand?.constraints || [], 'High', 'merchant_preference', revision)
  ].filter((entry) => entry.value.length);
}

function inferredFacts(storeIntelligence) {
  return (storeIntelligence?.facts || []).map((entry) => item(entry.path, entry.value, entry.confidence, 'shopify_inference', storeIntelligence.revision_id));
}

function architecturePreferenceItems(preferences, sourceRevision) {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return [];
  return Object.entries(ARCHITECTURE_INTENT_PATHS)
    .filter(([key]) => Object.hasOwn(preferences, key) && preferences[key] !== null && preferences[key] !== undefined && preferences[key] !== '')
    .map(([key, pathname]) => {
      const input = preferences[key];
      const structured = input && typeof input === 'object' && !Array.isArray(input) && Object.hasOwn(input, 'value');
      return item(pathname, structured ? input.value : input, structured ? input.confidence : 'High', 'merchant_preference', structured ? (input.source_revision || sourceRevision) : sourceRevision);
    });
}

function createMerchantIntent({ merchantProfile = null, creativeBrief = null, storeStrategy = null, storeIntelligence = null, architecturePreferences = null, architecturePreferenceRevision = null, parentRevisionId = null, unresolvedMaterialDecisions = [], root } = {}) {
  if (unresolvedMaterialDecisions.length > 1) throw new Error('Architecture selection may carry at most one unresolved material decision.');
  const inferred = inferredFacts(storeIntelligence).sort((left, right) => left.path.localeCompare(right.path));
  const answers = (merchantProfile ? profileAnswers(merchantProfile) : briefAnswers(creativeBrief)).sort((left, right) => left.path.localeCompare(right.path));
  const preferences = [
    ...(merchantProfile ? profilePreferences(merchantProfile) : briefPreferences(creativeBrief)),
    ...architecturePreferenceItems(architecturePreferences, architecturePreferenceRevision)
  ].sort((left, right) => left.path.localeCompare(right.path));
  const confidence = answers.length || preferences.length ? 'High' : inferred.length ? storeIntelligence.confidence : 'Unknown';
  const base = {
    schema_version: '1.0',
    contract_version: 'merchant-intent-v1',
    parent_revision_id: parentRevisionId,
    inferred_shopify_facts: inferred,
    merchant_provided_answers: answers,
    explicit_preferences: preferences,
    unresolved_material_decisions: unresolvedMaterialDecisions.map((decision) => ({ ...decision })),
    confidence: { overall: normalizedConfidence(confidence), basis: answers.length || preferences.length ? 'Approved merchant profile supplies explicit intent.' : inferred.length ? 'Only Shopify-authoritative inferred facts are currently available.' : 'No Core 2.0 merchant-intent signals are currently available.' },
    provenance: [
      ...(storeIntelligence ? [{ source_type: 'shopify_inference', source_revision: storeIntelligence.revision_id }] : []),
      ...(merchantProfile || creativeBrief ? [{ source_type: 'approved_creative_brief', source_revision: merchantProfile?.source?.creative_brief_version ? String(merchantProfile.source.creative_brief_version) : creativeBrief?.version ? String(creativeBrief.version) : merchantProfile?.profile_id || null }] : []),
      ...(merchantProfile || storeStrategy ? [{ source_type: 'approved_store_strategy', source_revision: merchantProfile?.source?.store_strategy_version ? String(merchantProfile.source.store_strategy_version) : storeStrategy?.version ? String(storeStrategy.version) : null }] : []),
      ...(architecturePreferenceItems(architecturePreferences, architecturePreferenceRevision).length ? [{ source_type: 'merchant_preference', source_revision: architecturePreferenceRevision }] : [])
    ]
  };
  const contract = { ...base, revision_id: `merchant-intent-${digest(base).slice(0, 20)}` };
  return assertSchema(contract, 'schemas/calinium-merchant-intent.schema.json', 'Merchant Intent contract', root);
}

function assertStoreIntelligenceContract(value, root) {
  return assertSchema(value, 'schemas/calinium-store-intelligence-contract.schema.json', 'Store Intelligence contract', root);
}

function assertMerchantIntent(value, root) {
  return assertSchema(value, 'schemas/calinium-merchant-intent.schema.json', 'Merchant Intent contract', root);
}

module.exports = {
  CONFIDENCE,
  STORE_SIGNAL_DERIVATION_REVISION,
  ARCHITECTURE_INTENT_PATHS,
  stable,
  digest,
  deriveStoreSelectionSignals,
  createStoreIntelligenceContract,
  createMerchantIntent,
  assertStoreIntelligenceContract,
  assertMerchantIntent
};
