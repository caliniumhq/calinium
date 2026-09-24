#!/usr/bin/env node

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createSchemaValidator } = require('../ai/compiler/schema-validator');

const root = path.resolve(__dirname, '..');
const schemaPath = 'schemas/calinium-approved-block-plan.schema.json';
const validFixturePath = 'fixtures/approved-block-plan-editorial-grid.json';
const lookbookFixturePath = 'fixtures/approved-block-plan-lookbook.json';
const craftsmanshipFixturePath = 'fixtures/approved-block-plan-craftsmanship.json';
const manufacturingProcessFixturePath = 'fixtures/approved-block-plan-manufacturing-process.json';
const evidenceFixturePaths = [
  'fixtures/approved-block-plan-brand-timeline.json',
  'fixtures/approved-block-plan-sustainability.json',
  'fixtures/approved-block-plan-team.json',
  'fixtures/approved-block-plan-awards-certifications.json'
];
const invalidFixturePath = 'fixtures/approved-block-plan-invalid.json';
const prohibitedFields = new Set([
  'html', 'liquid', 'css', 'javascript', 'template', 'template_path', 'section_id', 'section_type',
  'section_instance_id', 'block_id', 'block_type', 'shopify_json', 'settings', 'generated_files',
  'package_path', 'workspace_path', 'archive_path', 'preset_id', 'generator_hint', 'ai_confidence',
  'review_comments', 'internal_notes'
]);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
}

function checksum(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function issue(category, pathValue, message) {
  return { category, path: pathValue, message };
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function addIf(condition, category, pathValue, message, errors) {
  if (!condition) errors.push(issue(category, pathValue, message));
}

function categoryForSchemaError(message) {
  if (/approval/.test(message)) return 'approval';
  if (/content_type/.test(message)) return 'content_type';
  if (/resource_type/.test(message)) return 'resource_type';
  if (/locale/.test(message)) return 'locale';
  if (/order/.test(message)) return 'ordering';
  if (/parent_revision_id/.test(message)) return 'immutability';
  return 'schema';
}

function schemaIssues(plan, label, validator) {
  return validator.validateFile(plan, schemaPath, label).map((message) => issue(categoryForSchemaError(message), label, message));
}

function validateProhibitedFields(value, pathValue = '$', errors = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateProhibitedFields(item, `${pathValue}[${index}]`, errors));
    return errors;
  }
  if (!isObject(value)) return errors;
  for (const [key, item] of Object.entries(value)) {
    const nextPath = `${pathValue}.${key}`;
    if (prohibitedFields.has(key)) errors.push(issue('prohibited_field', nextPath, `${nextPath} is a prohibited runtime or workflow field.`));
    validateProhibitedFields(item, nextPath, errors);
  }
  return errors;
}

function validateVisibility(visibility, pathValue, errors) {
  if (!isObject(visibility)) return;
  if (visibility.mode === 'always') addIf(visibility.conditions.length === 0, 'visibility', `${pathValue}.conditions`, 'Always-visible content cannot carry conditions.', errors);
  if (visibility.mode === 'conditional') addIf(visibility.conditions.length > 0, 'visibility', `${pathValue}.conditions`, 'Conditional content requires at least one condition.', errors);
}

