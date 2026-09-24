import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardApp } from '../app/DashboardApp';
import { isLaunchPreviewPath } from '../app/launch-preview-route';
import { LaunchPreviewPage } from '../components/marketing/LaunchPreviewPage';

const originalPath = `${window.location.pathname}${window.location.search}`;

afterEach(() => {
  window.history.replaceState({}, '', originalPath || '/');
});

describe('Calinium launch-preview release candidate', () => {
  it('matches only the dedicated public preview route', () => {
    expect(isLaunchPreviewPath('/launch-preview')).toBe(true);
    expect(isLaunchPreviewPath('/launch-preview/')).toBe(true);
    expect(isLaunchPreviewPath('/')).toBe(false);
    expect(isLaunchPreviewPath('/projects/prj_example/design')).toBe(false);
    expect(isLaunchPreviewPath('/launch-preview/extra')).toBe(false);
  });

  it('renders before auth bootstrap and exposes no account or collection form', async () => {
    const dashboard = { isEmbedded: vi.fn(), bootstrap: vi.fn() };
    const view = render(<LaunchPreviewPage />);

    expect(await screen.findByRole('heading', { level: 1, name: /Your storefront should begin with your business/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('navigation', { name: 'Launch preview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /See how it works/i })).toHaveAttribute('href', '#how-it-works');
    expect(view.container.querySelector('#how-it-works')).toBeInTheDocument();
    expect(screen.getByText(/Founder-controlled technical testing/i)).toBeInTheDocument();
    expect(screen.queryByText(/private beta/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#launch-main');
    expect(view.container.querySelector('form')).toBeNull();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(dashboard.isEmbedded).not.toHaveBeenCalled();
    expect(dashboard.bootstrap).not.toHaveBeenCalled();
  });

  it('states the actual availability and product safety boundaries', async () => {
    render(<LaunchPreviewPage />);

    expect(await screen.findByText('Enrollment is currently unavailable.')).toBeInTheDocument();
    expect(screen.getByText(/separate public Calinium app still requires release preparation and Shopify review/i)).toBeInTheDocument();
    expect(screen.getByText(/does not collect interest, create an account, or offer a purchase/i)).toBeInTheDocument();
    expect(screen.getByText(/never grants permission to publish or replace a live theme/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Clear boundaries, in plain language/i })).toBeInTheDocument();
    expect(screen.getByText(/Public pricing has not been set/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified contact and policy links will be added before publication/i)).toBeInTheDocument();
    expect(document.querySelectorAll('#faq dl > div')).toHaveLength(6);
  });

  it('labels owned development imagery without presenting it as public-release evidence', async () => {
    render(<LaunchPreviewPage />);

    expect(await screen.findByRole('img', { name: /recommended Gallery storefront visual system/i })).toHaveAttribute('src', expect.stringContaining('beta-gallery-preset-desktop'));
    expect(screen.getByRole('img', { name: /mobile conversation beginning/i })).toHaveAttribute('src', expect.stringContaining('beta-creative-director-mobile'));
    expect(screen.getByText(/Calinium product-development captures/i)).toBeInTheDocument();
    expect(screen.getByText(/Interface details may change before public release/i)).toBeInTheDocument();
  });

  it('leaves authenticated DashboardApp behavior unchanged', async () => {
    window.history.replaceState({}, '', '/');
    const service = { load: vi.fn(async () => ({ current: null, next_question: null, dimensions: [], completion: { answered: 0, total: 0, percentage: 0 } })) };
    render(<DashboardApp service={service} />);
    expect(await screen.findByText(/Loading your interview/i)).toBeInTheDocument();
  });
});
