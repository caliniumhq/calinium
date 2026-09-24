/* Progressive enhancement for the canonical Calinium Premium Product system. */
const controllerMap = new WeakMap();
const lifecycleKey = '__caliniumPremiumProductLifecycleV1';

class PremiumProductController {
  constructor(root) {
    this.root = root;
    this.gallery = root.querySelector('[data-premium-product-gallery]');
    this.media = [...root.querySelectorAll('[data-product-media]')];
    this.thumbnails = [...root.querySelectorAll('[data-product-thumbnail]')];
    this.variant = root.querySelector('[data-product-variant-id]');
    this.purchaseArea = root.querySelector('[data-premium-purchase-area]');
    this.sticky = root.querySelector('[data-premium-sticky-add]');
    this.stickyButton = root.querySelector('[data-premium-sticky-submit]');
    this.stickyPrice = root.querySelector('[data-premium-sticky-price]');
    this.stickyVariant = root.querySelector('[data-premium-sticky-variant]');
    this.stickyImage = root.querySelector('[data-premium-sticky-image]');
    this.dialog = root.querySelector('[data-premium-gallery-dialog]');
    this.dialogContent = root.querySelector('[data-premium-gallery-dialog-content]');
    this.dialogTitle = root.querySelector('[data-premium-gallery-dialog-title]');
    this.dialogPrevious = root.querySelector('[data-premium-gallery-dialog-previous]');
    this.dialogNext = root.querySelector('[data-premium-gallery-dialog-next]');
    this.dialogClose = root.querySelector('[data-premium-gallery-dialog-close]');
    this.activeIndex = 0;
    this.observer = null;
    this.handleVariant = this.handleVariant.bind(this);
    this.handleMedia = this.handleMedia.bind(this);
    this.handleStickySubmit = this.handleStickySubmit.bind(this);
    this.handleGalleryAction = this.handleGalleryAction.bind(this);
    this.handleDialogAction = this.handleDialogAction.bind(this);
    this.handleDialogKeydown = this.handleDialogKeydown.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
    this.handleEditorRefresh = this.handleEditorRefresh.bind(this);
  }

  init() {
    this.root.dataset.premiumProductInitialized = 'true';
    this.variant?.addEventListener('change', this.handleVariant);
    this.gallery?.addEventListener('calinium:product-media-change', this.handleMedia);
    this.gallery?.addEventListener('click', this.handleGalleryAction);
    this.stickyButton?.addEventListener('click', this.handleStickySubmit);
    this.dialog?.addEventListener('click', this.handleDialogAction);
    this.dialog?.addEventListener('keydown', this.handleDialogKeydown);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
    document.addEventListener('shopify:section:select', this.handleEditorRefresh);
    document.addEventListener('shopify:section:deselect', this.handleEditorRefresh);
    document.addEventListener('shopify:block:select', this.handleEditorRefresh);
    document.addEventListener('shopify:block:deselect', this.handleEditorRefresh);
    this.syncVariant();
    this.syncActiveMedia();
    this.observePurchaseArea();
    return true;
  }

  selectedVariantOption() {
    return this.variant instanceof HTMLSelectElement ? this.variant.selectedOptions[0] : this.variant;
  }

  handleVariant() {
    this.syncVariant();
    window.requestAnimationFrame(() => this.syncActiveMedia());
  }

  handleMedia(event) {
    const mediaId = event.detail?.mediaId;
    const index = this.media.findIndex((item) => item.dataset.mediaId === String(mediaId));
    if (index >= 0) this.activeIndex = index;
    this.syncActiveMedia();
  }

  syncVariant() {
    const variant = this.selectedVariantOption();
    if (!variant) return;
    if (this.stickyPrice) this.stickyPrice.textContent = variant.dataset.variantDisplayPrice || this.stickyPrice.textContent;
    if (this.stickyVariant) this.stickyVariant.textContent = variant.dataset.variantTitle || '';
    if (this.stickyButton) this.stickyButton.disabled = variant.dataset.variantAvailable !== 'true';
    const mediaId = variant.dataset.variantMediaId;
    if (mediaId) {
      const index = this.media.findIndex((item) => item.dataset.mediaId === mediaId);
      if (index >= 0) this.activeIndex = index;
    }
  }

  syncActiveMedia() {
    const selected = this.media.find((item) => item.dataset.active === 'true');
    if (selected) this.activeIndex = Math.max(0, this.media.indexOf(selected));
    const active = this.media[this.activeIndex];
    const preview = active?.dataset.mediaPreviewUrl;
    if (preview && this.stickyImage instanceof HTMLImageElement) {
      this.stickyImage.src = preview;
      this.stickyImage.removeAttribute('hidden');
    }
  }

