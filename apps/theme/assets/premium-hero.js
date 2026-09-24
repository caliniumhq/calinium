/* Progressive enhancement for the canonical Calinium Premium Hero. */
const controllerMap = new WeakMap();
const activeControllers = new Set();
const lifecycleKey = '__caliniumPremiumHeroLifecycleV1';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

class PremiumHeroController {
  constructor(root) {
    this.root = root;
    this.slides = [...root.querySelectorAll('[data-premium-hero-slide]')];
    this.previous = root.querySelector('[data-premium-hero-previous]');
    this.next = root.querySelector('[data-premium-hero-next]');
    this.pause = root.querySelector('[data-premium-hero-pause]');
    this.pagination = [...root.querySelectorAll('[data-premium-hero-pagination]')];
    this.counter = root.querySelector('[data-premium-hero-counter]');
    this.videos = [...root.querySelectorAll('video')];
    this.index = Math.max(0, this.slides.findIndex((slide) => !slide.hidden));
    this.timer = null;
    this.pointerStart = null;
    this.userPaused = false;
    this.hoverPaused = false;
    this.hiddenPaused = document.hidden;
    this.editorPaused = false;
    this.userInteracted = false;
    this.autoplay = root.dataset.premiumHeroAutoplay === 'true';
    this.interval = Math.max(4000, Number(root.dataset.premiumHeroInterval) || 6000);
    this.onPrevious = () => this.goBy(-1, true);
    this.onNext = () => this.goBy(1, true);
    this.onPause = () => this.togglePause();
    this.onKeydown = (event) => this.handleKeydown(event);
    this.onPointerDown = (event) => { this.pointerStart = event.clientX; };
    this.onPointerUp = (event) => this.handleSwipe(event);
    this.onPointerEnter = () => { this.hoverPaused = true; this.updateTimer(); };
    this.onPointerLeave = () => { this.hoverPaused = false; this.updateTimer(); };
    this.onFocusIn = () => { this.hoverPaused = true; this.updateTimer(); };
    this.onFocusOut = (event) => { if (!this.root.contains(event.relatedTarget)) { this.hoverPaused = false; this.updateTimer(); } };
    this.onPagination = (event) => this.goTo(Number(event.currentTarget.dataset.premiumHeroPagination), true);
  }

  init() {
    if (this.slides.length > 1) {
      this.root.querySelector('[data-premium-hero-controls]')?.removeAttribute('hidden');
      this.previous?.addEventListener('click', this.onPrevious);
      this.next?.addEventListener('click', this.onNext);
      this.pause?.addEventListener('click', this.onPause);
      this.pagination.forEach((button) => button.addEventListener('click', this.onPagination));
      this.root.addEventListener('keydown', this.onKeydown);
      this.root.addEventListener('pointerdown', this.onPointerDown, { passive: true });
      this.root.addEventListener('pointerup', this.onPointerUp, { passive: true });
      this.root.addEventListener('pointerenter', this.onPointerEnter);
      this.root.addEventListener('pointerleave', this.onPointerLeave);
      this.root.addEventListener('focusin', this.onFocusIn);
      this.root.addEventListener('focusout', this.onFocusOut);
    }
    this.root.dataset.premiumHeroInitialized = 'true';
    this.goTo(this.index, false);
    this.updateTimer();
    return true;
  }

