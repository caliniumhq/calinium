/**
 * Rotates announcement blocks only when a merchant enables it. The first
 * message remains server-rendered and useful if JavaScript is unavailable.
 */
class AnnouncementBar {
  constructor(root) {
    this.root = root;
    this.messages = [...root.querySelectorAll('[data-announcement-message]')];
    this.interval = Math.max(3000, Number(root.dataset.announcementInterval) || 6000);
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.activeIndex = 0;
    this.timer = null;
    this.isPaused = false;

    this.pause = this.pause.bind(this);
    this.resume = this.resume.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  init() {
    if (this.messages.length < 2 || this.reducedMotion.matches) {
      return false;
    }

    this.messages.forEach((message, index) => {
      message.hidden = index !== 0;
    });
    this.root.dataset.announcementEnhanced = 'true';
    this.root.addEventListener('mouseenter', this.pause);
    this.root.addEventListener('mouseleave', this.resume);
    this.root.addEventListener('focusin', this.pause);
    this.root.addEventListener('focusout', this.resume);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.start();
    return true;
  }

  start() {
    if (this.isPaused || this.timer || document.hidden) {
      return;
    }
    this.timer = window.setInterval(() => this.showNext(), this.interval);
  }

  pause() {
    this.isPaused = true;
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  resume(event) {
    if (event?.type === 'focusout' && this.root.contains(event.relatedTarget)) {
      return;
    }
    this.isPaused = false;
    this.start();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pause();
    } else {
      this.isPaused = false;
      this.start();
    }
  }

  showNext() {
    this.messages[this.activeIndex].hidden = true;
    this.activeIndex = (this.activeIndex + 1) % this.messages.length;
    this.messages[this.activeIndex].hidden = false;
  }

  destroy() {
    this.pause();
    this.root.removeEventListener('mouseenter', this.pause);
    this.root.removeEventListener('mouseleave', this.resume);
    this.root.removeEventListener('focusin', this.pause);
    this.root.removeEventListener('focusout', this.resume);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}

const initializedBars = new WeakMap();

function initializeAnnouncementBar(root) {
  if (!(root instanceof HTMLElement) || initializedBars.has(root)) {
    return;
  }

  const bar = new AnnouncementBar(root);
  if (bar.init()) {
    initializedBars.set(root, bar);
  }
}

function initializeAnnouncementBars(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-announcement-bar]')) {
    initializeAnnouncementBar(root);
  }
  root.querySelectorAll?.('[data-announcement-bar]').forEach(initializeAnnouncementBar);
}

function destroyAnnouncementBars(root) {
  if (!(root instanceof HTMLElement)) {
    return;
  }
  const bars = [];
  if (root.matches('[data-announcement-bar]')) {
    bars.push(root);
  }
  root.querySelectorAll('[data-announcement-bar]').forEach((bar) => bars.push(bar));
  bars.forEach((bar) => {
    initializedBars.get(bar)?.destroy();
    initializedBars.delete(bar);
  });
}

initializeAnnouncementBars();
document.addEventListener('shopify:section:load', (event) => initializeAnnouncementBars(event.target));
document.addEventListener('shopify:section:unload', (event) => destroyAnnouncementBars(event.target));
