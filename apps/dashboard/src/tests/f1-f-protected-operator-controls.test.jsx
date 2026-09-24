import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import operatorFixture from '../../../../fixtures/f1-f-protected-operator-controls-analysis-first.json';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import { fixtureExperience } from '../fixtures/analysis-first-experience-fixtures';
import dashboardStyles from '../styles/dashboard.css?raw';

function session() {
  return {
    id: 'cds_f1f_fixture', project_id: operatorFixture.project.id, stage: 'conversation',
    updated_at: '2026-09-05T12:00:00.000Z', transcript: [], conversation_state: {}, review: {},
    creative_brief: { business: { name: 'Fixture store' } }, store_strategy: { homepage: { sections: [] } },
    preset_selection: { status: 'approved', candidate_version: 1, approved_revision_id: 'apr_f1f_fixture', selected_preset_id: 'atelier' },
    resource_plan: { fields: [], required_assets: [], required_confirmations: [] }, generation_context: {}, generation_state: {}, preview_state: {}, content_plan: {}
  };
}

function readyProjection({ recoveryAvailable = false } = {}) {
  const ready = { ready: true, reason_code: null };
  return {
    http_status: 200,
    status: 'READY',
    readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
    beta_source_version: operatorFixture.source_baseline,
    beta_feature_flag_status: 'enabled',
    components: Object.fromEntries([
      'source_attestation', 'database', 'artifact_storage', 'durable_job_storage', 'generation_worker',
      'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'shopify_storefront_password',
      'controlled_shopify_target', 'd1', 'd2_7_provider', 'operator_authorization'
    ].map((key) => [key, ready])),
    preview_provenance_recovery: recoveryAvailable
      ? structuredClone(operatorFixture.recovery_required.preview_provenance_recovery)
      : structuredClone(operatorFixture.post_recovery.preview_provenance_recovery)
  };
}

function serviceFor({ analysisFirstEnabled = true, analysisFirstEligible = true, recoveryAvailable = false } = {}) {
  const currentSession = session();
  const data = {
    project: { id: operatorFixture.project.id, name: 'F1-F fixture store' },
    session: currentSession,
    assets: [],
    analysis_first_merchant_experience_enabled: analysisFirstEnabled,
    merchant_flow_beta_enabled: true,
    merchant_flow: { flow: structuredClone(operatorFixture.flow) }
  };
  return {
    load: vi.fn(async () => data),
    analysisFirstExperience: vi.fn(async () => analysisFirstEligible ? structuredClone(fixtureExperience('n_preview_ready')) : { eligible: false, projection: null }),
    recordAnalysisFirstTelemetry: vi.fn(async () => ({ recorded: true })),
    selectAnalysisFirstDirection: vi.fn(),
    operatorReadiness: vi.fn(async () => readyProjection({ recoveryAvailable })),
    refreshOperatorReadiness: vi.fn(),
    recoverPreviewProvenance: vi.fn(async () => ({ operation: { status: 'applied' } })),
    recoverFounderQaEvidence: vi.fn(), submitFounderQa: vi.fn(),
    merchantGenerationFlow: vi.fn(), start: vi.fn(), restart: vi.fn(), respond: vi.fn(), setStage: vi.fn(),
    refreshMerchantIntake: vi.fn(), retryLivePreview: vi.fn(), approveRecommendedResourceSet: vi.fn(),
    replaceRecommendedResource: vi.fn(), approveCreativeDirection: vi.fn(), startMerchantGenerationFlow: vi.fn(),
    answerMerchantGenerationFlow: vi.fn(), resumeMerchantGenerationFlow: vi.fn(), shopifyResources: vi.fn()
  };
}

