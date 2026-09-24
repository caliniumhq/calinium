import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import { ConversationScreen } from '../components/creative-director/ConversationScreen';
import dashboardStyles from '../styles/dashboard.css?raw';

function conversationSession() {
  return {
    id: 'cds-test', project_id: 'project-test', stage: 'conversation',
    transcript: [{ id: 'msg-greeting', role: 'calinium', content: "Hi, I'm Calinium.\nI'll help you design a Shopify storefront.\nWhat do you sell?", created_at: '2026-07-21T12:00:00.000Z' }],
    conversation_state: { knownFacts: [], missingCriticalFacts: ['productsOrServices'], readyForCreativeBrief: false },
    review: {}, resource_plan: {}, generation_state: {}, preview_state: {}
  };
}

function blueprintSession() {
  return {
    ...conversationSession(), stage: 'blueprint',
    conversation_state: { knownFacts: [], missingCriticalFacts: [], readyForCreativeBrief: true },
    creative_brief: {
      business: { name: 'Northline Atelier', summary: 'Handmade leather travel bags.', offer: ['Leather travel bags'], businessModel: 'direct to consumer', markets: [] },
      audience: { primary: 'Frequent travelers', needs: [], motivations: [], objections: [] },
      positioning: { marketPosition: 'premium', valueProposition: 'Enduring travel goods', differentiators: [] },
      brand: { personality: ['refined'], desiredFeeling: ['warm'], existingAssets: [], constraints: [] },
      goals: { primary: 'brand positioning', secondary: [] }, content: { available: [], missing: [] }, assumptions: [], uncertainties: [], confidence: 0.82
    },
    review: { creativeBriefStatus: 'pending', storeStrategyStatus: 'pending', decisions: [] }
  };
}

function strategySession() {
  return {
    ...blueprintSession(), stage: 'strategy',
    store_strategy: {
      designDirection: { name: 'Editorial luxury', rationale: 'Craft-led travel goods benefit from restraint.', traits: ['warm', 'quiet'] },
      colorDirection: { paletteRole: 'warm neutral', recommendedColors: [], rationale: 'Supports natural leather.' },
      typographyDirection: { style: 'Editorial serif', recommendedRoles: {}, rationale: 'Balances craft and clarity.' },
      homepage: { objective: 'Build confidence in the craft.', hero: { treatment: 'Editorial product story', rationale: 'Lead with the material.' }, sections: [] },
      navigation: { primaryItems: ['Shop', 'Our story'], recommendMegaMenu: false, rationale: 'Keep discovery focused.' },
      productPage: { galleryStyle: 'Detail-led gallery', purchaseExperience: 'Clear purchase path', trustElements: [] },
      collectionPage: { layout: 'Editorial grid', filters: [], sorting: 'Featured' },
      motion: { level: 'minimal', principles: ['Motion clarifies state.'] }, technicalRequirements: { accessibility: 'WCAG 2.2 AA', performance: 'high', responsive: true, progressiveEnhancement: true },
      recommendations: [{ id: 'homepage-hero', area: 'homepage', recommendation: 'Lead with a refined product story.', rationale: 'It establishes material quality early.' }], merchantApprovalsRequired: []
    },
    review: { creativeBriefStatus: 'approved', storeStrategyStatus: 'pending', decisions: [] }
  };
}

function presetSession() {
  return {
    ...strategySession(), stage: 'preset',
    preset_selection: {
      version: 1, candidate_version: 1, status: 'draft', recommended_preset_id: 'atelier', selected_preset_id: 'atelier', preset_version: '1.0', selection_source: 'creative_director_recommendation',
      recommendation_reasons: ['Designed for luxury fashion merchants.', 'Builds on the approved homepage strategy.'],
      alternatives: [{ preset_id: 'maison', preset_version: '1.0', differences: ['low information density', 'collection led emphasis', 'generous spacing'] }],
      compatibility: { compatible: true, industry: true, business_model: true, personality: true, design_language: true, recipe: true, target_theme: true, content_ready: true, missing_required_content: [], reasons: [] },
      fallback: null, strategy_revision: 'fixture-strategy', target_theme: { id: 'calinium-one', version: '1.0' }, approved_revision_id: null, updated_at: '2026-07-21T12:00:00.000Z'
    }
  };
}

function serviceFor(initialSession) {
  let session = initialSession;
  const update = (next) => { session = next; return Promise.resolve({ session }); };
  return {
    load: vi.fn(async () => ({ session, assets: [] })),
    start: vi.fn(() => update(conversationSession())),
    restart: vi.fn(() => update(conversationSession())),
    respond: vi.fn(() => update({ ...session, stage: 'understanding', conversation_state: { knownFacts: [{ path: 'productsOrServices', value: ['Leather travel bags'] }], missingCriticalFacts: [], readyForCreativeBrief: true }, transcript: [...session.transcript, { id: 'merchant-answer', role: 'merchant', content: 'Leather travel bags', created_at: '2026-07-21T12:01:00.000Z' }] })),
    correct: vi.fn(), createBrief: vi.fn(), requestBriefRevision: vi.fn(), decideRecommendation: vi.fn(), approveStrategy: vi.fn(),
    selectPreset: vi.fn((expectedVersion, presetId) => update({ ...session, preset_selection: { ...session.preset_selection, candidate_version: expectedVersion + 1, selected_preset_id: presetId, selection_source: 'merchant_selection' } })),
    approvePreset: vi.fn((expectedVersion) => update({ ...session, stage: 'resources', preset_selection: { ...session.preset_selection, candidate_version: expectedVersion, status: 'approved', approved_revision_id: 'apr_fixture' } })),
    updateResources: vi.fn(), generate: vi.fn(), setStage: vi.fn(),
    approveBrief: vi.fn(() => update(strategySession()))
  };
}

