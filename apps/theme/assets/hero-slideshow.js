const lifecycleKey = '__caliniumHeroSlideshowLifecycleBound';
const controllerMap = new WeakMap();
const activeControllers = new Set();
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class HeroSlideshow {
  constructor(root) {
    this.root = root;
    this.slides = [...root.querySelectorAll('[data-hero-slideshow-slide]')];
    this.previousButton = root.querySelector('[data-hero-slideshow-previous]');
    this.nextButton = root.querySelector('[data-hero-slideshow-next]');
    this.paginationButtons = [...root.querySelectorAll('[data-hero-slideshow-pagination]')];
    this.controls = root.querySelector('[data-hero-slideshow-controls]');
    this.pauseButton = root.querySelector('[data-hero-slideshow-pause]');
    this.autoplayEnabled = root.dataset.autoplay === 'true';
    this.autoplayInterval = Math.max(4000, Number(root.dataset.autoplayInterval) || 6000);
    this.designMode = root.dataset.designMode === 'true';
    this.activeIndex = 0;
    this.pauseReasons = new Set();
    this.userPaused = false;
    this.timer = null;
    this.observer = null;
    this.pointerStart = null;
    this.paginationHandlers = new Map();

    this.handlePrevious = () => this.goBy(-1);
    this.handleNext = () => this.goBy(1);
    this.handlePause = () => this.toggleUserPause();
    this.handlePointerDown = (event) => this.startPointer(event);
    this.handlePointerUp = (event) => this.endPointer(event);
    this.handlePointerCancel = () => { this.pointerStart = null; };
    this.handleTouchStart = (event) => this.startTouch(event);
    this.handleTouchEnd = (event) => this.endTouch(event);
    this.handlePointerEnter = () => this.setPauseReason('hover', true);
    this.handlePointerLeave = () => this.setPauseReason('hover', false);
    this.handleFocusIn = () => this.setPauseReason('focus', true);
    this.handleFocusOut = (event) => {
      if (!this.root.contains(event.relatedTarget)) this.setPauseReason('focus', false);
    };
    this.handleKeydown = (event) => this.handleKeyboard(event);
    this.handleMotionChange = () => {
      this.updatePauseButton();
      this.scheduleAutoplay();
    };
  }

  init() {
    if (this.slides.length === 0) return false;

    this.root.dataset.heroSlideshowInitialized = 'true';
    this.previousButton?.addEventListener('click', this.handlePrevious);
    this.nextButton?.addEventListener('click', this.handleNext);
    this.pauseButton?.addEventListener('click', this.handlePause);
    this.paginationButtons.forEach((button) => {
      const handler = () => this.goTo(Number(button.dataset.heroSlideshowPagination));
      this.paginationHandlers.set(button, handler);
      button.addEventListener('click', handler);
    });
    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('pointerup', this.handlePointerUp);
    this.root.addEventListener('pointercancel', this.handlePointerCancel);
    this.root.addEventListener('pointerenter', this.handlePointerEnter);
    this.root.addEventListener('pointerleave', this.handlePointerLeave);
    this.root.addEventListener('focusin', this.handleFocusIn);
    this.root.addEventListener('focusout', this.handleFocusOut);
    this.root.addEventListener('keydown', this.handleKeydown);
    reducedMotion.addEventListener?.('change', this.handleMotionChange);

    if (!('PointerEvent' in window)) {
      this.root.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.root.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }

    if (this.slides.length > 1 && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        this.setPauseReason('offscreen', !isVisible);
      }, { threshold: 0.15 });
      this.observer.observe(this.root);
    }

    this.goTo(0, false);
    if (this.slides.length > 1 && this.controls) this.controls.hidden = false;
    this.setDocumentHidden(document.hidden);
    this.updatePauseButton();
    this.scheduleAutoplay();
    return true;
  }

  goBy(direction, restartAutoplay = true) {
    const nextIndex = (this.activeIndex + direction + this.slides.length) % this.slides.length;
    this.goTo(nextIndex, restartAutoplay);
  }

  goTo(index, restartAutoplay = true) {
    if (!Number.isInteger(index) || index < 0 || index >= this.slides.length) return;

    this.activeIndex = index;
    this.slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === index;
      slide.classList.toggle('is-active', isActive);
      slide.dataset.active = String(isActive);
      slide.hidden = !isActive;
      slide.setAttribute('aria-hidden', String(!isActive));
    });
    this.paginationButtons.forEach((button, buttonIndex) => {
      if (buttonIndex === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    this.root.dataset.activeHasMedia = String(this.slides[index].classList.contains('co-hero-slideshow__slide--has-media'));

    if (restartAutoplay) this.scheduleAutoplay();
  }

  startPointer(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    this.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  endPointer(event) {
    if (!this.pointerStart || event.pointerId !== this.pointerStart.id) return;
    this.completeSwipe(event.clientX, event.clientY);
  }

  startTouch(event) {
    const touch = event.changedTouches[0];
    if (touch) this.pointerStart = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  }

  endTouch(event) {
    const touch = [...event.changedTouches].find((item) => item.identifier === this.pointerStart?.id);
    if (touch) this.completeSwipe(touch.clientX, touch.clientY);
  }

  completeSwipe(x, y) {
    if (!this.pointerStart) return;
    const deltaX = x - this.pointerStart.x;
    const deltaY = y - this.pointerStart.y;
    this.pointerStart = null;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    this.goBy(deltaX < 0 ? 1 : -1);
  }

  handleKeyboard(event) {
    if (event.defaultPrevented || this.isEditableTarget(event.target)) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.goBy(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goBy(1);
    }
  }

  isEditableTarget(target) {
    return target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  setPauseReason(reason, isPaused) {
    if (isPaused) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);
    this.scheduleAutoplay();
  }

  setDocumentHidden(isHidden) {
    this.setPauseReason('document', isHidden);
  }

  toggleUserPause() {
    this.userPaused = !this.userPaused;
    this.updatePauseButton();
    this.scheduleAutoplay();
  }

  canAutoplay() {
    return this.autoplayEnabled
      && this.slides.length > 1
      && !this.designMode
      && !reducedMotion.matches
      && !this.userPaused
      && this.pauseReasons.size === 0;
  }

  scheduleAutoplay() {
    window.clearTimeout(this.timer);
    this.timer = null;
    if (!this.canAutoplay()) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.goBy(1, false);
      this.scheduleAutoplay();
    }, this.autoplayInterval);
  }

  updatePauseButton() {
    if (!this.pauseButton) return;
    const isPaused = this.userPaused || reducedMotion.matches || this.designMode;
    this.pauseButton.textContent = isPaused ? this.root.dataset.resumeLabel || 'Resume' : this.root.dataset.pauseLabel || 'Pause';
    this.pauseButton.setAttribute('aria-pressed', String(this.userPaused));
  }

  destroy() {
    window.clearTimeout(this.timer);
    this.observer?.disconnect();
    this.previousButton?.removeEventListener('click', this.handlePrevious);
    this.nextButton?.removeEventListener('click', this.handleNext);
    this.pauseButton?.removeEventListener('click', this.handlePause);
    this.paginationHandlers.forEach((handler, button) => button.removeEventListener('click', handler));
    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('pointerup', this.handlePointerUp);
    this.root.removeEventListener('pointercancel', this.handlePointerCancel);
    this.root.removeEventListener('pointerenter', this.handlePointerEnter);
    this.root.removeEventListener('pointerleave', this.handlePointerLeave);
    this.root.removeEventListener('focusin', this.handleFocusIn);
    this.root.removeEventListener('focusout', this.handleFocusOut);
    this.root.removeEventListener('keydown', this.handleKeydown);
    this.root.removeEventListener('touchstart', this.handleTouchStart);
    this.root.removeEventListener('touchend', this.handleTouchEnd);
    reducedMotion.removeEventListener?.('change', this.handleMotionChange);
    this.root.removeAttribute('data-hero-slideshow-initialized');
    this.controls?.setAttribute('hidden', '');
    this.slides.forEach((slide) => {
      slide.hidden = false;
      slide.removeAttribute('aria-hidden');
    });
  }
}

