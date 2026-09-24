'use strict';

const path = require('path');
const { DashboardError } = require('../lib/errors.cjs');
const { assertMerchantGenerationFlow, assertOperatorAuthorizationPolicy } = require('../../../../ai/merchant-flow');

class MerchantFlowOperatorAuthorizationService {
  constructor({ store, policy = null, configuration = null, root = path.resolve(__dirname, '../../../..') } = {}) {
    if (!store) throw new Error('Merchant-flow operator authorization requires a dashboard store.');
    this.store = store;
    this.root = root;
    if (!policy && (configuration?.enabled !== true || configuration?.capabilities?.operator_authorization !== true)) throw new Error('Merchant-flow operator authorization requires an enabled controlled-beta operator capability.');
    const resolvedPolicy = policy || {
      schema_version: '1.0', contract_version: 'merchant-flow-operator-authorization-v1',
      allowed_roles: configuration.operator_roles, operator_user_ids: configuration.operator_user_ids
    };
    this.policy = assertOperatorAuthorizationPolicy(resolvedPolicy, root);
    this.operatorUserIds = new Set(this.policy.operator_user_ids);
    this.allowedRoles = new Set(this.policy.allowed_roles);
  }

  forbidden() { return new DashboardError('merchant_flow_operator_forbidden', 'This operator action is not authorized.', 403); }
  unavailable() { return new DashboardError('merchant_flow_operator_scope_not_found', 'This merchant generation flow is unavailable.', 404); }

  async hasEligibleOperator() {
    for (const userId of this.operatorUserIds) {
      const user = await this.store.findUserById(userId);
      if (!user || user.status !== 'active') continue;
      const organizations = await this.store.listOrganizationsForUser(userId);
      for (const entry of organizations) {
        if (!entry?.organization?.id || !this.allowedRoles.has(entry.role)) continue;
        const projects = await this.store.listProjects(entry.organization.id);
        for (const project of projects) {
          try {
            await this.authorize({ userId, projectId: project.id });
            return true;
          } catch (error) {
            if (!['merchant_flow_operator_forbidden', 'merchant_flow_operator_scope_not_found'].includes(error?.code)) throw error;
          }
        }
      }
    }
    return false;
  }

  async authorize({ userId, projectId, flow = null } = {}) {
    if (!userId || !projectId || !this.operatorUserIds.has(String(userId))) throw this.forbidden();
    const project = await this.store.findProjectById(projectId);
    if (!project || project.status !== 'active') throw this.unavailable();
    const membership = await this.store.findMembership(project.organization_id, userId);
    if (!membership || membership.status !== 'active' || !this.allowedRoles.has(membership.role)) throw this.forbidden();
    const current = flow ? assertMerchantGenerationFlow(flow, this.root) : null;
    if (current && (current.project_id !== project.id || current.organization_id !== project.organization_id)) throw this.unavailable();
    if (current?.store_context?.shop && !current.store_context.connection_id) throw this.unavailable();
    if (current?.store_context?.connection_id) {
      const assignment = await this.store.findProjectShopifyConnection(project.id, project.organization_id, current.store_context.connection_id);
      if (!assignment?.connection || assignment.assignment_status !== 'assigned' || assignment.connection.organization_id !== project.organization_id) throw this.unavailable();
      if (current.store_context.shop && String(assignment.connection.shop_domain).toLowerCase() !== String(current.store_context.shop).toLowerCase()) throw this.unavailable();
    }
    return { project, membership, operator: { user_id: String(userId), explicitly_allowlisted: true, role: membership.role } };
  }
}

module.exports = { MerchantFlowOperatorAuthorizationService };
