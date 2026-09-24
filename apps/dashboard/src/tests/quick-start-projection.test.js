import { describe, expect, it } from 'vitest';
import { buildQuickStartProjection } from '../lib/quick-start-projection';

function dataAt(stage, overrides = {}) {
  return {
    project: { id: 'prj_quick', name: 'LEGACY_EXAMPLE' },
    session: {
      id: 'cds_quick',
      project_id: 'prj_quick',
      stage,
      transcript: [{ id: 'msg_1', role: 'calinium', content: 'What do you sell?' }],
      review: {},
      resource_plan: {},
      generation_context: {},
      ...overrides.session
    },
    custom_theme: overrides.custom_theme || null,
    recommended_resource_set: overrides.recommended_resource_set || null,
    creative_direction: overrides.creative_direction || null
  };
}

describe('Quick Start canonical projection', () => {
  it('uses truthful Thinking, Provisional, Approved, and Generated states', () => {
    expect(buildQuickStartProjection(dataAt('conversation')).preview.state).toBe('thinking');
    expect(buildQuickStartProjection(dataAt('strategy', { session: { creative_brief: { business: {} } } })).preview.state).toBe('provisional');
    expect(buildQuickStartProjection(dataAt('resources', { session: { preset_selection: { status: 'approved', approved_revision_id: 'apr_1', selected_preset_id: 'atelier' } } })).preview.state).toBe('approved');
    expect(buildQuickStartProjection(dataAt('delivery', { custom_theme: { order: { generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: { id: 'artifact_1' } } } } })).preview.state).toBe('generated');
  });

  it('never calls an untrusted delivery record Generated', () => {
    const result = buildQuickStartProjection(dataAt('delivery', { custom_theme: { order: { generation_status: 'ready', validation_result: { valid: true }, artifacts: {} } } }));
    expect(result.preview.state).not.toBe('generated');
    expect(result.decisions[0].title).toBe('Review theme delivery');
    expect(buildQuickStartProjection(dataAt('delivery', { custom_theme: { order: { generation_status: 'ready', artifacts: { theme_zip: true } } } })).preview.state).not.toBe('generated');
  });

  it('withholds generated preview and download until the merchant flow is preview_ready', () => {
    const data = dataAt('delivery', { custom_theme: { order: { id: 'cto_beta', payment_status: 'paid', generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: true } } } });
    data.merchant_flow_beta_enabled = true;
    data.merchant_flow = { flow: { state: 'render_qa_running', preview_ready: false, merchant_status: { code: 'reviewing_result', label: 'Reviewing the result' } } };
    const reviewing = buildQuickStartProjection(data);
    expect(reviewing.preview.state).not.toBe('generated');
    expect(reviewing.decisions.some((entry) => entry.action?.kind === 'download_theme')).toBe(false);
    data.merchant_flow.flow = { state: 'preview_ready', preview_ready: true, merchant_status: { code: 'ready_to_preview', label: 'Ready to preview' } };
    const ready = buildQuickStartProjection(data);
    expect(ready.preview.state).toBe('generated');
    expect(ready.decisions[0].action.kind).toBe('download_theme');
  });

  it('derives the LEGACY_EXAMPLE resources review from the approved canonical direction', () => {
    const result = buildQuickStartProjection(dataAt('resources', {
      session: {
        preset_selection: { status: 'approved', approved_revision_id: 'apr_1', selected_preset_id: 'atelier' },
        resource_plan: { fields: [{ id: 'hero', required: true }], required_assets: [], required_confirmations: [] },
        generation_context: { merchant_references: { hero: 'asset_hero' }, shopify_resource_references: {}, asset_references: {} }
      }
    }));
    expect(result.summary).toMatchObject({ preset: 'Atelier', presetApproved: true, selectedResources: 1, pendingDecisions: 1 });
    expect(result.decisions[0]).toMatchObject({ type: 'resource_review', action: { kind: 'open_advanced' } });
    expect(result.conversation.replyAllowed).toBe(false);
  });

  it('projects the Recommended Resource Set as one bulk review without exposing internal fields', () => {
    const data = dataAt('resources', { session: { preset_selection: { status: 'approved', approved_revision_id: 'apr_1', selected_preset_id: 'atelier' } } });
    data.recommended_resource_set = {
      status: 'recommended', revision_id: 'rrs_1', approvable: true,
      summary: { recommended: 6, omitted: 2, needs_individual_review: 1 },
      slots: [{ slot_id: 'logo', label: 'Logo', recommendation: { selection_id: 'opaque_1', name: 'LEGACY_EXAMPLE wordmark' }, alternatives: [], confidence: 'High', reason: 'Previously approved.', fallback: 'Use text.', required: false, stale: false }],
      exceptions: [{ slot_id: 'hero_destination', label: 'Hero destination', reason: 'Review individually.' }]
    };
    const projection = buildQuickStartProjection(data);
    expect(projection.decisions).toHaveLength(1);
    expect(projection.decisions[0]).toMatchObject({ type: 'resource_review', action: { kind: 'approve_resource_set', revisionId: 'rrs_1' } });
    expect(projection.conversation.replyAllowed).toBe(true);
    expect(projection.summary.selectedResources).toBe(6);
  });

  it('projects the canonical creative direction, bounded alternatives, DNA summary, and exact approval action', () => {
    const result = buildQuickStartProjection(dataAt('resources', {
      session: { preset_selection: { status: 'approved', approved_revision_id: 'apr_1', selected_preset_id: 'atelier' } },
      creative_direction: {
        status: 'recommended', revision_id: 'rcr_1', approvable: true, preview_readiness: 'provisional',
        primary: { name: 'Atelier', preset_id: 'atelier', reasons: ['Your focused catalog and strong imagery support a restrained product story.'] },
        alternatives: [{ name: 'Maison', preset_id: 'maison' }, { name: 'Essential', preset_id: 'essential' }],
        design_dna: { revision_id: 'dna_1', summary: { typography: 'editorial-serif-led', spacing: 'luxury', motion: 'minimal', commerce_balance: 'balanced' } }
      }
    }));
    expect(result.preview.state).toBe('provisional');
    expect(result.creativeDirection).toEqual({
      name: 'Atelier', reason: 'Your focused catalog and strong imagery support a restrained product story.', alternatives: ['Maison', 'Essential'], status: 'recommended',
      dna: { typography: 'editorial-serif-led', spacing: 'luxury', motion: 'minimal', commerce_balance: 'balanced' }
    });
    expect(result.decisions[0]).toMatchObject({
      id: 'creative-direction-approval', action: { kind: 'approve_creative_direction', recommendationRevisionId: 'rcr_1', designDnaRevisionId: 'dna_1' }
    });
    expect(JSON.stringify(result)).not.toContain('score');
  });

  it.each([
    ['conversation', 'answer_required'],
    ['understanding', 'direction_review'],
    ['blueprint', 'direction_review'],
    ['offer', 'generation_readiness'],
    ['delivery', 'delivery']
  ])('projects %s into its current review responsibility', (stage, expectedType) => {
    const result = buildQuickStartProjection(dataAt(stage));
    expect(result.decisions[0].type).toBe(expectedType);
  });

  it('never asks for a nonexistent current question in the dedicated-staging actionless shape', () => {
    const result = buildQuickStartProjection(dataAt('conversation', {
      session: {
        conversation_state: {
          currentQuestionId: null,
          missingCriticalFacts: ['productsOrServices', 'targetAudience', 'primaryGoal'],
          readyForCreativeBrief: false
        }
      }
    }));
    expect(result.conversation.replyAllowed).toBe(false);
    expect(result.conversation.liveness.status).toBe('invalid_actionless_state');
    expect(result.decisions[0]).toMatchObject({
      type: 'conversation_recovery',
      action: { kind: 'open_advanced', label: 'Open Advanced' }
    });
    expect(result.decisions[0].description).not.toMatch(/answer the current question/i);
  });

  it('names the real bound prompt and advances ready conversations truthfully', () => {
    const activeData = dataAt('conversation', {
      session: {
        conversation_state: { currentQuestionId: 'products', missingCriticalFacts: ['productsOrServices'], readyForCreativeBrief: false }
      }
    });
    activeData.conversation_liveness = {
      policy_version: 'creative-director-conversation-liveness-v1',
      status: 'question_required',
      current_question: { question_id: 'products', prompt: 'What do you sell?' }
    };
    const active = buildQuickStartProjection(activeData);
    expect(active.decisions[0].description).toBe('Answer the active question: What do you sell?');
    expect(active.conversation.replyAllowed).toBe(true);

    const ready = buildQuickStartProjection(dataAt('conversation', {
      session: { conversation_state: { currentQuestionId: null, missingCriticalFacts: [], readyForCreativeBrief: true } }
    }));
    expect(ready.decisions[0]).toMatchObject({ action: { kind: 'prepare_understanding' } });
    expect(ready.conversation.replyAllowed).toBe(false);
  });

  it('shows real generation status without manufacturing a decision or percentage', () => {
    const result = buildQuickStartProjection(dataAt('offer', { custom_theme: { order: { generation_status: 'validating', artifacts: {} } } }));
    expect(result.lifecycle.status.label).toBe('Generating your theme');
    expect(result.decisions).toEqual([]);
  });

  it('requires an explicit revision-bound Generate action and labels staging as no-charge', () => {
    const result = buildQuickStartProjection(dataAt('offer', {
      custom_theme: {
        eligibility: { eligible: true, readiness_token: 'a'.repeat(64), blocked: [] },
        payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' },
        order: null
      }
    }));
    expect(result.decisions).toEqual([expect.objectContaining({
      type: 'generation_readiness',
      action: { kind: 'start_generation', label: 'Generate theme in staging — no Shopify charge', readinessToken: 'a'.repeat(64) }
    })]);
    expect(result.generation).toMatchObject({ staging: true, paymentStatus: 'not_started', generationStatus: 'not_started' });
  });

  it('projects the real commercial, recovery, and secure delivery actions without treating them as conversation', () => {
    const pending = buildQuickStartProjection(dataAt('offer', {
      custom_theme: { payment: { staging: true, label: 'LEGACY_EXAMPLE staging validation — no Shopify charge' }, order: { id: 'cto_1', payment_status: 'pending', generation_status: 'not_started', artifacts: {} } }
    }));
    expect(pending.decisions[0]).toMatchObject({ type: 'generation_consent', action: { kind: 'confirm_generation_payment', orderId: 'cto_1' } });

    const failed = buildQuickStartProjection(dataAt('generation', {
      custom_theme: { order: { id: 'cto_1', payment_status: 'paid', generation_status: 'generation_failed', failure_reason: 'Generation could not complete.', artifacts: {} } }
    }));
    expect(failed.decisions[0]).toMatchObject({ type: 'generation_recovery', action: { kind: 'retry_generation', orderId: 'cto_1' } });

    const ready = buildQuickStartProjection(dataAt('delivery', {
      custom_theme: { order: { id: 'cto_1', payment_status: 'paid', generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: true } } }
    }));
    expect(ready.decisions[0]).toMatchObject({ type: 'delivery', action: { kind: 'download_theme', orderId: 'cto_1' } });
    expect(ready.preview.state).toBe('generated');
  });

  it('keeps post-delivery conversation available only for canonical successor refinement', () => {
    const result = buildQuickStartProjection(dataAt('delivery', {
      session: { preset_selection: { status: 'approved', approved_revision_id: 'apr_1', selected_preset_id: 'atelier' } },
      creative_direction: { revision_id: 'rec_current', primary: { name: 'Atelier', preset_id: 'atelier' } },
      custom_theme: { order: { id: 'cto_1', payment_status: 'paid', generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: true } } }
    }));
    expect(result.conversation.replyAllowed).toBe(true);
    expect(result.decisions[0].action.kind).toBe('download_theme');
  });

  it('keeps historical delivery and recovery visible during successor resource refinement', () => {
    const delivered = buildQuickStartProjection(dataAt('resources', {
      custom_theme: { order: { id: 'cto_historical', payment_status: 'paid', generation_status: 'ready', validation_result: { valid: true }, artifacts: { theme_zip: true } } }
    }));
    expect(delivered.decisions[0]).toMatchObject({ type: 'delivery', action: { kind: 'download_theme', orderId: 'cto_historical' } });

    const recovery = buildQuickStartProjection(dataAt('resources', {
      custom_theme: { order: { id: 'cto_historical', payment_status: 'paid', generation_status: 'validation_failed', artifacts: { theme_zip: true } } }
    }));
    expect(recovery.decisions[0]).toMatchObject({ type: 'generation_recovery', action: { kind: 'retry_generation', orderId: 'cto_historical' } });
  });
});
