'use strict';

const OBSERVATION_REVISION = 'storefront-objective-observation-v1';

async function collectObjectiveObservations(page, route, viewport) {
  return page.evaluate(({ routeId, viewportWidth, viewportHeight, isMobile, observationRevision }) => {
    const limit = 25;
    const round = (value) => Math.round(Number(value || 0) * 100) / 100;
    const rectRecord = (rect) => ({
      x: round(rect.x), y: round(rect.y), width: round(rect.width), height: round(rect.height),
      top: round(rect.top), right: round(rect.right), bottom: round(rect.bottom), left: round(rect.left)
    });
    const visible = (element) => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== 'none' && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const descriptor = (element) => {
      const tag = element.tagName.toLowerCase();
      if (element.id) return `#${CSS.escape(element.id)}`.slice(0, 240);
      const classes = [...element.classList].filter(Boolean).slice(0, 3).map((name) => `.${CSS.escape(name)}`).join('');
      const role = element.getAttribute('role');
      const action = element.getAttribute('data-action');
      if (action) return `${tag}[data-action="${CSS.escape(action)}"]`.slice(0, 240);
      if (classes) return `${tag}${classes}`.slice(0, 240);
      if (role) return `${tag}[role="${CSS.escape(role)}"]`.slice(0, 240);
      return tag;
    };
    const painted = (element) => {
      const rect = element.getBoundingClientRect();
      const points = [
        [rect.left + rect.width / 2, rect.top + rect.height / 2],
        [rect.left + 2, rect.top + 2],
        [rect.right - 2, rect.top + 2],
        [rect.left + 2, rect.bottom - 2],
        [rect.right - 2, rect.bottom - 2]
      ];
      return points.some(([x, y]) => {
        if (x < 0 || y < 0 || x >= viewportWidth || y >= viewportHeight) return false;
        const hit = document.elementFromPoint(x, y);
        return Boolean(hit && (hit === element || element.contains(hit)));
      });
    };
    const hasContext = (element, expression) => {
      for (let node = element; node && node instanceof Element; node = node.parentElement) {
        const value = `${node.id} ${node.className || ''} ${[...node.attributes].map((attribute) => `${attribute.name}=${attribute.value}`).join(' ')}`;
        if (expression.test(value)) return true;
      }
      return false;
    };
    const intentionalScroll = (element) => {
      for (let node = element.parentElement; node && node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if ((/auto|scroll/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1)
          || hasContext(node, /carousel|slider|scroll-track|marquee|filmstrip|drawer|mobile-navigation/i)) return true;
      }
      return false;
    };
    const intentionalBoundary = (element) => {
      if (intentionalScroll(element)) return true;
      if (!hasContext(element, /media|image|video|hero|banner|crop|mask|aspect|ratio/i)) return false;
      for (let node = element.parentElement; node && node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/hidden|clip/.test(`${style.overflowX} ${style.overflowY}`)) return true;
      }
      return false;
    };
    const intentionalClip = (element) => {
      const style = getComputedStyle(element);
      return style.webkitLineClamp !== 'none'
        || hasContext(element, /media|image|video|hero|crop|mask|aspect|ratio|visually-hidden|sr-only|drawer|mobile-navigation/i);
    };
    const intentionalLayer = (first, second) => {
      const layered = (element) => {
        const style = getComputedStyle(element);
        return ['fixed', 'sticky', 'absolute'].includes(style.position)
          || hasContext(element, /overlay|drawer|modal|dialog|popover|tooltip|hero|media|badge|icon|pagination|hotspot|localization|country|language|visually-hidden|sr-only/i);
      };
      return layered(first) || layered(second);
    };
    const isDescendantPair = (first, second) => first.contains(second) || second.contains(first);
    const overlapRatio = (first, second) => {
      const width = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
      const height = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
      const overlap = width * height;
      const smaller = Math.min(first.width * first.height, second.width * second.height);
      return smaller > 0 ? overlap / smaller : 0;
    };

    const geometry = {
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      document_scroll_width: Math.max(1, Math.round(document.documentElement.scrollWidth)),
      document_scroll_height: Math.max(1, Math.round(document.documentElement.scrollHeight)),
      body_scroll_width: Math.max(1, Math.round(document.body?.scrollWidth || 1)),
      body_scroll_height: Math.max(1, Math.round(document.body?.scrollHeight || 1))
    };

    const landmarkSelectors = ['header', 'main', '#MainContent', 'footer'];
    if (routeId === 'collection') landmarkSelectors.push('[data-main-collection]');
    if (routeId === 'product') landmarkSelectors.push('[data-main-product]');
    if (routeId === 'cart') landmarkSelectors.push('[data-main-cart]');
    const landmarks = landmarkSelectors.map((selector) => {
      const matches = [...document.querySelectorAll(selector)];
      return { selector, count: matches.length, visible_count: matches.filter(visible).length };
    });

    const boundaryElements = [...document.querySelectorAll('header, main, footer, section, [data-section-id], [data-main-product], [data-main-collection], [data-main-cart], img, video')];
    const offscreen_candidates = boundaryElements.filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector: descriptor(element), rect: rectRecord(rect),
        overflow_left: round(Math.max(0, -rect.left)),
        overflow_right: round(Math.max(0, rect.right - viewportWidth)),
        intentional_scroll_context: intentionalBoundary(element)
      };
    }).filter((candidate) => candidate.overflow_left > 1 || candidate.overflow_right > 1)
      .sort((a, b) => Math.max(b.overflow_left, b.overflow_right) - Math.max(a.overflow_left, a.overflow_right)).slice(0, limit);

    const clipElements = [...document.querySelectorAll('h1, h2, h3, p, a, button, label, input, select, textarea')];
    const clipping_candidates = clipElements.filter(visible).map((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        selector: descriptor(element), rect: rectRecord(rect), client_width: round(element.clientWidth), client_height: round(element.clientHeight),
        scroll_width: round(element.scrollWidth), scroll_height: round(element.scrollHeight), overflow_x: style.overflowX, overflow_y: style.overflowY,
        intentional_clip_context: intentionalClip(element)
      };
    }).filter((candidate) => ((/hidden|clip/.test(candidate.overflow_x) && candidate.scroll_width > candidate.client_width + 1)
      || (/hidden|clip/.test(candidate.overflow_y) && candidate.scroll_height > candidate.client_height + 1)))
      .sort((a, b) => Math.max(b.scroll_width - b.client_width, b.scroll_height - b.client_height) - Math.max(a.scroll_width - a.client_width, a.scroll_height - a.client_height)).slice(0, limit);

    const collisionElements = [...document.querySelectorAll('h1, h2, h3, a[href], button, input, select, textarea, [role="button"], [role="tab"]')]
      .filter(visible).filter(painted).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom >= 0 && rect.top <= viewportHeight && rect.right >= 0 && rect.left <= viewportWidth;
      }).slice(0, 120);
    const collision_candidates = [];
    for (let firstIndex = 0; firstIndex < collisionElements.length && collision_candidates.length < limit; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < collisionElements.length && collision_candidates.length < limit; secondIndex += 1) {
        const first = collisionElements[firstIndex];
        const second = collisionElements[secondIndex];
        if (isDescendantPair(first, second)) continue;
        const firstRect = first.getBoundingClientRect();
        const secondRect = second.getBoundingClientRect();
        const ratio = overlapRatio(firstRect, secondRect);
        if (ratio <= 0.05) continue;
        collision_candidates.push({
          first_selector: descriptor(first), second_selector: descriptor(second), first_rect: rectRecord(firstRect), second_rect: rectRecord(secondRect),
          overlap_ratio: round(ratio), intentional_layer_context: intentionalLayer(first, second)
        });
      }
    }

    const broken_media = [...document.querySelectorAll('img, video, model-viewer')].map((element) => {
      const kind = element.tagName.toLowerCase() === 'img' ? 'image' : element.tagName.toLowerCase() === 'video' ? 'video' : 'model';
      const complete = kind === 'image' ? element.complete && element.naturalWidth > 0 : kind === 'video' ? element.readyState >= 1 : true;
      return {
        selector: descriptor(element), kind, critical: Boolean(element.closest('[data-main-product], [data-main-collection], main')),
        complete, natural_width: kind === 'image' ? element.naturalWidth : kind === 'video' ? element.videoWidth : 1,
        natural_height: kind === 'image' ? element.naturalHeight : kind === 'video' ? element.videoHeight : 1, visible: visible(element)
      };
    }).filter((candidate) => candidate.visible && !candidate.complete).slice(0, limit);

    const interactive = [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"]')].filter(visible);
    const touch_target_risks = isMobile ? interactive.map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const inlineText = element.tagName.toLowerCase() === 'a' && style.display === 'inline' && !element.querySelector('img, svg');
      const expanded = { left: rect.left - Math.max(0, 24 - rect.width) / 2, right: rect.right + Math.max(0, 24 - rect.width) / 2, top: rect.top - Math.max(0, 24 - rect.height) / 2, bottom: rect.bottom + Math.max(0, 24 - rect.height) / 2 };
      const closeNeighbour = interactive.some((candidate) => {
        if (candidate === element || element.contains(candidate) || candidate.contains(element)) return false;
        const other = candidate.getBoundingClientRect();
        return Math.max(0, Math.min(expanded.right, other.right) - Math.max(expanded.left, other.left))
          * Math.max(0, Math.min(expanded.bottom, other.bottom) - Math.max(expanded.top, other.top)) > 0;
      });
      return {
        selector: descriptor(element), tag: element.tagName.toLowerCase(), role: element.getAttribute('role'), rect: rectRecord(rect),
        inline_text_exception: inlineText, spacing_exception: !closeNeighbour, disabled: Boolean(element.disabled || element.getAttribute('aria-disabled') === 'true')
      };
    }).filter((candidate) => !candidate.disabled && (candidate.rect.width < 24 || candidate.rect.height < 24)).slice(0, limit) : [];

    const productForms = routeId === 'product' ? [...document.querySelectorAll('[data-main-product] [data-product-form]')] : [];
    const cartAddForms = productForms.flatMap((root) => [...root.querySelectorAll('form[action*="/cart/add"]')]);
    const primaryControls = productForms.flatMap((root) => [...root.querySelectorAll('[data-action="product-form-submit"], button[name="add"], button[type="submit"]')]);
    const variantControls = productForms.flatMap((root) => [...root.querySelectorAll('select[name="id"], input[name="id"], [data-product-option]')]);
    const purchase_interaction = {
      applicable: routeId === 'product', product_form_count: productForms.length, cart_add_form_count: cartAddForms.length,
      primary_control_count: primaryControls.length, visible_primary_control_count: primaryControls.filter(visible).length,
      variant_control_count: variantControls.length,
      controls_connected: routeId !== 'product' || primaryControls.every((control) => Boolean(control.closest('form[action*="/cart/add"]')))
    };

    return {
      observation_revision: observationRevision,
      geometry,
      landmarks,
      offscreen_candidates,
      clipping_candidates,
      collision_candidates,
      broken_media,
      touch_target_risks,
      purchase_interaction,
      navigation_interaction: {
        applicable: isMobile, trigger_present: false, trigger_visible: false, opened: false, expanded_state_updated: false,
        controlled_panel_visible: false, closed: false, focus_remained_reachable: false
      }
    };
  }, {
    routeId: route.id,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
    isMobile: viewport.is_mobile,
    observationRevision: OBSERVATION_REVISION
  });
}

