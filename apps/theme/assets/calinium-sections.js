/**
 * Shared, progressively enhanced behaviors for Calinium library sections.
 * Controllers are instance-scoped and are destroyed when Theme Editor reloads
 * or removes their section.
 */
const sectionControllers = new WeakMap();
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getControllerMap(section) {
  let controllers = sectionControllers.get(section);

  if (!controllers) {
    controllers = new Map();
    sectionControllers.set(section, controllers);
  }

  return controllers;
}

class ScrollCarousel {
  constructor(root) {
    this.root = root;
    this.track = root.querySelector('[data-carousel-track]');
    this.slides = [...root.querySelectorAll('[data-carousel-slide]')];
    this.previousButton = root.querySelector('[data-action="carousel-prev"]');
    this.nextButton = root.querySelector('[data-action="carousel-next"]');
    this.pauseButton = root.querySelector('[data-action="carousel-pause"]');
    this.dots = [...root.querySelectorAll('[data-carousel-dot]')];
    this.autoRotate = root.dataset.autoRotate === 'true' && !prefersReducedMotion.matches;
    this.rotationSpeed = Math.max(3000, Number(root.dataset.rotationSpeed) || 6000);
    this.userPaused = false;
    this.hoverPaused = false;
    this.inViewport = true;
    this.timer = null;
    this.scrollFrame = null;
    this.observer = null;

    this.handlePrevious = () => this.goBy(-1);
    this.handleNext = () => this.goBy(1);
    this.handlePause = () => this.togglePause();
    this.handleDotClick = (event) => this.goTo(Number(event.currentTarget.dataset.carouselDot));
    this.handleScroll = () => this.scheduleStateUpdate();
    this.handleKeydown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.goBy(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.goBy(1);
      }
    };
    this.handlePointerEnter = () => this.setHoverPaused(true);
    this.handlePointerLeave = () => this.setHoverPaused(false);
    this.handleFocusIn = () => this.setHoverPaused(true);
    this.handleFocusOut = (event) => {
      if (!this.root.contains(event.relatedTarget)) {
        this.setHoverPaused(false);
      }
    };
  }

  init() {
    if (!this.track || this.slides.length === 0) {
      return false;
    }

    this.root.dataset.carouselEnhanced = 'true';
    this.previousButton?.addEventListener('click', this.handlePrevious);
    this.nextButton?.addEventListener('click', this.handleNext);
    this.pauseButton?.addEventListener('click', this.handlePause);
    this.dots.forEach((dot) => dot.addEventListener('click', this.handleDotClick));
    this.track.addEventListener('scroll', this.handleScroll, { passive: true });
    this.root.addEventListener('keydown', this.handleKeydown);
    this.root.addEventListener('pointerenter', this.handlePointerEnter);
    this.root.addEventListener('pointerleave', this.handlePointerLeave);
    this.root.addEventListener('focusin', this.handleFocusIn);
    this.root.addEventListener('focusout', this.handleFocusOut);

    if ('IntersectionObserver' in window && this.autoRotate) {
      this.observer = new IntersectionObserver((entries) => {
        this.inViewport = entries.some((entry) => entry.isIntersecting);
        this.updateTimer();
      }, { threshold: 0.2 });
      this.observer.observe(this.root);
    }

    this.updateState();
    this.updateTimer();
    return true;
  }

  get activeIndex() {
    const scrollLeft = this.track.scrollLeft;
    let closestIndex = 0;
    let closestDistance = Infinity;

    this.slides.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - this.track.offsetLeft - scrollLeft);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    return closestIndex;
  }

  goBy(direction) {
    const nextIndex = (this.activeIndex + direction + this.slides.length) % this.slides.length;
    this.goTo(nextIndex);
  }

  goTo(index) {
    const slide = this.slides[index];
    if (!slide) {
      return;
    }

    this.track.scrollTo({
      left: slide.offsetLeft - this.track.offsetLeft,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth'
    });
  }

  scheduleStateUpdate() {
    window.cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = window.requestAnimationFrame(() => this.updateState());
  }

  updateState() {
    const activeIndex = this.activeIndex;
    this.dots.forEach((dot, index) => dot.toggleAttribute('aria-current', index === activeIndex));
  }

  activateBlock(blockId) {
    const selectedBlock = this.root.querySelector(`[data-shopify-editor-block*="${CSS.escape(blockId)}"]`);
    const slide = selectedBlock?.closest('[data-carousel-slide]');
    const index = slide ? this.slides.indexOf(slide) : -1;
    if (index >= 0) this.goTo(index);
  }

  setHoverPaused(isPaused) {
    this.hoverPaused = isPaused;
    this.updateTimer();
  }

  togglePause() {
    this.userPaused = !this.userPaused;
    this.root.dataset.carouselPaused = String(this.userPaused);
    if (this.pauseButton) {
      this.pauseButton.textContent = this.userPaused ? this.root.dataset.resumeLabel || '' : this.root.dataset.pauseLabel || '';
      this.pauseButton.setAttribute('aria-pressed', String(this.userPaused));
    }
    this.updateTimer();
  }

  updateTimer() {
    window.clearInterval(this.timer);
    this.timer = null;

    if (this.autoRotate && !this.userPaused && !this.hoverPaused && this.inViewport) {
      this.timer = window.setInterval(() => this.goBy(1), this.rotationSpeed);
    }
  }

  destroy() {
    window.clearInterval(this.timer);
    window.cancelAnimationFrame(this.scrollFrame);
    this.observer?.disconnect();
    this.previousButton?.removeEventListener('click', this.handlePrevious);
    this.nextButton?.removeEventListener('click', this.handleNext);
    this.pauseButton?.removeEventListener('click', this.handlePause);
    this.dots.forEach((dot) => dot.removeEventListener('click', this.handleDotClick));
    this.track?.removeEventListener('scroll', this.handleScroll);
    this.root.removeEventListener('keydown', this.handleKeydown);
    this.root.removeEventListener('pointerenter', this.handlePointerEnter);
    this.root.removeEventListener('pointerleave', this.handlePointerLeave);
    this.root.removeEventListener('focusin', this.handleFocusIn);
    this.root.removeEventListener('focusout', this.handleFocusOut);
  }
}

