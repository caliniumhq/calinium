'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { loadDashboardEnvironment } = require('./environment.cjs');

loadDashboardEnvironment();
const { createDashboardApiHandler } = require('./dashboard-api.cjs');
const { createDashboardServices } = require('./dashboard-services.cjs');
const { dashboardSecurityHeaders, isLaunchPreviewRequest, renderDashboardShell } = require('./embedded-shell.cjs');
const { handleBillingReturn } = require('./billing-return.cjs');
const { validateControlledStagingRuntime } = require('./controlled-staging-runtime.cjs');
const { assertPublicProductionConfiguration } = require('./production/public-production-configuration.cjs');

const dashboardRoot = path.resolve(__dirname, '..');
const buildRoot = path.join(dashboardRoot, 'dist');
const port = Number(process.env.PORT || 4173);
const host = process.env.CALINIUM_SERVER_HOST || '0.0.0.0';
const contentTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon'
};

function safeAssetPath(requestPath) {
  const pathname = decodeURIComponent((requestPath || '/').split('?')[0]);
  const candidate = path.resolve(buildRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
  return candidate.startsWith(`${buildRoot}${path.sep}`) || candidate === buildRoot ? candidate : null;
}

function serveStatic(request, response) {
  const candidate = safeAssetPath(request.url);
  const file = candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : path.join(buildRoot, 'index.html');
  if (!fs.existsSync(file)) {
    response.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Dashboard build is unavailable. Run npm run build in apps/dashboard.');
    return;
  }
  const headers = { ...dashboardSecurityHeaders(), 'content-type': contentTypes[path.extname(file)] || 'application/octet-stream' };
  if (path.basename(file) === 'index.html') {
    response.writeHead(200, headers);
    response.end(renderDashboardShell(fs.readFileSync(file, 'utf8'), process.env, { includeAppBridge: !isLaunchPreviewRequest(request.url) }));
    return;
  }
  response.writeHead(200, headers);
  fs.createReadStream(file).pipe(response);
}

async function start() {
  if (process.env.CALINIUM_ENVIRONMENT === 'staging') {
    const deferExecutableChecks = process.env.CALINIUM_MERCHANT_FLOW_BETA_ENABLED === 'true';
    validateControlledStagingRuntime({ env: process.env, root: path.resolve(__dirname, '../../..'), checkFilesystem: true, checkBuild: true, checkExecutables: !deferExecutableChecks });
  }
  if (process.env.CALINIUM_ENVIRONMENT === 'production') assertPublicProductionConfiguration(process.env, { allowProviderHealthPending: true });
  const services = await createDashboardServices();
  const base = await services.baseReadiness();
  if (process.env.CALINIUM_ENVIRONMENT === 'production') {
    assertPublicProductionConfiguration(process.env, {
      capabilities: { durable_artifact_storage_acceptance: base.artifact_storage_acceptance }
    });
  }
  const api = createDashboardApiHandler({ services });
  const server = http.createServer(async (request, response) => {
    if (await handleBillingReturn({ request, response, services })) return;
    if (await api(request, response)) return;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD, POST, PUT' });
      response.end();
      return;
    }
    serveStatic(request, response);
  });
  let closing = false;
  async function shutdown(signal) {
    if (closing) return;
    closing = true;
    process.stdout.write(`Calinium Dashboard received ${signal}; draining requests.\n`);
    server.close(async () => {
      try { await services.close(); process.exit(0); }
      catch (error) { process.stderr.write(`${error.stack || error.message}\n`); process.exit(1); }
    });
  }
  process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.once('SIGINT', () => { void shutdown('SIGINT'); });
  try {
    await new Promise((resolve, reject) => {
      const onError = (error) => { server.off('listening', onListening); reject(error); };
      const onListening = () => { server.off('error', onError); resolve(); };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, host);
    });
  } catch (error) {
    await services.close();
    throw error;
  }
  process.stdout.write(`Calinium Dashboard listening on ${host}:${port}\n`);
  services.startControlledReadiness?.();
  return { server, services };
}

start().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exit(1); });
