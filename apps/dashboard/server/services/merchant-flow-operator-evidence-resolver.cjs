'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { isPathInside } = require('../../../../ai/theme-generator/utils');
const {
  RECOVERY_PROJECTION_CONTRACT,
  RECOVERY_REQUEST_CONTRACT,
  storageDigest,
  completeObjectRoot,
  recoveryId,
  recoveryReplicaId,
  recoveryIdempotencyKey,
  assertRecoveryRequest,
  createRecoveryRecord,
  assertRecoveryRecord
} = require('../../../../ai/merchant-flow/founder-qa-evidence-recovery');

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const MAX_RENDER_EVIDENCE_DIRECTORIES = 1024;
const MAX_REVIEW_CANDIDATES = 128;
const MAX_RECOVERY_RECORDS = 32;
const MAX_DISCOVERY_BYTES = 64 * 1024 * 1024;
const FOUNDER_QA_SUBMISSION_CONTRACT = 'merchant-flow-founder-qa-submission-v1';
const FIELD_PAIRS = Object.freeze({
  evaluation: [['evidence_id', null], ['evaluation_id', 'evaluation_checksum']],
  review: [['review_id', 'review_checksum'], ['human_review_id', 'human_review_checksum']],
  repair_plan: [['repair_plan_id', 'repair_plan_checksum']],
  plan_approval: [['approval_id', 'approval_checksum']],
  repair_execution: [['execution_id', 'execution_checksum']],
  post_repair_qa: [['evidence_id', null], ['evaluation_id', 'evaluation_checksum'], ['review_packet_id', 'review_packet_checksum']],
  final_human_review: [['human_review_id', 'human_review_checksum'], ['review_id', 'review_checksum']],
  final_state: [['final_state_id', 'final_state_checksum']]
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function evidenceError(code, message) { return Object.assign(new Error(message), { code, retryable: false }); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

function boundedEvidencePath(root, reference) {
  const normalized = String(reference || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized.endsWith('.json') || (!normalized.startsWith('output/') && !normalized.startsWith('plans/'))) {
    throw evidenceError('merchant_flow_operator_evidence_reference_invalid', 'Operator evidence must reference a bounded JSON artifact.');
  }
  const absolute = path.resolve(root, normalized);
  const outputRoot = path.resolve(root, 'output');
  const plansRoot = path.resolve(root, 'plans');
  if (!isPathInside(outputRoot, absolute) && !isPathInside(plansRoot, absolute)) {
    throw evidenceError('merchant_flow_operator_evidence_reference_invalid', 'Operator evidence escaped its bounded storage root.');
  }
  return { reference: normalized, absolute };
}

function readEvidence(root, reference) {
  const loaded = readEvidenceBytes(root, reference);
  try { return { ...loaded, value: JSON.parse(loaded.bytes.toString('utf8')) }; }
  catch { throw evidenceError('merchant_flow_operator_evidence_invalid', 'Required operator evidence is not valid JSON.'); }
}

function readEvidenceBytes(root, reference) {
  const resolved = boundedEvidencePath(root, reference);
  let stat;
  try { stat = fs.statSync(resolved.absolute); }
  catch { throw evidenceError('merchant_flow_operator_evidence_missing', 'Required operator evidence is unavailable.'); }
  if (!stat.isFile() || stat.size < 2 || stat.size > MAX_EVIDENCE_BYTES) throw evidenceError('merchant_flow_operator_evidence_invalid', 'Required operator evidence is not a valid bounded artifact.');
  return { ...resolved, bytes: fs.readFileSync(resolved.absolute) };
}

function nodes(value, matches = []) {
  if (!value || typeof value !== 'object') return matches;
  matches.push(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) nodes(child, matches);
  return matches;
}

function verifyNodeChecksum(node, expectedChecksum, checksumField) {
  if (checksumField && Object.hasOwn(node, checksumField)) {
    if (node[checksumField] !== expectedChecksum) return false;
    const base = clone(node); delete base[checksumField];
    return digest(base) === expectedChecksum;
  }
  return digest(node) === expectedChecksum;
}

function resolveBinding(root, binding, kind) {
  if (!binding?.id || !/^[a-f0-9]{64}$/.test(String(binding.checksum || '')) || !binding.reference) {
    throw evidenceError('merchant_flow_operator_evidence_binding_invalid', 'Operator evidence requires an ID, checksum, and bounded reference.');
  }
  const loaded = readEvidence(root, binding.reference);
  return resolveBindingValue(loaded, binding, kind);
}

function resolveBindingValue(loaded, binding, kind) {
  const candidates = [];
  for (const node of nodes(loaded.value)) {
    for (const [idField, checksumField] of FIELD_PAIRS[kind] || []) {
      if (node?.[idField] === binding.id && verifyNodeChecksum(node, binding.checksum, checksumField)) candidates.push({ node, idField, checksumField });
    }
  }
  if (candidates.length !== 1) throw evidenceError('merchant_flow_operator_evidence_checksum_mismatch', 'Operator evidence identity or checksum could not be verified.');
  return { ...loaded, binding: { id: binding.id, checksum: binding.checksum, reference: loaded.reference }, node: candidates[0].node };
}

function containsBinding(value, binding) {
  return nodes(value, []).some((node) => Object.values(node).includes(binding.id) && Object.values(node).includes(binding.checksum));
}
function containsValue(value, expected) { return nodes(value, []).some((node) => Object.values(node).includes(expected)); }
function humanReviewer(value) {
  return value?.reviewer === 'human'
    || value?.reviewer?.kind === 'human'
    || value?.reviewer_type === 'human'
    || value?.reviewer_role === 'human_reviewer';
}
function hasHumanReviewer(value) { return nodes(value, []).some(humanReviewer); }
function hasPassedQa(value) {
  return nodes(value, []).some((node) => node?.status === 'passed'
    || node?.quality_gate_status === 'passed'
    || node?.post_repair_qa_passed === true
    || node?.passed === true);
}
function automaticRepairDisabled(value) {
  return nodes(value, []).some((node) => node?.automatic_repair_allowed === false);
}

function assertEvaluationFlowBinding({ evaluation, flow, artifact, root }) {
  if (evaluation.value?.provenance?.flow_id === flow.flow_id
    && evaluation.value.provenance.artifact_id === artifact.artifact_id
    && evaluation.value.provenance.artifact_sha256 === artifact.checksum) return;
  const renderRequestReference = path.posix.join(path.posix.dirname(evaluation.reference), 'render-request.json');
  const renderRequest = readEvidence(root, renderRequestReference).value;
  if (renderRequest?.flow?.flow_id !== flow.flow_id || renderRequest.flow.project_id !== flow.project_id
    || renderRequest.flow.organization_id !== flow.organization_id || renderRequest.flow.order_id !== flow.paid_identity?.order_id
    || renderRequest.generation?.artifact?.artifact_id !== artifact.artifact_id
    || renderRequest.generation.artifact.sha256 !== artifact.checksum) {
    throw evidenceError('merchant_flow_operator_evaluation_scope_mismatch', 'The evaluation evidence does not belong to the current merchant flow.');
  }
  const source = evaluation.value?.request?.source_render;
  if (source && (source.request_id !== renderRequest.request_id || source.checksum !== flow.render_qa?.render_checksum)) {
    throw evidenceError('merchant_flow_operator_evaluation_scope_mismatch', 'The evaluation evidence render binding is stale.');
  }
}

function assertQaReviewResolvedEvidence({ root, flow, request, evaluation, review }) {
  assertEvaluationFlowBinding({ evaluation, flow, artifact: flow.artifact, root });
  if (!containsBinding(review.value, request.evidence.evaluation) || !hasHumanReviewer(review.value)) {
    throw evidenceError('merchant_flow_qa_review_evidence_invalid', 'The human review does not bind the authoritative evaluation.');
  }
  const decisions = request.decision === 'needs_fix' ? new Set(['needs_fix', 'repair_required']) : new Set(['accepted', 'approved', 'human_approved']);
  if (!nodes(review.value, []).some((node) => decisions.has(node?.decision))
    || (request.decision === 'needs_fix' && !containsValue(review.value, request.evidence.repair_class))) {
    throw evidenceError('merchant_flow_qa_review_evidence_invalid', 'The submitted decision differs from the checksum-bound human review.');
  }
  return { evaluation, review };
}

function assertQaReviewEvidence({ root, flow, request }) {
  const evaluation = resolveBinding(root, request.evidence.evaluation, 'evaluation');
  const review = recoveredReviewName(path.basename(String(request.evidence.review.reference || '')))
    ? resolveRecoveredReviewBinding(root, flow, evaluation, request.evidence.review)
    : resolveBinding(root, request.evidence.review, 'review');
  return assertQaReviewResolvedEvidence({ root, flow, request, evaluation, review });
}

function assertRepairResolutionEvidence({ root, flow, request }) {
  if (!flow.operator_provenance?.qa_review?.review || flow.repair?.evidence_id !== flow.operator_provenance.qa_review.review.id
    || flow.repair?.evidence_checksum !== flow.operator_provenance.qa_review.review.checksum) {
    throw evidenceError('merchant_flow_repair_authority_missing', 'The active repair is not bound to a checksum-reviewed finding.');
  }
  const resolved = Object.fromEntries(['repair_plan', 'plan_approval', 'repair_execution', 'post_repair_qa', 'final_human_review', 'final_state']
    .map((kind) => [kind, resolveBinding(root, request.evidence[kind], kind)]));
  const reviewedFinding = flow.operator_provenance.qa_review.review;
  if (!containsBinding(resolved.repair_plan.value, reviewedFinding)
    || !containsValue(resolved.repair_plan.value, request.evidence.repair_class)
    || !containsBinding(resolved.plan_approval.value, request.evidence.repair_plan)
    || !containsValue(resolved.plan_approval.value, 'approved_for_bounded_execution')
    || !containsBinding(resolved.repair_execution.value, request.evidence.repair_plan)
    || !containsBinding(resolved.repair_execution.value, request.evidence.plan_approval)
    || !containsBinding(resolved.post_repair_qa.value, request.evidence.repair_execution)
    || !containsBinding(resolved.final_human_review.value, request.evidence.repair_execution)
    || !containsBinding(resolved.final_human_review.value, request.evidence.post_repair_qa)
    || !containsBinding(resolved.final_state.value, request.evidence.repair_execution)
    || !containsBinding(resolved.final_state.value, request.evidence.final_human_review)) {
    throw evidenceError('merchant_flow_repair_evidence_graph_invalid', 'The bounded repair evidence graph is incomplete or stale.');
  }
  if (!hasHumanReviewer(resolved.final_human_review.value)) throw evidenceError('merchant_flow_repair_human_review_missing', 'The repair has no checksum-bound human final review.');
  if (request.decision === 'human_approved') {
    if (!containsValue(resolved.final_human_review.value, 'approved')
      || !containsValue(resolved.final_state.value, 'human_approved')
      || !hasPassedQa(resolved.post_repair_qa.value)
      || !automaticRepairDisabled(resolved.final_human_review.value)
      || !automaticRepairDisabled(resolved.final_state.value)) {
      throw evidenceError('merchant_flow_repair_final_state_invalid', 'The bounded repair is not human-approved with passed post-repair QA and automatic repair disabled.');
    }
  } else if (!containsValue(resolved.final_state.value, request.decision)) {
    throw evidenceError('merchant_flow_repair_final_state_invalid', 'The repair-resolution decision differs from the final state evidence.');
  }
  return resolved;
}

function unavailableQaReviewSubmission() {
  return { contract_version: FOUNDER_QA_SUBMISSION_CONTRACT, available: false };
}

function directEntries(directory) {
  try { return fs.readdirSync(directory, { withFileTypes: true }); }
  catch { return []; }
}

function findCurrentEvaluation(root, flow) {
  const gate = flow.render_qa?.d2_7;
  if (!gate?.evidence_id || !/^[a-f0-9]{64}$/.test(String(gate.evidence_checksum || '')) || gate.status === 'not_required') return null;
  const renderRoot = path.resolve(root, 'output', 'merchant-flow-storefront-renders');
  const directories = directEntries(renderRoot).filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name));
  if (directories.length > MAX_RENDER_EVIDENCE_DIRECTORIES) return null;
  const candidates = [];
  let inspectedBytes = 0;
  for (const directory of directories) {
    const absolute = path.join(renderRoot, directory.name, 'd2-7-evaluation.json');
    let stat;
    try { stat = fs.lstatSync(absolute); } catch { continue; }
    if (!stat.isFile()) continue;
    inspectedBytes += stat.size;
    if (inspectedBytes > MAX_DISCOVERY_BYTES) return null;
    const reference = path.relative(root, absolute).split(path.sep).join('/');
    const loaded = readEvidence(root, reference);
    if (!nodes(loaded.value, []).some((node) => node?.evidence_id === gate.evidence_id || node?.evaluation_id === gate.evidence_id)) continue;
    candidates.push(resolveBinding(root, { id: gate.evidence_id, checksum: gate.evidence_checksum, reference }, 'evaluation'));
  }
  return candidates.length === 1 ? candidates[0] : null;
}

function reviewBindingFromFile(root, reference) {
  const loaded = readEvidence(root, reference);
  return reviewBindingFromLoaded(loaded);
}

function reviewBindingFromLoaded(loaded) {
  for (const [idField, checksumField] of FIELD_PAIRS.review) {
    const id = loaded.value?.[idField];
    const checksum = loaded.value?.[checksumField];
    if (!id || !/^[a-f0-9]{64}$/.test(String(checksum || ''))) continue;
    return resolveBindingValue(loaded, { id, checksum, reference: loaded.reference }, 'review');
  }
  return null;
}

function normalReviewName(name) {
  return /^d2-7-human-review(?:-[A-Za-z0-9._-]+)?\.json$/.test(name) && !recoveredReviewName(name);
}
function recoveredReviewName(name) { return /^d2-7-human-review-recovered-[a-f0-9]{20}\.json$/.test(name); }
function recoveryRecordName(name) { return /^founder-qa-evidence-recovery-[a-f0-9]{20}\.json$/.test(name); }

function qaRequest(evaluation, review) {
  return {
    operation_kind: 'qa_review',
    evidence: { evaluation: evaluation.binding, review: review.binding },
    decision: 'accepted'
  };
}

function validateAcceptedReview({ root, flow, evaluation, review }) {
  if (!review || review.node?.decision !== 'accepted' || !hasHumanReviewer(review.value)) {
    throw evidenceError('merchant_flow_qa_review_evidence_invalid', 'The founder review is not one accepted human decision.');
  }
  assertQaReviewResolvedEvidence({ root, flow, request: qaRequest(evaluation, review), evaluation, review });
  return review;
}

function recoveryRecordReferences(directory) {
  const entries = directEntries(directory)
    .filter((entry) => entry.isFile() && recoveryRecordName(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length > MAX_RECOVERY_RECORDS) throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'Too many founder-review recovery records are present.');
  return entries.map((entry) => path.join(directory, entry.name));
}

function validateRecoveryRecordGraph({ root, flow, evaluation, malformed, absolute }) {
  const reference = path.relative(root, absolute).split(path.sep).join('/');
  const loaded = readEvidence(root, reference);
  let record;
  try { record = assertRecoveryRecord(loaded.value, root); }
  catch { throw evidenceError('merchant_flow_founder_qa_recovery_record_invalid', 'The founder-review recovery record is invalid.'); }
  if (record.scope.flow_id !== flow.flow_id
    || record.scope.project_id !== flow.project_id
    || record.scope.organization_id !== flow.organization_id
    || record.scope.flow_sequence !== flow.sequence
    || record.scope.flow_checksum !== flow.checksum
    || record.scope.shop_domain !== flow.store_context?.shop
    || record.scope.shopify_connection_id !== flow.store_context?.connection_id
    || record.review.id !== malformed.review.binding.id
    || record.review.checksum !== malformed.review.binding.checksum
    || record.review.decision !== 'accepted'
    || record.evaluation.id !== evaluation.binding.id
    || record.evaluation.checksum !== evaluation.binding.checksum
    || record.evaluation.reference !== evaluation.binding.reference
    || record.corrupted_artifact.reference !== malformed.reference) {
    throw evidenceError('merchant_flow_founder_qa_recovery_scope_mismatch', 'The founder-review recovery record does not bind the current flow evidence.');
  }
  const original = readEvidenceBytes(root, record.corrupted_artifact.reference);
  if (storageDigest(original.bytes) !== record.corrupted_artifact.storage_sha256) throw evidenceError('merchant_flow_founder_qa_recovery_corrupted_hash_mismatch', 'The original founder-review storage hash changed.');
  if (record.corrupted_artifact.storage_sha256 !== malformed.analysis.storage_sha256
    || record.corrupted_artifact.byte_length !== malformed.analysis.byte_length
    || record.corrupted_artifact.valid_json_root_length !== malformed.analysis.valid_json_root_length
    || record.corrupted_artifact.trailing_byte_count !== malformed.analysis.trailing_byte_count) {
    throw evidenceError('merchant_flow_founder_qa_recovery_scope_mismatch', 'The founder-review recovery record does not bind the current malformed byte boundaries.');
  }
  const recoveredBytes = readEvidenceBytes(root, record.recovered_artifact.reference);
  if (storageDigest(recoveredBytes.bytes) !== record.recovered_artifact.storage_sha256
    || recoveredBytes.bytes.length !== record.recovered_artifact.byte_length) {
    throw evidenceError('merchant_flow_founder_qa_recovery_replica_hash_mismatch', 'The recovered founder-review storage hash does not match its recovery record.');
  }
  const recoveredLoaded = readEvidence(root, record.recovered_artifact.reference);
  const recovered = resolveBindingValue(recoveredLoaded, {
    id: record.review.id,
    checksum: record.review.checksum,
    reference: record.recovered_artifact.reference
  }, 'review');
  if (JSON.stringify(stable(recovered.value)) !== JSON.stringify(stable(malformed.review.value))) {
    throw evidenceError('merchant_flow_founder_qa_recovery_semantic_mismatch', 'The recovered founder review differs from the original semantic payload.');
  }
  validateAcceptedReview({ root, flow, evaluation, review: recovered });
  return { record, reference, recovered };
}

function inspectFounderReviewEvidence(root, flow, evaluation = null) {
  const currentEvaluation = evaluation || findCurrentEvaluation(root, flow);
  if (!currentEvaluation) throw evidenceError('merchant_flow_operator_evidence_missing', 'The current D2.7 evaluation is unavailable.');
  const directory = path.dirname(currentEvaluation.absolute);
  const entries = directEntries(directory)
    .filter((entry) => entry.isFile() && normalReviewName(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (entries.length === 0 || entries.length > MAX_REVIEW_CANDIDATES) throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'The founder-review evidence set is missing or ambiguous.');
  const normal = [];
  const malformed = [];
  const invalid = [];
  let inspectedBytes = 0;
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const stat = fs.lstatSync(absolute);
    inspectedBytes += stat.size;
    if (inspectedBytes > MAX_DISCOVERY_BYTES) throw evidenceError('merchant_flow_operator_evidence_invalid', 'The founder-review evidence set exceeds its bounded discovery budget.');
    const reference = path.relative(root, absolute).split(path.sep).join('/');
    try {
      const review = validateAcceptedReview({ root, flow, evaluation: currentEvaluation, review: reviewBindingFromFile(root, reference) });
      normal.push({ review, reference, absolute });
      continue;
    } catch (normalError) {
      try {
        const raw = readEvidenceBytes(root, reference);
        const analysis = completeObjectRoot(raw.bytes);
        const review = validateAcceptedReview({
          root,
          flow,
          evaluation: currentEvaluation,
          review: reviewBindingFromLoaded({ ...raw, value: analysis.value })
        });
        malformed.push({ review, reference, absolute, analysis });
      } catch (recoveryError) {
        invalid.push({ reference, code: recoveryError.code || normalError.code || 'merchant_flow_operator_evidence_invalid' });
      }
    }
  }
  if (normal.length === 1 && malformed.length === 0 && invalid.length === 0) return { kind: 'normal', evaluation: currentEvaluation, ...normal[0] };
  if (normal.length !== 0 || malformed.length !== 1 || invalid.length !== 0) throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'The founder-review evidence set is invalid or ambiguous.');
  const candidate = malformed[0];
  const recordFiles = recoveryRecordReferences(directory);
  const recoveredEntries = directEntries(directory)
    .filter((entry) => entry.isFile() && recoveredReviewName(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name));
  if (recoveredEntries.length > 1) {
    throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'Competing recovered founder-review replicas are present.');
  }
  if (recordFiles.length === 0) {
    const identityInput = {
      flow,
      review: { id: candidate.review.binding.id, checksum: candidate.review.binding.checksum },
      corruptedArtifact: { reference: candidate.reference, storage_sha256: candidate.analysis.storage_sha256 }
    };
    const replicaSuffix = recoveryReplicaId(identityInput).slice(-20);
    if (recoveredEntries.length === 1 && recoveredEntries[0].name !== `d2-7-human-review-recovered-${replicaSuffix}.json`) {
      throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'Competing recovered founder-review replicas are present.');
    }
    return { kind: 'recoverable', evaluation: currentEvaluation, ...candidate, identityInput };
  }
  if (recordFiles.length !== 1) throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'Multiple founder-review recovery records are present.');
  const recovered = validateRecoveryRecordGraph({ root, flow, evaluation: currentEvaluation, malformed: candidate, absolute: recordFiles[0] });
  if (recoveredEntries.length !== 1 || recoveredEntries[0].name !== path.basename(recovered.record.recovered_artifact.reference)) {
    throw evidenceError('merchant_flow_founder_qa_recovery_ambiguous', 'The authoritative recovery record does not resolve exactly one recovered founder-review replica.');
  }
  return { kind: 'recovered', evaluation: currentEvaluation, ...candidate, ...recovered, review: recovered.recovered };
}

