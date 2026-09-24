import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisFirstMerchantJourney } from '../components/analysis-first/AnalysisFirstMerchantJourney';
import { ShopifyConnectionPanel } from '../components/creative-director/ShopifyConnectionPanel';
import { ProgressStepper, StageHeader } from '../components/creative-director/StageHeader';
import { fixtureExperience } from '../fixtures/analysis-first-experience-fixtures';
import dashboardStyles from '../styles/dashboard.css?raw';

const callbacks = {
  onChooseDirection: vi.fn(),
  onEssentialDetail: vi.fn(),
  onBuild: vi.fn(),
  onRetry: vi.fn(),
  onApprove: vi.fn(),
  onRequestChanges: vi.fn(),
  onCompare: vi.fn(),
  onAdvanced: vi.fn(),
  onTrack: vi.fn()
};

describe('embedded app visual alignment', () => {
  it('retains the exact three-stage F1 projection and presents the non-live review hierarchy', () => {
    render(<AnalysisFirstMerchantJourney experience={fixtureExperience('n_preview_ready')} {...callbacks} />);

    const progress = screen.getByRole('navigation', { name: 'Storefront progress' });
    expect(progress.querySelectorAll('li')).toHaveLength(3);
    expect(progress).toHaveTextContent('Analyze your store');
    expect(progress).toHaveTextContent('Build your storefront');
    expect(progress).toHaveTextContent('Review your preview');
    expect(screen.getByRole('heading', { name: 'Review your preview', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ready to review', level: 2 })).toBeInTheDocument();
    expect(screen.getByText('Non-live preview')).toBeInTheDocument();
    const reassurance = screen.getByText('Preview first. Nothing changes without your approval.').closest('.analysis-first-reassurance');
    const preview = screen.getByRole('link', { name: 'Open Calinium preview' });
    const approve = screen.getByRole('button', { name: 'Approve design' });
    expect(preview).toHaveClass('button--primary');
    expect(approve).toHaveClass('button--quiet');
    expect(approve).not.toHaveClass('button--primary');
    expect(reassurance.compareDocumentPosition(approve.closest('.analysis-first-actions')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(callbacks.onApprove).not.toHaveBeenCalled();
    expect(callbacks.onRequestChanges).not.toHaveBeenCalled();
  });

  it('keeps Compare capability-bound instead of adding it for visual symmetry', () => {
    const experience = structuredClone(fixtureExperience('n_preview_ready'));
    experience.projection.secondary_actions = experience.projection.secondary_actions.filter((action) => action.id !== 'compare_current_store');
    render(<AnalysisFirstMerchantJourney experience={experience} {...callbacks} />);

    expect(screen.queryByRole('button', { name: 'Compare with current store' })).not.toBeInTheDocument();
  });

  it('keeps every Advanced stage and action available with quieter numeric presentation', () => {
    const onExit = vi.fn();
    const onRestart = vi.fn();
    const onBack = vi.fn();
    const onQuickStart = vi.fn();
    render(<StageHeader stage="resources" onExit={onExit} onRestart={onRestart} onBack={onBack} onQuickStart={onQuickStart} />);

    const progress = screen.getByRole('navigation', { name: /Step 6 of 9: Store Resources/ });
    expect(progress.querySelectorAll('li')).toHaveLength(9);
    expect(progress.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(screen.getByRole('group', { name: 'Workflow utilities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quick Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart conversation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue later' })).toBeInTheDocument();
  });

  it('presents connected Shopify state as merchant-readable metadata without removing technical detail', () => {
    render(<ShopifyConnectionPanel
      connection={{
        id: 'connection-visual',
        display_name: 'Calinium staging store',
        shop_domain: 'example.myshopify.com',
        connection_status: 'ready',
        granted_scopes: ['read_products', 'read_themes'],
        last_synced_at: '2026-09-22T12:00:00.000Z',
        health: { status: 'healthy', webhook_status: 'received', admin_api_version: '2026-07', webhook_api_version: '2026-07' }
      }}
      approvedResourceCount={7}
      onConnect={vi.fn()}
      onSync={vi.fn()}
      onCheck={vi.fn()}
      onDisconnect={vi.fn()}
      pending={false}
    />);

    expect(screen.getByText('Shopify store')).toBeInTheDocument();
    expect(screen.getByText('Connection')).toBeInTheDocument();
    expect(screen.getByText('Permissions')).toBeInTheDocument();
    expect(screen.getByText('Last refreshed')).toBeInTheDocument();
    expect(screen.getByText('Approved resources')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Connection details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh resources' })).toHaveClass('button--primary');
    expect(screen.getByRole('button', { name: 'Check connection' })).toHaveClass('button--quiet');
    expect(screen.getByRole('button', { name: 'Disconnect' })).toHaveClass('shopify-connection__disconnect');
  });

  it('defines the bounded token, focus, contrast, and responsive presentation contract', () => {
    expect(dashboardStyles).toContain('--cal-bg: #f3f0e8');
    expect(dashboardStyles).toContain('--cal-surface: #faf8f2');
    expect(dashboardStyles).toContain('--cal-text: #111713');
    expect(dashboardStyles).toContain('--cal-radius-md: 10px');
    expect(dashboardStyles).toContain('outline: 3px solid var(--cal-focus)');
    expect(dashboardStyles).toContain('@media (max-width: 1199px) and (min-width: 721px)');
    expect(dashboardStyles).toContain('@media (max-width: 720px)');
    expect(dashboardStyles).toContain('@media (prefers-contrast: more)');
    expect(dashboardStyles).toContain('.cd-header__utility-actions');
    expect(dashboardStyles).toContain('grid-template-columns: repeat(9, minmax(108px, 1fr));');
    expect(dashboardStyles).toContain('.cd-progress li.is-current { display: flex; }');
    expect(dashboardStyles).toContain('.resources-screen > .cd-stage-intro h1 { font-size: 1.8rem; max-width: 18ch; }');
    expect(dashboardStyles).toContain('.shopify-connection__details > div:first-child { grid-column: 1 / -1; }');
  });
});
