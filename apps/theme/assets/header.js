/**
 * Calinium header enhancements. Navigation, search, and cart links remain
 * usable without JavaScript; this module adds drawer, motion, and hover polish.
 */
const focusableSelector = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

class HeaderController {
  constructor(header) {
    this.header = header;
    this.sectionRoot = header.closest('.co-section-header') || header.parentElement;
    this.isStickyHeader = header.dataset.stickyHeader === 'true';
    this.toggle = header.querySelector('[data-action="mobile-nav-toggle"]');
    this.closeButton = header.querySelector('[data-action="mobile-nav-close"]');
    this.drawer = header.querySelector('[data-mobile-nav]');
    this.overlay = header.querySelector('[data-mobile-nav-overlay]');
    this.desktopDisclosures = [...header.querySelectorAll('[data-header-desktop-disclosure]')];
    this.desktopBreakpoint = window.matchMedia('(min-width: 48rem)');
    this.hoverCapable = window.matchMedia('(hover: hover) and (pointer: fine)');
    this.isOpen = false;
    this.lastFocusedElement = null;
    this.lastScrollY = window.scrollY;
    this.scrollFrame = null;
    this.disclosureListeners = [];

    this.handleToggleClick = this.handleToggleClick.bind(this);
    this.handleCloseClick = this.close.bind(this);
    this.handleOverlayClick = this.close.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.handleBreakpointChange = this.handleBreakpointChange.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleSectionSelect = this.handleSectionSelect.bind(this);
    this.handleSectionDeselect = this.handleSectionDeselect.bind(this);
  }

  init() {
    if (this.isStickyHeader) {
      this.sectionRoot?.classList.add('co-section-header--sticky');
    }
    this.initializeMobileNavigation();
    this.initializeDesktopDisclosures();
    this.initializeScrollBehavior();
    document.addEventListener('shopify:section:select', this.handleSectionSelect);
    document.addEventListener('shopify:section:deselect', this.handleSectionDeselect);
    return true;
  }

  initializeMobileNavigation() {
    if (!this.toggle || !this.closeButton || !this.drawer || !this.overlay) {
      return;
    }

    this.drawer.hidden = true;
    this.drawer.setAttribute('role', 'dialog');
    this.drawer.setAttribute('aria-modal', 'true');
    this.header.dataset.mobileNavigationEnhanced = 'true';
    this.toggle.addEventListener('click', this.handleToggleClick);
    this.closeButton.addEventListener('click', this.handleCloseClick);
    this.overlay.addEventListener('click', this.handleOverlayClick);
    this.desktopBreakpoint.addEventListener('change', this.handleBreakpointChange);
  }

  initializeDesktopDisclosures() {
    if (this.header.dataset.desktopNavigationActivation !== 'hover') {
      return;
    }

    this.desktopDisclosures.forEach((disclosure) => {
      const open = () => {
        if (this.desktopBreakpoint.matches && this.hoverCapable.matches) {
          this.closeDesktopDisclosures(disclosure);
          disclosure.open = true;
        }
      };
      const close = () => {
        window.setTimeout(() => {
          if (!disclosure.matches(':hover') && !disclosure.contains(document.activeElement)) {
            disclosure.open = false;
          }
        }, 0);
      };

      disclosure.addEventListener('pointerenter', open);
      disclosure.addEventListener('pointerleave', close);
      disclosure.addEventListener('focusin', open);
      disclosure.addEventListener('focusout', close);
      this.disclosureListeners.push({ disclosure, open, close });
    });
  }

  initializeScrollBehavior() {
    const shouldWatchScroll = this.header.dataset.hideOnScroll === 'true' || this.header.dataset.transparent === 'true';

    if (!shouldWatchScroll) {
      return;
    }

    this.updateScrollState();
    window.addEventListener('scroll', this.handleScroll, { passive: true });
  }

  handleToggleClick() {
    if (this.isOpen) {
      this.close();
      return;
    }

    this.open();
  }

  open() {
    if (!this.drawer || !this.toggle) {
      return;
    }

    this.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.isOpen = true;
    this.drawer.hidden = false;
    this.toggle.setAttribute('aria-expanded', 'true');
    this.header.dataset.mobileNavigationOpen = 'true';
    document.body.classList.add('co-header-scroll-locked');
    document.addEventListener('keydown', this.handleDocumentKeydown);

    window.requestAnimationFrame(() => {
      const initialFocus = this.closeButton || this.getFocusableElements()[0] || this.drawer;
      if (this.isOpen && initialFocus instanceof HTMLElement && initialFocus.isConnected) {
        initialFocus.focus();
      }
    });
  }

  close({ restoreFocus = true } = {}) {
    if (!this.isOpen || !this.drawer || !this.toggle) {
      return;
    }

    this.isOpen = false;
    this.drawer.hidden = true;
    this.toggle.setAttribute('aria-expanded', 'false');
    delete this.header.dataset.mobileNavigationOpen;
    document.body.classList.remove('co-header-scroll-locked');
    document.removeEventListener('keydown', this.handleDocumentKeydown);

    if (restoreFocus && this.lastFocusedElement?.isConnected) {
      this.lastFocusedElement.focus();
    }

    this.lastFocusedElement = null;
  }