function validateMapEntries(plan, errors) {
  const approvalId = plan.approval?.approval_id;
  const entities = plan.content_entities || {};
  const resources = plan.resource_references || {};
  const evidence = plan.evidence_references || {};
  const idPattern = {
    content: /^abpc_[a-z0-9][a-z0-9_-]*$/,
    resource: /^abprs_[a-z0-9][a-z0-9_-]*$/,
    evidence: /^abpe_[a-z0-9][a-z0-9_-]*$/
  };

  const seenContentIds = new Set();
  for (const [key, entity] of Object.entries(entities)) {
    const entityPath = `content_entities.${key}`;
    addIf(idPattern.content.test(key), 'identity', entityPath, `${entityPath} has an invalid content map key.`, errors);
    addIf(isObject(entity), 'schema', entityPath, `${entityPath} must be an object.`, errors);
    if (!isObject(entity)) continue;
    addIf(entity.content_id === key, 'identity', `${entityPath}.content_id`, 'Content map key and content_id must match.', errors);
    addIf(!seenContentIds.has(entity.content_id), 'identity', entityPath, `Duplicate content identity ${entity.content_id}.`, errors);
    seenContentIds.add(entity.content_id);
    addIf(idPattern.content.test(entity.content_id || ''), 'identity', `${entityPath}.content_id`, 'Content identity has an invalid prefix or shape.', errors);
    addIf(['editorial_story', 'visual_frame', 'craftsmanship_evidence', 'manufacturing_process_stage', 'timeline_milestone', 'sustainability_initiative', 'team_member', 'recognition', 'curated_product_relationship', 'quote', 'approved_text'].includes(entity.content_type), 'content_type', `${entityPath}.content_type`, `Unsupported content type ${entity.content_type}.`, errors);
    addIf(Array.isArray(entity.localized_values), 'locale', `${entityPath}.localized_values`, 'Localized values must be an array.', errors);
    const localizedKeys = [];
    for (const [index, item] of (entity.localized_values || []).entries()) {
      const itemPath = `${entityPath}.localized_values[${index}]`;
      if (!isObject(item)) { errors.push(issue('locale', itemPath, 'Localized value must be an object.')); continue; }
      addIf(/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(item.locale || ''), 'locale', `${itemPath}.locale`, 'Localized value has an invalid locale.', errors);
      addIf(typeof item.field === 'string' && /^[a-z][a-z0-9_]{0,63}$/.test(item.field), 'locale', `${itemPath}.field`, 'Localized value has an invalid semantic field.', errors);
      addIf(typeof item.value === 'string' && item.value.length > 0, 'truth', `${itemPath}.value`, 'Localized value must be explicit non-empty approved content.', errors);
      addIf(item.approval_id === approvalId, 'approval', `${itemPath}.approval_id`, 'Localized value must use the plan approval identity.', errors);
      localizedKeys.push(`${item.locale}|${item.field}`);
    }
    addIf(unique(localizedKeys), 'locale', `${entityPath}.localized_values`, 'Localized values cannot duplicate the same locale and semantic field.', errors);
    if ((entity.localized_values || []).length) addIf(entity.localized_values.some((item) => item.locale === plan.default_locale), 'locale', `${entityPath}.localized_values`, 'Localized values must include the plan default locale when content text is present.', errors);
    addIf(Array.isArray(entity.resource_reference_ids), 'reference', `${entityPath}.resource_reference_ids`, 'Resource reference IDs must be an array.', errors);
    for (const referenceId of entity.resource_reference_ids || []) addIf(Object.hasOwn(resources, referenceId), 'reference', `${entityPath}.resource_reference_ids`, `Missing resource reference ${referenceId}.`, errors);
    addIf(unique(entity.resource_reference_ids || []), 'reference', `${entityPath}.resource_reference_ids`, 'Resource references cannot repeat inside one content entity.', errors);
    addIf(Array.isArray(entity.evidence_reference_ids), 'reference', `${entityPath}.evidence_reference_ids`, 'Evidence reference IDs must be an array.', errors);
    for (const evidenceId of entity.evidence_reference_ids || []) addIf(Object.hasOwn(evidence, evidenceId), 'reference', `${entityPath}.evidence_reference_ids`, `Missing evidence reference ${evidenceId}.`, errors);
    addIf(unique(entity.evidence_reference_ids || []), 'reference', `${entityPath}.evidence_reference_ids`, 'Evidence references cannot repeat inside one content entity.', errors);
    const provenance = entity.provenance || {};
    addIf(provenance.approval_id === approvalId, 'approval', `${entityPath}.provenance.approval_id`, 'Content provenance must use the plan approval identity.', errors);
    for (const evidenceId of provenance.evidence_reference_ids || []) addIf(Object.hasOwn(evidence, evidenceId), 'reference', `${entityPath}.provenance.evidence_reference_ids`, `Missing provenance evidence reference ${evidenceId}.`, errors);
    if (entity.content_type === 'quote') addIf((entity.evidence_reference_ids || []).some((id) => evidence[id]?.evidence_type === 'quote_source'), 'truth', entityPath, 'Quote content requires approved quote-source evidence.', errors);
    if (entity.accessibility) {
      const accessibility = entity.accessibility;
      const locales = accessibility.localized || [];
      addIf(unique(locales.map((item) => item.locale)), 'accessibility', `${entityPath}.accessibility.localized`, 'Accessibility metadata cannot duplicate a locale.', errors);
      if (accessibility.decorative_media === false) {
        for (const [index, item] of locales.entries()) addIf(Boolean(item.alt_text || item.accessible_label), 'accessibility', `${entityPath}.accessibility.localized[${index}]`, 'Informative media requires alt text or an accessible label.', errors);
      }
      if (accessibility.transcript_resource_id !== null) addIf(Object.hasOwn(resources, accessibility.transcript_resource_id), 'accessibility', `${entityPath}.accessibility.transcript_resource_id`, 'Transcript reference must resolve to an approved resource.', errors);
    }
  }

  const seenResourceIds = new Set();
  const sourceForType = {
    shopify_product: 'shopify', shopify_collection: 'shopify', shopify_article: 'shopify', shopify_page: 'shopify',
    project_image: 'project_asset', project_video: 'project_asset', external_url: 'external', merchant_fact: 'merchant_record'
  };
  for (const [key, resource] of Object.entries(resources)) {
    const resourcePath = `resource_references.${key}`;
    addIf(idPattern.resource.test(key), 'identity', resourcePath, `${resourcePath} has an invalid resource map key.`, errors);
    if (!isObject(resource)) { errors.push(issue('schema', resourcePath, 'Resource reference must be an object.')); continue; }
    addIf(resource.resource_id === key, 'identity', `${resourcePath}.resource_id`, 'Resource map key and resource_id must match.', errors);
    addIf(!seenResourceIds.has(resource.resource_id), 'identity', resourcePath, `Duplicate resource identity ${resource.resource_id}.`, errors);
    seenResourceIds.add(resource.resource_id);
    addIf(Object.hasOwn(sourceForType, resource.resource_type), 'resource_type', `${resourcePath}.resource_type`, `Unsupported resource type ${resource.resource_type}.`, errors);
    addIf(sourceForType[resource.resource_type] === resource.source_type, 'resource_type', `${resourcePath}.source_type`, `Resource type ${resource.resource_type} has an incompatible source type.`, errors);
    addIf(resource.approval_id === approvalId, 'approval', `${resourcePath}.approval_id`, 'Resource reference must use the plan approval identity.', errors);
  }

  const seenEvidenceIds = new Set();
  for (const [key, item] of Object.entries(evidence)) {
    const evidencePath = `evidence_references.${key}`;
    addIf(idPattern.evidence.test(key), 'identity', evidencePath, `${evidencePath} has an invalid evidence map key.`, errors);
    if (!isObject(item)) { errors.push(issue('schema', evidencePath, 'Evidence reference must be an object.')); continue; }
    addIf(item.evidence_id === key, 'identity', `${evidencePath}.evidence_id`, 'Evidence map key and evidence_id must match.', errors);
    addIf(!seenEvidenceIds.has(item.evidence_id), 'identity', evidencePath, `Duplicate evidence identity ${item.evidence_id}.`, errors);
    seenEvidenceIds.add(item.evidence_id);
    addIf(item.approval_id === approvalId, 'approval', `${evidencePath}.approval_id`, 'Evidence reference must use the plan approval identity.', errors);
  }
}

