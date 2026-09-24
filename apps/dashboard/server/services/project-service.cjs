'use strict';

const { createId } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');

const ROLE_PERMISSIONS = {
  owner: ['organization:manage', 'project:create', 'project:view', 'interview:edit'],
  administrator: ['organization:manage', 'project:create', 'project:view', 'interview:edit'],
  editor: ['project:view', 'interview:edit'],
  viewer: ['project:view']
};

function requiredText(value, label, maximum = 120) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  assert(text.length > 0, 'field_required', `${label} is required.`, 422);
  assert(text.length <= maximum, 'field_too_long', `${label} must be ${maximum} characters or fewer.`, 422);
  return text;
}
function optionalUrl(value, label) {
  if (value === undefined || value === null || value === '') return null;
  try { const parsed = new URL(value); assert(['https:', 'http:'].includes(parsed.protocol), 'url_invalid', `${label} must use http or https.`, 422); return parsed.toString(); }
  catch (error) { if (error instanceof DashboardError) throw error; throw new DashboardError('url_invalid', `${label} must be a valid URL.`, 422); }
}
function normalizedCountry(value) {
  const country = String(value || '').trim().toUpperCase();
  assert(/^[A-Z]{2}$/.test(country), 'country_invalid', 'Choose a two-letter country code.', 422);
  return country;
}
function projectRecord({ id, organizationId, workspaceId, userId, input, at }) {
  return {
    id,
    organization_id: organizationId,
    workspace_id: workspaceId,
    name: requiredText(input.name, 'Project name'),
    business_name: requiredText(input.business_name, 'Business name'),
    country: normalizedCountry(input.country),
    website_url: optionalUrl(input.website_url, 'Website'),
    shopify_store_url: optionalUrl(input.shopify_store_url, 'Shopify store'),
    icon: input.icon ? requiredText(input.icon, 'Project icon', 32) : null,
    status: 'active',
    created_by_user_id: userId,
    created_at: at,
    updated_at: at
  };
}
function projectSummary(value) {
  return value && {
    id: value.id,
    name: value.name,
    business_name: value.business_name,
    status: value.status,
    updated_at: value.updated_at
  };
}

const BOOTSTRAP_RACE = 'shopify_project_bootstrap_race';

