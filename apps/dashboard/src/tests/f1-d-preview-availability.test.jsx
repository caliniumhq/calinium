import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisFirstMerchantJourney } from '../components/analysis-first/AnalysisFirstMerchantJourney';
import { fixtureExperience } from '../fixtures/analysis-first-experience-fixtures';

function props(overrides = {}) {
  return {
    onChooseDirection: vi.fn(), onEssentialDetail: vi.fn(), onBuild: vi.fn(), onRetry: vi.fn(),
    onApprove: vi.fn(), onRequestChanges: vi.fn(), onCompare: vi.fn(), onAdvanced: vi.fn(), onTrack: vi.fn(),
    ...overrides
  };
}

describe('F1-D merchant preview availability copy', () => {
  it('shows a terminal safe state instead of falsely claiming active preparation', async () => {
    const experience = structuredClone(fixtureExperience('n_preview_ready'));
    experience.preview_link = null;
    experience.preview_availability = { status: 'needs_attention' };
    experience.projection.primary_action.enabled = false;
    experience.projection.secondary_actions = experience.projection.secondary_actions.map((action) => ({ ...action, enabled: action.id === 'open_advanced' }));
    const onAdvanced = vi.fn();
    const user = userEvent.setup();
    render(<AnalysisFirstMerchantJourney experience={experience} {...props({ onAdvanced })} />);
    expect(screen.queryByText(/preview link is being prepared/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Something needs attention' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve design' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open Advanced' }));
    expect(onAdvanced).toHaveBeenCalledTimes(1);
  });

  it('uses preparation copy only for an explicit active-work state', () => {
    const experience = structuredClone(fixtureExperience('n_preview_ready'));
    experience.preview_link = null;
    experience.preview_availability = { status: 'preparing' };
    render(<AnalysisFirstMerchantJourney experience={experience} {...props()} />);
    expect(screen.getByText('Preparing your preview.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Something needs attention' })).not.toBeInTheDocument();
  });
});