class CommerceTabsController {
  constructor(root) {
    this.root = root;
    this.tabs = [...root.querySelectorAll('[data-commerce-tab]')];
    this.panels = [...root.querySelectorAll('[data-commerce-tab-panel]')];
    this.handleClick = (event) => this.activate(event.currentTarget.dataset.commerceTab, true);
    this.handleKeydown = (event) => this.handleTabKeydown(event);
  }

  init() {
    if (this.tabs.length < 2 || this.panels.length < 2) return false;
    this.root.dataset.commerceTabsEnhanced = 'true';
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', this.handleClick);
      tab.addEventListener('keydown', this.handleKeydown);
    });
    this.activate(this.tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.dataset.commerceTab || this.tabs[0].dataset.commerceTab, false);
    return true;
  }

  handleTabKeydown(event) {
    const index = this.tabs.indexOf(event.currentTarget);
    if (index < 0) return;
    let nextIndex = null;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = this.tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = this.tabs[nextIndex];
    this.activate(nextTab.dataset.commerceTab, true);
    nextTab.focus();
  }

  activate(id, moveFocus) {
    if (!id) return;
    this.tabs.forEach((tab) => {
      const isActive = tab.dataset.commerceTab === id;
      tab.setAttribute('aria-selected', String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
      if (isActive && moveFocus) tab.focus();
    });
    this.panels.forEach((panel) => {
      const isActive = panel.dataset.commerceTabPanel === id;
      panel.hidden = !isActive;
      panel.toggleAttribute('data-tab-active', isActive);
    });
  }

  activateBlock(blockId) {
    const selectedBlock = this.root.querySelector(`[data-shopify-editor-block*="${CSS.escape(blockId)}"]`);
    const panel = selectedBlock?.closest('[data-commerce-tab-panel]');
    if (panel) this.activate(panel.dataset.commerceTabPanel, false);
  }

  destroy() {
    this.tabs.forEach((tab) => {
      tab.removeEventListener('click', this.handleClick);
      tab.removeEventListener('keydown', this.handleKeydown);
    });
  }
}

class ShopTheLookController {
  constructor(root) {
    this.root = root;
    this.markers = [...root.querySelectorAll('[data-look-marker]')];
    this.panels = [...root.querySelectorAll('[data-look-product]')];
    this.handleClick = (event) => this.activate(event.currentTarget.dataset.lookMarker, true);
  }

  init() {
    if (this.markers.length === 0 || this.panels.length === 0) return false;
    this.root.dataset.shopTheLookEnhanced = 'true';
    this.markers.forEach((marker) => marker.addEventListener('click', this.handleClick));
    this.activate(this.markers[0].dataset.lookMarker, false);
    return true;
  }

