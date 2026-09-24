'use strict';

const fs = require('fs');
const path = require('path');
const { sha256File, redactSensitiveText } = require('./contracts');
const { withoutShopifyStorefrontPassword } = require('./shopify-storefront-password-binding');
const {
  collectObjectiveObservations,
  exerciseNavigationInteraction
} = require('../visual-evaluation/browser-observation');

const READINESS_VERSION = 'storefront-readiness-v1';

function safeUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (/token|password|key|secret|signature|authorization|session|cookie/i.test(key)) url.searchParams.set(key, '[redacted]');
    return redactSensitiveText(url.toString());
  } catch { return redactSensitiveText(value).slice(0, 1000); }
}

function safeMessage(value, maximum = 2000) {
  return redactSensitiveText(value).replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function isCriticalResource(url, resourceType, status = null) {
  if (/favicon\.ico|shopifycloud\/storefront-renderer\/assets\/favicon|shopifycloud\/storefront\/assets\/storefront\/origin_trials-|analytics|pixel|monorail/i.test(url)) return false;
  if (status === 404 && resourceType === 'other') return false;
  return ['document', 'stylesheet', 'script', 'font', 'image'].includes(resourceType);
}

function isFatalPageError(message) {
  const value = String(message || '');
  if (/service worker is disabled because the context is sandboxed and lacks the 'allow-same-origin' flag/i.test(value)) return false;
  return true;
}

function pngDimensions(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('Screenshot output is not a PNG image.');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function waitForLayoutStability(page, maximumSamples = 20) {
  let previous = null;
  let stableCount = 0;
  const samples = [];
  for (let index = 0; index < maximumSamples; index += 1) {
    const current = await page.evaluate(() => {
      const main = document.querySelector('#MainContent');
      const rect = main?.getBoundingClientRect();
      return {
        scroll_height: document.documentElement.scrollHeight,
        scroll_width: document.documentElement.scrollWidth,
        main_width: rect ? Math.round(rect.width) : null,
        main_height: rect ? Math.round(rect.height) : null
      };
    });
    samples.push(current);
    if (previous && JSON.stringify(previous) === JSON.stringify(current)) stableCount += 1;
    else stableCount = 0;
    if (stableCount >= 2) return { stable: true, samples: samples.slice(-3) };
    previous = current;
    await page.waitForTimeout(100);
  }
  return { stable: false, samples: samples.slice(-3) };
}

async function settlePage(page, route) {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => document.readyState === 'complete');
  const conditions = [{ id: 'document_complete', passed: true }];
  let landmarksReady = true;
  for (const selector of route.expected_landmarks) {
    try {
      await page.locator(selector).waitFor({ state: 'visible', timeout: 20000 });
      conditions.push({ id: `landmark:${selector}`, passed: true });
    } catch {
      landmarksReady = false;
      conditions.push({ id: `landmark:${selector}`, passed: false });
    }
  }
  const pageIdentity = await page.evaluate(() => ({
    title: document.title,
    pathname: window.location.pathname,
    body_excerpt: (document.body?.innerText || '').slice(0, 2000)
  }));
  const blockedPage = /password protected|enter store password|verify you are human|challenge|page not found|404/i.test(`${pageIdentity.title} ${pageIdentity.body_excerpt}`);
  conditions.push({ id: 'shopify_page_identity', passed: !blockedPage });
  const fontsReady = await page.evaluate(async () => {
    if (!document.fonts?.ready) return true;
    let timer;
    try {
      await Promise.race([document.fonts.ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('font timeout')), 15000); })]);
      return document.fonts.status === 'loaded';
    } catch { return false; } finally { clearTimeout(timer); }
  });
  conditions.push({ id: 'fonts_ready', passed: fontsReady });
  await page.addStyleTag({ content: '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
  const mediaState = await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    for (const media of document.querySelectorAll('video,audio')) { media.pause(); media.autoplay = false; }
    const height = document.documentElement.scrollHeight;
    const step = Math.max(window.innerHeight, 1);
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    window.scrollTo(0, 0);
    const images = [...document.images];
    for (const image of images) image.loading = 'eager';
    const settled = await Promise.all(images.map((image) => image.complete
      ? Promise.resolve(image.naturalWidth > 0)
      : new Promise((resolve) => {
        const finish = () => resolve(image.naturalWidth > 0);
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
        setTimeout(() => resolve(false), 15000);
      })));
    return { total: images.length, failed: settled.filter((loaded) => !loaded).length };
  });
  const imagesReady = mediaState.failed === 0;
  conditions.push({ id: 'images_ready', passed: imagesReady, total: mediaState.total, failed: mediaState.failed });
  const layout = await waitForLayoutStability(page);
  conditions.push({ id: 'layout_stable', passed: layout.stable, samples: layout.samples });
  const ready = landmarksReady && !blockedPage && fontsReady && imagesReady && layout.stable;
  return {
    page_identity: pageIdentity,
    readiness: {
      strategy_version: READINESS_VERSION,
      ready,
      document_complete: true,
      landmarks_ready: landmarksReady,
      fonts_ready: fontsReady,
      images_ready: imagesReady,
      layout_stable: layout.stable,
      reduced_motion: true,
      autoplay_normalized: true,
      lazy_content_exercised: true,
      conditions
    }
  };
}