function validateCompositions(plan, errors) {
  const roleTypes = {
    editorial_story: 'editorial_story', lookbook_frame: 'visual_frame', craftsmanship_step: 'craftsmanship_evidence', manufacturing_process_step: 'manufacturing_process_stage', visual_frame: 'visual_frame', timeline_item: 'timeline_milestone',
    sustainability_initiative: 'sustainability_initiative', team_member: 'team_member', recognition: 'recognition',
    curated_product: 'curated_product_relationship', curated_cross_sell_product: 'curated_product_relationship', bundle_product: 'curated_product_relationship', shop_the_look_product: 'curated_product_relationship', fallback_product: 'curated_product_relationship', quote: 'quote'
  };
  const seenCompositionIds = new Set();
  const pageOrders = new Map();
  for (const [index, composition] of (plan.compositions || []).entries()) {
    const compositionPath = `compositions[${index}]`;
    if (!isObject(composition)) { errors.push(issue('schema', compositionPath, 'Composition must be an object.')); continue; }
    addIf(!seenCompositionIds.has(composition.composition_id), 'identity', `${compositionPath}.composition_id`, `Duplicate composition identity ${composition.composition_id}.`, errors);
    seenCompositionIds.add(composition.composition_id);
    const pageOrderKey = `${composition.page_role}|${composition.order}`;
    addIf(!pageOrders.has(pageOrderKey), 'ordering', `${compositionPath}.order`, `Duplicate composition order ${composition.order} for ${composition.page_role}.`, errors);
    pageOrders.set(pageOrderKey, true);
    validateVisibility(composition.visibility, `${compositionPath}.visibility`, errors);
    for (const resourceId of composition.resource_reference_ids || []) addIf(Object.hasOwn(plan.resource_references || {}, resourceId), 'reference', `${compositionPath}.resource_reference_ids`, `Missing composition resource reference ${resourceId}.`, errors);
    const seenPlacementIds = new Set();
    const seenOrders = new Set();
    for (const [blockIndex, placement] of (composition.block_placements || []).entries()) {
      const placementPath = `${compositionPath}.block_placements[${blockIndex}]`;
      if (!isObject(placement)) { errors.push(issue('schema', placementPath, 'Block placement must be an object.')); continue; }
      addIf(!seenPlacementIds.has(placement.placement_id), 'identity', `${placementPath}.placement_id`, `Duplicate placement identity ${placement.placement_id}.`, errors);
      seenPlacementIds.add(placement.placement_id);
      addIf(!seenOrders.has(placement.order), 'ordering', `${compositionPath}.block_placements`, `Duplicate placement order ${placement.order}.`, errors);
      seenOrders.add(placement.order);
      const entity = plan.content_entities?.[placement.content_entity_id];
      addIf(Boolean(entity), 'reference', `${placementPath}.content_entity_id`, `Missing content entity ${placement.content_entity_id}.`, errors);
      if (entity) addIf(roleTypes[placement.semantic_block_role] === entity.content_type, 'content_type', `${placementPath}.semantic_block_role`, 'Semantic block role is incompatible with the referenced content entity.', errors);
      validateVisibility(placement.visibility, `${placementPath}.visibility`, errors);
    }
  }
}