describe('F1-F protected operator controls in the analysis-first experience', () => {
  it('keeps disabled F1 on Quick Start with one server-authorized diagnostics host', async () => {
    const user = userEvent.setup();
    const service = serviceFor({ analysisFirstEnabled: false });
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);

    expect(await screen.findByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    expect(view.container.querySelectorAll('[data-operator-diagnostics-host]')).toHaveLength(1);
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toHaveAttribute('data-operator-diagnostics-host', 'quick-start');
    expect(service.operatorReadiness).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(service.operatorReadiness).toHaveBeenCalledTimes(1);
  });

  it('keeps disabled F1 on Quick Start without an operator placeholder for a normal merchant', async () => {
    const service = serviceFor({ analysisFirstEnabled: false });
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable={false} />);

    expect(await screen.findByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    expect(service.operatorReadiness).not.toHaveBeenCalled();
  });

  it('uses the Quick Start placement when an enabled capability safely falls back as ineligible', async () => {
    const service = serviceFor({ analysisFirstEnabled: true, analysisFirstEligible: false });
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);

    expect(await screen.findByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toHaveAttribute('data-operator-diagnostics-host', 'quick-start');
    expect(view.container.querySelectorAll('[data-operator-diagnostics-host]')).toHaveLength(1);
  });

  it('renders no operator component, placeholder, or technical copy for a normal merchant', async () => {
    const service = serviceFor();
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable={false} />);

    expect(await screen.findByRole('heading', { name: operatorFixture.normal_merchant.merchant_stage, level: 1 })).toBeInTheDocument();
    expect(view.container.querySelectorAll('.analysis-first-stages__item')).toHaveLength(operatorFixture.invariants.merchant_stage_count);
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toBeNull();
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Recover preview provenance|operator controls/i)).not.toBeInTheDocument();
    expect(service.operatorReadiness).not.toHaveBeenCalled();
  });

  it('mounts the shared diagnostics once in F1 and performs no automatic operator action', async () => {
    const service = serviceFor({ recoveryAvailable: true });
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);

    expect(await screen.findByRole('heading', { name: operatorFixture.recovery_required.merchant_stage, level: 1 })).toBeInTheDocument();
    expect(view.container.querySelectorAll('[data-operator-diagnostics-host]')).toHaveLength(operatorFixture.invariants.operator_component_mount_maximum);
    expect(view.container.querySelector('[data-operator-diagnostics-host]')).toHaveAttribute('data-operator-diagnostics-host', 'analysis-first');
    expect(view.container.querySelectorAll('.analysis-first-stages__item')).toHaveLength(operatorFixture.invariants.merchant_stage_count);
    expect(screen.queryByRole('tab', { name: 'Chat' })).not.toBeInTheDocument();
    expect(service.operatorReadiness).not.toHaveBeenCalled();
    expect(service.refreshOperatorReadiness).not.toHaveBeenCalled();
    expect(service.recoverPreviewProvenance).not.toHaveBeenCalled();
  });

  it('reuses System readiness and the exact explicit preview-recovery request without merchant telemetry', async () => {
    const user = userEvent.setup();
    const service = serviceFor({ recoveryAvailable: true });
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);
    const systemReadiness = await screen.findByRole('button', { name: 'System readiness' });
    await waitFor(() => expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1));
    const merchantTelemetryBefore = service.recordAnalysisFirstTelemetry.mock.calls.length;

    await user.click(systemReadiness);
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toHaveTextContent('READY');
    expect(view.container.querySelectorAll('#quick-start-operator-readiness')).toHaveLength(1);
    expect(service.operatorReadiness).toHaveBeenCalledTimes(1);
    expect(service.recordAnalysisFirstTelemetry).toHaveBeenCalledTimes(merchantTelemetryBefore);

    await user.click(screen.getByRole('button', { name: 'Recover preview provenance' }));
    expect(service.recoverPreviewProvenance).toHaveBeenCalledTimes(1);
    expect(service.recoverPreviewProvenance).toHaveBeenCalledWith(operatorFixture.recovery_required.preview_provenance_recovery.request);
    expect(service.recordAnalysisFirstTelemetry).toHaveBeenCalledTimes(merchantTelemetryBefore);
  });

  it('keeps readiness available but omits recovery after the authoritative post-recovery projection', async () => {
    const user = userEvent.setup();
    const service = serviceFor({ recoveryAvailable: false });
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);

    expect(await screen.findByRole('link', { name: 'Open Calinium preview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Recover preview provenance' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: operatorFixture.post_recovery.merchant_stage, level: 1 })).toBeInTheDocument();
    expect(service.recoverPreviewProvenance).not.toHaveBeenCalled();
  });

  it('preserves keyboard access, contained narrow placement, and the existing protected request boundary', async () => {
    const user = userEvent.setup();
    const service = serviceFor();
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);
    const readiness = await screen.findByRole('button', { name: 'System readiness' });

    await user.tab();
    expect(document.activeElement).toBeTruthy();
    readiness.focus();
    expect(readiness).toHaveFocus();
    expect(view.container.querySelector('[aria-label="Operator controls"]')).toBeInTheDocument();
    expect(dashboardStyles).toContain('.analysis-first-shell {');
    expect(dashboardStyles).toContain('overflow-x: clip');
    expect(dashboardStyles).toContain('.protected-operator-diagnostics-host--analysis-first { margin-inline-start: auto; }');
    expect(dashboardStyles).toContain('.quick-start-operator-readiness { left: 1rem;');
    expect(dashboardStyles).toContain(':focus-visible');
  });
});
