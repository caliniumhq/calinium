#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const { renderDashboardShell } = require('../apps/dashboard/server/embedded-shell.cjs');

const root = path.resolve(__dirname, '..');
const dashboardRoot = path.join(root, 'apps/dashboard');
const builtIndex = path.join(dashboardRoot, 'dist/index.html');

async function run() {
  assert(fs.existsSync(builtIndex), 'Launch-preview validation requires a completed dashboard production build.');
  const html = fs.readFileSync(builtIndex, 'utf8');
  assert(html.includes('CALINIUM_APP_BRIDGE'), 'The production build must retain the request-time App Bridge marker.');
  assert(!html.includes('app-bridge.js'), 'The production build must not bake in App Bridge.');
  assert(!html.includes('shopify-api-key'), 'The production build must not bake in the Shopify client identifier meta tag.');

  const syntheticEnv = { SHOPIFY_API_KEY: 'synthetic_client_id_123' };
  const embedded = renderDashboardShell(html, syntheticEnv);
  assert(embedded.includes('app-bridge.js'), 'Embedded routes must retain request-time App Bridge injection.');
  const launchShell = renderDashboardShell(embedded, syntheticEnv, { includeAppBridge: false });
  assert(!launchShell.includes('app-bridge.js'), 'The launch shell must strip a pre-injected App Bridge script.');
  assert(!launchShell.includes('shopify-api-key'), 'The launch shell must strip a pre-injected Shopify client meta tag.');
  assert(launchShell.includes('<title>Calinium — Storefront direction, shaped around your business</title>'), 'The launch shell requires route-specific pre-JavaScript title metadata.');
  assert(launchShell.includes('<meta name="description"'), 'The launch shell requires route-specific pre-JavaScript description metadata.');

  const vitePath = require.resolve('vite', { paths: [dashboardRoot] });
  const { preview } = await import(pathToFileURL(vitePath).href);
  const server = await preview({
    root: dashboardRoot,
    configFile: path.join(dashboardRoot, 'vite.config.js'),
    logLevel: 'silent',
    preview: { host: '127.0.0.1', port: 0, strictPort: false }
  });
  const address = server.httpServer.address();
  const port = typeof address === 'object' && address ? address.port : null;
  assert(Number.isInteger(port), 'The local launch-preview server did not expose a port.');

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of [{ id: 'desktop', width: 1440, height: 1000 }, { id: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      const pageErrors = [];
      const failedRequests = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('requestfailed', (request) => failedRequests.push(request.url()));
      const response = await page.goto(`http://127.0.0.1:${port}/launch-preview`, { waitUntil: 'networkidle' });
      assert.strictEqual(response?.status(), 200, `${viewport.id} launch-preview response must be HTTP 200.`);
      await page.keyboard.press('Tab');
      const result = await page.evaluate(() => {
        const primary = document.querySelector('.launch-button--primary');
        const focused = document.activeElement;
        const images = [...document.images];
        const hashLinks = [...document.querySelectorAll('a[href^="#"]')];
        return {
          document_width: document.documentElement.scrollWidth,
          viewport_width: window.innerWidth,
          body_margin: getComputedStyle(document.body).margin,
          body_font: getComputedStyle(document.body).fontFamily,
          primary_box_sizing: primary ? getComputedStyle(primary).boxSizing : null,
          primary_transition_duration: primary ? getComputedStyle(primary).transitionDuration : null,
          html_scroll_behavior: getComputedStyle(document.documentElement).scrollBehavior,
          h1_count: document.querySelectorAll('h1').length,
          faq_count: document.querySelectorAll('#faq dl > div').length,
          form_count: document.querySelectorAll('form').length,
          textbox_count: document.querySelectorAll('input, textarea').length,
          primary_target: primary?.getAttribute('href') || null,
          missing_hash_targets: hashLinks.map((link) => link.getAttribute('href')).filter((href) => href && href !== '#' && !document.querySelector(href)),
          image_count: images.length,
          failed_images: images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.alt),
          missing_alt_images: images.filter((image) => !image.alt.trim()).length,
          focused_text: focused?.textContent?.trim() || null,
          focused_href: focused?.getAttribute?.('href') || null,
          focused_outline: focused ? getComputedStyle(focused).outlineStyle : null,
          app_bridge_elements: document.querySelectorAll('script[src*="app-bridge"], meta[name="shopify-api-key"]').length,
          title: document.title,
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || null,
          reduced_motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        };
      });

      assert.strictEqual(result.document_width, result.viewport_width, `${viewport.id} must not have root horizontal overflow.`);
      assert.strictEqual(result.body_margin, '0px', `${viewport.id} must use the route-owned body reset.`);
      assert(result.body_font.includes('system-ui'), `${viewport.id} must use the route-owned system body font.`);
      assert.strictEqual(result.primary_box_sizing, 'border-box', `${viewport.id} must use border-box sizing.`);
      assert.strictEqual(result.primary_transition_duration, '0s', `${viewport.id} must disable decorative motion when reduced motion is requested.`);
      assert.strictEqual(result.html_scroll_behavior, 'auto', `${viewport.id} must disable smooth scrolling when reduced motion is requested.`);
      assert.strictEqual(result.h1_count, 1, `${viewport.id} must expose exactly one H1.`);
      assert.strictEqual(result.faq_count, 6, `${viewport.id} must expose the six required FAQ entries.`);
      assert.strictEqual(result.form_count, 0, `${viewport.id} must not expose an unimplemented form.`);
      assert.strictEqual(result.textbox_count, 0, `${viewport.id} must not collect unsupported visitor data.`);
      assert.strictEqual(result.primary_target, '#how-it-works', `${viewport.id} primary action must target the implemented process section.`);
      assert.deepStrictEqual(result.missing_hash_targets, [], `${viewport.id} contains an unresolved in-page link.`);
      assert.strictEqual(result.image_count, 2, `${viewport.id} must load exactly the two documented product captures.`);
      assert.deepStrictEqual(result.failed_images, [], `${viewport.id} contains a failed image.`);
      assert.strictEqual(result.missing_alt_images, 0, `${viewport.id} images require alternative text.`);
      assert.strictEqual(result.focused_text, 'Skip to content', `${viewport.id} first keyboard target must be the skip link.`);
      assert.strictEqual(result.focused_href, '#launch-main', `${viewport.id} skip link must target main content.`);
      assert.notStrictEqual(result.focused_outline, 'none', `${viewport.id} keyboard focus must be visible.`);
      assert.strictEqual(result.app_bridge_elements, 0, `${viewport.id} launch route must not load App Bridge.`);
      assert.strictEqual(result.title, 'Calinium — Storefront direction, shaped around your business', `${viewport.id} requires launch metadata.`);
      assert(result.description?.includes('AI creative direction system'), `${viewport.id} requires a truthful meta description.`);
      assert.strictEqual(result.reduced_motion, true, `${viewport.id} reduced-motion test context was not active.`);
      assert.deepStrictEqual(pageErrors, [], `${viewport.id} emitted a page error.`);
      assert.deepStrictEqual(failedRequests, [], `${viewport.id} emitted a failed request.`);
      results.push({ viewport: viewport.id, status: 'passed', width: result.viewport_width });
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  process.stdout.write(`Calinium launch-preview validation passed: ${results.length}/${results.length} viewports; shell metadata/App Bridge boundary passed.\n`);
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
