import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  digest,
  MerchantFlowOperatorEvidenceResolver
} = require('../server/services/merchant-flow-operator-evidence-resolver.cjs');

const root = path.resolve(process.cwd(), '../..');
const relativeDirectory = 'output/e5r-a-operator-evidence-tests';
const directory = path.join(root, relativeDirectory);

function writeJson(name, value) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, name), `${JSON.stringify(value, null, 2)}\n`);
  return `${relativeDirectory}/${name}`;
}

function checksummed({ idField, checksumField, id, value = {} }) {
  const base = { [idField]: id, ...value };
  return { ...base, [checksumField]: digest(base) };
}

function binding(node, idField, checksumField, reference) {
  return { id: node[idField], checksum: node[checksumField], reference };
}

afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('Checksum-bound merchant-flow operator evidence', () => {
  it('resolves a human QA decision against the exact merchant render and artifact', () => {
    const flow = {
      flow_id: 'merchant-flow-evidence-test',
      project_id: 'project-evidence-test',
      organization_id: 'organization-evidence-test',
      paid_identity: { order_id: 'order-evidence-test' },
      artifact: { artifact_id: 'artifact-evidence-test', checksum: 'a'.repeat(64) },
      render_qa: { render_checksum: 'b'.repeat(64), d1: { status: 'passed' }, d2_7: { status: 'review_required' } }
    };
    const renderRequest = {
      request_id: 'render-request-evidence-test',
      flow: {
        flow_id: flow.flow_id,
        project_id: flow.project_id,
        organization_id: flow.organization_id,
        order_id: flow.paid_identity.order_id
      },
      generation: { artifact: { artifact_id: flow.artifact.artifact_id, sha256: flow.artifact.checksum } }
    };
    writeJson('render-request.json', renderRequest);
    const evaluation = checksummed({
      idField: 'evaluation_id', checksumField: 'evaluation_checksum', id: 'design-evaluation-evidence-test',
      value: { request: { source_render: { request_id: renderRequest.request_id, checksum: flow.render_qa.render_checksum } } }
    });
    const evaluationReference = writeJson('evaluation.json', evaluation);
    const evaluationBinding = binding(evaluation, 'evaluation_id', 'evaluation_checksum', evaluationReference);
    flow.render_qa.d2_7 = { status: 'review_required', evidence_id: evaluationBinding.id, evidence_checksum: evaluationBinding.checksum };
    const review = checksummed({
      idField: 'review_id', checksumField: 'review_checksum', id: 'design-review-evidence-test',
      value: { reviewer: 'human', evaluation: evaluationBinding, decision: 'accepted' }
    });
    const reviewBinding = binding(review, 'review_id', 'review_checksum', writeJson('review.json', review));
    const request = {
      operation_kind: 'qa_review',
      decision: 'accepted',
      evidence: { evaluation: evaluationBinding, review: reviewBinding }
    };
    const resolver = new MerchantFlowOperatorEvidenceResolver({ root });
    expect(resolver.verify({ flow, request })).toMatchObject({
      evaluation: { binding: evaluationBinding },
      review: { binding: reviewBinding }
    });

    const tampered = { ...review, decision: 'needs_fix' };
    writeJson('review.json', tampered);
    expect(() => resolver.verify({ flow, request })).toThrowError(expect.objectContaining({ code: 'merchant_flow_operator_evidence_checksum_mismatch' }));
  });

  it('requires the complete approved repair graph and disabled automatic repair', () => {
    const reviewedFinding = { id: 'design-review-repair-test', checksum: 'c'.repeat(64) };
    const flow = {
      repair: { repair_class: 'responsive_layout', evidence_id: reviewedFinding.id, evidence_checksum: reviewedFinding.checksum },
      operator_provenance: { qa_review: { review: reviewedFinding } }
    };
    const plan = checksummed({
      idField: 'repair_plan_id', checksumField: 'repair_plan_checksum', id: 'repair-plan-evidence-test',
      value: { reviewed_finding: reviewedFinding, repair_class: 'responsive_layout' }
    });
    const planBinding = binding(plan, 'repair_plan_id', 'repair_plan_checksum', writeJson('repair-plan.json', plan));
    const approval = checksummed({
      idField: 'approval_id', checksumField: 'approval_checksum', id: 'repair-approval-evidence-test',
      value: { repair_plan: planBinding, decision: 'approved_for_bounded_execution' }
    });
    const approvalBinding = binding(approval, 'approval_id', 'approval_checksum', writeJson('repair-approval.json', approval));
    const execution = checksummed({
      idField: 'execution_id', checksumField: 'execution_checksum', id: 'repair-execution-evidence-test',
      value: { repair_plan: planBinding, plan_approval: approvalBinding }
    });
    const executionBinding = binding(execution, 'execution_id', 'execution_checksum', writeJson('repair-execution.json', execution));
    const postQa = checksummed({
      idField: 'evaluation_id', checksumField: 'evaluation_checksum', id: 'post-repair-qa-evidence-test',
      value: { repair_execution: executionBinding, status: 'passed' }
    });
    const postQaBinding = binding(postQa, 'evaluation_id', 'evaluation_checksum', writeJson('post-repair-qa.json', postQa));
    const humanReview = checksummed({
      idField: 'human_review_id', checksumField: 'human_review_checksum', id: 'repair-human-review-evidence-test',
      value: {
        reviewer: 'human', decision: 'approved', repair_execution: executionBinding,
        post_repair_qa: postQaBinding, safety: { automatic_repair_allowed: false }
      }
    });
    const humanReviewBinding = binding(humanReview, 'human_review_id', 'human_review_checksum', writeJson('repair-human-review.json', humanReview));
    const finalState = checksummed({
      idField: 'final_state_id', checksumField: 'final_state_checksum', id: 'repair-final-state-evidence-test',
      value: {
        status: 'human_approved', repair_execution: executionBinding,
        final_human_review: humanReviewBinding, safety: { automatic_repair_allowed: false }
      }
    });
    const finalStateBinding = binding(finalState, 'final_state_id', 'final_state_checksum', writeJson('repair-final-state.json', finalState));
    const request = {
      operation_kind: 'repair_resolution', decision: 'human_approved',
      evidence: {
        repair_class: 'responsive_layout', repair_plan: planBinding, plan_approval: approvalBinding,
        repair_execution: executionBinding, post_repair_qa: postQaBinding,
        final_human_review: humanReviewBinding, final_state: finalStateBinding
      }
    };
    const resolver = new MerchantFlowOperatorEvidenceResolver({ root });
    expect(resolver.verify({ flow, request }).final_state.binding).toEqual(finalStateBinding);

    const unsafe = checksummed({
      idField: 'final_state_id', checksumField: 'final_state_checksum', id: finalState.final_state_id,
      value: { ...finalState, final_state_checksum: undefined, safety: { automatic_repair_allowed: true } }
    });
    writeJson('repair-final-state.json', unsafe);
    request.evidence.final_state.checksum = unsafe.final_state_checksum;
    expect(() => resolver.verify({ flow, request })).toThrowError(expect.objectContaining({ code: 'merchant_flow_repair_final_state_invalid' }));
  });

  it('rejects evidence references outside bounded output/plans storage', () => {
    const resolver = new MerchantFlowOperatorEvidenceResolver({ root });
    expect(() => resolver.verify({
      flow: {},
      request: {
        operation_kind: 'qa_review', decision: 'accepted',
        evidence: {
          evaluation: { id: 'evaluation', checksum: 'a'.repeat(64), reference: '../outside.json' },
          review: { id: 'review', checksum: 'b'.repeat(64), reference: 'output/review.json' }
        }
      }
    })).toThrowError(expect.objectContaining({ code: 'merchant_flow_operator_evidence_reference_invalid' }));
  });
});
