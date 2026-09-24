/**
 * Enhances the normal search form with Shopify-rendered predictive results.
 * No request is made until a customer enters a meaningful query.
 */
const minimumQueryLength = 2;
const debounceDelay = 250;

class PredictiveSearch {
  constructor(root) {
    this.root = root;
    this.input = root.querySelector('[data-predictive-search-input]');
    this.results = root.querySelector('[data-predictive-search-results]');
    this.endpoint = root.dataset.predictiveSearchUrl;
    this.sectionId = root.dataset.predictiveSearchSectionId;
    this.loadingMessage = root.dataset.loadingMessage;
    this.errorMessage = root.dataset.errorMessage;
    this.abortController = null;
    this.debounceTimer = null;
    this.requestNumber = 0;
    this.isOpen = false;

    this.handleInput = this.handleInput.bind(this);
    this.handleInputKeydown = this.handleInputKeydown.bind(this);
    this.handleResultsKeydown = this.handleResultsKeydown.bind(this);
    this.handleDocumentPointerdown = this.handleDocumentPointerdown.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (!this.input || !this.results || !this.endpoint || !this.sectionId || !window.fetch) {
      return false;
    }

    this.input.addEventListener('input', this.handleInput);
    this.input.addEventListener('keydown', this.handleInputKeydown);
    this.results.addEventListener('keydown', this.handleResultsKeydown);
    document.addEventListener('pointerdown', this.handleDocumentPointerdown);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);

    return true;
  }

  handleInput() {
    const query = this.input.value.trim();

    window.clearTimeout(this.debounceTimer);

    if (query.length < minimumQueryLength) {
      this.cancelRequest();
      this.close();
      return;
    }

    this.debounceTimer = window.setTimeout(() => {
      this.getResults(query);
    }, debounceDelay);
  }

  async getResults(query) {
    this.cancelRequest();
    this.abortController = new AbortController();
    const activeRequest = ++this.requestNumber;

    this.announce(this.loadingMessage);

    try {
      const endpoint = new URL(this.endpoint, window.location.origin);
      endpoint.searchParams.set('q', query);
      endpoint.searchParams.set('resources[type]', 'product,article,page');
      endpoint.searchParams.set('resources[limit]', '6');
      endpoint.searchParams.set('resources[options][unavailable_products]', 'last');
      endpoint.searchParams.set('section_id', this.sectionId);

      const response = await fetch(endpoint.toString(), {
        headers: {
          Accept: 'text/html'
        },
        signal: this.abortController.signal
      });

      if (!response.ok) {
        throw new Error(`Predictive search request failed with ${response.status}`);
      }

      const responseText = await response.text();

      if (activeRequest !== this.requestNumber) {
        return;
      }

      this.renderResults(responseText);
    } catch (error) {
      if (error.name === 'AbortError' || activeRequest !== this.requestNumber) {
        return;
      }

      this.close();
      this.announce(this.errorMessage);
    }
  }

  renderResults(responseText) {
    const documentFragment = new DOMParser().parseFromString(responseText, 'text/html');
    const response = documentFragment.querySelector('[data-predictive-search-response]');

    if (!response) {
      throw new Error('Predictive search response did not contain results.');
    }

    this.results.innerHTML = response.outerHTML;
    this.results.hidden = false;
    this.input.setAttribute('aria-expanded', 'true');
    this.isOpen = true;

    const count = this.results.querySelector('[data-predictive-search-count]');
    this.announce(count?.textContent?.trim() || this.errorMessage);
  }

  handleInputKeydown(event) {
    if (event.key === 'ArrowDown') {
      const links = this.getResultLinks();

      if (this.isOpen && links.length > 0) {
        event.preventDefault();
        links[0].focus();
      }
    }

    if (event.key === 'Escape') {
      this.close({ focusInput: true });
    }
  }

  handleResultsKeydown(event) {
    const link = event.target.closest('.co-predictive-search__item a[href]');

    if (!(link instanceof HTMLAnchorElement)) {
      if (event.key === 'Escape') {
        this.close({ focusInput: true });
      }

      return;
    }

    const links = this.getResultLinks();
    const currentIndex = links.indexOf(link);

    if (event.key === 'ArrowDown' && currentIndex < links.length - 1) {
      event.preventDefault();
      links[currentIndex + 1].focus();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (currentIndex > 0) {
        links[currentIndex - 1].focus();
      } else {
        this.input.focus();
      }
    }

    if (event.key === 'Home' && links.length > 0) {
      event.preventDefault();
      links[0].focus();
    }

    if (event.key === 'End' && links.length > 0) {
      event.preventDefault();
      links[links.length - 1].focus();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close({ focusInput: true });
    }
  }

  handleDocumentPointerdown(event) {
    if (this.isOpen && !this.root.contains(event.target)) {
      this.close();
    }
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) {
      this.destroy();
    }
  }

  getResultLinks() {
    return [...this.results.querySelectorAll('.co-predictive-search__item a[href]')];
  }

  cancelRequest() {
    this.requestNumber += 1;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  close({ focusInput = false } = {}) {
    window.clearTimeout(this.debounceTimer);
    this.cancelRequest();
    this.results.hidden = true;
    this.results.replaceChildren();
    this.input.setAttribute('aria-expanded', 'false');
    this.isOpen = false;

    if (focusInput) {
      this.input.focus();
    }
  }

  announce(message) {
    if (!message) {
      return;
    }

    document.dispatchEvent(
      new CustomEvent('calinium:announce', {
        detail: { message }
      })
    );
  }

  destroy() {
    this.cancelRequest();
    window.clearTimeout(this.debounceTimer);
    this.input.removeEventListener('input', this.handleInput);
    this.input.removeEventListener('keydown', this.handleInputKeydown);
    this.results.removeEventListener('keydown', this.handleResultsKeydown);
    document.removeEventListener('pointerdown', this.handleDocumentPointerdown);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedPredictiveSearches = new WeakSet();

function initializePredictiveSearch(root) {
  if (!(root instanceof HTMLElement) || initializedPredictiveSearches.has(root)) {
    return;
  }

  const predictiveSearch = new PredictiveSearch(root);

  if (predictiveSearch.init()) {
    initializedPredictiveSearches.add(root);
  }
}

function initializePredictiveSearches(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-predictive-search]')) {
    initializePredictiveSearch(root);
  }

  root.querySelectorAll('[data-predictive-search]').forEach(initializePredictiveSearch);
}

initializePredictiveSearches();

document.addEventListener('shopify:section:load', (event) => {
  initializePredictiveSearches(event.target);
});