function resolveRecoveredReviewBinding(root, flow, evaluation, binding) {
  const state = inspectFounderReviewEvidence(root, flow, evaluation);
  if (state.kind !== 'recovered'
    || state.review.binding.id !== binding.id
    || state.review.binding.checksum !== binding.checksum
    || state.review.binding.reference !== binding.reference) {
    throw evidenceError('merchant_flow_founder_qa_recovery_binding_invalid', 'The recovered founder review has no authoritative recovery binding.');
  }
  return state.review;
}

function unavailableQaReviewRecovery() {
  return { contract_version: RECOVERY_PROJECTION_CONTRACT, available: false };
}

function prepareQaReviewRecoverySubmission({ root, flow }) {
  if (!flow || flow.state !== 'qa_review_required' || flow.operator_provenance?.qa_review) return unavailableQaReviewRecovery();
  try {
    const state = inspectFounderReviewEvidence(root, flow);
    if (state.kind !== 'recoverable') return unavailableQaReviewRecovery();
    const request = {
      schema_version: '1.0',
      contract_version: RECOVERY_REQUEST_CONTRACT,
      organization_id: flow.organization_id,
      project_id: flow.project_id,
      flow_id: flow.flow_id,
      shop_domain: flow.store_context.shop,
      expected_flow_sequence: flow.sequence,
      expected_flow_checksum: flow.checksum,
      evaluation: clone(state.evaluation.binding),
      review: { id: state.review.binding.id, checksum: state.review.binding.checksum },
      corrupted_artifact: { reference: state.reference, storage_sha256: state.analysis.storage_sha256 }
    };
    request.idempotency_key = recoveryIdempotencyKey({ flow: request, review: request.review, corruptedArtifact: request.corrupted_artifact });
    return { contract_version: RECOVERY_PROJECTION_CONTRACT, available: true, request: assertRecoveryRequest(request, root) };
  } catch {
    return unavailableQaReviewRecovery();
  }
}

