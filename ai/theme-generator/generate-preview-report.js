'use strict';

function generatePreviewReport({ draft, manifest, homepage, pages, unsupported, settingsChanges }) {
  const lines = [
    '# Calinium generated theme preview',
    '',
    `- Generation: \`${manifest.generation_id}\``,
    `- Approval: \`${manifest.approval.approval_reference}\``,
    `- Draft readiness: \`${draft.draft_readiness.status}\``,
    `- Source theme modified: **No**`,
    '',
    '## Homepage structure',
    ''
  ];
  for (const item of homepage.instances) lines.push(`${item.position}. ${item.section_id} (${item.origin})`);
  lines.push('', '## Other page structures', '');
  for (const page of pages) lines.push(`- ${page.page_id}: ${page.instances.map((item) => item.section_id).join(', ') || 'no sections'}`);
  lines.push('', '## Changed global settings', '');
  lines.push(settingsChanges.length ? settingsChanges.map((item) => `- ${item.setting_id} (${item.origin})`).join('\n') : '- None');
  lines.push('', '## Merchant references', '');
  lines.push(manifest.merchant_references.length ? manifest.merchant_references.map((item) => `- ${item.reference_id}`).join('\n') : '- None');
  lines.push('', '## Unsupported or deliberately unplanned items', '');
  lines.push(unsupported.length ? unsupported.map((item) => `- ${item.page_id}: ${item.reason}`).join('\n') : '- None');
  lines.push('', '## Review note', '', 'This workspace is a proposed configuration only. It contains no Liquid, CSS, JavaScript, assets, locales, or theme settings schema, and it must be previewed and approved before any deployment workflow.');
  return `${lines.join('\n')}\n`;
}

module.exports = { generatePreviewReport };
