export class DashboardApiError extends Error {
  constructor(message, code = 'dashboard_api_error', status = 0, details = null) {
    super(message);
    this.name = 'DashboardApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class DashboardApiClient {
  constructor({ baseUrl = '', fetchImpl = globalThis.fetch?.bind(globalThis) } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.csrfToken = null;
    // Shopify supplies this signed Admin context only on the first embedded
    // frame URL. Retain it before client-side routing removes the query so a
    // later OAuth callback can safely return to this exact Shopify Admin app.
    this.embeddedHost = typeof globalThis.window === 'undefined' ? null : new URLSearchParams(globalThis.window.location?.search || '').get('host');
  }

  isEmbedded() {
    if (typeof globalThis.window === 'undefined') return false;
    if (typeof globalThis.window.shopify?.idToken === 'function') return true;
    const parameters = new URLSearchParams(globalThis.window.location?.search || '');
    return parameters.get('embedded') === '1' || (parameters.has('host') && parameters.has('shop'));
  }

  async ensureCsrf() {
    if (this.isEmbedded()) return null;
    if (this.csrfToken) return this.csrfToken;
    const response = await this.fetchImpl(`${this.baseUrl}/api/auth/csrf`, { credentials: 'include', headers: { accept: 'application/json' } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok || !payload.result?.csrf_token) throw new DashboardApiError(payload?.error?.message || 'Unable to establish a secure session.', payload?.error?.code, response.status);
    this.csrfToken = payload.result.csrf_token;
    return this.csrfToken;
  }

  async embeddedSessionHeaders() {
    try {
      const idToken = globalThis.window?.shopify?.idToken;
      if (typeof idToken !== 'function') return {};
      const token = await idToken();
      return typeof token === 'string' && token.length > 0 ? { authorization: `Bearer ${token}` } : {};
    } catch {
      // A dashboard account session remains the authorization boundary. Do not
      // retain or surface an App Bridge token when an embedded context is not ready.
      return {};
    }
  }

  async request(path, { method = 'GET', body, csrf = false, extraHeaders = {}, includeHttpStatus = false } = {}) {
    const headers = { accept: 'application/json', ...(await this.embeddedSessionHeaders()), ...extraHeaders };
    if (body !== undefined) headers['content-type'] = 'application/json';
    const csrfToken = csrf ? await this.ensureCsrf() : null;
    if (csrfToken) headers['x-csrf-token'] = csrfToken;
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { method, headers, credentials: 'include', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new DashboardApiError(payload?.error?.message || 'Dashboard service is unavailable.', payload?.error?.code, response.status, payload?.error?.details || null);
    if (includeHttpStatus && payload.result && typeof payload.result === 'object' && !Array.isArray(payload.result)) {
      return { http_status: response.status, ...payload.result };
    }
    return payload.result;
  }

  async requestForm(path, formData) {
    const csrfToken = await this.ensureCsrf();
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, { method: 'POST', headers: { accept: 'application/json', ...(await this.embeddedSessionHeaders()), ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) }, credentials: 'include', body: formData });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new DashboardApiError(payload?.error?.message || 'The file could not be uploaded.', payload?.error?.code, response.status, payload?.error?.details || null);
    return payload.result;
  }

  bootstrapEmbedded(projectId = null) {
    return this.request('/api/auth/embedded', { method: 'POST', body: projectId ? { project_id: projectId } : {} });
  }

  signUp(input) { return this.request('/api/auth/sign-up', { method: 'POST', body: input, csrf: true }); }
  signIn(input) { return this.request('/api/auth/sign-in', { method: 'POST', body: input, csrf: true }); }
  signOut() { return this.request('/api/auth/sign-out', { method: 'POST', body: {}, csrf: true }); }
  me() { return this.request('/api/auth/me'); }
  overview() { return this.request('/api/dashboard/overview'); }
  createProject(input) { return this.request('/api/projects', { method: 'POST', body: input, csrf: true }); }
  project(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}`); }
  account() { return this.request('/api/account'); }
  updateAccount(input) { return this.request('/api/account', { method: 'PUT', body: input, csrf: true }); }
  updateOrganization(input) { return this.request('/api/settings/organization', { method: 'PUT', body: input, csrf: true }); }
  preferences() { return this.request('/api/settings/preferences'); }
  updatePreferences(input) { return this.request('/api/settings/preferences', { method: 'PUT', body: input, csrf: true }); }

  interview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview`); }
  createInterview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/create`, { method: 'POST', body: {}, csrf: true }); }
  resumeInterview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/resume`, { method: 'POST', body: {}, csrf: true }); }
  inspectInterview(projectId, answers) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/inspect`, { method: 'POST', body: { answers }, csrf: true }); }
  validateInterview(projectId, answers, requireComplete) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/validate`, { method: 'POST', body: { answers, require_complete: requireComplete }, csrf: true }); }
  saveInterview(projectId, answerPatch, activeCategoryId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/save`, { method: 'POST', body: { answer_patch: answerPatch, active_category_id: activeCategoryId }, csrf: true }); }
  saveInterviewPosition(projectId, activeCategoryId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/position`, { method: 'POST', body: { active_category_id: activeCategoryId }, csrf: true }); }
  previewInterview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/preview`, { method: 'POST', body: {}, csrf: true }); }
  completeInterview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/complete`, { method: 'POST', body: {}, csrf: true }); }
  abandonInterview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/interview/abandon`, { method: 'POST', body: {}, csrf: true }); }

  creativeDirector(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director`); }
  startCreativeDirector(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/start`, { method: 'POST', body: {}, csrf: true }); }
  restartCreativeDirector(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/restart`, { method: 'POST', body: {}, csrf: true }); }
  respondCreativeDirector(projectId, message, { conversationId, expectedSessionUpdatedAt } = {}) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/respond`, {
      method: 'POST',
      body: { message, conversation_id: conversationId, expected_session_updated_at: expectedSessionUpdatedAt },
      csrf: true
    });
  }
  correctCreativeDirector(projectId, path, value) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/correct`, { method: 'POST', body: { path, value }, csrf: true }); }
  createCreativeBrief(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/brief`, { method: 'POST', body: {}, csrf: true }); }
  approveCreativeBrief(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-brief`, { method: 'POST', body: {}, csrf: true }); }
  requestCreativeBriefRevision(projectId, comment = '') { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/request-brief-revision`, { method: 'POST', body: { comment }, csrf: true }); }
  reviewCreativeRecommendation(projectId, recommendationPath, status, comment = '') { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/recommendation`, { method: 'POST', body: { recommendation_path: recommendationPath, status, comment }, csrf: true }); }
  approveStoreStrategy(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-strategy`, { method: 'POST', body: {}, csrf: true }); }
  selectStorefrontPreset(projectId, expectedVersion, presetId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/preset-selection`, { method: 'PUT', body: { expected_version: expectedVersion, preset_id: presetId }, csrf: true }); }
  approveStorefrontPreset(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-preset`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  updateCreativeResources(projectId, assetSelections, requiredAssetSelections, shopifySelections, resolvedEmptyFields, confirmedRequiredConfirmations = [], expectedResourceDecisionChecksum = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/resources`, { method: 'POST', body: { asset_selections: assetSelections, required_asset_selections: requiredAssetSelections, shopify_selections: shopifySelections, resolved_empty_fields: resolvedEmptyFields, confirmed_required_confirmations: confirmedRequiredConfirmations, expected_resource_decision_checksum: expectedResourceDecisionChecksum }, csrf: true }); }
  saveEditorialGridPlan(projectId, expectedVersion, stories) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/editorial-grid-plan`, { method: 'PUT', body: { expected_version: expectedVersion, stories }, csrf: true }); }
  regenerateEditorialGridPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-editorial-grid-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveEditorialGridPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-editorial-grid-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveLookbookPlan(projectId, expectedVersion, frames) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/lookbook-plan`, { method: 'PUT', body: { expected_version: expectedVersion, frames }, csrf: true }); }
  regenerateLookbookPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-lookbook-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveLookbookPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-lookbook-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveCraftsmanshipPlan(projectId, expectedVersion, steps) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/craftsmanship-plan`, { method: 'PUT', body: { expected_version: expectedVersion, steps }, csrf: true }); }
  regenerateCraftsmanshipPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-craftsmanship-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveCraftsmanshipPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-craftsmanship-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveManufacturingProcessPlan(projectId, expectedVersion, steps) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/manufacturing-process-plan`, { method: 'PUT', body: { expected_version: expectedVersion, steps }, csrf: true }); }
  regenerateManufacturingProcessPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-manufacturing-process-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveManufacturingProcessPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-manufacturing-process-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveBrandTimelinePlan(projectId, expectedVersion, milestones) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/brand-timeline-plan`, { method: 'PUT', body: { expected_version: expectedVersion, milestones }, csrf: true }); }
  regenerateBrandTimelinePlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-brand-timeline-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveBrandTimelinePlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-brand-timeline-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveSustainabilityPlan(projectId, expectedVersion, initiatives) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/sustainability-plan`, { method: 'PUT', body: { expected_version: expectedVersion, initiatives }, csrf: true }); }
  regenerateSustainabilityPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-sustainability-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveSustainabilityPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-sustainability-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveTeamPlan(projectId, expectedVersion, members) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/team-plan`, { method: 'PUT', body: { expected_version: expectedVersion, members }, csrf: true }); }
  regenerateTeamPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-team-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveTeamPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-team-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveAwardsCertificationsPlan(projectId, expectedVersion, recognitions) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/awards-certifications-plan`, { method: 'PUT', body: { expected_version: expectedVersion, recognitions }, csrf: true }); }
  regenerateAwardsCertificationsPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/regenerate-awards-certifications-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  approveAwardsCertificationsPlan(projectId, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/approve-awards-certifications-plan`, { method: 'POST', body: { expected_version: expectedVersion }, csrf: true }); }
  saveCommercePlan(projectId, identity, expectedVersion, products, scene = {}) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/${identity}-plan`, { method:'PUT', body:{expected_version:expectedVersion,products,scene}, csrf:true }); }
  regenerateCommercePlan(projectId, identity, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/${identity}-plan/regenerate`, { method:'POST', body:{expected_version:expectedVersion}, csrf:true }); }
  approveCommercePlan(projectId, identity, expectedVersion) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/${identity}-plan/approve`, { method:'POST', body:{expected_version:expectedVersion}, csrf:true }); }
  generateCreativeStorefront(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/generate`, { method: 'POST', body: {}, csrf: true }); }
  setCreativeDirectorStage(projectId, stage) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-director/stage`, { method: 'POST', body: { stage }, csrf: true }); }

  customThemeEligibility(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/eligibility`); }
  customThemeOrder(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders`); }
  createCustomThemeOrder(projectId, idempotencyKey, readinessToken) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders`, { method: 'POST', body: { idempotency_key: idempotencyKey, expected_readiness_token: readinessToken }, csrf: true, extraHeaders: { 'idempotency-key': idempotencyKey } });
  }
  confirmDevelopmentCustomThemePayment(projectId, orderId, idempotencyKey) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders/${encodeURIComponent(orderId)}/payment`, { method: 'POST', body: { idempotency_key: idempotencyKey }, csrf: true, extraHeaders: { 'idempotency-key': idempotencyKey } });
  }
  verifyCustomThemePayment(projectId, orderId, idempotencyKey) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders/${encodeURIComponent(orderId)}/verify`, { method: 'POST', body: { idempotency_key: idempotencyKey }, csrf: true, extraHeaders: { 'idempotency-key': idempotencyKey } });
  }
  retryCustomThemeGeneration(projectId, orderId) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders/${encodeURIComponent(orderId)}/generate`, { method: 'POST', body: {}, csrf: true });
  }
  merchantGenerationFlow(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow`); }
  analysisFirstExperience(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/analysis-first-experience`); }
  selectAnalysisFirstDirection(projectId, directionId, actionBinding) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/analysis-first-experience/direction`, {
      method: 'POST',
      body: { direction_id: directionId, action_binding: actionBinding },
      csrf: true
    });
  }
  recordAnalysisFirstTelemetry(projectId, input) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/analysis-first-experience/telemetry`, {
      method: 'POST', body: input, csrf: true
    });
  }
  merchantGenerationFlowOperatorReadiness(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/readiness`, { includeHttpStatus: true }); }
  merchantGenerationFlowOperatorReadinessRefresh(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/readiness/refresh`, { method: 'POST', body: {}, csrf: true, includeHttpStatus: true }); }
  merchantGenerationFlowOperatorQaReview(projectId, submission) {
    const idempotencyKey = String(submission?.idempotency_key || '');
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/qa-review`, {
      method: 'POST',
      body: {
        flow_id: submission?.flow_id,
        expected_flow_sequence: submission?.expected_flow_sequence,
        expected_flow_checksum: submission?.expected_flow_checksum,
        evidence: submission?.evidence,
        decision: submission?.decision,
        idempotency_key: idempotencyKey
      },
      csrf: true,
      extraHeaders: { 'idempotency-key': idempotencyKey }
    });
  }
  merchantGenerationFlowOperatorRecoverQaReviewEvidence(projectId, submission) {
    const idempotencyKey = String(submission?.idempotency_key || '');
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/recover-qa-review-evidence`, {
      method: 'POST',
      body: submission,
      csrf: true,
      extraHeaders: { 'idempotency-key': idempotencyKey }
    });
  }
  merchantGenerationFlowOperatorRecoverPreviewProvenance(projectId, submission) {
    const idempotencyKey = String(submission?.idempotency_key || '');
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/recover-preview-provenance`, {
      method: 'POST', body: submission, csrf: true, extraHeaders: { 'idempotency-key': idempotencyKey }
    });
  }
  merchantGenerationFlowOperatorSucceedRenderTarget(projectId, submission) {
    const idempotencyKey = String(submission?.idempotency_key || '');
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/operator/succeed-render-target`, {
      method: 'POST',
      body: {
        contract_version: submission?.contract_version,
        flow_id: submission?.flow_id,
        expected_flow_sequence: submission?.expected_flow_sequence,
        expected_flow_checksum: submission?.expected_flow_checksum,
        idempotency_key: idempotencyKey
      },
      csrf: true,
      extraHeaders: { 'idempotency-key': idempotencyKey }
    });
  }
  startMerchantGenerationFlow(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/start`, { method: 'POST', body: {}, csrf: true }); }
  answerMerchantGenerationFlow(projectId, flowId, questionId, message, expectedFlowChecksum) {
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/answer`, { method: 'POST', body: { flow_id: flowId, question_id: questionId, message, expected_flow_checksum: expectedFlowChecksum }, csrf: true });
  }
  resumeMerchantGenerationFlow(projectId, flowId, expectedFlowChecksum, expectedFlowSequence) {
    const idempotencyKey = `merchant-flow-resume-${expectedFlowChecksum}`;
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-generation-flow/resume`, {
      method: 'POST',
      body: { flow_id: flowId, expected_flow_checksum: expectedFlowChecksum, expected_flow_sequence: expectedFlowSequence, idempotency_key: idempotencyKey },
      csrf: true,
      extraHeaders: { 'idempotency-key': idempotencyKey }
    });
  }
  async downloadCustomThemeArtifact(projectId, orderId, artifact) {
    const response = await this.fetchImpl(`${this.baseUrl}/api/projects/${encodeURIComponent(projectId)}/custom-theme/orders/${encodeURIComponent(orderId)}/artifacts/${encodeURIComponent(artifact)}`, {
      method: 'GET', headers: { ...(await this.embeddedSessionHeaders()) }, credentials: 'include'
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new DashboardApiError(payload?.error?.message || 'The storefront download is not available.', payload?.error?.code, response.status);
    }
    return { blob: await response.blob(), filename: response.headers.get('content-disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'calinium-storefront-artifact' };
  }

  assets(projectId, assetType = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/assets${assetType ? `?type=${encodeURIComponent(assetType)}` : ''}`); }
  uploadAsset(projectId, { file, assetType, displayTitle = '', altText = '', notes = '' }) {
    const formData = new FormData(); formData.append('file', file); formData.append('asset_type', assetType); formData.append('display_title', displayTitle); formData.append('alt_text', altText); formData.append('notes', notes);
    return this.requestForm(`/api/projects/${encodeURIComponent(projectId)}/assets/upload`, formData);
  }
  updateAsset(projectId, assetId, input) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`, { method: 'PUT', body: input, csrf: true }); }
  deleteAsset(projectId, assetId, confirmed = false) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE', body: { confirmed }, csrf: true }); }
  extractAssetPalette(projectId, assetId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/palette`, { method: 'POST', body: {}, csrf: true }); }
  categorizeShopifyFileCandidate(projectId, resourceId, assetCategory) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/assets/shopify-files/${encodeURIComponent(resourceId)}`, { method: 'PUT', body: { asset_category: assetCategory }, csrf: true }); }
  assetDownloadUrl(projectId, assetId) { return `${this.baseUrl}/api/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/download`; }

  startShopifyConnection(projectId, shopDomain, purpose = 'discovery') {
    const body = { shop_domain: shopDomain, purpose };
    if (this.embeddedHost) body.embedded_host = this.embeddedHost;
    return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connections/start`, { method: 'POST', body, csrf: true });
  }
  shopifyConnections(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connections`); }
  assignShopifyConnection(projectId, connectionId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connections`, { method: 'POST', body: { connection_id: connectionId }, csrf: true }); }
  shopifyConnection(projectId, connectionId = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connection${connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : ''}`); }
  checkShopifyConnection(projectId, connectionId = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connection/health`, { method: 'POST', body: { connection_id: connectionId }, csrf: true }); }
  syncShopifyResources(projectId, connectionId = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connection/sync`, { method: 'POST', body: { connection_id: connectionId }, csrf: true }); }
  merchantIntake(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-intake`); }
  refreshMerchantIntake(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/merchant-intake/refresh`, { method: 'POST', body: {}, csrf: true }); }
  livePreview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/live-preview`); }
  retryLivePreview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/live-preview/retry`, { method: 'POST', body: {}, csrf: true }); }
  recommendedResourceSet(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/recommended-resource-set`); }
  refreshRecommendedResourceSet(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/recommended-resource-set/refresh`, { method: 'POST', body: {}, csrf: true }); }
  approveRecommendedResourceSet(projectId, expectedRevisionId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/recommended-resource-set/approve`, { method: 'POST', body: { expected_revision_id: expectedRevisionId }, csrf: true }); }
  replaceRecommendedResource(projectId, expectedRevisionId, slotId, selectionId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/recommended-resource-set/slots/${encodeURIComponent(slotId)}/replace`, { method: 'POST', body: { expected_revision_id: expectedRevisionId, selection_id: selectionId }, csrf: true }); }
  creativeDirection(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-direction`); }
  refreshCreativeDirection(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-direction/refresh`, { method: 'POST', body: {}, csrf: true }); }
  approveCreativeDirection(projectId, recommendationRevisionId, designDnaRevisionId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/creative-direction/approve`, { method: 'POST', body: { expected_recommendation_revision_id: recommendationRevisionId, expected_design_dna_revision_id: designDnaRevisionId }, csrf: true }); }
  disconnectShopifyConnection(projectId, connectionId = null) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/connection/disconnect`, { method: 'POST', body: { connection_id: connectionId }, csrf: true }); }
  shopifyResources(projectId, { connectionId = null, resourceType = null } = {}) { const query = new URLSearchParams(); if (connectionId) query.set('connection_id', connectionId); if (resourceType) query.set('type', resourceType); return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/resources${query.size ? `?${query}` : ''}`); }
  decideShopifyResource(projectId, resourceId, status, note = '') { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/resources/${encodeURIComponent(resourceId)}/approval`, { method: 'POST', body: { status, note }, csrf: true }); }
  revokeShopifyResource(projectId, resourceId, note = '') { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/resources/${encodeURIComponent(resourceId)}/revoke`, { method: 'POST', body: { note }, csrf: true }); }
  prepareShopifyPreview(projectId, generatedBuildId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/preview`, { method: 'POST', body: { generated_build_id: generatedBuildId }, csrf: true }); }
  shopifyPreview(projectId) { return this.request(`/api/projects/${encodeURIComponent(projectId)}/shopify/preview`); }
}
