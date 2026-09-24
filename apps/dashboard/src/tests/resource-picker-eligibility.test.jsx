import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ResourcePicker } from '../components/creative-director/ResourcePicker';

function item(overrides) {
  return {
    item_id: `rci_${overrides.confirmation_id.replaceAll(/[^a-z0-9]/g, '').padEnd(24, '0').slice(0, 24)}`,
    confirmation_id: overrides.confirmation_id,
    requested_claim: 'Review a storefront fact.',
    classification: 'merchant_confirmation_required',
    policy_state: 'awaiting_confirmation',
    merchant_state_copy: 'Needs your confirmation',
    current_blocking_reason: 'No authoritative evidence or merchant confirmation is recorded.',
    ...overrides
  };
}

function properties() {
  const checksum = 'd'.repeat(64);
  const items = [
    item({ confirmation_id: 'store.catalog', requested_claim: 'Use the approved catalog configuration.', classification: 'auto_verifiable', policy_state: 'verified_automatically', merchant_state_copy: 'Verified from your store', current_blocking_reason: null }),
    item({ confirmation_id: 'story.quote', requested_claim: 'Include an optional merchant quote.', classification: 'optional_omittable', policy_state: 'omitted_by_policy', merchant_state_copy: 'Optional — not included', current_blocking_reason: null }),
    item({ confirmation_id: 'operations.lead_time', requested_claim: 'Use the current production lead time.' }),
    item({ confirmation_id: 'policy.return_guarantee', requested_claim: 'Publish the return guarantee.', classification: 'critical_confirmation_required', merchant_state_copy: 'Required before continuing' })
  ];
  return {
    session: {
      id: 'cdr_resource_ui', updated_at: '2026-08-20T00:00:00.000Z',
      resource_plan: { status: 'ready', fields: [], groups: [], required_assets: [], required_confirmations: items.map((entry) => entry.confirmation_id), confirmation_eligibility: { items, summary: { omitted_section_ids: [], omitted_field_refs: [] } } },
      generation_context: { completed_confirmations: [], resolved_empty_fields: [], resource_confirmation_decisions: { checksum, items: items.map((entry) => ({ confirmation_id: entry.confirmation_id, state: entry.policy_state })) } }
    },
    assets: [], shopify: { connection: null }, onSave: vi.fn(async () => ({ resource_validation: { complete: false, blockers: [] } })),
    onOpenAssets: vi.fn(), onConnectShopify: vi.fn(), onSyncShopify: vi.fn(), onCheckShopify: vi.fn(), onDisconnectShopify: vi.fn(),
    onLoadShopifyResources: vi.fn(async () => ({ resources: [] })), onDecideShopifyResource: vi.fn(), onRevokeShopifyResource: vi.fn(), pending: false
  };
}

describe('Store Resources confirmation eligibility UI', () => {
  it('renders the four merchant-safe states without exposing policy internals', () => {
    const props = properties();
    const view = render(<ResourcePicker {...props} />);
    expect(screen.getAllByText('Verified from your store').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Optional — not included').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Needs your confirmation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Required before continuing').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(view.container.textContent).not.toMatch(/resource-confirmation-eligibility|checksum|auto_verifiable|critical_confirmation_required/);
  });

  it('submits only explicit merchant confirmations and binds the saved decision checksum', async () => {
    const props = properties();
    render(<ResourcePicker {...props} />);
    await userEvent.click(screen.getAllByRole('checkbox')[0]);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(props.onSave).toHaveBeenCalledTimes(1);
    const call = props.onSave.mock.calls[0];
    expect(call[4]).toEqual(['operations.lead_time']);
    expect(call[4]).not.toContain('store.catalog');
    expect(call[4]).not.toContain('story.quote');
    expect(call[5]).toBe('d'.repeat(64));
  });
});
