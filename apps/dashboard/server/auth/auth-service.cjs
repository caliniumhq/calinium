'use strict';

const crypto = require('crypto');
const { createId, createOpaqueToken, hashToken } = require('../lib/ids.cjs');
const { DashboardError, assert } = require('../lib/errors.cjs');
const { isoNow } = require('../lib/serialization.cjs');
const { normalizeEmail } = require('./password-auth-provider.cjs');

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 10;

function cleanText(value, maximum = 120) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  assert(text.length > 0, 'field_required', 'A required field is missing.', 422);
  assert(text.length <= maximum, 'field_too_long', `This field must be ${maximum} characters or fewer.`, 422);
  return text;
}

function organizationSlug(name, suffix) {
  const normalized = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 42) || 'workspace';
  return `${normalized}-${suffix.slice(-8)}`;
}

function hashDashboardSession(token, secret = null) {
  return secret ? crypto.createHmac('sha256', secret).update(String(token)).digest('hex') : hashToken(token);
}

class AuthService {
  constructor({ store, providers, clock = () => new Date(), sessionSecret = null }) {
    this.store = store;
    this.providers = providers;
    this.clock = clock;
    this.sessionSecret = sessionSecret;
  }
  now() { return isoNow(this.clock); }
  expiresAt() { return new Date(this.clock().getTime() + SESSION_DURATION_MS).toISOString(); }
  async register({ email, password, fullName, organizationName, ipAddress }) {
    const normalizedEmail = normalizeEmail(email);
    assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), 'email_invalid', 'Enter a valid email address.', 422);
    const name = cleanText(fullName, 120);
    const orgName = cleanText(organizationName, 120);
    const existing = await this.store.findUserByEmail(normalizedEmail);
    if (existing) throw new DashboardError('account_exists', 'An account already exists for that email address.', 409);
    const provider = this.providers.get('password');
    const credential = await provider.createCredential({ password });
    const at = this.now();
    const userId = createId('usr');
    const organizationId = createId('org');
    const workspaceId = createId('wsp');
    await this.store.transaction(async (transaction) => {
      await transaction.createUser({ id: userId, email: normalizedEmail, full_name: name, password_hash: credential.password_hash, status: 'active', created_at: at, updated_at: at });
      await transaction.createOrganization({ id: organizationId, name: orgName, slug: organizationSlug(orgName, organizationId), created_by_user_id: userId, created_at: at, updated_at: at });
      await transaction.createWorkspace({ id: workspaceId, organization_id: organizationId, name: orgName, created_at: at, updated_at: at });
      await transaction.createMembership({ id: createId('mem'), organization_id: organizationId, user_id: userId, role: 'owner', status: 'active', created_at: at });
      await transaction.createActivity({ id: createId('act'), organization_id: organizationId, actor_user_id: userId, type: 'account_created', payload: {}, created_at: at });
    });
    const user = await this.store.findUserById(userId);
    const session = await this.issueSession(user.id, at);
    return { user, organization: await this.store.findOrganizationById(organizationId), session };
  }
  async signIn({ email, password, ipAddress }) {
    const normalizedEmail = normalizeEmail(email);
    const now = this.now();
    const windowStart = new Date(this.clock().getTime() - LOGIN_WINDOW_MS).toISOString();
    const failures = await this.store.countRecentFailures(normalizedEmail, ipAddress || 'unknown', windowStart);
    if (failures >= MAX_LOGIN_FAILURES) throw new DashboardError('sign_in_rate_limited', 'Too many sign-in attempts. Try again later.', 429);
    const record = await this.providers.get('password').verifyCredential({ email: normalizedEmail, password });
    await this.store.createAuthAttempt({ id: createId('aat'), email: normalizedEmail, ip_address: ipAddress || 'unknown', successful: Boolean(record), created_at: now });
    if (!record) throw new DashboardError('invalid_credentials', 'Email or password is incorrect.', 401);
    const user = await this.store.updateUserSignIn(record.id, now);
    return { user, session: await this.issueSession(user.id, now) };
  }
  async issueSession(userId, createdAt = this.now()) {
    const token = createOpaqueToken();
    const session = { id: createId('ses'), user_id: userId, token_hash: hashDashboardSession(token, this.sessionSecret), created_at: createdAt, expires_at: this.expiresAt(), last_seen_at: createdAt };
    await this.store.pruneAuthSessions(createdAt);
    await this.store.createAuthSession(session);
    return { token, expires_at: session.expires_at };
  }
  async authenticate(token) {
    if (!token) return null;
    const now = this.now();
    // Existing sessions use the legacy digest; newly issued sessions use an
    // HMAC when a server-only session secret is configured.
    let record = await this.store.findAuthSession(hashDashboardSession(token, this.sessionSecret), now);
    if (!record && this.sessionSecret) record = await this.store.findAuthSession(hashToken(token), now);
    if (!record || record.user_status !== 'active') return null;
    await this.store.touchAuthSession(record.id, now);
    return { user: { version: 1, id: record.user_id, email: record.email, full_name: record.full_name, status: record.user_status, created_at: record.user_created_at, updated_at: record.user_updated_at, last_signed_in_at: record.last_signed_in_at }, session_id: record.id };
  }
  async signOut(token) {
    if (!token) return;
    await this.store.deleteAuthSession(hashDashboardSession(token, this.sessionSecret));
    if (this.sessionSecret) await this.store.deleteAuthSession(hashToken(token));
  }
  async accountContext(userId) {
    const user = await this.store.findUserById(userId);
    const organizations = await this.store.listOrganizationsForUser(userId);
    return { user, organizations };
  }
}

module.exports = { AuthService, SESSION_DURATION_MS, MAX_LOGIN_FAILURES, hashDashboardSession };
