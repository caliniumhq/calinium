'use strict';

function generateDiff({ generatedFiles, generatedInstances, settingsChanges, unsupported }) {
  return {
    version: 1,
    generated_files: generatedFiles.map((file) => file.path),
    preserved_files: ['source/apps/theme/templates/*', 'source/apps/theme/config/settings_data.json', 'source/apps/theme/sections/*', 'source/apps/theme/snippets/*', 'source/apps/theme/assets/*', 'source/apps/theme/locales/*', 'source/apps/theme/config/settings_schema.json'],
    untouched_files: ['apps/theme/templates', 'apps/theme/sections', 'apps/theme/snippets', 'apps/theme/assets', 'apps/theme/locales', 'apps/theme/config/settings_schema.json', 'apps/theme/config/settings_data.json'],
    generated_sections: generatedInstances.filter((item) => item.origin === 'generated').map((item) => ({ template: item.template, instance_id: item.instance_id, section_id: item.section_id })),
    preserved_sections: generatedInstances.filter((item) => item.origin === 'preserved').map((item) => ({ template: item.template, instance_id: item.instance_id, section_id: item.section_id })),
    generated_settings: settingsChanges.map((item) => item.setting_id),
    unsupported_items: unsupported.map((item) => ({ id: item.page_id, reason: item.reason })),
    skipped_items: []
  };
}

module.exports = { generateDiff };
