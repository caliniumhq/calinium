'use strict';

const fs = require('fs');
const path = require('path');
const { defaultRunner, cliOptions, runnerOptions } = require('./shopify-auth');
const { DEPLOYABLE_PATH } = require('./utils');
const { parseShopifyCliJsonResult, validateThemeListPayload, normalizeRole } = require('../storefront-render/shopify-cli-runtime');

function parseJson(result, label) {
  try { return parseShopifyCliJsonResult(result).data; }
  catch (error) { throw Object.assign(new Error(`${label} did not return valid bounded machine output.`), { code: error.code || 'shopify_cli_machine_output_invalid' }); }
}

function normalizedThemes(data) {
  return validateThemeListPayload(data);
}

function assertSafeTarget(theme) {
  if (!theme || !['unpublished', 'development'].includes(theme.role)) throw new Error('Deployment target must be an unpublished or development theme.');
  if (theme.role === 'main' || theme.role === 'published') throw new Error('Published themes are prohibited deployment targets.');
  return theme;
}

class ThemeService {
  constructor({ runner = defaultRunner, root }) { this.runner = runner; this.root = root; }

  listThemes(auth) {
    const result = this.runner('shopify', ['theme', 'list', '--json', '--no-color', ...cliOptions(auth)], runnerOptions(auth, this.root, this.root));
    return normalizedThemes(parseJson(result, 'Shopify theme list'));
  }

  selectDevelopmentTheme(auth, { themeId = null } = {}) {
    const themes = this.listThemes(auth);
    if (themeId !== null && themeId !== undefined) return assertSafeTarget(themes.find((theme) => String(theme.id) === String(themeId)));
    const calinium = themes.find((theme) => ['unpublished', 'development'].includes(theme.role) && /^calinium development/i.test(theme.name));
    const development = themes.find((theme) => theme.role === 'development');
    return calinium || development || null;
  }

  createDevelopmentTheme(auth, { baselineThemePath, name = 'Calinium Development Theme' }) {
    if (!baselineThemePath || !fs.existsSync(baselineThemePath)) throw new Error('Creating a development theme requires an explicit immutable baseline theme directory.');
    for (const directory of ['layout', 'sections', 'templates', 'config']) if (!fs.existsSync(path.join(baselineThemePath, directory))) throw new Error(`Baseline theme directory is missing ${directory}/.`);
    // `--unpublished` is the creation gate. Do not pass a target ID or any live-theme
    // override here: Shopify CLI assigns the new target from the immutable baseline.
    const result = this.runner('shopify', ['theme', 'push', '--unpublished', '--json', '--no-color', '--strict', '--nodelete', '--path', baselineThemePath, ...cliOptions(auth)], runnerOptions(auth, baselineThemePath, this.root));
    const data = parseJson(result, 'Shopify development-theme creation');
    const theme = data.theme || data;
    return assertSafeTarget({ id: theme.id, name: theme.name || name, role: normalizeRole(theme.role || 'unpublished'), preview_url: theme.preview_url || theme.previewUrl || null, updated_at: theme.updated_at || null });
  }

  ensureDevelopmentTheme(auth, options = {}) {
    const selected = this.selectDevelopmentTheme(auth, options);
    if (selected) return { theme: selected, created: false };
    if (!options.allowCreate) throw new Error('No eligible development theme exists. Re-run with explicit --allow-create and an immutable --baseline-theme path.');
    return { theme: this.createDevelopmentTheme(auth, options), created: true };
  }

  pullConfiguration(auth, { theme, destination }) {
    fs.mkdirSync(destination, { recursive: true });
    const result = this.runner('shopify', ['theme', 'pull', '--theme', String(theme.id), '--path', destination, '--nodelete', '--only', 'templates/*.json', '--only', 'config/settings_data.json', ...cliOptions(auth)], runnerOptions(auth, destination, this.root));
    if (result.status !== 0) throw Object.assign(new Error('Shopify configuration pull failed.'), { code: 'shopify_cli_execution_failed' });
    return result;
  }

  uploadConfiguration(auth, { theme, source }) {
    assertSafeTarget(theme);
    const result = this.runner('shopify', ['theme', 'push', '--theme', String(theme.id), '--path', source, '--strict', '--nodelete', '--json', '--no-color', '--only', 'templates/*.json', '--only', 'config/settings_data.json', ...cliOptions(auth)], runnerOptions(auth, source, this.root));
    const data = parseJson(result, 'Shopify configuration upload');
    const remote = data.theme || data;
    const target = assertSafeTarget({ id: remote.id ?? theme.id, name: remote.name || theme.name, role: normalizeRole(remote.role || theme.role), preview_url: remote.preview_url || remote.previewUrl || theme.preview_url || null, updated_at: remote.updated_at || theme.updated_at || null });
    return { theme: target, raw: data };
  }
}

module.exports = { ThemeService, parseJson, normalizedThemes, assertSafeTarget };