async function exerciseNavigationInteraction(page, viewport) {
  const notApplicable = {
    applicable: false, trigger_present: false, trigger_visible: false, opened: false, expanded_state_updated: false,
    controlled_panel_visible: false, closed: false, focus_remained_reachable: false
  };
  if (!viewport.is_mobile) return notApplicable;
  const trigger = page.locator('[data-action="mobile-nav-toggle"]').first();
  const triggerPresent = await trigger.count() > 0;
  const triggerVisible = triggerPresent && await trigger.isVisible().catch(() => false);
  if (!triggerVisible) return { ...notApplicable, applicable: true, trigger_present: triggerPresent, trigger_visible: false };
  let opened = false;
  let expandedStateUpdated = false;
  let controlledPanelVisible = false;
  let closed = false;
  let focusRemainedReachable = false;
  try {
    await trigger.focus();
    await trigger.click();
    await page.waitForTimeout(50);
    expandedStateUpdated = await trigger.getAttribute('aria-expanded') === 'true';
    const controlledId = await trigger.getAttribute('aria-controls');
    const panel = controlledId ? page.locator(`#${controlledId}`).first() : page.locator('[data-mobile-nav]').first();
    controlledPanelVisible = await panel.count() > 0 && await panel.isVisible().catch(() => false);
    opened = expandedStateUpdated && controlledPanelVisible;
    const closeButton = page.locator('[data-action="mobile-nav-close"]').first();
    if (await closeButton.count() > 0 && await closeButton.isVisible().catch(() => false)) await closeButton.click();
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(50);
    const expandedAfterClose = await trigger.getAttribute('aria-expanded');
    const panelVisibleAfterClose = await panel.count() > 0 && await panel.isVisible().catch(() => false);
    closed = expandedAfterClose !== 'true' && !panelVisibleAfterClose;
    focusRemainedReachable = await trigger.evaluate((element) => document.contains(element) && !element.disabled).catch(() => false);
  } catch {
    // The structured booleans below intentionally record the failed interaction.
  }
  return {
    applicable: true, trigger_present: triggerPresent, trigger_visible: triggerVisible, opened,
    expanded_state_updated: expandedStateUpdated, controlled_panel_visible: controlledPanelVisible, closed,
    focus_remained_reachable: focusRemainedReachable
  };
}

module.exports = {
  OBSERVATION_REVISION,
  collectObjectiveObservations,
  exerciseNavigationInteraction
};
