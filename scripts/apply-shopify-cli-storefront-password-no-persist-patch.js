#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestFile = path.join(root, 'patches', 'shopify-cli-4.6.0-storefront-password-no-persist.json');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function occurrences(source, value) {
  if (!value) return 0;
  return source.split(value).length - 1;
}

function patchError(code, message) {
  return Object.assign(new Error(message), { code });
}

function loadPatchContract(repositoryRoot = root) {
  const contractPath = path.join(repositoryRoot, 'patches', path.basename(manifestFile));
  const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  if (contract.schema_version !== '1.0'
    || contract.patch_revision !== 'shopify-cli-storefront-password-no-persist-v1'
    || contract.package_name !== '@shopify/cli'
    || contract.package_version !== '4.6.0'
    || !/^[a-f0-9]{64}$/.test(contract.upstream_sha256 || '')
    || !/^[a-f0-9]{64}$/.test(contract.patched_sha256 || '')
    || contract.exact_substitution?.occurrences !== 1) {
    throw patchError('shopify_storefront_password_patch_contract_invalid', 'The Shopify storefront-password patch contract is invalid.');
  }
  return contract;
}

function verifyPackageBinding(repositoryRoot, contract) {
  const rootPackage = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package-lock.json'), 'utf8'));
  const locked = packageLock.packages?.['node_modules/@shopify/cli'];
  const packageRoot = path.join(repositoryRoot, 'node_modules', '@shopify', 'cli');
  const installed = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  if (rootPackage.dependencies?.[contract.package_name] !== contract.package_version
    || locked?.version !== contract.package_version
    || locked?.integrity !== contract.package_lock_integrity
    || installed.name !== contract.package_name
    || installed.version !== contract.package_version) {
    throw patchError('shopify_storefront_password_patch_package_mismatch', 'The installed Shopify CLI does not match the exact storefront-password patch contract.');
  }
  return packageRoot;
}

function assertPatchedSource(source, contract) {
  if (sha256(source) !== contract.patched_sha256
    || occurrences(source, contract.exact_substitution.before) !== 0
    || occurrences(source, contract.exact_substitution.after) !== contract.exact_substitution.occurrences) {
    throw patchError('shopify_storefront_password_patch_verification_failed', 'The Shopify CLI storefront-password patch is absent or invalid.');
  }
  return true;
}

function applyPatch({ repositoryRoot = root, verifyOnly = false } = {}) {
  const contract = loadPatchContract(repositoryRoot);
  const packageRoot = verifyPackageBinding(repositoryRoot, contract);
  const target = path.join(packageRoot, contract.target_file);
  const source = fs.readFileSync(target, 'utf8');
  const current = sha256(source);

  if (current === contract.patched_sha256) {
    assertPatchedSource(source, contract);
    return { status: 'verified', patch_revision: contract.patch_revision, package_version: contract.package_version };
  }
  if (verifyOnly) {
    throw patchError('shopify_storefront_password_patch_missing', 'The required Shopify CLI storefront-password patch has not been applied.');
  }
  if (current !== contract.upstream_sha256
    || occurrences(source, contract.exact_substitution.before) !== contract.exact_substitution.occurrences
    || occurrences(source, contract.exact_substitution.after) !== 0) {
    throw patchError('shopify_storefront_password_patch_source_mismatch', 'The Shopify CLI storefront-password source differs from the exact approved upstream bytes.');
  }

  const patched = source.replace(contract.exact_substitution.before, contract.exact_substitution.after);
  assertPatchedSource(patched, contract);
  const temporary = `${target}.calinium-patch-${process.pid}`;
  try {
    fs.writeFileSync(temporary, patched, { mode: fs.statSync(target).mode & 0o777 });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
  assertPatchedSource(fs.readFileSync(target, 'utf8'), contract);
  return { status: 'applied', patch_revision: contract.patch_revision, package_version: contract.package_version };
}

if (require.main === module) {
  try {
    const result = applyPatch({ verifyOnly: process.argv.includes('--verify') });
    process.stdout.write(`Shopify CLI storefront-password no-persistence patch ${result.status}: ${result.patch_revision}, @shopify/cli ${result.package_version}.\n`);
  } catch (error) {
    process.stderr.write(`${error.code || 'shopify_storefront_password_patch_failed'}: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  sha256,
  occurrences,
  loadPatchContract,
  verifyPackageBinding,
  assertPatchedSource,
  applyPatch
};
