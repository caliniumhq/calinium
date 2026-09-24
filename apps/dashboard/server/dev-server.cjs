'use strict';

const http = require('http');
const { loadDashboardEnvironment } = require('./environment.cjs');

const environmentStatus = loadDashboardEnvironment();
const { createDashboardApiHandler } = require('./dashboard-api.cjs');
const { createDashboardServices } = require('./dashboard-services.cjs');
const { dashboardSecurityHeaders, viteDashboardIndexTransform } = require('./embedded-shell.cjs');
const { handleBillingReturn } = require('./billing-return.cjs');

const port = Number(process.env.PORT || 5173);
// Shopify CLI reserves HOST/APP_URL for its HTTPS tunnel. Never use it as a
// listen address: it is a URL, not an interface name. The dashboard process
// binds locally while Shopify CLI forwards the tunnel to PORT.
const host = process.env.CALINIUM_SERVER_HOST || '0.0.0.0';
function allowedHosts() {
  const hosts = ['localhost', '127.0.0.1'];
  for (const value of [process.env.APP_URL, process.env.HOST]) {
    try {
      const hostname = new URL(value).hostname;
      if (hostname && !hosts.includes(hostname)) hosts.push(hostname);
    } catch {
      // HOST is optional outside Shopify CLI and must never weaken Vite's
      // host validation when it is not a valid public application URL.
    }
  }
  return hosts;
}

async function start() {
  const { createServer } = await import('vite');
  const services = await createDashboardServices();
  const api = createDashboardApiHandler({ services });
  // Shopify CLI forwards one dashboard port through its secure development
  // tunnel. Give that same parent server to Vite so HMR uses the forwarded
  // WebSocket rather than starting a separate, unreachable local port.
  let vite;
  const server = http.createServer(async (request, response) => {
    Object.entries(dashboardSecurityHeaders()).forEach(([name, value]) => response.setHeader(name, value));
    if (await handleBillingReturn({ request, response, services })) return;
    if (await api(request, response)) return;
    vite.middlewares(request, response, () => {
      response.writeHead(404);
      response.end();
    });
  });
  vite = await createServer({
    plugins: [{
      name: 'calinium-embedded-dashboard-shell',
      // Vite serves index.html itself in middleware mode. Apply the same
      // request-time App Bridge injection used by the production server so
      // Shopify CLI development has window.shopify.idToken() in the iframe.
      transformIndexHtml: viteDashboardIndexTransform(process.env)
    }],
    server: {
      middlewareMode: { server },
      // Vite 8 uses `server.ws` for the HMR WebSocket. Supplying the parent
      // server keeps the browser on the Shopify CLI tunnel's single port.
      ws: { server },
      host,
      allowedHosts: allowedHosts()
    },
    appType: 'spa'
  });
  server.listen(port, host, () => {
    const environmentMessage = environmentStatus.loaded
      ? `private environment loaded; dashboard session=${environmentStatus.dashboard_session_configured ? 'configured' : 'missing'}; token encryption=${environmentStatus.token_encryption_configured ? 'configured' : 'missing'}`
      : 'private environment not present';
    process.stdout.write(`Calinium Dashboard development server listening on http://127.0.0.1:${port} (${environmentMessage})\n`);
  });
}

start().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
