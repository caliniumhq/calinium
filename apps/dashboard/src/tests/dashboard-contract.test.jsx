import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QuestionRenderer } from '../components/interview/QuestionRenderer';

describe('dashboard UI contracts', () => {
  it('renders accessible native controls for catalog answer types', () => {
    const question = { id: 'design_style', title: 'Which style fits?', answer_type: 'multiple_choice', options: [{ value: 'editorial', label: 'Editorial' }], validation: {} };
    render(<QuestionRenderer question={question} answer={[]} onDraftChange={() => {}} onCommit={() => {}} />);
    expect(screen.getByRole('checkbox', { name: 'Editorial' })).toBeInTheDocument();
  });

  it('supports every answer type declared by the existing merchant interview schema', () => {
    const types = ['text', 'textarea', 'number', 'currency', 'boolean', 'multiple_choice', 'single_choice', 'tags', 'url', 'email', 'upload_placeholder', 'color', 'image_placeholder'];
    const answers = { text: '', textarea: '', number: '', currency: '', boolean: false, multiple_choice: [], single_choice: '', tags: [], url: '', email: '', upload_placeholder: '', color: '', image_placeholder: '' };
    for (const answerType of types) {
      const question = { id: `question_${answerType}`, title: `Question ${answerType}`, answer_type: answerType, options: answerType.includes('choice') ? [{ value: 'value', label: 'Value' }] : [], validation: {} };
      const view = render(<QuestionRenderer question={question} answer={answers[answerType]} onDraftChange={() => {}} onCommit={() => {}} />);
      expect(view.container.firstChild).not.toBeNull();
      view.unmount();
    }
  });

  it('defines mobile layout and reduced-motion fallbacks in the dashboard stylesheet', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/styles/dashboard.css'), 'utf8');
    expect(css).toContain('@media (max-width: 720px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('min-height: 44px');
  });
});
