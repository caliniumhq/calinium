/*
 * Progressive behavior for the canonical Calinium footer.
 * The footer remains fully usable without JavaScript: the back-to-top control
 * is a normal hash link until this controller enhances it.
 */
const controllers = new WeakMap();
const lifecycleKey = '__caliniumPremiumFooterLifecycleV1';

class PremiumFooterController {
  constructor(root) {
    this.root = root;
    this.backToTop = root.querySelector('[data-footer-back-to-top]');
    this.frame = null;
    this.handleScroll = this.handleScroll.bind(this);
    this.handleBackToTop = this.handleBackToTop.bind(this);
  }

  init() {
    if (!this.backToTop) return true;
    this.backToTop.addEventListener('click', this.handleBackToTop);
    window.addEventListener('scroll', this.handleScroll, { passive: true });
    this.root.dataset.footerEnhanced = 'true';
    this.updateBackToTopVisibility();
    return true;
  }

  handleScroll() {
    if (this.frame !== null) return;
    this.frame = window.requestAnimationFrame(() => {
      this.frame = null;
      this.updateBackToTopVisibility();
    });
  }

  updateBackToTopVisibility() {
    if (!this.backToTop) return;
    this.backToTop.hidden = window.scrollY < Math.max(window.innerHeight * 0.6, 240);
  }

  handleBackToTop(event) {
    event.preventDefault();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  destroy() {
    this.backToTop?.removeEventListener('click', this.handleBackToTop);
    window.removeEventListener('scroll', this.handleScroll);
    if (this.frame !== null) window.cancelAnimationFrame(this.frame);
    controllers.delete(this.root);
  }
}

function initialize(root = document) {
  const candidates = root instanceof HTMLElement && root.matches('[data-premium-footer]')
    ? [root]
    : [...root.querySelectorAll('[data-premium-footer]')];
  candidates.forEach((element) => {
    if (controllers.has(element)) return;
    const controller = new PremiumFooterController(element);
    if (controller.init()) controllers.set(element, controller);
  });
}

function destroy(root) {
  if (!(root instanceof HTMLElement)) return;
  if (controllers.has(root)) controllers.get(root).destroy();
  root.querySelectorAll?.('[data-premium-footer]').forEach((element) => controllers.get(element)?.destroy());
}

function bindLifecycle() {
  if (window[lifecycleKey]) return;
  window[lifecycleKey] = true;
  const ready = () => initialize(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => destroy(event.target));
}

bindLifecycle();
