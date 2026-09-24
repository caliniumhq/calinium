#!/usr/bin/env node

// Shopify CLI 4.6.0's generated entry point enables Node's compile cache,
// which is unavailable in Node 20. The CLI bootstrap itself remains the
// project-pinned implementation used by Calinium's read-only Theme Check.
// Import it directly so public CI can retain its Node 20 contract without
// downloading, replacing, or globally installing a second Shopify CLI.
process.removeAllListeners('warning');

const { default: runCLI } = await import('../node_modules/@shopify/cli/dist/bootstrap.js');

runCLI({ development: false });
