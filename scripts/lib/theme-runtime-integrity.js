'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { RUNTIME_DIRECTORIES, THEME_CONFIGURATION_FILES } = require('./repository-paths');

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function walk(directory, baseDirectory, output) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, baseDirectory, output);
    else if (entry.isFile()) {
      output.push({
        path: path.relative(baseDirectory, absolute).split(path.sep).join('/'),
        bytes: fs.statSync(absolute).size,
        sha256: sha256File(absolute)
      });
    }
  }
}

function runtimeInventory(themeRoot) {
  const files = [];
  for (const directory of RUNTIME_DIRECTORIES) {
    const absolute = path.join(themeRoot, directory);
    if (fs.existsSync(absolute)) walk(absolute, themeRoot, files);
  }
  for (const relativePath of THEME_CONFIGURATION_FILES) {
    const absolute = path.join(themeRoot, relativePath);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      files.push({ path: relativePath, bytes: fs.statSync(absolute).size, sha256: sha256File(absolute) });
    }
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  const checksum = crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
  return {
    file_count: files.length,
    byte_count: files.reduce((total, file) => total + file.bytes, 0),
    checksum,
    files
  };
}

function compareRuntimeInventories(before, after) {
  const beforeFiles = new Map((before?.files || []).map((file) => [file.path, file]));
  const afterFiles = new Map((after?.files || []).map((file) => [file.path, file]));
  const missing = [...beforeFiles.keys()].filter((file) => !afterFiles.has(file));
  const unexpected = [...afterFiles.keys()].filter((file) => !beforeFiles.has(file));
  const changed = [...beforeFiles.keys()].filter((file) => {
    const right = afterFiles.get(file);
    const left = beforeFiles.get(file);
    return right && (left.sha256 !== right.sha256 || left.bytes !== right.bytes);
  });
  return {
    valid: missing.length === 0 && unexpected.length === 0 && changed.length === 0,
    missing,
    unexpected,
    changed
  };
}

module.exports = {
  sha256File,
  runtimeInventory,
  compareRuntimeInventories
};
