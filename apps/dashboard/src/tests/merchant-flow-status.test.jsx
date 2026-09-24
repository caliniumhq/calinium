import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MerchantFlowStatus } from '../components/creative-director/MerchantFlowStatus';

const question = {
  flow: {
    flow_id: 'merchant-flow-beta', flow_checksum: 'a'.repeat(64), state: 'awaiting_material_answer', preview_ready: false,
    merchant_status: { code: 'action_needed', label: 'Action needed', retry_available: false },
    question: {
      question_id: 'architecture-question-beta',
      prompt: 'When customers shop, should the experience feel more visual and story-led, or more direct and efficient?',
      choices: [{ value: 'image_led', label: 'Visual and story-led' }, { value: 'information_led', label: 'Direct and efficient' }]
    }
  }
};

describe('Merchant flow existing-UI activation', () => {
  it('renders only the approved material question without architecture internals', () => {
    const { container } = render(<MerchantFlowStatus result={question} onAnswer={vi.fn()} onResume={vi.fn()} pending={false} />);
    expect(screen.getByText(question.flow.question.prompt)).toBeInTheDocument();
    expect(screen.getByLabelText('Visual and story-led')).toBeInTheDocument();
    expect(screen.getByLabelText('Direct and efficient')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Current Calinium|Editorial Discovery|profile\.|score|signal weight/i);
  });

  it('submits the bound answer through the flow checksum contract', () => {
    const onAnswer = vi.fn();
    render(<MerchantFlowStatus result={question} onAnswer={onAnswer} onResume={vi.fn()} pending={false} />);
    fireEvent.click(screen.getByLabelText('Direct and efficient'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onAnswer).toHaveBeenCalledWith('merchant-flow-beta', 'architecture-question-beta', 'information_led', 'a'.repeat(64));
  });

  it('reuses the existing retry button with an immediate same-action in-flight guard', async () => {
    let finish;
    const onResume = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    const result = { flow: { flow_id: 'merchant-flow-beta', flow_checksum: 'b'.repeat(64), sequence: 23, state: 'failed_retryable', preview_ready: false, failure: { category: 'generation_failed' }, merchant_status: { label: 'Something needs attention', message: 'Your approved inputs are saved.', retry_available: true } } };
    render(<MerchantFlowStatus result={result} onAnswer={vi.fn()} onResume={onResume} pending={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retrying…' }));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledWith('merchant-flow-beta', 'b'.repeat(64), 23);
    finish({});
    await Promise.resolve();
  });

  it('does not issue a resume mutation merely because retryable status is rendered again', () => {
    const onResume = vi.fn();
    const result = { flow: { flow_id: 'merchant-flow-beta', flow_checksum: 'd'.repeat(64), sequence: 24, state: 'failed_retryable', preview_ready: false, failure: { category: 'd2_7_provider_timeout' }, merchant_status: { label: 'Something needs attention', message: 'The storefront review was interrupted.', retry_available: true } } };
    const view = render(<MerchantFlowStatus result={result} onAnswer={vi.fn()} onResume={onResume} pending={false} />);
    view.rerender(<MerchantFlowStatus result={result} onAnswer={vi.fn()} onResume={onResume} pending={false} />);
    expect(onResume).not.toHaveBeenCalled();
  });

  it('surfaces preview readiness without implying publication', () => {
    const result = { flow: { state: 'preview_ready', preview_ready: true, merchant_status: { label: 'Ready to preview', retry_available: false } } };
    render(<MerchantFlowStatus result={result} onAnswer={vi.fn()} onResume={vi.fn()} pending={false} />);
    expect(screen.getByText(/Nothing has been published/)).toBeInTheDocument();
  });
});
