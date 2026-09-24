'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  applyPatch: attestShopifyCliStorefrontPasswordPatch
} = require('../../scripts/apply-shopify-cli-storefront-password-no-persist-patch');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');

const SHOPIFY_CLI_BUILD_ATTESTATION_REVISION = 'shopify-cli-build-attestation-v1';
const APPROVED_SHOPIFY_CLI_VERSION = '4.6.0';
const APPROVED_SHOPIFY_CLI_RUNTIME_REVISION = 'shopify-cli-runtime-v1';
const COMMAND_TIMEOUT_MS = 30000;

class ShopifyCliBuildAttestationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ShopifyCliBuildAttestationError';
    this.code = code;
  }
}

function attestationError(code, message) {
  return new ShopifyCliBuildAttestationError(code, message);
}

function stripAnsi(value) {
  return String(value || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function normalizeProcessResult(result) {
  return {
    status: Number.isInteger(result?.status) ? result.status : null,
    signal: result?.signal || null,
    stdout: Buffer.isBuffer(result?.stdout) ? result.stdout.toString('utf8') : String(result?.stdout || ''),
    stderr: Buffer.isBuffer(result?.stderr) ? result.stderr.toString('utf8') : String(result?.stderr || ''),
    error: result?.error || null
  };
}

function semanticVersionCandidates(value) {
  return stripAnsi(value).match(/(?<![0-9])([0-9]+\.[0-9]+\.[0-9]+)(?![0-9])/g) || [];
}

function parseShopifyCliVersionOutput(value) {
  const output = stripAnsi(value).trim();
  const candidates = semanticVersionCandidates(output);
  if (candidates.length !== 1) {
    throw attestationError('shopify_cli_version_attestation_failed', 'Shopify CLI version output was empty or ambiguous.');
  }
  const accepted = [
    /^([0-9]+\.[0-9]+\.[0-9]+)$/,
    /^Shopify CLI(?: version)?[:\s]+([0-9]+\.[0-9]+\.[0-9]+)$/i,
    /^@shopify\/cli\/([0-9]+\.[0-9]+\.[0-9]+)(?:\s+[a-z0-9._-]+)*$/i
  ];
  const match = accepted.map((pattern) => pattern.exec(output)).find(Boolean);
  if (!match || match[1] !== candidates[0]) {
    throw attestationError('shopify_cli_version_attestation_failed', 'Shopify CLI version output used an unsupported presentation shape.');
  }
  return match[1];
}

function classifyAutoUpgradeOffOutput(stdout, stderr) {
  const text = stripAnsi(`${stdout || ''}\n${stderr || ''}`);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    if (/^[╭╰┌└][─\s]*(?:info\s*)?[─\s]*[╮╯┐┘]$/iu.test(line)) return '';
    return line.replace(/^[│|]\s*/u, '').replace(/\s*[│|]$/u, '').trim();
  }).filter(Boolean);
  const expectedOff = /^Auto-upgrade off\. You'll need to run `shopify upgrade` to update manually\.$/;
  const expectedOn = /^Auto-upgrade on\. Shopify CLI will update automatically after each command\.$/;
  if (lines.length === 1 && expectedOff.test(lines[0])) {
    return 'shopify_cli_autoupgrade_off_confirmation';
  }
  if (lines.length === 1 && expectedOn.test(lines[0])) {
    throw attestationError(
      'shopify_cli_autoupgrade_verification_failed',
      'Shopify CLI automatic upgrades are enabled for the active runtime identity.'
    );
  }
  if (lines.length !== 1 || !expectedOff.test(lines[0])) {
    throw attestationError('shopify_cli_autoupgrade_configuration_failed', 'Shopify CLI auto-upgrade command returned unrecognized output.');
  }
  return 'shopify_cli_autoupgrade_off_confirmation';
}

function assertSuccessfulProcess(result, code, message) {
  const normalized = normalizeProcessResult(result);
  if (normalized.error || normalized.signal || normalized.status !== 0) throw attestationError(code, message);
  return normalized;
}

