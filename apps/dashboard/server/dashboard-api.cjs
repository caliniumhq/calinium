'use strict';

const crypto = require('crypto');
const { DashboardError } = require('./lib/errors.cjs');
const { authorizationToken, verifyOptionalEmbeddedSession } = require('./shopify/embedded-session.cjs');
const { dashboardSecurityHeaders } = require('./embedded-shell.cjs');

const MAX_BODY_BYTES = 256 * 1024;
const MAX_UPLOAD_BODY_BYTES = 26 * 1024 * 1024;
const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;
const SESSION_COOKIE = 'calinium_dashboard_session';
const CSRF_COOKIE = 'calinium_dashboard_csrf';

function parseCookies(request) {
  return String(request.headers.cookie || '').split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    return cookies;
  }, {});
}
function embeddedCookieContext(env = process.env) {
  return env.CALINIUM_EMBEDDED_APP === 'true' || Boolean(env.SHOPIFY_API_KEY);
}
function cookie(name, value, { httpOnly = false, maxAge = null, env = process.env, secure = env.NODE_ENV === 'production' || embeddedCookieContext(env) } = {}) {
  const embedded = embeddedCookieContext(env);
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', `SameSite=${embedded ? 'None' : 'Lax'}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (embedded && secure) parts.push('Partitioned');
  if (maxAge !== null) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}
function sendJson(response, status, value, { cookies = [] } = {}) {
  response.writeHead(status, {
    ...dashboardSecurityHeaders(), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    ...(cookies.length ? { 'set-cookie': cookies } : {})
  });
  response.end(`${JSON.stringify(value)}\n`);
}
function sendRedirect(response, location) {
  response.writeHead(302, { ...dashboardSecurityHeaders(), location, 'cache-control': 'no-store' });
  response.end();
}
function sendAsset(response, { asset, buffer }) {
  response.writeHead(200, { ...dashboardSecurityHeaders(), 'content-type': asset.mime_type, 'content-length': buffer.length, 'cache-control': 'private, no-store', 'content-disposition': `inline; filename="${asset.safe_filename}"` });
  response.end(buffer);
}
function sendThemeArtifact(response, { filename, contentType, buffer }) {
  const safeFilename = String(filename || 'calinium-storefront-artifact').replace(/[^A-Za-z0-9._-]/g, '-');
  response.writeHead(200, {
    ...dashboardSecurityHeaders(),
    'content-type': contentType,
    'content-length': buffer.length,
    'cache-control': 'private, no-store',
    'content-disposition': `attachment; filename="${safeFilename}"`
  });
  response.end(buffer);
}
function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) { request.destroy(); reject(new DashboardError('request_too_large', 'Request body exceeds the dashboard limit.', 413)); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      return resolve(Buffer.concat(chunks));
    });
    request.on('error', reject);
  });
}
function parseBody(request) {
  return readBody(request, MAX_BODY_BYTES).then((buffer) => {
    if (!buffer.length) return {};
    try { return JSON.parse(buffer.toString('utf8')); }
    catch { throw new DashboardError('request_invalid', 'Request body must be valid JSON.', 400); }
  });
}
function parseMultipart(request) {
  const contentType = String(request.headers['content-type'] || '');
  const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
  if (!boundaryMatch) return Promise.reject(new DashboardError('upload_invalid', 'The upload request is missing a multipart boundary.', 400));
  const boundary = Buffer.from(`--${boundaryMatch[1].replace(/^"|"$/g, '')}`);
  return readBody(request, MAX_UPLOAD_BODY_BYTES).then((buffer) => {
    const fields = {}; let file = null; let position = buffer.indexOf(boundary);
    while (position >= 0) {
      const next = buffer.indexOf(boundary, position + boundary.length);
      if (next < 0) break;
      let part = buffer.subarray(position + boundary.length, next); position = next;
      if (part.subarray(0, 2).equals(Buffer.from('\r\n'))) part = part.subarray(2);
      if (part.subarray(-2).equals(Buffer.from('\r\n'))) part = part.subarray(0, -2);
      const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEnd < 0) continue;
      const headers = part.subarray(0, headerEnd).toString('utf8'); const value = part.subarray(headerEnd + 4);
      const disposition = headers.match(/content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i);
      if (!disposition) continue;
      const [, name, filename] = disposition; const mimeType = (headers.match(/content-type:\s*([^\r\n;]+)/i) || [])[1];
      if (filename !== undefined) {
        if (name !== 'file' || file) throw new DashboardError('upload_invalid', 'Provide one file in the upload request.', 422);
        file = { filename, mime_type: String(mimeType || '').toLowerCase(), buffer: Buffer.from(value) };
      } else fields[name] = value.toString('utf8');
    }
    if (!file) throw new DashboardError('upload_missing_file', 'Choose a file to upload.', 422);
    return { fields, file };
  });
}
function requestIp(request) { return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim(); }
function requestOriginIsSameOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return process.env.NODE_ENV !== 'production';
  try { return new URL(origin).host === request.headers.host; } catch { return false; }
}

function publicContentPlanProjection(contentPlan) {
  const contract = contentPlan?.target_eligibility;
  if (!contract?.summary || !Array.isArray(contract.targets)) return null;
  const publicState = (state) => ({
    action_required: 'needs_input',
    ready_from_authoritative_content: 'ready',
    not_required_omitted_by_policy: 'optional_not_included',
    not_required_not_selected: 'optional_not_included',
    blocked_critical_confirmation: 'required_before_continuing',
    unresolved_review_required: 'required_before_continuing'
  })[state] || 'required_before_continuing';
  return {
    summary: {
      actionable_count: contract.summary.actionable_count,
      ready_count: contract.summary.ready_count,
      optional_not_included_count: (contract.summary.omitted_count || 0) + (contract.summary.not_selected_count || 0),
      blocked_count: contract.summary.blocked_count
    },
    resolved: contract.stage_resolution?.status === 'resolved',
    targets: contract.targets.map((target) => ({
      content_key: target.target_key,
      label: target.merchant_label,
      state: publicState(target.eligibility_state),
      available_in_direction: target.original_preset_module === true,
      actionable: target.actionable === true,
      blocked: target.blocked === true
    }))
  };
}

