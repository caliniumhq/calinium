import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { billingReturnParameters, isEmbeddedBillingFrame, billingReturnDestination, handleBillingReturn } = require('../server/billing-return.cjs');

const env = {
  CALINIUM_ENVIRONMENT: 'development',
  CALINIUM_SHOPIFY_CLIENT_ID: 'billing-test-client',
  CALINIUM_SHOPIFY_CLIENT_SECRET: 'billing-test-secret',
  CALINIUM_APPLICATION_URL: 'https://billing.example',
  CALINIUM_SHOPIFY_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64url')
};
const project = { id: 'prj_12345678', organization_id: 'org_123' };
const order = { id: 'cto_87654321', project_id: project.id, shopify_connection_id: 'shc_123' };
const connection = { id: 'shc_123', shop_domain: 'calinium-development.myshopify.com' };
const services = {
  store: {
    async findProjectById(id) { return id === project.id ? project : null; },
    async findCustomThemeOrderForProject(id, projectId, organizationId) { return id === order.id && projectId === project.id && organizationId === project.organization_id ? order : null; },
    async findShopifyConnectionForOrganization(id, organizationId) { return id === connection.id && organizationId === project.organization_id ? connection : null; }
  }
};

describe('embedded Shopify billing return', () => {
  it('accepts only a bound project and order return request', () => {
    expect(billingReturnParameters('/projects/prj_12345678/design?calinium_billing=return&calinium_order=cto_87654321')).toEqual({ projectId: project.id, orderId: order.id });
    expect(billingReturnParameters('/projects/prj_12345678/design?calinium_billing=return')).toBeNull();
    expect(billingReturnParameters('/projects/prj_12345678/design')).toBeNull();
  });

  it('returns an authenticated Shopify Admin app URL rather than the standalone dashboard', async () => {
    const destination = await billingReturnDestination({ projectId: project.id, orderId: order.id, services, env });
    const url = new URL(destination);
    expect(url.origin).toBe('https://admin.shopify.com');
    expect(url.pathname).toBe('/store/calinium-development/apps/billing-test-client/');
    expect(url.searchParams.get('project')).toBe(project.id);
    expect(url.searchParams.get('calinium_order')).toBe(order.id);
    expect(url.searchParams.get('calinium_billing')).toBe('return');
  });

  it('redirects only a known billing return and never trusts a caller-provided shop', async () => {
    const response = { status: null, headers: null, ended: false, writeHead(status, headers) { this.status = status; this.headers = headers; }, end() { this.ended = true; } };
    const handled = await handleBillingReturn({ request: { method: 'GET', url: '/projects/prj_12345678/design?calinium_billing=return&calinium_order=cto_87654321' }, response, services, env });
    expect(handled).toBe(true);
    expect(response.status).toBe(302);
    expect(response.headers.location).toContain('/store/calinium-development/apps/billing-test-client/');
    expect(response.headers.location).not.toContain('billing.example');
  });

  it('lets Shopify\'s embedded iframe load the dashboard instead of redirecting Admin inside the frame', async () => {
    const url = `/?project=${project.id}&calinium_billing=return&calinium_order=${order.id}&embedded=1&host=admin-context`;
    expect(isEmbeddedBillingFrame(url)).toBe(true);
    const response = { writeHead() { throw new Error('The embedded request must not be redirected.'); }, end() { throw new Error('The embedded request must not be ended.'); } };
    await expect(handleBillingReturn({ request: { method: 'GET', url }, response, services, env })).resolves.toBe(false);
  });
});
