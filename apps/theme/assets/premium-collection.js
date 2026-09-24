/*
 * Progressive enhancements for the canonical Calinium collection system.
 * Shopify's server-rendered GET form and pagination stay authoritative: this
 * controller only improves the experience when the browser supports it.
 */
const controllers = new WeakMap();
const lifecycleKey = '__caliniumPremiumCollectionLifecycleV1';

class PremiumCollectionController {
  constructor(root) {
    this.root = root;
    this.form = root.querySelector('[data-facets-form]');
    this.filterPanel = root.querySelector('[data-collection-filter-panel]');
    this.filterPanelHome = this.filterPanel?.parentElement || null;
    this.filterDialog = root.querySelector('[data-collection-filter-dialog]');
    this.filterDialogContent = root.querySelector('[data-collection-filter-dialog-content]');
    this.openFilters = root.querySelector('[data-collection-open-filters]');
    this.closeFilters = root.querySelector('[data-collection-close-filters]');
    this.pagination = root.querySelector('[data-collection-pagination]');
    this.grid = root.querySelector('[data-collection-grid]');
    this.status = root.querySelector('[data-collection-status]');
    this.mode = root.dataset.collectionPaginationMode || 'pagination';
    this.mobileDrawer = root.dataset.collectionMobileDrawer === 'true';
    this.labels = {
      loadMore: root.dataset.collectionLoadMoreLabel || 'Load more products',
      loading: root.dataset.collectionLoadingMessage || 'Loading more products.',
      loaded: root.dataset.collectionLoadedMessage || '[count] more products loaded.',
      error: root.dataset.collectionLoadMoreError || 'More products could not be loaded. Use the pagination links to continue browsing.'
    };
    this.requestInFlight = false;
    this.loadMoreButton = null;
    this.sentinel = null;
    this.observer = null;
    this.lastFocusedElement = null;
    this.handleOpenFilters = this.handleOpenFilters.bind(this);
    this.handleCloseFilters = this.handleCloseFilters.bind(this);
    this.handleDialogCancel = this.handleDialogCancel.bind(this);
    this.handleLoadMore = this.handleLoadMore.bind(this);
    this.handleResize = this.handleResize.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    this.root.dataset.collectionEnhanced = 'true';
    this.openFilters?.addEventListener('click', this.handleOpenFilters);
    this.closeFilters?.addEventListener('click', this.handleCloseFilters);
    this.filterDialog?.addEventListener('cancel', this.handleDialogCancel);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
    this.syncFilterDrawer();
    this.initializePagination();
    return true;
  }

  isMobile() {
    return window.matchMedia('(max-width: 47.99rem)').matches;
  }

  syncFilterDrawer() {
    if (!this.filterPanel || !this.filterDialogContent || !this.filterPanelHome) return;
    const useDrawer = this.mobileDrawer && this.isMobile() && typeof this.filterDialog?.showModal === 'function';
    if (useDrawer) {
      this.filterDialogContent.append(this.filterPanel);
      this.openFilters && (this.openFilters.hidden = false);
      return;
    }
    if (this.filterDialog?.open) this.closeDrawer();
    this.filterPanelHome.prepend(this.filterPanel);
    if (this.openFilters) this.openFilters.hidden = true;
  }

  handleOpenFilters() {
    if (!this.filterDialog || !this.mobileDrawer || !this.isMobile()) return;
    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (typeof this.filterDialog.showModal === 'function') this.filterDialog.showModal();
    else this.filterDialog.setAttribute('open', '');
    this.closeFilters?.focus();
  }

  closeDrawer() {
    if (!this.filterDialog) return;
    if (typeof this.filterDialog.close === 'function' && this.filterDialog.open) this.filterDialog.close();
    else this.filterDialog.removeAttribute('open');
    this.lastFocusedElement?.focus();
    this.lastFocusedElement = null;
  }

  handleCloseFilters() {
    this.closeDrawer();
  }

  handleDialogCancel(event) {
    event.preventDefault();
    this.closeDrawer();
  }

