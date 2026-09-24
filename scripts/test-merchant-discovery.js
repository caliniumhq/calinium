#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { createDashboardServices } = require('../apps/dashboard/server/dashboard-services.cjs');

const root = path.resolve(__dirname, '..');
const errors = [];
function fail(message) { errors.push(message); }
function png(red, green, blue) {
  const chunk = (type, data) => { const result = Buffer.alloc(12 + data.length); result.writeUInt32BE(data.length, 0); result.write(type, 4, 4, 'ascii'); data.copy(result, 8); return result; };
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.from([0, red, green, blue, 255]))), chunk('IEND', Buffer.alloc(0))]);
}
function completeAnswers(logoAssetId) {
  return {
    discovery_business_stage: 'established_business', discovery_has_existing_website: 'no_existing_website', discovery_has_shopify_store: false, discovery_desired_outcomes: ['improve_brand_positioning'], discovery_creative_freedom: 'refine_existing_identity',
    business_brand_name: 'Discovery brand', business_model: 'direct_to_consumer', business_industry: 'luxury_fashion', business_product_category: 'bags', business_stage: 'operating', business_store_status: 'existing_store',
    brand_personality_primary: 'luxury', brand_personality_secondary: ['sophisticated'], audience_customer_type: 'Considered shoppers', audience_needs: ['material detail'], audience_market_model: 'b2c', audience_price_positioning: 'premium',
    product_types: ['bags'], product_sku_count: 12, product_delivery: ['physical'], product_has_variants: true, design_preferred_style: ['luxury'], design_content_density: 'low', design_page_type: 'homepage',
    content_logo_status: 'upload_logo', content_logo_asset: logoAssetId, content_color_source: 'choose_manually', content_manual_color_palette: { source: 'manual', approved: true, source_asset_id: null, colors: { primary: '#C25C32', secondary: null, accent: null, background: '#FFFFFF', text: '#18201B', additional: [] } }, content_typography_preference: 'no_preference', goals_primary: ['luxury']
  };
}

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-discovery-'));
  let services;
  try {
    services = await createDashboardServices({ root, env: { ...process.env, CALINIUM_STORAGE_DRIVER: 'sqlite', CALINIUM_SQLITE_PATH: path.join(temporary, 'dashboard.sqlite'), CALINIUM_ASSET_STORAGE_PATH: path.join(temporary, 'assets') } });
    const primary = await services.auth.register({ email: 'owner@example.test', password: 'this-is-a-secure-test-password', fullName: 'Owner', organizationName: 'Owner Studio', ipAddress: '127.0.0.1' });
    const project = await services.projects.createProject({ userId: primary.user.id, input: { name: 'Discovery project', business_name: 'Discovery brand', country: 'US' } });
    const file = { filename: '../brand.png', mime_type: 'image/png', buffer: png(194, 92, 50) };
    const uploaded = await services.assets.upload({ userId: primary.user.id, projectId: project.project.id, file, input: { asset_type: 'logo' } });
    if (uploaded.asset.original_filename.includes('/') || uploaded.asset.storage_key || !uploaded.asset.has_checksum) fail('Upload exposed a path or omitted its checksum-safe response metadata.');
    const palette = await services.assets.extractLogoPalette({ userId: primary.user.id, projectId: project.project.id, assetId: uploaded.asset.id });
    if (!palette.suggestions.length || palette.extraction_method !== 'local_png_quantization') fail('PNG palette extraction did not produce deterministic suggestions.');
    try { await services.assets.upload({ userId: primary.user.id, projectId: project.project.id, file: { filename: 'bad.png', mime_type: 'image/png', buffer: Buffer.from('not-an-image') }, input: { asset_type: 'logo' } }); fail('Invalid file signature was accepted.'); } catch (error) { if (error.code !== 'upload_signature_invalid') fail(`Unexpected invalid-upload result: ${error.message}`); }
    const other = await services.auth.register({ email: 'other@example.test', password: 'this-is-a-secure-test-password', fullName: 'Other', organizationName: 'Other Studio', ipAddress: '127.0.0.2' });
    try { await services.assets.read({ userId: other.user.id, projectId: project.project.id, assetId: uploaded.asset.id }); fail('Cross-organization asset read was allowed.'); } catch (error) { if (error.code !== 'permission_denied') fail(`Unexpected tenant-isolation error: ${error.message}`); }
    const context = await services.assets.assetsForProfileContext({ userId: primary.user.id, projectId: project.project.id });
    if (!context.assets.some((asset) => asset.id === uploaded.asset.id)) fail('Project asset context omitted an owned asset.');
    await services.interview.create({ userId: primary.user.id, projectId: project.project.id });
    await services.interview.save({ userId: primary.user.id, projectId: project.project.id, answerPatch: completeAnswers(uploaded.asset.id), activeCategoryId: 'goals' });
    await services.interview.complete({ userId: primary.user.id, projectId: project.project.id });
    const listed = await services.assets.list({ userId: primary.user.id, projectId: project.project.id });
    if (listed.assets.find((asset) => asset.id === uploaded.asset.id)?.profile_reference_count !== 1) fail('Asset list did not expose confirmed-profile usage safely.');
    const deletionPrompt = await services.assets.delete({ userId: primary.user.id, projectId: project.project.id, assetId: uploaded.asset.id, confirmed: false });
    if (!deletionPrompt.requires_confirmation) fail('Referenced asset deletion did not require merchant confirmation.');
  } catch (error) { fail(error.stack || error.message); }
  finally { if (services) await services.close(); fs.rmSync(temporary, { recursive: true, force: true }); }
  if (errors.length) { console.error(`Merchant Discovery tests failed:\n- ${errors.join('\n- ')}`); process.exit(1); }
  console.log('Merchant Discovery tests passed: authorized upload, safe filename handling, signature rejection, local PNG palette extraction, project asset context, and cross-organization denial.');
})();
