import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreativeDirectorApp } from '../app/CreativeDirectorApp';
import dashboardStyles from '../styles/dashboard.css?raw';

function conversationSession() {
  return {
    id: 'cds_quick', project_id: 'prj_quick', stage: 'conversation',
    transcript: [{ id: 'msg_greeting', role: 'calinium', content: 'What do you sell?', created_at: '2026-08-09T09:00:00.000Z' }],
    review: {}, resource_plan: {}, generation_context: {}, content_plan: {}
  };
}

function resourceSession() {
  return {
    ...conversationSession(),
    stage: 'resources',
    creative_brief: { business: { name: 'LEGACY_EXAMPLE' } },
    store_strategy: { homepage: { sections: [] } },
    preset_selection: { status: 'approved', candidate_version: 2, approved_revision_id: 'apr_preset', selected_preset_id: 'atelier' },
    resource_plan: { fields: [{ id: 'logo', required: true }], required_assets: [], required_confirmations: [] },
    generation_context: { merchant_references: { logo: 'ast_logo' }, shopify_resource_references: {}, asset_references: {} }
  };
}

function presetSession() {
  return {
    ...conversationSession(), stage: 'preset', creative_brief: { business: { name: 'LEGACY_EXAMPLE' } },
    preset_selection: { status: 'draft', candidate_version: 3, selected_preset_id: 'atelier', recommended_preset_id: 'atelier' }
  };
}

function serviceFor(initialSession, options = {}) {
  let session = initialSession;
  const update = (next) => { session = next; return Promise.resolve({ session }); };
  return {
    load: vi.fn(async () => ({ project: { id: 'prj_quick', name: 'LEGACY_EXAMPLE' }, session, assets: [], recommended_resource_set: options.resourceSet || null, creative_direction: options.creativeDirection || null, custom_theme: options.customTheme || null, merchant_flow: options.merchantFlow, merchant_flow_beta_enabled: options.merchantFlowBetaEnabled === true })),
    start: vi.fn(() => update(conversationSession())),
    restart: vi.fn(() => update(conversationSession())),
    respond: vi.fn((content) => update({ ...session, stage: 'understanding', transcript: [...session.transcript, { id: 'msg_answer', role: 'merchant', content }] })),
    createBrief: vi.fn(), approveBrief: vi.fn(), decideRecommendation: vi.fn(), approveStrategy: vi.fn(),
    approvePreset: options.approvePreset || vi.fn((version) => update({ ...session, stage: 'resources', preset_selection: { ...session.preset_selection, candidate_version: version, status: 'approved', approved_revision_id: 'apr_preset' } })),
    setStage: vi.fn(), updateResources: vi.fn(), shopifyResources: vi.fn(), startShopifyConnection: vi.fn(), syncShopifyResources: vi.fn(), checkShopifyConnection: vi.fn(), disconnectShopifyConnection: vi.fn(), decideShopifyResource: vi.fn(), revokeShopifyResource: vi.fn(), merchantIntake: vi.fn(), refreshMerchantIntake: vi.fn(async () => ({ status: 'usable' })),
    approveRecommendedResourceSet: options.approveRecommendedResourceSet || vi.fn(async () => ({ session, recommended_resource_set: options.resourceSet })),
    replaceRecommendedResource: options.replaceRecommendedResource || vi.fn(async () => ({ recommended_resource_set: options.resourceSet })),
    approveCreativeDirection: options.approveCreativeDirection || vi.fn(async () => ({ creative_direction: options.creativeDirection })),
    createCustomThemeOrder: options.createCustomThemeOrder || vi.fn(),
    customThemeEligibility: vi.fn(async () => options.customTheme || { eligibility: null }),
    merchantGenerationFlow: vi.fn(async () => options.merchantFlow || { flow: null, jobs: [], events: [] }),
    startMerchantGenerationFlow: vi.fn(async () => options.merchantFlow || { flow: { flow_id: 'merchant-flow-quick', flow_checksum: 'a'.repeat(64), state: 'architecture_frozen', architecture: { status: 'frozen' }, merchant_status: { code: 'designing_storefront', label: 'Designing your storefront' }, preview_ready: false } }),
    answerMerchantGenerationFlow: vi.fn(),
    resumeMerchantGenerationFlow: vi.fn(),
    confirmDevelopmentCustomThemePayment: options.confirmDevelopmentCustomThemePayment || vi.fn(),
    verifyCustomThemePayment: options.verifyCustomThemePayment || vi.fn(),
    retryCustomThemeGeneration: options.retryCustomThemeGeneration || vi.fn(),
    downloadCustomThemeArtifact: options.downloadCustomThemeArtifact || vi.fn(),
    generate: vi.fn()
  };
}