  activate(id, moveFocus) {
    if (!id) return;
    this.markers.forEach((marker) => marker.setAttribute('aria-pressed', String(marker.dataset.lookMarker === id)));
    this.panels.forEach((panel) => {
      const isActive = panel.dataset.lookProduct === id;
      panel.hidden = !isActive;
      panel.toggleAttribute('data-look-active', isActive);
      if (isActive && moveFocus) panel.querySelector('a, button, input, select')?.focus({ preventScroll: true });
    });
  }

  activateBlock(blockId) {
    const selectedBlock = this.root.querySelector(`[data-shopify-editor-block*="${CSS.escape(blockId)}"]`);
    const panel = selectedBlock?.closest('[data-look-product]');
    if (panel) this.activate(panel.dataset.lookProduct, false);
  }

  destroy() {
    this.markers.forEach((marker) => marker.removeEventListener('click', this.handleClick));
  }
}

class RecentlyViewedController {
  constructor(root) {
    this.root = root;
    this.sectionId = root.dataset.sectionId;
    this.currentHandle = root.dataset.currentProductHandle || '';
    this.limit = Math.min(12, Math.max(1, Number(root.dataset.recentlyViewedLimit) || 4));
    this.renderUrl = root.dataset.recentlyViewedUrl || window.location.pathname;
    this.storageKey = 'calinium:recently-viewed:v1';
    this.abortController = null;
    this.idleCallback = null;
    this.pendingHandles = null;
    this.handleVisibilityChange = () => {
      if (!document.hidden && this.pendingHandles) {
        const handles = this.pendingHandles;
        this.pendingHandles = null;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.load(handles);
      }
    };
  }

