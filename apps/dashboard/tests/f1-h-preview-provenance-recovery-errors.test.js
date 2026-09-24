import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { DashboardError } = require('../server/lib/errors.cjs');
const {
  MerchantGenerationFlowService,
  previewProvenanceRecoveryDashboardError
} = require('../server/services/merchant-generation-flow-service.cjs');
const { MerchantFlowJobRunner } = require('../server/services/merchant-flow-job-runner.cjs');

const project = { id: 'prj_f1h', organization_id: 'org_f1h' };
const flow = {
  flow_id: 'merchant-flow-f1h', project_id: project.id, organization_id: project.organization_id,
  state: 'preview_ready', sequence: 27, checksum: 'a'.repeat(64),
  store_context: { shop: 'controlled-f1h.myshopify.com', connection_id: 'shc_f1h' }
};

function serviceFor({ createRecovery, applyRecovery, event, jobRunner } = {}) {
  const session = { updated_at: '2026-09-06T10:00:00.000Z', generation_state: { merchant_flow: flow } };
  const store = {
    findCreativeDirectorForProject: vi.fn(async () => session),
    listMerchantFlowPreviewProvenanceRecoveries: vi.fn(async () => []),
    createMerchantFlowPreviewProvenanceRecovery: vi.fn(),
    applyMerchantFlowPreviewProvenanceRecovery: vi.fn(applyRecovery || (async () => ({ created: true })))
  };
  const instance = new MerchantGenerationFlowService({
    root: process.cwd(),
    store,
    projectService: {},
    controlledRuntimeConfiguration: { enabled: false },
    operatorAuthorization: { authorize: vi.fn(async () => ({ project, operator: { user_id: 'usr_f1h', role: 'owner', explicitly_allowlisted: true } })) },
    previewBindingResolver: {
      createRecovery: vi.fn(createRecovery || (() => { throw Object.assign(new Error('private construction detail'), { code: 'merchant_flow_preview_provenance_recovery_invalid' }); })),
      resolve: vi.fn(() => ({ status: 'available', source: 'legacy_provenance_recovery' }))
    }
  });
  instance.flowFromSession = vi.fn(() => flow);
  instance.setJobRunner(jobRunner || { event: event || vi.fn(async () => ({ created: true })) });
  return { instance, store };
}

