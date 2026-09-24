'use strict';

const path = require('path');

const RUNTIME_DIRECTORIES = Object.freeze([
  'assets',
  'layout',
  'locales',
  'sections',
  'snippets',
  'templates'
]);

const OPTIONAL_RUNTIME_DIRECTORIES = Object.freeze(['blocks']);
const THEME_CONFIGURATION_FILES = Object.freeze([
  'config/settings_schema.json',
  'config/settings_data.json'
]);

function repositoryRoot(candidate = path.resolve(__dirname, '../..')) {
  return path.resolve(candidate);
}

function repositoryPaths(candidate) {
  const root = repositoryRoot(candidate);
  const themeRoot = path.join(root, 'apps', 'theme');

  return Object.freeze({
    root,
    themeRoot,
    aiRoot: path.join(root, 'ai'),
    schemaRoot: path.join(root, 'schemas'),
    documentationRoot: path.join(root, 'docs'),
    outputRoot: path.join(root, 'output'),
    dashboardRoot: path.join(root, 'apps', 'dashboard'),
    platformConfigRoot: path.join(root, 'config'),
    themeConfigRoot: path.join(themeRoot, 'config'),
    themeSettingsSchema: path.join(themeRoot, 'config', 'settings_schema.json'),
    themeSettingsData: path.join(themeRoot, 'config', 'settings_data.json'),
    runtimeDirectories: RUNTIME_DIRECTORIES,
    optionalRuntimeDirectories: OPTIONAL_RUNTIME_DIRECTORIES,
    themeConfigurationFiles: THEME_CONFIGURATION_FILES
  });
}

function themePath(candidate, relativePath = '') {
  const paths = repositoryPaths(candidate);
  const target = path.resolve(paths.themeRoot, relativePath);
  const relative = path.relative(paths.themeRoot, target);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Theme path escapes apps/theme: ${relativePath}`);
  }
  return target;
}

module.exports = {
  RUNTIME_DIRECTORIES,
  OPTIONAL_RUNTIME_DIRECTORIES,
  THEME_CONFIGURATION_FILES,
  repositoryRoot,
  repositoryPaths,
  themePath
};
