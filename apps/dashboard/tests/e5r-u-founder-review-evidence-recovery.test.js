import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardApiHandler } = require('../server/dashboard-api.cjs');
const { DashboardError } = require('../server/lib/errors.cjs');
const { MerchantGenerationFlowService } = require('../server/services/merchant-generation-flow-service.cjs');
const {
  digest,
  inspectFounderReviewEvidence,
  prepareQaReviewRecoverySubmission,
  prepareQaReviewSubmission,
  recoverQaReviewEvidence
} = require('../server/services/merchant-flow-operator-evidence-resolver.cjs');
const {
  completeObjectRoot,
  recoveryReplicaId,
  storageDigest
} = require('../../../ai/merchant-flow/founder-qa-evidence-recovery');

const root = path.resolve(process.cwd(), '../..');
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'fixtures/e5r-u-founder-review-evidence-recovery.json'), 'utf8'));
const directories = new Set();
const sourceRevision = 'e'.repeat(40);
const runtimeRevision = 'merchant-flow-controlled-beta-runtime-v1';
const projectId = 'prj_e5ru_operator';
const organizationId = 'org_e5ru_operator';
const shop = 'controlled-e5ru.myshopify.com';

function write(file, bytes, flag = undefined) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, bytes, flag ? { flag } : undefined);
}

function scenario(suffix = crypto.randomUUID()) {
  const directory = path.join(root, 'output', 'merchant-flow-storefront-renders', `merchant-render-e5ru-${suffix}`);
  directories.add(directory);
  const relative = (name) => path.relative(root, path.join(directory, name)).split(path.sep).join('/');
  const flow = {
    flow_id: `merchant-flow-e5ru-${suffix}`,
    project_id: projectId,
    organization_id: organizationId,
    state: 'qa_review_required',
    sequence: 26,
    checksum: 'a'.repeat(64),
    store_context: { shop, connection_id: 'shc_e5ru_operator' },
    paid_identity: { order_id: 'order-e5ru' },
    artifact: { artifact_id: 'theme-artifact-e5ru', checksum: 'b'.repeat(64) },
    render_qa: { render_checksum: 'c'.repeat(64), d1: { status: 'passed' } },
    operator_provenance: { qa_review: null }
  };
  const evaluation = {
    evidence_id: `merchant-flow-d2-7-evaluation-${suffix}`,
    provenance: { flow_id: flow.flow_id, artifact_id: flow.artifact.artifact_id, artifact_sha256: flow.artifact.checksum }
  };
  const evaluationReference = relative('d2-7-evaluation.json');
  const evaluationBinding = { id: evaluation.evidence_id, checksum: digest(evaluation), reference: evaluationReference };
  flow.render_qa.d2_7 = { status: 'review_required', evidence_id: evaluationBinding.id, evidence_checksum: evaluationBinding.checksum };
  const reviewBase = {
    ...fixture.synthetic_case.review,
    review_id: `design-review-${suffix}`,
    evaluation: evaluationBinding
  };
  const review = { ...reviewBase, review_checksum: digest(reviewBase) };
  const reviewReference = relative('d2-7-human-review-attempt-8.json');
  write(path.join(directory, 'd2-7-evaluation.json'), `${JSON.stringify(evaluation, null, 2)}\n`);
  write(path.join(directory, 'd2-7-human-review-attempt-8.json'), `${JSON.stringify(review, null, 2)}${fixture.synthetic_case.trailing_text}`);
  return { directory, relative, flow, evaluation, evaluationBinding, review, reviewReference };
}

function recover(input, overrides = {}) {
  const projection = overrides.projection || prepareQaReviewRecoverySubmission({ root, flow: input.flow });
  return recoverQaReviewEvidence({
    root,
    flow: input.flow,
    request: { ...projection.request, ...(overrides.request || {}) },
    operator: overrides.operator || { user_id: 'usr_e5ru_founder', role: 'owner' },
    sourceRevision,
    runtimeRevision,
    createdAt: overrides.createdAt || '2026-09-05T13:00:00.000Z'
  });
}

afterEach(() => {
  for (const directory of directories) fs.rmSync(directory, { recursive: true, force: true });
  directories.clear();
});

