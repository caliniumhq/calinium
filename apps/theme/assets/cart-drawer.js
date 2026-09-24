/**
 * Enhances the server-rendered cart drawer into an accessible dialog.
 * The header cart link keeps its normal cart-page destination without JavaScript.
 */
const focusableSelector = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

class CartDrawer {
  constructor(root) {
    this.root = root;
    this.overlay = document.querySelector('[data-cart-drawer-overlay]');
    this.closeButton = root.querySelector('[data-action="cart-drawer-close"]');
    this.sectionId = root.dataset.cartSectionId;
    this.cartUrl = root.dataset.cartUrl;
    this.lastFocusedElement = null;
    this.isOpen = false;
    this.refreshController = null;
    this.refreshRequest = 0;
    this.closeTimer = null;

    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleOverlayClick = this.handleOverlayClick.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.handleCartUpdated = this.handleCartUpdated.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (!this.overlay || !this.closeButton || !this.sectionId || !this.cartUrl) {
      return false;
    }

    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.dataset.cartDrawerEnhanced = 'true';
    this.root.hidden = false;
    this.root.inert = true;
    this.overlay.setAttribute('aria-hidden', 'true');
    this.overlay.hidden = true;
    document.addEventListener('click', this.handleDocumentClick);
    this.overlay.addEventListener('click', this.handleOverlayClick);
    document.addEventListener('calinium:cart:updated', this.handleCartUpdated);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
    return true;
  }

  handleDocumentClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const openTrigger = target?.closest('[data-action="cart-drawer-open"]');

    if (openTrigger instanceof HTMLElement && openTrigger.getAttribute('aria-disabled') !== 'true') {
      event.preventDefault();
      this.open(openTrigger);
      this.refreshContent();
      return;
    }

    if (target?.closest('[data-action="cart-drawer-close"]')) {
      event.preventDefault();
      this.close();
    }
  }

  handleOverlayClick() {
    this.close();
  }

  async handleCartUpdated(event) {
    const detail = event.detail || {};

    if (detail.sections?.[this.sectionId]) {
      return;
    }

    if (detail.openDrawer) {
      this.open();
      await this.refreshContent();
    }
  }

  open(trigger = null) {
    if (this.isOpen) {
      return;
    }

    window.clearTimeout(this.closeTimer);
    this.closeTimer = null;
    this.lastFocusedElement = trigger || (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    this.isOpen = true;
    this.root.hidden = false;
    this.root.inert = false;
    this.root.removeAttribute('aria-hidden');
    this.overlay.hidden = false;
    document.body.classList.add('co-cart-drawer-scroll-locked');
    document.addEventListener('keydown', this.handleDocumentKeydown);

    window.requestAnimationFrame(() => {
      if (!this.isOpen) {
        return;
      }

      this.root.dataset.cartDrawerOpen = 'true';
      this.overlay.dataset.cartDrawerOpen = 'true';
      this.closeButton.focus();
    });
  }

  close({ restoreFocus = true } = {}) {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.refreshController?.abort();
    delete this.root.dataset.cartDrawerOpen;
    delete this.overlay.dataset.cartDrawerOpen;
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    document.body.classList.remove('co-cart-drawer-scroll-locked');
    document.removeEventListener('keydown', this.handleDocumentKeydown);

    const finish = () => {
      if (this.isOpen) {
        return;
      }

      this.root.hidden = true;
      this.overlay.hidden = true;
      this.closeTimer = null;

      if (restoreFocus && this.lastFocusedElement?.isConnected) {
        this.lastFocusedElement.focus();
      }

      this.lastFocusedElement = null;
    };

    window.clearTimeout(this.closeTimer);
    if (reducedMotion()) {
      finish();
    } else {
      this.closeTimer = window.setTimeout(finish, 260);
    }
  }

  handleDocumentKeydown(event) {
    if (!this.isOpen) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusableElements = [...this.root.querySelectorAll(focusableSelector)];

    if (focusableElements.length === 0) {
      event.preventDefault();
      this.root.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  async refreshContent() {
    this.refreshController?.abort();
    const controller = new AbortController();
    const requestId = ++this.refreshRequest;
    this.refreshController = controller;

    try {
      const requestUrl = new URL(this.cartUrl, window.location.origin);
      requestUrl.searchParams.set('section_id', this.sectionId);
      const response = await fetch(requestUrl.toString(), {
        headers: { Accept: 'text/html' },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(this.root.dataset.cartRefreshErrorMessage || '');
      }

      const markup = await response.text();

      if (requestId !== this.refreshRequest) {
        return;
      }

      const parsedMarkup = new DOMParser().parseFromString(markup, 'text/html');
      const selector = `[data-cart-section-id="${CSS.escape(this.sectionId)}"] [data-cart-content]`;
      const nextContent = parsedMarkup.querySelector(selector);
      const currentContent = this.root.querySelector('[data-cart-content]');

      if (!nextContent || !currentContent) {
        throw new Error(this.root.dataset.cartRefreshErrorMessage || '');
      }

      currentContent.replaceWith(nextContent);
      this.root.dispatchEvent(new CustomEvent('calinium:cart:content-replaced'));
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== this.refreshRequest) {
        return;
      }

      document.dispatchEvent(new CustomEvent('calinium:cart:error', {
        detail: {
          source: 'cart-drawer',
          action: 'refresh',
          message: error.message || this.root.dataset.cartRefreshErrorMessage || ''
        }
      }));
    } finally {
      if (requestId === this.refreshRequest) {
        this.refreshController = null;
      }
    }
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) {
      this.destroy();
    }
  }

  destroy() {
    this.close({ restoreFocus: false });
    window.clearTimeout(this.closeTimer);
    this.refreshController?.abort();
    document.removeEventListener('click', this.handleDocumentClick);
    this.overlay?.removeEventListener('click', this.handleOverlayClick);
    document.removeEventListener('calinium:cart:updated', this.handleCartUpdated);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedCartDrawers = new WeakSet();

function initializeCartDrawer(root) {
  if (!(root instanceof HTMLElement) || initializedCartDrawers.has(root)) {
    return;
  }

  const cartDrawer = new CartDrawer(root);

  if (cartDrawer.init()) {
    initializedCartDrawers.add(root);
  }
}

function initializeCartDrawers(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-cart-drawer]')) {
    initializeCartDrawer(root);
  }

  root.querySelectorAll('[data-cart-drawer]').forEach(initializeCartDrawer);
}

initializeCartDrawers();

document.addEventListener('shopify:section:load', (event) => {
  initializeCartDrawers(event.target);
});