  handleKeydown(event) {
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); this.goBy(-1, true); }
    if (event.key === 'ArrowRight') { event.preventDefault(); this.goBy(1, true); }
  }

  handleSwipe(event) {
    if (this.pointerStart === null) return;
    const distance = event.clientX - this.pointerStart;
    this.pointerStart = null;
    if (Math.abs(distance) < 44) return;
    this.goBy(distance > 0 ? -1 : 1, true);
  }

  goBy(direction, userInitiated) {
    if (this.slides.length < 2) return;
    this.goTo((this.index + direction + this.slides.length) % this.slides.length, userInitiated);
  }

  goTo(index, userInitiated) {
    const next = this.slides[index];
    if (!next) return;
    if (userInitiated) this.userInteracted = true;
    this.index = index;
    this.slides.forEach((slide, slideIndex) => {
      const active = slideIndex === index;
      slide.hidden = !active;
      slide.toggleAttribute('inert', !active);
      slide.dataset.active = String(active);
    });
    this.pagination.forEach((button, buttonIndex) => button.toggleAttribute('aria-current', buttonIndex === index));
    if (this.counter) this.counter.textContent = `${index + 1} / ${this.slides.length}`;
    this.pauseInactiveVideo();
    this.updateTimer();
  }

  pauseInactiveVideo() {
    this.videos.forEach((video) => {
      if (!video.closest('[data-premium-hero-slide]')?.hidden && !document.hidden && !reducedMotion() && video.autoplay) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }

  togglePause() {
    this.userPaused = !this.userPaused;
    this.pause?.setAttribute('aria-pressed', String(this.userPaused));
    if (this.pause) this.pause.textContent = this.userPaused ? this.root.dataset.premiumHeroResumeLabel : this.root.dataset.premiumHeroPauseLabel;
    this.updateTimer();
  }

  setDocumentHidden(hidden) {
    this.hiddenPaused = hidden;
    this.pauseInactiveVideo();
    this.updateTimer();
  }

  setEditorPaused(paused) {
    this.editorPaused = paused;
    this.updateTimer();
  }

  updateTimer() {
    window.clearInterval(this.timer);
    this.timer = null;
    const mayAdvance = this.autoplay && this.slides.length > 1 && !reducedMotion() && !this.userPaused && !this.hoverPaused && !this.hiddenPaused && !this.editorPaused && !this.userInteracted;
    if (mayAdvance) this.timer = window.setInterval(() => this.goBy(1, false), this.interval);
  }

  selectBlock(blockId) {
    const index = this.slides.findIndex((slide) => slide.dataset.premiumHeroBlockId === blockId);
    if (index >= 0) this.goTo(index, true);
  }

  destroy() {
    window.clearInterval(this.timer);
    this.previous?.removeEventListener('click', this.onPrevious);
    this.next?.removeEventListener('click', this.onNext);
    this.pause?.removeEventListener('click', this.onPause);
    this.pagination.forEach((button) => button.removeEventListener('click', this.onPagination));
    this.root.removeEventListener('keydown', this.onKeydown);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointerenter', this.onPointerEnter);
    this.root.removeEventListener('pointerleave', this.onPointerLeave);
    this.root.removeEventListener('focusin', this.onFocusIn);
    this.root.removeEventListener('focusout', this.onFocusOut);
    this.videos.forEach((video) => video.pause());
  }
}

function rootsWithin(root) {
  if (!(root instanceof Element || root instanceof Document)) return [];
  const own = root instanceof Element && root.matches('[data-premium-hero]') ? [root] : [];
  return [...own, ...root.querySelectorAll('[data-premium-hero]')];
}

function initialize(root = document) {
  rootsWithin(root).forEach((section) => {
    if (controllerMap.has(section)) return;
    const controller = new PremiumHeroController(section);
    if (controller.init()) { controllerMap.set(section, controller); activeControllers.add(controller); }
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
  const target = event.target instanceof Element ? event.target : null;
  const section = target?.closest('[data-premium-hero]');
  const controller = section ? controllerMap.get(section) : null;
  if (controller && event.detail?.blockId) controller.selectBlock(event.detail.blockId);
}

function controllerForEvent(event) {
  const target = event.target instanceof Element ? event.target : null;
  const section = target?.closest('[data-premium-hero]');
  return section ? controllerMap.get(section) : null;
}

function bindLifecycle() {
  if (window[lifecycleKey]) return;
  window[lifecycleKey] = true;
  const ready = () => initialize(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  document.addEventListener('visibilitychange', () => activeControllers.forEach((controller) => controller.setDocumentHidden(document.hidden)));
  document.addEventListener('shopify:section:load', (event) => initialize(event.target));
  document.addEventListener('shopify:section:unload', (event) => destroy(event.target));
  document.addEventListener('shopify:section:select', (event) => initialize(event.target));
  document.addEventListener('shopify:section:deselect', (event) => controllerForEvent(event)?.setEditorPaused(true));
  document.addEventListener('shopify:block:select', selectBlock);
  document.addEventListener('shopify:block:deselect', (event) => controllerForEvent(event)?.setEditorPaused(false));
}

bindLifecycle();
