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
  prepareQaReviewSubmission
} = require('../server/services/merchant-flow-operator-evidence-resolver.cjs');

const root = path.resolve(process.cwd(), '../..');
const env = {
  NODE_ENV: 'test',
  SHOPIFY_API_KEY: 'e5rs-shopify-client',
  SHOPIFY_API_SECRET: 'e5rs-shopify-secret'
};
const projectId = 'prj_e5rs_operator';
const organizationId = 'org_e5rs_operator';
const connectionId = 'shc_e5rs_operator';
const shop = 'controlled-e5rs.myshopify.com';
const evidenceDirectory = path.join(root, 'output', 'merchant-flow-storefront-renders', `merchant-render-e5rs-${process.pid}`);

function writeJson(filename, value) {
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const absolute = path.join(evidenceDirectory, filename);
  fs.writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`);
  return path.relative(root, absolute).split(path.sep).join('/');
}

function savedReviewFlow() {
  const evaluation = {
    evidence_id: 'merchant-flow-d2-7-evaluation-e5rs',
    provenance: {
      flow_id: 'merchant-flow-e5rs',
      artifact_id: 'theme-artifact-e5rs',
      artifact_sha256: 'a'.repeat(64)
    }
  };
  const evaluationReference = writeJson('d2-7-evaluation.json', evaluation);
  const evaluationBinding = { id: evaluation.evidence_id, checksum: digest(evaluation), reference: evaluationReference };
  const reviewBase = {
    review_id: 'design-review-e5rs',
    reviewer: 'human',
    evaluation: evaluationBinding,
    decision: 'accepted',
    observations: [{ decision: 'accepted', classification: 'controlled_beta_limitation' }]
  };
  const review = { ...reviewBase, review_checksum: digest(reviewBase) };
  const reviewReference = writeJson('d2-7-human-review-attempt-8.json', review);
  const flow = {
    flow_id: 'merchant-flow-e5rs', project_id: projectId, organization_id: organizationId,
    state: 'qa_review_required', sequence: 26, checksum: 'b'.repeat(64),
    paid_identity: { order_id: 'order-e5rs' },
    artifact: { artifact_id: 'theme-artifact-e5rs', checksum: 'a'.repeat(64) },
    render_qa: {
      render_checksum: 'c'.repeat(64),
      d2_7: { status: 'review_required', evidence_id: evaluationBinding.id, evidence_checksum: evaluationBinding.checksum }
    },
    operator_provenance: { qa_review: null }
  };
  return { flow, evaluationBinding, review, reviewReference };
}

function signedSession({ userId = 'usr_e5rs_founder', shopDomain = shop } = {}) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ aud: env.SHOPIFY_API_KEY, dest: `https://${shopDomain}`, exp: Math.floor(Date.now() / 1000) + 60, iss: `https://${shopDomain}/admin`, sub: userId })).toString('base64url');
  const signature = crypto.createHmac('sha256', env.SHOPIFY_API_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

async function invoke(api, { token = null, body }) {
  const request = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(request, {
    method: 'POST',
    url: `/api/projects/${projectId}/merchant-generation-flow/operator/qa-review`,
    headers: {
      host: 'dashboard.test', 'content-type': 'application/json',
      'idempotency-key': body.idempotency_key,
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
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

afterEach(() => fs.rmSync(evidenceDirectory, { recursive: true, force: true }));

describe('E5R-S saved founder QA submission', () => {
  it('discovers one exact accepted review and produces a deterministic checksum-bound request only while review is pending', () => {
    const { flow, evaluationBinding, review, reviewReference } = savedReviewFlow();
    const first = prepareQaReviewSubmission({ root, flow });
    const second = prepareQaReviewSubmission({ root, flow });

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      contract_version: 'merchant-flow-founder-qa-submission-v1', available: true,
      request: {
        flow_id: flow.flow_id, expected_flow_sequence: 26, expected_flow_checksum: flow.checksum,
        decision: 'accepted',
        evidence: {
          evaluation: evaluationBinding,
          review: { id: review.review_id, checksum: review.review_checksum, reference: reviewReference }
        }
      }
    });
    expect(first.request.idempotency_key).toMatch(/^merchant-flow-founder-qa-[a-f0-9]{32}$/);
    expect(prepareQaReviewSubmission({ root, flow: { ...flow, state: 'preview_ready' } }).available).toBe(false);
    expect(prepareQaReviewSubmission({ root, flow: { ...flow, operator_provenance: { qa_review: { operation_id: 'already-applied' } } } }).available).toBe(false);

    writeJson('d2-7-human-review-attempt-8.json', { ...review, review_checksum: 'f'.repeat(64) });
    expect(prepareQaReviewSubmission({ root, flow }).available).toBe(false);
  });

  it('adds the saved-review action only after protected operator authorization', async () => {
    const { flow } = savedReviewFlow();
    const operatorAuthorization = { authorize: vi.fn(async ({ userId }) => {
      if (userId !== 'usr_e5rs_founder') throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
      return { project: { id: projectId, organization_id: organizationId } };
    }) };
    const operatorEvidenceResolver = { prepareQaReviewSubmission: vi.fn(() => prepareQaReviewSubmission({ root, flow })) };
    const service = new MerchantGenerationFlowService({
      root,
      store: { findCreativeDirectorForProject: vi.fn(async () => ({ generation_state: { merchant_flow: flow } })) },
      projectService: {}, operatorAuthorization, operatorEvidenceResolver
    });
    service.flowFromSession = vi.fn(() => flow);

    const result = await service.operatorReadiness({ projectId, userId: 'usr_e5rs_founder', readiness: { status: 'READY' } });
    expect(result).toMatchObject({ status: 'READY', qa_review_submission: { available: true, request: { decision: 'accepted' } } });
    expect(operatorAuthorization.authorize.mock.invocationCallOrder[0]).toBeLessThan(operatorEvidenceResolver.prepareQaReviewSubmission.mock.invocationCallOrder[0]);
    await expect(service.operatorReadiness({ projectId, userId: 'usr_e5rs_merchant', readiness: { status: 'READY' } }))
      .rejects.toMatchObject({ code: 'merchant_flow_operator_forbidden', status: 403 });
    expect(operatorEvidenceResolver.prepareQaReviewSubmission).toHaveBeenCalledTimes(1);
  });

  it('invokes the existing endpoint with a verified embedded actor and rejects missing or non-operator identities', async () => {
    const { flow } = savedReviewFlow();
    const submission = prepareQaReviewSubmission({ root, flow }).request;
    const applyQaReview = vi.fn(async ({ userId, flowId }) => {
      if (userId !== 'usr_e5rs_founder') throw new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403);
      return { operation: { operation_id: 'merchant-flow-operation-e5rs', status: 'applied' }, flow: { flow_id: flowId, state: 'preview_ready' }, replayed: false };
    });
    const services = {
      env,
      auth: { authenticate: vi.fn(async () => null) },
      embeddedAuth: {
        resolveActor: vi.fn(async ({ shopDomain, shopifyUserId }) => {
          if (shopDomain !== shop) throw new DashboardError('shopify_embedded_identity_invalid', 'This Shopify session is not authorized for the current workspace.', 403);
          return { user: { id: shopifyUserId }, identity: { organization_id: organizationId }, connection: { id: connectionId } };
        })
      },
      projects: { authorizeShopifyProjectContext: vi.fn(async () => true) },
      merchantFlow: { applyQaReview }
    };
    const api = createDashboardApiHandler({ services, env });

    expect(await invoke(api, { body: submission })).toMatchObject({ status: 403, payload: { error: { code: 'csrf_invalid' } } });
    expect(await invoke(api, { token: signedSession({ userId: 'usr_e5rs_merchant' }), body: submission })).toMatchObject({ status: 403, payload: { error: { code: 'merchant_flow_operator_forbidden' } } });
    const founder = await invoke(api, { token: signedSession(), body: submission });
    expect(founder).toMatchObject({ status: 200, payload: { result: { operation: { status: 'applied' }, flow: { state: 'preview_ready' } } } });
    expect(applyQaReview).toHaveBeenLastCalledWith({
      projectId, userId: 'usr_e5rs_founder', flowId: flow.flow_id,
      request: {
        contract_version: 'merchant-flow-operator-operation-v1', operation_kind: 'qa_review',
        idempotency_key: submission.idempotency_key,
        expected_flow_sequence: submission.expected_flow_sequence,
        expected_flow_checksum: submission.expected_flow_checksum,
        evidence: submission.evidence,
        decision: 'accepted'
      }
    });
  });
});
