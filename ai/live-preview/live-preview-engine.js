'use strict';

const crypto = require('crypto');

const RENDERER_VERSION = 'live-preview-v1';
const PREVIEW_STATES = Object.freeze(['thinking', 'provisional', 'approved', 'generated']);
const REGION_ORDER = Object.freeze(['header', 'hero', 'craftsmanship', 'featured_collection', 'newsletter', 'footer']);
const SECTION_RENDERERS = Object.freeze({
  'full-screen-hero': 'hero',
  'editorial-hero': 'hero',
  'video-hero': 'hero',
  craftsmanship: 'craftsmanship',
  'featured-collection': 'featured_collection',
  newsletter: 'newsletter'
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function text(value, maximum = 240) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maximum); }
function dimension(dna, id, fallback) { return dna?.dimensions?.[id]?.value || dna?.summary?.[id] || fallback; }
function boundedToken(value, allowed, fallback) { return allowed.includes(value) ? value.replace(/-/g, '_') : fallback; }

function previewTokens(dna) {
  const typography = dimension(dna, 'typography', 'minimal-neutral');
  const spacing = dimension(dna, 'spacing', 'balanced');
  const motion = dimension(dna, 'motion', 'none');
  const color = dimension(dna, 'color', 'neutral-restrained');
  const hero = dimension(dna, 'hero', 'minimal');
  const commerce = dimension(dna, 'commerce_density', 'balanced');
  const layout = dimension(dna, 'layout', 'media-first');
  const grid = dimension(dna, 'grid', 'balanced');
  const hierarchy = dimension(dna, 'visual_hierarchy', 'product-story-balanced');
  const media = dimension(dna, 'media', 'product-led');
  const imageTreatment = dimension(dna, 'image_treatment', 'product-consistent');
  const shapeSurface = dimension(dna, 'shape_surface', 'restrained-flat');
  const editorialDensity = dimension(dna, 'editorial_density', 'balanced');
  const sectionRhythm = dimension(dna, 'section_rhythm', 'product-to-action');
  const responsive = dimension(dna, 'responsive', 'stack');
  const typographyMap = {
    'editorial-serif-led': 'editorial_serif', 'balanced-serif-sans': 'balanced_serif_sans',
    'functional-sans': 'functional_sans', 'technical-structured': 'technical_structured', 'minimal-neutral': 'minimal_neutral'
  };
  const spacingMap = { compact: 'compact', balanced: 'balanced', spacious: 'spacious', editorial: 'editorial', luxury: 'luxury', 'information-dense': 'compact' };
  const colorMap = {
    'brand-authoritative': 'brand', 'neutral-restrained': 'neutral', 'warm-restrained': 'warm', 'dark-contrast': 'dark',
    'quiet-luxury': 'quiet_luxury', minimal: 'minimal', technical: 'technical', 'playful-bounded': 'playful'
  };
  return {
    typography: typographyMap[typography] || 'minimal_neutral',
    spacing: spacingMap[spacing] || 'balanced',
    motion: boundedToken(motion, ['none', 'minimal', 'subtle', 'editorial', 'functional'], 'minimal'),
    color: colorMap[color] || 'neutral',
    hero: boundedToken(hero, ['immersive', 'editorial', 'product-led', 'minimal', 'technical', 'conversion-led'], 'minimal'),
    commerce: boundedToken(commerce, ['restrained', 'balanced', 'product-forward', 'catalog-dense'], 'balanced'),
    layout: boundedToken(layout, ['media-first', 'controlled-asymmetric', 'product-grid', 'text-first'], 'media_first'),
    grid: boundedToken(grid, ['restrained', 'balanced', 'dense', 'feature-first', 'controlled-asymmetric'], 'balanced'),
    hierarchy: boundedToken(hierarchy, ['product-story-balanced', 'minimal-product-led', 'value-feature-proof-led'], 'product_story_balanced'),
    media: boundedToken(media, ['detail-led', 'lifestyle-led', 'editorial-led', 'product-led', 'technical-interface-led'], 'product_led'),
    image_treatment: boundedToken(imageTreatment, ['portrait-editorial', 'immersive-edge-to-edge', 'landscape-editorial', 'natural-contained', 'product-consistent', 'detail-focused'], 'product_consistent'),
    shape_surface: boundedToken(shapeSurface, ['restrained-flat', 'sharp-flat', 'soft-surface', 'structured-separated'], 'restrained_flat'),
    editorial_density: boundedToken(editorialDensity, ['none', 'light', 'balanced', 'story-rich'], 'balanced'),
    section_rhythm: boundedToken(sectionRhythm, ['story-to-product', 'image-to-collection', 'gallery-to-product', 'education-to-product', 'product-to-action', 'feature-to-proof'], 'product_to_action'),
    responsive: boundedToken(responsive, ['reorder-with-semantic-integrity', 'change-media-priority', 'stack', 'simplify', 'reduce-density'], 'stack')
  };
}

