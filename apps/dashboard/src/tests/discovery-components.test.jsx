import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuestionRenderer } from '../components/interview/QuestionRenderer';

const assetService = { uploadAsset: vi.fn(), extractAssetPalette: vi.fn(), assetDownloadUrl: vi.fn(() => '/asset') };
const base = { id: 'test_question', title: 'Test question', description: 'Test', required: false, validation: {}, options: [], dependencies: [], follow_up_question_ids: [], mapping_destination: null, ui: null };

describe('Discovery answer renderers', () => {
  it('renders a catalog-defined manual palette with textual contrast feedback', () => {
    render(<QuestionRenderer question={{ ...base, answer_type: 'color_palette', ui: { component: 'color_palette', palette_mode: 'manual' } }} answer={null} answers={{}} assetService={assetService} onDraftChange={vi.fn()} onCommit={vi.fn()} />);
    expect(screen.getByText('Text on background')).toBeInTheDocument();
    expect(screen.getAllByText(/Acceptable|Caution|Fails AA guidance/).length).toBeGreaterThan(0);
  });

  it('renders a catalog-defined reference list and supports keyboard addition', async () => {
    const onCommit = vi.fn(); const user = userEvent.setup();
    render(<QuestionRenderer question={{ ...base, answer_type: 'reference_list', validation: { max_items: 3 }, ui: { component: 'reference_list', reference_kind: 'inspiration' } }} answer={[]} answers={{}} assetService={assetService} onDraftChange={vi.fn()} onCommit={onCommit} />);
    await user.click(screen.getByRole('button', { name: 'Add reference' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(onCommit).toHaveBeenCalled();
  });

  it('keeps single-choice Discovery controls operable with arrow keys', async () => {
    const onCommit = vi.fn(); const user = userEvent.setup();
    const question = { ...base, answer_type: 'single_choice', options: [{ value: 'idea', label: 'Idea' }, { value: 'preparing_to_launch', label: 'Preparing to launch' }] };
    render(<QuestionRenderer question={question} answer={null} answers={{}} assetService={assetService} onDraftChange={vi.fn()} onCommit={onCommit} />);
    const idea = screen.getByRole('radio', { name: 'Idea' });
    await user.click(idea);
    idea.focus();
    await user.keyboard('{ArrowDown}');
    expect(onCommit).toHaveBeenLastCalledWith('test_question', 'preparing_to_launch');
  });
});
