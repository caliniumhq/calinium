import React from 'react';
import { createRoot } from 'react-dom/client';
import { AnalysisFirstMerchantJourney } from '../../src/components/analysis-first/AnalysisFirstMerchantJourney';
import { ResourcePicker } from '../../src/components/creative-director/ResourcePicker';
import { StageHeader } from '../../src/components/creative-director/StageHeader';
import { fixtureExperience } from '../../src/fixtures/analysis-first-experience-fixtures';
import '../../src/styles/dashboard.css';

const noop = async () => true;
const connection = {
  id: 'connection-visual-alignment',
  display_name: 'Calinium staging store',
  shop_domain: 'calinium-example.myshopify.com',
  connection_status: 'ready',
  granted_scopes: ['read_products', 'read_themes', 'read_content'],
  last_synced_at: '2026-09-22T12:00:00.000Z',
  health: {
    status: 'healthy',
    webhook_status: 'received',
    admin_api_version: 'test-version-with-a-long-unbroken-identifier-0123456789abcdefghijklmnopqrstuvwxyz0123456789',
    webhook_api_version: '2026-07',
    missing_scopes: []
  }
};
const shopifyResources = [
  ['product', 'The Inventory Not Tracked Snowboard With A Long Descriptive Merchant Product Name', 'pending'],
  ['collection', 'Everyday carry', 'approved'],
  ['menu', 'Main navigation', 'approved'],
  ['file', 'The top and bottom view of a snowboard with turquoise and black tree graphics, a detailed landscape, and a long descriptive media title that must wrap inside its card', 'pending'],
  ['file', 'unbroken-resource-identifier-0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789', 'pending']
].map(([resourceType, displayTitle, approvalStatus], index) => ({
  resource: { id: `resource-${index}`, resource_type: resourceType, display_title: displayTitle, availability_status: 'available', approval_eligible: true },
  approval: { approval_status: approvalStatus }
}));
const resourceSession = {
  id: 'session-visual-alignment',
  updated_at: '2026-09-22T12:00:00.000Z',
  generation_context: {},
  resource_plan: {
    status: 'ready',
    fields: [{ setting_ref: 'optional_note', section_id: 'featured_collection', kind: 'confirmation', required: false }],
    groups: [{ kind: 'confirmation', field_refs: ['optional_note'], section_ids: ['featured_collection'], required: false }],
    required_assets: [],
    required_confirmations: []
  }
};

function ReviewFixture() {
  return <AnalysisFirstMerchantJourney
    experience={fixtureExperience('n_preview_ready')}
    pending={false}
    onChooseDirection={noop}
    onEssentialDetail={noop}
    onBuild={noop}
    onRetry={noop}
    onApprove={noop}
    onRequestChanges={noop}
    onCompare={noop}
    onAdvanced={noop}
    onTrack={noop}
  />;
}

function ResourcesFixture() {
  return <main className="creative-director-app">
    <StageHeader stage="resources" onExit={noop} onRestart={noop} onBack={noop} onQuickStart={noop} />
    <div className="creative-director-app__content">
      <ResourcePicker
        session={resourceSession}
        assets={[]}
        shopify={{ connection }}
        onSave={noop}
        onOpenAssets={noop}
        onConnectShopify={noop}
        onSyncShopify={noop}
        onCheckShopify={noop}
        onDisconnectShopify={noop}
        onLoadShopifyResources={async () => ({ resources: shopifyResources })}
        onDecideShopifyResource={noop}
        onRevokeShopifyResource={noop}
        pending={false}
      />
    </div>
  </main>;
}

const view = new URLSearchParams(window.location.search).get('view');
document.body.dataset.visualFixture = view === 'resources' ? 'resources' : 'review';
createRoot(document.getElementById('root')).render(view === 'resources' ? <ResourcesFixture /> : <ReviewFixture />);