  handleDocumentKeydown(event) {
    if (event.key === 'Escape') {
      if (this.isOpen) {
        event.preventDefault();
        this.close();
        return;
      }

      this.closeDesktopDisclosures();
      return;
    }

    if (!this.isOpen || event.key !== 'Tab') {
      return;
    }

    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) {
      event.preventDefault();
      this.drawer?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  handleBreakpointChange(event) {
    if (event.matches) {
      this.close({ restoreFocus: false });
    }
  }

  handleScroll() {
    if (this.scrollFrame) {
      return;
    }

    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.updateScrollState();
    });
  }

  updateScrollState() {
    const currentScrollY = Math.max(0, window.scrollY);

    if (this.header.dataset.transparent === 'true') {
      this.header.toggleAttribute('data-header-solid', currentScrollY > 12);
    }

    if (this.header.dataset.hideOnScroll === 'true') {
      const headerHeight = this.header.getBoundingClientRect().height;
      const isScrollingDown = currentScrollY > this.lastScrollY + 8;
      const isScrollingUp = currentScrollY < this.lastScrollY - 4;

      if (isScrollingDown && currentScrollY > headerHeight) {
        this.header.dataset.headerHidden = 'true';
      } else if (isScrollingUp || currentScrollY <= headerHeight) {
        delete this.header.dataset.headerHidden;
      }
    }

    this.lastScrollY = currentScrollY;
  }

  handleSectionSelect(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.header)) {
      delete this.header.dataset.headerHidden;
    }
  }

  handleSectionDeselect(event) {
    if (event.target instanceof HTMLElement && event.target.contains(this.header)) {
      this.closeDesktopDisclosures();
      this.close({ restoreFocus: false });
    }
  }

  closeDesktopDisclosures(except = null) {
    this.desktopDisclosures.forEach((disclosure) => {
      if (disclosure !== except) {
        disclosure.open = false;
      }
    });
  }

  getFocusableElements() {
    if (!this.drawer) {
      return [];
    }

    return [...this.drawer.querySelectorAll(focusableSelector)].filter((element) => !element.hasAttribute('hidden'));
  }

  destroy() {
    this.close({ restoreFocus: false });
    this.toggle?.removeEventListener('click', this.handleToggleClick);
    this.closeButton?.removeEventListener('click', this.handleCloseClick);
    this.overlay?.removeEventListener('click', this.handleOverlayClick);
    this.desktopBreakpoint.removeEventListener('change', this.handleBreakpointChange);
    window.removeEventListener('scroll', this.handleScroll);
    document.removeEventListener('keydown', this.handleDocumentKeydown);
    document.removeEventListener('shopify:section:select', this.handleSectionSelect);
    document.removeEventListener('shopify:section:deselect', this.handleSectionDeselect);
    this.disclosureListeners.forEach(({ disclosure, open, close }) => {
      disclosure.removeEventListener('pointerenter', open);
      disclosure.removeEventListener('pointerleave', close);
      disclosure.removeEventListener('focusin', open);
      disclosure.removeEventListener('focusout', close);
    });
    this.disclosureListeners = [];
    if (this.isStickyHeader) {
      this.sectionRoot?.classList.remove('co-section-header--sticky');
    }
  }
}

const headerRuntimeKey = '__caliniumHeaderRuntimeV1';
const headerRuntime = window[headerRuntimeKey] || {
  initializedHeaders: new WeakMap(),
  lifecycleBound: false
};
window[headerRuntimeKey] = headerRuntime;
const initializedHeaders = headerRuntime.initializedHeaders;

function initializeHeader(header) {
  if (
    !(header instanceof HTMLElement)
    || initializedHeaders.has(header)
    || header.dataset.headerRuntimeInitialized === 'true'
  ) {
    return;
  }

  const controller = new HeaderController(header);
  controller.init();
  initializedHeaders.set(header, controller);
  header.dataset.headerRuntimeInitialized = 'true';
}

function initializeHeaders(root = document) {
  if (root instanceof HTMLElement && root.matches('[data-header]')) {
    initializeHeader(root);
  }

  root.querySelectorAll?.('[data-header]').forEach(initializeHeader);
}

function destroyHeaders(root) {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const headers = [];
  if (root.matches('[data-header]')) {
    headers.push(root);
  }
  root.querySelectorAll('[data-header]').forEach((header) => headers.push(header));
  headers.forEach((header) => {
    const controller = initializedHeaders.get(header);
    controller?.destroy();
    initializedHeaders.delete(header);
    delete header.dataset.headerRuntimeInitialized;
  });
}

initializeHeaders();

if (!headerRuntime.lifecycleBound) {
  document.addEventListener('shopify:section:load', (event) => {
    initializeHeaders(event.target);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    destroyHeaders(event.target);
  });
  headerRuntime.lifecycleBound = true;
}