function assertAutoUpgradeCommand(result) {
  const normalized = assertSuccessfulProcess(
    result,
    'shopify_cli_autoupgrade_configuration_failed',
    'Shopify CLI could not configure automatic upgrades off.'
  );
  classifyAutoUpgradeOffOutput(normalized.stdout, normalized.stderr);
  return normalized;
}

function assertAutoUpgradeState(config) {
  if (!config || config.autoUpgradeEnabled !== false) {
    throw attestationError('shopify_cli_autoupgrade_verification_failed', 'Shopify CLI automatic upgrades are not explicitly disabled.');
  }
  return 'off';
}

function assertExactVersion(actual, expected, code = 'shopify_cli_version_attestation_failed') {
  if (actual !== expected) throw attestationError(code, 'Shopify CLI version does not match the approved exact version.');
  return actual;
}

function resolveProjectLocalShopifyCli({ root, command = null, expectedVersion = APPROVED_SHOPIFY_CLI_VERSION }) {
  const repositoryRoot = path.resolve(root);
  const packageFile = path.join(repositoryRoot, 'node_modules', '@shopify', 'cli', 'package.json');
  const localBinary = path.join(repositoryRoot, 'node_modules', '.bin', 'shopify');
  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  } catch {
    throw attestationError('shopify_cli_package_version_mismatch', 'The installed Shopify CLI package identity is unavailable.');
  }
  assertExactVersion(packageJson.version, expectedVersion, 'shopify_cli_package_version_mismatch');
  const binEntry = typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.shopify;
  if (!binEntry || !fs.existsSync(localBinary)) {
    throw attestationError('shopify_cli_binary_resolution_failed', 'The project-local Shopify CLI executable is unavailable.');
  }
  const expectedBinary = path.join(path.dirname(packageFile), binEntry);
  let resolvedLocal;
  let resolvedExpected;
  let resolvedCommand;
  try {
    resolvedLocal = fs.realpathSync(localBinary);
    resolvedExpected = fs.realpathSync(expectedBinary);
    resolvedCommand = fs.realpathSync(command || localBinary);
  } catch {
    throw attestationError('shopify_cli_binary_resolution_failed', 'The project-local Shopify CLI executable could not be resolved.');
  }
  if (resolvedLocal !== resolvedExpected || resolvedCommand !== resolvedExpected) {
    throw attestationError('shopify_cli_binary_resolution_failed', 'Shopify CLI resolution is not bound to the project-local package.');
  }
  return {
    repositoryRoot,
    packageFile,
    packageRoot: path.dirname(packageFile),
    packageJson,
    localBinary,
    resolvedBinary: resolvedExpected
  };
}

function executeCli(command, args, { root, env, runner = spawnSync, timeoutMs = COMMAND_TIMEOUT_MS } = {}) {
  let result;
  try {
    result = runner(command, args, {
      cwd: root,
      env: {
        ...withoutShopifyStorefrontPassword(env),
        CI: '1',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        SHOPIFY_CLI_NO_ANALYTICS: '1'
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
      windowsHide: true,
      shell: false,
      killSignal: 'SIGTERM'
    });
  } catch (error) {
    result = { status: error.status ?? null, signal: error.signal || null, stdout: error.stdout, stderr: error.stderr, error };
  }
  return normalizeProcessResult(result);
}

function boundedFiles(directory, depth = 0) {
  if (depth > 7) return [];
  let entries;
  try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return []; }
  const files = [];
  for (const entry of entries) {
    const candidate = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...boundedFiles(candidate, depth + 1));
    else if (entry.isFile() && entry.name === 'config.json') files.push(candidate);
  }
  return files;
}

