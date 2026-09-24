'use strict';

const { result } = require('./utils');

function verifySections({ generated, templates, origin }) {
  const results = [];
  const instances = generated.manifest.generated_section_instances;
  const scopedIds = instances.map((item) => `${item.template}:${item.instance_id}`);
  const duplicateIds = scopedIds.filter((id, index, values) => values.indexOf(id) !== index);
  results.push(result({
    id: 'section:unique-instance-ids', category: 'section', method: 'template_scoped_instance_id_uniqueness', expected: 'unique instance IDs within each template', actual: duplicateIds, passed: duplicateIds.length === 0,
    remediation: 'Regenerate the approved theme with unique section instance IDs within each template before deploying.', origin
  }));
  for (const instance of instances) {
    const template = templates[instance.template];
    const actualSection = template?.sections?.[instance.instance_id] || null;
    const actualPosition = template?.order?.indexOf(instance.instance_id);
    results.push(result({
      id: `section:${instance.template.replace(/[/.]/g, ':')}:${instance.instance_id}:type`, category: 'section', method: 'section_instance_type_comparison', expected: instance.section_id, actual: actualSection?.type || null,
      passed: actualSection?.type === instance.section_id,
      remediation: `Restore ${instance.instance_id} as a ${instance.section_id} section in ${instance.template}.`, origin: { ...origin, generated_file: `theme/${instance.template}` }
    }));
    results.push(result({
      id: `section:${instance.template.replace(/[/.]/g, ':')}:${instance.instance_id}:position`, category: 'section', method: 'section_instance_order_comparison', expected: instance.position, actual: actualPosition === undefined || actualPosition < 0 ? null : actualPosition + 1,
      passed: actualPosition === instance.position - 1,
      remediation: `Restore ${instance.instance_id} to position ${instance.position} in ${instance.template}.`, origin: { ...origin, generated_file: `theme/${instance.template}` }
    }));
  }
  return { results, valid: results.every((item) => item.result === 'passed') };
}

module.exports = { verifySections };
