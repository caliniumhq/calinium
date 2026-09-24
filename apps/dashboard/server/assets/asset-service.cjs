'use strict';

const path = require('path');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { extensionFor, validateUpload } = require('./file-validation.cjs');
const { extractPalette } = require('./palette-extractor.cjs');

const ASSET_TYPES = new Set(['logo', 'alternate_logo', 'favicon', 'brand_guidelines', 'font_reference', 'product_image', 'lifestyle_image', 'campaign_image', 'video', 'inspiration_screenshot', 'competitor_screenshot', 'miscellaneous_reference']);
// Shopify Files stay in the connected-store catalog. This project-scoped
// category is merchant intent about a remote file, not a copied upload.
const SHOPIFY_FILE_CATEGORIES = new Set(['unclassified', 'logo', 'hero', 'product', 'lifestyle', 'campaign', 'other']);
const EDIT_PERMISSION = 'interview:edit';

function titleFromFilename(filename) { return path.basename(filename, path.extname(filename)).replace(/[-_]+/g, ' ').trim().slice(0, 160) || 'Untitled asset'; }
function optionalText(value, label, maximum) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  assert(text.length <= maximum, 'asset_metadata_invalid', `${label} must be ${maximum} characters or fewer.`, 422);
  return text || null;
}
function clientAsset(asset) {
  const { storage_key, checksum_sha256, ...safe } = asset;
  return { ...safe, has_checksum: Boolean(checksum_sha256) };
}
function candidateMediaKind(resource) {
  if (resource.metadata?.media_type === 'VIDEO' || resource.metadata?.video_sources?.length) return 'video';
  if (resource.preview_url || resource.metadata?.image_url) return 'image';
  return 'file';
}
function candidateMatchesAssetFilter(candidate, assetType) {
  if (!assetType) return true;
  const expectedCategory = { logo: 'logo', product_image: 'product', lifestyle_image: 'lifestyle', campaign_image: 'campaign' }[assetType];
  if (expectedCategory) return candidate.asset_category === expectedCategory;
  if (assetType === 'video') return candidate.media_kind === 'video';
  return false;
}
function clientShopifyFileCandidate({ resource, approval, metadata }) {
  return {
    version: 1,
    id: resource.id,
    source: 'shopify_file',
    display_title: resource.display_title,
    asset_category: metadata?.asset_category || 'unclassified',
    media_kind: candidateMediaKind(resource),
    preview_url: resource.preview_url,
    alt_text: metadata?.alt_text || resource.metadata?.alt_text || null,
    notes: metadata?.notes || null,
    availability_status: resource.availability_status,
    approval_eligible: Boolean(resource.approval_eligible),
    approval_status: approval?.approval_status || 'pending',
    remote_updated_at: resource.remote_updated_at,
    last_synced_at: resource.last_synced_at
  };
}

