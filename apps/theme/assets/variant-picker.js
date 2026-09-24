/**
 * Enhances the native product variant select with separate option controls.
 * The visible native select remains the no-JavaScript purchase fallback.
 */
class VariantPicker {
  constructor(root) {
    this.root = root;
    this.fallback = root.querySelector('[data-variant-picker-fallback]');
    this.enhancedOptions = root.querySelector('[data-variant-picker-options]');
    this.masterSelect = root.querySelector('select[data-product-variant-id]');
    this.optionGroups = [...root.querySelectorAll('[data-variant-option-group]')];
    this.optionCount = Number(root.dataset.optionCount || 0);
    this.variants = this.masterSelect ? [...this.masterSelect.options].map((option) => this.getVariant(option)) : [];

    this.handleOptionChange = this.handleOptionChange.bind(this);
    this.handleMasterChange = this.handleMasterChange.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (!this.masterSelect || !this.fallback || !this.enhancedOptions || this.optionGroups.length === 0) {
      return false;
    }

    this.fallback.hidden = true;
    this.enhancedOptions.hidden = false;
    this.root.dataset.variantPickerEnhanced = 'true';

    this.optionGroups.forEach((group) => {
      group.addEventListener('change', this.handleOptionChange);
    });
    this.masterSelect.addEventListener('change', this.handleMasterChange);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);

    this.syncControlsFromMasterSelect();
    this.updateOptionAvailability();
    return true;
  }

  handleOptionChange() {
    const variant = this.findVariant(this.getSelectedValues());

    this.masterSelect.value = variant ? variant.id : '';
    this.masterSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }

  handleMasterChange() {
    this.syncControlsFromMasterSelect();
    this.updateOptionAvailability();
  }

  handleSectionUnload(event) {
    const section = this.root.closest('[data-main-product]');

    if (section && event.target instanceof HTMLElement && event.target.contains(section)) {
      this.destroy();
    }
  }

  getVariant(option) {
    return {
      id: option.value,
      available: option.dataset.variantAvailable === 'true',
      options: [option.dataset.option1 || '', option.dataset.option2 || '', option.dataset.option3 || '']
    };
  }

  getSelectedValues() {
    return this.optionGroups.map((group) => {
      const select = group.querySelector('select[data-variant-option-input]');

      if (select) {
        return select.value;
      }

      return group.querySelector('input[data-variant-option-input]:checked')?.value || '';
    });
  }

  findVariant(values) {
    return this.variants.find((variant) => values.every((value, index) => variant.options[index] === value)) || null;
  }

  syncControlsFromMasterSelect() {
    const selectedOption = this.masterSelect.selectedOptions[0];

    if (!selectedOption) {
      return;
    }

    const selectedVariant = this.getVariant(selectedOption);

    this.optionGroups.forEach((group, index) => {
      const value = selectedVariant.options[index];
      const select = group.querySelector('select[data-variant-option-input]');

      if (select) {
        select.value = value;
        return;
      }

      const radio = group.querySelector(`input[data-variant-option-input][value="${CSS.escape(value)}"]`);

      if (radio) {
        radio.checked = true;
      }
    });
  }

  updateOptionAvailability() {
    const selectedValues = this.getSelectedValues();

    this.optionGroups.forEach((group, groupIndex) => {
      const controls = group.querySelectorAll('[data-variant-option-input]');

      controls.forEach((control) => {
        if (control instanceof HTMLSelectElement) {
          [...control.options].forEach((option) => {
            this.setControlAvailability(option, selectedValues, groupIndex, option.value, option.selected);
          });
          return;
        }

        this.setControlAvailability(control, selectedValues, groupIndex, control.value, control.checked);
      });
    });
  }

  setControlAvailability(control, selectedValues, groupIndex, candidateValue, isSelected) {
    const candidateValues = [...selectedValues];
    candidateValues[groupIndex] = candidateValue;
    const matchingVariants = this.variants.filter((variant) => candidateValues.every((value, index) => !value || variant.options[index] === value));
    const isAvailable = matchingVariants.some((variant) => variant.available);

    control.disabled = !isAvailable && !isSelected;

    if (control instanceof HTMLInputElement) {
      control.closest('.co-variant-picker__value')?.toggleAttribute('data-unavailable', !isAvailable);
    }
  }

  destroy() {
    this.optionGroups.forEach((group) => {
      group.removeEventListener('change', this.handleOptionChange);
    });
    this.masterSelect.removeEventListener('change', this.handleMasterChange);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedVariantPickers = new WeakSet();

function initializeVariantPicker(root) {
  if (!(root instanceof HTMLElement) || initializedVariantPickers.has(root)) {
    return;
  }

  const picker = new VariantPicker(root);

  if (picker.init()) {
    initializedVariantPickers.add(root);
  }
}

function initializeVariantPickers(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-variant-picker]')) {
    initializeVariantPicker(root);
  }

  root.querySelectorAll('[data-variant-picker]').forEach(initializeVariantPicker);
}

initializeVariantPickers();

document.addEventListener('shopify:section:load', (event) => {
  initializeVariantPickers(event.target);
});
