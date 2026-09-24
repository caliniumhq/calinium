#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const {
  loadRepairPlanningPolicy,
  loadBoundedRepairPlan,
  assertNoD3AExecutionCapability
} = require('../ai/repair-planning');

const root = path.resolve(__dirname, '..');

function validate() {
  const policy = loadRepairPlanningPolicy(root);
  const plan = loadBoundedRepairPlan(root);
  assertNoD3AExecutionCapability(root);
  const tagTarget = execFileSync('git', ['rev-parse', 'refs/tags/core-2-phase-d2-7-complete'], { cwd: root, encoding: 'utf8' }).trim();
  if (tagTarget !== plan.rollback.checkpoint_commit) throw new Error('D3A rollback tag does not resolve to the bound checkpoint commit.');
  const storefrontStatus = execFileSync('git', ['status', '--porcelain', '--', 'apps/theme', 'ai/architecture/presenters'], { cwd: root, encoding: 'utf8' }).trim();
  if (storefrontStatus) throw new Error('D3A validation found a storefront/theme source mutation.');
  if (plan.modification_scope.allowed_files.length !== 1 || plan.status !== 'proposed') throw new Error('D3A plan is not a single-file proposed repair.');
  if (plan.safety.repair_execution_available !== false || plan.safety.d3b_started !== false) throw new Error('D3A plan exposes execution or reports D3B started.');
  process.stdout.write(`Bounded repair-planning validation passed: plan=${plan.repair_plan_id}; checksum=${plan.repair_plan_checksum}; finding=${plan.target.authoritative_finding_id}; decision=needs_fix; files=1; reliability=${policy.required_reliability.status}; status=proposed; human-approval=required; mutation=forbidden.\n`);
}

try { validate(); }
catch (error) { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; }
