import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperatorReadinessDiagnostics } from '../src/components/creative-director/OperatorReadinessDiagnostics';

function submission() {
  return {
    flow_id: 'merchant-flow-e5rs', expected_flow_sequence: 26, expected_flow_checksum: 'a'.repeat(64),
    evidence: {
      evaluation: { id: 'evaluation-e5rs', checksum: 'b'.repeat(64), reference: 'output/evaluation.json' },
      review: { id: 'review-e5rs', checksum: 'c'.repeat(64), reference: 'output/review.json' }
    },
    decision: 'accepted', idempotency_key: 'merchant-flow-founder-qa-e5rs-fixed'
  };
}

function readiness(available = true) {
  return {
    http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: 'd'.repeat(40), beta_feature_flag_status: 'enabled', components: {},
    qa_review_submission: { contract_version: 'merchant-flow-founder-qa-submission-v1', available, ...(available ? { request: submission() } : {}) }
  };
}

describe('E5R-S founder QA embedded control', () => {
  it('appears only after protected operator projection and submits once across a concurrent double click', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const onSubmitQa = vi.fn(() => pending);
    const onCheck = vi.fn().mockResolvedValueOnce(readiness()).mockResolvedValueOnce(readiness(false));
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={onCheck} onSubmitQa={onSubmitQa} />);

    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    const submit = await screen.findByRole('button', { name: 'Continue with accepted review' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(onSubmitQa).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(onSubmitQa).toHaveBeenCalledWith(submission());

    finish({ operation: { status: 'applied' }, flow: { state: 'preview_ready' } });
    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Founder QA accepted. Reloaded the authoritative flow.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with accepted review' })).not.toBeInTheDocument();
    expect(screen.queryByText(/evaluation-e5rs|review-e5rs|merchant-flow-e5rs|checksum/i)).not.toBeInTheDocument();
  });

  it('is absent for normal merchants and for operators without a compatible saved review', async () => {
    const user = userEvent.setup();
    const hidden = render(<OperatorReadinessDiagnostics available={false} onCheck={vi.fn()} onSubmitQa={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    hidden.unmount();

    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness(false))} onSubmitQa={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue with accepted review' })).not.toBeInTheDocument();
  });

  it('shows a bounded server failure and keeps the authoritative review action retryable', async () => {
    const onSubmitQa = vi.fn(async () => { throw Object.assign(new Error('details must remain hidden'), { status: 409, code: 'merchant_flow_operator_operation_stale' }); });
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness())} onSubmitQa={onSubmitQa} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Continue with accepted review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 409 · merchant_flow_operator_operation_stale');
    expect(screen.queryByText('details must remain hidden')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with accepted review' })).toBeEnabled();
  });
});
