import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import { AnalysisFirstMerchantJourney } from '../components/analysis-first/AnalysisFirstMerchantJourney';
import { AnalysisFirstMerchantExperienceHarness } from '../components/analysis-first/AnalysisFirstMerchantExperienceHarness';
import { ANALYSIS_FIRST_EXPERIENCE_FIXTURES, fixtureExperience } from '../fixtures/analysis-first-experience-fixtures';
import { useAnalysisFirstMerchantExperience } from '../hooks/use-analysis-first-merchant-experience';
import dashboardStyles from '../styles/dashboard.css?raw';

const noop = vi.fn(async () => true);
function journeyProps(overrides = {}) {
  return {
    pending: false,
    onChooseDirection: noop,
    onEssentialDetail: noop,
    onBuild: noop,
    onRetry: noop,
    onApprove: noop,
    onRequestChanges: noop,
    onCompare: noop,
    onAdvanced: noop,
    onTrack: noop,
    ...overrides
  };
}
function renderFixture(id, overrides = {}) {
  return render(<AnalysisFirstMerchantExperienceHarness fixtureId={id} {...journeyProps(overrides)} />);
}

function disabledService() {
  const session = {
    id: 'cds-f1-disabled', project_id: 'prj-f1-disabled', stage: 'resources', transcript: [], conversation_state: {}, review: {},
    creative_brief: { business: { name: 'Fixture store' } }, store_strategy: { homepage: { sections: [] } },
    preset_selection: { status: 'approved', candidate_version: 1, approved_revision_id: 'apr-fixture', selected_preset_id: 'atelier' },
    resource_plan: { fields: [], required_assets: [], required_confirmations: [] }, generation_context: {}, generation_state: {}, preview_state: {}, content_plan: {}
  };
  return {
    load: vi.fn(async () => ({ project: { id: session.project_id, name: 'Fixture store' }, session, assets: [], analysis_first_merchant_experience_enabled: false })),
    merchantGenerationFlow: vi.fn(), start: vi.fn(), restart: vi.fn(), respond: vi.fn(), setStage: vi.fn(),
    refreshMerchantIntake: vi.fn(), retryLivePreview: vi.fn(), approveRecommendedResourceSet: vi.fn(),
    replaceRecommendedResource: vi.fn(), approveCreativeDirection: vi.fn(), startMerchantGenerationFlow: vi.fn(),
    answerMerchantGenerationFlow: vi.fn(), resumeMerchantGenerationFlow: vi.fn(), shopifyResources: vi.fn()
  };
}