async function observeArchitectureEvidence(page, expected) {
  if (!expected) throw new Error('Storefront capture requires registered architecture presenter evidence.');
  const assertions = [];
  for (const assertion of expected.assertions) {
    const matchedCount = await page.locator(assertion.selector).count();
    assertions.push({ ...assertion, matched_count: matchedCount, passed: matchedCount > 0 });
  }
  return {
    evidence_revision: expected.evidence_revision,
    profile_id: expected.profile_id,
    profile_version: expected.profile_version,
    selection_revision_id: expected.selection_revision_id,
    route_id: expected.route_id,
    template_identity: expected.template_identity,
    section_identities: [...expected.section_identities],
    rendered_section_identities: [...expected.rendered_section_identities],
    artifact_structure_verified: expected.artifact_structure_verified,
    selected_families: expected.selected_families.map((family) => ({ ...family, presenter_ids: [...family.presenter_ids] })),
    assertions,
    valid: expected.artifact_structure_verified === true && assertions.length > 0 && assertions.every((assertion) => assertion.passed)
  };
}

async function createPlaywrightCaptureDriver({ headless = true } = {}) {
  const { chromium } = require('playwright');
  const playwrightVersion = require('playwright/package.json').version;
  const browser = await chromium.launch({
    headless,
    env: withoutShopifyStorefrontPassword(process.env)
  });
  return {
    engine: 'chromium',
    automation: 'playwright',
    automation_version: playwrightVersion,
    browser_version: browser.version(),
    async capture({ runtime, route, viewport, screenshotPath, architectureBound, artifactBound, architectureEvidence, abortSignal = null }) {
      if (abortSignal?.aborted) throw Object.assign(new Error('Merchant storefront capture was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        screen: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.device_scale_factor,
        isMobile: viewport.is_mobile,
        hasTouch: viewport.has_touch,
        reducedMotion: 'reduce',
        colorScheme: 'light',
        locale: 'en-US',
        timezoneId: 'UTC',
        serviceWorkers: 'block'
      });
      const closeForAbort = () => { void context.close().catch(() => {}); };
      abortSignal?.addEventListener?.('abort', closeForAbort, { once: true });
      let page;
      try { page = await context.newPage(); }
      catch (error) {
        abortSignal?.removeEventListener?.('abort', closeForAbort);
        await context.close().catch(() => {});
        throw error;
      }
      const consoleErrors = [];
      const pageErrors = [];
      const failedResources = [];
      const httpFailures = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push({ message: safeMessage(message.text()), location: safeUrl(message.location()?.url || '') });
      });
      page.on('pageerror', (error) => pageErrors.push({ message: safeMessage(error.message) }));
      page.on('requestfailed', (request) => failedResources.push({
        url: safeUrl(request.url()), resource_type: request.resourceType(), failure: safeMessage(request.failure()?.errorText || 'request failed'), critical: isCriticalResource(request.url(), request.resourceType())
      }));
      page.on('response', (response) => {
        if (response.status() >= 400) {
          const request = response.request();
          httpFailures.push({ url: safeUrl(response.url()), status: response.status(), resource_type: request.resourceType(), critical: isCriticalResource(response.url(), request.resourceType(), response.status()) });
        }
      });
      const targetUrl = new URL(route.path, runtime.local_proxy_origin).toString();
      let response;
      try {
        if (abortSignal?.aborted) throw Object.assign(new Error('Merchant storefront capture was cancelled.'), { code: 'merchant_flow_job_cancelled', retryable: false });
        response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        const settled = await settlePage(page, route);
        const observedArchitecture = await observeArchitectureEvidence(page, architectureEvidence);
        const objectiveObservations = await collectObjectiveObservations(page, route, viewport);
        const viewportSize = page.viewportSize();
        const finalUrl = page.url();
        const finalLocation = new URL(finalUrl);
        const requestedLocation = new URL(targetUrl);
        const routeResolved = finalLocation.origin === requestedLocation.origin
          && finalLocation.pathname.replace(/\/$/, '') === requestedLocation.pathname.replace(/\/$/, '');
        const criticalFailures = [...failedResources, ...httpFailures].filter((item) => item.critical);
        const fatalPageErrors = pageErrors.filter((item) => isFatalPageError(item.message));
        const checks = [
          { id: 'page_loaded', passed: Boolean(response && response.status() >= 200 && response.status() < 400), actual: response?.status() || null },
          { id: 'requested_route_resolved', passed: routeResolved, actual: safeUrl(finalUrl) },
          { id: 'expected_landmarks_exist', passed: settled.readiness.landmarks_ready },
          { id: 'no_fatal_page_error', passed: fatalPageErrors.length === 0, actual: fatalPageErrors.length },
          { id: 'no_critical_asset_failure', passed: criticalFailures.length === 0, actual: criticalFailures.length },
          { id: 'viewport_dimensions_correct', passed: viewportSize?.width === viewport.width && viewportSize?.height === viewport.height, actual: viewportSize },
          { id: 'architecture_provenance_present', passed: architectureBound === true },
          { id: 'registered_presenters_rendered', passed: observedArchitecture.valid, actual: observedArchitecture.assertions.map((assertion) => ({ presenter_id: assertion.presenter_id, matched_count: assertion.matched_count })) },
          { id: 'generated_artifact_binding_verified', passed: artifactBound === true },
          { id: 'deterministic_readiness_complete', passed: settled.readiness.ready }
        ];
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: true, animations: 'disabled', caret: 'hide', scale: 'css' });
        const dimensions = pngDimensions(screenshotPath);
        objectiveObservations.navigation_interaction = await exerciseNavigationInteraction(page, viewport);
        checks.push({ id: 'screenshot_generated', passed: fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 0, actual: dimensions });
        checks.push({ id: 'screenshot_dimensions_correct', passed: dimensions.width >= viewport.width && dimensions.height >= viewport.height, actual: dimensions });
        const valid = checks.every((check) => check.passed === true);
        return {
          status: valid ? 'passed' : 'failed',
          final_url: safeUrl(finalUrl),
          screenshot: {
            sha256: sha256File(screenshotPath), bytes: fs.statSync(screenshotPath).size,
            width: dimensions.width, height: dimensions.height, full_page: true
          },
          readiness: settled.readiness,
          architecture_evidence: observedArchitecture,
          objective_observations: objectiveObservations,
          browser_observations: {
            http_status: response?.status() || null,
            console_errors: consoleErrors,
            page_errors: pageErrors,
            failed_resources: failedResources,
            http_failures: httpFailures
          },
          deterministic_validation: { valid, checks },
          error: valid ? null : { code: 'deterministic_render_gate_failed', message: 'The storefront rendered, but one or more deterministic capture checks failed.' }
        };
      } finally {
        abortSignal?.removeEventListener?.('abort', closeForAbort);
        await context.close().catch(() => {});
      }
    },
    async close() { await browser.close(); }
  };
}

module.exports = {
  READINESS_VERSION,
  safeUrl,
  safeMessage,
  isCriticalResource,
  isFatalPageError,
  pngDimensions,
  waitForLayoutStability,
  settlePage,
  observeArchitectureEvidence,
  createPlaywrightCaptureDriver
};
