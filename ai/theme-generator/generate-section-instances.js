'use strict';

const { clone, readJson, sourcePath, traceFrom } = require('./utils');
const { approvedValue } = require('./resolve-resource-references');
const { accepted } = require('./generate-settings');
const { materializeSectionBlocks, policyForRuntime } = require('./materialize-section-blocks');
const { omissionWarning, sectionAdmissionDecision } = require('./section-content-eligibility');

function generatedInstanceId(instanceId, used) {
  const base = `calinium_${instanceId.replace(/-/g, '_')}`;
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) candidate = `${base}_${suffix++}`;
  return candidate;
}

function sectionSettings(section, approval, mappings) {
  const capability = mappings.index.sections.get(section.section_id);
  if (!capability) throw new Error(`Unknown installed section ${section.section_id}.`);
  const available = new Map(capability.available_settings.map((setting) => [setting.setting_id, setting]));
  const settings = {};
  for (const planned of section.mapped_settings || []) {
    if (planned.scope !== 'section' || planned.status !== 'proposed') continue;
    const capabilitySetting = available.get(planned.setting_id);
    if (!capabilitySetting) throw new Error(`${section.section_id}.${planned.setting_id} is not a real section setting.`);
    const explicitlyApproved = Object.hasOwn(approval.merchant_references || {}, planned.setting_ref)
      && approval.completed_confirmations.includes(`field:${planned.setting_ref}`);
    if ((!capabilitySetting.ai_configurable || capabilitySetting.merchant_only || capabilitySetting.merchant_review_required) && !explicitlyApproved) continue;
    const resolved = approvedValue(planned, approval);
    if (resolved.value === null || resolved.value === undefined) continue;
    if (!accepted(capabilitySetting, resolved.value)) throw new Error(`${section.section_id}.${planned.setting_id} has a value outside its documented accepted values.`);
    settings[planned.setting_id] = resolved.value;
  }
  return settings;
}

function loadBaselineTemplate(root, sourceRelative) {
  const file = sourcePath(root, sourceRelative);
  if (!require('fs').existsSync(file)) return { sections: {}, order: [] };
  const template = clone(readJson(file));
  template.sections ||= {};
  template.order ||= [];
  return template;
}

function materializeForInstance({ root, section, sectionInstance, pageRole, approvedBlockPlan, approvedBlockPlanResourceSnapshot, mappings }) {
  const policy = policyForRuntime(root, section.section_id);
  if (!approvedBlockPlan || !policy) return { section: sectionInstance, warnings: [], omissions: [] };
  const targetsCurrentPage = (approvedBlockPlan.compositions || []).some((composition) => composition.section_role === policy.semantic_section_role && composition.page_role === pageRole);
  if (!targetsCurrentPage) return { section: sectionInstance, warnings: [], omissions: [] };
  const result = materializeSectionBlocks({
    root,
    approvedBlockPlan,
    resourceSnapshot: approvedBlockPlanResourceSnapshot,
    pageRole,
    sectionId: section.section_id,
    sectionInstanceId: sectionInstance.instance_id,
    mappings
  });
  if (!result.applied) return { section: sectionInstance, warnings: result.warnings, omissions: result.omissions };
  return {
    section: { ...sectionInstance, settings: { ...(sectionInstance.settings || {}), ...(result.section_settings || {}) }, blocks: result.blocks, block_order: result.block_order },
    warnings: result.warnings,
    omissions: result.omissions
  };
}

function generateSectionInstances({ root, templatePath, sourceTemplatePath, pagePlan, approval, mappings, pageRole = null, approvedBlockPlan = null, approvedBlockPlanResourceSnapshot = null, preserveUnplannedSections = true }) {
  const template = loadBaselineTemplate(root, sourceTemplatePath || templatePath);
  const used = new Set(Object.keys(template.sections));
  const baselineOrder = template.order.filter((id) => Object.hasOwn(template.sections, id));
  const plannedOrder = [];
  const instances = [];
  const warnings = [];
  const omissions = [];
  for (const section of [...pagePlan.sections].sort((left, right) => left.position - right.position)) {
    if (section.validation_status === 'unsupported') continue;
    if (section.validation_status !== 'valid') throw new Error(`${section.instance_id} is not valid for generation.`);
    const preservedId = baselineOrder.find((id) => template.sections[id]?.type === section.section_id);
    const trace = traceFrom(section.explanation, approval.approval_reference, section.instance_id);
    if (preservedId) {
      const settings = sectionSettings(section, approval, mappings);
      const sectionInstance = {
        instance_id: preservedId,
        ...template.sections[preservedId],
        settings: { ...(template.sections[preservedId].settings || {}), ...settings }
      };
      const materialized = materializeForInstance({ root, section, sectionInstance, pageRole, approvedBlockPlan, approvedBlockPlanResourceSnapshot, mappings });
      const { instance_id: ignoredInstanceId, ...serializedSection } = materialized.section;
      template.sections[preservedId] = serializedSection;
      warnings.push(...materialized.warnings);
      omissions.push(...materialized.omissions);
      plannedOrder.push(preservedId);
      instances.push({ template: templatePath.replace(/^theme\//, ''), instance_id: preservedId, section_id: section.section_id, position: section.position, origin: 'preserved', trace });
      continue;
    }
    const instanceId = generatedInstanceId(section.instance_id, used);
    used.add(instanceId);
    const sectionInstance = { instance_id: instanceId, type: section.section_id, settings: sectionSettings(section, approval, mappings) };
    const materialized = materializeForInstance({ root, section, sectionInstance, pageRole, approvedBlockPlan, approvedBlockPlanResourceSnapshot, mappings });
    const admission = sectionAdmissionDecision({
      origin: 'generated',
      pageRole,
      sectionId: section.section_id,
      sectionInstance: materialized.section,
      resourceSnapshot: approvedBlockPlanResourceSnapshot
    });
    if (!admission.admitted) {
      warnings.push(...materialized.warnings, omissionWarning({ instanceId, decision: admission }));
      omissions.push(...materialized.omissions, {
        section_id: section.section_id,
        instance_id: instanceId,
        reason: admission.reason_code,
        policy_revision: admission.policy_revision
      });
      continue;
    }
    const { instance_id: ignoredInstanceId, ...serializedSection } = materialized.section;
    template.sections[instanceId] = serializedSection;
    warnings.push(...materialized.warnings);
    omissions.push(...materialized.omissions);
    plannedOrder.push(instanceId);
    instances.push({ template: templatePath.replace(/^theme\//, ''), instance_id: instanceId, section_id: section.section_id, position: section.position, origin: 'generated', trace });
  }
  if (preserveUnplannedSections) {
    template.order = [...plannedOrder, ...baselineOrder.filter((id) => !plannedOrder.includes(id))];
  } else {
    template.order = [...plannedOrder];
    template.sections = Object.fromEntries(plannedOrder.map((id) => [id, template.sections[id]]));
  }
  return { template, instances, warnings, omissions };
}

module.exports = { generateSectionInstances, sectionSettings, generatedInstanceId, materializeForInstance };
