#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const [baseUrl, outputDirectory, label = 'after'] = process.argv.slice(2);
if (!baseUrl || !outputDirectory) {
  throw new Error('Usage: capture-embedded-app-visual-alignment.js <base-url> <output-directory> [label]');
}

const views = [
  { id: 'review', title: 'F1 Review' },
  { id: 'resources', title: 'Advanced Store Resources' }
];
const viewports = [
  { id: 'desktop', width: 1440, height: 1000 },
  { id: 'mobile', width: 390, height: 844 }
];

await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const view of views) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport });
      const url = new URL('/tests/visual/embedded-app-alignment.html', baseUrl);
      url.searchParams.set('view', view.id);
      await page.goto(url.href, { waitUntil: 'networkidle' });
      await page.locator('main').waitFor();
      if (view.id === 'resources') await page.locator('.shopify-resource-review').waitFor();

      const screenshotPath = path.join(outputDirectory, `${label}-${view.id}-${viewport.id}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      const checks = await page.evaluate(() => {
        const visible = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const interactive = [...document.querySelectorAll('button, a[href], input, select, textarea')].filter(visible);
        const unnamed = interactive.filter((element) => !(element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('title')));
        const shortTargets = interactive.filter((element) => element.getBoundingClientRect().height < 40);
        const offscreenTargets = interactive.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.left < 0 || rect.right > document.documentElement.clientWidth;
        });
        const currentStage = document.querySelector('.cd-progress [aria-current="step"]');
        const currentStageRect = currentStage?.getBoundingClientRect() || null;
        const first = interactive[0] || null;
        first?.focus();
        const focus = first ? getComputedStyle(first) : null;
        return {
          documentClientWidth: document.documentElement.clientWidth,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyClientWidth: document.body.clientWidth,
          bodyScrollWidth: document.body.scrollWidth,
          pageHorizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          interactiveCount: interactive.length,
          unnamedInteractiveCount: unnamed.length,
          sub40pxInteractiveCount: shortTargets.length,
          offscreenInteractiveCount: offscreenTargets.length,
          minimumInteractiveHeight: interactive.length ? Math.min(...interactive.map((element) => element.getBoundingClientRect().height)) : null,
          focusedOutlineWidth: focus?.outlineWidth || null,
          focusedOutlineStyle: focus?.outlineStyle || null,
          f1StageCount: document.querySelectorAll('.analysis-first-stages__item').length,
          advancedStageCount: document.querySelectorAll('.cd-progress li').length,
          currentAdvancedStageOffscreen: currentStageRect ? currentStageRect.left < 0 || currentStageRect.right > document.documentElement.clientWidth : null
        };
      });
      results.push({ label, view: view.id, title: view.title, viewport, screenshotPath, checks });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await fs.writeFile(path.join(outputDirectory, `${label}-results.json`), `${JSON.stringify({ label, results }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ label, results }, null, 2)}\n`);
