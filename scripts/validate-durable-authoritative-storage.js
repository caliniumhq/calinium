#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const service = read('apps/dashboard/server/assets/authoritative-object-service.cjs');
for (const token of ['calinium-durable-object-reference-v1', 'storage_readback_mismatch', 'storage_scope_mismatch', 'restoreLineage', 'deleteAuthorized']) assert(service.includes(token), `Missing durable storage boundary ${token}.`);
const migration = read('apps/dashboard/server/storage/migrations.cjs');
assert(migration.includes("version: 28"));
assert(migration.includes('durable_object_references'));
const referenceSchema = JSON.parse(read('schemas/calinium-durable-object-reference.schema.json'));
assert.equal(referenceSchema.properties.reference_version.const, 'calinium-durable-object-reference-v1');
const documentation = read('docs/launch/calinium-durable-generated-artifact-evidence-storage.md');
for (const token of ['AUTHORITATIVE_DURABLE', 'TEMPORARY_RUNTIME', 'OPTIONAL_DIAGNOSTIC', 'IMPLEMENTATION_READY', 'PROVIDER_NOT_CONFIGURED', 'FOUNDER_DECISION_REQUIRED']) {
  assert(documentation.includes(token), `Durable storage documentation is missing ${token}.`);
}
const generation = read('apps/dashboard/server/custom-themes/custom-theme-service.cjs');
assert(generation.indexOf('finalizeArtifactDurability') < generation.indexOf("generation_status: 'ready', artifacts"));
const qa = read('ai/design-evaluation/merchant-flow-production-qa-adapter.js');
assert(qa.indexOf('persistEvidenceDirectory(flow, captureResult.output_directory') < qa.indexOf('evidenceByRenderChecksum.set'));
assert(qa.indexOf("evidenceKind: 'merchant_d1_evaluation'") < qa.indexOf('evidence.d1 = evaluation'));
assert(qa.indexOf("evidenceKind: 'merchant_d2_7_request'") < qa.indexOf('return executeD27Provider'));
const operatorEvidence = read('apps/dashboard/server/services/merchant-flow-operator-evidence-resolver.cjs');
assert(operatorEvidence.includes('await this.authoritativeObjectService.ensureLocalFile'));
assert(operatorEvidence.includes("objectClass: 'founder_review_evidence'"));
assert(operatorEvidence.includes("? 'repair_evidence'"));
const readiness = read('apps/dashboard/server/production/public-production-configuration.cjs');
assert(readiness.includes("implementation_status: 'IMPLEMENTATION_READY'"));
assert(readiness.includes("'PROVIDER_NOT_CONFIGURED'"));
assert(readiness.includes('durable_artifact_storage_acceptance'));
assert(!readiness.includes('durable_artifact_storage === true'));
const themeDiff = require('child_process').execFileSync('git', ['diff', '--name-only', '--', 'apps/theme'], { cwd: root, encoding: 'utf8' }).trim();
assert.equal(themeDiff, '', 'Durable storage integration must not modify storefront/theme source.');
process.stdout.write('Durable generated-artifact and evidence storage integration validation passed.\n');