describe('F1-H bounded preview-provenance recovery failures', () => {
  it('classifies known domain failures without retaining raw internal messages', () => {
    const cases = [
      ['merchant_flow_preview_provenance_recovery_request_invalid', 422, 'request_validation'],
      ['merchant_flow_preview_provenance_recovery_founder_review_invalid', 422, 'evidence_resolution'],
      ['merchant_flow_preview_provenance_recovery_not_eligible', 409, 'eligibility'],
      ['merchant_flow_preview_provenance_recovery_stale', 409, 'concurrency'],
      ['merchant_flow_preview_provenance_recovery_conflict', 409, 'persistence'],
      ['merchant_flow_preview_provenance_recovery_persistence_unavailable', 503, 'persistence']
    ];
    for (const [code, status, stage] of cases) {
      const normalized = previewProvenanceRecoveryDashboardError(Object.assign(new Error('raw database token path'), { code }), { requestId: 'request-f1h-safe' });
      expect(normalized).toBeInstanceOf(DashboardError);
      expect(normalized).toMatchObject({ code, status, details: { stage, request_id: 'request-f1h-safe' } });
      expect(JSON.stringify(normalized)).not.toContain('raw database token path');
    }
  });

  it('maps deterministic schema/construction failures to the safe record-construction contract', async () => {
    const event = vi.fn(async () => ({ created: true }));
    const { instance, store } = serviceFor({ event });
    await expect(instance.recoverPreviewProvenance({ projectId: project.id, userId: 'usr_f1h', request: {}, requestId: 'request-f1h-construction' }))
      .rejects.toMatchObject({
        code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        status: 500,
        details: { category: 'record_construction_failed', stage: 'record_construction', retryable: false, recovery: 'source_remediation_required' }
      });
    expect(store.applyMerchantFlowPreviewProvenanceRecovery).not.toHaveBeenCalled();
    expect(event).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'preview_provenance_recovery_rejected',
      details: expect.objectContaining({
        operation_type: 'preview_provenance_recovery',
        failure_stage: 'record_construction',
        error_code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        http_status: 500,
        retryable: false,
        request_id: 'request-f1h-construction'
      })
    }));
    expect(JSON.stringify(event.mock.calls)).not.toMatch(/private construction detail|token|cookie|csrf|stack|source_revision|review_body/i);
  });

  it('normalizes persistence failures and preserves the original response if failure-event persistence fails', async () => {
    const event = vi.fn(async () => { throw new Error('audit store unavailable'); });
    const { instance } = serviceFor({
      createRecovery: () => ({ recovery_id: 'recovery-f1h', recovery_checksum: 'b'.repeat(64), created_at: '2026-09-06T10:00:00.000Z' }),
      applyRecovery: async () => { throw new Error('raw database failure'); },
      event
    });
    await expect(instance.recoverPreviewProvenance({ projectId: project.id, userId: 'usr_f1h', request: {}, requestId: 'request-f1h-storage' }))
      .rejects.toMatchObject({
        code: 'merchant_flow_preview_provenance_recovery_persistence_failed',
        status: 503,
        details: { category: 'storage_failure', stage: 'persistence', retryable: true, recovery: 'retry_later' }
      });
    expect(event).toHaveBeenCalledTimes(1);
  });

  it('appends only bounded sanitized fields through the existing operational-event store', async () => {
    const retained = [];
    const eventStore = {
      createMerchantFlowOperationalEvent: vi.fn(async (record) => {
        retained.push(record);
        return { created: true, event: record };
      })
    };
    const jobRunner = new MerchantFlowJobRunner({ store: eventStore, autoRun: false, clock: () => new Date('2026-09-06T10:00:00.000Z') });
    const { instance } = serviceFor({ jobRunner });
    await expect(instance.recoverPreviewProvenance({ projectId: project.id, userId: 'usr_f1h', request: {}, requestId: 'request-f1h-audit' }))
      .rejects.toMatchObject({ code: 'merchant_flow_preview_provenance_recovery_record_construction_failed' });
    expect(retained).toHaveLength(1);
    expect(retained[0]).toMatchObject({
      flow_id: flow.flow_id,
      project_id: project.id,
      organization_id: project.organization_id,
      event_type: 'preview_provenance_recovery_rejected',
      sequence: flow.sequence,
      created_at: '2026-09-06T10:00:00.000Z',
      details: {
        flow_id: flow.flow_id,
        project_id: project.id,
        organization_id: project.organization_id,
        sequence: String(flow.sequence),
        status: flow.state,
        operation_type: 'preview_provenance_recovery',
        failure_stage: 'record_construction',
        error_code: 'merchant_flow_preview_provenance_recovery_record_construction_failed',
        http_status: '500',
        retryable: 'false',
        request_id: 'request-f1h-audit'
      }
    });
    expect(Object.keys(retained[0].details).sort()).toEqual([
      'error_code', 'failure_stage', 'flow_id', 'http_status', 'operation_type', 'organization_id',
      'project_id', 'request_id', 'retryable', 'sequence', 'status'
    ]);
  });

  it('binds the flow identity into the future CAS request', async () => {
    const record = { recovery_id: 'recovery-f1h', recovery_checksum: 'b'.repeat(64), created_at: '2026-09-06T10:00:00.000Z' };
    const { instance, store } = serviceFor({ createRecovery: () => record });
    instance.previewProvenanceRecoveries = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([record]);
    instance.previewBindingResolver.resolve = vi.fn(() => ({ status: 'available', source: 'legacy_provenance_recovery' }));
    await instance.recoverPreviewProvenance({ projectId: project.id, userId: 'usr_f1h', request: {}, requestId: 'request-f1h-success' }).catch(() => {});
    expect(store.applyMerchantFlowPreviewProvenanceRecovery).toHaveBeenCalledWith(expect.objectContaining({
      expectedFlow: { flow_id: flow.flow_id, sequence: flow.sequence, checksum: flow.checksum, state: flow.state }
    }));
  });
});
