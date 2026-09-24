import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardApp, embeddedProjectId, embeddedRouteProjectId } from '../app/DashboardApp';

describe('embedded Shopify dashboard entry', () => {
  it('accepts only a Calinium project identifier supplied by the embedded callback', () => {
    expect(embeddedProjectId('?project=prj_1234-5678&shopify=connected')).toBe('prj_1234-5678');
    expect(embeddedProjectId('?project=../../settings')).toBeNull();
    expect(embeddedProjectId('?project=')).toBeNull();
    expect(embeddedRouteProjectId('/projects/prj_1234-5678/design')).toBe('prj_1234-5678');
    expect(embeddedRouteProjectId('/projects/../../settings')).toBeNull();
  });

  it('opens the Creative Director landing view without rendering the password sign-in screen', async () => {
    const dashboard = {
      isEmbedded: () => true,
      bootstrap: vi.fn(async () => ({
        user: { id: 'usr_embedded', full_name: 'Shopify merchant', email: 'hidden@embedded.calinium.invalid' },
        organizations: [{ organization: { id: 'org_embedded', name: 'Fixture Store' }, role: 'owner' }],
        embedded: true
      })),
      overview: vi.fn(async () => ({ projects: [], profiles: [], interviews: [], activity: [] }))
    };
    render(<DashboardApp dashboardService={dashboard} />);
    expect(await screen.findByRole('heading', { name: 'A storefront designed around your business.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Designing' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(dashboard.bootstrap).toHaveBeenCalledTimes(1);
  });

  it('uses a client project only as a bootstrap hint and navigates with the server-authorized entry path', async () => {
    window.history.replaceState({}, '', '/?embedded=1&project=prj_client-hint');
    const dashboard = {
      client: { creativeDirector: vi.fn(() => new Promise(() => {})) },
      isEmbedded: () => true,
      overview: vi.fn(async () => ({ projects: [], profiles: [], interviews: [], activity: [] })),
      bootstrap: vi.fn(async (projectId) => ({
        user: { id: 'usr_embedded', full_name: 'Shopify merchant' },
        organizations: [{ organization: { id: 'org_embedded', name: 'Fixture Store' }, role: 'owner' }],
        embedded: true,
        project: { id: 'prj_server-authorized' },
        project_status: 'resumed',
        entry_path: '/projects/prj_server-authorized/design'
      }))
    };
    const view = render(<DashboardApp dashboardService={dashboard} />);
    await waitFor(() => expect(window.location.pathname).toBe('/projects/prj_server-authorized/design'));
    expect(dashboard.bootstrap).toHaveBeenCalledWith('prj_client-hint');
    expect(window.location.pathname).not.toContain('client-hint');
    view.unmount();
    window.history.replaceState({}, '', '/');
  });

  it('lands an authorized embedded project in Quick Start using the server-selected project', async () => {
    window.history.replaceState({}, '', '/?embedded=1&project=prj_client-hint');
    const creativeDirector = vi.fn(async (projectId) => ({
      project: { id: projectId, name: 'LEGACY_EXAMPLE' },
      assets: [],
      session: {
        id: 'cds_existing', project_id: projectId, stage: 'resources', transcript: [],
        review: {}, content_plan: {},
        preset_selection: { status: 'approved', approved_revision_id: 'apr_preset', selected_preset_id: 'atelier' },
        resource_plan: { fields: [], required_assets: [], required_confirmations: [] },
        generation_context: {}
      }
    }));
    const merchantGenerationFlowOperatorReadiness = vi.fn(async () => ({
      http_status: 200, status: 'READY', readiness_revision: 'merchant-flow-controlled-beta-readiness-v1',
      beta_source_version: '9'.repeat(40), beta_feature_flag_status: 'enabled', components: {}
    }));
    const dashboard = {
      client: { creativeDirector, merchantGenerationFlowOperatorReadiness },
      isEmbedded: () => true,
      overview: vi.fn(async () => ({ projects: [], profiles: [], interviews: [], activity: [] })),
      bootstrap: vi.fn(async () => ({
        user: { id: 'usr_embedded', full_name: 'Shopify merchant' },
        organizations: [{ organization: { id: 'org_embedded', name: 'Fixture Store' }, role: 'owner' }],
        embedded: true,
        operator_diagnostics_available: true,
        project: { id: 'prj_server-authorized' },
        project_status: 'resumed',
        entry_path: '/projects/prj_server-authorized/design'
      }))
    };
    const view = render(<DashboardApp dashboardService={dashboard} />);
    expect(await screen.findByRole('heading', { name: 'Storefront direction' })).toBeInTheDocument();
    expect(screen.getByText('LEGACY_EXAMPLE')).toBeInTheDocument();
    expect(creativeDirector).toHaveBeenCalledWith('prj_server-authorized');
    expect(creativeDirector).not.toHaveBeenCalledWith('prj_client-hint');
    fireEvent.click(screen.getByRole('button', { name: 'System readiness' }));
    expect(await screen.findByRole('region', { name: 'System readiness result' })).toHaveTextContent('HTTP 200');
    expect(merchantGenerationFlowOperatorReadiness).toHaveBeenCalledWith('prj_server-authorized');
    view.unmount();
    window.history.replaceState({}, '', '/');
  });

  it('uses the existing project list as an authenticated selection surface when bootstrap is ambiguous', async () => {
    window.history.replaceState({}, '', '/');
    const account = {
      user: { id: 'usr_embedded', full_name: 'Shopify merchant' },
      organizations: [{ organization: { id: 'org_embedded', name: 'Fixture Store' }, role: 'owner' }],
      embedded: true
    };
    const dashboard = {
      client: { creativeDirector: vi.fn(() => new Promise(() => {})) },
      isEmbedded: () => true,
      overview: vi.fn(async () => ({
        organization: account.organizations[0].organization,
        projects: [{ id: 'prj_existing', name: 'Existing project', business_name: 'Existing business' }],
        profiles: [], interviews: [], activity: []
      })),
      bootstrap: vi.fn(async (projectId) => projectId
        ? { ...account, project: { id: projectId }, project_status: 'resumed', entry_path: `/projects/${projectId}/design` }
        : { ...account, project: null, project_status: 'selection_required', entry_path: null })
    };
    const view = render(<DashboardApp dashboardService={dashboard} />);
    fireEvent.click(await screen.findByRole('button', { name: /Existing project/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/projects/prj_existing/design'));
    expect(dashboard.bootstrap).toHaveBeenNthCalledWith(1, null);
    expect(dashboard.bootstrap).toHaveBeenNthCalledWith(2, 'prj_existing');
    view.unmount();
    window.history.replaceState({}, '', '/');
  });
});
