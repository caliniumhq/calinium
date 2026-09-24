'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { normalizeShopDomain } = require('./oauth.cjs');
const { DISCOVERY_SCOPES, WEBHOOK_TOPICS } = require('./constants.cjs');
const { assertShopAllowed } = require('./runtime-configuration.cjs');
const { PRIVACY_TOPICS, ShopifyPrivacyLifecycleService } = require('./privacy-lifecycle-service.cjs');

function header(headers, name) { return String(headers?.[name] || headers?.[name.toLowerCase()] || '').trim(); }
function payloadChecksum(rawBody) { return crypto.createHash('sha256').update(rawBody).digest('hex'); }
function verifyWebhookHmac({ rawBody, headers, clientSecret }) {
  assert(Buffer.isBuffer(rawBody), 'shopify_webhook_invalid', 'Shopify sent an invalid webhook request.', 400);
  const received = header(headers, 'x-shopify-hmac-sha256');
  assert(clientSecret && received, 'shopify_webhook_invalid', 'Shopify could not verify this webhook request.', 401);
  const expected = crypto.createHmac('sha256', clientSecret).update(rawBody).digest('base64');
  const left = Buffer.from(received, 'base64');
  const right = Buffer.from(expected, 'base64');
  assert(left.length === right.length && crypto.timingSafeEqual(left, right), 'shopify_webhook_invalid', 'Shopify could not verify this webhook request.', 401);
}
function grantedScopes(payload) {
  const source = Array.isArray(payload?.current) ? payload.current : Array.isArray(payload?.scopes) ? payload.scopes : [];
  return [...new Set(source.map((scope) => String(scope?.handle || scope || '').trim()).filter(Boolean))].sort();
}