describe('F1-B embedded three-stage merchant experience A–Z', () => {
  it('A. leaves the existing Quick Start default untouched while capability is disabled', async () => {
    const service = disabledService();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
    expect(service.analysisFirstExperience).toBeUndefined();
  });

  it('B. renders one confident visual recommendation without a forced choice', () => {
    renderFixture('a_confident_visual_story_led');
    expect(screen.getByRole('heading', { name: 'Visual & story-led' })).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('C. renders one confident direct recommendation without a forced choice', () => {
    renderFixture('b_confident_direct_efficient');
    expect(screen.getByRole('heading', { name: 'Direct & efficient' })).toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('D. renders exactly two selectable direction cards for material ambiguity', () => {
    renderFixture('c_material_ambiguity');
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByLabelText(/Visual & story-led/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Direct & efficient/)).toBeInTheDocument();
  });

  it('E. submits one plain-language card identity through the direction callback', async () => {
    const user = userEvent.setup();
    const choose = vi.fn(async () => true);
    renderFixture('c_material_ambiguity', { onChooseDirection: choose });
    await user.click(screen.getByLabelText(/Visual & story-led/));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(choose).toHaveBeenCalledWith('visual_story_led');
  });

  it('F. locks a duplicate direction click at the hook boundary', async () => {
    let resolve;
    const pending = new Promise((done) => { resolve = done; });
    const experience = fixtureExperience('c_material_ambiguity');
    const service = {
      analysisFirstExperience: vi.fn(async () => experience),
      selectAnalysisFirstDirection: vi.fn(() => pending),
      recordAnalysisFirstTelemetry: vi.fn(async () => true)
    };
    const { result } = renderHook(() => useAnalysisFirstMerchantExperience({ service, enabled: true }));
    await waitFor(() => expect(result.current.experience).toBe(experience));
    let first; let second;
    act(() => {
      first = result.current.selectDirection('visual_story_led');
      second = result.current.selectDirection('visual_story_led');
    });
    expect(service.selectAnalysisFirstDirection).toHaveBeenCalledTimes(1);
    expect(await second).toBeNull();
    resolve(fixtureExperience('j_build_in_progress'));
    await first;
    expect(service.recordAnalysisFirstTelemetry.mock.calls.filter(([input]) => input.event_name === 'direction_selected')).toHaveLength(1);
  });

  it('G. associates a stale direction error with the choice form without changing selection', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AnalysisFirstMerchantJourney experience={fixtureExperience('c_material_ambiguity')} {...journeyProps()} />);
    await user.click(screen.getByLabelText(/Direct & efficient/));
    rerender(<AnalysisFirstMerchantJourney experience={fixtureExperience('c_material_ambiguity')} {...journeyProps({ error: 'Reload the current direction before choosing.' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Reload the current direction');
    expect(screen.getByLabelText(/Direct & efficient/)).toBeChecked();
  });

  it('H. shows one essential detail and preserves its text when saving fails', async () => {
    const user = userEvent.setup();
    renderFixture('h_essential_detail', { onEssentialDetail: vi.fn(async () => null) });
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    await user.type(screen.getByRole('textbox'), 'Handmade travel goods');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('textbox')).toHaveValue('Handmade travel goods');
    expect(screen.getByRole('alert')).toHaveTextContent('Your text is still here');
  });

  it('I. expands and dismisses only the allowlisted recommendation reasons', async () => {
    const user = userEvent.setup();
    const track = vi.fn();
    renderFixture('a_confident_visual_story_led', { onTrack: track });
    const toggle = screen.getByRole('button', { name: 'See why' });
    await user.click(toggle);
    expect(screen.getByText('Your available product imagery can support visual discovery.')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Close explanation' }));
    expect(toggle).toHaveFocus();
    expect(track).toHaveBeenCalledWith('recommendation_reason_opened');
  });

  it('J. starts Build my preview only from an explicit click', async () => {
    const user = userEvent.setup();
    const build = vi.fn(async () => true);
    renderFixture('b_confident_direct_efficient', { onBuild: build });
    expect(build).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Build my preview' }));
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('J2. binds Build my preview through the existing commercial order orchestration in the real app host', async () => {
    const user = userEvent.setup();
    const service = disabledService();
    const originalLoad = service.load;
    service.load = vi.fn(async () => ({ ...(await originalLoad()), analysis_first_merchant_experience_enabled: true, merchant_flow_beta_enabled: false }));
    service.analysisFirstExperience = vi.fn(async () => fixtureExperience('b_confident_direct_efficient'));
    service.recordAnalysisFirstTelemetry = vi.fn(async () => ({ recorded: true }));
    service.selectAnalysisFirstDirection = vi.fn();
    service.customThemeEligibility = vi.fn(async () => ({ eligibility: { readiness_token: 'c'.repeat(64) } }));
    service.createCustomThemeOrder = vi.fn(async () => ({ order: { id: 'order-f1-b' } }));
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Build my preview' }));
    await waitFor(() => expect(service.createCustomThemeOrder).toHaveBeenCalledTimes(1));
    expect(service.customThemeEligibility).toHaveBeenCalledTimes(1);
    expect(service.createCustomThemeOrder.mock.calls[0][0]).toBe(`analysis-first-${fixtureExperience('b_confident_direct_efficient').projection_key}`);
    expect(service.createCustomThemeOrder.mock.calls[0][1]).toBe('c'.repeat(64));
    expect(screen.queryByRole('tab', { name: 'Chat' })).not.toBeInTheDocument();
  });

  it('K. performs zero mutation while the analysis view merely renders', () => {
    const actions = { onChooseDirection: vi.fn(), onEssentialDetail: vi.fn(), onBuild: vi.fn(), onRetry: vi.fn(), onApprove: vi.fn(), onRequestChanges: vi.fn(), onCompare: vi.fn() };
    renderFixture('g_store_analysis', actions);
    expect(Object.values(actions).every((callback) => callback.mock.calls.length === 0)).toBe(true);
  });

  it('L. keeps one current visible stage and safe indeterminate building copy', () => {
    renderFixture('j_build_in_progress');
    expect(screen.getAllByText('Building your storefront').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('%');
  });

  it('M. refetches authoritative projection on a source refresh without invoking a mutation', async () => {
    const service = { analysisFirstExperience: vi.fn(async () => fixtureExperience('j_build_in_progress')), recordAnalysisFirstTelemetry: vi.fn(async () => true), selectAnalysisFirstDirection: vi.fn() };
    const { rerender } = renderHook(({ keyValue }) => useAnalysisFirstMerchantExperience({ service, enabled: true, refreshKey: keyValue }), { initialProps: { keyValue: 'one' } });
    await waitFor(() => expect(service.analysisFirstExperience).toHaveBeenCalledTimes(1));
    rerender({ keyValue: 'two' });
    await waitFor(() => expect(service.analysisFirstExperience).toHaveBeenCalledTimes(2));
    expect(service.selectAnalysisFirstDirection).not.toHaveBeenCalled();
  });

  it('N. exposes Try again only for a retryable failure', async () => {
    const retry = vi.fn(async () => true);
    const user = userEvent.setup();
    renderFixture('k_retryable_failure', { onRetry: retry });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('O. omits a false retry for a terminal failure and keeps Advanced available', () => {
    renderFixture('l_terminal_failure');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Advanced/ }).length).toBeGreaterThan(0);
    expect(screen.getByText('Contact support')).toBeInTheDocument();
  });

  it('P. presents internal review only as Completing final checks', () => {
    renderFixture('m_internal_review');
    expect(screen.getByRole('heading', { name: 'Completing final checks' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/founder|operator|model|provider/i);
  });

  it('Q. renders only supported preview actions', () => {
    renderFixture('n_preview_ready');
    expect(screen.getByRole('button', { name: 'Approve design' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare with current store' })).toBeInTheDocument();
    expect(screen.getByText('Your current theme will not change while you review this preview.')).toBeInTheDocument();
  });

  it('R. records design approval only from the explicit preview action', async () => {
    const user = userEvent.setup();
    const approve = vi.fn(async () => true);
    renderFixture('n_preview_ready', { onApprove: approve });
    expect(approve).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Approve design' }));
    expect(approve).toHaveBeenCalledTimes(1);
  });

  it('S. routes Request changes to the supplied bounded refinement entry', async () => {
    const user = userEvent.setup();
    const requestChanges = vi.fn();
    renderFixture('n_preview_ready', { onRequestChanges: requestChanges });
    await user.click(screen.getByRole('button', { name: 'Request changes' }));
    expect(requestChanges).toHaveBeenCalledTimes(1);
  });

  it('T. omits comparison when authoritative capability is unavailable', () => {
    const experience = structuredClone(fixtureExperience('n_preview_ready'));
    experience.projection.secondary_actions = experience.projection.secondary_actions.filter((action) => action.id !== 'compare_current_store');
    render(<AnalysisFirstMerchantJourney experience={experience} {...journeyProps()} />);
    expect(screen.queryByRole('button', { name: 'Compare with current store' })).not.toBeInTheDocument();
  });

  it('U. never renders operator controls in the merchant surface', () => {
    renderFixture('n_preview_ready');
    expect(document.body.textContent).not.toMatch(/System readiness|Apply founder|Recover evidence|operator/i);
  });

  it('V. keeps Advanced keyboard-reachable without mutating the projection', async () => {
    const user = userEvent.setup();
    const advanced = vi.fn();
    const experience = fixtureExperience('j_build_in_progress');
    render(<AnalysisFirstMerchantJourney experience={experience} {...journeyProps({ onAdvanced: advanced })} />);
    await user.click(screen.getAllByRole('button', { name: 'Advanced' })[0]);
    expect(advanced).toHaveBeenCalledTimes(1);
    expect(experience).toEqual(fixtureExperience('j_build_in_progress'));
  });

  it('W. returns no simple surface for an ineligible legacy projection', () => {
    const { container } = render(<AnalysisFirstMerchantJourney experience={{ eligible: false, projection: null }} {...journeyProps()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('X. leaks no forbidden internal terminology in any of the 16 rendered states', () => {
    const forbidden = /profile\.|image_led|information_led|candidate score|selection margin|Design DNA|\bD1\b|D2\.7|OpenAI|gpt-|provider|checksum|job ID|lease|lineage|repair class|stack trace|\/Users\//i;
    for (const entry of ANALYSIS_FIRST_EXPERIENCE_FIXTURES) {
      const view = render(<AnalysisFirstMerchantJourney experience={entry.experience} {...journeyProps()} />);
      expect(view.container.textContent, entry.id).not.toMatch(forbidden);
      view.unmount();
    }
  });

  it('Y. emits allowlisted impressions once per session projection and no arbitrary payload', async () => {
    sessionStorage.clear();
    const experience = fixtureExperience('a_confident_visual_story_led');
    const service = { analysisFirstExperience: vi.fn(async () => experience), recordAnalysisFirstTelemetry: vi.fn(async () => true), selectAnalysisFirstDirection: vi.fn() };
    const first = renderHook(() => useAnalysisFirstMerchantExperience({ service, enabled: true }));
    await waitFor(() => expect(service.recordAnalysisFirstTelemetry).toHaveBeenCalled());
    first.unmount();
    renderHook(() => useAnalysisFirstMerchantExperience({ service, enabled: true }));
    await waitFor(() => expect(service.analysisFirstExperience).toHaveBeenCalledTimes(2));
    const viewed = service.recordAnalysisFirstTelemetry.mock.calls.filter(([input]) => input.event_name === 'analysis_first_journey_viewed');
    expect(viewed).toHaveLength(1);
    expect(Object.keys(viewed[0][0]).sort()).toEqual(['advanced_mode_used', 'direction_choice_required', 'founder_intervention_count', 'journey_stage', 'merchant_action_count', 'retry_count', 'visible_merchant_question_count', 'event_name'].sort());
  });

  it('Z. includes narrow embedded, minimum-target, focus, no-overflow, and reduced-motion rules', () => {
    expect(dashboardStyles).toContain('@media (max-width: 720px)');
    expect(dashboardStyles).toContain('.analysis-first-direction__grid { grid-template-columns: 1fr; }');
    expect(dashboardStyles).toContain('min-height: 40px');
    expect(dashboardStyles).toContain('overflow-x: clip');
    expect(dashboardStyles).toContain(':focus-visible');
    expect(dashboardStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('renders every one of the 16 approved deterministic fixture states through the actual F1-B component', () => {
    expect(ANALYSIS_FIRST_EXPERIENCE_FIXTURES).toHaveLength(16);
    for (const entry of ANALYSIS_FIRST_EXPERIENCE_FIXTURES) {
      const view = render(<AnalysisFirstMerchantJourney experience={entry.experience} {...journeyProps()} />);
      expect(view.container.querySelector('.analysis-first-shell'), entry.id).toBeInTheDocument();
      expect(view.container.querySelectorAll('.analysis-first-stages__item'), entry.id).toHaveLength(3);
      view.unmount();
    }
  });

  it('does not request the F1 endpoint or emit telemetry while disabled', () => {
    const service = { analysisFirstExperience: vi.fn(), recordAnalysisFirstTelemetry: vi.fn(), selectAnalysisFirstDirection: vi.fn() };
    const { result } = renderHook(() => useAnalysisFirstMerchantExperience({ service, enabled: false }));
    expect(result.current.experience).toBeNull();
    expect(service.analysisFirstExperience).not.toHaveBeenCalled();
    expect(service.recordAnalysisFirstTelemetry).not.toHaveBeenCalled();
  });
});
