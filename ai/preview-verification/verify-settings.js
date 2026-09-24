'use strict';

const fs = require('fs');
const path = require('path');
const { same, result } = require('./utils');

function parseSettings(file) {
  try { return { value: JSON.parse(fs.readFileSync(file, 'utf8')), error: null }; } catch (error) { return { value: null, error: error.message }; }
}

function verifySettings({ generated, snapshotDirectory, origin }) {
  const generatedFile = path.join(generated.workspace, 'theme/config/settings_data.json');
  const snapshotFile = path.join(snapshotDirectory, 'config/settings_data.json');
  const expected = parseSettings(generatedFile);
  const actual = parseSettings(snapshotFile);
  const results = [
    result({ id: 'settings:json', category: 'settings', method: 'settings_data_json_parse', expected: expected.error || 'valid JSON', actual: actual.error || 'valid JSON', passed: !expected.error && !actual.error, remediation: 'Restore a valid settings_data.json from the approved configuration package.', origin: { ...origin, generated_file: 'theme/config/settings_data.json' } }),
    result({ id: 'settings:document', category: 'settings', method: 'full_settings_data_structural_comparison', expected: expected.value, actual: actual.value, passed: !expected.error && !actual.error && same(expected.value, actual.value), remediation: 'The deployed settings differ from approval. Re-upload only the approved settings_data.json.', origin: { ...origin, generated_file: 'theme/config/settings_data.json' } })
  ];
  if (!expected.error && !actual.error) {
    for (const setting of generated.manifest.generated_settings) {
      const actualValue = actual.value.current?.[setting.setting_id];
      results.push(result({
        id: `settings:${setting.setting_id}`, category: 'settings', method: 'generated_global_setting_value_comparison', expected: setting.value, actual: actualValue,
        passed: same(setting.value, actualValue), remediation: `Restore the approved value for ${setting.setting_id} in settings_data.json.`, origin: { ...origin, generated_file: 'theme/config/settings_data.json' }
      }));
    }
  }
  return { results, valid: results.every((item) => item.result === 'passed') };
}

module.exports = { parseSettings, verifySettings };