class ShopifyWebhookService {
  constructor({ store, env = process.env, clock = () => new Date(), privacyLifecycle = null, authoritativeObjectService = null }) {
    this.store = store;
    this.env = env;
    this.clock = clock;
    this.privacyLifecycle = privacyLifecycle || new ShopifyPrivacyLifecycleService({ store, clock, authoritativeObjectService });
  }
  now() { return isoNow(this.clock); }
  async activity(connection, type, payload = {}) {
    for (const projectId of await this.store.listAssignedProjectIdsForShopifyConnection(connection.id)) {
      const project = await this.store.findProjectById(projectId);
      if (project) await this.store.createActivity({ id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: null, type, payload, created_at: this.now() });
    }
  }
  async process({ rawBody, headers }) {
    const clientSecret = String(this.env.CALINIUM_SHOPIFY_CLIENT_SECRET || '');
    verifyWebhookHmac({ rawBody, headers, clientSecret });
    const topic = header(headers, 'x-shopify-topic').toLowerCase();
    const webhookId = header(headers, 'x-shopify-webhook-id');
    const shopDomain = normalizeShopDomain(header(headers, 'x-shopify-shop-domain'));
    assertShopAllowed(shopDomain, this.env);
    assert(webhookId && topic, 'shopify_webhook_invalid', 'Shopify sent an invalid webhook request.', 400);
    let payload;
    try { payload = JSON.parse(rawBody.toString('utf8')); }
    catch { throw new DashboardError('shopify_webhook_invalid', 'Shopify sent an invalid webhook request.', 400); }
    const connection = await this.store.findShopifyConnectionByDomain(shopDomain);
    const created = await this.store.createShopifyWebhookDelivery({ id: createId('swd'), connection_id: connection?.id || null, webhook_id: webhookId, topic, shop_domain: shopDomain, payload_checksum: payloadChecksum(rawBody), processing_status: 'received', received_at: this.now() });
    if (!created.created) {
      if (['processed', 'ignored'].includes(created.delivery.processing_status)) return { accepted: true, duplicate: true };
      if (created.delivery.processing_status === 'failed') {
        const status = created.delivery.error_code === 'shopify_privacy_shop_mismatch' ? 403 : 400;
        throw new DashboardError(created.delivery.error_code || 'shopify_webhook_processing_failed', 'Shopify webhook processing previously failed safely.', status);
      }
      throw new DashboardError('shopify_webhook_processing_in_progress', 'Shopify webhook processing is already in progress.', 409);
    }
    try {
      if (!WEBHOOK_TOPICS.includes(topic) || (!connection && !PRIVACY_TOPICS.includes(topic))) {
        await this.store.completeShopifyWebhookDelivery(created.delivery.id, { processing_status: 'ignored', processed_at: this.now(), error_code: null });
        return { accepted: true, duplicate: false };
      }
      if (PRIVACY_TOPICS.includes(topic)) {
        const privacy = await this.privacyLifecycle.process({ topic, shopDomain, payload, delivery: created.delivery, connection });
        await this.store.completeShopifyWebhookDelivery(created.delivery.id, { processing_status: 'processed', processed_at: this.now(), error_code: null });
        return {
          accepted: true,
          duplicate: false,
          privacy_operation_id: privacy.operation.id,
          privacy_status: privacy.operation.operation_status,
          disposition_code: privacy.operation.disposition_code
        };
      }
      const at = this.now();
      if (topic === 'app/uninstalled') {
        const revoked = await this.store.revokeShopifyConnectionRuntimeAuthority(connection.id, connection.organization_id, at);
        for (const projectId of revoked?.project_ids || []) {
          const project = await this.store.findProjectById(projectId);
          if (project) await this.store.createActivity({
            id: createId('act'), organization_id: project.organization_id, project_id: project.id, actor_user_id: null,
            type: 'shopify_app_uninstalled',
            payload: { active_sessions_revoked: revoked.revoked_session_count, queued_jobs_cancelled: revoked.cancelled_job_count, running_jobs_fenced: revoked.fenced_job_count },
            created_at: at
          });
        }
      } else if (topic === 'app/scopes_update') {
        const granted = grantedScopes(payload);
        const missing = DISCOVERY_SCOPES.filter((scope) => !granted.includes(scope));
        const unexpected = granted.filter((scope) => !DISCOVERY_SCOPES.includes(scope));
        await this.store.updateShopifyConnection(connection.id, connection.organization_id, { ...connection, granted_scopes: granted, connection_status: missing.length ? 'reauthorization_required' : connection.last_synced_at ? 'ready' : 'sync_required', health: { status: missing.length ? 'missing_scopes' : 'healthy', missing_scopes: missing, unexpected_scopes: unexpected, checked_at: at, webhook_status: 'received', message: missing.length ? 'Shopify permissions need attention.' : null }, updated_at: at });
        await this.activity(connection, 'shopify_scopes_updated', { missing_scope_count: missing.length });
      } else if (topic === 'themes/delete') {
        const remoteId = String(payload?.admin_graphql_api_id || payload?.id || '').trim();
        const remoteGid = remoteId.startsWith('gid://') ? remoteId : remoteId ? `gid://shopify/OnlineStoreTheme/${remoteId}` : null;
        if (remoteGid) await this.store.markShopifyThemeDeleted(connection.id, remoteGid, at);
        await this.activity(connection, 'shopify_theme_deleted', { affected: Boolean(remoteGid) });
      }
      await this.store.completeShopifyWebhookDelivery(created.delivery.id, { processing_status: 'processed', processed_at: this.now(), error_code: null });
      return { accepted: true, duplicate: false };
    } catch (error) {
      const code = error instanceof DashboardError ? error.code : 'shopify_webhook_processing_failed';
      await this.store.completeShopifyWebhookDelivery(created.delivery.id, { processing_status: 'failed', processed_at: this.now(), error_code: code });
      throw error;
    }
  }
}

module.exports = { ShopifyWebhookService, verifyWebhookHmac, grantedScopes, payloadChecksum };
