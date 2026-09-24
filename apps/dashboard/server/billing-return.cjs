'use strict';

const { shopifyRuntimeConfiguration } = require('./shopify/runtime-configuration.cjs');
const { embeddedAdminBillingReturnUrl } = require('./shopify/oauth.cjs');

function billingReturnParameters(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://calinium.local');
  if (url.searchParams.get('calinium_billing') !== 'return') return null;
  const pathProject = url.pathname.match(/^\/projects\/(prj_[A-Za-z0-9-]+)\/design$/)?.[1] || null;
  const queryProject = String(url.searchParams.get('project') || '');
  // Shopify's existing confirmation URLs bind the project in the path. The
  // embedded Admin URL adds the same value as a query parameter. Require the
  // values to agree if both forms are present.
  if (pathProject && queryProject && pathProject !== queryProject) return null;
  const projectId = pathProject || queryProject;
  const orderId = String(url.searchParams.get('calinium_order') || '');
  if (!/^prj_[A-Za-z0-9-]+$/.test(projectId) || !/^cto_[A-Za-z0-9-]+$/.test(orderId)) return null;
  return { projectId, orderId };
}

function isEmbeddedBillingFrame(requestUrl) {
  const url = new URL(requestUrl || '/', 'http://calinium.local');
  // Shopify first opens the return URL outside Admin. The server redirects
  // that standalone request to the embedded Admin application. Shopify then
  // forwards the same order binding to the application iframe with its
  // embedded context. Redirecting the iframe a second time makes it try to
  // render admin.shopify.com inside itself, which Shopify blocks. Let the
  // embedded request continue to the SPA so App Bridge can establish its
  // authenticated session and resume the project normally.
  return url.searchParams.get('embedded') === '1' && Boolean(url.searchParams.get('host'));
}

async function billingReturnDestination({ projectId, orderId, services, env = process.env }) {
  const project = await services.store.findProjectById(projectId);
  if (!project) return null;
  const order = await services.store.findCustomThemeOrderForProject(orderId, project.id, project.organization_id);
  if (!order || order.shopify_connection_id == null) return null;
  const connection = await services.store.findShopifyConnectionForOrganization(order.shopify_connection_id, project.organization_id);
  if (!connection?.shop_domain) return null;
  const configuration = shopifyRuntimeConfiguration(env, { requireCredentials: true });
  return embeddedAdminBillingReturnUrl({ clientId: configuration.clientId, shopDomain: connection.shop_domain, projectId: project.id, orderId: order.id });
}

async function handleBillingReturn({ request, response, services, env = process.env }) {
  if (!['GET', 'HEAD'].includes(String(request.method || 'GET').toUpperCase())) return false;
  const parameters = billingReturnParameters(request.url);
  if (!parameters) return false;
  if (isEmbeddedBillingFrame(request.url)) return false;
  const destination = await billingReturnDestination({ ...parameters, services, env });
  if (!destination) {
    response.writeHead(404, { 'cache-control': 'no-store', 'content-type': 'text/plain; charset=utf-8' });
    response.end('Billing return is unavailable. Reopen Calinium from Shopify Admin.');
    return true;
  }
  response.writeHead(302, { location: destination, 'cache-control': 'no-store' });
  response.end();
  return true;
}

module.exports = { billingReturnParameters, isEmbeddedBillingFrame, billingReturnDestination, handleBillingReturn };
