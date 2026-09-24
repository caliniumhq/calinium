'use strict';

function htmlAttribute(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shopifyApiKey(env = process.env) {
  const key = String(env.SHOPIFY_API_KEY || env.CALINIUM_SHOPIFY_CLIENT_ID || '').trim();
  return /^[a-zA-Z0-9_-]{8,128}$/.test(key) ? key : null;
}

function appBridgeTags(env = process.env) {
  const apiKey = shopifyApiKey(env);
  if (!apiKey) return '';
  return `<meta name="shopify-api-key" content="${htmlAttribute(apiKey)}" />\n    <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>`;
}

function isLaunchPreviewRequest(requestUrl = '') {
  try {
    return /^\/launch-preview\/?$/.test(new URL(String(requestUrl || '/'), 'https://calinium.invalid').pathname);
  } catch {
    return false;
  }
}

function stripAppBridgeTags(html) {
  return String(html)
    .replace(/<meta\b(?=[^>]*\bname=(["'])shopify-api-key\1)[^>]*>\s*/gi, '')
    .replace(/<script\b(?=[^>]*\bsrc=(["'])https:\/\/cdn\.shopify\.com\/shopifycloud\/app-bridge\.js\1)[^>]*>\s*<\/script>\s*/gi, '')
    .replace('<!-- CALINIUM_APP_BRIDGE -->', '');
}

function renderLaunchPreviewShell(html) {
  const description = 'A local release preview of Calinium, an AI creative direction system for custom Shopify storefronts.';
  const title = '<title>Calinium — Storefront direction, shaped around your business</title>';
  let rendered = stripAppBridgeTags(html)
    .replace(/<title>[\s\S]*?<\/title>/i, title);
  if (!/<title>[\s\S]*?<\/title>/i.test(rendered)) {
    rendered = rendered.replace('</head>', `    ${title}\n  </head>`);
  }
  if (!/<meta\b(?=[^>]*\bname=(["'])description\1)[^>]*>/i.test(rendered)) {
    rendered = rendered.replace('</head>', `    <meta name="description" content="${htmlAttribute(description)}" />\n  </head>`);
  }
  return rendered;
}

function renderDashboardShell(html, env = process.env, { includeAppBridge = true } = {}) {
  if (!includeAppBridge) return renderLaunchPreviewShell(html);
  const tags = appBridgeTags(env);
  // Preserve the marker during a credential-free production build. The Node
  // host injects the public key at request time, while Shopify CLI dev injects
  // it directly through Vite. Replacing it with an empty string would leave a
  // later embedded production request without an App Bridge entry point.
  return tags ? String(html).replace('<!-- CALINIUM_APP_BRIDGE -->', tags) : String(html);
}

function viteDashboardIndexTransform(env = process.env) {
  // Vite's middleware dev server is responsible for serving index.html, so it
  // needs the same request-time shell treatment as the production server.
  return (html, context = {}) => renderDashboardShell(html, env, {
    includeAppBridge: !isLaunchPreviewRequest(context.path)
  });
}

function dashboardSecurityHeaders() {
  return {
    'content-security-policy': "frame-ancestors https://admin.shopify.com https://*.myshopify.com; base-uri 'self'; object-src 'none'",
    'x-content-type-options': 'nosniff'
  };
}

module.exports = { appBridgeTags, dashboardSecurityHeaders, isLaunchPreviewRequest, renderDashboardShell, renderLaunchPreviewShell, stripAppBridgeTags, viteDashboardIndexTransform, shopifyApiKey };
