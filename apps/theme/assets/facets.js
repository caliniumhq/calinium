/**
 * Progressively submits native collection filter controls.
 * The same GET form remains the complete no-JavaScript baseline.
 */
class FacetsForm {
  constructor(form) {
    this.form = form;
    this.handleChange = this.handleChange.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    this.form.addEventListener('change', this.handleChange);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
  }

  handleChange(event) {
    const control = event.target;

    if (!(control instanceof HTMLElement)) {
      return;
    }

    if (!control.matches('[data-facet-control], [data-sort-select]')) {
      return;
    }

    this.form.requestSubmit();
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.form)) {
      this.destroy();
    }
  }

  destroy() {
    this.form.removeEventListener('change', this.handleChange);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedFacetsForms = new WeakSet();

function initializeFacetsForm(form) {
  if (!(form instanceof HTMLFormElement) || initializedFacetsForms.has(form)) {
    return;
  }

  const facetsForm = new FacetsForm(form);
  facetsForm.init();
  initializedFacetsForms.add(form);
}

function initializeFacetsForms(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-facets-form]')) {
    initializeFacetsForm(root);
  }

  root.querySelectorAll('[data-facets-form]').forEach(initializeFacetsForm);
}

initializeFacetsForms();

document.addEventListener('shopify:section:load', (event) => {
  initializeFacetsForms(event.target);
});