describe('E5R-U append-only founder-review recovery', () => {
  it('recovers the exact semantic prefix, preserves the original, and restores only the founder submission projection', () => {
    const input = scenario('canonical');
    const original = fs.readFileSync(path.join(input.directory, 'd2-7-human-review-attempt-8.json'));
    const analysis = completeObjectRoot(original);
    expect(analysis.trailing_byte_count).toBe(1);
    expect(original.subarray(analysis.root_end).toString('utf8')).toBe('n');
    expect(analysis.value.review_checksum).toBe(input.review.review_checksum);
    expect(digest(Object.fromEntries(Object.entries(analysis.value).filter(([key]) => key !== 'review_checksum')))).toBe(input.review.review_checksum);
    expect(prepareQaReviewRecoverySubmission({ root, flow: input.flow })).toMatchObject({ available: true, request: { review: { id: input.review.review_id, checksum: input.review.review_checksum } } });
    expect(prepareQaReviewSubmission({ root, flow: input.flow }).available).toBe(false);

    const result = recover(input);
    expect(result.replayed).toBe(false);
    expect(result.record).toMatchObject({
      contract_version: 'merchant-flow-founder-qa-evidence-recovery-v1',
      review: { id: input.review.review_id, checksum: input.review.review_checksum, decision: 'accepted' },
      safety: { original_artifact_mutated: false, founder_decision_applied: false, new_d2_7_attempt_created: false }
    });
    expect(fs.readFileSync(path.join(input.directory, 'd2-7-human-review-attempt-8.json'))).toEqual(original);
    expect(result.record.corrupted_artifact.storage_sha256).toBe(storageDigest(original));
    const replica = fs.readFileSync(path.join(root, result.record.recovered_artifact.reference));
    expect(storageDigest(replica)).toBe(result.record.recovered_artifact.storage_sha256);
    expect(() => JSON.parse(replica.toString('utf8'))).not.toThrow();
    expect(replica.toString('utf8').trimEnd().endsWith('}')).toBe(true);
    expect(JSON.parse(replica).review_checksum).toBe(input.review.review_checksum);
    expect(prepareQaReviewRecoverySubmission({ root, flow: input.flow }).available).toBe(false);
    expect(prepareQaReviewSubmission({ root, flow: input.flow })).toMatchObject({
      available: true,
      request: { decision: 'accepted', evidence: { review: { id: input.review.review_id, checksum: input.review.review_checksum, reference: result.record.recovered_artifact.reference } } }
    });
    expect(input.flow.state).toBe('qa_review_required');
    expect(input.flow.sequence).toBe(26);
  });

  it('rejects checksum, raw storage, review, evaluation, and decision mismatches before recovery output exists', () => {
    const cases = [
      ['checksum', (input) => { input.review.review_checksum = 'f'.repeat(64); }],
      ['review-id', (input) => { input.review.review_id = 'design-review-mismatch'; }],
      ['evaluation', (input) => { input.review.evaluation = { ...input.review.evaluation, id: 'different-evaluation' }; }],
      ['decision', (input) => { input.review.decision = 'needs_fix'; }]
    ];
    for (const [label, mutate] of cases) {
      const input = scenario(label);
      const projection = prepareQaReviewRecoverySubmission({ root, flow: input.flow });
      const file = path.join(input.directory, 'd2-7-human-review-attempt-8.json');
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8').slice(0, -1));
      mutate({ review: parsed });
      if (label !== 'checksum') {
        const base = { ...parsed };
        delete base.review_checksum;
        parsed.review_checksum = digest(base);
      }
      write(file, `${JSON.stringify(parsed, null, 2)}n`);
      expect(() => recover(input, { projection }), label)
        .toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_corrupted_hash_mismatch' }));
      expect(fs.readdirSync(input.directory).some((name) => name.includes('recovered') || name.includes('evidence-recovery')), label).toBe(false);
    }

    const input = scenario('raw-hash');
    const projection = prepareQaReviewRecoverySubmission({ root, flow: input.flow });
    expect(() => recoverQaReviewEvidence({
      root,
      flow: input.flow,
      request: { ...projection.request, corrupted_artifact: { ...projection.request.corrupted_artifact, storage_sha256: 'f'.repeat(64) } },
      operator: { user_id: 'usr_e5ru_founder', role: 'owner' },
      sourceRevision,
      runtimeRevision,
      createdAt: '2026-09-05T13:00:00.000Z'
    })).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_request_invalid' }));

  });

  it('rejects missing and ambiguous JSON roots without creating recovery evidence', () => {
    expect(() => completeObjectRoot(Buffer.from('not-json'))).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_root_missing' }));
    expect(() => completeObjectRoot(Buffer.from('{"valid":true}{"second":true}'))).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_root_ambiguous' }));
    const input = scenario('ambiguous');
    write(path.join(input.directory, 'd2-7-human-review-attempt-8.json'), `${JSON.stringify(input.review)}${JSON.stringify({ second: true })}`);
    expect(prepareQaReviewRecoverySubmission({ root, flow: input.flow }).available).toBe(false);
    expect(fs.readdirSync(input.directory).some((name) => name.includes('recovered') || name.includes('evidence-recovery'))).toBe(false);
  });

  it('is idempotent, converges for identical calls, and fails closed on competing records or replicas', async () => {
    const input = scenario('idempotent');
    const projection = prepareQaReviewRecoverySubmission({ root, flow: input.flow });
    const [first, second] = await Promise.all([
      Promise.resolve().then(() => recover(input, { projection })),
      Promise.resolve().then(() => recover(input, { projection, createdAt: '2026-09-05T13:01:00.000Z' }))
    ]);
    expect([first.replayed, second.replayed].sort()).toEqual([false, true]);
    expect(first.record.recovery_id).toBe(second.record.recovery_id);
    expect(first.record.recovery_checksum).toBe(second.record.recovery_checksum);

    const duplicateRecord = path.join(input.directory, `founder-qa-evidence-recovery-${'f'.repeat(20)}.json`);
    write(duplicateRecord, `${JSON.stringify(first.record, null, 2)}\n`);
    expect(() => inspectFounderReviewEvidence(root, input.flow)).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_ambiguous' }));
    fs.rmSync(duplicateRecord);
    write(path.join(input.directory, `d2-7-human-review-recovered-${'f'.repeat(20)}.json`), `${JSON.stringify(input.review, null, 2)}\n`);
    expect(() => inspectFounderReviewEvidence(root, input.flow)).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_ambiguous' }));

    const conflict = scenario('replica-conflict');
    const projected = prepareQaReviewRecoverySubmission({ root, flow: conflict.flow });
    const identityInput = { flow: conflict.flow, review: projected.request.review, corruptedArtifact: projected.request.corrupted_artifact };
    const replica = path.join(conflict.directory, `d2-7-human-review-recovered-${recoveryReplicaId(identityInput).slice(-20)}.json`);
    write(replica, '{"conflicting":true}\n');
    expect(() => recover(conflict)).toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_replica_conflict' }));
    expect(fs.readdirSync(conflict.directory).some((name) => name.startsWith('founder-qa-evidence-recovery-'))).toBe(false);
  });

  it('fails closed when any persisted recovery-graph byte, record checksum, or replica is lost', () => {
    const originalTamper = scenario('original-tamper');
    recover(originalTamper);
    fs.appendFileSync(path.join(originalTamper.directory, 'd2-7-human-review-attempt-8.json'), 'x');
    expect(() => inspectFounderReviewEvidence(root, originalTamper.flow))
      .toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_corrupted_hash_mismatch' }));

    const recordTamper = scenario('record-tamper');
    const recorded = recover(recordTamper);
    const recordFile = path.join(recordTamper.directory, `founder-qa-evidence-recovery-${recorded.record.recovery_id.slice(-20)}.json`);
    const changedRecord = { ...JSON.parse(fs.readFileSync(recordFile, 'utf8')), created_at: '2026-09-05T13:05:00.000Z' };
    write(recordFile, `${JSON.stringify(changedRecord, null, 2)}\n`);
    expect(() => inspectFounderReviewEvidence(root, recordTamper.flow))
      .toThrowError(expect.objectContaining({ code: 'merchant_flow_founder_qa_recovery_record_invalid' }));

    const missingReplica = scenario('missing-replica');
    const missing = recover(missingReplica);
    fs.rmSync(path.join(root, missing.record.recovered_artifact.reference));
    expect(() => inspectFounderReviewEvidence(root, missingReplica.flow))
      .toThrowError(expect.objectContaining({ code: 'merchant_flow_operator_evidence_missing' }));
  });
});

