import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentPlanStatusList } from '../components/creative-director/ContentPlanStatusList';

describe('E5R-E Advanced Content Plan projection', () => {
  it('shows an omitted preset module as informational and exposes only the stage-level Continue action', () => {
    const onContinue = vi.fn();
    render(<ContentPlanStatusList
      projection={{
        resolved: true,
        summary: { actionable_count: 0, blocked_count: 0, ready_count: 0, optional_not_included_count: 1 },
        targets: [{
          content_key: 'craftsmanship',
          label: 'Craftsmanship',
          state: 'optional_not_included',
          available_in_direction: true,
          actionable: false,
          blocked: false
        }]
      }}
      onContinue={onContinue}
    />);

    expect(screen.getByText('Craftsmanship')).toBeInTheDocument();
    expect(screen.getByText('Optional — not included')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve|generate|save/i })).not.toBeInTheDocument();
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('does not offer Continue while a critical or unresolved target remains blocked', () => {
    render(<ContentPlanStatusList projection={{
      resolved: false,
      summary: { actionable_count: 0, blocked_count: 1, ready_count: 0, optional_not_included_count: 0 },
      targets: [{
        content_key: 'craftsmanship',
        label: 'Craftsmanship',
        state: 'required_before_continuing',
        available_in_direction: true,
        actionable: false,
        blocked: true
      }]
    }} onContinue={() => {}} />);

    expect(screen.getByText('Required before continuing')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps a normal Continue path when no content-plan module was selected', () => {
    const onContinue = vi.fn();
    render(<ContentPlanStatusList projection={{
      resolved: true,
      summary: { actionable_count: 0, blocked_count: 0, ready_count: 0, optional_not_included_count: 12 },
      targets: Array.from({ length: 12 }, (_, index) => ({
        content_key: `not_selected_${index}`,
        label: `Optional content ${index + 1}`,
        state: 'optional_not_included',
        available_in_direction: false,
        actionable: false,
        blocked: false
      }))
    }} onContinue={onContinue} />);

    expect(screen.getByText('Ready — no storefront content decisions are required.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
