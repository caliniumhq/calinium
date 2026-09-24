import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import dashboardStyles from '../styles/dashboard.css?raw';

function longSession() {
  return {
    id: 'cds_e5rh', project_id: 'prj_e5rh', stage: 'conversation',
    transcript: Array.from({ length: 32 }, (_, index) => ({ id: `msg_e5rh_${index}`, role: index % 2 ? 'merchant' : 'calinium', content: index === 31 ? 'What do you sell?' : `Saved conversation entry ${index + 1}`, created_at: '2026-08-26T12:00:00.000Z' })),
    conversation_state: { currentQuestionId: 'products', missingCriticalFacts: ['productsOrServices', 'targetAudience', 'primaryGoal'] },
    review: {}, resource_plan: {}, generation_context: {}, content_plan: {}
  };
}

function serviceFor({ readiness = vi.fn() } = {}) {
  const session = longSession();
  return {
    load: vi.fn(async () => ({ project: { id: 'prj_e5rh', name: 'Dedicated staging' }, session, assets: [] })),
    operatorReadiness: readiness,
    start: vi.fn(), restart: vi.fn(), respond: vi.fn(), merchantIntake: vi.fn(), merchantGenerationFlow: vi.fn()
  };
}

function readyResult() {
  const ready = { ready: true, reason_code: null };
  return {
    http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1', beta_source_version: '9'.repeat(40), beta_feature_flag_status: 'enabled',
    components: Object.fromEntries(['source_attestation', 'database', 'artifact_storage', 'durable_job_storage', 'generation_worker', 'render_qa_worker', 'shopify_cli_runtime', 'shopify_cli_runtime_state', 'controlled_shopify_target', 'd1', 'd2_7_provider', 'operator_authorization'].map((key) => [key, ready]))
  };
}

describe('E5R-H embedded readiness and recovery visibility', () => {
  it('shows the supported action only to the server-projected operator and renders sanitized readiness', async () => {
    const readiness = vi.fn(async () => readyResult());
    const user = userEvent.setup();
    const view = render(<CreativeDirectorApp service={serviceFor({ readiness })} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable />);
    await user.click(await screen.findByRole('button', { name: 'System readiness' }));
    expect(readiness).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toHaveTextContent('READY');
    expect(screen.getByRole('region', { name: 'System readiness result' })).toHaveTextContent('HTTP 200');
    expect(screen.getByRole('region', { name: 'System readiness result' })).toHaveTextContent('MAIN theme exclusionENFORCED');
    expect(screen.queryByText(/Bearer|id.?token|cookie|secret/i)).not.toBeInTheDocument();
    view.unmount();

    render(<CreativeDirectorApp service={serviceFor()} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} operatorDiagnosticsAvailable={false} />);
    expect(await screen.findByRole('button', { name: 'Advanced' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'System readiness' })).not.toBeInTheDocument();
  });

  it('contains the 1693px transcript scroll inside the message region while Advanced remains persistent', async () => {
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get() { return this.classList?.contains('conversation-screen__messages') ? 1693 : 0; } });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    try {
      render(<CreativeDirectorApp service={serviceFor()} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
      const advanced = await screen.findByRole('button', { name: 'Advanced' });
      const transcript = screen.getByRole('log', { name: 'Conversation history' });
      await waitFor(() => expect(transcript.scrollTop).toBe(1693));
      expect(scrollIntoView).not.toHaveBeenCalled();
      expect(advanced.closest('.quick-start-persistent')).not.toBeNull();
      expect(advanced.closest('.conversation-screen__messages')).toBeNull();
      expect(screen.getAllByRole('button', { name: 'Advanced' })).toHaveLength(1);
      expect(advanced).toHaveClass('quick-start-header__advanced');
      advanced.focus();
      expect(advanced).toHaveFocus();
      expect(dashboardStyles).toContain('.quick-start-shell { grid-template-rows: auto minmax(0, 1fr); overflow: hidden; }');
      expect(dashboardStyles).toContain('.conversation-screen--compact .conversation-screen__messages { align-content: start; flex: 1; min-height: 0; overflow-y: auto;');
      expect(dashboardStyles).toContain('.quick-start-header__advanced { display: inline-flex; min-height: 40px;');
      expect(dashboardStyles).not.toContain('.quick-start-shell { grid-template-rows: auto auto 1fr; overflow: visible; }');
    } finally {
      if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      else delete HTMLElement.prototype.scrollHeight;
      if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
      else delete HTMLElement.prototype.scrollIntoView;
    }
  });
});
