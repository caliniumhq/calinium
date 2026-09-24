/**
 * Progressively enhances the canonical cart forms.
 * Native Shopify cart forms remain the fallback; this module only replaces
 * a rendered cart section after Shopify confirms a line-item mutation.
 */
let activeCartUpdate = null;

function escapeSelector(value) {
  return CSS.escape(String(value));
}

class CartController {
  constructor(root) {
    this.root = root;
    this.sectionId = root.dataset.cartSectionId;
    this.cartUrl = root.dataset.cartUrl;
    this.recommendationController = null;

    this.handleChange = this.handleChange.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleFocusIn = this.handleFocusIn.bind(this);
    this.handleContentReplaced = this.handleContentReplaced.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (!this.sectionId || !this.cartUrl || !window.fetch) {
      return false;
    }

    this.root.dataset.cartEnhanced = 'true';
    this.root.addEventListener('change', this.handleChange);
    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('focusin', this.handleFocusIn);
    this.root.addEventListener('calinium:cart:content-replaced', this.handleContentReplaced);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
    this.enhanceQuantityControls();
    this.loadRecommendations();
    return true;
  }

  handleFocusIn(event) {
    const input = event.target;

    if (input instanceof HTMLInputElement && input.matches('[data-cart-quantity-input]')) {
      input.dataset.cartQuantityLastValue = input.value;
    }
  }

  handleChange(event) {
    const input = event.target;

    if (!(input instanceof HTMLInputElement) || !input.matches('[data-cart-quantity-input]')) {
      return;
    }

    const quantity = Number(input.value);
    const minimum = Number(input.min || 1);
    const maximum = input.max === '' ? Infinity : Number(input.max);

    if (!input.validity.valid || !input.dataset.cartLineKey || !Number.isFinite(quantity) || quantity < minimum || quantity > maximum) {
      this.restoreLastQuantity(input.closest('[data-cart-line-item]'));
      this.enhanceQuantityControls();
      return;
    }

    this.updateLineItem({
      lineKey: input.dataset.cartLineKey,
      quantity,
      action: 'update',
      focusMode: 'quantity',
      sourceItem: input.closest('[data-cart-line-item]')
    });
  }

  handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const quantityButton = target?.closest('[data-cart-quantity-action]');

    if (quantityButton instanceof HTMLButtonElement) {
      event.preventDefault();
      this.adjustQuantity(quantityButton);
      return;
    }

    const removeLink = target?.closest('[data-cart-remove]');

    if (!(removeLink instanceof HTMLAnchorElement) || removeLink.getAttribute('aria-disabled') === 'true') {
      return;
    }

    const lineKey = removeLink.dataset.cartLineKey;

    if (!lineKey) {
      return;
    }

