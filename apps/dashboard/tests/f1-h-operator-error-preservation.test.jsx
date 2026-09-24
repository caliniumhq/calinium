import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardApiError } from '../src/adapters/dashboard-api-client';
import { useCreativeDirector } from '../src/hooks/use-creative-director';

function serviceFor(error = null) {
  const failure = error || new DashboardApiError(
    'Preview recovery could not be completed safely.',
    'merchant_flow_preview_provenance_recovery_record_construction_failed',
    500,
    { category: 'record_construction_failed', stage: 'record_construction', retryable: false }
  );
  return {
    load: vi.fn(async () => ({ session: { id: 'session-f1h' } })),
    start: vi.fn(async () => { throw new Error('merchant-safe failure'); }),
    recoverPreviewProvenance: vi.fn(async () => { throw failure; }),
    recoverFounderQaEvidence: vi.fn(async () => { throw failure; }),
    submitFounderQa: vi.fn(async () => { throw failure; })
  };
}

describe('F1-H operator-specific action error preservation', () => {
  it('preserves and rethrows DashboardApiError for all protected founder actions', async () => {
    const service = serviceFor();
    const { result } = renderHook(() => useCreativeDirector({ service }));
    await waitFor(() => expect(service.load).toHaveBeenCalledTimes(1));
    for (const action of ['recoverPreviewProvenance', 'recoverFounderQaEvidence', 'submitFounderQa']) {
      let caught;
      await act(async () => {
        try { await result.current[action]({ bounded: true }); }
        catch (error) { caught = error; }
      });
      expect(caught).toBeInstanceOf(DashboardApiError);
      expect(caught).toMatchObject({ status: 500, code: 'merchant_flow_preview_provenance_recovery_record_construction_failed' });
      expect(result.current.errorDetails).toEqual({
        code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        status: 500,
        details: { category: 'record_construction_failed', stage: 'record_construction', retryable: false }
      });
    }
    expect(service.load).toHaveBeenCalledTimes(1);
  });

  it('keeps ordinary merchant mutations on the existing null-return behavior', async () => {
    const service = serviceFor();
    const { result } = renderHook(() => useCreativeDirector({ service }));
    await waitFor(() => expect(service.load).toHaveBeenCalledTimes(1));
    let returned;
    await act(async () => { returned = await result.current.start(); });
    expect(returned).toBeNull();
    expect(result.current.error).toBe('merchant-safe failure');
  });

  it('refreshes authoritative state after a successful protected action', async () => {
    const service = serviceFor();
    service.recoverPreviewProvenance = vi.fn(async () => ({ operation: { status: 'applied' } }));
    const { result } = renderHook(() => useCreativeDirector({ service }));
    await waitFor(() => expect(service.load).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.recoverPreviewProvenance({ bounded: true }); });
    expect(service.load).toHaveBeenCalledTimes(2);
  });
});
