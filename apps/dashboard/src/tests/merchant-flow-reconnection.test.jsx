import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCreativeDirector } from '../hooks/use-creative-director';

afterEach(() => vi.useRealTimers());

describe('Merchant flow status reconnection', () => {
  it('polls the authoritative server flow and refreshes once preview becomes ready', async () => {
    vi.useFakeTimers();
    const active = { flow: { flow_id: 'merchant-flow-reconnect', state: 'generation_running', preview_ready: false } };
    const ready = { flow: { flow_id: 'merchant-flow-reconnect', state: 'preview_ready', preview_ready: true } };
    const service = {
      load: vi.fn()
        .mockResolvedValueOnce({ session: { id: 'session-reconnect' }, merchant_flow: active })
        .mockResolvedValue({ session: { id: 'session-reconnect' }, merchant_flow: ready }),
      merchantGenerationFlow: vi.fn(async () => ready)
    };
    const { result } = renderHook(() => useCreativeDirector({ service }));

    await act(async () => { await Promise.resolve(); });
    expect(result.current.data.merchant_flow.flow.state).toBe('generation_running');
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(result.current.data.merchant_flow.flow.state).toBe('preview_ready');
    expect(service.merchantGenerationFlow).toHaveBeenCalledTimes(1);
    expect(service.load).toHaveBeenCalledTimes(2);
  });
});
