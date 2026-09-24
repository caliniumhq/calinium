'use strict';

const fs = require('fs');
const path = require('path');
const { repositoryPaths } = require('../../scripts/lib/repository-paths');

function readJson(root, file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

function toMap(items, key = 'id') {
  return new Map((items || []).map((item) => [item[key], item]));
}

function loadKnowledgeBase(root) {
  const paths = repositoryPaths(root);
  const files = {
    designLanguages: 'config/design-language.json',
    industries: 'config/industry-profiles.json',
    recipes: 'config/layout-recipes.json',
    typography: 'config/typography-profiles.json',
    spacing: 'config/spacing-profiles.json',
    colors: 'config/color-strategies.json',
    images: 'config/image-styles.json',
    animation: 'config/animation-profiles.json',
    conversion: 'config/conversion-strategies.json',
    personalities: 'config/brand-personality.json',
    blueprints: 'config/page-blueprints.json',
    rules: 'config/design-rules.json',
    compatibility: 'config/compatibility-matrix.json',
    sectionManifest: 'config/calinium-section-manifest.json',
    settingMetadata: 'config/calinium-setting-metadata.json',
    blockTaxonomy: 'config/calinium-block-taxonomy.json'
  };
  const raw = Object.fromEntries(Object.entries(files).map(([name, file]) => [name, readJson(root, file)]));
  const installedSections = new Set(fs.readdirSync(path.join(paths.themeRoot, 'sections'))
    .filter((file) => file.endsWith('.liquid'))
    .map((file) => path.basename(file, '.liquid')));

  return {
    raw,
    installedSections,
    index: {
      designLanguages: toMap(raw.designLanguages.items),
      industries: toMap(raw.industries.items),
      recipes: toMap(raw.recipes.items),
      typography: toMap(raw.typography.items),
      spacing: toMap(raw.spacing.items),
      colors: toMap(raw.colors.items),
      images: toMap(raw.images.items),
      animation: toMap(raw.animation.items),
      conversion: toMap(raw.conversion.items),
      personalities: toMap(raw.personalities.items),
      blueprints: toMap(raw.blueprints.items),
      compatibility: toMap(raw.compatibility.entries, 'section_id'),
      sectionManifest: toMap(raw.sectionManifest.sections),
      settingMetadata: toMap(raw.settingMetadata.sections, 'section_id'),
      blockTaxonomy: toMap(raw.blockTaxonomy.blocks)
    }
  };
}

module.exports = { loadKnowledgeBase };
