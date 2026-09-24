import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontPreview } from '../components/creative-director/StorefrontPreview';
import { QuickStartPreviewHost } from '../components/creative-director/QuickStartShell';

function preview(overrides = {}) {
  return {
    state: 'provisional', qualifier: 'current', label: 'Provisional', revision_id: 'lpr_one', sequence: 1,
    title: 'Atelier homepage', description: 'A truthful homepage preview.', limitation: 'Provisional work can change and is not approved or generated.',
    changed_regions: ['header', 'hero', 'featured_collection', 'newsletter', 'footer'], unchanged_regions: [], error: null,
    model: {
      state: 'provisional', identity: 'LEGACY_EXAMPLE', page: 'homepage', preset: { id: 'atelier', name: 'Atelier', homepage_recipe: 'luxury_story' },
      tokens: { typography: 'editorial_serif', spacing: 'luxury', motion: 'minimal', color: 'warm', hero: 'immersive', commerce: 'balanced', layout: 'media_first', grid: 'restrained', hierarchy: 'product_story_balanced', media: 'detail_led', image_treatment: 'portrait_editorial', shape_surface: 'restrained_flat', editorial_density: 'balanced', section_rhythm: 'story_to_product', responsive: 'reorder_with_semantic_integrity' },
      header: { identity: 'LEGACY_EXAMPLE', logo: null, navigation: [{ label: 'Shop' }, { label: 'Our story' }] },
      sections: [
        { type: 'hero', heading: 'The Cognac', action_label: 'View The Cognac', image: { url: 'https://cdn.example/black-bag.jpg', alt: 'Black leather travel bag', decorative: false } },
        { type: 'featured_collection', heading: 'The Atlas', image: null, product: null },
        { type: 'newsletter', heading: 'Email updates', submission_enabled: false }
      ],
      footer: { identity: 'LEGACY_EXAMPLE', navigation: [{ label: 'Shop' }] }, omissions: [{ section: 'craftsmanship', reason: 'Craftsmanship is omitted until its factual evidence is approved.' }], generated_binding: null
    },
    ...overrides
  };
}

describe('Storefront Preview', () => {
  it('renders canonical merchant resources without fabricated commerce or evidence', () => {
    const { container } = render(<StorefrontPreview preview={preview()} device="desktop" />);
    expect(screen.getByRole('article', { name: 'Provisional homepage Preview for LEGACY_EXAMPLE' })).toHaveAttribute('data-preview-state', 'provisional');
    expect(screen.getByRole('article', { name: 'Provisional homepage Preview for LEGACY_EXAMPLE' })).toHaveAttribute('data-preview-layout', 'media_first');
    expect(screen.getByRole('heading', { name: 'The Cognac' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The Atlas' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Black leather travel bag' })).toHaveAttribute('src', 'https://cdn.example/black-bag.jpg');
    expect(screen.getByText('LEGACY_EXAMPLE', { selector: '.storefront-preview__identity strong' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/testimonial|customer reviews|five-star|award|certification|discount|scarcity/i);
    expect(container.querySelector('[data-preview-region="craftsmanship"]')).not.toBeInTheDocument();
  });

  it('isolates navigation and newsletter controls from merchant systems', () => {
    const { container } = render(<StorefrontPreview preview={preview()} device="desktop" />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Email address — disabled in Preview' })).toBeDisabled();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('preserves unchanged region identities across a hero-only canonical revision', () => {
    const initial = preview();
    const { container, rerender } = render(<StorefrontPreview preview={initial} device="desktop" />);
    expect(container.querySelector('[data-preview-region="header"]')).toHaveAttribute('data-preview-region-revision', 'lpr_one');
    expect(container.querySelector('[data-preview-region="hero"]')).toHaveAttribute('data-preview-region-revision', 'lpr_one');
    const revised = preview({
      revision_id: 'lpr_two', sequence: 2, changed_regions: ['hero'], unchanged_regions: ['header', 'featured_collection', 'newsletter', 'footer'],
      model: { ...initial.model, sections: initial.model.sections.map((section) => section.type === 'hero' ? { ...section, heading: 'The Onyx', action_label: 'View The Onyx' } : section) }
    });
    rerender(<StorefrontPreview preview={revised} device="desktop" />);
    expect(container.querySelector('[data-preview-region="header"]')).toHaveAttribute('data-preview-region-revision', 'lpr_one');
    expect(container.querySelector('[data-preview-region="hero"]')).toHaveAttribute('data-preview-region-revision', 'lpr_two');
    expect(container.querySelector('[data-preview-region="featured_collection"]')).toHaveAttribute('data-preview-region-revision', 'lpr_one');
    expect(screen.getByRole('heading', { name: 'The Onyx' })).toBeInTheDocument();
  });

  it('uses a real mobile composition without changing canonical Preview identity', () => {
    const { container, rerender } = render(<StorefrontPreview preview={preview()} device="desktop" />);
    expect(container.firstChild).toHaveClass('storefront-preview--desktop');
    rerender(<StorefrontPreview preview={preview()} device="mobile" />);
    expect(container.firstChild).toHaveClass('storefront-preview--mobile');
    expect(container.firstChild).toHaveAttribute('data-preview-revision', 'lpr_one');
    expect(screen.getByRole('heading', { name: 'The Cognac' })).toBeInTheDocument();
  });

  it('labels last-stable failure and exposes an explicit retry', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const failed = preview({ qualifier: 'failed', error: { code: 'preview_refresh_failed', message: "I couldn't refresh the preview just now. Your design decisions are saved." } });
    render(<QuickStartPreviewHost preview={failed} device="desktop" onDeviceChange={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your design decisions are saved');
    expect(screen.getByText(/Provisional work can change/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry Preview' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
