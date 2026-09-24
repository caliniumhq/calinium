import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperatorReadinessDiagnostics } from '../src/components/creative-director/OperatorReadinessDiagnostics';

function readiness(available = true) {
  return {
    http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: 'e'.repeat(40), beta_feature_flag_status: 'enabled', components: {},
    preview_provenance_recovery: {
      contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', available,
      ...(available ? { request: { contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', idempotency_key: 'a'.repeat(64) } } : {})
    }
  };
}

describe('F1-E protected preview provenance recovery control', () => {
  it('authorizes one bounded recovery and refreshes without showing internal provenance', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const onRecoverPreviewProvenance = vi.fn(() => pending);
    const onCheck = vi.fn().mockResolvedValueOnce(readiness()).mockResolvedValueOnce(readiness(false));
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={onCheck} onRecoverPreviewProvenance={onRecoverPreviewProvenance} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    const recover = await screen.findByRole('button', { name: 'Recover preview provenance' });
    fireEvent.click(recover);
    fireEvent.click(recover);
    expect(onRecoverPreviewProvenance).toHaveBeenCalledTimes(1);
    expect(onRecoverPreviewProvenance.mock.calls[0][0]).toEqual({ contract_version: 'merchant-flow-preview-provenance-recovery-submission-v1', idempotency_key: 'a'.repeat(64) });
    finish({ operation: { status: 'applied' }, flow: { state: 'preview_ready' } });
    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Preview provenance recovered. The verified preview is available.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover preview provenance' })).not.toBeInTheDocument();
    expect(screen.queryByText(/source_revision|render_request|theme_id|checksum|historical_render/i)).not.toBeInTheDocument();
  });

  it('is absent for normal merchants and when the protected server does not authorize recovery', async () => {
    const hidden = render(<OperatorReadinessDiagnostics available={false} onCheck={vi.fn()} onRecoverPreviewProvenance={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    hidden.unmount();
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness(false))} onRecoverPreviewProvenance={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover preview provenance' })).not.toBeInTheDocument();
  });

  it('shows only sanitized failure status and remains retryable', async () => {
    const onRecoverPreviewProvenance = vi.fn(async () => { throw Object.assign(new Error('private evidence'), { status: 409, code: 'merchant_flow_preview_provenance_recovery_conflict' }); });
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness())} onRecoverPreviewProvenance={onRecoverPreviewProvenance} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover preview provenance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 409 · merchant_flow_preview_provenance_recovery_conflict');
    expect(screen.queryByText('private evidence')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recover preview provenance' })).toBeEnabled();
  });
});
