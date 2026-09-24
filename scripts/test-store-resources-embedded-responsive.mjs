#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dashboardRoot = path.join(root, 'apps/dashboard');
const dashboardRequire = createRequire(path.join(dashboardRoot, 'package.json'));
const { createServer } = await import(pathToFileURL(dashboardRequire.resolve('vite')).href);
const outputRoot = path.join(root, 'output/store-resources-embedded-responsive');
const viewports = [
  { name: 'desktop-embedded-1200', width: 1200, height: 1000 },
  { name: 'tablet-820', width: 820, height: 1000 },
  { name: 'mobile-390', width: 390, height: 844 }
];

await fs.mkdir(outputRoot, { recursive: true });
const server = await createServer({
  root: dashboardRoot,
  configFile: path.join(dashboardRoot, 'vite.config.js'),
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 0 }
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
    const url = new URL('/tests/visual/embedded-app-alignment.html?view=resources', baseUrl);
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.getByText('unbroken-resource-identifier-0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789').waitFor();
    const geometry = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const cards = [...document.querySelectorAll('.shopify-resource-review__group li')].map((card) => {
        const content = card.firstElementChild;
        const actions = card.querySelector('.shopify-resource-review__actions');
        const title = card.querySelector('strong');
        const grid = card.closest('ul');
        return {
          card: rect(card), grid: rect(grid), content: rect(content), actions: rect(actions),
          title: rect(title), titleClientWidth: title.clientWidth, titleScrollWidth: title.scrollWidth,
          buttons: [...actions.querySelectorAll('button')].map(rect)
        };
      });
      const connectionActions = [...document.querySelectorAll('.shopify-connection__actions button')].map(rect);
      const details = document.querySelector('.shopify-connection__technical');
      const stage = document.querySelector('.cd-progress [aria-current="step"]');
      const checkbox = document.querySelector('.resources-screen .resource-picker__empty input[type="checkbox"]');
      const checkboxLabel = checkbox?.labels?.[0];
      const controls = [...document.querySelectorAll('.resources-screen button, .resources-screen select, .resources-screen input')].map((control) => ({
        name: control.getAttribute('aria-label') || control.labels?.[0]?.textContent?.trim() || control.textContent?.trim() || control.getAttribute('title') || '',
        height: (control.type === 'checkbox' ? control.labels?.[0] : control).getBoundingClientRect().height
      }));
      return {
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyClientWidth: document.body.clientWidth,
        bodyScrollWidth: document.body.scrollWidth,
        stageCount: document.querySelectorAll('.cd-progress li').length,
        currentStage: stage?.textContent?.trim(),
        cardCount: cards.length,
        cards,
        connectionActions,
        controls,
        checkbox: checkbox && checkboxLabel ? {
          visual: rect(checkbox), target: rect(checkboxLabel),
          labelAssociation: checkbox.labels.length === 1 && checkboxLabel.contains(checkbox),
          nestedInteractiveCount: checkboxLabel.querySelectorAll('button, a, select').length,
          checked: checkbox.checked
        } : null,
        detailsWidth: rect(details).width
      };
    });

    assert.equal(geometry.documentClientWidth, viewport.width, `${viewport.name}: viewport width`);
    assert.ok(geometry.documentScrollWidth <= geometry.documentClientWidth, `${viewport.name}: document overflow`);
    assert.ok(geometry.bodyScrollWidth <= geometry.bodyClientWidth, `${viewport.name}: body overflow`);
    assert.equal(geometry.stageCount, 9, `${viewport.name}: Advanced stages`);
    assert.match(geometry.currentStage, /Store Resources/, `${viewport.name}: current stage`);
    assert.equal(geometry.cardCount, 5, `${viewport.name}: representative resource cards`);
    assert.ok(geometry.controls.length >= 10, `${viewport.name}: resource controls present`);
    assert.ok(geometry.controls.every((control) => control.name && control.height >= 40), `${viewport.name}: accessible names and target heights`);
    assert.ok(geometry.checkbox?.labelAssociation, `${viewport.name}: native label association`);
    assert.equal(geometry.checkbox.nestedInteractiveCount, 0, `${viewport.name}: no conflicting label control`);
    assert.equal(geometry.checkbox.checked, false, `${viewport.name}: initial checkbox state`);
    assert.ok(geometry.checkbox.target.height >= 40 && geometry.checkbox.target.width >= 40, `${viewport.name}: clickable checkbox target`);
    assert.ok(geometry.checkbox.visual.height < 40 && geometry.checkbox.visual.width < 40, `${viewport.name}: native visual checkbox stays compact`);
    for (const [index, card] of geometry.cards.entries()) {
      assert.ok(card.card.left >= card.grid.left - 1 && card.card.right <= card.grid.right + 1, `${viewport.name}: card ${index} contained`);
      assert.ok(card.content.bottom <= card.actions.top + 1, `${viewport.name}: card ${index} text/actions separated`);
      assert.ok(card.title.right <= card.card.right + 1 && card.titleScrollWidth <= card.titleClientWidth + 1, `${viewport.name}: card ${index} title wrapped`);
      for (const button of card.buttons) {
        assert.ok(button.height >= 40, `${viewport.name}: card ${index} target height`);
        assert.ok(button.left >= card.card.left - 1 && button.right <= card.card.right + 1, `${viewport.name}: card ${index} action contained`);
      }
    }
    for (const button of geometry.connectionActions) {
      assert.ok(button.height >= 40, `${viewport.name}: connection target height`);
      assert.ok(button.left >= -1 && button.right <= viewport.width + 1, `${viewport.name}: connection action contained`);
    }

    const screenshot = path.join(outputRoot, `${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    const checkbox = page.getByRole('checkbox', { name: 'Keep this optional item empty' });
    const label = page.locator('.resources-screen .resource-picker__empty').first();
    await label.click();
    assert.equal(await checkbox.isChecked(), true, `${viewport.name}: label click checks native checkbox`);
    await label.click();
    assert.equal(await checkbox.isChecked(), false, `${viewport.name}: label click unchecks native checkbox`);
    await checkbox.focus();
    await page.keyboard.press('Space');
    assert.equal(await checkbox.isChecked(), true, `${viewport.name}: Space checks focused checkbox`);
    const focus = await checkbox.evaluate((input) => ({
      visible: input.matches(':focus-visible'),
      outlineWidth: getComputedStyle(input).outlineWidth,
      outlineStyle: getComputedStyle(input).outlineStyle
    }));
    assert.ok(focus.visible && focus.outlineStyle !== 'none' && parseFloat(focus.outlineWidth) >= 3, `${viewport.name}: visible keyboard focus`);
    await page.keyboard.press('Space');
    assert.equal(await checkbox.isChecked(), false, `${viewport.name}: Space unchecks focused checkbox`);

    await page.locator('.shopify-connection__technical summary').click();
    const expanded = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      detailsClientWidth: document.querySelector('.shopify-connection__technical').clientWidth,
      detailsScrollWidth: document.querySelector('.shopify-connection__technical').scrollWidth
    }));
    assert.ok(expanded.scrollWidth <= expanded.clientWidth, `${viewport.name}: expanded technical details page overflow`);
    assert.ok(expanded.detailsScrollWidth <= expanded.detailsClientWidth, `${viewport.name}: expanded technical details contained`);

    results.push({ viewport, documentClientWidth: geometry.documentClientWidth, documentScrollWidth: geometry.documentScrollWidth, bodyClientWidth: geometry.bodyClientWidth, bodyScrollWidth: geometry.bodyScrollWidth, cardCount: geometry.cardCount, connectionActionCount: geometry.connectionActions.length, checkbox: geometry.checkbox, focus, technicalDetails: expanded, screenshot });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

await fs.writeFile(path.join(outputRoot, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
