/**
 * Enhances a Shopify-native product form without replacing its normal POST flow.
 */
class ProductForm {
  constructor(root) {
    this.root = root;
    this.form = root.querySelector('form');
    this.section = root.closest('[data-main-product], [id^="shopify-section-"]');
    this.variantInput = root.querySelector('[data-product-variant-id]');
    this.submitButton = root.querySelector('[data-action="product-form-submit"]');
    this.submitLabel = this.submitButton?.querySelector('.co-button__label') || null;
    this.spinner = root.querySelector('[data-product-form-spinner]');
    this.message = root.querySelector('[data-product-form-message]');
    this.cartLink = root.querySelector('[data-product-form-cart-link]');
    this.priceRegion = root.querySelector('[data-product-price-region]');
    this.skuRegion = root.querySelector('[data-product-sku-region]');
    this.barcodeRegion = root.querySelector('[data-product-barcode-region]');
    this.inventoryRegion = root.querySelector('[data-product-inventory-region]');
    this.quantity = root.querySelector('[data-quantity-field]');
    this.decreaseButton = root.querySelector('[data-action="quantity-decrease"]');
    this.increaseButton = root.querySelector('[data-action="quantity-increase"]');
    this.isSubmitting = false;
    this.currentVariant = null;
    this.submitController = null;

    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleVariantChange = this.handleVariantChange.bind(this);
    this.handleQuantityInput = this.handleQuantityInput.bind(this);
    this.handleQuantityAction = this.handleQuantityAction.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (!this.form || !this.submitButton) {
      return false;
    }

    this.root.dataset.productFormEnhanced = 'true';
    this.form.addEventListener('submit', this.handleSubmit);
    this.variantInput?.addEventListener('change', this.handleVariantChange);
    this.quantity?.addEventListener('input', this.handleQuantityInput);
    this.decreaseButton?.addEventListener('click', this.handleQuantityAction);
    this.increaseButton?.addEventListener('click', this.handleQuantityAction);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);

    if (this.decreaseButton && this.increaseButton) {
      this.decreaseButton.hidden = false;
      this.increaseButton.hidden = false;
    }

