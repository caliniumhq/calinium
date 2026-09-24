import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import f1iFixture from '../../../../fixtures/f1-i-analysis-first-projection-invalidation.json';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import { fixtureExperience } from '../fixtures/analysis-first-experience-fixtures';
import { useAnalysisFirstMerchantExperience } from '../hooks/use-analysis-first-merchant-experience';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => { resolve = onResolve; reject = onReject; });
  return { promise, resolve, reject };
}

function experience({ available }) {
  const value = structuredClone(fixtureExperience('n_preview_ready'));
  value.preview_availability = { status: available ? 'available' : 'needs_attention' };
  if (!available) {
    value.preview_link = null;
    value.projection.primary_action = null;
    value.projection.secondary_actions = value.projection.secondary_actions.filter((action) => action.id === 'open_advanced');
  }
  return value;
}

function session() {
  return {
    id: 'cds_f1i_fixture', project_id: 'prj_f1i_fixture', stage: 'conversation',
    updated_at: f1iFixture.controlled_shape.session_updated_at, transcript: [], conversation_state: {}, review: {},
    creative_brief: { business: { name: 'Fixture store' } }, store_strategy: { homepage: { sections: [] } },
    preset_selection: { status: 'approved', candidate_version: 1, approved_revision_id: 'apr_f1i_fixture', selected_preset_id: 'atelier' },
    resource_plan: { fields: [], required_assets: [], required_confirmations: [] }, generation_context: {}, generation_state: {}, preview_state: {}, content_plan: {}
  };
}

function directorData(flow = f1iFixture.controlled_shape.flow) {
  return {
    project: { id: 'prj_f1i_fixture', name: 'F1-I fixture store' },
    session: session(), assets: [], analysis_first_merchant_experience_enabled: true,
    merchant_flow_beta_enabled: true, merchant_flow: { flow: structuredClone(flow) }
  };
}

function readiness({ previewRecovery = false, qaSubmission = false, qaRecovery = false } = {}) {
  const ready = { ready: true, status: 'READY' };
  return {
    http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: 'f'.repeat(40), beta_feature_flag_status: 'enabled',
    components: Object.fromEntries([
      'source_attestation', 'database', 'artifact_storage', 'durable_job_storage', 'generation_worker',
      'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'shopify_storefront_password',
      'controlled_shopify_target', 'd1', 'd2_7_provider', 'operator_authorization'
    ].map((key) => [key, ready])),
    preview_provenance_recovery: previewRecovery ? { available: true, request: { flow_id: 'merchant-flow-f1i-fixture', expected_flow_sequence: 27, expected_flow_checksum: 'a'.repeat(64) } } : { available: false },
    qa_review_submission: qaSubmission ? { available: true, request: { flow_id: 'merchant-flow-f1i-fixture', decision: 'accepted' } } : { available: false },
    qa_review_recovery: qaRecovery ? { available: true, request: { flow_id: 'merchant-flow-f1i-fixture', decision: 'recover' } } : { available: false }
  };
}

function serviceFor({
  before = experience({ available: false }),
  after = experience({ available: true }),
  initialFlow = f1iFixture.controlled_shape.flow,
  refreshedFlow = initialFlow,
  readinessBefore = readiness({ previewRecovery: true }),
  readinessAfter = readiness()
} = {}) {
  let projectionReads = 0;
  let directorReads = 0;
  const service = {
    load: vi.fn(async () => directorData(directorReads++ === 0 ? initialFlow : refreshedFlow)),
    analysisFirstExperience: vi.fn(async () => structuredClone(projectionReads++ === 0 ? before : after)),
    recordAnalysisFirstTelemetry: vi.fn(async () => ({ recorded: true })),
    selectAnalysisFirstDirection: vi.fn(),
    operatorReadiness: vi.fn().mockResolvedValueOnce(readinessBefore).mockResolvedValue(readinessAfter),
    refreshOperatorReadiness: vi.fn(),
    recoverPreviewProvenance: vi.fn(async () => ({ operation: { status: 'applied' }, flow: structuredClone(refreshedFlow) })),
    recoverFounderQaEvidence: vi.fn(async () => ({ operation: { status: 'applied' }, flow: structuredClone(refreshedFlow) })),
    submitFounderQa: vi.fn(async () => ({ operation: { status: 'applied' }, flow: structuredClone(refreshedFlow) })),
    merchantGenerationFlow: vi.fn(), start: vi.fn(), restart: vi.fn(), respond: vi.fn(), setStage: vi.fn(),
    refreshMerchantIntake: vi.fn(), retryLivePreview: vi.fn(), approveRecommendedResourceSet: vi.fn(),
    replaceRecommendedResource: vi.fn(), approveCreativeDirection: vi.fn(), startMerchantGenerationFlow: vi.fn(),
    answerMerchantGenerationFlow: vi.fn(), resumeMerchantGenerationFlow: vi.fn(), shopifyResources: vi.fn(),
    createCustomThemeOrder: vi.fn(), retryCustomThemeGeneration: vi.fn()
  };
  return service;
}

