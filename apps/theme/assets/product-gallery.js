/**
 * Adds keyboard and selected-variant navigation to the server-rendered media list.
 * Media and thumbnail anchors remain fully usable when this module is unavailable.
 */
class ProductGallery {
  constructor(root) {
    this.root = root;
    this.section = root.closest('[data-main-product]');
    this.mediaItems = [...root.querySelectorAll('[data-product-media]')];
    this.thumbnails = [...root.querySelectorAll('[data-product-thumbnail]')];
    this.variantInput = this.section?.querySelector('[data-product-variant-id]') || null;

    this.handleThumbnailClick = this.handleThumbnailClick.bind(this);
    this.handleThumbnailKeydown = this.handleThumbnailKeydown.bind(this);
    this.handleVariantChange = this.handleVariantChange.bind(this);
    this.handleSectionUnload = this.handleSectionUnload.bind(this);
  }

  init() {
    if (this.mediaItems.length === 0 || this.thumbnails.length === 0) {
      return false;
    }

    this.root.dataset.productGalleryEnhanced = 'true';
    this.thumbnails.forEach((thumbnail) => {
      thumbnail.addEventListener('click', this.handleThumbnailClick);
      thumbnail.addEventListener('keydown', this.handleThumbnailKeydown);
    });

    this.variantInput?.addEventListener('change', this.handleVariantChange);
    document.addEventListener('shopify:section:unload', this.handleSectionUnload);
    this.setActiveMedia(this.getSelectedVariantMediaId() || this.thumbnails.find((thumbnail) => thumbnail.getAttribute('aria-current') === 'true')?.dataset.mediaId, false);
    return true;
  }

  handleThumbnailClick(event) {
    event.preventDefault();
    this.setActiveMedia(event.currentTarget.dataset.mediaId, true);
  }

  handleThumbnailKeydown(event) {
    const currentIndex = this.thumbnails.indexOf(event.currentTarget);
    let nextIndex = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % this.thumbnails.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + this.thumbnails.length) % this.thumbnails.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = this.thumbnails.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const thumbnail = this.thumbnails[nextIndex];
    thumbnail.focus();
    this.setActiveMedia(thumbnail.dataset.mediaId, true);
  }

  handleVariantChange() {
    const mediaId = this.getSelectedVariantMediaId();

    if (mediaId) {
      this.setActiveMedia(mediaId, true);
    }
  }

  getSelectedVariantMediaId() {
    if (this.variantInput instanceof HTMLSelectElement) {
      return this.variantInput.selectedOptions[0]?.dataset.variantMediaId || '';
    }

    return this.variantInput?.dataset.variantMediaId || '';
  }

  handleSectionUnload(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.section)) {
      this.destroy();
    }
  }

  setActiveMedia(mediaId, shouldScroll) {
    if (!mediaId) {
      return;
    }

    const activeMedia = this.mediaItems.find((item) => item.dataset.mediaId === mediaId);

    if (!activeMedia) {
      return;
    }

    this.mediaItems.forEach((item) => {
      item.toggleAttribute('data-active', item === activeMedia);

      if (item !== activeMedia) {
        item.querySelector('video')?.pause();
      }
    });
    this.thumbnails.forEach((thumbnail) => {
      if (thumbnail.dataset.mediaId === mediaId) {
        thumbnail.setAttribute('aria-current', 'true');
      } else {
        thumbnail.removeAttribute('aria-current');
      }
    });

    if (shouldScroll) {
      activeMedia.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }

    this.root.dispatchEvent(new CustomEvent('calinium:product-media-change', {
      bubbles: true,
      detail: { mediaId }
    }));
  }

  destroy() {
    this.thumbnails.forEach((thumbnail) => {
      thumbnail.removeEventListener('click', this.handleThumbnailClick);
      thumbnail.removeEventListener('keydown', this.handleThumbnailKeydown);
    });
    this.variantInput?.removeEventListener('change', this.handleVariantChange);
    document.removeEventListener('shopify:section:unload', this.handleSectionUnload);
  }
}

const initializedProductGalleries = new WeakSet();

function initializeProductGallery(root) {
  if (!(root instanceof HTMLElement) || initializedProductGalleries.has(root)) {
    return;
  }

  const gallery = new ProductGallery(root);

  if (gallery.init()) {
    initializedProductGalleries.add(root);
  }
}

function initializeProductGalleries(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-product-gallery]')) {
    initializeProductGallery(root);
  }

  root.querySelectorAll('[data-product-gallery]').forEach(initializeProductGallery);
}

initializeProductGalleries();

document.addEventListener('shopify:section:load', (event) => {
  initializeProductGalleries(event.target);
});
