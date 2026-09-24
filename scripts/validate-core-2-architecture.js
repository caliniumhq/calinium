#!/usr/bin/env node
'use strict';

const path = require('path');
const { loadArchitectureRegistry, validateArchitectureCatalog, selectArchitecture, architectureProvenance, resolveArchitectureRuntime } = require('../ai/architecture');

const root = path.resolve(__dirname, '..');

function run() {
  const validation = validateArchitectureCatalog({ root });
  if (!validation.valid) throw new Error(validation.errors.join('\n'));
  const registry = loadArchitectureRegistry(root);
  const selection = selectArchitecture({ root });
  const trace = architectureProvenance(selection, root);
  if (trace.profile_id !== 'profile.current_calinium.v1' || trace.selected_families.length !== 6) throw new Error('Current Calinium architecture registration is incomplete.');
  if (resolveArchitectureRuntime({ root, architecture: trace }).applied) throw new Error('Current Calinium architecture must remain a strict runtime no-op.');
  const editorial = selectArchitecture({ profileId: 'profile.editorial_discovery.v1', root });
  const editorialTrace = architectureProvenance(editorial, root);
  const editorialRuntime = resolveArchitectureRuntime({ root, architecture: editorialTrace });
  if (!editorialRuntime.applied || editorialRuntime.overlays.length !== 14) throw new Error('Editorial Discovery runtime presenter registration is incomplete.');
  console.log(`Core 2.0 architecture validation passed: profiles=${registry.profiles.profiles.length}; families=${registry.families.families.length}; default=${trace.profile_id}; editorial=${editorialTrace.profile_id}; overlays=${editorialRuntime.overlays.length}; compatibility=true; current_noop=true.`);
}

if (require.main === module) {
  try { run(); } catch (error) { console.error(error.stack || error.message); process.exitCode = 1; }
}

module.exports = { run };
