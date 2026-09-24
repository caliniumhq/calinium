import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardApiClient } from '../adapters/dashboard-api-client';
import { OperatorReadinessDiagnostics } from '../components/creative-director/OperatorReadinessDiagnostics';
import { CreativeDirectorService } from '../services/creative-director-service';

const request = Object.freeze({
  contract_version: 'merchant-flow-render-target-succession-submission-v1',
  flow_id: 'merchant-flow-f1ja-fixture',
  expected_flow_sequence: 27,
  expected_flow_checksum: 'f'.repeat(64),
  idempotency_key: 'a'.repeat(64)
});

function readiness(available = true) {
  return {
    http_status: 200,
    status: 'READY',
    readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: 'e'.repeat(40),
    beta_feature_flag_status: 'enabled',
    components: {},
    render_target_succession: available
      ? { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: true, request: structuredClone(request) }
      : { contract_version: 'merchant-flow-render-target-succession-submission-v1', available: false }
  };
}

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

describe('F1-JA protected render-target succession control', () => {
  it('submits only the server-prepared request once and reloads protected readiness', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    const onSucceedRenderTarget = vi.fn(() => pending);
    const onCheck = vi.fn().mockResolvedValueOnce(readiness()).mockResolvedValueOnce(readiness(false));
    const user = userEvent.setup();

    render(<OperatorReadinessDiagnostics available onCheck={onCheck} onSucceedRenderTarget={onSucceedRenderTarget} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    const succeed = await screen.findByRole('button', { name: 'Revalidate preview target' });
    fireEvent.click(succeed);
    fireEvent.click(succeed);

    expect(onSucceedRenderTarget).toHaveBeenCalledTimes(1);
    expect(onSucceedRenderTarget).toHaveBeenCalledWith(request);
    expect(screen.queryByText(/merchant-flow-f1ja-fixture|expected_flow_checksum|idempotency_key/i)).not.toBeInTheDocument();

    finish({ operation: { status: 'applied' } });
    await waitFor(() => expect(onCheck).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Preview target revalidation started. Calinium is preparing a fresh verified preview.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revalidate preview target' })).not.toBeInTheDocument();
  });

  it('is absent for normal merchants and unless the protected backend explicitly makes it available', async () => {
    const hidden = render(<OperatorReadinessDiagnostics available={false} onCheck={vi.fn()} onSucceedRenderTarget={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    hidden.unmount();

    const user = userEvent.setup();
    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness(false))} onSucceedRenderTarget={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revalidate preview target' })).not.toBeInTheDocument();
  });

  it('renders only sanitized failure status and leaves the bounded action retryable', async () => {
    const onSucceedRenderTarget = vi.fn(async () => {
      throw Object.assign(new Error('private target evidence'), { status: 409, code: 'merchant_flow_render_target_succession_stale' });
    });
    const user = userEvent.setup();

    render(<OperatorReadinessDiagnostics available onCheck={vi.fn(async () => readiness())} onSucceedRenderTarget={onSucceedRenderTarget} />);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Revalidate preview target' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 409 · merchant_flow_render_target_succession_stale');
    expect(screen.queryByText('private target evidence')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revalidate preview target' })).toBeEnabled();
  });

  it('uses the authenticated protected endpoint and forwards the exact prepared contract', async () => {
    const idToken = vi.fn().mockResolvedValue('fresh-render-target-token');
    window.shopify = { idToken };
    const fetchImpl = vi.fn().mockResolvedValue(response({ ok: true, result: { operation: { status: 'applied' } } }));
    try {
      const client = new DashboardApiClient({ fetchImpl });
      await client.merchantGenerationFlowOperatorSucceedRenderTarget('prj_f1ja', {
        ...request,
        target_theme_id: 'must-not-cross-client-boundary',
        source_revision: 'must-not-cross-client-boundary'
      });

      expect(idToken).toHaveBeenCalledTimes(1);
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(fetchImpl.mock.calls[0][0]).toBe('/api/projects/prj_f1ja/merchant-generation-flow/operator/succeed-render-target');
      expect(fetchImpl.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(fetchImpl.mock.calls[0][1].headers.authorization).toBe('Bearer fresh-render-target-token');
      expect(fetchImpl.mock.calls[0][1].headers['idempotency-key']).toBe(request.idempotency_key);
      expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(request);
    } finally {
      delete window.shopify;
    }
  });

  it('keeps the project boundary in the Creative Director service', async () => {
    const client = { merchantGenerationFlowOperatorSucceedRenderTarget: vi.fn(async () => ({ operation: { status: 'applied' } })) };
    const service = new CreativeDirectorService({ client, projectId: 'prj_f1ja' });

    await expect(service.succeedRenderTarget(request)).resolves.toEqual({ operation: { status: 'applied' } });
    expect(client.merchantGenerationFlowOperatorSucceedRenderTarget).toHaveBeenCalledWith('prj_f1ja', request);
  });
});
