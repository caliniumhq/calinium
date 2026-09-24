import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CustomThemeOfferScreen } from '../components/creative-director/CustomThemeOfferScreen';

describe('LEGACY_EXAMPLE staging custom theme offer', () => {
  it('labels the server authorization as staging and never presents it as a Shopify charge', async () => {
    const confirm = vi.fn(async () => ({}));
    render(<CustomThemeOfferScreen
      customTheme={{
        eligibility: { eligible: true, price: { amount_cents: 25000, currency: 'USD' } },
        offer: { pages: [], sections: [], selected_resource_count: 0 },
        order: { id: 'cto_legacyexample', payment_status: 'pending', generation_status: 'not_started' },
        payment: { provider: 'staging_validation_no_charge', available: true, checkout_required: false, staging: true, charge_created: false, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' }
      }}
      onPurchase={vi.fn()}
      onConfirmPayment={confirm}
      onVerifyPayment={vi.fn()}
      onGenerate={vi.fn()}
      onReturnResources={vi.fn()}
      pending={false}
    />);

    expect(screen.getByText('LEGACY_EXAMPLE staging validation — no Shopify charge')).toBeInTheDocument();
    const action = screen.getByRole('button', { name: 'Authorize staging generation — no Shopify charge' });
    await userEvent.click(action);
    expect(confirm).toHaveBeenCalledWith('cto_legacyexample', expect.stringContaining('-payment'));
    expect(screen.queryByText(/Shopify approval/i)).not.toBeInTheDocument();
  });
});