  init() {
    if (!this.sectionId || !window.fetch) return false;
    const history = this.readHistory();
    const nextHistory = this.currentHandle ? [this.currentHandle, ...history.filter((handle) => handle !== this.currentHandle)].slice(0, 24) : history;
    if (this.currentHandle) this.writeHistory(nextHistory);
    const handles = nextHistory.filter((handle) => handle !== this.currentHandle).slice(0, this.limit);
    if (handles.length === 0) {
      if (this.root.dataset.designMode !== 'true') this.root.hidden = true;
      return true;
    }
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 0));
    this.idleCallback = schedule(() => this.load(handles));
    return true;
  }

  readHistory() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(this.storageKey) || '[]');
      if (!Array.isArray(stored)) return [];
      return [...new Set(stored.filter((handle) => typeof handle === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(handle)))].slice(0, 24);
    } catch (_) {
      return [];
    }
  }

  writeHistory(handles) {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(handles));
    } catch (_) {
      // Storage can be unavailable; the section simply remains empty.
    }
  }

  async load(handles) {
    if (document.hidden) {
      this.pendingHandles = handles;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      return;
    }
    this.abortController = new AbortController();
    const url = new URL(this.renderUrl, window.location.origin);
    url.searchParams.set('section_id', this.sectionId);
    url.searchParams.set('recently_viewed_handles', handles.join(','));
    try {
      const response = await fetch(url.toString(), { headers: { Accept: 'text/html' }, signal: this.abortController.signal });
      if (!response.ok) throw new Error('Recently viewed request failed.');
      const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextContent = documentFragment.querySelector('[data-recently-viewed-content]');
      const content = this.root.querySelector('[data-recently-viewed-content]');
      if (!nextContent || !content) throw new Error('Recently viewed markup is unavailable.');
      content.replaceWith(nextContent);
      if (!nextContent.hasAttribute('data-recently-viewed-results') && this.root.dataset.designMode !== 'true') this.root.hidden = true;
      document.dispatchEvent(new CustomEvent('calinium:content:replace', { detail: { root: this.root } }));
    } catch (error) {
      if (error.name !== 'AbortError' && this.root.dataset.designMode !== 'true') this.root.hidden = true;
    } finally {
      this.abortController = null;
    }
  }

  destroy() {
    this.abortController?.abort();
    if (this.idleCallback && window.cancelIdleCallback) window.cancelIdleCallback(this.idleCallback);
    else if (this.idleCallback) window.clearTimeout(this.idleCallback);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

class CommerceRecommendationController {
  constructor(root) {
    this.root = root;
    this.url = root.dataset.recommendationUrl;
    this.abortController = null;
    this.pendingLoad = false;
    this.handleVisibilityChange = () => {
      if (!document.hidden && this.pendingLoad) {
        this.pendingLoad = false;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        this.load();
      }
    };
  }

  init() {
    if (!this.url || !window.fetch || this.root.dataset.recommendationRequested === 'true') return false;
    this.root.dataset.recommendationRequested = 'true';
    if (document.hidden) {
      this.pendingLoad = true;
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    } else {
      this.load();
    }
    return true;
  }

  async load() {
    this.abortController = new AbortController();
    try {
      const response = await fetch(this.url, { headers: { Accept: 'text/html' }, signal: this.abortController.signal });
      if (!response.ok) throw new Error('Recommendation request failed.');
      const documentFragment = new DOMParser().parseFromString(await response.text(), 'text/html');
      const nextContent = documentFragment.querySelector('[data-commerce-recommendation-content]');
      const content = this.root.querySelector('[data-commerce-recommendation-content]');
      if (!nextContent || !content) throw new Error('Recommendation markup is unavailable.');
      content.replaceWith(nextContent);
      if (!nextContent.hasAttribute('data-commerce-recommendation-results') && this.root.dataset.designMode !== 'true') this.root.hidden = true;
      document.dispatchEvent(new CustomEvent('calinium:content:replace', { detail: { root: this.root } }));
    } catch (error) {
      if (error.name !== 'AbortError' && this.root.dataset.designMode !== 'true') this.root.hidden = true;
    } finally {
      this.abortController = null;
    }
  }

  destroy() {
    this.abortController?.abort();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

class MarqueeController {
  constructor(root) {
    this.root = root;
    this.button = root.querySelector('[data-action="marquee-pause"]');
    this.handleClick = () => this.toggle();
  }

  init() {
    if (!this.button) {
      return false;
    }

    this.button.addEventListener('click', this.handleClick);
    return true;
  }

  toggle() {
    const isPaused = this.root.dataset.marqueePaused !== 'true';
    this.root.dataset.marqueePaused = String(isPaused);
    this.button.textContent = isPaused ? this.root.dataset.resumeLabel || '' : this.root.dataset.pauseLabel || '';
    this.button.setAttribute('aria-pressed', String(isPaused));
  }

  destroy() {
    this.button?.removeEventListener('click', this.handleClick);
  }
}

class FaqController {
  constructor(root) {
    this.root = root;
    this.items = [...root.querySelectorAll('[data-faq-item]')];
    this.allowMultiple = root.dataset.allowMultiple === 'true';
    this.handleClick = (event) => {
      const button = event.currentTarget;
      const item = button.closest('[data-faq-item]');
      this.setOpen(item, button.getAttribute('aria-expanded') !== 'true');
    };
  }

  init() {
    if (this.items.length === 0) return false;

    this.items.forEach((item) => {
      const button = item.querySelector('[data-faq-trigger]');
      button?.addEventListener('click', this.handleClick);
      this.setOpen(item, item.dataset.initialOpen === 'true', false);
    });
    return true;
  }

  setOpen(item, isOpen, closeOthers = true) {
    if (!item) return;
    if (isOpen && !this.allowMultiple && closeOthers) {
      this.items.filter((otherItem) => otherItem !== item).forEach((otherItem) => this.setOpen(otherItem, false, false));
    }
    const button = item.querySelector('[data-faq-trigger]');
    const panel = item.querySelector('[data-faq-panel]');
    button?.setAttribute('aria-expanded', String(isOpen));
    panel?.toggleAttribute('hidden', !isOpen);
    item.toggleAttribute('data-open', isOpen);
  }

  destroy() {
    this.items.forEach((item) => item.querySelector('[data-faq-trigger]')?.removeEventListener('click', this.handleClick));
  }
}

class VideoController {
  constructor(root) {
    this.root = root;
    this.facade = root.querySelector('[data-video-facade]');
    this.playButton = root.querySelector('[data-video-play]');
    this.toggleButton = root.querySelector('[data-video-toggle]');
    this.toggleLabel = root.querySelector('[data-video-toggle-label]');
    this.video = root.querySelector('video');
    this.observer = null;
    this.inViewport = true;
    this.userPaused = false;
    this.resumeOnVisible = false;
    this.handleFacade = () => this.loadFacade();
    this.handlePlay = () => this.playHosted();
    this.handleToggle = () => this.toggleHosted();
    this.handleVideoPlay = () => this.updateToggleState();
    this.handleVideoPause = () => this.updateToggleState();
    this.handleVisibilityChange = () => this.handleDocumentVisibility();
  }

  init() {
    this.facade?.addEventListener('click', this.handleFacade);
    this.playButton?.addEventListener('click', this.handlePlay);
    this.toggleButton?.addEventListener('click', this.handleToggle);
    this.video?.addEventListener('play', this.handleVideoPlay);
    this.video?.addEventListener('pause', this.handleVideoPause);

    if (this.video && 'IntersectionObserver' in window && this.video.autoplay) {
      this.observer = new IntersectionObserver((entries) => {
        this.inViewport = entries.some((entry) => entry.isIntersecting);
        if (!this.inViewport) {
          this.video.pause();
        } else {
          this.resumeAutoplay();
        }
      }, { threshold: 0.15 });
      this.observer.observe(this.video);

      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      if (prefersReducedMotion.matches) this.video.pause();
    }

    this.updateToggleState();
    return Boolean(this.facade || this.playButton || this.toggleButton || this.video);
  }

  loadFacade() {
    if (!this.facade?.dataset.videoEmbedUrl) return;
    const iframe = document.createElement('iframe');
    iframe.className = 'co-video__embed';
    iframe.src = this.facade.dataset.videoEmbedUrl;
    iframe.title = this.facade.dataset.videoTitle || 'Video';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    this.facade.replaceWith(iframe);
    this.facade = null;
  }

  playHosted() {
    if (!this.video) return;
    this.video.play().then(() => this.playButton?.setAttribute('hidden', '')).catch(() => {});
  }

  toggleHosted() {
    if (!this.video) return;
    if (this.video.paused) {
      this.userPaused = false;
      this.video.play().catch(() => {});
    } else {
      this.userPaused = true;
      this.video.pause();
    }
  }

  handleDocumentVisibility() {
    if (!this.video?.autoplay) return;
    if (document.hidden) {
      this.resumeOnVisible = !this.video.paused;
      this.video.pause();
    } else if (this.resumeOnVisible) {
      this.resumeOnVisible = false;
      this.resumeAutoplay();
    }
  }

  resumeAutoplay() {
    if (!this.video?.autoplay || this.userPaused || document.hidden || !this.inViewport || prefersReducedMotion.matches) return;
    this.video.play().catch(() => {});
  }

  updateToggleState() {
    if (!this.toggleButton || !this.video) return;
    const isPlaying = !this.video.paused;
    this.toggleButton.setAttribute('aria-pressed', String(isPlaying));
    if (this.toggleLabel) this.toggleLabel.textContent = isPlaying ? this.root.dataset.pauseLabel || '' : this.root.dataset.playLabel || '';
  }

  destroy() {
    this.facade?.removeEventListener('click', this.handleFacade);
    this.playButton?.removeEventListener('click', this.handlePlay);
    this.toggleButton?.removeEventListener('click', this.handleToggle);
    this.video?.removeEventListener('play', this.handleVideoPlay);
    this.video?.removeEventListener('pause', this.handleVideoPause);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.observer?.disconnect();
  }
}

class BeforeAfterController {
  constructor(root) {
    this.root = root;
    this.range = root.querySelector('[data-before-after-range]');
    this.handleInput = () => this.root.style.setProperty('--co-before-after-position', `${this.range.value}%`);
  }

  init() {
    if (!this.range) return false;
    this.range.addEventListener('input', this.handleInput);
    this.handleInput();
    return true;
  }

  destroy() {
    this.range?.removeEventListener('input', this.handleInput);
  }
}

class CountdownController {
  constructor(root) {
    this.root = root;
    this.date = root.dataset.endDate || '';
    this.time = root.dataset.endTime || '';
    this.timezone = root.dataset.timezone || 'visitor';
    this.completion = root.dataset.completion || 'message';
    this.days = root.querySelector('[data-countdown-days]');
    this.hours = root.querySelector('[data-countdown-hours]');
    this.minutes = root.querySelector('[data-countdown-minutes]');
    this.seconds = root.querySelector('[data-countdown-seconds]');
    this.message = root.querySelector('[data-countdown-message]');
    this.timer = null;
    this.target = null;
  }

  init() {
    const expression = this.timezone === 'utc' ? `${this.date}T${this.time}:00Z` : `${this.date}T${this.time}:00`;
    const target = new Date(expression);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.date) || !/^\d{2}:\d{2}$/.test(this.time) || Number.isNaN(target.getTime())) {
      this.showMessage(this.root.dataset.invalidMessage || '');
      return true;
    }
    this.target = target;
    this.tick();
    this.timer = window.setInterval(() => this.tick(), 1000);
    return true;
  }

  tick() {
    const remaining = Math.max(0, this.target.getTime() - Date.now());
    if (remaining === 0) {
      this.setValues(0, 0, 0, 0);
      window.clearInterval(this.timer);
      if (this.completion === 'hide') this.root.hidden = true;
      if (this.completion === 'message') this.showMessage(this.message?.textContent || '');
      return;
    }
    const seconds = Math.floor(remaining / 1000);
    this.setValues(Math.floor(seconds / 86400), Math.floor((seconds % 86400) / 3600), Math.floor((seconds % 3600) / 60), seconds % 60);
  }

  setValues(days, hours, minutes, seconds) {
    if (this.days) this.days.textContent = String(days);
    if (this.hours) this.hours.textContent = String(hours).padStart(2, '0');
    if (this.minutes) this.minutes.textContent = String(minutes).padStart(2, '0');
    if (this.seconds) this.seconds.textContent = String(seconds).padStart(2, '0');
  }

  showMessage(message) {
    if (!this.message || !message) return;
    this.message.textContent = message;
    this.message.hidden = false;
  }

  destroy() {
    window.clearInterval(this.timer);
  }
}

function initializeSection(section) {
  if (!(section instanceof HTMLElement)) {
    return;
  }

  const controllers = getControllerMap(section);

  if (section.matches('[data-co-carousel]') && !controllers.has('carousel')) {
    const carousel = new ScrollCarousel(section);
    if (carousel.init()) controllers.set('carousel', carousel);
  }

  if (section.matches('[data-commerce-tabs]') && !controllers.has('commerce-tabs')) {
    const tabs = new CommerceTabsController(section);
    if (tabs.init()) controllers.set('commerce-tabs', tabs);
  }

  if (section.matches('[data-shop-the-look]') && !controllers.has('shop-the-look')) {
    const shopTheLook = new ShopTheLookController(section);
    if (shopTheLook.init()) controllers.set('shop-the-look', shopTheLook);
  }

  if (section.matches('[data-recently-viewed]') && !controllers.has('recently-viewed')) {
    const recentlyViewed = new RecentlyViewedController(section);
    if (recentlyViewed.init()) controllers.set('recently-viewed', recentlyViewed);
  }

  if (section.matches('[data-commerce-recommendation]') && !controllers.has('commerce-recommendation')) {
    const recommendation = new CommerceRecommendationController(section);
    if (recommendation.init()) controllers.set('commerce-recommendation', recommendation);
  }

  if (section.matches('[data-co-marquee]') && !controllers.has('marquee')) {
    const marquee = new MarqueeController(section);
    if (marquee.init()) controllers.set('marquee', marquee);
  }

  if (section.matches('[data-co-faq]') && !controllers.has('faq')) {
    const faq = new FaqController(section);
    if (faq.init()) controllers.set('faq', faq);
  }

  if (section.matches('[data-co-video]') && !controllers.has('video')) {
    const video = new VideoController(section);
    if (video.init()) controllers.set('video', video);
  }

  if (section.matches('[data-co-before-after]') && !controllers.has('before-after')) {
    const beforeAfter = new BeforeAfterController(section);
    if (beforeAfter.init()) controllers.set('before-after', beforeAfter);
  }

  if (section.matches('[data-co-countdown]') && !controllers.has('countdown')) {
    const countdown = new CountdownController(section);
    if (countdown.init()) controllers.set('countdown', countdown);
  }
}

function initializeSectionBehaviors(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-co-section-behavior]')) initializeSection(root);
  root.querySelectorAll?.('[data-co-section-behavior]').forEach(initializeSection);
}

function destroySectionBehaviors(root) {
  if (!(root instanceof HTMLElement)) return;

  const sections = [root, ...root.querySelectorAll('[data-co-section-behavior]')];
  sections.forEach((section) => {
    const controllers = sectionControllers.get(section);
    controllers?.forEach((controller) => controller.destroy());
    sectionControllers.delete(section);
  });
}

initializeSectionBehaviors();
document.addEventListener('shopify:section:load', (event) => initializeSectionBehaviors(event.target));
document.addEventListener('shopify:section:unload', (event) => destroySectionBehaviors(event.target));
document.addEventListener('shopify:block:select', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  const section = event.target.closest('[data-co-section-behavior]');
  const controllers = section ? sectionControllers.get(section) : null;
  const blockId = event.detail?.blockId;
  if (!controllers || !blockId) return;
  controllers.get('commerce-tabs')?.activateBlock(blockId);
  controllers.get('shop-the-look')?.activateBlock(blockId);
  controllers.get('carousel')?.activateBlock(blockId);
});