function sanitizeCreativeDirectorPayload(value) {
  if (!value || typeof value !== 'object' || !value.session?.content_plan) return value;
  const projection = publicContentPlanProjection(value.session.content_plan);
  const contentPlan = { ...value.session.content_plan };
  delete contentPlan.target_eligibility;
  return {
    ...value,
    session: {
      ...value.session,
      content_plan: contentPlan,
      ...(projection ? { content_plan_projection: projection } : {})
    }
  };
}

function createDashboardApiHandler({ services, env = services?.env || process.env }) {
  function embeddedRequest(request, { required = false } = {}) {
    const token = authorizationToken(request.headers || {});
    if (!token && required) throw new DashboardError('shopify_embedded_session_missing', 'Open Calinium from Shopify Admin to continue.', 401);
    return token ? { token, session: verifyOptionalEmbeddedSession(request, { env }) } : null;
  }
  async function requireActor(request) {
    const embedded = embeddedRequest(request);
    const embeddedSession = embedded?.session || null;
    const cookies = parseCookies(request);
    const cookieActor = await services.auth.authenticate(cookies[SESSION_COOKIE]);
    if (embeddedSession) {
      // A valid App Bridge token is the embedded request credential. Resolve
      // the server-side identity every time so a blocked third-party cookie
      // cannot produce an authentication loop inside Shopify Admin.
      const embeddedActor = await services.embeddedAuth.resolveActor({ shopDomain: embeddedSession.shop_domain, shopifyUserId: embeddedSession.user_id });
      if (cookieActor && cookieActor.user.id !== embeddedActor.user.id) {
        throw new DashboardError('shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
      }
      return {
        ...embeddedActor,
        session_token: cookieActor ? cookies[SESSION_COOKIE] : null,
        shopify_embedded_session: embeddedSession
      };
    }
    if (!cookieActor) throw new DashboardError('authentication_required', 'Sign in to continue.', 401);
    return { ...cookieActor, session_token: cookies[SESSION_COOKIE] };
  }
  async function requireProjectActor(request, projectId) {
    const actor = await requireActor(request);
    if (actor.shopify_embedded_session) {
      await services.projects.authorizeShopifyProjectContext({
        userId: actor.user.id,
        projectId,
        organizationId: actor.identity.organization_id,
        connectionId: actor.connection.id
      });
    }
    return actor;
  }
  function rejectEmbeddedPasswordAuth(request) {
    if (!authorizationToken(request.headers || {})) return;
    embeddedRequest(request, { required: true });
    throw new DashboardError('shopify_embedded_login_not_available', 'Calinium signs you in through Shopify Admin. Refresh the app to continue.', 409);
  }
  function requireCsrf(request) {
    // The verified short-lived Shopify session token provides request binding
    // for embedded mutations. Standalone traffic retains double-submit CSRF.
    if (embeddedRequest(request)) return;
    const cookies = parseCookies(request);
    const header = request.headers['x-csrf-token'];
    const cookieToken = Buffer.from(cookies[CSRF_COOKIE] || '');
    const headerToken = Buffer.from(typeof header === 'string' ? header : '');
    const matches = cookieToken.length > 0 && cookieToken.length === headerToken.length && crypto.timingSafeEqual(cookieToken, headerToken);
    if (!requestOriginIsSameOrigin(request) || !matches) throw new DashboardError('csrf_invalid', 'Your session could not be verified. Refresh and try again.', 403);
  }
  async function action(request, body, pathname, requestId = null) {
    if (pathname === '/api/auth/csrf' && request.method === 'GET') {
      const token = crypto.randomBytes(24).toString('base64url');
      return { value: { csrf_token: token }, cookies: [cookie(CSRF_COOKIE, token, { maxAge: 60 * 60 * 8, env })] };
    }
    if (pathname === '/api/health' && request.method === 'GET') return { value: { service: 'calinium-dashboard', status: 'ok' } };
    if (pathname === '/api/ready' && request.method === 'GET') {
      try {
        return { value: { service: 'calinium-dashboard', status: 'ready', ...(await services.readiness()) } };
      } catch (error) {
        if (error instanceof DashboardError && error.code === 'dashboard_not_ready') throw error;
        throw new DashboardError('dashboard_not_ready', 'The dashboard is not ready to accept traffic.', 503);
      }
    }
    if (pathname === '/api/shopify/oauth/callback' && request.method === 'GET') {
      const callback = await services.shopify.completeOAuthCallback({ query: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams });
      return { redirect: callback.redirect_path };
    }
    if (pathname === '/api/auth/embedded' && request.method === 'POST') {
      const embedded = embeddedRequest(request, { required: true });
      const result = await services.embeddedAuth.bootstrap({ embeddedSession: embedded.session, sessionToken: embedded.token });
      const requestedProjectId = body?.project_id === undefined || body?.project_id === null || body?.project_id === ''
        ? null
        : String(body.project_id);
      if (requestedProjectId && !/^prj_[a-zA-Z0-9-]+$/.test(requestedProjectId)) throw new DashboardError('shopify_project_access_denied', 'This project is not available for the current Shopify store.', 403);
      const projectBootstrap = await services.projects.bootstrapShopifyProject({
        userId: result.user.id,
        organizationId: result.connection.organization_id,
        connectionId: result.connection.id,
        shopDomain: result.connection.shop_domain,
        shopDisplayName: result.connection.display_name,
        requestedProjectId
      });
      const operatorDiagnosticsAvailable = Boolean(projectBootstrap.project?.id)
        && typeof services.merchantFlow?.operatorReadinessAvailable === 'function'
        && await services.merchantFlow.operatorReadinessAvailable({
          projectId: projectBootstrap.project.id,
          userId: result.user.id
        });
      return {
        value: { user: result.user, organizations: result.organizations, embedded: true, shop: result.shop, operator_diagnostics_available: operatorDiagnosticsAvailable, ...projectBootstrap },
        cookies: [cookie(SESSION_COOKIE, result.session.token, { httpOnly: true, maxAge: Math.floor((new Date(result.session.expires_at).getTime() - Date.now()) / 1000), env })]
      };
    }
    if (pathname === '/api/auth/sign-up' && request.method === 'POST') {
      rejectEmbeddedPasswordAuth(request);
      requireCsrf(request);
      const result = await services.auth.register({ email: body.email, password: body.password, fullName: body.full_name, organizationName: body.organization_name, ipAddress: requestIp(request) });
      return { value: { user: result.user, organization: result.organization }, cookies: [cookie(SESSION_COOKIE, result.session.token, { httpOnly: true, maxAge: Math.floor((new Date(result.session.expires_at).getTime() - Date.now()) / 1000), env })] };
    }
    if (pathname === '/api/auth/sign-in' && request.method === 'POST') {
      rejectEmbeddedPasswordAuth(request);
      requireCsrf(request);
      const result = await services.auth.signIn({ email: body.email, password: body.password, ipAddress: requestIp(request) });
      return { value: { user: result.user }, cookies: [cookie(SESSION_COOKIE, result.session.token, { httpOnly: true, maxAge: Math.floor((new Date(result.session.expires_at).getTime() - Date.now()) / 1000), env })] };
    }
    if (pathname === '/api/auth/me' && request.method === 'GET') {
      const actor = await requireActor(request);
      return { value: await services.auth.accountContext(actor.user.id) };
    }
    if (pathname === '/api/auth/sign-out' && request.method === 'POST') {
      requireCsrf(request);
      const actor = await requireActor(request);
      await services.auth.signOut(actor.session_token);
      return { value: { signed_out: true }, cookies: [cookie(SESSION_COOKIE, '', { httpOnly: true, maxAge: 0, env })] };
    }
    if (pathname === '/api/dashboard/overview' && request.method === 'GET') {
      const actor = await requireActor(request);
      return {
        value: actor.shopify_embedded_session
          ? await services.projects.embeddedDashboardOverview({ userId: actor.user.id, organizationId: actor.identity.organization_id, connectionId: actor.connection.id })
          : await services.projects.dashboardOverview({ userId: actor.user.id })
      };
    }
    if (pathname === '/api/projects' && request.method === 'POST') {
      requireCsrf(request);
      const actor = await requireActor(request);
      return {
        value: actor.shopify_embedded_session
          ? await services.projects.createShopifyProject({ userId: actor.user.id, organizationId: actor.identity.organization_id, connectionId: actor.connection.id, input: body })
          : await services.projects.createProject({ userId: actor.user.id, input: body })
      };
    }
    if (pathname === '/api/account' && request.method === 'GET') {
      const actor = await requireActor(request);
      return { value: await services.auth.accountContext(actor.user.id) };
    }
    if (pathname === '/api/account' && request.method === 'PUT') {
      requireCsrf(request);
      const actor = await requireActor(request);
      return { value: { user: await services.projects.updateAccount({ userId: actor.user.id, input: body }) } };
    }
    if (pathname === '/api/settings/organization' && request.method === 'PUT') {
      requireCsrf(request);
      const actor = await requireActor(request);
      return { value: { organization: await services.projects.updateOrganization({ userId: actor.user.id, input: body }) } };
    }
    if (pathname === '/api/settings/preferences' && request.method === 'GET') {
      const actor = await requireActor(request);
      return { value: { preferences: await services.projects.getPreferences(actor.user.id) } };
    }
    if (pathname === '/api/settings/preferences' && request.method === 'PUT') {
      requireCsrf(request);
      const actor = await requireActor(request);
      return { value: { preferences: await services.projects.updatePreferences({ userId: actor.user.id, input: body }) } };
    }
    const projectScopeMatch = pathname.match(/^\/api\/projects\/([^/]+)(?:\/|$)/);
    if (projectScopeMatch) {
      if (!['GET', 'HEAD'].includes(request.method)) requireCsrf(request);
      await requireProjectActor(request, projectScopeMatch[1]);
    }
    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      const [, projectId] = projectMatch;
      const actor = await requireActor(request);
      if (request.method === 'GET') return { value: await services.projects.getProject({ userId: actor.user.id, projectId }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const assetListMatch = pathname.match(/^\/api\/projects\/([^/]+)\/assets$/);
    if (assetListMatch) {
      const [, projectId] = assetListMatch; const actor = await requireActor(request);
      if (request.method === 'GET') return { value: await services.assets.list({ userId: actor.user.id, projectId, assetType: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('type') }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const assetUploadMatch = pathname.match(/^\/api\/projects\/([^/]+)\/assets\/upload$/);
    if (assetUploadMatch && request.method === 'POST') {
      requireCsrf(request); const actor = await requireActor(request);
      if (!body?.file) throw new DashboardError('upload_invalid', 'Use a multipart upload request.', 400);
      return { value: await services.assets.upload({ userId: actor.user.id, projectId: assetUploadMatch[1], file: body.file, input: body.fields || {} }) };
    }
    const shopifyFileCandidateMatch = pathname.match(/^\/api\/projects\/([^/]+)\/assets\/shopify-files\/([^/]+)$/);
    if (shopifyFileCandidateMatch) {
      const [, projectId, resourceId] = shopifyFileCandidateMatch; const actor = await requireActor(request);
      if (request.method === 'PUT') { requireCsrf(request); return { value: await services.assets.categorizeShopifyFile({ userId: actor.user.id, projectId, resourceId, assetCategory: body.asset_category }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const assetMatch = pathname.match(/^\/api\/projects\/([^/]+)\/assets\/([^/]+)(?:\/(download|palette))?$/);
    if (assetMatch) {
      const [, projectId, assetId, assetAction] = assetMatch; const actor = await requireActor(request);
      if (assetAction === 'download' && request.method === 'GET') return { asset: await services.assets.read({ userId: actor.user.id, projectId, assetId }) };
      if (assetAction === 'palette' && request.method === 'POST') { requireCsrf(request); return { value: await services.assets.extractLogoPalette({ userId: actor.user.id, projectId, assetId }) }; }
      if (!assetAction && request.method === 'PUT') { requireCsrf(request); return { value: await services.assets.updateMetadata({ userId: actor.user.id, projectId, assetId, input: body }) }; }
      if (!assetAction && request.method === 'DELETE') { requireCsrf(request); return { value: await services.assets.delete({ userId: actor.user.id, projectId, assetId, confirmed: Boolean(body.confirmed) }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyStartMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/connections\/start$/);
    if (shopifyStartMatch) {
      const [, projectId] = shopifyStartMatch; const actor = await requireActor(request);
      if (request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.startConnection({ userId: actor.user.id, projectId, shopDomain: body.shop_domain, purpose: body.purpose || 'discovery', embeddedHost: body.embedded_host }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyConnectionsMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/connections$/);
    if (shopifyConnectionsMatch) {
      const [, projectId] = shopifyConnectionsMatch; const actor = await requireActor(request);
      if (request.method === 'GET') return { value: await services.shopify.listEligibleStores({ userId: actor.user.id, projectId }) };
      if (request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.assignStore({ userId: actor.user.id, projectId, connectionId: body.connection_id }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyConnectionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/connection(?:\/(health|sync|disconnect))?$/);
    if (shopifyConnectionMatch) {
      const [, projectId, operation] = shopifyConnectionMatch; const actor = await requireActor(request);
      if (!operation && request.method === 'GET') return { value: await services.shopify.projectConnection({ userId: actor.user.id, projectId, connectionId: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('connection_id') }) };
      if (operation === 'health' && request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.checkHealth({ userId: actor.user.id, projectId, connectionId: body.connection_id }) }; }
      if (operation === 'sync' && request.method === 'POST') {
        requireCsrf(request);
        const value = await services.shopify.synchronize({ userId: actor.user.id, projectId, connectionId: body.connection_id });
        await services.merchantIntake?.rebuildFromCurrentEvidence({ userId: actor.user.id, projectId });
        await services.recommendedResources?.ensure({ userId: actor.user.id, projectId });
        return { value };
      }
      if (operation === 'disconnect' && request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.disconnect({ userId: actor.user.id, projectId, connectionId: body.connection_id }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const merchantIntakeMatch = pathname.match(/^\/api\/projects\/([^/]+)\/merchant-intake(?:\/(refresh))?$/);
    if (merchantIntakeMatch) {
      const [, projectId, operation] = merchantIntakeMatch; const actor = await requireActor(request);
      if (!operation && request.method === 'GET') return { value: await services.merchantIntake.get({ userId: actor.user.id, projectId }) };
      if (operation === 'refresh' && request.method === 'POST') { requireCsrf(request); return { value: await services.merchantIntake.refresh({ userId: actor.user.id, projectId }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const livePreviewMatch = pathname.match(/^\/api\/projects\/([^/]+)\/live-preview(?:\/(retry))?$/);
    if (livePreviewMatch) {
      const [, projectId, operation] = livePreviewMatch; const actor = await requireActor(request);
      if (!operation && request.method === 'GET') return { value: await services.livePreview.ensure({ userId: actor.user.id, projectId }) };
      if (operation === 'retry' && request.method === 'POST') { requireCsrf(request); return { value: await services.livePreview.ensure({ userId: actor.user.id, projectId, retry: true }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const creativeDirectionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/creative-direction(?:\/(refresh|approve))?$/);
    if (creativeDirectionMatch) {
      const [, projectId, operation] = creativeDirectionMatch; const actor = await requireActor(request);
      if ((!operation || operation === 'refresh') && request.method === (operation ? 'POST' : 'GET')) {
        if (operation) requireCsrf(request);
        return { value: await services.creativeDirection.ensure({ userId: actor.user.id, projectId }) };
      }
      if (operation === 'approve' && request.method === 'POST') {
        requireCsrf(request);
        return { value: await services.creativeDirector.approveCreativeDirection({ userId: actor.user.id, projectId, expectedRecommendationRevisionId: body.expected_recommendation_revision_id, expectedDnaRevisionId: body.expected_design_dna_revision_id }) };
      }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const recommendedResourceSetSlotMatch = pathname.match(/^\/api\/projects\/([^/]+)\/recommended-resource-set\/slots\/([^/]+)\/replace$/);
    if (recommendedResourceSetSlotMatch) {
      const [, projectId, slotId] = recommendedResourceSetSlotMatch; const actor = await requireActor(request);
      if (request.method === 'POST') {
        requireCsrf(request);
        return { value: await services.recommendedResources.replace({ userId: actor.user.id, projectId, expectedRevisionId: body.expected_revision_id, slotId, selectionId: body.selection_id }) };
      }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const recommendedResourceSetMatch = pathname.match(/^\/api\/projects\/([^/]+)\/recommended-resource-set(?:\/(refresh|approve))?$/);
    if (recommendedResourceSetMatch) {
      const [, projectId, operation] = recommendedResourceSetMatch; const actor = await requireActor(request);
      if (!operation && request.method === 'GET') return { value: await services.recommendedResources.ensure({ userId: actor.user.id, projectId }) };
      if (operation === 'refresh' && request.method === 'POST') { requireCsrf(request); return { value: await services.recommendedResources.ensure({ userId: actor.user.id, projectId }) }; }
      if (operation === 'approve' && request.method === 'POST') { requireCsrf(request); return { value: await services.creativeDirector.approveRecommendedResourceSet({ userId: actor.user.id, projectId, expectedRevisionId: body.expected_revision_id }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyResourcesMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/resources(?:\/([^/]+)\/(approval|revoke))?$/);
    if (shopifyResourcesMatch) {
      const [, projectId, resourceId, operation] = shopifyResourcesMatch; const actor = await requireActor(request);
      if (!resourceId && request.method === 'GET') return { value: await services.shopify.listResources({ userId: actor.user.id, projectId, connectionId: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('connection_id'), resourceType: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('type') }) };
      if (resourceId && operation === 'approval' && request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.decideResource({ userId: actor.user.id, projectId, resourceId, status: body.status, note: body.note }) }; }
      if (resourceId && operation === 'revoke' && request.method === 'POST') { requireCsrf(request); return { value: await services.shopify.revokeResource({ userId: actor.user.id, projectId, resourceId, note: body.note }) }; }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyPreviewMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/preview$/);
    if (shopifyPreviewMatch) {
      const [, projectId] = shopifyPreviewMatch; const actor = await requireProjectActor(request, projectId);
      if (request.method === 'GET' || request.method === 'POST') {
        if (request.method === 'POST') requireCsrf(request);
        const guard = services.merchantFlow?.resolveDirectShopifyPreview;
        if (services.merchantFlowBetaEnabled === true && typeof guard !== 'function') {
          throw new DashboardError('merchant_flow_preview_binding_unavailable', 'The controlled storefront preview is unavailable.', 503);
        }
        const controlled = typeof guard === 'function'
          ? await guard.call(services.merchantFlow, {
            userId: actor.user.id,
            projectId,
            operation: request.method === 'POST' ? 'prepare' : 'read',
            generatedBuildId: request.method === 'POST' ? body.generated_build_id : null
          })
          : null;
        if (controlled?.applies === true) return { value: controlled.result };
        if (request.method === 'GET') return { value: await services.shopify.previewStatus({ userId: actor.user.id, projectId }) };
        return { value: await services.shopify.preparePreview({ userId: actor.user.id, projectId, generatedBuildId: body.generated_build_id }) };
      }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const shopifyPreviewEligibilityMatch = pathname.match(/^\/api\/projects\/([^/]+)\/shopify\/preview\/eligibility$/);
    if (shopifyPreviewEligibilityMatch) {
      const [, projectId] = shopifyPreviewEligibilityMatch; const actor = await requireActor(request);
      if (request.method === 'GET') return { value: await services.shopify.previewEligibility({ userId: actor.user.id, projectId, resourceId: new URL(request.url, `http://${request.headers.host || 'localhost'}`).searchParams.get('resource_id') }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const customThemeArtifactMatch = pathname.match(/^\/api\/projects\/([^/]+)\/custom-theme\/orders\/([^/]+)\/artifacts\/(theme-zip|theme-specification|validation-report|package-manifest|generation-metadata)$/);
    if (customThemeArtifactMatch) {
      const [, projectId, orderId, artifact] = customThemeArtifactMatch;
      const actor = await requireActor(request);
      if (request.method !== 'GET') throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      const result = await services.customThemes.readArtifact({ userId: actor.user.id, projectId, orderId, artifact });
      return { themeArtifact: { filename: result.filename, contentType: result.content_type, buffer: result.buffer } };
    }
    const merchantFlowOperatorMatch = pathname.match(/^\/api\/projects\/([^/]+)\/merchant-generation-flow\/operator\/(readiness|readiness\/refresh|recover-qa-review-evidence|recover-preview-provenance|succeed-render-target|qa-review|repair-resolution|cancel)$/);
    if (merchantFlowOperatorMatch) {
      const [, projectId, operation] = merchantFlowOperatorMatch;
      if ((operation === 'readiness' && request.method === 'GET') || operation === 'readiness/refresh' || operation === 'recover-preview-provenance' || operation === 'succeed-render-target') embeddedRequest(request, { required: true });
      const actor = await requireProjectActor(request, projectId);
      if (operation === 'readiness' && request.method === 'GET') {
        return { value: await services.merchantFlow.operatorReadiness({ projectId, userId: actor.user.id, readinessLoader: services.controlledBetaReadiness }) };
      }
      if (operation === 'readiness/refresh' && request.method === 'POST') {
        requireCsrf(request);
        return {
          status: 202,
          value: await services.merchantFlow.operatorReadinessRefresh({
            projectId,
            userId: actor.user.id,
            refresh: services.requestControlledBetaReadinessRefresh
          })
        };
      }
      if (operation.startsWith('readiness')) throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      if (request.method !== 'POST') throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      requireCsrf(request);
      if (operation === 'recover-qa-review-evidence') {
        if (body.target_state !== undefined || body.next_state !== undefined || body.recovered_json !== undefined || body.review_body !== undefined) {
          throw new DashboardError('merchant_flow_founder_qa_recovery_request_invalid', 'Evidence recovery cannot accept replacement review content or a flow transition.', 422);
        }
        return {
          value: await services.merchantFlow.recoverQaReviewEvidence({
            projectId,
            userId: actor.user.id,
            flowId: body.flow_id,
            request: body
          })
        };
      }
      if (operation === 'recover-preview-provenance') {
        const forbidden = ['source_revision', 'artifact_source_revision', 'render_source_revision', 'binding_source_revision', 'recovery_source_revision', 'historical_render_source_revision', 'target_state', 'next_state'];
        if (forbidden.some((key) => body[key] !== undefined)) {
          throw new DashboardError(
            'merchant_flow_preview_provenance_recovery_request_invalid',
            'Preview recovery cannot accept source identity or a flow transition.',
            422,
            { category: 'request_invalid', stage: 'request_validation', retryable: false, recovery: 'refresh_required', request_id: requestId }
          );
        }
        return {
          value: await services.merchantFlow.recoverPreviewProvenance({
            projectId,
            userId: actor.user.id,
            request: body,
            requestId
          })
        };
      }
      if (operation === 'succeed-render-target') {
        const forbidden = [
          'old_theme_id', 'prior_theme_id', 'new_theme_id', 'successor_theme_id', 'theme_id', 'theme_gid',
          'main_theme_id', 'render_targets', 'target', 'prior_target', 'successor_target', 'source', 'source_revision',
          'configuration', 'configuration_checksum', 'readiness', 'operator', 'actor_user_id', 'successor_job',
          'target_state', 'next_state', 'evidence'
        ];
        if (forbidden.some((key) => body[key] !== undefined)) {
          throw new DashboardError('merchant_flow_render_target_succession_submission_invalid', 'Preview-target revalidation accepts only the current server-issued action.', 422);
        }
        return {
          value: await services.merchantFlow.succeedRenderTarget({
            projectId,
            userId: actor.user.id,
            request: body
          })
        };
      }
      if (body.target_state !== undefined || body.next_state !== undefined) throw new DashboardError('merchant_flow_operator_operation_invalid', 'Operator decisions cannot select an arbitrary flow state.', 422);
      const operationKinds = { 'qa-review': 'qa_review', 'repair-resolution': 'repair_resolution', cancel: 'cancel' };
      const operationKind = operationKinds[operation];
      if (!operationKind) throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      const operatorRequest = {
        contract_version: 'merchant-flow-operator-operation-v1',
        operation_kind: operationKind,
        idempotency_key: request.headers['idempotency-key'] || body.idempotency_key,
        expected_flow_sequence: body.expected_flow_sequence,
        expected_flow_checksum: body.expected_flow_checksum,
        evidence: body.evidence,
        decision: operationKind === 'cancel' ? null : body.decision
      };
      if (operationKind === 'qa_review') return { value: await services.merchantFlow.applyQaReview({ projectId, userId: actor.user.id, flowId: body.flow_id, request: operatorRequest }) };
      if (operationKind === 'repair_resolution') return { value: await services.merchantFlow.applyRepairResolution({ projectId, userId: actor.user.id, flowId: body.flow_id, request: operatorRequest }) };
      if (operationKind === 'cancel') return { value: await services.merchantFlow.cancel({ projectId, userId: actor.user.id, flowId: body.flow_id, request: operatorRequest }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const merchantFlowMatch = pathname.match(/^\/api\/projects\/([^/]+)\/merchant-generation-flow(?:\/(start|answer|resume))?$/);
    if (merchantFlowMatch) {
      const [, projectId, operation] = merchantFlowMatch;
      const actor = await requireProjectActor(request, projectId);
      if (!operation && request.method === 'GET') return { value: await services.merchantFlow.status({ userId: actor.user.id, projectId }) };
      requireCsrf(request);
      if (operation === 'start' && request.method === 'POST') return { value: await services.merchantFlow.start({ userId: actor.user.id, projectId }) };
      if (operation === 'answer' && request.method === 'POST') return { value: await services.merchantFlow.answer({ userId: actor.user.id, projectId, flowId: body.flow_id, questionId: body.question_id, message: body.message, expectedFlowChecksum: body.expected_flow_checksum || null }) };
      if (operation === 'resume' && request.method === 'POST') return { value: await services.merchantFlow.resume({
        userId: actor.user.id,
        projectId,
        flowId: body.flow_id,
        expectedFlowChecksum: body.expected_flow_checksum || null,
        expectedFlowSequence: body.expected_flow_sequence,
        idempotencyKey: request.headers['idempotency-key'] || body.idempotency_key || null,
        requestId
      }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const analysisFirstExperienceMatch = pathname.match(/^\/api\/projects\/([^/]+)\/analysis-first-experience(?:\/(direction|telemetry))?$/);
    if (analysisFirstExperienceMatch) {
      const [, projectId, operation] = analysisFirstExperienceMatch;
      embeddedRequest(request, { required: true });
      const actor = await requireProjectActor(request, projectId);
      if (!operation && request.method === 'GET') {
        return { value: await services.analysisFirstExperience.project({ userId: actor.user.id, projectId }) };
      }
      requireCsrf(request);
      if (operation === 'direction' && request.method === 'POST') {
        return { value: await services.analysisFirstExperience.selectDirection({
          userId: actor.user.id,
          projectId,
          directionId: body.direction_id,
          actionBinding: body.action_binding
        }) };
      }
      if (operation === 'telemetry' && request.method === 'POST') {
        return { value: await services.analysisFirstExperience.telemetry({ userId: actor.user.id, projectId, input: body }) };
      }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const customThemeOrderMatch = pathname.match(/^\/api\/projects\/([^/]+)\/custom-theme\/orders(?:\/([^/]+)(?:\/(payment|verify|generate))?)?$/);
    if (customThemeOrderMatch) {
      const [, projectId, orderId, operation] = customThemeOrderMatch;
      const actor = await requireActor(request);
      if (!orderId && request.method === 'GET') return { value: await services.customThemes.latest({ userId: actor.user.id, projectId }) };
      if (!orderId && request.method === 'POST') {
        requireCsrf(request);
        if (!/^[a-f0-9]{64}$/.test(String(body.expected_readiness_token || ''))) throw new DashboardError('custom_theme_readiness_required', 'Review the current storefront direction before generating.', 409);
        return { value: await services.customThemes.createOrder({ userId: actor.user.id, projectId, idempotencyKey: request.headers['idempotency-key'] || body.idempotency_key, expectedReadinessToken: body.expected_readiness_token, requestId }) };
      }
      if (orderId && !operation && request.method === 'GET') return { value: await services.customThemes.order({ userId: actor.user.id, projectId, orderId }) };
      if (orderId && operation === 'payment' && request.method === 'POST') {
        requireCsrf(request);
        return { value: await services.customThemes.confirmDevelopmentPayment({ userId: actor.user.id, projectId, orderId, idempotencyKey: request.headers['idempotency-key'] || body.idempotency_key }) };
      }
      if (orderId && operation === 'verify' && request.method === 'POST') {
        requireCsrf(request);
        return { value: await services.customThemes.verifyPayment({ userId: actor.user.id, projectId, orderId, idempotencyKey: request.headers['idempotency-key'] || body.idempotency_key, requestId }) };
      }
      if (orderId && operation === 'generate' && request.method === 'POST') {
        requireCsrf(request);
        return { value: await services.customThemes.retryGeneration({ userId: actor.user.id, projectId, orderId, requestId }) };
      }
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const customThemeEligibilityMatch = pathname.match(/^\/api\/projects\/([^/]+)\/custom-theme\/(eligibility|offer)$/);
    if (customThemeEligibilityMatch) {
      const [, projectId] = customThemeEligibilityMatch;
      const actor = await requireActor(request);
      if (request.method === 'GET') return { value: await services.customThemes.eligibility({ userId: actor.user.id, projectId }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const commercePlanMatch = pathname.match(/^\/api\/projects\/([^/]+)\/creative-director\/(cross-sell-products|product-bundle-showcase|shop-the-look|complementary-products-fallback)-plan(?:\/(regenerate|approve))?$/);
    if (commercePlanMatch) {
      const [, projectId, identity, operation] = commercePlanMatch; const actor = await requireActor(request); requireCsrf(request);
      const names = {
        'cross-sell-products': ['saveCrossSellProductsPlan','regenerateCrossSellProductsPlan','approveCrossSellProductsPlan'],
        'product-bundle-showcase': ['saveProductBundleShowcasePlan','regenerateProductBundleShowcasePlan','approveProductBundleShowcasePlan'],
        'shop-the-look': ['saveShopTheLookPlan','regenerateShopTheLookPlan','approveShopTheLookPlan'],
        'complementary-products-fallback': ['saveComplementaryProductsFallbackPlan','regenerateComplementaryProductsFallbackPlan','approveComplementaryProductsFallbackPlan']
      }[identity];
      if (!operation && request.method === 'PUT') return { value: await services.creativeDirector[names[0]]({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, products: body.products, scene: body.scene || {} }) };
      if (operation === 'regenerate' && request.method === 'POST') return { value: await services.creativeDirector[names[1]]({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (operation === 'approve' && request.method === 'POST') return { value: await services.creativeDirector[names[2]]({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const creativeDirectorMatch = pathname.match(/^\/api\/projects\/([^/]+)\/creative-director(?:\/(start|restart|respond|correct|brief|approve-brief|request-brief-revision|recommendation|approve-strategy|preset-selection|approve-preset|resources|editorial-grid-plan|regenerate-editorial-grid-plan|approve-editorial-grid-plan|lookbook-plan|regenerate-lookbook-plan|approve-lookbook-plan|craftsmanship-plan|regenerate-craftsmanship-plan|approve-craftsmanship-plan|manufacturing-process-plan|regenerate-manufacturing-process-plan|approve-manufacturing-process-plan|brand-timeline-plan|regenerate-brand-timeline-plan|approve-brand-timeline-plan|sustainability-plan|regenerate-sustainability-plan|approve-sustainability-plan|team-plan|regenerate-team-plan|approve-team-plan|awards-certifications-plan|regenerate-awards-certifications-plan|approve-awards-certifications-plan|generate|stage))?$/);
    if (creativeDirectorMatch) {
      const [, projectId, creativeDirectorAction] = creativeDirectorMatch;
      const actor = await requireActor(request);
      if (!creativeDirectorAction && request.method === 'GET') return { value: await services.creativeDirector.load({ userId: actor.user.id, projectId }) };
      if (!creativeDirectorAction) throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      requireCsrf(request);
      if (creativeDirectorAction === 'start' && request.method === 'POST') return { value: await services.creativeDirector.start({ userId: actor.user.id, projectId }) };
      if (creativeDirectorAction === 'restart' && request.method === 'POST') return { value: await services.creativeDirector.start({ userId: actor.user.id, projectId, restart: true }) };
      if (creativeDirectorAction === 'respond' && request.method === 'POST') {
        if (typeof body.conversation_id !== 'string' || !body.conversation_id.trim() || typeof body.expected_session_updated_at !== 'string' || !body.expected_session_updated_at.trim()) {
          throw new DashboardError('creative_director_answer_binding_required', 'Reload the conversation before sending that answer.', 422);
        }
        return { value: await services.creativeDirector.respond({
          userId: actor.user.id,
          projectId,
          message: body.message,
          conversationId: body.conversation_id,
          expectedSessionUpdatedAt: body.expected_session_updated_at
        }) };
      }
      if (creativeDirectorAction === 'correct' && request.method === 'POST') return { value: await services.creativeDirector.correctUnderstanding({ userId: actor.user.id, projectId, path: body.path, value: body.value }) };
      if (creativeDirectorAction === 'brief' && request.method === 'POST') return { value: await services.creativeDirector.createBrief({ userId: actor.user.id, projectId }) };
      if (creativeDirectorAction === 'approve-brief' && request.method === 'POST') return { value: await services.creativeDirector.approveBrief({ userId: actor.user.id, projectId }) };
      if (creativeDirectorAction === 'request-brief-revision' && request.method === 'POST') return { value: await services.creativeDirector.requestBriefRevision({ userId: actor.user.id, projectId, comment: body.comment }) };
      if (creativeDirectorAction === 'recommendation' && request.method === 'POST') return { value: await services.creativeDirector.decideRecommendation({ userId: actor.user.id, projectId, recommendationPath: body.recommendation_path, status: body.status, comment: body.comment }) };
      if (creativeDirectorAction === 'approve-strategy' && request.method === 'POST') return { value: await services.creativeDirector.approveStrategy({ userId: actor.user.id, projectId }) };
      if (creativeDirectorAction === 'preset-selection' && request.method === 'PUT') return { value: await services.creativeDirector.selectPreset({ userId: actor.user.id, projectId, presetId: body.preset_id, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-preset' && request.method === 'POST') return { value: await services.creativeDirector.approvePreset({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'resources' && request.method === 'POST') return { value: await services.creativeDirector.updateResources({ userId: actor.user.id, projectId, assetSelections: body.asset_selections, requiredAssetSelections: body.required_asset_selections, shopifySelections: body.shopify_selections, resolvedEmptyFields: body.resolved_empty_fields, confirmedRequiredConfirmations: body.confirmed_required_confirmations, expectedResourceDecisionChecksum: body.expected_resource_decision_checksum }) };
      if (creativeDirectorAction === 'editorial-grid-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveEditorialGridPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, stories: body.stories }) };
      if (creativeDirectorAction === 'regenerate-editorial-grid-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateEditorialGridPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-editorial-grid-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveEditorialGridPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'lookbook-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveLookbookPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, frames: body.frames }) };
      if (creativeDirectorAction === 'regenerate-lookbook-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateLookbookPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-lookbook-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveLookbookPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'craftsmanship-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveCraftsmanshipPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, steps: body.steps }) };
      if (creativeDirectorAction === 'regenerate-craftsmanship-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateCraftsmanshipPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-craftsmanship-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveCraftsmanshipPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'manufacturing-process-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveManufacturingProcessPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, steps: body.steps }) };
      if (creativeDirectorAction === 'regenerate-manufacturing-process-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateManufacturingProcessPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-manufacturing-process-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveManufacturingProcessPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'brand-timeline-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveBrandTimelinePlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, milestones: body.milestones }) };
      if (creativeDirectorAction === 'regenerate-brand-timeline-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateBrandTimelinePlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-brand-timeline-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveBrandTimelinePlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'sustainability-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveSustainabilityPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, initiatives: body.initiatives }) };
      if (creativeDirectorAction === 'regenerate-sustainability-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateSustainabilityPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-sustainability-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveSustainabilityPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'team-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveTeamPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, members: body.members }) };
      if (creativeDirectorAction === 'regenerate-team-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateTeamPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-team-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveTeamPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'awards-certifications-plan' && request.method === 'PUT') return { value: await services.creativeDirector.saveAwardsCertificationsPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version, recognitions: body.recognitions }) };
      if (creativeDirectorAction === 'regenerate-awards-certifications-plan' && request.method === 'POST') return { value: await services.creativeDirector.regenerateAwardsCertificationsPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'approve-awards-certifications-plan' && request.method === 'POST') return { value: await services.creativeDirector.approveAwardsCertificationsPlan({ userId: actor.user.id, projectId, expectedVersion: body.expected_version }) };
      if (creativeDirectorAction === 'generate' && request.method === 'POST') return { value: await services.creativeDirector.generate({ userId: actor.user.id, projectId }) };
      if (creativeDirectorAction === 'stage' && request.method === 'POST') return { value: await services.creativeDirector.setStage({ userId: actor.user.id, projectId, stage: body.stage }) };
      throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
    }
    const interviewMatch = pathname.match(/^\/api\/projects\/([^/]+)\/interview(?:\/(create|resume|inspect|validate|save|position|preview|complete|abandon))?$/);
    if (interviewMatch) {
      const [, projectId, interviewAction] = interviewMatch;
      const actor = await requireActor(request);
      if (!interviewAction && request.method === 'GET') return { value: await services.interview.load({ userId: actor.user.id, projectId }) };
      if (!interviewAction) throw new DashboardError('method_not_allowed', 'Method not allowed.', 405);
      requireCsrf(request);
      if (interviewAction === 'create') return { value: await services.interview.create({ userId: actor.user.id, projectId }) };
      if (interviewAction === 'resume') return { value: await services.interview.resume({ userId: actor.user.id, projectId }) };
      if (interviewAction === 'inspect') return { value: await services.interview.inspect({ userId: actor.user.id, projectId, answers: body.answers }) };
      if (interviewAction === 'validate') return { value: await services.interview.validate({ userId: actor.user.id, projectId, answers: body.answers, requireComplete: Boolean(body.require_complete) }) };
      if (interviewAction === 'save') return { value: await services.interview.save({ userId: actor.user.id, projectId, answerPatch: body.answer_patch, activeCategoryId: body.active_category_id }) };
      if (interviewAction === 'position') return { value: await services.interview.setActiveCategory({ userId: actor.user.id, projectId, activeCategoryId: body.active_category_id }) };
      if (interviewAction === 'preview') return { value: await services.interview.preview({ userId: actor.user.id, projectId }) };
      if (interviewAction === 'complete') return { value: await services.interview.complete({ userId: actor.user.id, projectId }) };
      if (interviewAction === 'abandon') return { value: await services.interview.abandon({ userId: actor.user.id, projectId }) };
    }
    return null;
  }
  return async function handleDashboardApi(request, response) {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    if (!url.pathname.startsWith('/api/')) return false;
    const incomingRequestId = String(request.headers['x-request-id'] || '');
    const requestId = /^[A-Za-z0-9_-]{8,120}$/.test(incomingRequestId) ? incomingRequestId : `req_${crypto.randomUUID()}`;
    if (typeof response.setHeader === 'function') response.setHeader('x-request-id', requestId);
    try {
      // Shopify signs the exact raw payload. This route deliberately bypasses
      // JSON parsing, dashboard cookies, and CSRF because Shopify is the
      // authenticated caller; the webhook HMAC is verified server-side.
      if (url.pathname === '/api/shopify/webhooks' && request.method === 'POST') {
        const rawBody = await readBody(request, MAX_WEBHOOK_BODY_BYTES);
        const result = await services.shopify.processWebhook({ rawBody, headers: request.headers });
        sendJson(response, 200, { ok: true, result });
        return true;
      }
      const isMultipart = String(request.headers['content-type'] || '').toLowerCase().startsWith('multipart/form-data');
      const body = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) ? (isMultipart ? await parseMultipart(request) : await parseBody(request)) : {};
      const result = await action(request, body, url.pathname, requestId);
      if (!result) { sendJson(response, 404, { ok: false, error: { code: 'route_not_found', message: 'API route not found.' } }); return true; }
      if (result.redirect) { sendRedirect(response, result.redirect); return true; }
      if (result.asset) { sendAsset(response, result.asset); return true; }
      if (result.themeArtifact) { sendThemeArtifact(response, result.themeArtifact); return true; }
      sendJson(response, result.status || 200, { ok: true, result: sanitizeCreativeDirectorPayload(result.value) }, { cookies: result.cookies });
    } catch (error) {
      const normalized = error instanceof DashboardError ? error : new DashboardError('dashboard_unavailable', 'The dashboard service is unavailable.', 500);
      const retryEmbeddedSession = normalized.code === 'shopify_embedded_session_expired';
      if (retryEmbeddedSession && typeof response.setHeader === 'function') response.setHeader('x-shopify-retry-invalid-session-request', '1');
      sendJson(response, normalized.status, { ok: false, error: { code: normalized.code, message: normalized.message, ...(normalized.details ? { details: normalized.details } : {}) } });
    }
    return true;
  };
}

module.exports = { createDashboardApiHandler, parseCookies, cookie, embeddedCookieContext, publicContentPlanProjection, sanitizeCreativeDirectorPayload, SESSION_COOKIE, CSRF_COOKIE, parseMultipart };
