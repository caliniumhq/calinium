#!/usr/bin/env node

'use strict';

/* Read-only, fixture-backed package proof for Milestone 23. */
const fs = require('fs');
const path = require('path');
const { createCreativeBrief } = require('../pipeline/create-creative-brief');
const { createStoreStrategy } = require('../pipeline/create-store-strategy');
const { createReviewState, approveAll } = require('../pipeline/review-state');
const { generateStorefront } = require('../pipeline/generate-storefront');

const root = path.resolve(__dirname, '..');
const generationId = 'generation-run-m23-premium-footer-20260727-r1';

function fixtureGenerationContext(draft) {
  const merchantReferences = {};
  const assetReferences = Object.fromEntries((draft.required_assets.required || []).map((asset) => [asset.asset_id, `shopify://fixture-assets/m23-premium-footer-${asset.asset_id}`]));
  const completed = new Set();
  const empty = new Set();
  const requiredFieldRefs = new Set((draft.required_assets.required || []).flatMap((asset) => asset.field_refs || []));

  for (const page of [draft.homepage_plan, ...(draft.other_pages || [])]) {
    for (const section of page.sections || []) {
      for (const field of section.unresolved_merchant_fields || []) {
        const requiresReference = requiredFieldRefs.has(field.setting_ref)
          || ['collection', 'product', 'blog', 'link_list', 'menu', 'page', 'article', 'image', 'desktop_image', 'mobile_image', 'poster_image', 'video', 'video_url'].includes(field.setting_id);
        if (requiresReference) {
          merchantReferences[field.setting_ref] = `shopify://fixture-resources/m23-premium-footer-${field.setting_ref.replace(/[^a-z0-9]+/gi, '-')}`;
          completed.add(`field:${field.setting_ref}`);
        } else {
          empty.add(field.setting_ref);
        }
      }
      for (const confirmation of section.merchant_confirmations || []) completed.add(confirmation);
    }
  }

  for (const category of ['typography', 'spacing', 'colors', 'motion', 'layout']) {
    for (const setting of draft.global_theme_configuration[category] || []) if (setting.status !== 'proposed') empty.add(setting.setting_ref);
  }
  for (const item of draft.merchant_review_queue || []) completed.add(`review:${item.id}`);

  return {
    status: 'ready_for_generation',
    approval_reference: 'm23-premium-footer-fixture-approved-inputs',
    approved_at: '2026-07-27T12:00:00.000Z',
    merchant_references: merchantReferences,
    asset_references: assetReferences,
    completed_confirmations: [...completed].sort(),
    resolved_empty_fields: [...empty].sort()
  };
}

function main() {
  const outputDirectory = path.join(root, 'output', generationId);
  if (fs.existsSync(outputDirectory)) throw new Error(`Refusing to overwrite existing read-only generation workspace: ${path.relative(root, outputDirectory)}`);

  const merchantInput = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'leather-travel-bags.json'), 'utf8'));
  const creativeBrief = createCreativeBrief({ merchantInput, root });
  const storeStrategy = createStoreStrategy({ creativeBrief, root });
  const review = approveAll(createReviewState());
  const blocked = generateStorefront({ creativeBrief, storeStrategy, review, root });
  const generation = fixtureGenerationContext(blocked.draft);
  const result = generateStorefront({ creativeBrief, storeStrategy, review, generation, root, generationId, outputRoot: path.join(root, 'output'), runThemeCheck: true });

  if (result.status !== 'generated_for_review' || !result.read_only_theme_package?.validation?.valid) throw new Error(`Expected a valid read-only package, received ${result.status}.`);
  process.stdout.write(`${JSON.stringify({
    generation_id: generationId,
    archive: path.relative(root, result.read_only_theme_package.archive_path),
    archive_sha256: result.read_only_theme_package.manifest.archive.sha256,
    archive_bytes: result.read_only_theme_package.manifest.archive.compressed_bytes,
    validation: result.read_only_theme_package.validation,
    shopify_operations: result.read_only_theme_package.manifest.shopify_operations
  }, null, 2)}\n`);
}

try { main(); } catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; }