    event.preventDefault();
    this.updateLineItem({
      lineKey,
      quantity: 0,
      action: 'remove',
      focusMode: 'heading',
      sourceItem: removeLink.closest('[data-cart-line-item]')
    });
  }

  adjustQuantity(button) {
    if (button.disabled) {
      return;
    }

    const item = button.closest('[data-cart-line-item]');
    const input = item?.querySelector('[data-cart-quantity-input]');

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    const increment = Number(input.step || 1);
    const minimum = Number(input.min || 1);
    const maximum = input.max === '' ? Infinity : Number(input.max);
    const current = Number(input.value || minimum);
    const direction = button.dataset.cartQuantityAction === 'decrease' ? -1 : 1;
    const next = Math.max(minimum, Math.min(maximum, current + (increment * direction)));

    if (next === current) {
      return;
    }

    input.value = String(next);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async updateLineItem({ lineKey, quantity, action, focusMode, sourceItem }) {
    if (!Number.isFinite(quantity) || quantity < 0) {
      return;
    }

    if (activeCartUpdate) {
      activeCartUpdate.controller.abort();
      activeCartUpdate.restoreControls();
    }

    const controller = new AbortController();
    const restoreControls = this.setItemBusy(sourceItem, true);
    const requestId = Symbol('cart-update');
    activeCartUpdate = { controller, requestId, restoreControls, root: this.root };

    try {
      const sectionIds = [...document.querySelectorAll('[data-cart-section-id]')]
        .map((section) => section.dataset.cartSectionId)
        .filter((sectionId, index, allSectionIds) => sectionId && allSectionIds.indexOf(sectionId) === index)
        .slice(0, 5);
      const rootUrl = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${rootUrl}cart/change.js`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: lineKey,
          quantity,
          sections: sectionIds,
          sections_url: this.cartUrl
        }),
        signal: controller.signal
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || this.root.dataset.cartErrorMessage || '');
      }

      if (!activeCartUpdate || activeCartUpdate.requestId !== requestId) {
        return;
      }

      this.replaceRenderedSections(data.sections || {});
      this.restoreFocus(lineKey, focusMode);

      const message = action === 'remove' ? this.root.dataset.cartRemoveMessage : this.root.dataset.cartUpdateMessage;
      this.showFeedback(message, false);
      this.dispatchCartUpdated(data, action);
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      this.restoreLastQuantity(sourceItem);
      this.enhanceQuantityControls();
      const message = error.message || this.root.dataset.cartErrorMessage || '';
      this.showFeedback(message, true);
      document.dispatchEvent(new CustomEvent('calinium:cart:error', {
        detail: { source: 'cart', action, message }
      }));
    } finally {
      if (activeCartUpdate?.requestId === requestId) {
        activeCartUpdate = null;
        restoreControls();
      }
    }
  }

  replaceRenderedSections(sections) {
    Object.entries(sections).forEach(([sectionId, markup]) => {
      if (typeof markup !== 'string') {
        return;
      }

      const parsedMarkup = new DOMParser().parseFromString(markup, 'text/html');
      const selector = `[data-cart-section-id="${escapeSelector(sectionId)}"]`;
      const nextRoot = parsedMarkup.querySelector(selector);
      const currentRoot = document.querySelector(selector);
      const nextContent = nextRoot?.querySelector('[data-cart-content]');
      const currentContent = currentRoot?.querySelector('[data-cart-content]');

      if (nextContent && currentContent) {
        currentContent.replaceWith(nextContent);
      }
    });

    document.querySelectorAll('[data-cart-root]').forEach((cartRoot) => {
      cartRoot.dispatchEvent(new CustomEvent('calinium:cart:content-replaced'));
    });
  }

  restoreFocus(lineKey, focusMode) {
    if (focusMode === 'quantity') {
      const input = this.root.querySelector(`[data-cart-quantity-input][data-cart-line-key="${escapeSelector(lineKey)}"]`);

      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
        return;
      }
    }

    const heading = this.root.querySelector('[data-cart-heading], [data-cart-drawer-title]');
    heading?.focus();
  }

  restoreLastQuantity(item) {
    if (!(item instanceof HTMLElement)) {
      return;
    }

    const input = item.querySelector('[data-cart-quantity-input]');

    if (input instanceof HTMLInputElement && input.dataset.cartQuantityLastValue) {
      input.value = input.dataset.cartQuantityLastValue;
    }
  }

  setItemBusy(item, isBusy) {
    if (!(item instanceof HTMLElement)) {
      return () => {};
    }

    const input = item.querySelector('[data-cart-quantity-input]');
    const quantityButtons = [...item.querySelectorAll('[data-cart-quantity-action]')];
    const removeLink = item.querySelector('[data-cart-remove]');
    const spinner = item.querySelector('[data-cart-item-spinner]');

    if (input instanceof HTMLInputElement) {
      input.disabled = isBusy;
    }

    quantityButtons.forEach((button) => {
      button.disabled = isBusy;
    });

    if (removeLink instanceof HTMLAnchorElement) {
      removeLink.setAttribute('aria-disabled', String(isBusy));
      removeLink.tabIndex = isBusy ? -1 : 0;
    }

    item.toggleAttribute('data-cart-item-updating', isBusy);

    if (spinner instanceof HTMLElement) {
      spinner.hidden = !isBusy;
    }

    return () => {
      if (input instanceof HTMLInputElement) {
        input.disabled = false;
      }

      if (removeLink instanceof HTMLAnchorElement) {
        removeLink.removeAttribute('aria-disabled');
        removeLink.removeAttribute('tabindex');
      }

      item.removeAttribute('data-cart-item-updating');

      if (spinner instanceof HTMLElement) {
        spinner.hidden = true;
      }

      this.enhanceQuantityControls();
    };
  }

  enhanceQuantityControls() {
    this.root.querySelectorAll('[data-cart-line-item]').forEach((item) => {
      const input = item.querySelector('[data-cart-quantity-input]');

      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      const value = Number(input.value || input.min || 1);
      const minimum = Number(input.min || 1);
      const maximum = input.max === '' ? Infinity : Number(input.max);
      const increment = Number(input.step || 1);

      item.querySelectorAll('[data-cart-quantity-action]').forEach((button) => {
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        button.hidden = false;
        button.disabled = input.disabled
          || (button.dataset.cartQuantityAction === 'decrease'
            ? value - increment < minimum
            : value + increment > maximum);
      });
    });
  }

  async loadRecommendations() {
    const region = this.root.querySelector('[data-cart-recommendations][data-cart-recommendations-url]');
    const requestUrl = region?.dataset.cartRecommendationsUrl;

    if (!(region instanceof HTMLElement) || !requestUrl || region.dataset.cartRecommendationsLoaded === 'true') {
      return;
    }

    this.recommendationController?.abort();
    const controller = new AbortController();
    this.recommendationController = controller;

    try {
      const response = await fetch(requestUrl, {
        headers: { Accept: 'text/html' },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(this.root.dataset.cartRefreshErrorMessage || '');
      }

      const markup = await response.text();
      const parsedMarkup = new DOMParser().parseFromString(markup, 'text/html');
      const nextRegion = parsedMarkup.querySelector('[data-cart-recommendations]');

      if (!nextRegion || controller.signal.aborted) {
        return;
      }

      nextRegion.dataset.cartRecommendationsLoaded = 'true';
      region.replaceWith(nextRegion);
      nextRegion.hidden = !nextRegion.querySelector('.co-main-cart__recommendations-grid');
    } catch (error) {
      if (error.name !== 'AbortError') {
        region.hidden = true;
      }
    } finally {
      if (this.recommendationController === controller) {
        this.recommendationController = null;
      }
    }
  }

  handleContentReplaced() {
    this.enhanceQuantityControls();
    this.loadRecommendations();
  }

  showFeedback(message, isError) {
    const feedback = this.root.querySelector('[data-cart-feedback]');

    if (!(feedback instanceof HTMLElement) || !message) {
      return;
    }

    feedback.textContent = message;
    feedback.hidden = false;
    feedback.toggleAttribute('data-error', isError);
    feedback.setAttribute('role', isError ? 'alert' : 'status');
  }

  dispatchCartUpdated(cart, action) {
    document.dispatchEvent(new CustomEvent('calinium:cart:updated', {
      detail: {
        source: 'cart',
        action,
        cart: {
          itemCount: cart.item_count
        },
        sections: cart.sections || {}
      }
    }));
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) {
      this.destroy();
    }
  }

  destroy() {
    if (activeCartUpdate?.root === this.root) {
      activeCartUpdate.controller.abort();
      activeCartUpdate.restoreControls();
      activeCartUpdate = null;
    }

    this.recommendationController?.abort();
    this.root.removeEventListener('change', this.handleChange);
    this.root.removeEventListener('click', this.handleClick);
    this.root.removeEventListener('focusin', this.handleFocusIn);
    this.root.removeEventListener('calinium:cart:content-replaced', this.handleContentReplaced);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedCartRoots = new WeakSet();

function initializeCartRoot(root) {
  if (!(root instanceof HTMLElement) || initializedCartRoots.has(root)) {
    return;
  }

  const cartController = new CartController(root);

  if (cartController.init()) {
    initializedCartRoots.add(root);
  }
}

function initializeCartRoots(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-cart-root]')) {
    initializeCartRoot(root);
  }

  root.querySelectorAll('[data-cart-root]').forEach(initializeCartRoot);
}

initializeCartRoots();

document.addEventListener('shopify:section:load', (event) => {
  initializeCartRoots(event.target);
});
