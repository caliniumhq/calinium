'use strict';

const crypto = require('crypto');
const { RESOURCE_TYPES } = require('./constants.cjs');

function safeText(value, fallback = 'Untitled Shopify item', maximum = 240) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return (text || fallback).slice(0, maximum);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function revision(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function imageUrl(node) { return node?.preview?.image?.url || node?.image?.url || node?.featuredMedia?.preview?.image?.url || null; }
function filenameFromUrl(value) {
  try {
    const filename = new URL(String(value)).pathname.split('/').pop();
    return filename ? decodeURIComponent(filename).replace(/[-_]+/g, ' ').trim() : null;
  } catch { return null; }
}
function merchantFileLabel(node) {
  // Shopify doesn't guarantee a filename or alt text for every File. A GID is
  // implementation metadata, never suitable as merchant-facing copy.
  const candidates = [node?.alt, node?.filename, node?.preview?.image?.altText]
    .map((value) => String(value || '').trim())
    .filter((value) => value && !/^gid:\/\/shopify\//i.test(value));
  return candidates[0] || 'Shopify media';
}
function resource({ connectionId, type, remoteGid, title, handle = null, status = null, previewUrl = null, metadata = {}, remoteUpdatedAt = null, approvalEligible = true }) {
  const normalized = { type, remote_gid: remoteGid, title: safeText(title), handle: handle ? String(handle).slice(0, 255) : null, status: status ? String(status).slice(0, 80) : null, preview_url: previewUrl || null, metadata: stable(metadata), remote_updated_at: remoteUpdatedAt || null };
  return { connection_id: connectionId, resource_type: type, remote_gid: remoteGid, display_title: normalized.title, handle: normalized.handle, resource_status: normalized.status, preview_url: normalized.preview_url, metadata: normalized.metadata, source_revision: revision(normalized), remote_updated_at: normalized.remote_updated_at, availability_status: 'available', approval_eligible: approvalEligible };
}
function themePreviewEligibility(theme) {
  if (!theme) return 'missing-theme';
  const role = String(theme.role || '').toUpperCase();
  if (role === 'MAIN') return 'ineligible-main-theme';
  if (role === 'DEMO') return 'ineligible-demo-theme';
  if (theme.processingFailed) return 'ineligible-processing-failed';
  if (theme.processing) return 'ineligible-processing';
  return ['DEVELOPMENT', 'UNPUBLISHED'].includes(role) ? 'eligible' : 'ineligible-unsupported-theme';
}
function normalizeProduct(connectionId, node) {
  const records = [resource({ connectionId, type: 'product', remoteGid: node.id, title: node.title, handle: node.handle, status: node.status, previewUrl: imageUrl(node), remoteUpdatedAt: node.updatedAt, metadata: { image_url: imageUrl(node), variant_count: (node.variants?.nodes || []).length } })];
  for (const variant of node.variants?.nodes || []) {
    const price = variant.price
      ? typeof variant.price === 'object'
        ? { amount: variant.price.amount, currency_code: variant.price.currencyCode || null }
        : { amount: String(variant.price), currency_code: null }
      : null;
    records.push(resource({ connectionId, type: 'variant', remoteGid: variant.id, title: `${safeText(node.title)} — ${safeText(variant.title)}`, status: variant.availableForSale ? 'available' : 'unavailable', remoteUpdatedAt: variant.updatedAt, metadata: { product_gid: node.id, sku: variant.sku || null, available_for_sale: Boolean(variant.availableForSale), price } }));
  }
  for (const media of node.media?.nodes || []) records.push(resource({ connectionId, type: 'product_media', remoteGid: media.id, title: `${safeText(node.title)} media`, status: media.mediaContentType || null, previewUrl: imageUrl(media), metadata: { product_gid: node.id, alt_text: media.alt || null, media_type: media.mediaContentType || null, image_url: imageUrl(media) } }));
  return records;
}
function normalizeResourceNodes(connectionId, type, nodes) {
  if (!RESOURCE_TYPES.includes(type)) throw new Error(`Unsupported Shopify resource type: ${type}`);
  const records = [];
  for (const node of nodes || []) {
    if (!node?.id) continue;
    if (type === 'product') { records.push(...normalizeProduct(connectionId, node)); continue; }
    if (type === 'collection') records.push(resource({ connectionId, type, remoteGid: node.id, title: node.title, handle: node.handle, previewUrl: imageUrl(node), remoteUpdatedAt: node.updatedAt, metadata: { image_url: imageUrl(node) } }));
    if (type === 'menu') records.push(resource({ connectionId, type, remoteGid: node.id, title: node.title, handle: node.handle, metadata: { item_count: (node.items || []).length, items: (node.items || []).slice(0, 25).map((item) => ({ title: safeText(item.title), type: item.type || null, url: item.url || null, resource_gid: item.resourceId || null })) } }));
    if (type === 'file') {
      const videoSources = Array.isArray(node.sources) ? node.sources.filter((source) => source?.url).map((source) => ({ url: source.url, mime_type: source.mimeType || null })) : [];
      records.push(resource({ connectionId, type, remoteGid: node.id, title: merchantFileLabel(node), previewUrl: imageUrl(node) || node.url || videoSources[0]?.url || null, remoteUpdatedAt: node.updatedAt || node.createdAt, metadata: { alt_text: node.alt || node.preview?.image?.altText || null, filename: node.filename || filenameFromUrl(imageUrl(node)) || filenameFromUrl(node.url) || filenameFromUrl(videoSources[0]?.url), image_url: imageUrl(node), file_url: node.url || videoSources[0]?.url || null, media_type: videoSources.length ? 'VIDEO' : imageUrl(node) ? 'IMAGE' : 'FILE', video_sources: videoSources } }));
    }
    if (type === 'market') records.push(resource({ connectionId, type, remoteGid: node.id, title: node.name, status: node.enabled ? 'enabled' : 'disabled', approvalEligible: false, metadata: { enabled: Boolean(node.enabled), primary_domain: node.webPresences?.nodes?.[0]?.domain?.url || null } }));
    if (type === 'theme') {
      const previewEligibility = themePreviewEligibility(node);
      records.push(resource({ connectionId, type, remoteGid: node.id, title: node.name, status: node.role, remoteUpdatedAt: node.updatedAt, approvalEligible: previewEligibility === 'eligible', metadata: { role: node.role || null, processing: Boolean(node.processing), processing_failed: Boolean(node.processingFailed), theme_store_id: node.themeStoreId || null, preview_eligibility: previewEligibility } }));
    }
  }
  return records;
}

module.exports = { safeText, revision, resource, normalizeResourceNodes, themePreviewEligibility, merchantFileLabel, filenameFromUrl };