const env = { NODE_ENV: 'test', SHOPIFY_API_KEY: 'e5ru-client', SHOPIFY_API_SECRET: 'e5ru-secret' };
function signedSession({ userId = 'usr_e5ru_founder', shopDomain = shop } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shopDomain}`, exp: Math.floor(Date.now() / 1000) + 60, iss: `https://${shopDomain}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
async function invoke(api, { token = null, body, project = projectId } = {}) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method: 'POST',
    url: `/api/projects/${project}/merchant-generation-flow/operator/recover-qa-review-evidence`,
    headers: { host: 'dashboard.test', 'content-type': 'application/json', 'idempotency-key': body.idempotency_key, ...(token ? { authorization: `Bearer ${token}` } : {}) },
    socket: { remoteAddress: '127.0.0.1' }
  });
  const response = {
    status: null, headers: {}, body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    writeHead(status, headers) { this.status = status; this.headers = { ...this.headers, ...(headers || {}) }; },
    end(value = '') { this.body += value; }
  };
  await api(request, response);
  return { status: response.status, payload: JSON.parse(response.body) };
}

describe('E5R-U authenticated recovery boundary', () => {
  it('requires fresh embedded authentication and leaves founder QA as a separate operation', async () => {
    const recoverMethod = vi.fn(async ({ userId, flowId }) => {
      if (userId !== 'usr_e5ru_founder') throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
      return { operation: { operation_id: 'merchant-flow-founder-qa-evidence-recovery-test', status: 'applied' }, flow: { flow_id: flowId, state: 'qa_review_required', sequence: 26 }, replayed: false };
    });
    const services = {
      env,
      auth: { authenticate: vi.fn(async () => null) },
      embeddedAuth: {
        resolveActor: vi.fn(async ({ shopDomain, shopifyUserId }) => {
          if (shopDomain !== shop) throw new DashboardError('shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
          return { user: { id: shopifyUserId }, identity: { organization_id: organizationId }, connection: { id: 'shc_e5ru_operator' } };
        })
      },
      projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
      merchantFlow: { recoverQaReviewEvidence: recoverMethod }
    };
    const api = createDashboardApiHandler({ services, env });
    const body = { idempotency_key: 'merchant-flow-founder-qa-recovery-auth-test', flow_id: 'merchant-flow-e5ru-auth' };
    expect(await invoke(api, { body })).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });
    expect(await invoke(api, { token: signedSession({ userId: 'usr_e5ru_merchant' }), body })).toMatchObject({ status: 403, payload: { error: { code: 'merchant_flow_operator_forbidden' } } });
    expect(await invoke(api, { token: signedSession({ shopDomain: 'other-shop.myshopify.com' }), body })).toMatchObject({ status: 403, payload: { error: { code: 'shopify_embedded_identity_invalid' } } });
    const founder = await invoke(api, { token: signedSession(), body });
    expect(founder).toMatchObject({ status: 200, payload: { result: { operation: { status: 'applied' }, flow: { state: 'qa_review_required', sequence: 26 } } } });
    expect(recoverMethod).toHaveBeenCalledTimes(2);
    expect(services.merchantFlow).not.toHaveProperty('applyQaReview');
  });

  it('service verifies operator authorization and rejects a concurrent flow revision change', async () => {
    const input = scenario('service');
    const request = prepareQaReviewRecoverySubmission({ root, flow: input.flow }).request;
    const session = { generation_state: { merchant_flow: input.flow } };
    const operatorAuthorization = { authorize: vi.fn(async () => ({ project: { id: projectId, organization_id: organizationId }, operator: { user_id: 'usr_e5ru_founder', role: 'owner' } })) };
    const operatorEvidenceResolver = {
      recoverQaReviewEvidence: vi.fn(() => ({ record: { recovery_id: 'recovery-e5ru', recovery_checksum: 'd'.repeat(64), created_at: '2026-09-05T13:00:00.000Z' }, replayed: false }))
    };
    const service = new MerchantGenerationFlowService({
      root,
      store: { findCreativeDirectorForProject: vi.fn(async () => session) },
      projectService: {},
      controlledRuntimeConfiguration: { enabled: true, controlled_shop_domains: [shop] },
      operatorAuthorization,
      operatorEvidenceResolver
    });
    service.flowFromSession = vi.fn()
      .mockReturnValueOnce(input.flow)
      .mockReturnValueOnce({ ...input.flow, checksum: 'f'.repeat(64) });
    service.assertFlowOwnership = vi.fn(async () => true);
    await expect(service.recoverQaReviewEvidence({ projectId, userId: 'usr_e5ru_founder', flowId: input.flow.flow_id, request }))
      .rejects.toMatchObject({ code: 'merchant_flow_founder_qa_recovery_stale', status: 409 });
    expect(operatorAuthorization.authorize).toHaveBeenCalledWith({ userId: 'usr_e5ru_founder', projectId, flow: input.flow });
    expect(operatorEvidenceResolver.recoverQaReviewEvidence).toHaveBeenCalledTimes(1);
    expect(input.flow.state).toBe('qa_review_required');
  });
});
