'use strict';

const crypto = require('crypto');
const { DashboardError } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { RENDERER_VERSION, digest, changedRegions, buildPreviewArtifact } = require('../../../../ai/live-preview/live-preview-engine');

const RUNTIME_CAPABILITY_VERSION = 'calinium-one-1.0';

function safeError() {
  return { code: 'preview_refresh_failed', message: "I couldn't refresh the preview just now. Your design decisions are saved, and you can retry without losing anything." };
}
function contentRevision(contentPlan) {
  if (contentPlan?.approved_revision_id) return contentPlan.approved_revision_id;
  const candidate = contentPlan?.craftsmanship;
  if (!candidate || candidate.status === 'not_required') return null;
  return candidate ? `${candidate.status || 'unknown'}:${candidate.candidate_version || 0}:${digest(candidate.steps || [])}` : null;
}
function trustedGeneratedBinding(order, inputIds) {
  const integrity = order?.validation_result?.artifact_integrity;
  const snapshot = order?.snapshot;
  if (!order || order.payment_status !== 'paid' || order.generation_status !== 'ready' || order.validation_result?.valid !== true) return null;
  if (!snapshot || snapshot.checksum !== order.snapshot_checksum || integrity?.version !== 1 || integrity.order_id !== order.id || !integrity.artifacts?.theme_zip || !integrity.artifacts?.package_manifest) return null;
  if (snapshot.approved_recommendation_revision?.candidate_revision_id !== inputIds.recommendationRevisionId) return null;
  if (snapshot.approved_design_dna_revision?.candidate_revision_id !== inputIds.dnaRevisionId) return null;
  if (snapshot.approved_resource_set_revision?.candidate_revision_id !== inputIds.resourceSetRevisionId) return null;
  if ((snapshot.approved_preset_revision?.revision_id || null) !== (inputIds.presetRevisionId || null)) return null;
  if ((snapshot.approved_block_plan_transport?.plan_revision?.revision_id || null) !== (inputIds.contentRevision || null)) return null;
  if (!/^[a-f0-9]{64}$/.test(String(integrity.artifacts.theme_zip.sha256 || ''))) return null;
  return {
    order_reference: order.id,
    generation_reference: integrity.generation_id,
    artifact_sha256: integrity.artifacts.theme_zip.sha256,
    manifest_sha256: integrity.artifacts.package_manifest.sha256,
    validated_at: order.generated_at
  };
}
function priceForProduct(product, records) {
  if (!product?.remote_gid) return null;
  const variant = records.find((item) => item.resource_type === 'variant' && item.metadata?.product_gid === product.remote_gid && item.metadata?.price?.amount);
  return variant ? { amount: String(variant.metadata.price.amount), currency_code: variant.metadata.price.currency_code || null } : null;
}

