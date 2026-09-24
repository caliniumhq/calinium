'use strict';

const path = require('path');
const { createSchemaValidator } = require('../compiler/schema-validator');
const { digest } = require('../storefront-render/contracts');
const { readJson } = require('./contracts');
const { LiveDesignProviderError } = require('./openai-responses-client');
const { loadObservationStabilizationPolicy } = require('./observation-stabilization-contracts');

const LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA = 'schemas/calinium-live-concrete-observation-output.schema.json';
const REQUEST_BOUND_SCHEMA_PROVENANCE_SCHEMA = 'schemas/calinium-request-bound-concrete-observation-schema-provenance.schema.json';
const REQUEST_BOUND_CONCRETE_OBSERVATION_SCHEMA_VERSION = 'request-bound-concrete-observation-schema-v1';
const LIVE_CONCRETE_OBSERVATION_BASE_SCHEMA_VERSION = 'calinium-live-concrete-observation-output-v1';

function mismatch(message, diagnostics = {}) {
  return new LiveDesignProviderError(
    'd2_7_schema_semantic_contract_mismatch',
    message,
    { retryable: false, responseReceived: false, diagnostics }
  );
}

function canonicalRequestCellIds(request) {
  const ids = Array.isArray(request?.cells) ? request.cells.map((cell) => String(cell?.cell_id || '')) : [];
  if (!ids.length || ids.some((id) => !id)) throw mismatch('D2.7 request-bound schema requires at least one named request cell.', { request_cell_count: ids.length });
  if (new Set(ids).size !== ids.length) throw mismatch('D2.7 request-bound schema requires unique request cell IDs.', { request_cell_count: ids.length, unique_cell_count: new Set(ids).size });
  return [...ids].sort();
}

function generatedSchema({ root, orderedCellIds }) {
  const schema = readJson(path.join(root, LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA));
  delete schema.$schema;
  delete schema.$id;
  delete schema.title;
  const policy = loadObservationStabilizationPolicy(root);
  const inspections = schema.properties.cell_inspections;
  inspections.minItems = orderedCellIds.length;
  inspections.maxItems = orderedCellIds.length;
  inspections.items.properties.cell_id.enum = [...orderedCellIds];
  schema.properties.observations.items.properties.cell_id.enum = [...orderedCellIds];
  schema.properties.observations.items.properties.phenomenon.enum = policy.phenomena.map((item) => item.id);
  schema.properties.observations.items.properties.component.enum = [...policy.components];
  return schema;
}

function assertRequestBoundConcreteObservationSchema(contract, request, root) {
  const provenanceErrors = createSchemaValidator(root).validateFile(
    contract?.provenance,
    REQUEST_BOUND_SCHEMA_PROVENANCE_SCHEMA,
    'request_bound_concrete_observation_schema_provenance'
  );
  const expectedIds = canonicalRequestCellIds(request);
  const expectedBaseChecksum = digest(readJson(path.join(root, LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA)));
  const expectedSchema = generatedSchema({ root, orderedCellIds: expectedIds });
  const schema = contract?.schema;
  const actualIds = schema?.properties?.cell_inspections?.items?.properties?.cell_id?.enum;
  const observationIds = schema?.properties?.observations?.items?.properties?.cell_id?.enum;
  const errors = [...provenanceErrors];
  if (contract?.provenance?.base_schema_checksum !== expectedBaseChecksum) errors.push('Request-bound schema base contract checksum is stale.');
  if (contract?.provenance?.request_id !== request?.request_id) errors.push('Request-bound schema request identity is stale.');
  if (contract?.provenance?.request_checksum !== digest(request)) errors.push('Request-bound schema request checksum is stale.');
  if (contract?.provenance?.cell_count !== expectedIds.length) errors.push('Request-bound schema cell count differs from semantic request coverage.');
  if (JSON.stringify(contract?.provenance?.ordered_cell_ids) !== JSON.stringify(expectedIds)) errors.push('Request-bound schema provenance cell IDs differ from semantic request coverage.');
  if (schema?.properties?.cell_inspections?.minItems !== expectedIds.length || schema?.properties?.cell_inspections?.maxItems !== expectedIds.length) errors.push('Request-bound schema inspection cardinality differs from semantic request coverage.');
  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) errors.push('Request-bound schema inspection IDs differ from semantic request coverage.');
  if (JSON.stringify(observationIds) !== JSON.stringify(expectedIds)) errors.push('Request-bound schema observation IDs differ from semantic request coverage.');
  if (digest(schema) !== digest(expectedSchema)) errors.push('Request-bound schema differs from deterministic regeneration.');
  if (contract?.provenance?.generated_schema_checksum !== digest(schema)) errors.push('Request-bound generated schema checksum is stale.');
  if (errors.length) throw mismatch('D2.7 request-bound Structured Output schema and semantic coverage disagree.', {
    request_cell_count: expectedIds.length,
    schema_min_items: Number.isInteger(schema?.properties?.cell_inspections?.minItems) ? schema.properties.cell_inspections.minItems : null,
    schema_max_items: Number.isInteger(schema?.properties?.cell_inspections?.maxItems) ? schema.properties.cell_inspections.maxItems : null,
    schema_allowed_cell_count: Array.isArray(actualIds) ? actualIds.length : null,
    mismatch_count: [...new Set(errors)].length
  });
  return contract;
}

function createRequestBoundConcreteObservationSchema({ root, request }) {
  const orderedCellIds = canonicalRequestCellIds(request);
  const baseSchema = readJson(path.join(root, LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA));
  const schema = generatedSchema({ root, orderedCellIds });
  const provenance = {
    schema_version: '1.0',
    contract_version: REQUEST_BOUND_CONCRETE_OBSERVATION_SCHEMA_VERSION,
    base_schema_revision: LIVE_CONCRETE_OBSERVATION_BASE_SCHEMA_VERSION,
    base_schema_checksum: digest(baseSchema),
    request_id: request.request_id,
    request_checksum: digest(request),
    cell_count: orderedCellIds.length,
    ordered_cell_ids: orderedCellIds,
    generated_schema_checksum: digest(schema)
  };
  return assertRequestBoundConcreteObservationSchema({ provenance, schema }, request, root);
}

function validateRequestBoundConcreteObservationOutput({ output, contract, request, root }) {
  assertRequestBoundConcreteObservationSchema(contract, request, root);
  return createSchemaValidator(root).validateSchema(
    output,
    contract.schema,
    'live_concrete_observation_output',
    LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA
  );
}

module.exports = {
  LIVE_CONCRETE_OBSERVATION_OUTPUT_SCHEMA,
  REQUEST_BOUND_SCHEMA_PROVENANCE_SCHEMA,
  REQUEST_BOUND_CONCRETE_OBSERVATION_SCHEMA_VERSION,
  LIVE_CONCRETE_OBSERVATION_BASE_SCHEMA_VERSION,
  canonicalRequestCellIds,
  createRequestBoundConcreteObservationSchema,
  assertRequestBoundConcreteObservationSchema,
  validateRequestBoundConcreteObservationOutput
};
