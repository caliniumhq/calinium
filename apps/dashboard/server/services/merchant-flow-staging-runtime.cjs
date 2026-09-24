'use strict';

const { assertNonLiveTarget } = require('../../../../ai/merchant-flow');
const { assertMerchantFlowD27TerminalRecovery } = require('../../../../ai/design-evaluation/merchant-flow-d2-7-terminal-recovery');

class MerchantFlowStagingRuntime {
  constructor({ resolveTarget, renderArtifact, evaluateD1, evaluateD27 = null, resumeD27 = null, validateTerminalD27Recovery = null, resolveLegacyD27Lineage = null, recoverLegacyD27Failure = null, shouldEvaluateD27 = () => true } = {}) {
    this.resolveTarget = resolveTarget;
    this.renderArtifact = renderArtifact;
    this.evaluateD1 = evaluateD1;
    this.evaluateD27 = evaluateD27;
    this.resumeD27 = resumeD27;
    this.validateTerminalD27 = validateTerminalD27Recovery;
    this.resolveLegacyD27 = resolveLegacyD27Lineage;
    this.recoverLegacyD27 = recoverLegacyD27Failure;
    this.shouldEvaluateD27 = shouldEvaluateD27;
  }
  async resolveLegacyD27Lineage({ flow, artifact, job }) {
    if (typeof this.resolveLegacyD27 !== 'function') {
      throw Object.assign(new Error('Historical D2.7 lineage resolution is unavailable.'), { code: 'controlled_beta_d2_7_legacy_resolution_unavailable', retryable: false });
    }
    const target = assertNonLiveTarget(await this.resolveTarget({ flow, artifact }), flow);
    return this.resolveLegacyD27({ flow, artifact, target, job });
  }
  async recoverLegacyD27Failure({ flow, artifact, job }) {
    if (typeof this.recoverLegacyD27 !== 'function') {
      throw Object.assign(new Error('Historical D2.7 evidence recovery is unavailable.'), { code: 'controlled_beta_d2_7_legacy_recovery_unavailable', retryable: false });
    }
    const target = assertNonLiveTarget(await this.resolveTarget({ flow, artifact }), flow);
    return this.recoverLegacyD27({ flow, artifact, target, job });
  }
  async validateTerminalD27Recovery(input) {
    if (typeof this.validateTerminalD27 !== 'function') {
      throw Object.assign(new Error('Terminal D2.7 recovery validation is unavailable.'), { code: 'controlled_beta_d2_7_terminal_recovery_unavailable', retryable: false });
    }
    const target = assertNonLiveTarget(await this.resolveTarget({ flow: input.flow, artifact: input.artifact }), input.flow);
    return this.validateTerminalD27({ ...input, target });
  }
  async runRenderQa({ flow, artifact, control = null }) {
    if (control) await control.checkpoint();
    const target = assertNonLiveTarget(await this.resolveTarget({ flow, artifact }), flow);
    if (control) await control.checkpoint();
    const accepted = flow?.render_qa;
    if (accepted?.status === 'failed' && accepted.d2_7_failure && accepted.d1?.status !== 'failed') {
      const historicalManualResume = accepted.d2_7_failure.classification?.failure_class === 'historical_detail_unavailable'
        && Boolean(control?.execution?.resume_operation_id);
      let terminalManualRecovery = false;
      if (flow?.terminal_recovery) {
        const recovery = assertMerchantFlowD27TerminalRecovery(flow.terminal_recovery);
        terminalManualRecovery = recovery.job.resume_operation_id === control?.execution?.resume_operation_id
          && recovery.job.target_attempt === control?.execution?.attempt;
      }
      if ((accepted.d2_7_failure.classification?.retryable !== true && !historicalManualResume && !terminalManualRecovery) || typeof this.resumeD27 !== 'function') {
        throw Object.assign(new Error('The saved D2.7 failure cannot be resumed.'), {
          code: accepted.d2_7_failure.classification?.category || 'd2_7_unknown_provider_failure',
          retryable: false,
          d2_7_failure: accepted.d2_7_failure,
          render_qa: accepted
        });
      }
      try {
        const d27 = await this.resumeD27({ flow, artifact, target, acceptedRenderQa: accepted, cancellation: control });
        if (control) await control.checkpoint();
        const { d2_7_failure: _discardedFailure, ...retained } = accepted;
        const d1Passed = retained.d1?.status === 'passed';
        const d27Passed = ['passed', 'accepted'].includes(d27?.status);
        const failed = retained.d1?.status === 'failed' || d27?.status === 'failed';
        return { ...retained, status: failed ? 'failed' : d1Passed && d27Passed ? 'passed' : 'review_required', d2_7: d27, human_review_required: !failed && !(d1Passed && d27Passed) };
      } catch (error) {
        if (error?.d2_7_failure) {
          error.render_qa = {
            ...accepted,
            status: 'failed',
            d2_7: { status: 'failed', evidence_id: error.d2_7_failure.failure_id, evidence_checksum: error.d2_7_failure.checksum },
            d2_7_failure: error.d2_7_failure,
            human_review_required: false
          };
        }
        throw error;
      }
    }
    const render = await this.renderArtifact({ flow, artifact, target, cancellation: control });
    if (!render?.render_revision || !Array.isArray(render.render_result_ids) || !render.render_checksum) throw Object.assign(new Error('The controlled Shopify render did not return bound evidence.'), { code: 'shopify_render_failed' });
    if (render.source_theme_unchanged !== true || render.temporary_workspace_cleaned !== true || render.runtime_stopped !== true) throw Object.assign(new Error('The controlled Shopify render did not prove source integrity and cleanup.'), { code: 'shopify_render_failed' });
    if (control) await control.checkpoint();
    const d1 = await this.evaluateD1({ flow, artifact, target, render, cancellation: control });
    if (control) await control.checkpoint();
    let d27 = { status: 'not_required', evidence_id: null, evidence_checksum: null };
    if (d1?.status !== 'failed' && this.evaluateD27 && this.shouldEvaluateD27({ flow, artifact, render, d1 })) {
      try {
        d27 = await this.evaluateD27({ flow, artifact, target, render, d1, cancellation: control });
      } catch (error) {
        if (error?.d2_7_failure) {
          error.render_qa = {
            ...render,
            status: 'failed',
            d1,
            d2_7: { status: 'failed', evidence_id: error.d2_7_failure.failure_id, evidence_checksum: error.d2_7_failure.checksum },
            d2_7_failure: error.d2_7_failure,
            human_review_required: false
          };
        }
        throw error;
      }
    }
    if (control) await control.checkpoint();
    const d1Passed = d1?.status === 'passed';
    const d27Passed = ['passed', 'not_required', 'accepted'].includes(d27?.status);
    const failed = d1?.status === 'failed' || d27?.status === 'failed';
    const passed = d1Passed && d27Passed;
    return { ...render, status: failed ? 'failed' : passed ? 'passed' : 'review_required', d1, d2_7: d27, human_review_required: !passed && !failed };
  }
}

module.exports = { MerchantFlowStagingRuntime };