function readAutoUpgradeConfig(homeDirectory) {
  const matches = [];
  for (const file of boundedFiles(homeDirectory)) {
    try {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Object.prototype.hasOwnProperty.call(config, 'autoUpgradeEnabled')) matches.push({ file, config });
    } catch {}
  }
  if (matches.length !== 1) {
    throw attestationError('shopify_cli_autoupgrade_verification_failed', 'Shopify CLI automatic-upgrade configuration could not be resolved unambiguously.');
  }
  assertAutoUpgradeState(matches[0].config);
  return matches[0];
}

function assertVersionCommand(result, expectedVersion) {
  const normalized = assertSuccessfulProcess(
    result,
    'shopify_cli_version_attestation_failed',
    'Shopify CLI executable version command failed.'
  );
  if (normalized.stderr.trim()) {
    throw attestationError('shopify_cli_version_attestation_failed', 'Shopify CLI executable version command emitted unexpected diagnostics.');
  }
  return assertExactVersion(parseShopifyCliVersionOutput(normalized.stdout), expectedVersion);
}

function sourceRevisionState(value) {
  if (!/^[0-9a-f]{40}$/.test(String(value || ''))) {
    throw attestationError('shopify_cli_build_source_attestation_failed', 'Build source revision is not structurally valid.');
  }
  return 'valid';
}

function runtimeRevisionState(value, expected = APPROVED_SHOPIFY_CLI_RUNTIME_REVISION) {
  if (String(value || '') !== expected) {
    throw attestationError('shopify_cli_runtime_revision_mismatch', 'Shopify CLI runtime revision does not match the approved build contract.');
  }
  return expected;
}

function configBoundary(homeDirectory, configFile) {
  const relative = path.relative(homeDirectory, configFile);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw attestationError('shopify_cli_autoupgrade_verification_failed', 'Shopify CLI configuration is outside the isolated runtime home.');
  }
  return path.join(homeDirectory, relative.split(path.sep)[0]);
}

function isWritable(target) {
  try { fs.accessSync(target, fs.constants.W_OK); return true; } catch { return false; }
}

function assertRuntimeImmutable({ root, resolution, homeDirectory, configFile }) {
  const targets = [
    path.resolve(root),
    path.join(root, 'node_modules'),
    resolution.packageRoot,
    resolution.resolvedBinary,
    path.join(root, 'package.json'),
    path.join(root, 'package-lock.json'),
    configBoundary(homeDirectory, configFile),
    configFile
  ];
  if (targets.some(isWritable)) {
    throw attestationError('shopify_cli_runtime_immutability_failed', 'Shopify CLI dependency or configuration remains writable by the runtime user.');
  }
  return 'read_only';
}

function protectTree(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) {
    fs.lchownSync(target, 0, 0);
    return;
  }
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target)) protectTree(path.join(target, entry));
  }
  fs.chownSync(target, 0, 0);
  fs.chmodSync(target, stat.mode & ~0o222);
}

function protectEntry(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) fs.lchownSync(target, 0, 0);
  else {
    fs.chownSync(target, 0, 0);
    fs.chmodSync(target, stat.mode & ~0o222);
  }
}

function protectApplicationSource(root) {
  for (const entry of fs.readdirSync(root)) {
    if (entry === 'node_modules' || entry === 'output') continue;
    protectTree(path.join(root, entry));
  }
}

function hardenShopifyCliRuntime({ root, env = process.env, command = null, expectedVersion = APPROVED_SHOPIFY_CLI_VERSION } = {}) {
  const repositoryRoot = path.resolve(root || path.join(__dirname, '../..'));
  const homeDirectory = path.resolve(env.HOME || '');
  const runtimeRevision = runtimeRevisionState(env.CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION);
  const resolution = resolveProjectLocalShopifyCli({ root: repositoryRoot, command, expectedVersion });
  attestShopifyCliStorefrontPasswordPatch({ repositoryRoot, verifyOnly: true });
  const { file: configFile } = readAutoUpgradeConfig(homeDirectory);
  for (const target of [
    path.join(repositoryRoot, 'node_modules'),
    path.join(repositoryRoot, 'package.json'),
    path.join(repositoryRoot, 'package-lock.json'),
    configBoundary(homeDirectory, configFile)
  ]) protectTree(target);
  protectApplicationSource(repositoryRoot);
  protectEntry(repositoryRoot);
  return {
    status: 'passed',
    contract_version: SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
    runtime_revision: runtimeRevision,
    package_version: resolution.packageJson.version,
    binary_resolution: 'project_local',
    auto_upgrade_state: 'off',
    runtime_filesystem: 'hardened'
  };
}