function rootsWithin(root = document) {
  const roots = [];
  if (root instanceof HTMLElement && root.matches('[data-hero-slideshow]')) roots.push(root);
  root.querySelectorAll?.('[data-hero-slideshow]').forEach((section) => roots.push(section));
  return roots;
}

function initialize(root = document) {
  rootsWithin(root).forEach((section) => {
    if (controllerMap.has(section)) return;
    const controller = new HeroSlideshow(section);
    if (controller.init()) {
      controllerMap.set(section, controller);
      activeControllers.add(controller);
    }
  });
}

function destroy(root) {
  rootsWithin(root).forEach((section) => {
    const controller = controllerMap.get(section);
    if (!controller) return;
    controller.destroy();
    controllerMap.delete(section);
    activeControllers.delete(controller);
  });
}

function selectBlock(event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const section = target?.closest('[data-hero-slideshow]');
  const controller = section ? controllerMap.get(section) : null;
  if (!controller) return;
  const selectedSlide = target.closest('[data-hero-slideshow-slide]')
    || controller.slides.find((slide) => slide.dataset.heroSlideshowBlockId === event.detail?.blockId);
  if (!selectedSlide) return;
  controller.goTo(Number(selectedSlide.dataset.heroSlideshowIndex), false);
  controller.setPauseReason('editor', true);
}

function bindLifecycle() {
  if (window[lifecycleKey]) return;
  window[lifecycleKey] = true;

  const initializeDocument = () => initialize(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeDocument, { once: true });
  else initializeDocument();

  document.addEventListener('visibilitychange', () => {
    activeControllers.forEach((controller) => controller.setDocumentHidden(document.hidden));
  });
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => destroy(event.target));
  document.addEventListener('shopify:block:select', selectBlock);
}

bindLifecycle();