describe('Quick Start orchestration', () => {
  it('is the default authenticated project experience and performs no hidden mutation', async () => {
    const service = serviceFor(resourceSession());
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Shape your storefront with Calinium.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Storefront direction' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByText('Approved', { selector: '.quick-start-preview__state' })).toBeInTheDocument();
    expect(screen.getByText('Atelier')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /Storefront design progress/i })).not.toBeInTheDocument();
    expect(service.load).toHaveBeenCalledTimes(1);
    expect(service.start).not.toHaveBeenCalled();
    expect(service.approvePreset).not.toHaveBeenCalled();
    expect(service.updateResources).not.toHaveBeenCalled();
    expect(service.createCustomThemeOrder).not.toHaveBeenCalled();
    expect(service.confirmDevelopmentCustomThemePayment).not.toHaveBeenCalled();
    expect(service.retryCustomThemeGeneration).not.toHaveBeenCalled();
    expect(service.generate).not.toHaveBeenCalled();
  });

  it('reuses the existing conversation service and then reflects saved canonical state', async () => {
    const service = serviceFor(conversationSession());
    const user = userEvent.setup();
    const view = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.type(await screen.findByRole('textbox', { name: 'Your answer' }), 'Luxury leather bags');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(service.respond).toHaveBeenCalledWith('Luxury leather bags');
    expect(await screen.findByText('Luxury leather bags')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Your answer' })).not.toBeInTheDocument();
    expect(screen.getByText(/Your conversation is saved/)).toBeInTheDocument();
    expect(service.load).toHaveBeenCalledTimes(2);
    view.unmount();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText('Luxury leather bags')).toBeInTheDocument();
    expect(service.load).toHaveBeenCalledTimes(3);
  });

  it('routes an explicit preset approval to its canonical owner', async () => {
    const service = serviceFor(presetSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Approve Atelier' }));
    expect(service.approvePreset).toHaveBeenCalledWith(3);
    expect(await screen.findByText('Approved', { selector: '.quick-start-preview__state' })).toBeInTheDocument();
  });

  it('keeps canonical state visible when a decision fails', async () => {
    const approvePreset = vi.fn(async () => { throw new Error('Preset approval could not be saved.'); });
    const service = serviceFor(presetSession(), { approvePreset });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Approve Atelier' }));
    expect(await screen.findByText(/saved work is unchanged/)).toBeInTheDocument();
    expect(screen.getByText('Provisional', { selector: '.quick-start-preview__state' })).toBeInTheDocument();
  });

  it('preserves the composer draft while mobile destinations change', async () => {
    const service = serviceFor(conversationSession());
    const user = userEvent.setup();
    const { container } = render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    const textbox = await screen.findByRole('textbox', { name: 'Your answer' });
    await user.type(textbox, 'A draft answer');
    await user.click(screen.getByRole('tab', { name: 'Preview' }));
    expect(container.querySelector('.quick-start-shell')).toHaveAttribute('data-mobile-destination', 'preview');
    await user.click(screen.getByRole('tab', { name: 'Chat' }));
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toHaveValue('A draft answer');
  });

  it('switches to Advanced and back without creating canonical side effects', async () => {
    const service = serviceFor(resourceSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    await user.click(await screen.findByRole('button', { name: 'Advanced' }));
    expect(screen.getByRole('navigation', { name: /Storefront design progress/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quick Start' }));
    expect(await screen.findByRole('heading', { name: 'Storefront direction' })).toBeInTheDocument();
    expect(service.setStage).not.toHaveBeenCalled();
    expect(service.restart).not.toHaveBeenCalled();
    expect(service.updateResources).not.toHaveBeenCalled();
  });

  it('keeps one keyboard-reachable Advanced fallback at embedded narrow widths', async () => {
    const service = serviceFor(conversationSession());
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    const advanced = await screen.findByRole('button', { name: 'Advanced' });
    expect(advanced).toHaveClass('quick-start-header__advanced');
    expect(screen.getAllByRole('button', { name: 'Advanced' })).toHaveLength(1);
    expect(dashboardStyles).toContain('@media (max-width: 720px)');
    expect(dashboardStyles).toContain('.quick-start-header__actions .quick-start-header__review { display: none; }');
    expect(dashboardStyles).toContain('.quick-start-header__advanced { display: inline-flex; min-height: 40px;');
    expect(dashboardStyles).not.toContain('.quick-start-header__actions .text-button { display: none; }');
    advanced.focus();
    expect(advanced).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('navigation', { name: /Storefront design progress/i })).toBeInTheDocument();
  });

  it('defines distinct desktop, tablet, and mobile layouts without fake storefront output', async () => {
    const service = serviceFor(resourceSession());
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Storefront direction' });
    expect(dashboardStyles).toContain('grid-template-columns: minmax(270px, .82fr) minmax(440px, 1.45fr) minmax(270px, .78fr)');
    expect(dashboardStyles).toContain('@media (max-width: 1100px) and (min-width: 721px)');
    expect(dashboardStyles).toContain('[data-mobile-destination="preview"]');
    expect(screen.queryByText(/Buy now|Add to cart|testimonial|five-star/i)).not.toBeInTheDocument();
  });

  it('shows a truthful partial-learning recovery without blocking conversation', async () => {
    const service = serviceFor(conversationSession());
    service.load.mockResolvedValueOnce({
      project: { id: 'prj_quick', name: 'LEGACY_EXAMPLE' }, session: conversationSession(), assets: [], custom_theme: null,
      store_intelligence: { status: 'partial', label: 'Store learning needs attention', usable: true, retry_available: true }
    });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);
    expect(await screen.findByText('Store learning needs attention', { selector: '.quick-start-status' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your answer' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Retry store learning' }));
    expect(service.refreshMerchantIntake).toHaveBeenCalledTimes(1);
  });

  it('reviews and bulk-approves ordinary resource recommendations while keeping alternatives reviewable', async () => {
    const resourceSet = {
      status: 'recommended', revision_id: 'rrs_current', approvable: true,
      summary: { recommended: 2, omitted: 0, needs_individual_review: 0 }, exceptions: [],
      slots: [
        { slot_id: 'logo', label: 'Logo', required: false, confidence: 'High', recommendation: { selection_id: 'shr_logo', name: 'LEGACY_EXAMPLE wordmark' }, alternatives: [], reason: 'You previously approved it for this project.', fallback: 'Use text.', stale: false },
        { slot_id: 'featured_product', label: 'Featured product', required: true, confidence: 'Medium', recommendation: { selection_id: 'shr_bag', name: 'Black travel bag' }, alternatives: [{ selection_id: 'shr_weekender', name: 'Weekender' }], reason: 'It is an active Shopify product.', fallback: 'Omit.', stale: false }
      ]
    };
    const approveRecommendedResourceSet = vi.fn(async () => ({ session: resourceSession(), recommended_resource_set: { ...resourceSet, status: 'approved', approvable: false } }));
    const replaceRecommendedResource = vi.fn(async () => ({ recommended_resource_set: resourceSet }));
    const service = serviceFor(resourceSession(), { resourceSet, approveRecommendedResourceSet, replaceRecommendedResource });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Review recommended storefront resources' })).toBeInTheDocument();
    expect(screen.getByText('LEGACY_EXAMPLE wordmark')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Change Featured product' }), 'shr_weekender');
    expect(replaceRecommendedResource).toHaveBeenCalledWith('rrs_current', 'featured_product', 'shr_weekender');
    await user.click(screen.getByRole('button', { name: 'Approve recommendations' }));
    expect(approveRecommendedResourceSet).toHaveBeenCalledWith('rrs_current');
  });

  it('shows merchant-readable Recommendation and Design DNA and approves the exact revision pair', async () => {
    const creativeDirection = {
      status: 'recommended', revision_id: 'rcr_current', approvable: true, preview_readiness: 'provisional',
      primary: { name: 'Atelier', preset_id: 'atelier', reasons: ['Your focused catalog and strong imagery support a restrained product story.'] },
      alternatives: [{ name: 'Maison' }, { name: 'Essential' }],
      design_dna: { revision_id: 'dna_current', summary: { typography: 'editorial-serif-led', spacing: 'luxury', motion: 'minimal', commerce_balance: 'balanced' } }
    };
    const approveCreativeDirection = vi.fn(async () => ({ creative_direction: { ...creativeDirection, status: 'approved', approvable: false, preview_readiness: 'approved' } }));
    const service = serviceFor(resourceSession(), { creativeDirection, approveCreativeDirection });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Atelier' })).toBeInTheDocument();
    expect(screen.getByText(/Compatible alternatives:/).parentElement).toHaveTextContent('Maison, Essential');
    expect(screen.getByText('Editorial Serif Led')).toBeInTheDocument();
    expect(screen.getByText('Minimal')).toBeInTheDocument();
    expect(screen.queryByText(/score|runtime|schema|checksum/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Use this direction' }));
    expect(approveCreativeDirection).toHaveBeenCalledWith('rcr_current', 'dna_current');
  });

  it('starts staging generation only from the explicit revision-bound action', async () => {
    const createCustomThemeOrder = vi.fn(async () => ({ order: { id: 'cto_staging', payment_status: 'pending' } }));
    const service = serviceFor({ ...resourceSession(), stage: 'offer' }, {
      createCustomThemeOrder,
      customTheme: {
        eligibility: { eligible: true, readiness_token: 'c'.repeat(64), blocked: [] },
        payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' },
        order: null
      }
    });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Generate theme in staging — no Shopify charge' })).toBeEnabled();
    expect(createCustomThemeOrder).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Generate theme in staging — no Shopify charge' }));
    expect(createCustomThemeOrder).toHaveBeenCalledTimes(1);
    expect(createCustomThemeOrder.mock.calls[0][0]).toMatch(/^quick-start-/);
    expect(createCustomThemeOrder.mock.calls[0][1]).toBe('c'.repeat(64));
    expect(service.respond).not.toHaveBeenCalled();
  });

  it('starts and freezes the beta merchant flow before creating a paid generation order', async () => {
    const createCustomThemeOrder = vi.fn(async () => ({ order: { id: 'cto_beta', payment_status: 'pending' } }));
    const service = serviceFor({ ...resourceSession(), stage: 'offer' }, {
      merchantFlowBetaEnabled: true,
      createCustomThemeOrder,
      customTheme: {
        eligibility: { eligible: true, readiness_token: 'e'.repeat(64), blocked: [] },
        payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' },
        order: null
      }
    });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Generate theme in staging — no Shopify charge' }));
    expect(service.startMerchantGenerationFlow).toHaveBeenCalledTimes(1);
    expect(createCustomThemeOrder).toHaveBeenCalledTimes(1);
    expect(service.startMerchantGenerationFlow.mock.invocationCallOrder[0]).toBeLessThan(createCustomThemeOrder.mock.invocationCallOrder[0]);
  });

  it('confirms the explicit staging no-charge authorization without creating a second order', async () => {
    const confirmDevelopmentCustomThemePayment = vi.fn(async () => ({ order: { id: 'cto_staging', payment_status: 'paid', generation_status: 'ready' } }));
    const service = serviceFor({ ...resourceSession(), stage: 'offer' }, {
      confirmDevelopmentCustomThemePayment,
      customTheme: {
        eligibility: { eligible: true, readiness_token: 'd'.repeat(64), blocked: [] },
        payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' },
        order: { id: 'cto_staging', payment_status: 'pending', generation_status: 'not_started', artifacts: {} }
      }
    });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Authorize staging generation — no Shopify charge' }));
    expect(confirmDevelopmentCustomThemePayment).toHaveBeenCalledTimes(1);
    expect(confirmDevelopmentCustomThemePayment.mock.calls[0][0]).toBe('cto_staging');
    expect(confirmDevelopmentCustomThemePayment.mock.calls[0][1]).toMatch(/^quick-start-/);
    expect(service.createCustomThemeOrder).not.toHaveBeenCalled();
  });

  it('reloads authoritative delivery state after a rejected artifact download', async () => {
    const downloadCustomThemeArtifact = vi.fn(async () => null);
    const service = serviceFor({ ...resourceSession(), stage: 'resources' }, {
      downloadCustomThemeArtifact,
      customTheme: {
        payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' },
        order: { id: 'cto_staging', payment_status: 'paid', generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: true } }
      }
    });
    const user = userEvent.setup();
    render(<CreativeDirectorApp service={service} dashboard={{}} navigate={vi.fn()} onExit={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: 'Download theme' }));
    expect(downloadCustomThemeArtifact).toHaveBeenCalledWith('cto_staging', 'theme-zip');
    expect(service.load).toHaveBeenCalledTimes(2);
  });
});
