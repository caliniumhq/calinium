#!/usr/bin/env node

/*
 * Focused contract checks for the canonical, dependency-free Calinium header.
 * Browser/device interaction is covered by the documented manual matrix because
 * Shopify menu, localization, and customer-account objects are remote data.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('./lib/repository-paths');

const root = path.resolve(__dirname, '..');
const paths = repositoryPaths(root);
const errors = [];

function read(relative) {
  return fs.readFileSync(path.join(paths.themeRoot, relative), 'utf8');
}

function fail(message) {
  errors.push(message);
}

function schemaFromSection(relative) {
  const source = read(relative);
  const match = source.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) throw new Error(`${relative} has no schema.`);
  return { source, schema: JSON.parse(match[1]) };
}

function settingMap(schema) {
  return new Map((schema.settings || []).filter((setting) => setting.id).map((setting) => [setting.id, setting]));
}

function localeValue(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value && value[key], object);
}

function assertAsset(source, asset) {
  if (!source.includes(`'${asset}' | asset_url`)) fail(`Header source does not reference ${asset}.`);
  if (!fs.existsSync(path.join(paths.themeRoot, 'assets', asset))) fail(`Missing header asset ${asset}.`);
}

const schemaLocale = JSON.parse(read('locales/en.default.schema.json'));
const storefrontLocale = JSON.parse(read('locales/en.default.json'));
const header = schemaFromSection('sections/header.liquid');
const announcement = schemaFromSection('sections/announcement-bar.liquid');
const headerSettings = settingMap(header.schema);
const announcementSettings = settingMap(announcement.schema);

for (const id of ['menu', 'sticky_header', 'color_scheme']) {
  if (!headerSettings.has(id)) fail(`Stable header setting ${id} is missing.`);
}

for (const id of [
  'mobile_menu', 'desktop_navigation_activation', 'logo', 'transparent_logo', 'desktop_logo_width', 'mobile_logo_width',
  'layout', 'width', 'desktop_height', 'mobile_height', 'horizontal_padding', 'show_border', 'hide_on_scroll',
  'transparent_homepage', 'transparent_text_treatment', 'show_search', 'enable_predictive_search', 'show_account',
  'show_cart', 'show_localization'
]) {
  if (!headerSettings.has(id)) fail(`Premium header setting ${id} is missing.`);
}

for (const contract of ['co-header__mobile-utilities', 'MobileHeaderLocalizationForm-', 'co-header__account-action']) {
  if (!header.source.includes(contract)) fail(`Mobile header composition is missing ${contract}.`);
}

if (headerSettings.get('layout')?.default !== 'centered') fail('Centered logo must remain the default desktop layout.');
if (headerSettings.get('desktop_navigation_activation')?.default !== 'hover') fail('Desktop navigation must default to hover activation.');
if (headerSettings.get('enable_predictive_search')?.default !== true) fail('Predictive search must be enabled by default.');
if (headerSettings.get('show_cart')?.default !== true) fail('Cart must be visible by default.');

for (const id of ['show', 'text', 'link', 'color_scheme']) {
  if (!announcementSettings.has(id)) fail(`Stable announcement setting ${id} is missing.`);
}
if (!announcement.schema.blocks?.some((block) => block.type === 'announcement')) fail('Announcement blocks are missing.');
if (announcementSettings.get('enable_rotation')?.default !== false) fail('Announcement rotation must remain opt-in.');

if (!announcement.source.includes('data-announcement-alignment="{{ section.settings.alignment }}"')) {
  fail('Announcement alignment must be emitted as an explicit runtime attribute.');
}

const announcementCss = read('assets/section-announcement-bar.css');
for (const alignment of ['center', 'left', 'right']) {
  if (!announcementCss.includes(`data-announcement-alignment='${alignment}'`)) {
    fail(`Announcement ${alignment} alignment selector is missing.`);
  }
}
if (!announcementCss.includes('max-inline-size: none')) {
  fail('Announcement messages must override the global paragraph width constraint.');
}

if (!header.source.includes("if section.settings.sticky_header") || !header.source.includes("' co-header--sticky'")) {
  fail('Sticky-enabled header markup is missing.');
}
if (!header.source.includes('data-sticky-header="{{ section.settings.sticky_header }}"')) {
  fail('Sticky-disabled header markup must remain distinguishable at runtime.');
}

for (const translation of new Set([...header.source.matchAll(/t:([a-z0-9_.]+)/g)].map((match) => match[1]))) {
  if (!localeValue(schemaLocale, translation)) fail(`Missing schema translation ${translation}.`);
}
for (const translation of ['header.expand_menu', 'header.search', 'header.account', 'header.cart_count', 'localization.update']) {
  if (!localeValue(storefrontLocale, translation)) fail(`Missing storefront translation ${translation}.`);
}

for (const asset of ['section-header.css', 'header.js', 'predictive-search.css', 'predictive-search.js', 'section-announcement-bar.css', 'announcement-bar.js']) {
  if (!fs.existsSync(path.join(paths.themeRoot, 'assets', asset))) fail(`Missing required asset ${asset}.`);
}
assertAsset(header.source, 'section-header.css');
assertAsset(header.source, 'header.js');
assertAsset(announcement.source, 'section-announcement-bar.css');

const headerJs = read('assets/header.js');
for (const contract of ['shopify:section:load', 'shopify:section:unload', 'shopify:section:select', 'shopify:section:deselect', "event.key === 'Escape'", "event.key !== 'Tab'", 'co-header-scroll-locked', 'data-header-solid', 'headerHidden', 'co-section-header--sticky', '__caliniumHeaderRuntimeV1', 'headerRuntimeInitialized', 'lifecycleBound']) {
  if (!headerJs.includes(contract)) fail(`Header enhancement is missing ${contract}.`);
}

const headerCss = read('assets/section-header.css');
for (const contract of ['.co-section-header:has(> .co-header--sticky)', '.co-section-header.co-section-header--sticky', '.co-header--transparent[data-header-solid=\'true\']']) {
  if (!headerCss.includes(contract)) fail(`Header sticky/transparent contract is missing ${contract}.`);
}

const announcementJs = read('assets/announcement-bar.js');
for (const contract of ['visibilitychange', 'mouseenter', 'focusin', 'prefers-reduced-motion']) {
  if (!announcementJs.includes(contract)) fail(`Announcement enhancement is missing ${contract}.`);
}

const cartIntegration = read('assets/global.js');
if (!cartIntegration.includes('data-header-cart-count-value')) fail('Cart updates do not refresh the visible header count.');
if (/https?:\/\//.test(`${headerJs}\n${announcementJs}\n${headerCss}`)) fail('Header runtime must not include external library URLs.');
if (!headerCss.includes('max-width: 47.99rem')) fail('Mobile utility controls are not explicitly constrained below the desktop breakpoint.');

if (errors.length) {
  process.stderr.write(`Premium header contract test failed:\n${errors.map((error) => `- ${error}`).join('\n')}\n`);
  process.exit(1);
}

process.stdout.write('Premium header contract test passed: settings, translations, progressive enhancement, lifecycle, and native integrations are present.\n');
