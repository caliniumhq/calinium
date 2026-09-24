'use strict';

const path = require('path');
const { compileStorefrontStrategy } = require('./compile-strategy');
const { loadKnowledgeBase } = require('./load-knowledge-base');
const { GENERIC_PROFILE_ID } = require('./compiler-industry-resolver');

class CompilerStrategyResolutionError extends Error {
  constructor(reasonCode, attempts) {
    super('No validator-compatible compiler strategy is available.');
    this.name = 'CompilerStrategyResolutionError';
    this.reason_code = reasonCode;
    this.attempts = attempts;
  }
}

function validationFor(strategy, error = null) {
  if (error) return { valid: false, errors: [error.name || 'compiler_strategy_failed'] };
  return strategy?.validation_report || { valid: false, errors: ['strategy_validation_report_missing'], warnings: [] };
}

function attempt(profile, root, compile) {
  try {
    const strategy = compile(profile, { root });
    return { profile, strategy, validation: validationFor(strategy), error: null };
  } catch (error) {
    return { profile, strategy: null, validation: validationFor(null, error), error };
  }
}

function compileValidStrategy(profile, options = {}) {
  const root = options.root || path.resolve(__dirname, '../..');
  const compile = options.compile || compileStorefrontStrategy;
  const first = attempt(profile, root, compile);
  if (first.validation.valid) return { profile: first.profile, strategy: first.strategy, fallback: null, attempts: [first.validation] };

  const genericAvailable = loadKnowledgeBase(root).index.industries.has(GENERIC_PROFILE_ID);
  if (options.allowGenericFallback === false || profile.industry === GENERIC_PROFILE_ID || !genericAvailable) {
    throw new CompilerStrategyResolutionError(genericAvailable ? 'strategy_validation_failed' : 'generic_supported_profile_unavailable', [first.validation]);
  }

  const fallbackProfile = { ...profile, industry: GENERIC_PROFILE_ID };
  const fallback = attempt(fallbackProfile, root, compile);
  if (!fallback.validation.valid) throw new CompilerStrategyResolutionError('no_valid_strategy_fallback', [first.validation, fallback.validation]);
  return {
    profile: fallback.profile,
    strategy: fallback.strategy,
    fallback: { transition_count: 1, from_profile_id: profile.industry, to_profile_id: GENERIC_PROFILE_ID, reason_code: 'specialized_strategy_invalid' },
    attempts: [first.validation, fallback.validation]
  };
}

module.exports = { CompilerStrategyResolutionError, compileValidStrategy };
