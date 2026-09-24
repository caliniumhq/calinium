import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createDashboardServices } = require('../server/dashboard-services.cjs');
const { createId } = require('../server/lib/ids.cjs');
const { createSchemaValidator } = require('../../../ai/compiler/schema-validator.js');

const root = path.resolve(process.cwd(), '../..');
const schemaValidator = createSchemaValidator(root);
const password = 'correct-horse-battery-staple';
const completeAnswers = {
  discovery_business_stage: 'established_business', discovery_has_existing_website: 'no_existing_website', discovery_has_shopify_store: false, discovery_desired_outcomes: ['improve_brand_positioning'], discovery_creative_freedom: 'refine_existing_identity',
  business_brand_name: 'Durable Atelier', business_model: 'direct_to_consumer', business_industry: 'luxury_fashion', business_product_category: 'bags', business_stage: 'operating', business_store_status: 'existing_store',
  brand_personality_primary: 'luxury', brand_personality_secondary: ['sophisticated'], audience_customer_type: 'Considered shoppers', audience_needs: ['material detail'], audience_market_model: 'b2c', audience_price_positioning: 'premium',
  product_types: ['bags'], product_sku_count: 16, product_delivery: ['physical'], product_has_variants: true,
  design_preferred_style: ['luxury'], design_content_density: 'low', design_page_type: 'homepage', content_logo_status: 'no_logo', content_color_source: 'let_calinium_suggest', content_typography_preference: 'no_preference', goals_primary: ['luxury']
};

function testDatabase() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'calinium-dashboard-test-')), 'dashboard.sqlite'); }
function clockFactory() { let second = 0; return () => new Date(`2026-07-21T12:00:${String(second++).padStart(2, '0')}.000Z`); }
async function createServices(database, clock = clockFactory()) { return createDashboardServices({ root, env: { CALINIUM_SQLITE_PATH: database }, clock }); }

describe('Accounts, projects, and durable storage', () => {
  it('creates an owner account and multiple organization-isolated projects', async () => {
    const services = await createServices(testDatabase());
    const registered = await services.auth.register({ email: 'owner@example.com', password, fullName: 'Owner', organizationName: 'Atelier Group', ipAddress: '127.0.0.1' });
    const first = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Leather Bags', business_name: 'Atelier Bags', country: 'US', icon: '✦' } });
    const second = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Coffee Brand', business_name: 'Atelier Coffee', country: 'CA', website_url: 'https://example.com' } });
    const overview = await services.projects.dashboardOverview({ userId: registered.user.id });
    expect(overview.projects.map((project) => project.name).sort()).toEqual(['Coffee Brand', 'Leather Bags']);
    expect(first.project.organization_id).toBe(second.project.organization_id);
    expect((await services.auth.authenticate(registered.session.token)).user.email).toBe('owner@example.com');
    await services.close();
  });

  it('persists interview progress and completed Merchant Profiles across a new service instance', async () => {
    const database = testDatabase();
    const services = await createServices(database);
    const registered = await services.auth.register({ email: 'merchant@example.com', password, fullName: 'Merchant', organizationName: 'Merchant Studio', ipAddress: '127.0.0.1' });
    const createdProject = await services.projects.createProject({ userId: registered.user.id, input: { name: 'Luxury Bags', business_name: 'Merchant Bags', country: 'GB' } });
    const projectId = createdProject.project.id;
    await services.interview.create({ userId: registered.user.id, projectId });
    const saved = await services.interview.save({ userId: registered.user.id, projectId, answerPatch: { business_industry: 'luxury_fashion', product_delivery: ['physical'] }, activeCategoryId: 'products' });
    expect(saved.record.active_category_id).toBe('products');
    expect(schemaValidator.validateFile(saved.record, 'schemas/calinium-project-interview-session.schema.json')).toEqual([]);
    await services.close();

    const resumedServices = await createServices(database);
    const signedIn = await resumedServices.auth.signIn({ email: 'merchant@example.com', password, ipAddress: '127.0.0.1' });
    const recovered = await resumedServices.interview.load({ userId: signedIn.user.id, projectId });
    expect(recovered.record.engine_session.answers.business_industry).toBe('luxury_fashion');
    expect(recovered.record.active_category_id).toBe('products');
    await resumedServices.interview.save({ userId: signedIn.user.id, projectId, answerPatch: completeAnswers, activeCategoryId: 'goals' });
    const complete = await resumedServices.interview.complete({ userId: signedIn.user.id, projectId });
    expect(complete.profile.profile.business.name).toBe('Durable Atelier');
    expect(schemaValidator.validateFile(complete.profile, 'schemas/calinium-project-merchant-profile.schema.json')).toEqual([]);
    const loadedProject = await resumedServices.projects.getProject({ userId: signedIn.user.id, projectId });
    expect(loadedProject.merchant_profile.profile.industry).toBe('luxury_fashion');
    await resumedServices.close();
  });

  it('enforces the future role model while provisioning only an owner by default', async () => {
    const services = await createServices(testDatabase());
    const owner = await services.auth.register({ email: 'owner-role@example.com', password, fullName: 'Owner', organizationName: 'Owner Organization', ipAddress: '127.0.0.1' });
    const viewer = await services.auth.register({ email: 'viewer-role@example.com', password, fullName: 'Viewer', organizationName: 'Viewer Organization', ipAddress: '127.0.0.2' });
    const outsider = await services.auth.register({ email: 'outsider-role@example.com', password, fullName: 'Outsider', organizationName: 'Outsider Organization', ipAddress: '127.0.0.3' });
    const ownerProject = await services.projects.createProject({ userId: owner.user.id, input: { name: 'Private Brand', business_name: 'Private Brand', country: 'US' } });
    await services.store.createMembership({ id: createId('mem'), organization_id: owner.organization.id, user_id: viewer.user.id, role: 'viewer', status: 'active', created_at: '2026-07-21T12:00:00.000Z' });
    await expect(services.projects.requireMembership(owner.organization.id, viewer.user.id, 'project:create')).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    await expect(services.projects.requireMembership(owner.organization.id, viewer.user.id, 'project:view')).resolves.toMatchObject({ role: 'viewer' });
    await expect(services.projects.getProject({ userId: outsider.user.id, projectId: ownerProject.project.id })).rejects.toMatchObject({ code: 'permission_denied', status: 403 });
    await services.close();
  });
});
