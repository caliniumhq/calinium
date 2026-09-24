#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const path = require('path');
const {
  loadApprovedBoundedRepairPlan,
  assertNoD3A2ExecutionCapability,
  D3A_COMMIT,
  D3A_TAG
} = require('../ai/repair-planning');

const root = path.resolve(__dirname, '..');

function validate() {
  const plan = loadApprovedBoundedRepairPlan(root);
  assertNoD3A2ExecutionCapability(root);
  const baseline = execFileSync('git', ['rev-parse', `refs/tags/${D3A_TAG}`], { cwd: root, encoding: 'utf8' }).trim();
  if (baseline !== D3A_COMMIT) throw new Error('D3A.2 baseline tag does not resolve to the approved checkpoint.');
  const storefrontStatus = execFileSync('git', ['status', '--porcelain', '--', 'apps/theme', 'ai/architecture/presenters'], { cwd: root, encoding: 'utf8' }).trim();
  if (storefrontStatus) throw new Error('D3A.2 validation found a storefront/theme source mutation.');
  if (plan.modification_scope.allowed_files.length !== 1 || plan.status !== 'approved_for_bounded_execution') throw new Error('D3A.2 final plan is not a one-file human-approved plan.');
  if (plan.safety.automatic_repair_allowed !== false || plan.safety.repair_executed !== false || plan.safety.d3b_started !== false) throw new Error('D3A.2 plan reports execution or automatic repair.');
  process.stdout.write(`Approved bounded repair-planning validation passed: plan=${plan.repair_plan_id}; checksum=${plan.repair_plan_checksum}; approval=${plan.human_approval.approval_id}; status=${plan.status}; files=1; intervention=position-relative; automatic-repair=forbidden; D3B=not-started.\n`);
}

try { validate(); }
catch (error) { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; }