describe('CreativeDirectorApp', () => {
  it('moves stage focus without letting the sticky header cover new stage content', async () => {
    const originalScrollTo = window.scrollTo;
    const scrollTo = vi.fn();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: scrollTo });
    const service = serviceFor(conversationSession());
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} initialMode="advanced" />);

    expect(await screen.findByRole('heading', { name: 'Let’s begin with your business.' })).toBeInTheDocument();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(document.querySelector('.creative-director-app__content')).toHaveFocus();

    Object.defineProperty(window, 'scrollTo', { configurable: true, value: originalScrollTo });
  });

  it('keeps the initial single-message prompt at the top and scrolls only after the conversation advances', () => {
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    const { rerender } = render(<ConversationScreen session={conversationSession()} onRespond={vi.fn()} pending={false} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<ConversationScreen session={{ ...conversationSession(), transcript: [...conversationSession().transcript, { id: 'merchant-answer', role: 'merchant', content: 'Leather travel bags', created_at: '2026-07-21T12:01:00.000Z' }] }} onRespond={vi.fn()} pending={false} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: originalScrollIntoView });
    else delete HTMLElement.prototype.scrollIntoView;
  });

  it('preserves merchant text on a true save failure and clears it after an authoritative success', async () => {
    const user = userEvent.setup();
    const failed = vi.fn(async () => null);
    const { rerender } = render(<ConversationScreen session={conversationSession()} onRespond={failed} pending={false} />);
    const input = screen.getByRole('textbox', { name: 'Your answer' });
    await user.type(input, 'Customers should shop directly.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('I couldn’t save that answer yet. Your text is still here so you can retry.');
    expect(input).toHaveValue('Customers should shop directly.');

    const succeeded = vi.fn(async () => ({ session: conversationSession() }));
    rerender(<ConversationScreen session={conversationSession()} onRespond={succeeded} pending={false} />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('begins the first conversation automatically when a newly created project has no saved design session', async () => {
    const service = serviceFor(null);
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} initialMode="advanced" />);

    expect(await screen.findByRole('heading', { name: 'Let’s begin with your business.' })).toBeInTheDocument();
    expect(service.start).toHaveBeenCalledTimes(1);
  });

  it('renders one conversational prompt at a time and advances only after a saved response', async () => {
    const service = serviceFor(conversationSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} initialMode="advanced" />);

    expect(await screen.findByRole('heading', { name: 'Let’s begin with your business.' })).toBeInTheDocument();
    expect(screen.getByText(/What do you sell\?/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await user.type(screen.getByRole('textbox', { name: 'Your answer' }), 'Leather travel bags');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Here’s what I understood.' })).toBeInTheDocument();
    expect(service.respond).toHaveBeenCalledWith('Leather travel bags');
  });

  it('presents an approval-based Brand Blueprint and Store Strategy instead of raw data', async () => {
    const service = serviceFor(blueprintSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} initialMode="advanced" />);

    expect(await screen.findByRole('heading', { name: 'A considered picture of your business.' })).toBeInTheDocument();
    expect(screen.getByText('Handmade leather travel bags.')).toBeInTheDocument();
    expect(screen.queryByText(/\{\s*"version"/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(await screen.findByRole('heading', { name: 'A storefront direction designed for your business.' })).toBeInTheDocument();
    expect(screen.getByText('Lead with a refined product story.')).toBeInTheDocument();
  });

  it('shows one recommendation, compatible alternatives, and an explicit preset approval without runtime jargon', async () => {
    const service = serviceFor(presetSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} initialMode="advanced" />);

    expect(await screen.findByRole('heading', { name: 'Choose the visual system for your storefront' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Atelier' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Atelier' })).toHaveClass('summary-card');
    expect(dashboardStyles).toContain('.creative-director-app .summary-card { background: var(--cd-surface); border-color: var(--cd-line); color: var(--cd-ink); }');
    expect(screen.getByLabelText(/Maison/)).toBeInTheDocument();
    expect(screen.queryByText(/setting_id|section_id|JSON/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/Maison/));
    expect(service.selectPreset).toHaveBeenCalledWith(1, 'maison');
    await user.click(await screen.findByRole('button', { name: 'Approve Maison' }));
    expect(service.approvePreset).toHaveBeenCalledWith(2);
  });
});
