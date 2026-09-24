import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DashboardApp } from '../app/DashboardApp';

const catalog = {
  categories: [{ id: 'business', title: 'Business', description: 'Tell us about the business.', order: 1 }],
  questions: [{ id: 'business_brand_name', category_id: 'business', title: 'What is the brand name?', description: 'Use the name customers should see.', answer_type: 'text', required: true, validation: { min_length: 1 }, options: [], dependencies: [], follow_up_question_ids: [], mapping_destination: 'business.name' }]
};
function makeSession(answers = {}) { return { version: 1, session_id: 'merchant-interview-ui-test', status: 'in_progress', updated_at: '2026-07-21T09:00:00.000Z', answers, visible_question_ids: ['business_brand_name'] }; }
function createService({ stored = null } = {}) {
  let persisted = stored;
  const service = {
    load: vi.fn(async () => ({ catalog })),
    savedSession: vi.fn(() => persisted),
    persist: vi.fn((session, activeCategoryId) => { persisted = { session, activeCategoryId }; }),
    clearPersisted: vi.fn(() => { persisted = null; }),
    create: vi.fn(async () => ({ session: makeSession() })),
    inspect: vi.fn(async (answers) => ({ answer_validation: { errors: answers.business_brand_name ? [] : ['business_brand_name is required.'] } })),
    save: vi.fn(async (session, patch) => ({ session: { ...session, updated_at: '2026-07-21T09:01:00.000Z', answers: { ...session.answers, ...patch } }, inactive_answers_removed: [] })),
    validate: vi.fn(async (answers, complete) => ({ valid: !complete || Boolean(answers.business_brand_name), errors: answers.business_brand_name ? [] : ['business_brand_name is required.'] })),
    preview: vi.fn(async (session) => ({ profile: { business: { name: session.answers.business_brand_name }, industry: 'fashion', audience: { primary: 'Customers' }, preferences: { design_languages: ['editorial'] }, goals: { primary: ['brand_awareness'] } }, summary: { categories: [{ id: 'business', title: 'Business', items: [{ question_id: 'business_brand_name', label: 'What is the brand name?', value: session.answers.business_brand_name }] }] } })),
    complete: vi.fn(async (session) => ({ session: { ...session, status: 'completed', merchant_profile: { business: { name: session.answers.business_brand_name } } }, profile: { business: { name: session.answers.business_brand_name } }, summary: { categories: [] }, mappings: [] })),
    resume: vi.fn(async (session) => ({ session })),
    abandon: vi.fn(async (session) => ({ session: { ...session, status: 'abandoned' } }))
  };
  return service;
}

describe('DashboardApp', () => {
  it('does not advance past a required unanswered catalog question', async () => {
    const service = createService();
    const user = userEvent.setup();
    render(<DashboardApp service={service} />);
    await user.click(await screen.findByRole('button', { name: 'Start interview' }));
    await user.click(screen.getByRole('button', { name: 'Review your answers' }));
    expect(await screen.findByText('Complete the required answers in this step before continuing.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Review your store brief' })).not.toBeInTheDocument();
  });

  it('renders the catalog-driven interview, autosaves, validates, summarizes, and creates a Merchant Profile', async () => {
    const service = createService();
    const user = userEvent.setup();
    render(<DashboardApp service={service} />);
    await user.click(await screen.findByRole('button', { name: 'Start interview' }));
    const input = await screen.findByRole('textbox', { name: 'What is the brand name?' });
    await user.type(input, 'Calinium Atelier');
    await user.tab();
    await waitFor(() => expect(service.save).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Review your answers' }));
    expect(await screen.findByRole('heading', { name: 'Review your store brief' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm and create Merchant Profile' }));
    expect(screen.getByRole('dialog', { name: 'Create Merchant Profile?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create Merchant Profile' }));
    expect(await screen.findByRole('heading', { name: 'Your Merchant Profile is ready' })).toBeInTheDocument();
    expect(service.complete).toHaveBeenCalledTimes(1);
  });

  it('offers a saved session for resume and keeps the resume control keyboard reachable', async () => {
    const service = createService({ stored: { session: makeSession({ business_brand_name: 'Saved brand' }), activeCategoryId: 'business' } });
    const user = userEvent.setup();
    render(<DashboardApp service={service} />);
    const resume = await screen.findByRole('button', { name: 'Resume saved interview' });
    for (let index = 0; index < 3 && document.activeElement !== resume; index += 1) await user.tab();
    expect(resume).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(service.resume).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('heading', { name: 'Tell us about the business.' })).toBeInTheDocument();
  });
});
