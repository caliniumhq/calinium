'use strict';

const path = require('path');
const { presetById, clone } = require('../presets/preset-registry');
const { loadMappings } = require('../draft-builder/load-mappings');
const { accepted } = require('../theme-generator/generate-settings');

const ENGINE_VERSION = 'design-dna-v1';
const CONFIDENCE = Object.freeze({ HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low', UNKNOWN: 'Unknown' });
const DIMENSIONS = Object.freeze([
  'typography', 'spacing', 'layout', 'grid', 'visual_hierarchy', 'color', 'media', 'image_treatment', 'motion', 'shape_surface',
  'navigation', 'hero', 'product_discovery', 'product_page', 'collection_page', 'editorial_storytelling', 'trust_proof', 'conversion',
  'commerce_density', 'editorial_density', 'information_density', 'section_rhythm', 'page_rhythm', 'responsive', 'accessibility', 'performance'
]);

const BASELINES = Object.freeze({
  atelier: {
    typography: 'editorial-serif-led', spacing: 'luxury', layout: 'media-first', grid: 'restrained', visual_hierarchy: 'product-story-balanced', color: 'warm-restrained', media: 'detail-led', image_treatment: 'portrait-editorial', motion: 'minimal', shape_surface: 'restrained-flat', navigation: 'collection-led', hero: 'immersive', product_discovery: 'balanced', product_page: 'media-led', collection_page: 'editorial-intro', editorial_storytelling: 'evidence-led', trust_proof: 'distributed', conversion: 'story-first', commerce_density: 'balanced', editorial_density: 'balanced', information_density: 'low', section_rhythm: 'story-to-product', page_rhythm: 'editorial-paced', responsive: 'reorder-with-semantic-integrity', accessibility: 'WCAG-2.2-AA-constrained', performance: 'media-prioritized'
  },
  maison: {
    typography: 'editorial-serif-led', spacing: 'luxury', layout: 'media-first', grid: 'feature-first', visual_hierarchy: 'product-story-balanced', color: 'quiet-luxury', media: 'lifestyle-led', image_treatment: 'immersive-edge-to-edge', motion: 'minimal', shape_surface: 'sharp-flat', navigation: 'collection-led', hero: 'editorial', product_discovery: 'visual-discovery', product_page: 'media-led', collection_page: 'editorial-intro', editorial_storytelling: 'restrained', trust_proof: 'inline', conversion: 'restrained', commerce_density: 'balanced', editorial_density: 'light', information_density: 'low', section_rhythm: 'image-to-collection', page_rhythm: 'immersive', responsive: 'change-media-priority', accessibility: 'WCAG-2.2-AA-constrained', performance: 'media-prioritized'
  },
  gallery: {
    typography: 'balanced-serif-sans', spacing: 'editorial', layout: 'controlled-asymmetric', grid: 'controlled-asymmetric', visual_hierarchy: 'product-story-balanced', color: 'neutral-restrained', media: 'editorial-led', image_treatment: 'landscape-editorial', motion: 'subtle', shape_surface: 'sharp-flat', navigation: 'collection-led', hero: 'editorial', product_discovery: 'visual-discovery', product_page: 'media-led', collection_page: 'browse-first', editorial_storytelling: 'balanced', trust_proof: 'inline', conversion: 'editorial', commerce_density: 'balanced', editorial_density: 'story-rich', information_density: 'medium', section_rhythm: 'gallery-to-product', page_rhythm: 'editorial-paced', responsive: 'reorder-with-semantic-integrity', accessibility: 'WCAG-2.2-AA-constrained', performance: 'media-prioritized'
  },
  ritual: {
    typography: 'balanced-serif-sans', spacing: 'spacious', layout: 'media-first', grid: 'balanced', visual_hierarchy: 'product-story-balanced', color: 'warm-restrained', media: 'lifestyle-led', image_treatment: 'natural-contained', motion: 'subtle', shape_surface: 'soft-surface', navigation: 'product-led', hero: 'product-led', product_discovery: 'balanced', product_page: 'proof-supported', collection_page: 'category-led', editorial_storytelling: 'evidence-led', trust_proof: 'dedicated', conversion: 'trust-first', commerce_density: 'balanced', editorial_density: 'balanced', information_density: 'medium', section_rhythm: 'education-to-product', page_rhythm: 'balanced', responsive: 'stack', accessibility: 'WCAG-2.2-AA-constrained', performance: 'balanced'
  },
  essential: {
    typography: 'minimal-neutral', spacing: 'balanced', layout: 'product-grid', grid: 'balanced', visual_hierarchy: 'minimal-product-led', color: 'minimal', media: 'product-led', image_treatment: 'product-consistent', motion: 'none', shape_surface: 'restrained-flat', navigation: 'essential', hero: 'minimal', product_discovery: 'product-forward', product_page: 'balanced-decision', collection_page: 'browse-first', editorial_storytelling: 'absent', trust_proof: 'none', conversion: 'product-first', commerce_density: 'product-forward', editorial_density: 'none', information_density: 'low', section_rhythm: 'product-to-action', page_rhythm: 'browse-efficient', responsive: 'simplify', accessibility: 'WCAG-2.2-AA-constrained', performance: 'lean'
  },
  signal: {
    typography: 'technical-structured', spacing: 'compact', layout: 'text-first', grid: 'dense', visual_hierarchy: 'value-feature-proof-led', color: 'technical', media: 'technical-interface-led', image_treatment: 'detail-focused', motion: 'functional', shape_surface: 'structured-separated', navigation: 'utility-rich', hero: 'technical', product_discovery: 'restrained', product_page: 'information-led', collection_page: 'dense-catalog', editorial_storytelling: 'restrained', trust_proof: 'distributed', conversion: 'education-first', commerce_density: 'restrained', editorial_density: 'light', information_density: 'high', section_rhythm: 'feature-to-proof', page_rhythm: 'information-efficient', responsive: 'reduce-density', accessibility: 'WCAG-2.2-AA-constrained', performance: 'balanced'
  }
});

const FLEXIBLE = Object.freeze({
  typography: ['editorial-serif-led', 'balanced-serif-sans', 'functional-sans', 'technical-structured', 'minimal-neutral'],
  spacing: ['compact', 'balanced', 'spacious', 'editorial', 'luxury', 'information-dense'],
  grid: ['restrained', 'balanced', 'dense', 'feature-first', 'controlled-asymmetric'],
  color: ['brand-authoritative', 'neutral-restrained', 'warm-restrained', 'dark-contrast', 'quiet-luxury', 'minimal', 'technical', 'playful-bounded'],
  motion: ['none', 'minimal', 'subtle', 'editorial', 'functional'],
  hero: ['immersive', 'editorial', 'product-led', 'minimal', 'technical', 'conversion-led'],
  product_discovery: ['restrained', 'balanced', 'product-forward', 'catalog-dense', 'visual-discovery'],
  commerce_density: ['restrained', 'balanced', 'product-forward', 'catalog-dense'],
  editorial_density: ['none', 'light', 'balanced', 'story-rich'],
  information_density: ['low', 'medium', 'high']
});

const FIXED = new Set(['accessibility']);
const FORBIDDEN = Object.freeze({
  atelier: { motion: ['editorial', 'functional'], color: ['technical', 'playful-bounded'], commerce_density: ['catalog-dense'] },
  maison: { motion: ['functional'], color: ['technical', 'playful-bounded'], commerce_density: ['catalog-dense'] },
  gallery: { motion: ['functional'], product_discovery: ['catalog-dense'] },
  ritual: { motion: ['editorial', 'functional'], color: ['technical'] },
  essential: { motion: ['editorial', 'functional'], editorial_density: ['story-rich'] },
  signal: { typography: ['editorial-serif-led'], color: ['warm-restrained', 'playful-bounded'], editorial_density: ['story-rich'] }
});

function boundaryFor(presetId, dimension, value) {
  if (FIXED.has(dimension)) return { mode: 'Fixed', allowed: [value], forbidden: [], fallback: value };
  const allowed = FLEXIBLE[dimension] || [value];
  const forbidden = FORBIDDEN[presetId]?.[dimension] || [];
  return { mode: allowed.length > 1 ? 'Flexible' : 'Fixed', allowed: allowed.filter((item) => !forbidden.includes(item)), forbidden, fallback: value };
}

function dimensionsFor(presetId, overrides = {}) {
  const baseline = BASELINES[presetId];
  if (!baseline) throw new Error(`Design DNA has no canonical baseline for ${presetId}.`);
  return Object.fromEntries(DIMENSIONS.map((id) => {
    const boundary = boundaryFor(presetId, id, baseline[id]);
    const requested = overrides[id];
    const supported = requested === undefined || boundary.allowed.includes(requested);
    const value = supported ? (requested ?? baseline[id]) : boundary.fallback;
    return [id, { value, confidence: requested !== undefined ? CONFIDENCE.HIGH : CONFIDENCE.MEDIUM, source: requested !== undefined ? 'merchant_override' : 'preset_baseline', boundary, fallback_applied: requested !== undefined && !supported }];
  }));
}

function validatedGlobalSettings(preset, dimensions, root) {
  const mappings = loadMappings({ root });
  const values = new Map(preset.global_settings.map((item) => [item.setting_id, item.value]));
  const motion = dimensions.motion.value;
  if (motion === 'none') { values.set('enable_motion', false); values.set('motion_duration', 150); }
  else if (motion === 'minimal') { values.set('enable_motion', true); values.set('motion_duration', 150); }
  else if (motion === 'subtle') { values.set('enable_motion', true); values.set('motion_duration', 200); }
  const spacing = dimensions.spacing.value;
  if (spacing === 'compact') { values.set('section_spacing', 72); values.set('grid_gap', 20); }
  else if (spacing === 'balanced') { values.set('section_spacing', 80); values.set('grid_gap', 24); }
  else if (['spacious', 'editorial'].includes(spacing)) { values.set('section_spacing', 112); values.set('grid_gap', 28); }
  else if (spacing === 'luxury') { values.set('section_spacing', 120); values.set('grid_gap', 32); }
  const typography = dimensions.typography.value;
  if (typography === 'editorial-serif-led') values.set('heading_scale', Math.max(Number(values.get('heading_scale') || 110), 120));
  if (typography === 'technical-structured') values.set('heading_scale', 110);
  if (typography === 'minimal-neutral') values.set('heading_scale', 105);
  return [...values.entries()].map(([settingId, value]) => {
    const capability = mappings.index.global_settings.get(settingId);
    if (!capability || !accepted(capability, value)) throw new Error(`Design DNA emitted unsupported global setting ${settingId}.`);
    return { setting_id: settingId, value, capability_source: capability.source.file };
  }).sort((left, right) => left.setting_id.localeCompare(right.setting_id));
}

function supportedSectionSetting(mappings, sectionId, settingId, desired, fallback) {
  const capability = mappings.index.sections.get(sectionId)?.available_settings?.find((item) => item.setting_id === settingId);
  if (!capability) return null;
  const value = accepted(capability, desired) ? desired : fallback;
  if (!accepted(capability, value)) return null;
  return { section_id: sectionId, setting_id: settingId, value, fallback_applied: value !== desired, capability_source: capability.source.file };
}

function validatedSectionSettings(dimensions, root) {
  const mappings = loadMappings({ root });
  const settings = [];
  const motionEnabled = dimensions.motion.value !== 'none';
  for (const sectionId of ['full-screen-hero', 'editorial-hero', 'video-hero']) {
    const setting = supportedSectionSetting(mappings, sectionId, 'enable_animation', motionEnabled, false);
    if (setting) settings.push(setting);
  }
  if (['product-forward', 'catalog-dense'].includes(dimensions.commerce_density.value)) {
    const count = dimensions.commerce_density.value === 'catalog-dense' ? 12 : 8;
    for (const sectionId of ['featured-collection', 'product-carousel']) {
      const setting = supportedSectionSetting(mappings, sectionId, 'products_to_show', count, 4);
      if (setting) settings.push(setting);
    }
  }
  const heroHeight = dimensions.hero.value === 'minimal' ? 'compact' : dimensions.hero.value === 'immersive' ? 'full-screen' : 'standard';
  const hero = supportedSectionSetting(mappings, 'full-screen-hero', 'hero_height', heroHeight, 'standard');
  if (hero) settings.push(hero);
  return settings.sort((left, right) => `${left.section_id}.${left.setting_id}`.localeCompare(`${right.section_id}.${right.setting_id}`));
}

function createDesignDna({ presetId, recommendationRevisionId = null, overrides = {}, root = path.resolve(__dirname, '../..') }) {
  const { preset } = presetById(root, presetId);
  const dimensions = dimensionsFor(presetId, overrides);
  return {
    version: 1,
    engine_version: ENGINE_VERSION,
    preset_id: preset.id,
    preset_version: preset.version,
    recommendation_revision_id: recommendationRevisionId,
    dimensions,
    execution: {
      global_settings: validatedGlobalSettings(preset, dimensions, root),
      section_settings: validatedSectionSettings(dimensions, root)
    },
    summary: {
      typography: dimensions.typography.value,
      spacing: dimensions.spacing.value,
      motion: dimensions.motion.value,
      media_emphasis: dimensions.media.value,
      commerce_balance: dimensions.commerce_density.value,
      editorial_rhythm: dimensions.page_rhythm.value
    }
  };
}

function normalizeRefinement(message) {
  const text = String(message || '').trim().toLowerCase().replace(/[.!?]+$/g, '');
  if (/^(?:undo|undo that|go back|revert that|change it back)$/.test(text)) return { kind: 'undo' };
  const preset = text.match(/\b(?:use|choose|prefer|switch to)\s+(atelier|maison|gallery|ritual|essential|signal)\b/);
  if (preset) return { kind: 'preset_change', preset_id: preset[1] };
  if (/^why\s+(atelier|maison|gallery|ritual|essential|signal)\b/.test(text)) return { kind: 'explanation' };
  if (/\b(less|reduce|minimal|no)\s+(motion|animation)\b/.test(text)) return { kind: 'dna', overrides: { motion: 'none' }, label: 'motion' };
  if (/\b(more\s+minimal|less\s+busy|cleaner)\b/.test(text)) return { kind: 'dna', overrides: { typography: 'minimal-neutral', spacing: 'spacious', motion: 'minimal', editorial_density: 'light', information_density: 'low' }, label: 'minimal direction' };
  if (/\b(more\s+luxurious|more\s+luxury|premium)\b/.test(text)) return { kind: 'dna', overrides: { typography: 'editorial-serif-led', spacing: 'luxury', color: 'quiet-luxury', motion: 'minimal' }, label: 'luxury direction' };
  if (/\b(warmer|more\s+warm)\b/.test(text)) return { kind: 'dna', overrides: { color: 'warm-restrained' }, label: 'warm color direction' };
  if (/\b(show|feature)\s+more\s+products?\b/.test(text)) return { kind: 'dna', overrides: { product_discovery: 'product-forward', commerce_density: 'product-forward', grid: 'dense' }, label: 'product emphasis' };
  if (/\b(stronger|more\s+editorial)\s+typography\b|\btypography\s+(stronger|more\s+editorial)\b/.test(text)) return { kind: 'dna', overrides: { typography: 'editorial-serif-led' }, label: 'typography' };
  if (/\b(stronger|bigger|taller)\s+hero\b|\bhero\s+(stronger|bigger|taller)\b/.test(text)) return { kind: 'dna', overrides: { hero: 'immersive' }, label: 'hero presentation' };
  if (/\b(extreme|dramatic|constant)\s+(motion|animation)\b|\bmore\s+(motion|animation)\b/.test(text)) return { kind: 'forbidden', label: 'motion', reason: 'That motion level falls outside this direction’s accessible presentation boundaries.' };
  if (/^you decide\b/.test(text)) return { kind: 'delegation' };
  return null;
}

function mergeOverrides(currentDna, requested) {
  const existing = Object.fromEntries(Object.entries(currentDna?.dimensions || {}).filter(([, item]) => item.source === 'merchant_override').map(([id, item]) => [id, item.value]));
  return { ...existing, ...clone(requested || {}) };
}

function approvedDnaProvenance(revision) {
  if (!revision) return null;
  return {
    revision_id: revision.revision_id,
    candidate_revision_id: revision.candidate_revision_id,
    recommendation_approval_revision_id: revision.recommendation_approval_revision_id,
    engine_version: revision.approved?.engine_version,
    preset_id: revision.approved?.preset_id,
    approval_reference: revision.approval?.approval_reference,
    approved_at: revision.approval?.approved_at,
    approval_checksum: revision.approval_checksum
  };
}

function applyDesignDnaToDraft(draft, approvedDnaRevision) {
  if (!approvedDnaRevision) return { draft, application: null };
  const dna = approvedDnaRevision.approved;
  if (!dna?.execution || dna.recommendation_revision_id === undefined) throw new Error('Approved Design DNA is not executable.');
  const next = clone(draft);
  const global = new Map(dna.execution.global_settings.map((item) => [item.setting_id, item]));
  const appliedGlobal = [];
  for (const settings of Object.values(next.global_theme_configuration || {})) {
    if (!Array.isArray(settings)) continue;
    for (const planned of settings) {
      const execution = global.get(planned.setting_id);
      if (!execution || planned.status !== 'proposed') continue;
      planned.value = execution.value;
      planned.explanation = {
        ...planned.explanation,
        source_catalogs: [...new Set([...(planned.explanation?.source_catalogs || []), 'approved Design DNA revision'])],
        fallback_used: 'approved_design_dna',
        reasoning: 'The merchant-approved Design DNA supplies this bounded runtime-capable presentation value.'
      };
      appliedGlobal.push(planned.setting_id);
    }
  }
  const sectionExecution = new Map(dna.execution.section_settings.map((item) => [`${item.section_id}.${item.setting_id}`, item]));
  const appliedSection = [];
  const pagePlans = [next.homepage_plan, ...Object.values(next.page_plans || {})].filter(Boolean);
  for (const plan of pagePlans) for (const section of plan.sections || []) {
    for (const planned of section.mapped_settings || []) {
      const execution = sectionExecution.get(`${section.section_id}.${planned.setting_id}`);
      if (!execution || planned.status !== 'proposed') continue;
      planned.value = execution.value;
      planned.explanation = {
        ...planned.explanation,
        source_catalogs: [...new Set([...(planned.explanation?.source_catalogs || []), 'approved Design DNA revision'])],
        fallback_used: execution.fallback_applied ? 'design_dna_runtime_fallback' : 'approved_design_dna',
        reasoning: 'The merchant-approved Design DNA supplies this validated section presentation value.'
      };
      appliedSection.push(`${section.section_id}.${planned.setting_id}`);
    }
  }
  return { draft: next, application: { applied_global_setting_keys: [...new Set(appliedGlobal)].sort(), applied_section_setting_keys: [...new Set(appliedSection)].sort() } };
}

module.exports = { ENGINE_VERSION, CONFIDENCE, DIMENSIONS, BASELINES, FLEXIBLE, FORBIDDEN, boundaryFor, dimensionsFor, createDesignDna, normalizeRefinement, mergeOverrides, approvedDnaProvenance, applyDesignDnaToDraft };