class AssetService {
  constructor({ store, projectService, provider, clock = () => new Date() }) { this.store = store; this.projectService = projectService; this.provider = provider; this.clock = clock; }
  now() { return isoNow(this.clock); }
  async authorize({ userId, projectId, permission = 'project:view' }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, permission);
    return project;
  }
  async list({ userId, projectId, assetType = null }) {
    const project = await this.authorize({ userId, projectId });
    if (assetType) assert(ASSET_TYPES.has(assetType), 'asset_type_invalid', 'Choose a supported asset type.', 422);
    const [assets, profiles, assignment] = await Promise.all([
      this.store.listAssetsForProject(project.id, project.organization_id, { assetType }),
      this.store.listMerchantProfilesForProject(project.id),
      this.store.findProjectShopifyConnection(project.id, project.organization_id)
    ]);
    let shopifyFileCandidates = [];
    if (assignment?.connection) {
      const [entries, metadata] = await Promise.all([
        this.store.listProjectShopifyResources(project.id, assignment.connection.id, { resourceType: 'file' }),
        this.store.listShopifyFileCandidateMetadata(project.id, assignment.connection.id)
      ]);
      const metadataByResource = new Map(metadata.map((record) => [record.resource_id, record]));
      shopifyFileCandidates = entries
        .map((entry) => clientShopifyFileCandidate({ ...entry, metadata: metadataByResource.get(entry.resource.id) }))
        .filter((candidate) => candidateMatchesAssetFilter(candidate, assetType));
    }
    return {
      assets: assets.map((asset) => ({
        ...clientAsset(asset),
        profile_reference_count: profiles.filter((profile) => JSON.stringify(profile.profile).includes(asset.id)).length
      })),
      shopify_file_candidates: shopifyFileCandidates
    };
  }
  async categorizeShopifyFile({ userId, projectId, resourceId, assetCategory }) {
    const project = await this.authorize({ userId, projectId, permission: EDIT_PERMISSION });
    assert(SHOPIFY_FILE_CATEGORIES.has(assetCategory), 'shopify_file_category_invalid', 'Choose a supported use for this Shopify file.', 422);
    const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id);
    assert(assignment?.connection, 'shopify_connection_missing', 'Connect a Shopify store before categorizing its files.', 409);
    const resource = await this.store.findShopifyResource(resourceId, assignment.connection.id);
    assert(resource?.resource_type === 'file' && resource.availability_status === 'available' && resource.approval_eligible, 'shopify_file_unavailable', 'This Shopify file is no longer available. Refresh the store and choose another file.', 409);
    const current = await this.store.findShopifyFileCandidateMetadata(project.id, resource.id);
    const at = this.now();
    const metadata = await this.store.upsertShopifyFileCandidateMetadata({
      id: current?.id || createId('sfa'), project_id: project.id, connection_id: assignment.connection.id, resource_id: resource.id,
      asset_category: assetCategory, alt_text: current?.alt_text || resource.metadata?.alt_text || null, notes: current?.notes || null,
      categorized_by_user_id: userId, created_at: current?.created_at || at, updated_at: at
    });
    await this.activity(project, userId, 'shopify_file_categorized', { asset_category: assetCategory });
    return { candidate: clientShopifyFileCandidate({ resource, approval: await this.store.findShopifyResourceApproval(project.id, resource.id), metadata }) };
  }
  async upload({ userId, projectId, file, input = {} }) {
    const project = await this.authorize({ userId, projectId, permission: EDIT_PERMISSION });
    assert(ASSET_TYPES.has(input.asset_type), 'asset_type_invalid', 'Choose a supported asset type.', 422);
    const validated = validateUpload({ buffer: file.buffer, mimeType: file.mime_type, filename: file.filename });
    const id = createId('ast'); const extension = extensionFor(file.mime_type); const safeFilename = `${id.replace('_', '-')}${extension}`;
    const storageKey = `organizations/${project.organization_id}/projects/${project.id}/${id}/${safeFilename}`;
    const at = this.now();
    const record = {
      id, organization_id: project.organization_id, project_id: project.id, asset_type: input.asset_type,
      display_title: optionalText(input.display_title, 'Display title', 160) || titleFromFilename(validated.originalFilename), original_filename: validated.originalFilename,
      safe_filename: safeFilename, mime_type: file.mime_type, size_bytes: validated.size_bytes, checksum_sha256: validated.checksum_sha256,
      storage_key: storageKey, upload_status: 'ready', source_type: 'merchant_upload', processing_state: 'ready', width: validated.width, height: validated.height,
      alt_text: optionalText(input.alt_text, 'Alt text', 500), notes: optionalText(input.notes, 'Notes', 2000), created_by_user_id: userId, created_at: at, updated_at: at
    };
    try {
      await this.provider.put({ key: storageKey, buffer: file.buffer, checksumSha256: validated.checksum_sha256, contentType: file.mime_type });
      const asset = await this.store.createAsset(record);
      await this.activity(project, userId, 'asset_uploaded', { asset_id: asset.id, asset_type: asset.asset_type });
      return { asset: clientAsset(asset) };
    } catch (error) {
      await this.provider.remove({ key: storageKey }).catch(() => {});
      if (error instanceof DashboardError) throw error;
      throw new DashboardError('asset_upload_failed', 'The asset could not be stored safely. Please try again.', 500);
    }
  }
  async updateMetadata({ userId, projectId, assetId, input }) {
    const project = await this.authorize({ userId, projectId, permission: EDIT_PERMISSION });
    const current = await this.requireAsset(project, assetId);
    assert(current.upload_status === 'ready', 'asset_not_editable', 'This asset is no longer available to edit.', 409);
    const displayTitle = optionalText(input.display_title, 'Display title', 160) || current.display_title;
    const asset = await this.store.updateAssetMetadata(assetId, project.id, project.organization_id, { display_title: displayTitle, alt_text: optionalText(input.alt_text, 'Alt text', 500), notes: optionalText(input.notes, 'Notes', 2000) }, this.now());
    await this.activity(project, userId, 'asset_metadata_updated', { asset_id: asset.id });
    return { asset: clientAsset(asset) };
  }
  async read({ userId, projectId, assetId }) {
    const project = await this.authorize({ userId, projectId });
    const asset = await this.requireAsset(project, assetId);
    if (asset.upload_status !== 'ready') throw new DashboardError('asset_not_available', 'This asset is no longer available.', 404);
    const buffer = await this.provider.read({ key: asset.storage_key, checksumSha256: asset.checksum_sha256 }).catch(() => { throw new DashboardError('asset_not_available', 'This asset file is unavailable.', 404); });
    return { asset, buffer };
  }
  async extractLogoPalette({ userId, projectId, assetId }) {
    const { asset, buffer } = await this.read({ userId, projectId, assetId });
    if (asset.asset_type !== 'logo' && asset.asset_type !== 'alternate_logo') throw new DashboardError('palette_asset_invalid', 'Choose a logo asset for palette extraction.', 422);
    if (asset.mime_type !== 'image/png') throw new DashboardError('palette_source_unsupported', 'Palette extraction supports PNG logo files only in this release.', 422);
    const suggestions = extractPalette(buffer);
    const project = await this.store.findProjectById(projectId);
    await this.activity(project, userId, 'logo_palette_extracted', { asset_id: asset.id, method: 'local_png_quantization' });
    return { asset_id: asset.id, extraction_method: 'local_png_quantization', generated_at: this.now(), suggestions };
  }
  async delete({ userId, projectId, assetId, confirmed = false }) {
    const project = await this.authorize({ userId, projectId, permission: EDIT_PERMISSION });
    const current = await this.requireAsset(project, assetId);
    const profiles = await this.store.listMerchantProfilesForProject(project.id);
    const referencedByProfileIds = profiles.filter((profile) => JSON.stringify(profile.profile).includes(assetId)).map((profile) => profile.id);
    if (referencedByProfileIds.length && !confirmed) return { requires_confirmation: true, referenced_by_profile_ids: referencedByProfileIds };
    if (current.upload_status !== 'deleted') await this.provider.remove({ key: current.storage_key });
    const asset = await this.store.softDeleteAsset(assetId, project.id, project.organization_id, this.now());
    await this.activity(project, userId, 'asset_removed', { asset_id: assetId, referenced_by_profile_ids: referencedByProfileIds });
    return { requires_confirmation: false, asset: clientAsset(asset), referenced_by_profile_ids: referencedByProfileIds };
  }
  async assetsForProfileContext({ userId, projectId }) {
    const project = await this.authorize({ userId, projectId, permission: 'project:view' });
    const assets = await this.store.listAssetsForProject(project.id, project.organization_id);
    return { assets: assets.map(({ id, asset_type, checksum_sha256, upload_status }) => ({ id, asset_type, checksum_sha256, upload_status })) };
  }
  async requireAsset(project, assetId) {
    const asset = await this.store.findAssetForProject(assetId, project.id, project.organization_id);
    if (!asset) throw new DashboardError('asset_not_found', 'Asset not found.', 404);
    return asset;
  }
  async activity(project, userId, type, payload) {
    await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: userId, type, payload, created_at: this.now() });
  }
}

module.exports = { AssetService, ASSET_TYPES, SHOPIFY_FILE_CATEGORIES, clientAsset, clientShopifyFileCandidate };