class LivePreviewService {
  constructor({ store, projectService, recommendedResourceSetService, recommendationDesignService, clock = () => new Date(), beforeBuild = null }) {
    this.store = store;
    this.projectService = projectService;
    this.recommendedResourceSetService = recommendedResourceSetService;
    this.recommendationDesignService = recommendationDesignService;
    this.clock = clock;
    this.beforeBuild = beforeBuild;
  }
  now() { return isoNow(this.clock); }
  async authorize({ userId, projectId }) {
    const project = await this.store.findProjectById(projectId);
    if (!project) throw new DashboardError('project_not_found', 'Project not found.', 404);
    await this.projectService.requireMembership(project.organization_id, userId, 'project:view');
    const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id);
    if (!assignment?.connection) return { project, assignment: null };
    return { project, assignment };
  }
  async resourceSlots({ project, assignment, resourceSetRevision }) {
    if (!resourceSetRevision) return [];
    const records = await this.store.listShopifyResources(assignment.connection.id);
    const output = [];
    for (const item of resourceSetRevision.slots || []) {
      const selected = item.selected;
      if (!selected) { output.push({ slot_id: item.slot_id, resource: null }); continue; }
      if (selected.source === 'shopify') {
        const resource = records.find((candidate) => candidate.id === selected.id);
        const current = resource && resource.availability_status === 'available' && resource.source_revision === selected.source_revision;
        output.push({ slot_id: item.slot_id, resource: current ? {
          resource_type: resource.resource_type,
          display_title: resource.display_title,
          preview_url: resource.preview_url,
          alt_text: selected.alt_text || resource.metadata?.alt_text || null,
          metadata: resource.resource_type === 'menu' ? { items: resource.metadata?.items || [] } : {},
          price: resource.resource_type === 'product' ? priceForProduct(resource, records) : null,
          source_revision: resource.source_revision,
          availability_status: resource.availability_status
        } : null });
        continue;
      }
      const asset = await this.store.findAssetForProject(selected.id, project.id, project.organization_id);
      const current = asset && asset.upload_status === 'ready' && asset.processing_state === 'ready' && asset.checksum_sha256 === selected.source_revision;
      output.push({ slot_id: item.slot_id, resource: current ? {
        resource_type: 'asset', display_title: asset.display_title, preview_url: `/api/projects/${encodeURIComponent(project.id)}/assets/${encodeURIComponent(asset.id)}/download`,
        alt_text: asset.alt_text || null, metadata: {}, price: null, source_revision: asset.checksum_sha256, availability_status: 'available'
      } : null });
    }
    return output;
  }
  async craftsmanship(project, contentPlan) {
    const candidate = contentPlan?.craftsmanship;
    if (candidate?.status !== 'approved') return candidate || null;
    const steps = [];
    for (const item of candidate.steps || []) {
      let image = null;
      if (item.image_asset_id) {
        const asset = await this.store.findAssetForProject(item.image_asset_id, project.id, project.organization_id);
        if (asset?.upload_status === 'ready' && asset?.processing_state === 'ready') image = { url: `/api/projects/${encodeURIComponent(project.id)}/assets/${encodeURIComponent(asset.id)}/download`, alt: item.decorative_media ? '' : item.image_alt_text || '', decorative: Boolean(item.decorative_media) };
      }
      steps.push({ ...item, image });
    }
    return { ...candidate, steps };
  }
  async readInputs({ userId, project, assignment }) {
    if (!assignment?.connection) return null;
    const [direction, resourceSet, session, orders] = await Promise.all([
      this.recommendationDesignService.ensure({ userId, projectId: project.id }),
      this.recommendedResourceSetService.ensure({ userId, projectId: project.id }),
      this.store.findCreativeDirectorForProject(project.id),
      this.store.listCustomThemeOrdersForProject(project.id, project.organization_id)
    ]);
    if (!direction?.revision_id || !direction?.design_dna?.revision_id) return null;
    const [recommendationRevision, dnaRevision, resourceSetRevision, directionState, resourceSetState] = await Promise.all([
      this.store.findStorefrontRecommendationRevision(direction.revision_id, project.id, project.organization_id),
      this.store.findDesignDnaRevision(direction.design_dna.revision_id, project.id, project.organization_id),
      resourceSet?.revision_id ? this.store.findRecommendedResourceSetRevision(resourceSet.revision_id, project.id, project.organization_id) : null,
      this.store.findCreativeDirectionState(project.id),
      this.store.findRecommendedResourceSetState(project.id)
    ]);
    if (!recommendationRevision?.recommendation?.primary || !dnaRevision?.dna) return null;
    const resources = await this.resourceSlots({ project, assignment, resourceSetRevision });
    const inputIds = {
      recommendationRevisionId: recommendationRevision.revision_id,
      dnaRevisionId: dnaRevision.revision_id,
      resourceSetRevisionId: resourceSetRevision?.revision_id || null,
      presetRevisionId: session?.preset_selection?.approved_revision_id || null,
      contentRevision: contentRevision(session?.content_plan)
    };
    const generatedBinding = orders.map((order) => trustedGeneratedBinding(order, inputIds)).find(Boolean) || null;
    const craft = await this.craftsmanship(project, session?.content_plan);
    const approvedDirection = Boolean(directionState?.current_approved_recommendation_revision_id && directionState?.current_approved_dna_revision_id && direction.status === 'approved');
    const approvedResources = Boolean(resourceSetState?.current_approved_revision_id && resourceSet.status === 'approved');
    const input = {
      project,
      recommendation: recommendationRevision.recommendation,
      designDna: dnaRevision.dna,
      resources,
      contentPlan: { craftsmanship: craft },
      recommendationRevisionId: recommendationRevision.revision_id,
      dnaRevisionId: dnaRevision.revision_id,
      resourceSetRevisionId: resourceSetRevision?.revision_id || null,
      contentRevision: inputIds.contentRevision,
      presetRevisionId: inputIds.presetRevisionId,
      runtimeCapabilityVersion: RUNTIME_CAPABILITY_VERSION,
      approvedDirection,
      approvedResources,
      generatedBinding
    };
    return { input, identity: digest({ recommendation: input.recommendationRevisionId, dna: input.dnaRevisionId, resources: input.resourceSetRevisionId, content: input.contentRevision, generated: input.generatedBinding }) };
  }
  thinking(project, state = null) {
    return {
      version: 1, state: 'thinking', qualifier: state?.status === 'failed' ? 'failed' : 'current', label: 'Thinking', revision_id: null, sequence: state?.current_sequence || 0,
      title: 'Preparing your first direction.', description: 'Calinium needs enough saved business context before it can show a truthful storefront direction.',
      limitation: 'No Preview artifact exists yet.', changed_regions: [], model: null, error: state?.last_error || null
    };
  }
  publicRevision(revision, previous = null, qualifier = 'current', error = null) {
    const changed = changedRegions(previous?.region_fingerprints || null, revision.region_fingerprints);
    const labels = { provisional: 'Provisional', approved: 'Approved', generated: 'Generated' };
    const limitation = revision.preview_state === 'generated'
      ? 'This reflects the exact trusted generated input lineage. Calinium has not installed or published it.'
      : revision.preview_state === 'approved'
        ? 'This is an approved direction and resource set, not the packaged Shopify theme.'
        : 'Provisional work can change and is not approved or generated.';
    return {
      version: 1, state: revision.preview_state, qualifier, label: labels[revision.preview_state], revision_id: revision.revision_id, sequence: revision.sequence,
      title: revision.preview_state === 'generated' ? 'Generated storefront' : `${revision.model.preset?.name || 'Storefront'} homepage`,
      description: revision.preview_state === 'generated' ? 'This representation is bound to the validated generated package.' : 'A truthful homepage preview built from your current canonical direction and real resources.',
      limitation, changed_regions: changed, unchanged_regions: Object.keys(revision.region_fingerprints).filter((id) => !changed.includes(id)), model: revision.model,
      freshness: qualifier === 'current' ? 'Current' : qualifier === 'failed' ? 'Last stable view' : 'Stale', error
    };
  }
  async markFailure({ project, assignment, state, error }) {
    const safe = safeError();
    const at = this.now();
    await this.store.upsertLivePreviewState({ project_id: project.id, connection_id: assignment.connection.id, status: 'failed', current_revision_id: state?.current_revision_id || null, last_stable_revision_id: state?.last_stable_revision_id || state?.current_revision_id || null, current_sequence: state?.current_sequence || 0, last_error: safe, created_at: state?.created_at || at, updated_at: at });
    const stableId = state?.last_stable_revision_id || state?.current_revision_id;
    const stable = stableId ? await this.store.findLivePreviewRevision(stableId, project.id, project.organization_id) : null;
    if (stable) return this.publicRevision(stable, stable, 'failed', safe);
    return this.thinking(project, { ...state, status: 'failed', last_error: safe });
  }
  async ensure({ userId, projectId, retry = false, attempt = 0 }) {
    const { project, assignment } = await this.authorize({ userId, projectId });
    const state = await this.store.findLivePreviewState(project.id);
    if (!assignment?.connection) return this.thinking(project, state);
    try {
      const captured = await this.readInputs({ userId, project, assignment });
      if (!captured) return this.thinking(project, state);
      const built = buildPreviewArtifact(captured.input);
      if (!built.artifact) return this.thinking(project, state);
      if (this.beforeBuild && attempt === 0) await this.beforeBuild({ projectId, dependencyFingerprint: built.artifact.dependency_fingerprint, retry });
      const latest = await this.readInputs({ userId, project, assignment });
      if (!latest || latest.identity !== captured.identity) {
        if (attempt >= 2) throw new Error('Preview inputs kept changing while the Preview was being prepared.');
        return this.ensure({ userId, projectId, retry, attempt: attempt + 1 });
      }
      const currentState = await this.store.findLivePreviewState(project.id);
      const current = currentState?.current_revision_id ? await this.store.findLivePreviewRevision(currentState.current_revision_id, project.id, project.organization_id) : null;
      if (current?.dependency_fingerprint === built.artifact.dependency_fingerprint) {
        if (currentState.status === 'failed' || retry) {
          const at = this.now();
          await this.store.upsertLivePreviewState({
            project_id: project.id, connection_id: assignment.connection.id, status: 'ready',
            current_revision_id: current.revision_id, last_stable_revision_id: current.revision_id,
            current_sequence: current.sequence, last_error: null, created_at: currentState.created_at || at, updated_at: at
          });
        }
        return this.publicRevision(current, current, 'current');
      }
      const revisionId = `lpr_${crypto.createHash('sha256').update(`${project.id}|${RENDERER_VERSION}|${built.artifact.dependency_fingerprint}`).digest('hex').slice(0, 40)}`;
      const at = this.now();
      const stored = await this.store.transaction(async (transaction) => {
        const txState = await transaction.findLivePreviewState(project.id);
        const existing = await transaction.findLivePreviewRevisionByFingerprint(project.id, RENDERER_VERSION, built.artifact.dependency_fingerprint);
        const sequence = existing?.sequence || (txState?.current_sequence || 0) + 1;
        const revision = existing || await transaction.createLivePreviewRevision({
          revision_id: revisionId, project_id: project.id, organization_id: project.organization_id, connection_id: assignment.connection.id,
          parent_revision_id: txState?.current_revision_id || null, sequence, ...built.artifact,
          source_status: built.state === 'generated' ? 'generated_trusted' : 'current', created_at: at
        });
        await transaction.upsertLivePreviewState({ project_id: project.id, connection_id: assignment.connection.id, status: 'ready', current_revision_id: revision.revision_id, last_stable_revision_id: revision.revision_id, current_sequence: revision.sequence, last_error: null, created_at: txState?.created_at || at, updated_at: at });
        return revision;
      });
      return this.publicRevision(stored, current, 'current');
    } catch (error) {
      if (error instanceof DashboardError && ['project_not_found', 'permission_denied'].includes(error.code)) throw error;
      return this.markFailure({ project, assignment, state: await this.store.findLivePreviewState(project.id), error });
    }
  }
}

module.exports = { LivePreviewService, RUNTIME_CAPABILITY_VERSION, contentRevision, trustedGeneratedBinding, priceForProduct, safeError };