function slot(slots, id) { return (slots || []).find((item) => item.slot_id === id)?.resource || null; }
function image(resource) {
  if (!resource?.preview_url) return null;
  return { url: resource.preview_url, alt: resource.alt_text || '', decorative: !resource.alt_text };
}
function navigation(resource) {
  return (resource?.metadata?.items || []).slice(0, 6).map((item) => ({ label: text(item.title, 80) })).filter((item) => item.label);
}
function safeCraftsmanship(content) {
  if (content?.status !== 'approved') return null;
  const steps = (content.steps || []).filter((item) => text(item.title) && text(item.evidence_note)).slice(0, 6).map((item) => ({
    title: text(item.title), description: text(item.text, 600) || null, icon: ['sparkle', 'factory', 'settings', 'diamond'].includes(item.craft_icon) ? item.craft_icon : 'sparkle',
    image: item.image || null
  }));
  return steps.length ? { type: 'craftsmanship', heading: 'Craftsmanship', steps } : null;
}

function composeModel({ project, recommendation, designDna, resources, contentPlan, previewState, generatedBinding = null }) {
  const primary = recommendation?.primary || null;
  const identity = text(project?.business_name || project?.name || 'Store', 120);
  const logo = slot(resources, 'logo');
  const menu = slot(resources, 'primary_navigation');
  const heroMedia = slot(resources, 'hero_media');
  const heroDestination = slot(resources, 'hero_destination');
  const collection = slot(resources, 'featured_collection');
  const product = slot(resources, 'featured_product');
  const order = primary?.section_order || [];
  const sections = [];
  const omissions = [];
  const seen = new Set();
  for (const sectionId of order) {
    const renderer = SECTION_RENDERERS[sectionId];
    if (!renderer) {
      omissions.push({ section: sectionId, reason: 'This section is not included in the bounded Beta Preview renderer.' });
      continue;
    }
    if (seen.has(renderer)) continue;
    seen.add(renderer);
    if (renderer === 'hero') {
      if (!heroMedia && !heroDestination) { omissions.push({ section: sectionId, reason: 'No truthful hero media or destination is currently available.' }); continue; }
      sections.push({ type: 'hero', source_section: sectionId, image: image(heroMedia), heading: heroDestination?.display_title || null, action_label: heroDestination?.display_title ? `View ${heroDestination.display_title}` : null, destination_type: heroDestination?.resource_type || null });
    }
    if (renderer === 'craftsmanship') {
      const craft = safeCraftsmanship(contentPlan?.craftsmanship);
      if (craft) sections.push(craft);
      else omissions.push({ section: sectionId, reason: 'Craftsmanship is omitted until its factual evidence is approved.' });
    }
    if (renderer === 'featured_collection') {
      if (collection) sections.push({ type: 'featured_collection', heading: collection.display_title, image: image(collection), product: null });
      else if (product) sections.push({ type: 'featured_product', heading: product.display_title, image: image(product), price: product.price || null });
      else omissions.push({ section: sectionId, reason: 'No current collection or product is available for this placement.' });
    }
    if (renderer === 'newsletter') sections.push({ type: 'newsletter', heading: 'Email updates', submission_enabled: false });
  }
  return {
    version: 1,
    page: 'homepage',
    state: previewState,
    identity,
    preset: primary ? { id: primary.preset_id, name: primary.preset_name, homepage_recipe: primary.homepage_recipe } : null,
    tokens: previewTokens(designDna),
    header: { identity, logo: image(logo), navigation: navigation(menu) },
    sections,
    footer: { identity, navigation: navigation(menu) },
    omissions,
    generated_binding: generatedBinding ? { validated: true, validated_at: generatedBinding.validated_at || null } : null
  };
}