function renderApp(service, operatorDiagnosticsAvailable = true) {
  return render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable={operatorDiagnosticsAvailable} />);
}

describe('F1-I analysis-first projection invalidation after operator mutations', () => {
  it('refreshes the server projection exactly once after successful preview recovery with unchanged session, state, and sequence', async () => {
    sessionStorage.clear();
    const user = userEvent.setup();
    const service = serviceFor();
    renderApp(service);

    expect(await screen.findByRole('heading', { name: 'Something needs attention', level: 3 })).toBeInTheDocument();
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover preview provenance' }));

    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toHaveAttribute('href', expect.stringContaining('preview_theme_id'));
    expect(service.recoverPreviewProvenance).toHaveBeenCalledTimes(1);
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(2);
    expect(service.load).toHaveBeenCalledTimes(2);
    expect(f1iFixture.controlled_shape.post_recovery_authority.same_flow_sequence).toBe(true);
    expect(f1iFixture.controlled_shape.post_recovery_authority.same_session_updated_at).toBe(true);
  });

  it('keeps the current layout while the explicit authoritative projection read is pending', async () => {
    const user = userEvent.setup();
    const next = deferred();
    const service = serviceFor();
    service.analysisFirstExperience = vi.fn()
      .mockResolvedValueOnce(experience({ available: false }))
      .mockImplementationOnce(() => next.promise);
    renderApp(service);
    await screen.findByRole('heading', { name: 'Something needs attention', level: 3 });
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover preview provenance' }));

    expect(screen.getByRole('heading', { name: 'Review your preview', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Calinium preview' })).not.toBeInTheDocument();
    await act(async () => { next.resolve(experience({ available: true })); await next.promise; });
    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toBeInTheDocument();
  });

  it('deduplicates concurrent explicit refreshes and rejects stale projection responses', async () => {
    const oldRequest = deferred();
    const newRequest = deferred();
    const service = {
      analysisFirstExperience: vi.fn()
        .mockImplementationOnce(() => oldRequest.promise)
        .mockImplementationOnce(() => newRequest.promise),
      recordAnalysisFirstTelemetry: vi.fn(async () => true), selectAnalysisFirstDirection: vi.fn()
    };
    const { result } = renderHook(() => useAnalysisFirstMerchantExperience({ service, enabled: true, refreshKey: 'unchanged' }));
    await waitFor(() => expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1));
    let first;
    let duplicate;
    act(() => {
      first = result.current.refresh();
      duplicate = result.current.refresh();
    });
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(2);
    await act(async () => { newRequest.resolve(experience({ available: true })); await first; await duplicate; });
    await act(async () => { oldRequest.resolve(experience({ available: false })); await oldRequest.promise; });
    expect(result.current.experience.preview_link).not.toBeNull();
  });

  it('does not refetch F1 for System readiness or founder QA evidence recovery when merchant projection semantics are unchanged', async () => {
    const user = userEvent.setup();
    const service = serviceFor({
      after: experience({ available: false }),
      readinessBefore: readiness({ qaRecovery: true }),
      readinessAfter: readiness()
    });
    renderApp(service);
    await screen.findByRole('heading', { name: 'Something needs attention', level: 3 });
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1);
    await user.click(await screen.findByRole('button', { name: 'Recover saved review' }));
    await screen.findByText('Saved review recovered. Founder acceptance is ready for a separate confirmation.');
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1);
  });

  it('uses the existing state/sequence refresh once when founder QA submission changes the merchant projection', async () => {
    const user = userEvent.setup();
    const initialFlow = { flow_id: 'merchant-flow-f1i-fixture', state: 'qa_review_required', sequence: 26 };
    const refreshedFlow = { flow_id: 'merchant-flow-f1i-fixture', state: 'preview_ready', sequence: 27 };
    const service = serviceFor({
      before: structuredClone(fixtureExperience('m_internal_review')),
      initialFlow, refreshedFlow,
      readinessBefore: readiness({ qaSubmission: true }),
      readinessAfter: readiness()
    });
    renderApp(service);
    await screen.findByRole('heading', { name: 'Completing final checks', level: 2 });
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Continue with accepted review' }));
    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toBeInTheDocument();
    expect(service.submitFounderQa).toHaveBeenCalledTimes(1);
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(2);
  });

  it('preserves a structured failed operator error and does not refresh or invent preview availability', async () => {
    const user = userEvent.setup();
    const service = serviceFor();
    service.recoverPreviewProvenance = vi.fn(async () => {
      throw Object.assign(new Error('Preview recovery could not be completed safely.'), {
        status: 409,
        code: 'merchant_flow_operator_operation_stale',
        details: { internal: 'private server detail' }
      });
    });
    renderApp(service);
    await screen.findByRole('heading', { name: 'Something needs attention', level: 3 });
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover preview provenance' }));
    expect((await screen.findByText(/merchant_flow_operator_operation_stale/)).closest('p')).toHaveTextContent('HTTP 409 · merchant_flow_operator_operation_stale');
    expect(screen.queryByText('private server detail')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open Calinium preview' })).not.toBeInTheDocument();
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1);
  });

  it('restores the fresh server preview across Advanced round-trip and an independent reload without a local recovery token', async () => {
    const user = userEvent.setup();
    const service = serviceFor({ before: experience({ available: true }), after: experience({ available: true }), readinessBefore: readiness() });
    const view = renderApp(service);
    const link = await screen.findByRole('link', { name: 'Open Calinium preview' });
    expect(link).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);
    await user.click(await screen.findByRole('button', { name: 'Quick Start' }));
    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toBeInTheDocument();
    expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1);

    view.unmount();
    const reloaded = serviceFor({ before: experience({ available: true }), after: experience({ available: true }), readinessBefore: readiness() });
    renderApp(reloaded);
    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toBeInTheDocument();
    expect(reloaded.analysisFirstExperience).toHaveBeenCalledTimes(1);
  });

  it('keeps operator controls absent for normal merchants and adds no business mutation or duplicate conversion telemetry', async () => {
    sessionStorage.clear();
    const user = userEvent.setup();
    const service = serviceFor();
    const view = renderApp(service, false);
    await screen.findByRole('heading', { name: 'Something needs attention', level: 3 });
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    view.unmount();

    const operatorService = serviceFor();
    renderApp(operatorService, true);
    await screen.findByRole('heading', { name: 'Something needs attention', level: 3 });
    const telemetryBefore = operatorService.recordAnalysisFirstTelemetry.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    await user.click(await screen.findByRole('button', { name: 'Recover preview provenance' }));
    await screen.findByRole('link', { name: 'Open Calinium preview' });
    expect(operatorService.recordAnalysisFirstTelemetry.mock.calls.length).toBe(telemetryBefore);
    for (const operation of ['createCustomThemeOrder', 'retryCustomThemeGeneration', 'startMerchantGenerationFlow', 'resumeMerchantGenerationFlow']) {
      expect(operatorService[operation]).not.toHaveBeenCalled();
    }
  });
});
