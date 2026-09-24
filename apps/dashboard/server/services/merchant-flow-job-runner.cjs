'use strict';

const crypto = require('crypto');
const { createId } = require('../lib/ids.cjs');
const { safeOperationalDetails } = require('../../../../ai/merchant-flow');

function iso(clock) { return clock().toISOString(); }
function plusMilliseconds(value, milliseconds) { return new Date(new Date(value).getTime() + milliseconds).toISOString(); }
function safeFailure(error) {
  const category = String(error?.code || 'operation_failed').replace(/[^a-z0-9_]/gi, '_').toLowerCase().slice(0, 80);
  const retryable = error?.retryable !== false && !['merchant_flow_live_theme_target_forbidden', 'merchant_flow_shop_target_mismatch', 'merchant_flow_theme_operation_scope_forbidden'].includes(category);
  const manifest = error?.render_manifest && typeof error.render_manifest === 'object' ? error.render_manifest : {};
  const evidence = safeOperationalDetails({
    ...(error?.details && typeof error.details === 'object' ? error.details : {}),
    ...(error?.failure && typeof error.failure === 'object' ? error.failure : {}),
    ...(error?.safe_evidence && typeof error.safe_evidence === 'object' ? error.safe_evidence : {}),
    ...(error?.safe_failure_result && typeof error.safe_failure_result === 'object' ? error.safe_failure_result : {}),
    failure_category: category,
    request_id: manifest.request_id,
    manifest_id: manifest.manifest_id,
    manifest_checksum: manifest.manifest_checksum
  });
  return { category, retryable, message: retryable ? 'The operation stopped safely and may be retried.' : 'The operation stopped because a safety requirement was not satisfied.', evidence };
}
function cancellationError() { return Object.assign(new Error('The merchant-flow job was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false }); }
function leaseLostError() { return Object.assign(new Error('The merchant-flow job lease is no longer authoritative.'), { code: 'merchant_flow_job_lease_lost', retryable: true }); }
function pendingKey(job) { return `${job.id}:${job.status}:${job.attempt}:${job.lease_epoch || 0}:${job.authorized_resume_operation_id || 'initial'}`; }

class MerchantFlowJobRunner {
  constructor({ store, clock = () => new Date(), leaseMilliseconds = 120000, autoRun = true } = {}) {
    this.store = store;
    this.clock = clock;
    this.leaseMilliseconds = leaseMilliseconds;
    this.autoRun = autoRun;
    this.handlers = new Map();
    this.pending = new Set();
  }
  register(kind, handler) { this.handlers.set(kind, handler); return this; }
  async event({ flowId, projectId, organizationId, eventType, sequence = 0, details = {} }) {
    const safe = safeOperationalDetails(details);
    const id = `merchant-flow-event-${crypto.createHash('sha256').update(JSON.stringify({ flowId, eventType, sequence, safe })).digest('hex').slice(0, 20)}`;
    return this.store.createMerchantFlowOperationalEvent({ id, flow_id: flowId, project_id: projectId, organization_id: organizationId, event_type: eventType, sequence, details: safe, created_at: iso(this.clock) });
  }
  async enqueue({ identity, projectId, organizationId, payload = {}, sequence = 0 }) {
    const at = iso(this.clock);
    const recorded = await this.store.createMerchantFlowJob({
      id: identity.job_id, flow_id: identity.binding.flow_id, project_id: projectId, organization_id: organizationId,
      job_kind: identity.binding.kind, identity_checksum: identity.identity_checksum, status: 'queued', attempt: 0,
      payload: safeOperationalDetails(payload), result: null, lease_token: null, lease_expires_at: null,
      failure_category: null, failure_message: null, created_at: at, updated_at: at, completed_at: null
    });
    if (recorded.created) await this.event({ flowId: identity.binding.flow_id, projectId, organizationId, eventType: `${identity.binding.kind}_queued`, sequence, details: { ...payload, job_id: recorded.job.id, job_kind: recorded.job.job_kind } });
    if (this.autoRun && recorded.job.status === 'queued') this.schedule(recorded.job);
    return recorded;
  }
  schedule(job) {
    if (!job || !['queued', 'running'].includes(job.status)) return;
    const key = pendingKey(job);
    if (this.pending.has(key)) return;
    this.pending.add(key);
    setImmediate(() => this.run(job).catch(() => {}).finally(() => this.pending.delete(key)));
  }
  async run(jobOrId, scope = null) {
    const initial = typeof jobOrId === 'object' ? jobOrId : await this.store.findMerchantFlowJob(jobOrId, scope.projectId, scope.organizationId);
    if (!initial || ['completed', 'terminal', 'cancelled', 'retryable'].includes(initial.status)) return initial;
    if (initial.status === 'cancellation_requested') return this.finalizeExpiredCancellation(initial);
    if (!['queued', 'running'].includes(initial.status)) return initial;
    const handler = this.handlers.get(initial.job_kind);
    if (!handler) return initial;
    const at = iso(this.clock); const leaseToken = createId('mfl');
    const recoveringLease = initial.status === 'running';
    const job = await this.store.claimMerchantFlowJob(initial.id, initial.project_id, initial.organization_id, {
      leaseToken,
      leaseExpiresAt: plusMilliseconds(at, this.leaseMilliseconds),
      updatedAt: at,
      observedStatus: initial.status,
      observedAttempt: initial.attempt,
      observedLeaseEpoch: initial.lease_epoch || 0,
      observedLeaseToken: initial.lease_token || null,
      observedResumeOperationId: initial.authorized_resume_operation_id || null,
      observedAuthorizedAttempt: initial.authorized_attempt ?? null
    });
    if (!job) return this.store.findMerchantFlowJob(initial.id, initial.project_id, initial.organization_id);
    const logicalAttempt = Number(job.attempt);
    const leaseEpoch = Number(job.lease_epoch || 0);
    const triggerKind = recoveringLease ? 'lease_recovery' : (job.authorized_resume_operation_id ? 'merchant_resume' : 'initial_enqueue');
    const startedEvent = recoveringLease ? 'recovery' : (job.attempt > 1 ? 'retry' : (job.job_kind === 'render_qa' ? 'render_started' : `${job.job_kind}_started`));
    await this.event({ flowId: job.flow_id, projectId: job.project_id, organizationId: job.organization_id, eventType: startedEvent, sequence: job.attempt, details: { ...job.payload, job_id: job.id, job_kind: job.job_kind, retry_of: job.attempt > 1 ? job.id : undefined, resume_operation_id: job.authorized_resume_operation_id, logical_attempt: logicalAttempt, lease_epoch: leaseEpoch, trigger_kind: triggerKind } });
    const currentJob = () => this.store.findMerchantFlowJob(job.id, job.project_id, job.organization_id);
    const control = {
      execution: { job_id: job.id, attempt: logicalAttempt, lease_epoch: leaseEpoch, lease_token: leaseToken, resume_operation_id: job.authorized_resume_operation_id || null },
      isCancellationRequested: async () => (await currentJob())?.status === 'cancellation_requested',
      checkpoint: async () => {
        const latest = await currentJob();
        if (latest?.status === 'cancellation_requested') throw cancellationError();
        if (!latest || latest.status !== 'running' || latest.lease_token !== leaseToken || Number(latest.attempt) !== logicalAttempt || Number(latest.lease_epoch || 0) !== leaseEpoch) throw leaseLostError();
      }
    };
    let leaseRenewalFailure = null;
    const renewLease = async () => {
      const renewedAt = iso(this.clock);
      const renewed = typeof this.store.renewMerchantFlowJobLease === 'function'
        ? await this.store.renewMerchantFlowJobLease(
          job.id,
          job.project_id,
          job.organization_id,
          leaseToken,
          plusMilliseconds(renewedAt, this.leaseMilliseconds),
          renewedAt,
          { attempt: logicalAttempt, leaseEpoch }
        )
        : true;
      if (!renewed) leaseRenewalFailure = leaseLostError();
    };
    const heartbeatMilliseconds = Math.max(50, Math.floor(this.leaseMilliseconds / 3));
    const heartbeat = setInterval(() => renewLease().catch((error) => { leaseRenewalFailure = error; }), heartbeatMilliseconds);
    heartbeat.unref?.();
    const checkpoint = control.checkpoint;
    control.checkpoint = async () => {
      if (leaseRenewalFailure) throw leaseRenewalFailure;
      await checkpoint();
    };
    try {
      await control.checkpoint();
      const result = await handler(job, control);
      await control.checkpoint();
      const safeResult = safeOperationalDetails(result || {});
      const completed = await this.store.completeMerchantFlowJob(job.id, job.project_id, job.organization_id, leaseToken, safeResult, iso(this.clock), { attempt: logicalAttempt, leaseEpoch });
      if (!completed) {
        const latest = await this.store.findMerchantFlowJob(job.id, job.project_id, job.organization_id);
        if (latest?.status === 'cancellation_requested') return this.finalizeCancellation(latest, leaseToken);
        return latest;
      }
      const completedEvent = job.job_kind === 'render_qa' ? 'render_completed' : `${job.job_kind}_completed`;
      await this.event({ flowId: job.flow_id, projectId: job.project_id, organizationId: job.organization_id, eventType: completedEvent, sequence: job.attempt, details: { ...safeResult, job_id: job.id, job_kind: job.job_kind } });
      return completed;
    } catch (error) {
      if (error?.code === 'merchant_flow_job_cancelled' || await control.isCancellationRequested()) return this.finalizeCancellation(job, leaseToken);
      const failure = safeFailure(error);
      failure.result = safeOperationalDetails({
        ...failure.evidence,
        ...(error?.safe_failure_result && typeof error.safe_failure_result === 'object' ? error.safe_failure_result : {}),
        job_id: job.id,
        job_kind: job.job_kind,
        logical_attempt: logicalAttempt,
        lease_epoch: leaseEpoch,
        resume_operation_id: job.authorized_resume_operation_id,
        trigger_kind: triggerKind
      });
      const failed = await this.store.failMerchantFlowJob(job.id, job.project_id, job.organization_id, leaseToken, failure, iso(this.clock), { attempt: logicalAttempt, leaseEpoch });
      if (failed) await this.event({ flowId: job.flow_id, projectId: job.project_id, organizationId: job.organization_id, eventType: 'failure', sequence: job.attempt, details: { ...failure.evidence, job_id: job.id, job_kind: job.job_kind, failure_category: failure.category, resume_operation_id: job.authorized_resume_operation_id, logical_attempt: logicalAttempt, lease_epoch: leaseEpoch, trigger_kind: triggerKind } });
      return failed || currentJob();
    } finally {
      clearInterval(heartbeat);
    }
  }
  async finalizeCancellation(job, leaseToken) {
    const cancelled = await this.store.finalizeMerchantFlowJobCancellation(job.id, job.project_id, job.organization_id, leaseToken, iso(this.clock));
    const result = cancelled || await this.store.findMerchantFlowJob(job.id, job.project_id, job.organization_id);
    if (cancelled) await this.event({ flowId: job.flow_id, projectId: job.project_id, organizationId: job.organization_id, eventType: `${job.job_kind}_cancelled`, sequence: job.attempt, details: { job_id: job.id, job_kind: job.job_kind, status: 'cancelled' } });
    return result;
  }
  async finalizeExpiredCancellation(job) {
    const at = iso(this.clock);
    if (!job.lease_expires_at || job.lease_expires_at >= at) return job;
    const cancelled = await this.store.finalizeExpiredMerchantFlowJobCancellation(job.id, job.project_id, job.organization_id, at);
    if (cancelled) await this.event({ flowId: job.flow_id, projectId: job.project_id, organizationId: job.organization_id, eventType: `${job.job_kind}_cancelled`, sequence: job.attempt, details: { job_id: job.id, job_kind: job.job_kind, status: 'cancelled' } });
    return cancelled || this.store.findMerchantFlowJob(job.id, job.project_id, job.organization_id);
  }
  async requestCancellation({ flowId, projectId, organizationId, sequence = 0 }) {
    const jobs = await this.store.requestMerchantFlowJobsCancellation(flowId, projectId, organizationId, iso(this.clock));
    for (const job of jobs.filter((item) => ['cancellation_requested', 'cancelled'].includes(item.status))) {
      await this.event({ flowId, projectId, organizationId, eventType: `${job.job_kind}_cancellation_requested`, sequence, details: { job_id: job.id, job_kind: job.job_kind, status: job.status } });
      if (job.status === 'cancelled') {
        await this.event({ flowId, projectId, organizationId, eventType: `${job.job_kind}_cancelled`, sequence, details: { job_id: job.id, job_kind: job.job_kind, status: 'cancelled' } });
      }
    }
    return jobs;
  }
  async recover({ flowId, projectId, organizationId }) {
    const jobs = await this.store.listMerchantFlowJobs(flowId, projectId, organizationId);
    const now = iso(this.clock);
    for (const job of jobs) {
      if (job.status === 'cancellation_requested' && job.lease_expires_at && job.lease_expires_at < now) await this.finalizeExpiredCancellation(job);
      else if (job.status === 'queued' || (job.status === 'running' && job.lease_expires_at && job.lease_expires_at < now)) this.schedule(job);
    }
    return jobs;
  }
  async recoverAll(limit = 100, { signal = null } = {}) {
    if (typeof this.store.listRecoverableMerchantFlowJobs !== 'function') return [];
    if (signal?.aborted) return [];
    const jobs = await this.store.listRecoverableMerchantFlowJobs(iso(this.clock), limit);
    if (signal?.aborted) return [];
    for (const job of jobs) {
      if (signal?.aborted) return jobs;
      if (job.status === 'cancellation_requested') await this.finalizeExpiredCancellation(job);
      else this.schedule(job);
    }
    return jobs;
  }
  async authorizeResume({ record, expectedGenerationState, nextGenerationState, resultFlow, expectedSessionUpdatedAt = null, sequence = 0 }) {
    if (typeof this.store.applyMerchantFlowResumeOperation !== 'function') throw Object.assign(new Error('Durable merchant resume operations are unavailable.'), { code: 'merchant_flow_resume_operation_unavailable' });
    const applied = await this.store.applyMerchantFlowResumeOperation({ record, expectedGenerationState, nextGenerationState, resultFlow, at: iso(this.clock), expectedSessionUpdatedAt });
    if (!applied.replayed) {
      await this.event({
        flowId: record.flow_id,
        projectId: record.project_id,
        organizationId: record.organization_id,
        eventType: 'resume_authorized',
        sequence,
        details: { job_id: record.job_id, job_kind: record.operation_kind === 'render_qa_retry' ? 'render_qa' : 'generation', resume_operation_id: record.id, operation_id: record.id, request_id: record.request_id, logical_attempt: record.target_job_attempt, trigger_kind: 'merchant_resume' }
      });
    }
    if (this.autoRun && applied.job?.status === 'queued') this.schedule(applied.job);
    return applied;
  }
  async retry({ jobId, projectId, organizationId }) {
    return this.store.findMerchantFlowJob(jobId, projectId, organizationId);
  }
  async drain() {
    while (this.pending.size) await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

module.exports = { MerchantFlowJobRunner, safeFailure, cancellationError, leaseLostError };
