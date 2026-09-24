'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

function copyGeneratedConfiguration(workspace, destination) {
  const source = path.join(workspace, 'theme');
  const copied = [];
  const stack = [[source, destination]];
  while (stack.length) {
    const [currentSource, currentDestination] = stack.pop();
    for (const entry of fs.readdirSync(currentSource, { withFileTypes: true })) {
      const sourceFile = path.join(currentSource, entry.name);
      const destinationFile = path.join(currentDestination, entry.name);
      if (entry.isDirectory()) stack.push([sourceFile, destinationFile]);
      else {
        const relative = path.relative(source, sourceFile).split(path.sep).join('/');
        if (!(relative === 'config/settings_data.json' || /^templates\/.+\.json$/.test(relative))) {
          throw new Error(`Preview package refused a non-configuration generated file: ${relative}.`);
        }
        fs.mkdirSync(path.dirname(destinationFile), { recursive: true });
        fs.copyFileSync(sourceFile, destinationFile);
        copied.push(relative);
      }
    }
  }
  return copied.sort();
}

function generationSummary({ merchantProfile, draft, generated, approvalSummary }) {
  return [
    '# Calinium generation summary',
    '',
    `- Merchant Profile: \`${merchantProfile.profile_id}\``,
    `- Generation: \`${generated.manifest.generation_id}\``,
    `- Draft readiness: \`${draft.draft_readiness.status}\``,
    `- Creative approval required: ${approvalSummary.approval_required ? 'Yes' : 'No'}`,
    `- Source theme modified: **No**`,
    '',
    '## Review handoff',
    '',
    'This package is ready for the existing Review Session Engine. Development-theme deployment, preview verification, release, and rollback remain separate explicit lifecycle stages.',
    ''
  ].join('\n');
}

function createPreviewPackage({ root, generationId, creativeBrief, storeStrategy, merchantProfile, draft, generated, reviewHandoff, approvalSummary }) {
  const base = path.resolve(root, 'output', 'preview', generationId);
  if (fs.existsSync(base)) throw new Error(`Refusing to overwrite existing preview package ${base}.`);
  const files = {
    creative_brief: 'creative-brief.json',
    store_strategy: 'store-strategy.json',
    merchant_profile: 'merchant-profile.json',
    draft_configuration: 'draft-configuration.json',
    generated_theme: 'generated-theme.json',
    validation_report: 'validation-report.json',
    review_handoff: 'review-handoff.json',
    approval_summary: 'merchant-approval-summary.json',
    summary: 'generation-summary.md'
  };
  writeJson(path.join(base, files.creative_brief), creativeBrief);
  writeJson(path.join(base, files.store_strategy), storeStrategy);
  writeJson(path.join(base, files.merchant_profile), merchantProfile);
  writeJson(path.join(base, files.draft_configuration), draft);
  writeJson(path.join(base, files.generated_theme), generated.manifest);
  writeJson(path.join(base, files.validation_report), generated.validation);
  writeJson(path.join(base, files.review_handoff), reviewHandoff);
  writeJson(path.join(base, files.approval_summary), approvalSummary);
  fs.writeFileSync(path.join(base, files.summary), generationSummary({ merchantProfile, draft, generated, approvalSummary }));
  const generatedConfiguration = copyGeneratedConfiguration(generated.workspace, path.join(base, 'generated-theme'));
  const packageFiles = [...Object.values(files), ...generatedConfiguration.map((file) => `generated-theme/${file}`)].sort();
  const checksums = Object.fromEntries(packageFiles.map((file) => [file, sha256File(path.join(base, file))]));
  const manifest = {
    version: 1,
    generation_id: generationId,
    generated_workspace: path.relative(root, generated.workspace),
    profile_id: merchantProfile.profile_id,
    status: 'ready_for_review',
    files: packageFiles,
    checksums,
    source_theme_modified: false,
    next_stage: 'review_session'
  };
  writeJson(path.join(base, 'preview-package.json'), manifest);
  return { directory: base, manifest, validation: { valid: true, errors: [], warnings: [] } };
}

module.exports = { createPreviewPackage, copyGeneratedConfiguration, generationSummary };
