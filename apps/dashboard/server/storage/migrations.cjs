'use strict';

const migrations = [{
  version: 1,
  name: 'accounts_projects_and_interview_persistence',
  sql: `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'suspended')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_signed_in_at TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL UNIQUE REFERENCES organizations(id),
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL CHECK(role IN ('owner', 'administrator', 'editor', 'viewer')),
      status TEXT NOT NULL CHECK(status IN ('active', 'invited', 'suspended')),
      created_at TEXT NOT NULL,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      name TEXT NOT NULL,
      business_name TEXT NOT NULL,
      country TEXT NOT NULL,
      website_url TEXT,
      shopify_store_url TEXT,
      icon TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      current_merchant_profile_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      engine_session_json TEXT NOT NULL,
      active_category_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(project_id)
    );

    CREATE TABLE IF NOT EXISTS merchant_profiles (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      interview_session_id TEXT NOT NULL REFERENCES interview_sessions(id),
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_attempts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      successful INTEGER NOT NULL CHECK(successful IN (0, 1)),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT REFERENCES projects(id),
      actor_user_id TEXT REFERENCES users(id),
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      preferences_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_projects_org ON projects(organization_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_interview_project ON interview_sessions(project_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_profiles_project ON merchant_profiles(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_ip ON auth_attempts(email, ip_address, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_events(organization_id, created_at DESC);
  `
}, {
  version: 2,
  name: 'project_asset_library',
  sql: `
    CREATE TABLE IF NOT EXISTS project_assets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      asset_type TEXT NOT NULL CHECK(asset_type IN ('logo', 'alternate_logo', 'favicon', 'brand_guidelines', 'font_reference', 'product_image', 'lifestyle_image', 'campaign_image', 'video', 'inspiration_screenshot', 'competitor_screenshot', 'miscellaneous_reference')),
      display_title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      safe_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL CHECK(size_bytes >= 0),
      checksum_sha256 TEXT NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      upload_status TEXT NOT NULL CHECK(upload_status IN ('ready', 'failed', 'deleted')),
      source_type TEXT NOT NULL CHECK(source_type IN ('merchant_upload', 'merchant_reference')),
      processing_state TEXT NOT NULL CHECK(processing_state IN ('ready', 'pending', 'failed')),
      width INTEGER,
      height INTEGER,
      alt_text TEXT,
      notes TEXT,
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_project_assets_project ON project_assets(project_id, upload_status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_assets_organization ON project_assets(organization_id, project_id);
  `
}, {
  version: 3,
  name: 'creative_director_dashboard_sessions',
  sql: `
    CREATE TABLE IF NOT EXISTS creative_director_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
      stage TEXT NOT NULL CHECK(stage IN ('landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'resources', 'offer', 'generation', 'delivery', 'preview', 'finish')),
      conversation_state_json TEXT,
      transcript_json TEXT NOT NULL,
      creative_brief_json TEXT,
      store_strategy_json TEXT,
      review_json TEXT NOT NULL,
      merchant_profile_json TEXT,
      resource_plan_json TEXT NOT NULL,
      generation_context_json TEXT NOT NULL,
      generation_state_json TEXT NOT NULL,
      preview_state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creative_director_project ON creative_director_sessions(project_id, updated_at DESC);
  `
}, {
  version: 4,
  name: 'shopify_connection_and_project_resource_approvals',
  sql: `
    CREATE TABLE IF NOT EXISTS shopify_connections (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      shop_domain TEXT NOT NULL UNIQUE,
      shop_gid TEXT,
      display_name TEXT,
      storefront_url TEXT,
      primary_market_json TEXT NOT NULL,
      granted_scopes_json TEXT NOT NULL,
      connection_status TEXT NOT NULL CHECK(connection_status IN ('pending', 'connected', 'sync_required', 'synchronizing', 'ready', 'degraded', 'reauthorization_required', 'disconnected', 'revoked', 'failed')),
      credential_status TEXT NOT NULL CHECK(credential_status IN ('missing', 'active', 'revoked', 'invalid')),
      health_json TEXT NOT NULL,
      last_synced_at TEXT,
      connected_by_user_id TEXT REFERENCES users(id),
      connected_at TEXT,
      disconnected_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopify_credential_envelopes (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL UNIQUE REFERENCES shopify_connections(id),
      algorithm TEXT NOT NULL CHECK(algorithm IN ('aes-256-gcm')),
      key_id TEXT NOT NULL,
      initialization_vector TEXT NOT NULL,
      authentication_tag TEXT NOT NULL,
      ciphertext TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shopify_oauth_states (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      shop_domain TEXT NOT NULL,
      state_hash TEXT NOT NULL UNIQUE,
      nonce_hash TEXT NOT NULL,
      requested_scopes_json TEXT NOT NULL,
      purpose TEXT NOT NULL CHECK(purpose IN ('discovery', 'deployment')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_shopify_connections (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      assigned_by_user_id TEXT NOT NULL REFERENCES users(id),
      assignment_status TEXT NOT NULL CHECK(assignment_status IN ('assigned', 'disconnected')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, connection_id)
    );

    CREATE TABLE IF NOT EXISTS shopify_sync_runs (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      initiated_by_user_id TEXT REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'partial', 'failed')),
      resource_counts_json TEXT NOT NULL,
      errors_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shopify_resources (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      resource_type TEXT NOT NULL CHECK(resource_type IN ('shop', 'product', 'variant', 'product_media', 'collection', 'menu', 'file', 'market', 'theme')),
      remote_gid TEXT NOT NULL,
      display_title TEXT NOT NULL,
      handle TEXT,
      resource_status TEXT,
      preview_url TEXT,
      metadata_json TEXT NOT NULL,
      source_revision TEXT NOT NULL,
      remote_updated_at TEXT,
      last_synced_at TEXT NOT NULL,
      last_sync_run_id TEXT REFERENCES shopify_sync_runs(id),
      availability_status TEXT NOT NULL CHECK(availability_status IN ('available', 'stale', 'unavailable', 'deleted', 'permission_missing')),
      approval_eligible INTEGER NOT NULL CHECK(approval_eligible IN (0, 1)),
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(connection_id, resource_type, remote_gid)
    );

    CREATE TABLE IF NOT EXISTS project_shopify_resource_approvals (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      resource_id TEXT NOT NULL REFERENCES shopify_resources(id),
      approval_status TEXT NOT NULL CHECK(approval_status IN ('approved', 'rejected', 'revoked', 'stale', 'unavailable')),
      source_revision TEXT NOT NULL,
      merchant_note TEXT,
      approved_by_user_id TEXT REFERENCES users(id),
      approved_at TEXT,
      rejected_at TEXT,
      revoked_at TEXT,
      updated_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, resource_id)
    );

    CREATE TABLE IF NOT EXISTS shopify_preview_targets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      remote_theme_gid TEXT,
      remote_theme_id TEXT,
      theme_name TEXT,
      theme_role TEXT,
      preview_url TEXT,
      status TEXT NOT NULL CHECK(status IN ('not_requested', 'preparing', 'ready', 'expired', 'deleted', 'failed')),
      generated_build_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, connection_id)
    );

    CREATE TABLE IF NOT EXISTS shopify_preview_attempts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      preview_target_id TEXT REFERENCES shopify_preview_targets(id),
      generated_build_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('preparing', 'ready', 'failed', 'expired')),
      warning TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_shopify_connections_organization ON shopify_connections(organization_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_shopify_connections_project ON project_shopify_connections(project_id, assignment_status);
    CREATE INDEX IF NOT EXISTS idx_shopify_resources_connection ON shopify_resources(connection_id, resource_type, availability_status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shopify_resource_approvals_project ON project_shopify_resource_approvals(project_id, approval_status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shopify_oauth_states_hash ON shopify_oauth_states(state_hash, expires_at);
    CREATE INDEX IF NOT EXISTS idx_shopify_preview_attempts_project ON shopify_preview_attempts(project_id, created_at DESC);
  `
}, {
  version: 5,
  name: 'shopify_webhook_delivery_audit_log',
  sql: `
    CREATE TABLE IF NOT EXISTS shopify_webhook_deliveries (
      id TEXT PRIMARY KEY,
      connection_id TEXT REFERENCES shopify_connections(id),
      webhook_id TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      shop_domain TEXT NOT NULL,
      payload_checksum TEXT NOT NULL,
      processing_status TEXT NOT NULL CHECK(processing_status IN ('received', 'processed', 'ignored', 'failed')),
      received_at TEXT NOT NULL,
      processed_at TEXT,
      error_code TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_shopify_webhook_connection ON shopify_webhook_deliveries(connection_id, received_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shopify_webhook_shop ON shopify_webhook_deliveries(shop_domain, received_at DESC);
  `
}, {
  version: 6,
  name: 'shopify_embedded_dashboard_identities',
  sql: `
    CREATE TABLE IF NOT EXISTS shopify_embedded_identities (
      id TEXT PRIMARY KEY,
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      shop_domain TEXT NOT NULL,
      shopify_user_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_authenticated_at TEXT NOT NULL,
      UNIQUE(shop_domain, shopify_user_id),
      UNIQUE(connection_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_shopify_embedded_identity_user ON shopify_embedded_identities(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_shopify_embedded_identity_connection ON shopify_embedded_identities(connection_id, updated_at DESC);
  `
}, {
  version: 7,
  name: 'shopify_oauth_embedded_return_context',
  sql: `
    ALTER TABLE shopify_oauth_states ADD COLUMN embedded_host TEXT;
  `
}, {
  version: 8,
  name: 'paid_custom_theme_orders_and_generation_runs',
  sql: `
    CREATE TABLE IF NOT EXISTS custom_theme_orders (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      merchant_user_id TEXT NOT NULL REFERENCES users(id),
      shopify_connection_id TEXT REFERENCES shopify_connections(id),
      order_type TEXT NOT NULL CHECK(order_type IN ('custom_theme')),
      currency TEXT NOT NULL,
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
      generation_status TEXT NOT NULL CHECK(generation_status IN ('not_started', 'queued', 'specification_building', 'package_generating', 'validating', 'ready', 'blocked', 'validation_failed', 'generation_failed')),
      resource_plan_revision TEXT NOT NULL,
      source_theme_json TEXT NOT NULL,
      snapshot_id TEXT NOT NULL UNIQUE,
      snapshot_json TEXT NOT NULL,
      snapshot_checksum TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      artifacts_json TEXT NOT NULL,
      validation_result_json TEXT,
      failure_reason TEXT,
      paid_at TEXT,
      generated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS custom_theme_payment_events (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES custom_theme_orders(id),
      provider TEXT NOT NULL,
      provider_event_id TEXT NOT NULL UNIQUE,
      payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      currency TEXT NOT NULL,
      received_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS custom_theme_generation_runs (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES custom_theme_orders(id),
      attempt INTEGER NOT NULL CHECK(attempt > 0),
      generation_status TEXT NOT NULL CHECK(generation_status IN ('not_started', 'queued', 'specification_building', 'package_generating', 'validating', 'ready', 'blocked', 'validation_failed', 'generation_failed')),
      progress_json TEXT NOT NULL,
      output_reference TEXT,
      failure_reason TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(order_id, attempt)
    );

    CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_project ON custom_theme_orders(project_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_status ON custom_theme_orders(payment_status, generation_status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_custom_theme_generation_runs_order ON custom_theme_generation_runs(order_id, attempt DESC);
  `
}, {
  version: 9,
  name: 'creative_director_paid_theme_stages',
  async run(driver) {
    const stages = "'landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'resources', 'offer', 'generation', 'delivery', 'preview', 'finish'";
    if (driver.constructor.name === 'SqliteDriver') {
      await driver.exec(`
        CREATE TABLE creative_director_sessions_m16 (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
          stage TEXT NOT NULL CHECK(stage IN (${stages})),
          conversation_state_json TEXT,
          transcript_json TEXT NOT NULL,
          creative_brief_json TEXT,
          store_strategy_json TEXT,
          review_json TEXT NOT NULL,
          merchant_profile_json TEXT,
          resource_plan_json TEXT NOT NULL,
          generation_context_json TEXT NOT NULL,
          generation_state_json TEXT NOT NULL,
          preview_state_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO creative_director_sessions_m16 SELECT id, project_id, stage, conversation_state_json, transcript_json, creative_brief_json, store_strategy_json, review_json, merchant_profile_json, resource_plan_json, generation_context_json, generation_state_json, preview_state_json, created_at, updated_at FROM creative_director_sessions;
        DROP TABLE creative_director_sessions;
        ALTER TABLE creative_director_sessions_m16 RENAME TO creative_director_sessions;
        CREATE INDEX IF NOT EXISTS idx_creative_director_project ON creative_director_sessions(project_id, updated_at DESC);
      `);
      return;
    }
    await driver.exec(`
      ALTER TABLE creative_director_sessions DROP CONSTRAINT IF EXISTS creative_director_sessions_stage_check;
      ALTER TABLE creative_director_sessions ADD CONSTRAINT creative_director_sessions_stage_check CHECK(stage IN (${stages}));
    `);
  }
}, {
  version: 10,
  name: 'shopify_one_time_billing_and_paid_snapshot_boundary',
  async run(driver) {
    const orderStatus = "'pending', 'paid', 'failed', 'refunded', 'cancelled', 'declined', 'expired', 'invalid'";
    if (driver.constructor.name === 'SqliteDriver') {
      await driver.exec(`
        CREATE TABLE custom_theme_orders_m17 (
          id TEXT PRIMARY KEY,
          organization_id TEXT NOT NULL REFERENCES organizations(id),
          project_id TEXT NOT NULL REFERENCES projects(id),
          merchant_user_id TEXT NOT NULL REFERENCES users(id),
          shopify_connection_id TEXT REFERENCES shopify_connections(id),
          order_type TEXT NOT NULL CHECK(order_type IN ('custom_theme')),
          product_code TEXT NOT NULL,
          product_name TEXT NOT NULL,
          price_version TEXT NOT NULL,
          currency TEXT NOT NULL,
          amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
          payment_status TEXT NOT NULL CHECK(payment_status IN (${orderStatus})),
          generation_status TEXT NOT NULL CHECK(generation_status IN ('not_started', 'queued', 'specification_building', 'package_generating', 'validating', 'ready', 'blocked', 'validation_failed', 'generation_failed')),
          resource_plan_revision TEXT NOT NULL,
          purchase_intent_checksum TEXT NOT NULL,
          source_theme_json TEXT NOT NULL,
          snapshot_id TEXT UNIQUE,
          snapshot_json TEXT,
          snapshot_checksum TEXT,
          idempotency_key TEXT NOT NULL,
          artifacts_json TEXT NOT NULL,
          validation_result_json TEXT,
          failure_reason TEXT,
          paid_at TEXT,
          generated_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(project_id, idempotency_key)
        );
        INSERT INTO custom_theme_orders_m17 (id, organization_id, project_id, merchant_user_id, shopify_connection_id, order_type, product_code, product_name, price_version, currency, amount_cents, payment_status, generation_status, resource_plan_revision, purchase_intent_checksum, source_theme_json, snapshot_id, snapshot_json, snapshot_checksum, idempotency_key, artifacts_json, validation_result_json, failure_reason, paid_at, generated_at, created_at, updated_at)
          SELECT id, organization_id, project_id, merchant_user_id, shopify_connection_id, order_type, 'calinium_custom_storefront', 'Calinium custom storefront', 'legacy-m16', currency, amount_cents, payment_status, generation_status, resource_plan_revision, snapshot_checksum, source_theme_json, snapshot_id, snapshot_json, snapshot_checksum, idempotency_key, artifacts_json, validation_result_json, failure_reason, paid_at, generated_at, created_at, updated_at FROM custom_theme_orders;
        CREATE TABLE custom_theme_payment_events_m17 (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES custom_theme_orders_m17(id),
          provider TEXT NOT NULL,
          provider_event_id TEXT NOT NULL UNIQUE,
          payment_status TEXT NOT NULL CHECK(payment_status IN (${orderStatus})),
          amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
          currency TEXT NOT NULL,
          received_at TEXT NOT NULL,
          processed_at TEXT
        );
        INSERT INTO custom_theme_payment_events_m17 SELECT id, order_id, provider, provider_event_id, payment_status, amount_cents, currency, received_at, processed_at FROM custom_theme_payment_events;
        CREATE TABLE custom_theme_generation_runs_m17 (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL REFERENCES custom_theme_orders_m17(id),
          attempt INTEGER NOT NULL CHECK(attempt > 0),
          generation_status TEXT NOT NULL CHECK(generation_status IN ('not_started', 'queued', 'specification_building', 'package_generating', 'validating', 'ready', 'blocked', 'validation_failed', 'generation_failed')),
          progress_json TEXT NOT NULL,
          output_reference TEXT,
          failure_reason TEXT,
          started_at TEXT NOT NULL,
          completed_at TEXT,
          updated_at TEXT NOT NULL,
          UNIQUE(order_id, attempt)
        );
        INSERT INTO custom_theme_generation_runs_m17 SELECT id, order_id, attempt, generation_status, progress_json, output_reference, failure_reason, started_at, completed_at, updated_at FROM custom_theme_generation_runs;
        DROP TABLE custom_theme_generation_runs;
        DROP TABLE custom_theme_payment_events;
        DROP TABLE custom_theme_orders;
        ALTER TABLE custom_theme_orders_m17 RENAME TO custom_theme_orders;
        ALTER TABLE custom_theme_payment_events_m17 RENAME TO custom_theme_payment_events;
        ALTER TABLE custom_theme_generation_runs_m17 RENAME TO custom_theme_generation_runs;
        CREATE TABLE custom_theme_billing_purchases (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL UNIQUE REFERENCES custom_theme_orders(id),
          provider TEXT NOT NULL,
          provider_purchase_id TEXT UNIQUE,
          provider_status TEXT NOT NULL,
          confirmation_url TEXT,
          confirmation_url_status TEXT NOT NULL CHECK(confirmation_url_status IN ('not_required', 'issued', 'visited', 'expired', 'unavailable')),
          amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
          currency TEXT NOT NULL,
          test_mode INTEGER NOT NULL,
          idempotency_key TEXT NOT NULL UNIQUE,
          raw_event_digest TEXT,
          verified_at TEXT,
          cancelled_at TEXT,
          refunded_at TEXT,
          failure_reason TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_project ON custom_theme_orders(project_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_status ON custom_theme_orders(payment_status, generation_status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_intent ON custom_theme_orders(project_id, purchase_intent_checksum, payment_status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS idx_custom_theme_generation_runs_order ON custom_theme_generation_runs(order_id, attempt DESC);
        CREATE INDEX IF NOT EXISTS idx_custom_theme_billing_provider ON custom_theme_billing_purchases(provider, provider_purchase_id);
      `);
      return;
    }
    await driver.exec(`
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS product_code TEXT NOT NULL DEFAULT 'calinium_custom_storefront';
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT 'Calinium custom storefront';
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS price_version TEXT NOT NULL DEFAULT 'legacy-m16';
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS purchase_intent_checksum TEXT NOT NULL DEFAULT '';
      UPDATE custom_theme_orders SET purchase_intent_checksum = snapshot_checksum WHERE purchase_intent_checksum = '';
      ALTER TABLE custom_theme_orders ALTER COLUMN snapshot_id DROP NOT NULL;
      ALTER TABLE custom_theme_orders ALTER COLUMN snapshot_json DROP NOT NULL;
      ALTER TABLE custom_theme_orders ALTER COLUMN snapshot_checksum DROP NOT NULL;
      ALTER TABLE custom_theme_orders DROP CONSTRAINT IF EXISTS custom_theme_orders_payment_status_check;
      ALTER TABLE custom_theme_orders ADD CONSTRAINT custom_theme_orders_payment_status_check CHECK(payment_status IN (${orderStatus}));
      ALTER TABLE custom_theme_payment_events DROP CONSTRAINT IF EXISTS custom_theme_payment_events_payment_status_check;
      ALTER TABLE custom_theme_payment_events ADD CONSTRAINT custom_theme_payment_events_payment_status_check CHECK(payment_status IN (${orderStatus}));
      CREATE TABLE IF NOT EXISTS custom_theme_billing_purchases (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL UNIQUE REFERENCES custom_theme_orders(id),
        provider TEXT NOT NULL,
        provider_purchase_id TEXT UNIQUE,
        provider_status TEXT NOT NULL,
        confirmation_url TEXT,
        confirmation_url_status TEXT NOT NULL CHECK(confirmation_url_status IN ('not_required', 'issued', 'visited', 'expired', 'unavailable')),
        amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
        currency TEXT NOT NULL,
        test_mode BOOLEAN NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        raw_event_digest TEXT,
        verified_at TEXT,
        cancelled_at TEXT,
        refunded_at TEXT,
        failure_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_custom_theme_orders_intent ON custom_theme_orders(project_id, purchase_intent_checksum, payment_status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_custom_theme_billing_provider ON custom_theme_billing_purchases(provider, provider_purchase_id);
    `);
  }
}, {
  version: 11,
  name: 'custom_theme_purchase_and_generation_idempotency',
  sql: `
    CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_theme_orders_active_intent
      ON custom_theme_orders(project_id, purchase_intent_checksum)
      WHERE payment_status IN ('pending', 'paid');
  `
}, {
  version: 12,
  name: 'project_shopify_file_candidate_metadata',
  sql: `
    CREATE TABLE IF NOT EXISTS project_shopify_file_candidate_metadata (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      resource_id TEXT NOT NULL REFERENCES shopify_resources(id),
      asset_category TEXT NOT NULL CHECK(asset_category IN ('unclassified', 'logo', 'hero', 'product', 'lifestyle', 'campaign', 'other')),
      alt_text TEXT,
      notes TEXT,
      categorized_by_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(project_id, resource_id)
    );
    CREATE INDEX IF NOT EXISTS idx_project_shopify_file_candidate_metadata_project
      ON project_shopify_file_candidate_metadata(project_id, connection_id, updated_at DESC);
  `
}, {
  version: 13,
  name: 'approved_block_plan_revision_transport',
  async run(driver) {
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS approved_block_plan_revisions (
        revision_id TEXT PRIMARY KEY,
        plan_id TEXT NOT NULL,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        merchant_scope_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        approval_reference TEXT NOT NULL,
        approval_revision_id TEXT NOT NULL,
        approved_at TEXT NOT NULL,
        plan_checksum TEXT NOT NULL,
        resource_snapshot_id TEXT NOT NULL,
        resource_snapshot_revision_id TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, revision_id)
      );
      CREATE TABLE IF NOT EXISTS approved_block_plan_resource_snapshots (
        revision_id TEXT PRIMARY KEY,
        snapshot_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        plan_revision_id TEXT NOT NULL REFERENCES approved_block_plan_revisions(revision_id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        merchant_scope_id TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        approval_reference TEXT NOT NULL,
        approval_revision_id TEXT NOT NULL,
        approved_at TEXT NOT NULL,
        source_revision TEXT NOT NULL,
        snapshot_checksum TEXT NOT NULL,
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, snapshot_id),
        UNIQUE(project_id, plan_revision_id, revision_id)
      );
      CREATE INDEX IF NOT EXISTS idx_approved_block_plan_revisions_project
        ON approved_block_plan_revisions(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_approved_block_plan_resource_snapshots_project
        ON approved_block_plan_resource_snapshots(project_id, created_at DESC);
    `);
    if (driver.constructor.name === 'SqliteDriver') {
      await driver.exec(`
        ALTER TABLE custom_theme_orders ADD COLUMN approved_block_plan_revision_id TEXT;
        ALTER TABLE custom_theme_orders ADD COLUMN approved_resource_snapshot_revision_id TEXT;
      `);
      return;
    }
    await driver.exec(`
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS approved_block_plan_revision_id TEXT;
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS approved_resource_snapshot_revision_id TEXT;
    `);
  }
}, {
  version: 14,
  name: 'creative_director_editorial_grid_candidate_review',
  async run(driver) {
    const stages = "'landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'resources', 'content-plan', 'offer', 'generation', 'delivery', 'preview', 'finish'";
    if (driver.constructor.name === 'SqliteDriver') {
      await driver.exec(`
        CREATE TABLE creative_director_sessions_m17 (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
          stage TEXT NOT NULL CHECK(stage IN (${stages})),
          conversation_state_json TEXT,
          transcript_json TEXT NOT NULL,
          creative_brief_json TEXT,
          store_strategy_json TEXT,
          review_json TEXT NOT NULL,
          merchant_profile_json TEXT,
          resource_plan_json TEXT NOT NULL,
          generation_context_json TEXT NOT NULL,
          generation_state_json TEXT NOT NULL,
          preview_state_json TEXT NOT NULL,
          content_plan_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO creative_director_sessions_m17
          SELECT id, project_id, stage, conversation_state_json, transcript_json, creative_brief_json, store_strategy_json, review_json, merchant_profile_json, resource_plan_json, generation_context_json, generation_state_json, preview_state_json, '{}', created_at, updated_at
          FROM creative_director_sessions;
        DROP TABLE creative_director_sessions;
        ALTER TABLE creative_director_sessions_m17 RENAME TO creative_director_sessions;
        CREATE INDEX IF NOT EXISTS idx_creative_director_project ON creative_director_sessions(project_id, updated_at DESC);
      `);
      return;
    }
    await driver.exec(`
      ALTER TABLE creative_director_sessions DROP CONSTRAINT IF EXISTS creative_director_sessions_stage_check;
      ALTER TABLE creative_director_sessions ADD CONSTRAINT creative_director_sessions_stage_check CHECK(stage IN (${stages}));
      ALTER TABLE creative_director_sessions ADD COLUMN IF NOT EXISTS content_plan_json TEXT NOT NULL DEFAULT '{}';
    `);
  }
}, {
  version: 15,
  name: 'approved_storefront_preset_revisions',
  async run(driver) {
    const stages = "'landing', 'conversation', 'understanding', 'blueprint', 'strategy', 'preset', 'resources', 'content-plan', 'offer', 'generation', 'delivery', 'preview', 'finish'";
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS approved_preset_revisions (
        revision_id TEXT PRIMARY KEY,
        preset_id TEXT NOT NULL,
        preset_version TEXT NOT NULL,
        catalog_version TEXT NOT NULL,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        merchant_scope_id TEXT NOT NULL,
        strategy_revision TEXT NOT NULL,
        approval_id TEXT NOT NULL,
        approval_reference TEXT NOT NULL,
        approved_by_user_id TEXT NOT NULL REFERENCES users(id),
        approved_at TEXT NOT NULL,
        preset_checksum TEXT NOT NULL,
        revision_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(project_id, revision_id)
      );
      CREATE INDEX IF NOT EXISTS idx_approved_preset_revisions_project
        ON approved_preset_revisions(project_id, created_at DESC);
    `);
    if (driver.constructor.name === 'SqliteDriver') {
      await driver.exec(`
        CREATE TABLE creative_director_sessions_m18 (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
          stage TEXT NOT NULL CHECK(stage IN (${stages})),
          conversation_state_json TEXT,
          transcript_json TEXT NOT NULL,
          creative_brief_json TEXT,
          store_strategy_json TEXT,
          review_json TEXT NOT NULL,
          merchant_profile_json TEXT,
          resource_plan_json TEXT NOT NULL,
          generation_context_json TEXT NOT NULL,
          generation_state_json TEXT NOT NULL,
          preview_state_json TEXT NOT NULL,
          content_plan_json TEXT NOT NULL,
          preset_selection_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        INSERT INTO creative_director_sessions_m18
          SELECT id, project_id, stage, conversation_state_json, transcript_json, creative_brief_json, store_strategy_json, review_json, merchant_profile_json, resource_plan_json, generation_context_json, generation_state_json, preview_state_json, content_plan_json, '{}', created_at, updated_at
          FROM creative_director_sessions;
        DROP TABLE creative_director_sessions;
        ALTER TABLE creative_director_sessions_m18 RENAME TO creative_director_sessions;
        CREATE INDEX IF NOT EXISTS idx_creative_director_project ON creative_director_sessions(project_id, updated_at DESC);
        ALTER TABLE custom_theme_orders ADD COLUMN approved_preset_revision_id TEXT;
      `);
      return;
    }
    await driver.exec(`
      ALTER TABLE creative_director_sessions DROP CONSTRAINT IF EXISTS creative_director_sessions_stage_check;
      ALTER TABLE creative_director_sessions ADD CONSTRAINT creative_director_sessions_stage_check CHECK(stage IN (${stages}));
      ALTER TABLE creative_director_sessions ADD COLUMN IF NOT EXISTS preset_selection_json TEXT NOT NULL DEFAULT '{}';
      ALTER TABLE custom_theme_orders ADD COLUMN IF NOT EXISTS approved_preset_revision_id TEXT;
    `);
  }
}, {
  version: 16,
  name: 'authenticated_shop_project_bootstrap',
  sql: `
    CREATE TABLE IF NOT EXISTS shopify_project_bootstrap_bindings (
      connection_id TEXT PRIMARY KEY REFERENCES shopify_connections(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT NOT NULL UNIQUE REFERENCES projects(id),
      created_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shopify_project_bootstrap_organization
      ON shopify_project_bootstrap_bindings(organization_id, updated_at DESC);
  `
}, {
  version: 17,
  name: 'automatic_merchant_intake',
  sql: `
    CREATE TABLE IF NOT EXISTS merchant_intake_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      parent_revision_id TEXT REFERENCES merchant_intake_revisions(revision_id),
      normalization_version TEXT NOT NULL,
      evidence_fingerprint TEXT NOT NULL,
      intake_status TEXT NOT NULL CHECK(intake_status IN ('usable', 'partial')),
      store_intelligence_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      source_sync_run_id TEXT REFERENCES shopify_sync_runs(id),
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_intake_revisions_project
      ON merchant_intake_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS merchant_intake_states (
      project_id TEXT PRIMARY KEY REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      status TEXT NOT NULL CHECK(status IN ('learning', 'usable', 'partial', 'stale', 'refresh_failed')),
      current_revision_id TEXT REFERENCES merchant_intake_revisions(revision_id),
      active_run_id TEXT,
      last_attempt_at TEXT,
      last_success_at TEXT,
      last_error_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_intake_states_connection
      ON merchant_intake_states(connection_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS merchant_intake_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      initiated_by_user_id TEXT REFERENCES users(id),
      trigger_type TEXT NOT NULL CHECK(trigger_type IN ('automatic', 'explicit', 'shopify_sync')),
      status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'partial', 'failed', 'unchanged')),
      source_sync_run_id TEXT REFERENCES shopify_sync_runs(id),
      revision_id TEXT REFERENCES merchant_intake_revisions(revision_id),
      errors_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_intake_runs_project
      ON merchant_intake_runs(project_id, started_at DESC);
  `
}, {
  version: 18,
  name: 'recommended_resource_set_revisions',
  sql: `
    CREATE TABLE IF NOT EXISTS recommended_resource_set_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      parent_revision_id TEXT REFERENCES recommended_resource_set_revisions(revision_id),
      intake_revision_id TEXT,
      preset_revision_id TEXT,
      recommendation_version TEXT NOT NULL,
      evidence_fingerprint TEXT NOT NULL,
      recommendation_checksum TEXT NOT NULL,
      readiness TEXT NOT NULL CHECK(readiness IN ('ready', 'review_required', 'blocked')),
      slots_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, recommendation_version, evidence_fingerprint)
    );
    CREATE INDEX IF NOT EXISTS idx_recommended_resource_sets_project
      ON recommended_resource_set_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS approved_resource_set_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      candidate_revision_id TEXT NOT NULL REFERENCES recommended_resource_set_revisions(revision_id),
      parent_revision_id TEXT REFERENCES approved_resource_set_revisions(revision_id),
      approval_id TEXT NOT NULL,
      approval_reference TEXT NOT NULL,
      approved_by_user_id TEXT NOT NULL REFERENCES users(id),
      approved_at TEXT NOT NULL,
      approval_checksum TEXT NOT NULL,
      assignments_json TEXT NOT NULL,
      handoff_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, candidate_revision_id)
    );
    CREATE INDEX IF NOT EXISTS idx_approved_resource_sets_project
      ON approved_resource_set_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS recommended_resource_set_states (
      project_id TEXT PRIMARY KEY REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      status TEXT NOT NULL CHECK(status IN ('waiting', 'recommended', 'review_required', 'approved', 'stale', 'blocked')),
      current_revision_id TEXT REFERENCES recommended_resource_set_revisions(revision_id),
      current_approved_revision_id TEXT REFERENCES approved_resource_set_revisions(revision_id),
      overrides_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_resource_set_states_connection
      ON recommended_resource_set_states(connection_id, updated_at DESC);
  `
}, {
  version: 19,
  name: 'storefront_recommendation_and_design_dna_revisions',
  sql: `
    CREATE TABLE IF NOT EXISTS storefront_recommendation_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      parent_revision_id TEXT REFERENCES storefront_recommendation_revisions(revision_id),
      engine_version TEXT NOT NULL,
      evidence_fingerprint TEXT NOT NULL,
      recommendation_checksum TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('recommended', 'review_required')),
      recommendation_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, engine_version, evidence_fingerprint)
    );
    CREATE INDEX IF NOT EXISTS idx_storefront_recommendations_project
      ON storefront_recommendation_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS approved_storefront_recommendation_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      candidate_revision_id TEXT NOT NULL REFERENCES storefront_recommendation_revisions(revision_id),
      parent_revision_id TEXT REFERENCES approved_storefront_recommendation_revisions(revision_id),
      preset_revision_id TEXT NOT NULL,
      approval_reference TEXT NOT NULL,
      approved_by_user_id TEXT NOT NULL REFERENCES users(id),
      approved_at TEXT NOT NULL,
      approval_checksum TEXT NOT NULL,
      approved_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, candidate_revision_id)
    );
    CREATE INDEX IF NOT EXISTS idx_approved_storefront_recommendations_project
      ON approved_storefront_recommendation_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS design_dna_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      parent_revision_id TEXT REFERENCES design_dna_revisions(revision_id),
      recommendation_revision_id TEXT NOT NULL REFERENCES storefront_recommendation_revisions(revision_id),
      engine_version TEXT NOT NULL,
      evidence_fingerprint TEXT NOT NULL,
      dna_checksum TEXT NOT NULL,
      dna_json TEXT NOT NULL,
      provenance_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, engine_version, evidence_fingerprint)
    );
    CREATE INDEX IF NOT EXISTS idx_design_dna_revisions_project
      ON design_dna_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS approved_design_dna_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      candidate_revision_id TEXT NOT NULL REFERENCES design_dna_revisions(revision_id),
      recommendation_approval_revision_id TEXT NOT NULL REFERENCES approved_storefront_recommendation_revisions(revision_id),
      parent_revision_id TEXT REFERENCES approved_design_dna_revisions(revision_id),
      approval_reference TEXT NOT NULL,
      approved_by_user_id TEXT NOT NULL REFERENCES users(id),
      approved_at TEXT NOT NULL,
      approval_checksum TEXT NOT NULL,
      approved_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(project_id, candidate_revision_id)
    );
    CREATE INDEX IF NOT EXISTS idx_approved_design_dna_project
      ON approved_design_dna_revisions(project_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS creative_direction_states (
      project_id TEXT PRIMARY KEY REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      status TEXT NOT NULL CHECK(status IN ('waiting', 'recommended', 'review_required', 'approved', 'stale', 'blocked')),
      current_recommendation_revision_id TEXT REFERENCES storefront_recommendation_revisions(revision_id),
      current_approved_recommendation_revision_id TEXT REFERENCES approved_storefront_recommendation_revisions(revision_id),
      current_dna_revision_id TEXT REFERENCES design_dna_revisions(revision_id),
      current_approved_dna_revision_id TEXT REFERENCES approved_design_dna_revisions(revision_id),
      explicit_preset_id TEXT,
      dna_overrides_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_creative_direction_states_connection
      ON creative_direction_states(connection_id, updated_at DESC);
  `
}, {
  version: 20,
  name: 'live_preview_revisions',
  sql: `
    CREATE TABLE IF NOT EXISTS live_preview_revisions (
      revision_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      parent_revision_id TEXT REFERENCES live_preview_revisions(revision_id),
      sequence INTEGER NOT NULL,
      renderer_version TEXT NOT NULL,
      preview_state TEXT NOT NULL CHECK(preview_state IN ('provisional', 'approved', 'generated')),
      dependency_fingerprint TEXT NOT NULL,
      dependency_graph_json TEXT NOT NULL,
      region_fingerprints_json TEXT NOT NULL,
      model_checksum TEXT NOT NULL,
      model_json TEXT NOT NULL,
      source_status TEXT NOT NULL CHECK(source_status IN ('current', 'generated_trusted')),
      created_at TEXT NOT NULL,
      UNIQUE(project_id, renderer_version, dependency_fingerprint)
    );
    CREATE INDEX IF NOT EXISTS idx_live_preview_revisions_project
      ON live_preview_revisions(project_id, sequence DESC);

    CREATE TABLE IF NOT EXISTS live_preview_states (
      project_id TEXT PRIMARY KEY REFERENCES projects(id),
      connection_id TEXT NOT NULL REFERENCES shopify_connections(id),
      status TEXT NOT NULL CHECK(status IN ('thinking', 'ready', 'stale', 'failed')),
      current_revision_id TEXT REFERENCES live_preview_revisions(revision_id),
      last_stable_revision_id TEXT REFERENCES live_preview_revisions(revision_id),
      current_sequence INTEGER NOT NULL DEFAULT 0,
      last_error_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_live_preview_states_connection
      ON live_preview_states(connection_id, updated_at DESC);
  `
}, {
  version: 21,
  name: 'merchant_flow_beta_operations',
  sql: `
    CREATE TABLE IF NOT EXISTS merchant_flow_jobs (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      job_kind TEXT NOT NULL CHECK(job_kind IN ('generation', 'render_qa')),
      identity_checksum TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'retryable', 'terminal')),
      attempt INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL,
      result_json TEXT,
      lease_token TEXT,
      lease_expires_at TEXT,
      failure_category TEXT,
      failure_message TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE(flow_id, job_kind, identity_checksum)
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_flow_jobs_project
      ON merchant_flow_jobs(project_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_merchant_flow_jobs_recovery
      ON merchant_flow_jobs(status, lease_expires_at, updated_at);

    CREATE TABLE IF NOT EXISTS merchant_flow_operational_events (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      project_id TEXT NOT NULL REFERENCES projects(id),
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      event_type TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_merchant_flow_events_project
      ON merchant_flow_operational_events(project_id, created_at DESC);
  `
}, {
  version: 22,
  name: 'merchant_flow_operator_operations_and_cancellation',
  async run(driver) {
    if (driver.database) {
      await driver.exec(`
        DROP TABLE IF EXISTS merchant_flow_jobs_m22;
        CREATE TABLE merchant_flow_jobs_m22 (
          id TEXT PRIMARY KEY,
          flow_id TEXT NOT NULL,
          project_id TEXT NOT NULL REFERENCES projects(id),
          organization_id TEXT NOT NULL REFERENCES organizations(id),
          job_kind TEXT NOT NULL CHECK(job_kind IN ('generation', 'render_qa')),
          identity_checksum TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'retryable', 'terminal', 'cancellation_requested', 'cancelled')),
          attempt INTEGER NOT NULL DEFAULT 0,
          payload_json TEXT NOT NULL,
          result_json TEXT,
          lease_token TEXT,
          lease_expires_at TEXT,
          failure_category TEXT,
          failure_message TEXT,
          cancellation_requested_at TEXT,
          cancelled_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          UNIQUE(flow_id, job_kind, identity_checksum)
        );
        INSERT INTO merchant_flow_jobs_m22(
          id, flow_id, project_id, organization_id, job_kind, identity_checksum, status, attempt,
          payload_json, result_json, lease_token, lease_expires_at, failure_category, failure_message,
          cancellation_requested_at, cancelled_at, created_at, updated_at, completed_at
        )
        SELECT id, flow_id, project_id, organization_id, job_kind, identity_checksum, status, attempt,
          payload_json, result_json, lease_token, lease_expires_at, failure_category, failure_message,
          NULL, NULL, created_at, updated_at, completed_at
        FROM merchant_flow_jobs;
        DROP TABLE merchant_flow_jobs;
        ALTER TABLE merchant_flow_jobs_m22 RENAME TO merchant_flow_jobs;
        CREATE INDEX idx_merchant_flow_jobs_project ON merchant_flow_jobs(project_id, updated_at DESC);
        CREATE INDEX idx_merchant_flow_jobs_recovery ON merchant_flow_jobs(status, lease_expires_at, updated_at);
      `);
    } else {
      await driver.exec(`
        ALTER TABLE merchant_flow_jobs ADD COLUMN IF NOT EXISTS cancellation_requested_at TEXT;
        ALTER TABLE merchant_flow_jobs ADD COLUMN IF NOT EXISTS cancelled_at TEXT;
        ALTER TABLE merchant_flow_jobs DROP CONSTRAINT IF EXISTS merchant_flow_jobs_status_check;
        ALTER TABLE merchant_flow_jobs ADD CONSTRAINT merchant_flow_jobs_status_check
          CHECK(status IN ('queued', 'running', 'completed', 'retryable', 'terminal', 'cancellation_requested', 'cancelled'));
      `);
    }
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS merchant_flow_operator_operations (
        id TEXT PRIMARY KEY,
        flow_id TEXT NOT NULL,
        project_id TEXT NOT NULL REFERENCES projects(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        operation_kind TEXT NOT NULL CHECK(operation_kind IN ('qa_review', 'repair_resolution', 'cancel')),
        idempotency_key TEXT NOT NULL,
        request_checksum TEXT NOT NULL,
        expected_flow_sequence INTEGER NOT NULL,
        expected_flow_checksum TEXT NOT NULL,
        evidence_json TEXT NOT NULL,
        decision TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'applied')),
        result_flow_sequence INTEGER,
        result_flow_checksum TEXT,
        result_flow_state TEXT,
        created_at TEXT NOT NULL,
        applied_at TEXT,
        UNIQUE(flow_id, operation_kind, idempotency_key)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_operator_operations_project
        ON merchant_flow_operator_operations(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_operator_operations_flow
        ON merchant_flow_operator_operations(flow_id, operation_kind, created_at DESC);
    `);
  }
}, {
  version: 23,
  name: 'merchant_flow_resume_operations_and_claim_fencing',
  async run(driver) {
    if (driver.database) {
      await driver.exec(`
        DROP TABLE IF EXISTS merchant_flow_jobs_m23;
        CREATE TABLE merchant_flow_jobs_m23 (
          id TEXT PRIMARY KEY,
          flow_id TEXT NOT NULL,
          project_id TEXT NOT NULL REFERENCES projects(id),
          organization_id TEXT NOT NULL REFERENCES organizations(id),
          job_kind TEXT NOT NULL CHECK(job_kind IN ('generation', 'render_qa')),
          identity_checksum TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'completed', 'retryable', 'terminal', 'cancellation_requested', 'cancelled')),
          attempt INTEGER NOT NULL DEFAULT 0,
          lease_epoch INTEGER NOT NULL DEFAULT 0 CHECK(lease_epoch >= 0),
          authorized_resume_operation_id TEXT,
          authorized_attempt INTEGER CHECK(authorized_attempt IS NULL OR authorized_attempt > 0),
          payload_json TEXT NOT NULL,
          result_json TEXT,
          lease_token TEXT,
          lease_expires_at TEXT,
          failure_category TEXT,
          failure_message TEXT,
          cancellation_requested_at TEXT,
          cancelled_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          UNIQUE(flow_id, job_kind, identity_checksum)
        );
        INSERT INTO merchant_flow_jobs_m23(
          id, flow_id, project_id, organization_id, job_kind, identity_checksum, status, attempt,
          lease_epoch, authorized_resume_operation_id, authorized_attempt,
          payload_json, result_json, lease_token, lease_expires_at, failure_category, failure_message,
          cancellation_requested_at, cancelled_at, created_at, updated_at, completed_at
        )
        SELECT id, flow_id, project_id, organization_id, job_kind, identity_checksum, status, attempt,
          0, NULL, NULL,
          payload_json, result_json, lease_token, lease_expires_at, failure_category, failure_message,
          cancellation_requested_at, cancelled_at, created_at, updated_at, completed_at
        FROM merchant_flow_jobs;
        DROP TABLE merchant_flow_jobs;
        ALTER TABLE merchant_flow_jobs_m23 RENAME TO merchant_flow_jobs;
        CREATE INDEX idx_merchant_flow_jobs_project ON merchant_flow_jobs(project_id, updated_at DESC);
        CREATE INDEX idx_merchant_flow_jobs_recovery ON merchant_flow_jobs(status, lease_expires_at, updated_at);
      `);
    } else {
      await driver.exec(`
        ALTER TABLE merchant_flow_jobs ADD COLUMN IF NOT EXISTS lease_epoch INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE merchant_flow_jobs ADD COLUMN IF NOT EXISTS authorized_resume_operation_id TEXT;
        ALTER TABLE merchant_flow_jobs ADD COLUMN IF NOT EXISTS authorized_attempt INTEGER;
      `);
    }
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS merchant_flow_resume_operations (
        id TEXT PRIMARY KEY,
        flow_id TEXT NOT NULL,
        job_id TEXT NOT NULL REFERENCES merchant_flow_jobs(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        operation_kind TEXT NOT NULL CHECK(operation_kind IN ('generation_retry', 'render_qa_retry')),
        idempotency_key TEXT NOT NULL,
        request_checksum TEXT NOT NULL,
        request_id TEXT,
        expected_flow_sequence INTEGER NOT NULL,
        expected_flow_checksum TEXT NOT NULL,
        expected_job_attempt INTEGER NOT NULL CHECK(expected_job_attempt >= 0),
        target_job_attempt INTEGER NOT NULL CHECK(target_job_attempt = expected_job_attempt + 1),
        status TEXT NOT NULL CHECK(status IN ('pending', 'applied')),
        result_flow_sequence INTEGER,
        result_flow_checksum TEXT,
        result_flow_state TEXT,
        created_at TEXT NOT NULL,
        applied_at TEXT,
        UNIQUE(flow_id, operation_kind, idempotency_key),
        UNIQUE(job_id, target_job_attempt)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_resume_operations_project
        ON merchant_flow_resume_operations(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_resume_operations_flow
        ON merchant_flow_resume_operations(flow_id, operation_kind, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_resume_operations_job
        ON merchant_flow_resume_operations(job_id, target_job_attempt DESC);
    `);
  }
}, {
  version: 24,
  name: 'merchant_flow_legacy_d2_7_lineage_bindings',
  async run(driver) {
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS merchant_flow_legacy_d2_7_lineage_bindings (
        resolution_id TEXT PRIMARY KEY,
        contract_version TEXT NOT NULL,
        resolver_revision TEXT NOT NULL,
        resolution_checksum TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK(status IN ('authoritative_match', 'unique_legacy_match')),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        flow_id TEXT NOT NULL,
        current_flow_sequence INTEGER NOT NULL CHECK(current_flow_sequence >= 0),
        current_flow_checksum TEXT NOT NULL,
        job_id TEXT NOT NULL REFERENCES merchant_flow_jobs(id),
        logical_attempt INTEGER NOT NULL CHECK(logical_attempt >= 1),
        artifact_id TEXT NOT NULL,
        artifact_checksum TEXT NOT NULL,
        development_shop TEXT NOT NULL,
        development_theme_id TEXT NOT NULL,
        runtime_configuration_revision TEXT NOT NULL,
        render_target_configuration_revision TEXT NOT NULL,
        deployed_source_revision TEXT,
        candidate_set_checksum TEXT NOT NULL,
        selected_candidate_id TEXT NOT NULL,
        resolution_json TEXT NOT NULL,
        resume_operation_id TEXT NOT NULL REFERENCES merchant_flow_resume_operations(id),
        created_at TEXT NOT NULL,
        UNIQUE(flow_id, job_id, logical_attempt)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_legacy_d2_7_bindings_project
        ON merchant_flow_legacy_d2_7_lineage_bindings(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_legacy_d2_7_bindings_flow
        ON merchant_flow_legacy_d2_7_lineage_bindings(flow_id, current_flow_sequence DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_legacy_d2_7_bindings_job
        ON merchant_flow_legacy_d2_7_lineage_bindings(job_id, logical_attempt DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_merchant_flow_legacy_d2_7_bindings_resume
        ON merchant_flow_legacy_d2_7_lineage_bindings(resume_operation_id);
    `);
  }
}, {
  version: 25,
  name: 'merchant_flow_preview_provenance_recoveries',
  async run(driver) {
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS merchant_flow_preview_provenance_recoveries (
        recovery_id TEXT PRIMARY KEY,
        contract_version TEXT NOT NULL,
        resolver_revision TEXT NOT NULL,
        recovery_checksum TEXT NOT NULL UNIQUE,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        connection_id TEXT NOT NULL,
        canonical_shop TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        flow_sequence INTEGER NOT NULL CHECK(flow_sequence >= 0),
        flow_checksum TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        artifact_checksum TEXT NOT NULL,
        render_request_id TEXT NOT NULL,
        development_theme_id TEXT NOT NULL,
        main_theme_id TEXT NOT NULL,
        historical_render_source_status TEXT NOT NULL CHECK(historical_render_source_status = 'unavailable_legacy'),
        recovery_source_revision TEXT NOT NULL,
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        idempotency_key TEXT NOT NULL,
        recovery_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(flow_id, idempotency_key),
        UNIQUE(flow_id, artifact_id, render_request_id)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_preview_provenance_recovery_project
        ON merchant_flow_preview_provenance_recoveries(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_preview_provenance_recovery_flow
        ON merchant_flow_preview_provenance_recoveries(flow_id, created_at DESC);
    `);
  }
}, {
  version: 26,
  name: 'merchant_flow_render_target_successions',
  async run(driver) {
    await driver.exec(`
      CREATE TABLE IF NOT EXISTS merchant_flow_render_target_successions (
        succession_id TEXT PRIMARY KEY,
        contract_version TEXT NOT NULL,
        succession_revision TEXT NOT NULL,
        succession_checksum TEXT NOT NULL UNIQUE,
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        project_id TEXT NOT NULL REFERENCES projects(id),
        connection_id TEXT NOT NULL,
        canonical_shop TEXT NOT NULL,
        flow_id TEXT NOT NULL,
        expected_flow_state TEXT NOT NULL CHECK(expected_flow_state = 'preview_ready'),
        expected_flow_sequence INTEGER NOT NULL CHECK(expected_flow_sequence >= 0),
        expected_flow_checksum TEXT NOT NULL,
        artifact_id TEXT NOT NULL,
        artifact_checksum TEXT NOT NULL,
        prior_theme_id TEXT NOT NULL,
        prior_binding_checksum TEXT NOT NULL,
        successor_theme_id TEXT NOT NULL,
        successor_binding_checksum TEXT NOT NULL,
        main_theme_id TEXT NOT NULL,
        inventory_completeness TEXT NOT NULL CHECK(inventory_completeness = 'complete'),
        inventory_checksum TEXT NOT NULL,
        inventory_evidence_checksum TEXT NOT NULL,
        main_authority_checksum TEXT NOT NULL,
        source_revision TEXT NOT NULL,
        runtime_configuration_revision TEXT NOT NULL,
        render_target_configuration_revision TEXT NOT NULL,
        configuration_checksum TEXT NOT NULL,
        readiness_snapshot_id TEXT NOT NULL,
        readiness_snapshot_checksum TEXT NOT NULL,
        actor_user_id TEXT NOT NULL REFERENCES users(id),
        idempotency_key TEXT NOT NULL,
        successor_job_id TEXT NOT NULL,
        successor_job_identity_checksum TEXT NOT NULL,
        succession_json TEXT NOT NULL,
        operation_status TEXT NOT NULL CHECK(operation_status IN ('pending', 'applied')),
        result_flow_sequence INTEGER,
        result_flow_checksum TEXT,
        result_flow_state TEXT,
        created_at TEXT NOT NULL,
        applied_at TEXT,
        UNIQUE(flow_id, idempotency_key),
        UNIQUE(flow_id, expected_flow_sequence),
        UNIQUE(successor_job_id)
      );
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_render_target_successions_project
        ON merchant_flow_render_target_successions(project_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_merchant_flow_render_target_successions_flow
        ON merchant_flow_render_target_successions(flow_id, expected_flow_sequence DESC);
    `);
  }
}, {
  version: 27,
  name: 'public_app_privacy_lifecycle',
  sql: `
    CREATE TABLE IF NOT EXISTS privacy_lifecycle_operations (
      id TEXT PRIMARY KEY,
      webhook_delivery_id TEXT NOT NULL UNIQUE REFERENCES shopify_webhook_deliveries(id),
      connection_id TEXT REFERENCES shopify_connections(id),
      organization_id TEXT REFERENCES organizations(id),
      canonical_shop TEXT NOT NULL,
      topic TEXT NOT NULL CHECK(topic IN ('customers/data_request', 'customers/redact', 'shop/redact')),
      subject_reference_digest TEXT NOT NULL,
      request_checksum TEXT NOT NULL,
      operation_status TEXT NOT NULL CHECK(operation_status IN ('received', 'completed', 'retention_pending', 'purge_authorized', 'purged', 'failed')),
      disposition_code TEXT,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_shop
      ON privacy_lifecycle_operations(canonical_shop, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_privacy_lifecycle_status
      ON privacy_lifecycle_operations(operation_status, updated_at);

    CREATE TABLE IF NOT EXISTS shop_data_lifecycle_states (
      canonical_shop TEXT PRIMARY KEY,
      connection_id TEXT UNIQUE REFERENCES shopify_connections(id),
      organization_id TEXT REFERENCES organizations(id),
      lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN ('active', 'uninstalled', 'redaction_requested', 'purge_authorized', 'purged', 'reinstalled')),
      retention_policy_revision TEXT NOT NULL,
      uninstall_at TEXT,
      redaction_requested_at TEXT,
      purge_after TEXT,
      purged_at TEXT,
      reinstall_count INTEGER NOT NULL DEFAULT 0 CHECK(reinstall_count >= 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shop_data_lifecycle_state
      ON shop_data_lifecycle_states(lifecycle_state, updated_at);
  `
}, {
  version: 28,
  name: 'authoritative_durable_object_references',
  sql: `
    CREATE TABLE IF NOT EXISTS durable_object_references (
      id TEXT PRIMARY KEY,
      reference_version TEXT NOT NULL,
      organization_id TEXT NOT NULL REFERENCES organizations(id),
      project_id TEXT NOT NULL REFERENCES projects(id),
      connection_id TEXT REFERENCES shopify_connections(id),
      canonical_shop TEXT,
      storage_provider_kind TEXT NOT NULL,
      object_key TEXT NOT NULL UNIQUE,
      checksum_sha256 TEXT NOT NULL,
      byte_length INTEGER NOT NULL CHECK(byte_length >= 0),
      content_type TEXT NOT NULL,
      object_class TEXT NOT NULL CHECK(object_class IN ('generated_artifact', 'render_evidence', 'qa_evidence', 'founder_review_evidence', 'repair_evidence', 'repair_validation_evidence', 'operator_evidence', 'export_artifact')),
      evidence_kind TEXT NOT NULL,
      evidence_identity TEXT NOT NULL,
      lineage_identity TEXT,
      local_reference TEXT,
      retention_classification TEXT NOT NULL CHECK(retention_classification IN ('FOUNDER_DECISION_REQUIRED', 'merchant_exportable', 'immutable_audit')),
      immutable INTEGER NOT NULL CHECK(immutable IN (0, 1)),
      lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN ('active', 'deletion_authorized', 'deleted', 'retained')),
      created_at TEXT NOT NULL,
      deleted_at TEXT,
      UNIQUE(organization_id, project_id, evidence_kind, evidence_identity, checksum_sha256)
    );
    CREATE INDEX IF NOT EXISTS idx_durable_objects_project
      ON durable_object_references(organization_id, project_id, lifecycle_state, created_at);
    CREATE INDEX IF NOT EXISTS idx_durable_objects_shop
      ON durable_object_references(canonical_shop, lifecycle_state, created_at);
    CREATE INDEX IF NOT EXISTS idx_durable_objects_lineage
      ON durable_object_references(organization_id, project_id, lineage_identity, created_at);
    CREATE INDEX IF NOT EXISTS idx_durable_objects_local_reference
      ON durable_object_references(organization_id, project_id, local_reference);
  `
}];

module.exports = { migrations };