function validatePlan(plan, label, validator) {
  const errors = [...schemaIssues(plan, label, validator)];
  validateProhibitedFields(plan, '$', errors);
  if (!isObject(plan)) return errors;
  addIf(plan.parent_revision_id !== plan.revision_id, 'immutability', 'parent_revision_id', 'Parent revision cannot equal the current revision.', errors);
  addIf(plan.metadata?.immutable === true, 'immutability', 'metadata.immutable', 'Approved Block Plan must be immutable.', errors);
  addIf(plan.approval?.approval_status === 'approved', 'approval', 'approval.approval_status', 'Approved Block Plan must be fully approved.', errors);
  validateMapEntries(plan, errors);
  validateCompositions(plan, errors);
  return errors;
}

function pointerParts(pointer) {
  assert.ok(typeof pointer === 'string' && pointer.startsWith('/'), `Invalid fixture patch pointer ${pointer}.`);
  return pointer.slice(1).split('/').map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function parentForPointer(value, pointer) {
  const parts = pointerParts(pointer);
  const key = parts.pop();
  const parent = parts.reduce((current, part) => {
    const resolved = Array.isArray(current) ? current[Number(part)] : current[part];
    assert.notEqual(resolved, undefined, `Fixture patch path ${pointer} does not resolve.`);
    return resolved;
  }, value);
  return { parent, key };
}

function applyOperation(value, operation) {
  const { parent, key } = parentForPointer(value, operation.path);
  const isArray = Array.isArray(parent);
  const index = isArray ? Number(key) : key;
  if (operation.op === 'remove') {
    if (isArray) parent.splice(index, 1);
    else delete parent[key];
    return;
  }
  if (operation.op === 'replace') {
    assert.ok(isArray ? Number.isInteger(index) && index in parent : Object.hasOwn(parent, key), `Fixture replace path ${operation.path} does not exist.`);
    parent[index] = clone(operation.value);
    return;
  }
  if (operation.op === 'add') {
    if (isArray) parent.splice(index, 0, clone(operation.value));
    else parent[key] = clone(operation.value);
    return;
  }
  throw new Error(`Unsupported fixture patch operation ${operation.op}.`);
}

function deriveCasePayload(base, payload) {
  const value = clone(base);
  for (const operation of payload.operations || []) applyOperation(value, operation);
  return value;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
}

function stableEqual(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function changedIds(before, after, field, label) {
  const values = [];
  for (const id of Object.keys(before)) if (Object.hasOwn(after, id) && !stableEqual(before[id][field], after[id][field])) values.push({ id, change: label });
  return values.sort((left, right) => left.id.localeCompare(right.id));
}

function placementMap(plan) {
  const entries = {};
  for (const composition of plan.compositions || []) for (const placement of composition.block_placements || []) entries[placement.placement_id] = placement;
  return entries;
}

function semanticDiff(before, after) {
  const beforeEntities = before.content_entities || {};
  const afterEntities = after.content_entities || {};
  const beforeResources = before.resource_references || {};
  const afterResources = after.resource_references || {};
  const beforePlacements = placementMap(before);
  const afterPlacements = placementMap(after);
  const sortedDifference = (left, right) => Object.keys(left).filter((id) => !Object.hasOwn(right, id)).sort();
  return {
    added_content_entity: sortedDifference(afterEntities, beforeEntities),
    removed_content_entity: sortedDifference(beforeEntities, afterEntities),
    changed_localized_text: changedIds(beforeEntities, afterEntities, 'localized_values', 'changed_localized_text'),
    changed_resource_revision: changedIds(beforeResources, afterResources, 'approved_revision', 'changed_resource_revision'),
    changed_placement_order: changedIds(beforePlacements, afterPlacements, 'order', 'changed_placement_order'),
    changed_visibility: changedIds(beforePlacements, afterPlacements, 'visibility', 'changed_visibility'),
    changed_evidence_reference: changedIds(beforeEntities, afterEntities, 'evidence_reference_ids', 'changed_evidence_reference')
  };
}

function semanticDiffFixture(base) {
  const before = clone(base);
  before.content_entities['abpc_retired-note'] = {
    content_id: 'abpc_retired-note',
    content_type: 'approved_text',
    localized_values: [{ locale: 'en', field: 'title', value: 'Retired note', value_type: 'merchant_approved_text', approval_id: before.approval.approval_id }],
    resource_reference_ids: [],
    evidence_reference_ids: ['abpe_oak-loom-editorial-approval'],
    provenance: { source_type: 'merchant_approved', approval_id: before.approval.approval_id, evidence_reference_ids: ['abpe_oak-loom-editorial-approval'] }
  };
  const after = clone(before);
  after.revision_id = 'abpr_oak-loom-editorial-r2';
  after.parent_revision_id = before.revision_id;
  delete after.content_entities['abpc_retired-note'];
  after.content_entities['abpc_aftercare-notes'] = {
    content_id: 'abpc_aftercare-notes',
    content_type: 'approved_text',
    localized_values: [{ locale: 'en', field: 'title', value: 'Aftercare notes', value_type: 'merchant_approved_text', approval_id: after.approval.approval_id }],
    resource_reference_ids: [],
    evidence_reference_ids: ['abpe_oak-loom-editorial-approval'],
    provenance: { source_type: 'merchant_approved', approval_id: after.approval.approval_id, evidence_reference_ids: ['abpe_oak-loom-editorial-approval'] }
  };
  after.content_entities['abpc_rug-care-guides'].localized_values[0].value = 'Rug care and repair guides';
  after.resource_references['abprs_rug-care-collection'].approved_revision = '6666666666666666666666666666666666666666666666666666666666666666';
  after.evidence_references['abpe_oak-loom-editorial-r2'] = {
    evidence_id: 'abpe_oak-loom-editorial-r2',
    evidence_type: 'merchant_confirmed_fact',
    source_type: 'merchant_record',
    source_reference: 'merchant-editorial-review-oak-loom-r2',
    approved_revision: '7777777777777777777777777777777777777777777777777777777777777777',
    approval_id: after.approval.approval_id
  };
  after.content_entities['abpc_rug-care-guides'].evidence_reference_ids = ['abpe_oak-loom-editorial-r2'];
  after.content_entities['abpc_rug-care-guides'].provenance.evidence_reference_ids = ['abpe_oak-loom-editorial-r2'];
  after.compositions[0].block_placements[0].order = 2;
  after.compositions[0].block_placements[1].order = 1;
  after.compositions[0].block_placements[0].visibility = { mode: 'conditional', conditions: [{ scope: 'market', operator: 'includes', values: ['US'] }] };
  return { before, after };
}

function run() {
  const beforeChecksums = {
    schema: checksum(schemaPath),
    valid: checksum(validFixturePath),
    lookbook: checksum(lookbookFixturePath),
    craftsmanship: checksum(craftsmanshipFixturePath),
    manufacturingProcess: checksum(manufacturingProcessFixturePath),
    invalid: checksum(invalidFixturePath),
    evidence: evidenceFixturePaths.map(checksum)
  };
  const validator = createSchemaValidator(root);
  const schema = readJson(schemaPath);
  const valid = readJson(validFixturePath);
  const validLookbook = readJson(lookbookFixturePath);
  const validCraftsmanship = readJson(craftsmanshipFixturePath);
  const validManufacturingProcess = readJson(manufacturingProcessFixturePath);
  const validEvidencePlans = evidenceFixturePaths.map(readJson);
  const invalid = readJson(invalidFixturePath);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', 'Approved Block Plan must use the repository JSON Schema draft.');
  assert.equal(invalid.base_fixture, path.basename(validFixturePath), 'Invalid cases must derive from the approved valid fixture.');

  const validErrors = validatePlan(valid, validFixturePath, validator);
  assert.deepEqual(validErrors, [], `Valid Approved Block Plan fixture failed: ${validErrors.map((item) => item.message).join(' ')}`);
  const validAfterValidation = readJson(validFixturePath);
  assert.deepEqual(validAfterValidation, valid, 'Validator must not mutate the valid fixture in memory or on disk.');
  const lookbookErrors = validatePlan(validLookbook, lookbookFixturePath, validator);
  assert.deepEqual(lookbookErrors, [], `Valid Lookbook Approved Block Plan fixture failed: ${lookbookErrors.map((item) => item.message).join(' ')}`);
  assert.deepEqual(readJson(lookbookFixturePath), validLookbook, 'Validator must not mutate the Lookbook fixture in memory or on disk.');
  const craftsmanshipErrors = validatePlan(validCraftsmanship, craftsmanshipFixturePath, validator);
  assert.deepEqual(craftsmanshipErrors, [], `Valid Craftsmanship Approved Block Plan fixture failed: ${craftsmanshipErrors.map((item) => item.message).join(' ')}`);
  assert.deepEqual(readJson(craftsmanshipFixturePath), validCraftsmanship, 'Validator must not mutate the Craftsmanship fixture in memory or on disk.');
  const manufacturingProcessErrors = validatePlan(validManufacturingProcess, manufacturingProcessFixturePath, validator);
  assert.deepEqual(manufacturingProcessErrors, [], `Valid Manufacturing Process Approved Block Plan fixture failed: ${manufacturingProcessErrors.map((item) => item.message).join(' ')}`);
  assert.deepEqual(readJson(manufacturingProcessFixturePath), validManufacturingProcess, 'Validator must not mutate the Manufacturing Process fixture in memory or on disk.');
  for (const [index, plan] of validEvidencePlans.entries()) {
    const errors = validatePlan(plan, evidenceFixturePaths[index], validator);
    assert.deepEqual(errors, [], `Valid evidence Approved Block Plan fixture failed: ${errors.map((item) => item.message).join(' ')}`);
    assert.deepEqual(readJson(evidenceFixturePaths[index]), plan, 'Validator must not mutate an evidence fixture in memory or on disk.');
  }

  let expectedFailures = 0;
  const categories = new Set();
  for (const testCase of invalid.cases || []) {
    const payload = deriveCasePayload(valid, testCase.payload || {});
    const errors = validatePlan(payload, `invalid:${testCase.case_id}`, validator);
    assert.ok(errors.length > 0, `${testCase.case_id} unexpectedly passed validation.`);
    const matches = errors.some((item) => item.category === testCase.expected_category && `${item.path} ${item.message}`.includes(testCase.expected_path));
    assert.ok(matches, `${testCase.case_id} did not fail for ${testCase.expected_category} at ${testCase.expected_path}. Received: ${errors.map((item) => `${item.category}:${item.path}`).join(', ')}`);
    expectedFailures += 1;
    categories.add(testCase.expected_category);
  }

  const { before, after } = semanticDiffFixture(valid);
  assert.deepEqual(validatePlan(before, 'semantic-diff-before', validator), [], 'Semantic diff baseline must remain a valid plan.');
  assert.deepEqual(validatePlan(after, 'semantic-diff-after', validator), [], 'Semantic diff revision must remain a valid plan.');
  const firstDiff = semanticDiff(before, after);
  const secondDiff = semanticDiff(stableValue(before), stableValue(after));
  assert.deepEqual(firstDiff, secondDiff, 'Semantic diff must ignore irrelevant object-key ordering.');
  for (const [kind, expectedId] of Object.entries({
    added_content_entity: 'abpc_aftercare-notes',
    removed_content_entity: 'abpc_retired-note'
  })) assert.ok(firstDiff[kind].includes(expectedId), `Semantic diff must detect ${kind}.`);
  for (const kind of ['changed_localized_text', 'changed_resource_revision', 'changed_placement_order', 'changed_visibility', 'changed_evidence_reference']) assert.ok(firstDiff[kind].length > 0, `Semantic diff must detect ${kind}.`);

  assert.deepEqual(beforeChecksums, {
    schema: checksum(schemaPath),
    valid: checksum(validFixturePath),
    lookbook: checksum(lookbookFixturePath),
    craftsmanship: checksum(craftsmanshipFixturePath),
    manufacturingProcess: checksum(manufacturingProcessFixturePath),
    invalid: checksum(invalidFixturePath),
    evidence: evidenceFixturePaths.map(checksum)
  }, 'Approved Block Plan validation must leave all source files byte-for-byte unchanged.');
  return { invalidCases: expectedFailures, categories: [...categories].sort(), diff: firstDiff };
}

if (require.main === module) {
  try {
    const result = run();
    console.log(`Approved Block Plan validation passed: valid fixture, ${result.invalidCases} expected invalid cases, categories=${result.categories.join(',')}, deterministic semantic diff, and fixture immutability.`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

module.exports = { deriveCasePayload, semanticDiff, validatePlan, validateProhibitedFields, run };
