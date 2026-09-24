import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OperatorReadinessDiagnostics } from '../components/creative-director/OperatorReadinessDiagnostics';

function readyResult(overrides = {}) {
  const ready = { ready: true, reason_code: null };
  return {
    http_status: 200,
    status: 'READY',
    snapshot_status: 'READY',
    snapshot_revision: 'controlled-beta-readiness-snapshot-v1',
    readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: 'f'.repeat(40),
    beta_feature_flag_status: 'enabled',
    components: Object.fromEntries(['source_attestation', 'database', 'artifact_storage', 'durable_job_storage', 'generation_worker', 'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'controlled_shopify_target', 'd1', 'd2_7_provider', 'operator_authorization'].map((key) => [key, ready])),
    refresh: { status: 'idle', operation_id: null },
    ...overrides
  };
}

describe('E5R-M operator readiness refresh UI', () => {
  it('accepts one bounded refresh request and polls only the fast snapshot endpoint', async () => {
    const operationId = 'controlled-readiness-refresh-1234567890abcdef1234';
    const onRefresh = vi.fn(async () => ({ http_status: 202, status: 'ACCEPTED', operation_id: operationId }));
    const onCheck = vi.fn()
      .mockResolvedValueOnce(readyResult())
      .mockResolvedValueOnce(readyResult({ status: 'NOT_READY', snapshot_status: 'INITIALIZING', refresh: { status: 'running', operation_id: operationId } }))
      .mockResolvedValueOnce(readyResult({ refresh: { status: 'idle', operation_id: null } }));
    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={onCheck} onRefresh={onRefresh} />);

    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByText('READY', { selector: 'strong' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh readiness' }));
    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(3), { timeout: 2_000 });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('region', { name: 'System readiness result' })).toHaveTextContent('READY');
    expect(screen.queryByText(/token|secret|checksum|model/i)).not.toBeInTheDocument();
  });

  it('does not expose refresh when the operator action is unavailable', async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn(async () => readyResult());
    render(<OperatorReadinessDiagnostics available onCheck={onCheck} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByText('READY', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh readiness' })).not.toBeInTheDocument();
  });
});