    this.currentVariant = this.getCurrentVariant();
    this.updateVariantState();
    this.updateQuantityButtons();
    return true;
  }

  handleVariantChange() {
    this.currentVariant = this.getCurrentVariant();
    this.updateVariantState();
    this.updateVariantUrl();
  }

  handleQuantityInput() {
    this.updateQuantityButtons();
  }

  handleQuantityAction(event) {
    if (!this.quantity) {
      return;
    }

    const increment = Number(this.quantity.step || 1);
    const minimum = Number(this.quantity.min || 1);
    const maximum = this.quantity.max === '' ? Infinity : Number(this.quantity.max);
    const currentValue = Number(this.quantity.value || minimum);
    const nextValue = event.currentTarget === this.decreaseButton ? currentValue - increment : currentValue + increment;
    const constrainedValue = Math.max(minimum, Math.min(maximum, nextValue));

    this.quantity.value = String(constrainedValue);
    this.quantity.dispatchEvent(new Event('input', { bubbles: true }));
    this.quantity.dispatchEvent(new Event('change', { bubbles: true }));
  }

  handleSectionUnload(event) {
    if (this.section && event.target instanceof HTMLElement && event.target.contains(this.section)) {
      this.destroy();
    }
  }

  getCurrentVariant() {
    if (this.variantInput instanceof HTMLInputElement) {
      return {
        id: this.variantInput.value,
        available: this.variantInput.dataset.variantAvailable === 'true',
        mediaId: '',
        quantityMinimum: this.variantInput.dataset.quantityMin || '1',
        quantityMaximum: this.variantInput.dataset.quantityMax || '',
        quantityIncrement: this.variantInput.dataset.quantityIncrement || '1'
      };
    }

    if (!(this.variantInput instanceof HTMLSelectElement)) {
      return null;
    }

    const option = this.variantInput.selectedOptions[0];

    if (!option || !option.value) {
      return null;
    }

    return {
      id: option.value,
      available: option.dataset.variantAvailable === 'true',
      mediaId: option.dataset.variantMediaId || '',
      quantityMinimum: option.dataset.quantityMin || '1',
      quantityMaximum: option.dataset.quantityMax || '',
      quantityIncrement: option.dataset.quantityIncrement || '1'
    };
  }

  updateVariantState() {
    if (!this.currentVariant) {
      this.priceRegion?.setAttribute('hidden', '');
      this.replaceRegionFromTemplate(this.inventoryRegion, 'data-product-inventory-template', 'unavailable');
      this.replaceRegionFromTemplate(this.skuRegion, 'data-product-sku-template', 'unavailable');
      this.replaceRegionFromTemplate(this.barcodeRegion, 'data-product-barcode-template', 'unavailable');
      this.updateSubmitState(false, this.root.dataset.unavailableLabel || '');
      return;
    }

    this.replaceRegionFromTemplate(this.priceRegion, 'data-product-price-template', this.currentVariant.id);
    this.replaceRegionFromTemplate(this.skuRegion, 'data-product-sku-template', this.currentVariant.id);
    this.replaceRegionFromTemplate(this.barcodeRegion, 'data-product-barcode-template', this.currentVariant.id);
    this.replaceRegionFromTemplate(this.inventoryRegion, 'data-product-inventory-template', this.currentVariant.id);
    this.updateQuantityRule();
    this.updateSubmitState(this.currentVariant.available, this.currentVariant.available ? this.root.dataset.addLabel || '' : this.root.dataset.soldOutLabel || '');
  }

  updateVariantUrl() {
    if (!this.currentVariant || !window.history.replaceState) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('variant', this.currentVariant.id);
    window.history.replaceState({}, '', url);
  }

  replaceRegionFromTemplate(region, templateName, variantId) {
    if (!region) {
      return;
    }

    const template = this.root.querySelector(`template[${templateName}][data-variant-id="${CSS.escape(variantId)}"]`);

    if (!template) {
      region.replaceChildren();
      region.hidden = true;
      return;
    }

    const content = template.content.cloneNode(true);
    region.replaceChildren(content);
    region.hidden = region.childElementCount === 0;
  }

  updateQuantityRule() {
    if (!this.quantity || !this.currentVariant) {
      return;
    }

    this.quantity.min = this.currentVariant.quantityMinimum;
    this.quantity.step = this.currentVariant.quantityIncrement;

    if (this.currentVariant.quantityMaximum) {
      this.quantity.max = this.currentVariant.quantityMaximum;
    } else {
      this.quantity.removeAttribute('max');
    }

    const minimum = Number(this.quantity.min || 1);

    if (!this.quantity.value || Number(this.quantity.value) < minimum) {
      this.quantity.value = String(minimum);
    }

    this.updateQuantityButtons();
  }

  updateQuantityButtons() {
    if (!this.quantity || !this.decreaseButton || !this.increaseButton) {
      return;
    }

    const currentValue = Number(this.quantity.value || this.quantity.min || 1);
    const minimum = Number(this.quantity.min || 1);
    const increment = Number(this.quantity.step || 1);
    const maximum = this.quantity.max === '' ? Infinity : Number(this.quantity.max);

    this.decreaseButton.disabled = currentValue - increment < minimum;
    this.increaseButton.disabled = currentValue + increment > maximum;
  }

  updateSubmitState(isAvailable, label) {
    if (this.isSubmitting) {
      return;
    }

    this.submitButton.disabled = !isAvailable;
    this.submitButton.removeAttribute('aria-disabled');

    if (this.submitLabel && label) {
      this.submitLabel.textContent = label;
    }
  }

  async handleSubmit(event) {
    if (this.isSubmitting) {
      event.preventDefault();
      return;
    }

    if (this.variantInput instanceof HTMLSelectElement && !this.currentVariant) {
      event.preventDefault();
      this.showMessage(this.root.dataset.unavailableLabel || this.root.dataset.errorMessage || '', true);
      return;
    }

    event.preventDefault();
    this.isSubmitting = true;
    this.submitController?.abort();
    this.submitController = new AbortController();
    this.setLoadingState(true);
    this.clearMessage();

    try {
      const rootUrl = window.Shopify?.routes?.root || '/';
      const response = await fetch(`${rootUrl}cart/add.js`, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(this.form),
        signal: this.submitController.signal
      });

      if (!response.ok) {
        throw new Error('Cart add request failed.');
      }

      await response.json();
      const successMessage = this.root.dataset.successMessage || '';

      this.showMessage(successMessage, false);
      this.announce(successMessage);
      this.cartLink?.removeAttribute('hidden');
      document.dispatchEvent(new CustomEvent('calinium:cart:refresh', {
        detail: {
          source: 'product-form',
          action: 'add',
          openDrawer: true,
          errorMessage: this.root.dataset.cartRefreshErrorMessage || ''
        }
      }));
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      const errorMessage = this.root.dataset.errorMessage || '';

      this.showMessage(errorMessage, true);
      this.announce(errorMessage);
    } finally {
      this.submitController = null;
      this.isSubmitting = false;
      this.setLoadingState(false);
      this.updateSubmitState(Boolean(this.currentVariant?.available), this.currentVariant?.available ? this.root.dataset.addLabel || '' : this.root.dataset.soldOutLabel || '');
    }
  }

  setLoadingState(isLoading) {
    this.submitButton.disabled = isLoading || !this.currentVariant?.available;
    this.submitButton.setAttribute('aria-busy', String(isLoading));
    this.spinner?.toggleAttribute('hidden', !isLoading);

    if (this.submitLabel && isLoading) {
      this.submitLabel.textContent = this.root.dataset.addingLabel || this.submitLabel.textContent;
    }
  }

  showMessage(message, isError) {
    if (!this.message || !message) {
      return;
    }

    this.message.textContent = message;
    this.message.hidden = false;
    this.message.setAttribute('role', isError ? 'alert' : 'status');
    this.message.toggleAttribute('data-error', isError);
  }

  clearMessage() {
    if (!this.message) {
      return;
    }

    this.message.textContent = '';
    this.message.hidden = true;
    this.message.setAttribute('role', 'status');
    this.message.removeAttribute('data-error');
  }

  announce(message) {
    if (!message) {
      return;
    }

    document.dispatchEvent(new CustomEvent('calinium:announce', {
      detail: { message }
    }));
  }

  destroy() {
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.variantInput?.removeEventListener('change', this.handleVariantChange);
    this.quantity?.removeEventListener('input', this.handleQuantityInput);
    this.decreaseButton?.removeEventListener('click', this.handleQuantityAction);
    this.increaseButton?.removeEventListener('click', this.handleQuantityAction);
    this.submitController?.abort();
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedProductForms = new WeakSet();

function initializeProductForm(root) {
  if (!(root instanceof HTMLElement) || initializedProductForms.has(root)) {
    return;
  }

  const productForm = new ProductForm(root);

  if (productForm.init()) {
    initializedProductForms.add(root);
  }
}

function initializeProductForms(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-product-form]')) {
    initializeProductForm(root);
  }

  root.querySelectorAll('[data-product-form]').forEach(initializeProductForm);
}

initializeProductForms();

document.addEventListener('shopify:section:load', (event) => {
  initializeProductForms(event.target);
});

document.addEventListener('calinium:content:replace', (event) => {
  const root = event.detail?.root;
  if (root instanceof HTMLElement) initializeProductForms(root);
});
