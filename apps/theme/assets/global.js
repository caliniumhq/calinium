/**
 * Calinium's global enhancement layer.
 * Essential storefront actions must remain usable when this file is unavailable.
 */
(() => {
  const statusRegion = document.querySelector('[data-global-status]');
  let cartRefreshController = null;
  let cartRefreshRequest = 0;

  document.documentElement.classList.add('co-js');

  /**
   * Announces a short, text-only status message from any future component.
   * Dispatch `calinium:announce` with `{ message: '…' }` as the event detail.
   */
  document.addEventListener('calinium:announce', (event) => {
    if (!statusRegion || typeof event.detail?.message !== 'string') {
      return;
    }

    statusRegion.textContent = '';

    window.requestAnimationFrame(() => {
      statusRegion.textContent = event.detail.message;
    });
  });

  document.addEventListener('calinium:cart:refresh', async (event) => {
    const detail = event.detail || {};
    const requestId = ++cartRefreshRequest;

    cartRefreshController?.abort();
    const controller = new AbortController();
    cartRefreshController = controller;

    try {
      const rootUrl = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${rootUrl}cart.js`, {
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(detail.errorMessage || '');
      }

      const cart = await response.json();

      if (requestId !== cartRefreshRequest) {
        return;
      }

      document.dispatchEvent(new CustomEvent('calinium:cart:updated', {
        detail: {
          source: detail.source,
          action: detail.action,
          openDrawer: Boolean(detail.openDrawer),
          cart: { itemCount: cart.item_count }
        }
      }));
    } catch (error) {
      if (error.name === 'AbortError' || requestId !== cartRefreshRequest) {
        return;
      }

      document.dispatchEvent(new CustomEvent('calinium:cart:error', {
        detail: {
          source: detail.source,
          action: detail.action,
          message: error.message || detail.errorMessage || ''
        }
      }));
    } finally {
      if (requestId === cartRefreshRequest) {
        cartRefreshController = null;
      }
    }
  });

  document.addEventListener('calinium:cart:updated', (event) => {
    const count = Number(event.detail?.cart?.itemCount);

    if (!Number.isFinite(count)) {
      return;
    }

    document.querySelectorAll('[data-header-cart-count]').forEach((container) => {
      const trigger = container.querySelector('[data-action="cart-drawer-open"]');
      const visibleCount = container.querySelector('[data-header-cart-count-value]');
      const labelTemplate = count === 1 ? container.dataset.cartCountOne : container.dataset.cartCountOther;

      if (trigger && labelTemplate) {
        trigger.setAttribute('aria-label', labelTemplate.replace('{{ count }}', String(count)));
      }

      if (visibleCount) {
        visibleCount.textContent = String(count);
      }
    });
  });

  document.addEventListener('calinium:cart:error', (event) => {
    const message = event.detail?.message;

    if (message) {
      document.dispatchEvent(new CustomEvent('calinium:announce', {
        detail: { message }
      }));
    }
  });

  /**
   * Provides a stable lifecycle event for future components in Theme Editor mode.
   */
  document.addEventListener('shopify:section:load', (event) => {
    event.target.dispatchEvent(
      new CustomEvent('calinium:section:load', {
        bubbles: true,
        detail: { sectionId: event.detail?.sectionId || null }
      })
    );
  });
})();