function prepareQaReviewSubmission({ root, flow }) {
  if (!flow || flow.state !== 'qa_review_required' || flow.operator_provenance?.qa_review) return unavailableQaReviewSubmission();
  try {
    const state = inspectFounderReviewEvidence(root, flow);
    if (!['normal', 'recovered'].includes(state.kind)) return unavailableQaReviewSubmission();
    const selected = qaRequest(state.evaluation, state.review);
    const idempotencyKey = `merchant-flow-founder-qa-${digest({
      flow_id: flow.flow_id,
      evaluation: selected.evidence.evaluation,
      review: selected.evidence.review,
      decision: selected.decision
    }).slice(0, 32)}`;
    return {
      contract_version: FOUNDER_QA_SUBMISSION_CONTRACT,
      available: true,
      request: {
        flow_id: flow.flow_id,
        expected_flow_sequence: flow.sequence,
        expected_flow_checksum: flow.checksum,
        evidence: clone(selected.evidence),
        decision: selected.decision,
        idempotency_key: idempotencyKey
      }
    };
  } catch {
    return unavailableQaReviewSubmission();
  }
}

function fsyncDirectory(directory) {
  let descriptor;
  try { descriptor = fs.openSync(directory, 'r'); fs.fsyncSync(descriptor); }
  catch { /* Some supported filesystems do not expose directory fsync. */ }
  finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

function createExclusiveAtomic(file, bytes) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomUUID()}`;
  let descriptor;
  let created = false;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor); descriptor = undefined;
    try { fs.linkSync(temporary, file); created = true; fsyncDirectory(path.dirname(file)); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
  return { created, bytes: fs.readFileSync(file) };
}

function removeCreatedArtifact(file, expectedHash) {
  try {
    const current = fs.readFileSync(file);
    if (storageDigest(current) === expectedHash) fs.rmSync(file);
  } catch { /* Nothing safe to remove. */ }
}

function sameRecoveryRecord(left, right) {
  return left.recovery_id === right.recovery_id
    && left.scope.flow_id === right.scope.flow_id
    && left.scope.flow_sequence === right.scope.flow_sequence
    && left.scope.flow_checksum === right.scope.flow_checksum
    && left.review.id === right.review.id
    && left.review.checksum === right.review.checksum
    && left.evaluation.id === right.evaluation.id
    && left.evaluation.checksum === right.evaluation.checksum
    && left.corrupted_artifact.reference === right.corrupted_artifact.reference
    && left.corrupted_artifact.storage_sha256 === right.corrupted_artifact.storage_sha256
    && left.recovered_artifact.reference === right.recovered_artifact.reference
    && left.recovered_artifact.storage_sha256 === right.recovered_artifact.storage_sha256
    && left.operation.idempotency_key === right.operation.idempotency_key
    && left.operation.request_checksum === right.operation.request_checksum;
}

function recoverQaReviewEvidence({ root, flow, request, operator, sourceRevision, runtimeRevision, createdAt }) {
  const authorized = assertRecoveryRequest(request, root);
  if (!flow || flow.state !== 'qa_review_required' || flow.operator_provenance?.qa_review
    || authorized.organization_id !== flow.organization_id
    || authorized.project_id !== flow.project_id
    || authorized.flow_id !== flow.flow_id
    || authorized.shop_domain !== flow.store_context?.shop
    || authorized.expected_flow_sequence !== flow.sequence
    || authorized.expected_flow_checksum !== flow.checksum
    || !operator?.user_id || !['owner', 'administrator'].includes(operator.role)
    || !/^[a-f0-9]{40}$/.test(String(sourceRevision || '')) || !runtimeRevision || !createdAt) {
    throw evidenceError('merchant_flow_founder_qa_recovery_stale', 'The founder-review recovery is not authorized for the current flow revision.');
  }
  const authorizedOriginal = readEvidenceBytes(root, authorized.corrupted_artifact.reference);
  if (storageDigest(authorizedOriginal.bytes) !== authorized.corrupted_artifact.storage_sha256) {
    throw evidenceError('merchant_flow_founder_qa_recovery_corrupted_hash_mismatch', 'The original founder-review storage hash changed.');
  }
  const projected = prepareQaReviewRecoverySubmission({ root, flow });
  if (projected.available !== true || digest(projected.request) !== digest(authorized)) {
    const existingState = inspectFounderReviewEvidence(root, flow);
    if (existingState.kind === 'recovered') {
      const record = existingState.record;
      if (record.operation.idempotency_key !== authorized.idempotency_key
        || record.operation.request_checksum !== digest(authorized)) {
        throw evidenceError('merchant_flow_founder_qa_recovery_conflict', 'A conflicting founder-review recovery already exists.');
      }
      return { record, review: existingState.review, replayed: true };
    }
    throw evidenceError('merchant_flow_founder_qa_recovery_ineligible', 'The founder-review evidence is not eligible for recovery.');
  }
  const state = inspectFounderReviewEvidence(root, flow);
  if (state.kind !== 'recoverable') throw evidenceError('merchant_flow_founder_qa_recovery_ineligible', 'The founder-review evidence is not eligible for recovery.');
  const originalBefore = readEvidenceBytes(root, state.reference);
  if (storageDigest(originalBefore.bytes) !== authorized.corrupted_artifact.storage_sha256) throw evidenceError('merchant_flow_founder_qa_recovery_corrupted_hash_mismatch', 'The original founder-review storage hash changed.');
  const identityInput = {
    flow,
    review: authorized.review,
    corruptedArtifact: { ...state.analysis, reference: state.reference, storage_sha256: state.analysis.storage_sha256 }
  };
  const replicaId = recoveryReplicaId(identityInput);
  const directoryReference = path.posix.dirname(state.reference);
  const replicaReference = path.posix.join(directoryReference, `d2-7-human-review-recovered-${replicaId.slice(-20)}.json`);
  const replicaPath = boundedEvidencePath(root, replicaReference).absolute;
  const replicaBytes = Buffer.from(`${JSON.stringify(stable(state.review.value), null, 2)}\n`, 'utf8');
  const replicaHash = storageDigest(replicaBytes);
  let replicaWrite;
  let recordWrite;
  let recordPath;
  try {
    replicaWrite = createExclusiveAtomic(replicaPath, replicaBytes);
    if (!replicaWrite.bytes.equals(replicaBytes)) throw evidenceError('merchant_flow_founder_qa_recovery_replica_conflict', 'A conflicting recovered founder-review replica already exists.');
    const postReplica = readEvidence(root, replicaReference);
    const postReview = resolveBindingValue(postReplica, { id: authorized.review.id, checksum: authorized.review.checksum, reference: replicaReference }, 'review');
    validateAcceptedReview({ root, flow, evaluation: state.evaluation, review: postReview });
    if (storageDigest(fs.readFileSync(replicaPath)) !== replicaHash) throw evidenceError('merchant_flow_founder_qa_recovery_replica_hash_mismatch', 'The recovered founder-review replica failed post-write validation.');
    const recordCandidate = createRecoveryRecord({
      flow,
      evaluation: state.evaluation.binding,
      review: authorized.review,
      corruptedArtifact: { ...state.analysis, reference: state.reference },
      recoveredArtifact: { replica_id: replicaId, reference: replicaReference, storage_sha256: replicaHash, byte_length: replicaBytes.length },
      request: authorized,
      operator,
      sourceRevision,
      runtimeRevision,
      createdAt
    }, root);
    const recordReference = path.posix.join(directoryReference, `founder-qa-evidence-recovery-${recoveryId(identityInput).slice(-20)}.json`);
    recordPath = boundedEvidencePath(root, recordReference).absolute;
    const recordBytes = Buffer.from(`${JSON.stringify(stable(recordCandidate), null, 2)}\n`, 'utf8');
    recordWrite = createExclusiveAtomic(recordPath, recordBytes);
    const persistedRecord = assertRecoveryRecord(JSON.parse(recordWrite.bytes.toString('utf8')), root);
    if (!sameRecoveryRecord(persistedRecord, recordCandidate)) throw evidenceError('merchant_flow_founder_qa_recovery_conflict', 'A conflicting founder-review recovery record already exists.');
    const resolved = inspectFounderReviewEvidence(root, flow);
    if (resolved.kind !== 'recovered' || resolved.record.recovery_id !== persistedRecord.recovery_id) throw evidenceError('merchant_flow_founder_qa_recovery_post_write_invalid', 'The recovered founder-review evidence graph failed post-write validation.');
    const originalAfter = readEvidenceBytes(root, state.reference);
    if (!originalAfter.bytes.equals(originalBefore.bytes)) throw evidenceError('merchant_flow_founder_qa_recovery_original_mutated', 'The original malformed founder-review artifact changed during recovery.');
    return { record: persistedRecord, review: resolved.review, replayed: !recordWrite.created };
  } catch (error) {
    if (recordWrite?.created && recordPath) removeCreatedArtifact(recordPath, storageDigest(recordWrite.bytes));
    if (replicaWrite?.created) removeCreatedArtifact(replicaPath, replicaHash);
    throw error;
  }
}

class MerchantFlowOperatorEvidenceResolver {
  constructor({ root, sourceRevision = null, runtimeRevision = null, authoritativeObjectService = null, clock = () => new Date() }) {
    this.root = root;
    this.sourceRevision = sourceRevision;
    this.runtimeRevision = runtimeRevision;
    this.authoritativeObjectService = authoritativeObjectService;
    this.clock = clock;
  }
  async persistRequestEvidence({ flow, request }) {
    if (!this.authoritativeObjectService) return;
    const scope = {
      organization_id: flow.organization_id, project_id: flow.project_id,
      connection_id: flow.store_context?.connection_id || null,
      canonical_shop: flow.store_context?.shop || null
    };
    for (const [kind, binding] of Object.entries(request.evidence || {})) {
      if (!binding?.reference || !binding?.id) continue;
      await this.authoritativeObjectService.ensureLocalFile({
        scope, localReference: binding.reference,
        objectClass: kind.includes('repair') || ['plan_approval', 'post_repair_qa', 'final_state', 'final_human_review'].includes(kind)
          ? 'repair_evidence' : kind === 'review' ? 'founder_review_evidence' : 'operator_evidence',
        evidenceKind: `operator_${kind}`,
        evidenceIdentity: binding.id,
        lineageIdentity: flow.flow_id
      });
    }
  }
  verify({ flow, request }) {
    const resolve = () => {
      if (request.operation_kind === 'qa_review') return assertQaReviewEvidence({ root: this.root, flow, request });
      if (request.operation_kind === 'repair_resolution') return assertRepairResolutionEvidence({ root: this.root, flow, request });
      return {};
    };
    if (!this.authoritativeObjectService) return resolve();
    return this.authoritativeObjectService.restoreProjectEvidence({ scope: this.scope(flow) })
      .then(resolve)
      .then(async (verified) => {
        await this.persistRequestEvidence({ flow, request });
        return verified;
      });
  }
  scope(flow) {
    return {
      organization_id: flow.organization_id, project_id: flow.project_id,
      connection_id: flow.store_context?.connection_id || null,
      canonical_shop: flow.store_context?.shop || null
    };
  }
  prepareQaReviewSubmission({ flow }) {
    const prepare = () => prepareQaReviewSubmission({ root: this.root, flow });
    return this.authoritativeObjectService
      ? this.authoritativeObjectService.restoreProjectEvidence({ scope: this.scope(flow) }).then(prepare)
      : prepare();
  }
  prepareQaReviewRecoverySubmission({ flow }) {
    const prepare = () => prepareQaReviewRecoverySubmission({ root: this.root, flow });
    return this.authoritativeObjectService
      ? this.authoritativeObjectService.restoreProjectEvidence({ scope: this.scope(flow) }).then(prepare)
      : prepare();
  }
  async recoverQaReviewEvidence({ flow, request, operator }) {
    if (this.authoritativeObjectService) await this.authoritativeObjectService.restoreProjectEvidence({ scope: this.scope(flow) });
    const result = recoverQaReviewEvidence({
      root: this.root,
      flow,
      request,
      operator,
      sourceRevision: this.sourceRevision,
      runtimeRevision: this.runtimeRevision,
      createdAt: this.clock().toISOString()
    });
    if (this.authoritativeObjectService) {
      const references = [
        result.record?.recovered_artifact?.reference,
        result.record?.corrupted_artifact?.reference,
        result.record?.recovered_artifact?.reference && path.posix.join(
          path.posix.dirname(result.record.recovered_artifact.reference),
          `founder-qa-evidence-recovery-${String(result.record.recovery_id).slice(-20)}.json`
        )
      ].filter(Boolean);
      for (const [index, reference] of references.entries()) {
        await this.authoritativeObjectService.ensureLocalFile({
          scope: this.scope(flow), localReference: reference,
          objectClass: 'founder_review_evidence', evidenceKind: 'founder_review_recovery',
          evidenceIdentity: `${result.record.recovery_id}:${index}`, lineageIdentity: flow.flow_id
        });
      }
    }
    return result;
  }
}

module.exports = {
  MAX_EVIDENCE_BYTES,
  FIELD_PAIRS,
  digest,
  boundedEvidencePath,
  readEvidenceBytes,
  resolveBinding,
  resolveBindingValue,
  containsBinding,
  hasPassedQa,
  automaticRepairDisabled,
  assertQaReviewEvidence,
  assertRepairResolutionEvidence,
  FOUNDER_QA_SUBMISSION_CONTRACT,
  inspectFounderReviewEvidence,
  prepareQaReviewRecoverySubmission,
  prepareQaReviewSubmission,
  recoverQaReviewEvidence,
  createExclusiveAtomic,
  MerchantFlowOperatorEvidenceResolver
};