  observePurchaseArea() {
    if (!this.sticky || !this.purchaseArea || !('IntersectionObserver' in window)) return;
    this.observer = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      this.sticky.toggleAttribute('hidden', visible);
      this.sticky.dataset.visible = String(!visible);
    }, { threshold: 0.2 });
    this.observer.observe(this.purchaseArea);
  }

  handleStickySubmit() {
    const form = this.root.querySelector('[data-product-form] form');
    if (!form || this.stickyButton?.disabled) return;
    if (typeof form.requestSubmit === 'function') form.requestSubmit();
    else form.querySelector('[data-action="product-form-submit"]')?.click();
  }

  handleGalleryAction(event) {
    const fullscreen = event.target.closest('[data-premium-gallery-fullscreen]');
    if (fullscreen) {
      event.preventDefault();
      this.openDialog(this.activeIndex);
      return;
    }
    const zoom = event.target.closest('[data-premium-gallery-zoom]');
    if (zoom) {
      event.preventDefault();
      const active = this.media[this.activeIndex];
      active?.toggleAttribute('data-zoomed');
      zoom.setAttribute('aria-pressed', String(active?.hasAttribute('data-zoomed')));
    }
  }

  openDialog(index) {
    if (!this.dialog || !this.dialogContent || !this.media[index]) return;
    this.activeIndex = index;
    const source = this.media[index].querySelector('.co-product-media__frame');
    if (!source) return;
    this.dialogContent.replaceChildren(source.cloneNode(true));
    const label = this.media[index].dataset.mediaLabel || '';
    if (this.dialogTitle) this.dialogTitle.textContent = label;
    if (this.dialogPrevious) this.dialogPrevious.hidden = this.media.length < 2;
    if (this.dialogNext) this.dialogNext.hidden = this.media.length < 2;
    if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
    else this.dialog.setAttribute('open', '');
  }

  handleDialogAction(event) {
    if (event.target === this.dialog || event.target.closest('[data-premium-gallery-dialog-close]')) {
      this.dialog?.close?.();
      this.dialog?.removeAttribute('open');
      return;
    }
    if (event.target.closest('[data-premium-gallery-dialog-previous]')) this.openDialog((this.activeIndex - 1 + this.media.length) % this.media.length);
    if (event.target.closest('[data-premium-gallery-dialog-next]')) this.openDialog((this.activeIndex + 1) % this.media.length);
  }

  handleDialogKeydown(event) {
    if (!this.dialog?.open || this.media.length < 2) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); this.openDialog((this.activeIndex - 1 + this.media.length) % this.media.length); }
    if (event.key === 'ArrowRight') { event.preventDefault(); this.openDialog((this.activeIndex + 1) % this.media.length); }
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) this.destroy();
  }

  handleEditorRefresh(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.root)) {
      this.syncVariant();
      this.syncActiveMedia();
    }
  }

  destroy() {
    this.variant?.removeEventListener('change', this.handleVariant);
    this.gallery?.removeEventListener('calinium:product-media-change', this.handleMedia);
    this.gallery?.removeEventListener('click', this.handleGalleryAction);
    this.stickyButton?.removeEventListener('click', this.handleStickySubmit);
    this.dialog?.removeEventListener('click', this.handleDialogAction);
    this.dialog?.removeEventListener('keydown', this.handleDialogKeydown);
    this.observer?.disconnect();
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
    document.removeEventListener('shopify:section:select', this.handleEditorRefresh);
    document.removeEventListener('shopify:section:deselect', this.handleEditorRefresh);
    document.removeEventListener('shopify:block:select', this.handleEditorRefresh);
    document.removeEventListener('shopify:block:deselect', this.handleEditorRefresh);
    controllerMap.delete(this.root);
  }
}

function initialize(root = document) {
  const candidates = root instanceof HTMLElement && root.matches('[data-premium-product]') ? [root] : [...root.querySelectorAll('[data-premium-product]')];
  candidates.forEach((element) => {
    if (controllerMap.has(element)) return;
    const controller = new PremiumProductController(element);
    if (controller.init()) controllerMap.set(element, controller);
  });
}

function bindLifecycle() {
  if (window[lifecycleKey]) return;
  window[lifecycleKey] = true;
  const ready = () => initialize(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
}

bindLifecycle();