  initializePagination() {
    if (!this.pagination || !this.grid || !['load_more', 'infinite'].includes(this.mode)) return;
    const next = this.nextUrl();
    if (!next) return;
    this.loadMoreButton = document.createElement('button');
    this.loadMoreButton.type = 'button';
    this.loadMoreButton.className = 'co-button co-button--secondary co-main-collection__load-more';
    this.loadMoreButton.textContent = this.labels.loadMore;
    this.loadMoreButton.addEventListener('click', this.handleLoadMore);
    this.pagination.append(this.loadMoreButton);
    this.pagination.dataset.progressivePagination = this.mode;
    if (this.mode === 'infinite' && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.sentinel = document.createElement('span');
      this.sentinel.className = 'co-main-collection__pagination-sentinel';
      this.sentinel.setAttribute('aria-hidden', 'true');
      this.pagination.append(this.sentinel);
      this.observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.loadNextPage();
      }, { rootMargin: '320px 0px' });
      this.observer.observe(this.sentinel);
    }
  }

  nextUrl() {
    return this.pagination?.querySelector('.co-pagination__item--next a')?.href || null;
  }

  setStatus(message) {
    if (this.status) this.status.textContent = message;
  }

  async handleLoadMore() {
    await this.loadNextPage();
  }

  async loadNextPage() {
    const nextUrl = this.nextUrl();
    if (!nextUrl || this.requestInFlight) return;
    this.requestInFlight = true;
    this.loadMoreButton && (this.loadMoreButton.disabled = true);
    this.setStatus(this.labels.loading);
    try {
      const response = await fetch(nextUrl, { headers: { Accept: 'text/html' }, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`Collection page request failed with ${response.status}.`);
      const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextSection = documentFragment.querySelector('[data-main-collection]');
      const nextGrid = nextSection?.querySelector('[data-collection-grid]');
      const nextPagination = nextSection?.querySelector('[data-collection-pagination]');
      if (!nextGrid || !nextPagination) throw new Error('The next collection page did not contain a compatible product grid.');
      const items = [...nextGrid.children];
      this.grid.append(...items);
      this.pagination.replaceWith(nextPagination);
      this.pagination = nextPagination;
      this.loadMoreButton?.removeEventListener('click', this.handleLoadMore);
      this.loadMoreButton = null;
      this.sentinel = null;
      this.observer?.disconnect();
      this.observer = null;
      window.history.pushState({}, '', nextUrl);
      this.setStatus(this.labels.loaded.replace('[count]', String(items.length)));
      this.initializePagination();
    } catch {
      this.setStatus(this.labels.error);
      this.pagination?.removeAttribute('data-progressive-pagination');
      this.loadMoreButton?.remove();
      this.loadMoreButton = null;
      this.observer?.disconnect();
      this.observer = null;
    } finally {
      this.requestInFlight = false;
      if (this.loadMoreButton) this.loadMoreButton.disabled = false;
    }
  }

  handleResize() {
    this.syncFilterDrawer();
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) this.destroy();
  }

  destroy() {
    this.openFilters?.removeEventListener('click', this.handleOpenFilters);
    this.closeFilters?.removeEventListener('click', this.handleCloseFilters);
    this.filterDialog?.removeEventListener('cancel', this.handleDialogCancel);
    this.loadMoreButton?.removeEventListener('click', this.handleLoadMore);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
    this.observer?.disconnect();
    if (this.filterDialog?.open) this.closeDrawer();
    if (this.filterPanel && this.filterPanelHome) this.filterPanelHome.prepend(this.filterPanel);
    controllers.delete(this.root);
  }
}

function initialize(root = document) {
  const candidates = root instanceof HTMLElement && root.matches('[data-main-collection]')
    ? [root]
    : [...root.querySelectorAll('[data-main-collection]')];
  candidates.forEach((element) => {
    if (controllers.has(element)) return;
    const controller = new PremiumCollectionController(element);
    if (controller.init()) controllers.set(element, controller);
  });
}

function bindLifecycle() {
  if (window[lifecycleKey]) return;
  window[lifecycleKey] = true;
  const ready = () => initialize(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
}

bindLifecycle();