class ProjectService {
  constructor({ store, clock = () => new Date() }) { this.store = store; this.clock = clock; }
  now() { return isoNow(this.clock); }
  async requireMembership(organizationId, userId, permission = 'project:view') {
    const membership = await this.store.findMembership(organizationId, userId);
    if (!membership || membership.status !== 'active' || !ROLE_PERMISSIONS[membership.role]?.includes(permission)) throw new DashboardError('permission_denied', 'You do not have access to this workspace.', 403);
    return membership;
  }
  async defaultOrganization(userId) {
    const organizations = await this.store.listOrganizationsForUser(userId);
    if (!organizations.length) throw new DashboardError('organization_missing', 'No active workspace is available for this account.', 409);
    return organizations[0];
  }
  async createProject({ userId, input }) {
    const { organization: org, role } = await this.defaultOrganization(userId);
    await this.requireMembership(org.id, userId, 'project:create');
    const workspace = await this.store.findWorkspaceForOrganization(org.id);
    if (!workspace) throw new DashboardError('workspace_missing', 'The organization workspace is not configured.', 409);
    const at = this.now();
    const record = projectRecord({ id: createId('prj'), organizationId: org.id, workspaceId: workspace.id, userId, input, at });
    const created = await this.store.createProject(record);
    await this.store.createActivity({ id: createId('act'), organization_id: org.id, project_id: created.id, actor_user_id: userId, type: 'project_created', payload: { project_name: created.name }, created_at: at });
    return { project: created, organization: org, role };
  }
  async createShopifyProject({ userId, organizationId, connectionId, input }) {
    const organization = await this.store.findOrganizationById(organizationId);
    if (!organization) throw new DashboardError('organization_missing', 'No active workspace is available for this account.', 409);
    const membership = await this.requireMembership(organizationId, userId, 'project:create');
    const result = await this.store.transaction(async (store) => {
      const connection = await store.findShopifyConnectionForOrganization(connectionId, organizationId);
      if (!connection) throw new DashboardError('shopify_project_scope_invalid', 'I could not verify this Shopify store. Reopen Calinium from Shopify Admin.', 403);
      const workspace = await store.findWorkspaceForOrganization(organizationId);
      if (!workspace) throw new DashboardError('workspace_missing', 'The organization workspace is not configured.', 409);
      const at = this.now();
      const record = projectRecord({
        id: createId('prj'),
        organizationId,
        workspaceId: workspace.id,
        userId,
        input: { ...input, shopify_store_url: `https://${connection.shop_domain}` },
        at
      });
      const created = await store.createProject(record);
      await store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: created.id, connection_id: connectionId, assigned_by_user_id: userId, assignment_status: 'assigned', created_at: at, updated_at: at });
      await store.selectShopifyProjectBootstrapBinding(this.bootstrapBinding({ connectionId, organizationId, projectId: created.id, userId, at }));
      await store.createActivity({ id: createId('act'), organization_id: organizationId, project_id: created.id, actor_user_id: userId, type: 'project_created', payload: { project_name: created.name }, created_at: at });
      await store.createActivity({ id: createId('act'), organization_id: organizationId, project_id: created.id, actor_user_id: userId, type: 'shopify_project_bound', payload: {}, created_at: at });
      return created;
    });
    return { project: result, organization, role: membership.role };
  }
  async getProject({ userId, projectId }) {
    const candidate = await this.store.findProjectById(projectId);
    if (!candidate) throw new DashboardError('project_not_found', 'Project not found.', 404);
    const membership = await this.requireMembership(candidate.organization_id, userId, 'project:view');
    const [interview, merchantProfile, events, assets] = await Promise.all([this.store.findInterviewForProject(projectId), this.store.findCurrentMerchantProfile(projectId), this.store.listProjectActivity(projectId), this.store.listAssetsForProject(projectId, candidate.organization_id)]);
    return { project: candidate, membership, interview, merchant_profile: merchantProfile, asset_count: assets.length, activity: events };
  }
  async dashboardOverview({ userId }) {
    const { organization, role } = await this.defaultOrganization(userId);
    await this.requireMembership(organization.id, userId, 'project:view');
    const [projects, profiles, activity] = await Promise.all([this.store.listProjects(organization.id), this.store.listMerchantProfiles(organization.id), this.store.listActivity(organization.id)]);
    const interviews = await Promise.all(projects.map(async (project) => ({ project_id: project.id, project_name: project.name, interview: await this.store.findInterviewForProject(project.id) })));
    return { organization, role, projects, profiles, interviews: interviews.filter((entry) => entry.interview), activity };
  }
  async embeddedDashboardOverview({ userId, organizationId, connectionId }) {
    const organization = await this.store.findOrganizationById(organizationId);
    if (!organization) throw new DashboardError('organization_missing', 'No active workspace is available for this account.', 409);
    const membership = await this.requireMembership(organizationId, userId, 'project:view');
    let projects = await this.store.listActiveProjectsForShopifyConnection(connectionId, organizationId);
    if (!projects.length) projects = await this.store.listActiveUnassignedProjects(organizationId);
    const profiles = (await Promise.all(projects.map((item) => this.store.listMerchantProfilesForProject(item.id)))).flat();
    const interviews = await Promise.all(projects.map(async (item) => ({ project_id: item.id, project_name: item.name, interview: await this.store.findInterviewForProject(item.id) })));
    const activity = (await Promise.all(projects.map((item) => this.store.listProjectActivity(item.id))))
      .flat()
      .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
      .slice(0, 24);
    return { organization, role: membership.role, projects, profiles, interviews: interviews.filter((entry) => entry.interview), activity };
  }
  async authorizeShopifyProjectContext({ userId, projectId, organizationId, connectionId }) {
    const project = await this.store.findProjectForOrganization(projectId, organizationId);
    if (!project || project.status !== 'active') throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
    await this.requireMembership(organizationId, userId, 'project:view');
    const assignment = await this.store.findProjectShopifyConnection(projectId, organizationId, connectionId);
    if (!assignment?.connection) throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
    return { project, assignment };
  }
  async projectResumeState(project) {
    const [session, orders] = await Promise.all([
      this.store.findCreativeDirectorForProject(project.id),
      this.store.listCustomThemeOrdersForProject(project.id, project.organization_id)
    ]);
    const order = orders[0] || null;
    return {
      experience: 'creative_director',
      stage: session?.stage || 'not_started',
      generation_status: order?.generation_status || session?.generation_state?.status || 'not_started',
      delivery_available: order?.generation_status === 'ready'
    };
  }
  bootstrapBinding({ connectionId, organizationId, projectId, userId, at }) {
    return {
      connection_id: connectionId,
      organization_id: organizationId,
      project_id: projectId,
      created_by_user_id: userId,
      created_at: at,
      updated_at: at
    };
  }
  async bootstrapTransaction({ store, userId, organizationId, connectionId, shopDomain, shopDisplayName, requestedProjectId, mayCreate, mayEdit }) {
    const at = this.now();
    const connection = await store.findShopifyConnectionForOrganization(connectionId, organizationId);
    if (!connection || connection.shop_domain !== shopDomain) throw new DashboardError('shopify_project_scope_invalid', 'I could not verify this Shopify store. Reopen Calinium from Shopify Admin.', 403);

    if (requestedProjectId) {
      const requested = await store.findProjectForOrganization(requestedProjectId, organizationId);
      if (!requested || requested.status !== 'active') throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
      let assignment = await store.findProjectShopifyConnection(requested.id, organizationId, connectionId);
      if (!assignment) {
        const anotherAssignment = await store.findProjectShopifyConnection(requested.id, organizationId);
        if (anotherAssignment || !mayEdit) throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
        await store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: requested.id, connection_id: connectionId, assigned_by_user_id: userId, assignment_status: 'assigned', created_at: at, updated_at: at });
        assignment = await store.findProjectShopifyConnection(requested.id, organizationId, connectionId);
      }
      if (!assignment) throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
      await store.selectShopifyProjectBootstrapBinding(this.bootstrapBinding({ connectionId, organizationId, projectId: requested.id, userId, at }));
      return { project: requested, projectStatus: 'resumed', availableProjects: [] };
    }

    const selected = await store.findShopifyProjectBootstrapBinding(connectionId, organizationId);
    if (selected) {
      const project = await store.findProjectForOrganization(selected.project_id, organizationId);
      const assignment = project && await store.findProjectShopifyConnection(project.id, organizationId, connectionId);
      if (!project || project.status !== 'active' || !assignment) throw new DashboardError('shopify_project_binding_invalid', 'Calinium could not safely resume this store project. Your saved work has not changed.', 409);
      return { project, projectStatus: 'resumed', availableProjects: [] };
    }

    const assigned = await store.listActiveProjectsForShopifyConnection(connectionId, organizationId);
    if (assigned.length > 1) return { project: null, projectStatus: 'selection_required', availableProjects: assigned.map(projectSummary) };
    if (assigned.length === 1) {
      const claim = await store.claimShopifyProjectBootstrapBinding(this.bootstrapBinding({ connectionId, organizationId, projectId: assigned[0].id, userId, at }));
      if (!claim.created && claim.binding?.project_id !== assigned[0].id) throw new DashboardError(BOOTSTRAP_RACE, 'Project bootstrap was completed by another request.', 409);
      return { project: assigned[0], projectStatus: 'resumed', availableProjects: [] };
    }

    const unassigned = await store.listActiveUnassignedProjects(organizationId);
    if (unassigned.length > 1) return { project: null, projectStatus: 'selection_required', availableProjects: unassigned.map(projectSummary) };
    if (unassigned.length === 1) {
      if (!mayEdit) throw new DashboardError('shopify_project_binding_forbidden', 'This project needs an authorized workspace owner before it can be connected.', 403);
      const project = unassigned[0];
      await store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: project.id, connection_id: connectionId, assigned_by_user_id: userId, assignment_status: 'assigned', created_at: at, updated_at: at });
      const claim = await store.claimShopifyProjectBootstrapBinding(this.bootstrapBinding({ connectionId, organizationId, projectId: project.id, userId, at }));
      if (!claim.created && claim.binding?.project_id !== project.id) throw new DashboardError(BOOTSTRAP_RACE, 'Project bootstrap was completed by another request.', 409);
      await store.createActivity({ id: createId('act'), organization_id: organizationId, project_id: project.id, actor_user_id: userId, type: 'shopify_project_bound', payload: {}, created_at: at });
      return { project, projectStatus: 'resumed', availableProjects: [] };
    }

    if (!mayCreate) throw new DashboardError('project_creation_forbidden', 'An authorized workspace owner needs to prepare this store before Calinium can continue.', 403);
    const workspace = await store.findWorkspaceForOrganization(organizationId);
    if (!workspace) throw new DashboardError('workspace_missing', 'The organization workspace is not configured.', 409);
    const displayName = String(shopDisplayName || shopDomain.replace(/\.myshopify\.com$/, '')).trim().replace(/\s+/g, ' ').slice(0, 120) || 'Shopify store';
    const project = await store.createProject(projectRecord({
      id: createId('prj'),
      organizationId,
      workspaceId: workspace.id,
      userId,
      input: { name: displayName, business_name: displayName, country: 'ZZ', shopify_store_url: `https://${shopDomain}` },
      at
    }));
    await store.assignShopifyConnectionToProject({ id: createId('psc'), project_id: project.id, connection_id: connectionId, assigned_by_user_id: userId, assignment_status: 'assigned', created_at: at, updated_at: at });
    const claim = await store.claimShopifyProjectBootstrapBinding(this.bootstrapBinding({ connectionId, organizationId, projectId: project.id, userId, at }));
    if (!claim.created && claim.binding?.project_id !== project.id) throw new DashboardError(BOOTSTRAP_RACE, 'Project bootstrap was completed by another request.', 409);
    await store.createActivity({ id: createId('act'), organization_id: organizationId, project_id: project.id, actor_user_id: userId, type: 'project_created', payload: { project_name: project.name }, created_at: at });
    await store.createActivity({ id: createId('act'), organization_id: organizationId, project_id: project.id, actor_user_id: userId, type: 'shopify_project_bound', payload: {}, created_at: at });
    return { project, projectStatus: 'created', availableProjects: [] };
  }
  async bootstrapShopifyProject({ userId, organizationId, connectionId, shopDomain, shopDisplayName, requestedProjectId = null }) {
    const membership = await this.requireMembership(organizationId, userId, 'project:view');
    const permissions = ROLE_PERMISSIONS[membership.role] || [];
    let outcome;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        outcome = await this.store.transaction((store) => this.bootstrapTransaction({
          store,
          userId,
          organizationId,
          connectionId,
          shopDomain,
          shopDisplayName,
          requestedProjectId,
          mayCreate: permissions.includes('project:create'),
          mayEdit: permissions.includes('interview:edit')
        }));
        break;
      } catch (error) {
        if (error?.code !== BOOTSTRAP_RACE || attempt === 2) throw error;
      }
    }
    if (!outcome?.project) return { project: null, project_status: outcome?.projectStatus || 'selection_required', resume_state: null, entry_mode: 'select', entry_path: null, available_projects: outcome?.availableProjects || [] };
    return {
      project: outcome.project,
      project_status: outcome.projectStatus,
      resume_state: await this.projectResumeState(outcome.project),
      entry_mode: outcome.projectStatus === 'created' ? 'start' : 'resume',
      entry_path: `/projects/${outcome.project.id}/design`,
      available_projects: []
    };
  }
  async updateAccount({ userId, input }) { return this.store.updateUserProfile(userId, { full_name: requiredText(input.full_name, 'Full name') }, this.now()); }
  async updateOrganization({ userId, input }) {
    const { organization } = await this.defaultOrganization(userId);
    await this.requireMembership(organization.id, userId, 'organization:manage');
    return this.store.updateOrganization(organization.id, { name: requiredText(input.name, 'Organization name') }, this.now());
  }
  async getPreferences(userId) { return this.store.getPreferences(userId); }
  async updatePreferences({ userId, input }) {
    const locale = input?.locale === 'en' ? 'en' : 'en';
    return this.store.setPreferences(userId, { locale }, this.now());
  }
}

module.exports = { ProjectService, ROLE_PERMISSIONS };
