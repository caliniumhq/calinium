'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { normalizeShopDomain } = require('./oauth.cjs');

const PRIVACY_TOPICS = Object.freeze(['customers/data_request', 'customers/redact', 'shop/redact']);
const RETENTION_POLICY_REVISION = 'founder-decision-required-v1';

function subjectReferenceDigest({ topic, shopDomain, payload }) {
  const customerId = payload?.customer?.id === undefined ? null : String(payload.customer.id);
  const requestId = payload?.data_request?.id === undefined ? null : String(payload.data_request.id);
  return crypto.createHash('sha256').update(JSON.stringify({ topic, shop_domain: shopDomain, customer_id: customerId, data_request_id: requestId })).digest('hex');
}

function numericShopId(value) {
  const match = String(value || '').match(/(?:^|\/)(\d+)$/);
  return match ? match[1] : null;
}

function assertCanonicalPrivacyPayload({ topic, shopDomain, payload, connection }) {
  assert(PRIVACY_TOPICS.includes(topic), 'shopify_privacy_topic_invalid', 'Shopify sent an unsupported privacy request.', 400);
  let payloadDomain;
  try { payloadDomain = normalizeShopDomain(payload?.shop_domain); }
  catch { throw new DashboardError('shopify_privacy_shop_invalid', 'Shopify sent an invalid privacy request.', 400); }
  assert(payloadDomain === shopDomain, 'shopify_privacy_shop_mismatch', 'Shopify sent a privacy request for a different store.', 403);
  const payloadShopId = numericShopId(payload?.shop_id);
  const connectionShopId = numericShopId(connection?.shop_gid);
  if (connection && payloadShopId && connectionShopId) {
    assert(payloadShopId === connectionShopId, 'shopify_privacy_shop_mismatch', 'Shopify sent a privacy request for a different store.', 403);
  }
  if (topic.startsWith('customers/')) {
    assert(payload?.customer?.id !== undefined && payload?.customer?.id !== null, 'shopify_privacy_subject_invalid', 'Shopify sent an invalid customer privacy request.', 400);
  }
  return payloadDomain;
}

class ShopifyPrivacyLifecycleService {
  constructor({ store, authoritativeObjectService = null, clock = () => new Date() }) {
    this.store = store;
    this.authoritativeObjectService = authoritativeObjectService;
    this.clock = clock;
  }

  now() { return this.clock().toISOString(); }

  async process({ topic, shopDomain, payload, delivery, connection }) {
    assertCanonicalPrivacyPayload({ topic, shopDomain, payload, connection });
    const at = this.now();
    const created = await this.store.createPrivacyLifecycleOperation({
      id: createId('plo'),
      webhook_delivery_id: delivery.id,
      connection_id: connection?.id || null,
      organization_id: connection?.organization_id || null,
      canonical_shop: shopDomain,
      topic,
      subject_reference_digest: subjectReferenceDigest({ topic, shopDomain, payload }),
      request_checksum: delivery.payload_checksum,
      operation_status: 'received',
      disposition_code: null,
      result: {},
      created_at: at,
      updated_at: at,
      completed_at: null
    });
    if (!created.created) return { operation: created.operation, duplicate: true };

    if (topic === 'customers/data_request') {
      return {
        operation: await this.store.completePrivacyLifecycleOperation(created.operation.id, {
          operation_status: 'completed',
          disposition_code: 'no_customer_data_stored',
          result: { customer_data_classes: [], export_required: false },
          updated_at: at,
          completed_at: at
        }),
        duplicate: false
      };
    }

    if (topic === 'customers/redact') {
      return {
        operation: await this.store.completePrivacyLifecycleOperation(created.operation.id, {
          operation_status: 'completed',
          disposition_code: 'no_customer_data_stored',
          result: { customer_data_classes: [], records_redacted: 0 },
          updated_at: at,
          completed_at: at
        }),
        duplicate: false
      };
    }

    const durableInventory = this.authoritativeObjectService
      ? await this.authoritativeObjectService.inventoryForShop({ canonicalShop: shopDomain })
      : [];
    let revocation = null;
    if (connection) {
      revocation = await this.store.revokeShopifyConnectionRuntimeAuthority(connection.id, connection.organization_id, at, {
        lifecycleState: 'redaction_requested',
        retentionPolicyRevision: RETENTION_POLICY_REVISION
      });
    } else {
      const current = await this.store.findShopDataLifecycleState(shopDomain);
      await this.store.upsertShopDataLifecycleState({
        canonical_shop: shopDomain,
        connection_id: current?.connection_id || null,
        organization_id: current?.organization_id || null,
        lifecycle_state: 'redaction_requested',
        retention_policy_revision: RETENTION_POLICY_REVISION,
        uninstall_at: current?.uninstall_at || null,
        redaction_requested_at: at,
        purge_after: null,
        purged_at: current?.purged_at || null,
        reinstall_count: current?.reinstall_count || 0,
        created_at: current?.created_at || at,
        updated_at: at
      });
    }
    return {
      operation: await this.store.completePrivacyLifecycleOperation(created.operation.id, {
        operation_status: 'retention_pending',
        disposition_code: 'founder_decision_required',
        result: {
          authority_revoked: Boolean(revocation),
          active_sessions_revoked: revocation?.revoked_session_count || 0,
          queued_jobs_cancelled: revocation?.cancelled_job_count || 0,
          running_jobs_fenced: revocation?.fenced_job_count || 0,
          durable_object_count: durableInventory.length,
          durable_object_classes: [...new Set(durableInventory.map((item) => item.object_class))].sort(),
          durable_object_disposition: 'FOUNDER_DECISION_REQUIRED',
          purge_after: null,
          retention_policy_revision: RETENTION_POLICY_REVISION
        },
        updated_at: at,
        completed_at: null
      }),
      duplicate: false
    };
  }
}

module.exports = {
  PRIVACY_TOPICS,
  RETENTION_POLICY_REVISION,
  ShopifyPrivacyLifecycleService,
  assertCanonicalPrivacyPayload,
  subjectReferenceDigest
};