function attestShopifyCliBuild({
  root,
  env = process.env,
  command = null,
  expectedVersion = APPROVED_SHOPIFY_CLI_VERSION,
  configureAutoUpgrade = true,
  verifyImmutable = false,
  runner = spawnSync
} = {}) {
  const repositoryRoot = path.resolve(root || path.join(__dirname, '../..'));
  const homeDirectory = path.resolve(env.HOME || '');
  if (!homeDirectory || homeDirectory === path.parse(homeDirectory).root) {
    throw attestationError('shopify_cli_autoupgrade_verification_failed', 'Shopify CLI build attestation requires an isolated runtime home.');
  }
  sourceRevisionState(env.CALINIUM_BUILD_SOURCE_REVISION);
  const runtimeRevision = runtimeRevisionState(env.CALINIUM_SHOPIFY_CLI_RUNTIME_REVISION);
  const resolution = resolveProjectLocalShopifyCli({ root: repositoryRoot, command, expectedVersion });
  attestShopifyCliStorefrontPasswordPatch({ repositoryRoot, verifyOnly: true });
  let autoUpgradeAction = 'verified_existing';
  if (configureAutoUpgrade) {
    assertAutoUpgradeCommand(executeCli(resolution.localBinary, ['config', 'autoupgrade', 'off'], {
      root: repositoryRoot,
      env,
      runner
    }));
    autoUpgradeAction = 'configured_and_verified';
  }
  const statusResult = executeCli(resolution.localBinary, ['config', 'autoupgrade', 'status'], {
    root: repositoryRoot,
    env,
    runner
  });
  assertAutoUpgradeCommand(statusResult);
  const { file: configFile } = readAutoUpgradeConfig(homeDirectory);
  const actualVersion = assertVersionCommand(executeCli(resolution.localBinary, ['version'], {
    root: repositoryRoot,
    env,
    runner
  }), expectedVersion);
  const runtimeFilesystem = verifyImmutable
    ? assertRuntimeImmutable({ root: repositoryRoot, resolution, homeDirectory, configFile })
    : 'build_writable';
  return {
    status: 'passed',
    contract_version: SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
    runtime_revision: runtimeRevision,
    expected_version: expectedVersion,
    package_version: resolution.packageJson.version,
    executable_version: actualVersion,
    binary_resolution: 'project_local',
    version_command: 'shopify version',
    auto_upgrade_action: autoUpgradeAction,
    auto_upgrade_state: 'off',
    runtime_filesystem: runtimeFilesystem,
    source_revision: 'valid'
  };
}

module.exports = {
  SHOPIFY_CLI_BUILD_ATTESTATION_REVISION,
  APPROVED_SHOPIFY_CLI_VERSION,
  APPROVED_SHOPIFY_CLI_RUNTIME_REVISION,
  ShopifyCliBuildAttestationError,
  stripAnsi,
  semanticVersionCandidates,
  parseShopifyCliVersionOutput,
  classifyAutoUpgradeOffOutput,
  assertAutoUpgradeCommand,
  assertAutoUpgradeState,
  assertExactVersion,
  resolveProjectLocalShopifyCli,
  executeCli,
  readAutoUpgradeConfig,
  assertVersionCommand,
  sourceRevisionState,
  runtimeRevisionState,
  assertRuntimeImmutable,
  protectApplicationSource,
  hardenShopifyCliRuntime,
  attestShopifyCliBuild
};