function dependencyGraph({ recommendationRevisionId, dnaRevisionId, resourceSetRevisionId, presetRevisionId, contentRevision, runtimeCapabilityVersion, generatedBinding, resources }) {
  const resource = (id) => (resources || []).find((item) => item.slot_id === id)?.resource || null;
  const source = (id) => { const item = resource(id); return item ? [item.source_revision, item.availability_status] : null; };
  return {
    provenance: { recommendation_revision_id: recommendationRevisionId, dna_revision_id: dnaRevisionId, resource_set_revision_id: resourceSetRevisionId, preset_revision_id: presetRevisionId || null, content_revision_id: contentRevision || null },
    runtime: { capability_version: runtimeCapabilityVersion },
    header: { logo: source('logo'), navigation: source('primary_navigation') },
    hero: { media: source('hero_media'), destination: source('hero_destination') },
    craftsmanship: { content_revision: contentRevision || null },
    featured_collection: { collection: source('featured_collection'), product: source('featured_product') },
    newsletter: {},
    footer: { navigation: source('primary_navigation') },
    generated: generatedBinding || null
  };
}

function regionFingerprints(graph, model) {
  const sectionByType = new Map((model.sections || []).map((item) => [item.type, item]));
  const tokens = model.tokens || {};
  const common = { state: model.state, runtime: graph.runtime, generated: graph.generated };
  return {
    header: digest({ ...common, dependency: graph.header, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, hierarchy: tokens.hierarchy, shape_surface: tokens.shape_surface, responsive: tokens.responsive }, output: model.header }),
    hero: digest({ ...common, dependency: graph.hero, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, motion: tokens.motion, hero: tokens.hero, layout: tokens.layout, hierarchy: tokens.hierarchy, media: tokens.media, image_treatment: tokens.image_treatment, shape_surface: tokens.shape_surface, responsive: tokens.responsive }, output: sectionByType.get('hero') || null }),
    craftsmanship: digest({ ...common, dependency: graph.craftsmanship, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, grid: tokens.grid, media: tokens.media, image_treatment: tokens.image_treatment, shape_surface: tokens.shape_surface, editorial_density: tokens.editorial_density, section_rhythm: tokens.section_rhythm, responsive: tokens.responsive }, output: sectionByType.get('craftsmanship') || null }),
    featured_collection: digest({ ...common, dependency: graph.featured_collection, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, commerce: tokens.commerce, layout: tokens.layout, grid: tokens.grid, hierarchy: tokens.hierarchy, media: tokens.media, image_treatment: tokens.image_treatment, shape_surface: tokens.shape_surface, section_rhythm: tokens.section_rhythm, responsive: tokens.responsive }, output: sectionByType.get('featured_collection') || sectionByType.get('featured_product') || null }),
    newsletter: digest({ ...common, dependency: graph.newsletter, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, shape_surface: tokens.shape_surface, editorial_density: tokens.editorial_density, section_rhythm: tokens.section_rhythm }, output: sectionByType.get('newsletter') || null }),
    footer: digest({ ...common, dependency: graph.footer, tokens: { typography: tokens.typography, spacing: tokens.spacing, color: tokens.color, hierarchy: tokens.hierarchy, shape_surface: tokens.shape_surface, section_rhythm: tokens.section_rhythm, responsive: tokens.responsive }, output: model.footer })
  };
}

function changedRegions(previous, current) {
  if (!previous) return [...REGION_ORDER];
  return REGION_ORDER.filter((id) => previous[id] !== current[id]);
}

function buildPreviewArtifact(input) {
  if (!input.recommendation?.primary || !input.designDna) return { state: 'thinking', artifact: null };
  const previewState = input.generatedBinding ? 'generated' : input.approvedDirection && input.approvedResources ? 'approved' : 'provisional';
  const model = composeModel({ ...input, previewState });
  const graph = dependencyGraph(input);
  const fingerprints = regionFingerprints(graph, model);
  const dependencyFingerprint = digest({ renderer_version: RENDERER_VERSION, preview_state: previewState, graph, model });
  return {
    state: previewState,
    artifact: {
      renderer_version: RENDERER_VERSION,
      preview_state: previewState,
      dependency_fingerprint: dependencyFingerprint,
      dependency_graph: graph,
      region_fingerprints: fingerprints,
      model_checksum: digest(model),
      model
    }
  };
}

module.exports = { RENDERER_VERSION, PREVIEW_STATES, REGION_ORDER, SECTION_RENDERERS, stable, digest, previewTokens, composeModel, dependencyGraph, regionFingerprints, changedRegions, buildPreviewArtifact };
