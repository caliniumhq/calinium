import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperatorReadinessDiagnostics } from '../src/components/creative-director/OperatorReadinessDiagnostics';

function recoveryRequest() {
  return {
    schema_version: '1.0', contract_version: 'merchant-flow-founder-qa-evidence-recovery-request-v1',
    organization_id: 'org_e5ru', project_id: 'prj_e5ru', flow_id: 'merchant-flow-e5ru', shop_domain: 'controlled.myshopify.com',
    expected_flow_sequence: 26, expected_flow_checksum: 'a'.repeat(64),
    evaluation: { id: 'evaluation-e5ru', checksum: 'b'.repeat(64), reference: 'output/merchant-flow-storefront-renders/e5ru/d2-7-evaluation.json' },
    review: { id: 'review-e5ru', checksum: 'c'.repeat(64) },
    corrupted_artifact: { reference: 'output/merchant-flow-storefront-renders/e5ru/d2-7-human-review-attempt-8.json', storage_sha256: 'd'.repeat(64) },
    idempotency_key: 'merchant-flow-founder-qa-recovery-e5ru'
  };
}
function qaSubmission() {
  return {
    flow_id: 'merchant-flow-e5ru', expected_flow_sequence: 26, expected_flow_checksum: 'a'.repeat(64),
    evidence: {
      evaluation: { id: 'evaluation-e5ru', checksum: 'b'.repeat(64), reference: 'output/evaluation.json' },
      review: { id: 'review-e5ru', checksum: 'c'.repeat(64), reference: 'output/recovered.json' }
    },
    decision: 'accepted', idempotency_key: 'merchant-flow-founder-qa-e5ru'
  };
}
function readiness({ recovery = true, qa = false } = {}) {
  return {
    http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1', beta_source_version: 'e'.repeat(40), beta_feature_flag_status: 'enabled', components: {},
    qa_review_recovery: { contract_version: 'merchant-flow-founder-qa-evidence-recovery-submission-v1', available: recovery, ...(recovery ? { request: recoveryRequest() } : {}) },
    qa_review_submission: { contract_version: 'merchant-flow-founder-qa-submission-v1', available: qa, ...(qa ? { request: qaSubmission() } : {}) }
  };
}

describe('E5R-U founder-only embedded recovery control', () => {
  it('locks concurrent clicks, refetches, and reveals founder acceptance as a separate action', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const onRecoverQa = vi.fn(() => pending);
    const onSubmitQa = vi.fn();
    const onCheck = vi.fn().mockResolvedValueOnce(readiness()).mockResolvedValueOnce(readiness({ recovery: false, qa: true }));
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={onCheck} onRecoverQa={onRecoverQa} onSubmitQa={onSubmitQa} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    const recover = await screen.findByRole('button', { name: 'Recover saved review' });
    fireEvent.click(recover);
    fireEvent.click(recover);
    expect(onRecoverQa).toHaveBeenCalledTimes(1);
    expect(recover).toBeDisabled();
    finish({ operation: { status: 'applied' }, flow: { state: 'qa_review_required', sequence: 26 } });
    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Saved review recovered. Founder acceptance is ready for a separate confirmation.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover saved review' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with accepted review' })).toBeEnabled();
    expect(onSubmitQa).not.toHaveBeenCalled();
    expect(screen.queryByText(/merchant-flow-e5ru|evaluation-e5ru|review-e5ru|storage_sha256/i)).not.toBeInTheDocument();
  });

  it('is absent for normal merchants and without a server-authorized recovery projection', async () => {
    const hidden = render(<OperatorReadinessDiagnostics available={false} onCheck={vi.fn()} onRecoverQa={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    hidden.unmount();
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness({ recovery: false }))} onRecoverQa={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover saved review' })).not.toBeInTheDocument();
  });

  it('shows a sanitized failure and keeps recovery retryable', async () => {
    const onRecoverQa = vi.fn(async () => { throw Object.assign(new Error('private details'), { status: 409, code: 'merchant_flow_founder_qa_recovery_conflict' }); });
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness())} onRecoverQa={onRecoverQa} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover saved review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 409 · merchant_flow_founder_qa_recovery_conflict');
    expect(screen.queryByText('private details')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recover saved review' })).toBeEnabled();
  });
});
