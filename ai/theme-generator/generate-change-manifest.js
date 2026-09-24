'use strict';

function changeManifest({ homepage, pages, settingsChanges }) {
  const pageChanges = [{ instances: homepage.instances, template: 'theme/templates/index.json' }, ...pages.map((page) => ({ instances: page.instances, template: page.target.output }))].map((page) => ({
    template: page.template,
    added_sections: page.instances.filter((item) => item.origin === 'generated').length,
    preserved_sections: page.instances.filter((item) => item.origin === 'preserved').length,
    removed_sections: 0,
    modified_sections: 0,
    section_ids: page.instances.map((item) => item.instance_id)
  }));
  return {
    version: 1,
    homepage: pageChanges[0],
    pages: pageChanges.slice(1),
    settings: { changed: settingsChanges.length, preserved: true, setting_ids: settingsChanges.map((item) => item.setting_id) },
    safety: { source_theme_modified: false, removed_sections: 0, modified_merchant_sections: 0 }
  };
}

module.exports = { changeManifest };
