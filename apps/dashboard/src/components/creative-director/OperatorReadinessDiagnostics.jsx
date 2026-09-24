import { useRef, useState } from 'react';

const readinessComponents = Object.freeze([
  ['source_attestation', 'Source attestation'],
  ['database', 'Database'],
  ['artifact_storage', 'Artifact storage'],
  ['durable_job_storage', 'Durable job storage'],
  ['generation_worker', 'Generation worker'],
  ['render_qa_worker', 'Render / QA worker'],
  ['shopify_cli_runtime', 'Shopify CLI runtime'],
  ['shopify_cli_runtime_state', 'Shopify CLI runtime state'],
  ['shopify_storefront_password', 'Storefront preview authentication'],
  ['controlled_shopify_target', 'Controlled Shopify target'],
  ['d1', 'D1'],
  ['d2_7_provider', 'D2.7'],
  ['operator_authorization', 'Controlled beta authorization']
]);

function stateLabel(component) {
  if (!component) return 'NOT_READY';
  if (['READY', 'NOT_READY', 'NOT_REQUIRED'].includes(component.status)) return component.status;
  return component.ready === true ? 'READY' : 'NOT_READY';
}

const POLL_INTERVAL_MS = 500;
const MAX_POLLS = 130;

function wait(duration) { return new Promise((resolve) => globalThis.setTimeout(resolve, duration)); }

export function OperatorReadinessDiagnostics({ available = false, onCheck, onRefresh = null, onRecoverQa = null, onSubmitQa = null, onRecoverPreviewProvenance = null, onSucceedRenderTarget = null }) {
  const [pending, setPending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingQa, setSubmittingQa] = useState(false);
  const [recoveringQa, setRecoveringQa] = useState(false);
  const [recoveringPreview, setRecoveringPreview] = useState(false);
  const [succeedingTarget, setSucceedingTarget] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);
  const [qaOutcome, setQaOutcome] = useState(null);
  const [recoveryOutcome, setRecoveryOutcome] = useState(null);
  const [previewRecoveryOutcome, setPreviewRecoveryOutcome] = useState(null);
  const [targetSuccessionOutcome, setTargetSuccessionOutcome] = useState(null);
  const [refreshOperation, setRefreshOperation] = useState(null);
  const qaSubmissionLock = useRef(false);
  const qaRecoveryLock = useRef(false);
  const previewRecoveryLock = useRef(false);
  const targetSuccessionLock = useRef(false);

  if (!available) return null;

  const check = async () => {
    setPending(true);
    setFailure(null);
    try {
      const next = await onCheck();
      setResult(next || null);
      if (!next) setFailure({ status: 0, code: 'readiness_result_unavailable' });
    } catch (error) {
      setResult(null);
      setFailure({ status: Number(error?.status || 0), code: String(error?.code || 'readiness_request_failed') });
    } finally {
      setPending(false);
    }
  };

  const refresh = async () => {
    if (typeof onRefresh !== 'function') return;
    setRefreshing(true);
    setFailure(null);
    try {
      const accepted = await onRefresh();
      setRefreshOperation(accepted || null);
      if (!accepted?.operation_id) throw Object.assign(new Error('Readiness refresh was not accepted.'), { code: 'readiness_refresh_unavailable', status: accepted?.http_status || 0 });
      for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
        const next = await onCheck();
        setResult(next || null);
        const active = next?.refresh?.status === 'running' && next.refresh.operation_id === accepted.operation_id;
        if (!active) return;
        await wait(POLL_INTERVAL_MS);
      }
      setFailure({ status: 0, code: 'readiness_refresh_poll_timeout' });
    } catch (error) {
      setFailure({ status: Number(error?.status || 0), code: String(error?.code || 'readiness_refresh_failed') });
    } finally {
      setRefreshing(false);
    }
  };

  const submitQa = async () => {
    const submission = result?.qa_review_submission;
    if (qaSubmissionLock.current || typeof onSubmitQa !== 'function' || submission?.available !== true || !submission.request) return;
    qaSubmissionLock.current = true;
    setSubmittingQa(true);
    setFailure(null);
    setQaOutcome(null);
    try {
      const applied = await onSubmitQa(submission.request);
      if (applied?.operation?.status !== 'applied') throw Object.assign(new Error('Founder QA submission was not applied.'), { code: 'founder_qa_submission_not_applied', status: 0 });
      setQaOutcome({ status: 'submitted' });
      try {
        const next = await onCheck();
        setResult(next || null);
      } catch (error) {
        setResult(null);
        setFailure({ status: Number(error?.status || 0), code: String(error?.code || 'founder_qa_authoritative_refresh_failed') });
      }
    } catch (error) {
      setQaOutcome({ status: 'failed', http_status: Number(error?.status || 0), code: String(error?.code || 'founder_qa_submission_failed') });
    } finally {
      setSubmittingQa(false);
      qaSubmissionLock.current = false;
    }
  };

  const recoverQa = async () => {
    const recovery = result?.qa_review_recovery;
    if (qaRecoveryLock.current || typeof onRecoverQa !== 'function' || recovery?.available !== true || !recovery.request) return;
    qaRecoveryLock.current = true;
    setRecoveringQa(true);
    setFailure(null);
    setRecoveryOutcome(null);
    try {
      const applied = await onRecoverQa(recovery.request);
      if (applied?.operation?.status !== 'applied') throw Object.assign(new Error('Founder QA evidence recovery was not applied.'), { code: 'founder_qa_recovery_not_applied', status: 0 });
      setRecoveryOutcome({ status: 'recovered' });
      try {
        const next = await onCheck();
        setResult(next || null);
      } catch (error) {
        setResult(null);
        setFailure({ status: Number(error?.status || 0), code: String(error?.code || 'founder_qa_recovery_authoritative_refresh_failed') });
      }
    } catch (error) {
      setRecoveryOutcome({ status: 'failed', http_status: Number(error?.status || 0), code: String(error?.code || 'founder_qa_recovery_failed') });
    } finally {
      setRecoveringQa(false);
      qaRecoveryLock.current = false;
    }
  };

  const recoverPreviewProvenance = async () => {
    const recovery = result?.preview_provenance_recovery;
    if (previewRecoveryLock.current || typeof onRecoverPreviewProvenance !== 'function' || recovery?.available !== true || !recovery.request) return;
    previewRecoveryLock.current = true;
    setRecoveringPreview(true);
    setFailure(null);
    setPreviewRecoveryOutcome(null);
    try {
      const applied = await onRecoverPreviewProvenance(recovery.request);
      if (applied?.operation?.status !== 'applied') throw Object.assign(new Error('Preview recovery was not applied.'), { code: 'preview_provenance_recovery_not_applied', status: 0 });
      setPreviewRecoveryOutcome({ status: 'recovered' });
      const next = await onCheck();
      setResult(next || null);
    } catch (error) {
      setPreviewRecoveryOutcome({ status: 'failed', http_status: Number(error?.status || 0), code: String(error?.code || 'preview_provenance_recovery_failed') });
    } finally {
      setRecoveringPreview(false);
      previewRecoveryLock.current = false;
    }
  };

  const succeedRenderTarget = async () => {
    const succession = result?.render_target_succession;
    if (targetSuccessionLock.current || typeof onSucceedRenderTarget !== 'function' || succession?.available !== true || !succession.request) return;
    targetSuccessionLock.current = true;
    setSucceedingTarget(true);
    setFailure(null);
    setTargetSuccessionOutcome(null);
    try {
      const applied = await onSucceedRenderTarget(succession.request);
      if (applied?.operation?.status !== 'applied') throw Object.assign(new Error('Preview target revalidation was not applied.'), { code: 'render_target_succession_not_applied', status: 0 });
      setTargetSuccessionOutcome({ status: 'started' });
      const next = await onCheck();
      setResult(next || null);
    } catch (error) {
      setTargetSuccessionOutcome({ status: 'failed', http_status: Number(error?.status || 0), code: String(error?.code || 'render_target_succession_failed') });
    } finally {
      setSucceedingTarget(false);
      targetSuccessionLock.current = false;
    }
  };

  const expanded = pending || refreshing || submittingQa || recoveringQa || recoveringPreview || succeedingTarget || Boolean(result) || Boolean(failure) || Boolean(refreshOperation) || Boolean(qaOutcome) || Boolean(recoveryOutcome) || Boolean(previewRecoveryOutcome) || Boolean(targetSuccessionOutcome);
  const controlsPending = pending || refreshing || submittingQa || recoveringQa || recoveringPreview || succeedingTarget;
  return <>
    <button className="text-button quick-start-header__readiness" type="button" aria-expanded={expanded} aria-controls="quick-start-operator-readiness" disabled={controlsPending} onClick={check}>{pending ? 'Checking…' : 'System readiness'}</button>
    {expanded && <section id="quick-start-operator-readiness" className="quick-start-operator-readiness" aria-label="System readiness result" aria-live="polite" aria-busy={controlsPending ? 'true' : 'false'}>
      {pending && <p>Checking the protected staging runtime…</p>}
      {refreshing && <p>Refreshing the bounded readiness snapshot…</p>}
      {recoveringQa && <p>Recovering the saved founder review…</p>}
      {recoveringPreview && <p>Recovering the verified preview reference…</p>}
      {succeedingTarget && <p>Revalidating the controlled preview target…</p>}
      {submittingQa && <p>Submitting the saved founder review…</p>}
      {failure && <p className="quick-start-operator-readiness__failure"><strong>NOT_READY</strong> · HTTP {failure.status || 'unavailable'} · {failure.code}</p>}
      {qaOutcome?.status === 'submitted' && <p role="status">Founder QA accepted. Reloaded the authoritative flow.</p>}
      {qaOutcome?.status === 'failed' && <p className="quick-start-operator-readiness__failure" role="alert"><strong>NOT_SUBMITTED</strong> · HTTP {qaOutcome.http_status || 'unavailable'} · {qaOutcome.code}</p>}
      {recoveryOutcome?.status === 'recovered' && <p role="status">Saved review recovered. Founder acceptance is ready for a separate confirmation.</p>}
      {recoveryOutcome?.status === 'failed' && <p className="quick-start-operator-readiness__failure" role="alert"><strong>NOT_RECOVERED</strong> · HTTP {recoveryOutcome.http_status || 'unavailable'} · {recoveryOutcome.code}</p>}
      {previewRecoveryOutcome?.status === 'recovered' && <p role="status">Preview provenance recovered. The verified preview is available.</p>}
      {previewRecoveryOutcome?.status === 'failed' && <p className="quick-start-operator-readiness__failure" role="alert"><strong>NOT_RECOVERED</strong> · HTTP {previewRecoveryOutcome.http_status || 'unavailable'} · {previewRecoveryOutcome.code}</p>}
      {targetSuccessionOutcome?.status === 'started' && <p role="status">Preview target revalidation started. Calinium is preparing a fresh verified preview.</p>}
      {targetSuccessionOutcome?.status === 'failed' && <p className="quick-start-operator-readiness__failure" role="alert"><strong>NOT_REVALIDATED</strong> · HTTP {targetSuccessionOutcome.http_status || 'unavailable'} · {targetSuccessionOutcome.code}</p>}
      {result && <>
        <div className="quick-start-operator-readiness__summary">
          <strong>{result.status === 'READY' ? 'READY' : 'NOT_READY'}</strong>
          <span>HTTP {result.http_status || 200}</span>
          <span>{result.readiness_revision || 'readiness revision unavailable'}</span>
          <span>Source {result.beta_source_version || 'unattested'}</span>
          <span>Controlled beta {result.beta_feature_flag_status === 'enabled' ? 'enabled' : 'NOT_READY'}</span>
        </div>
        <dl className="quick-start-operator-readiness__components">
          {readinessComponents.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{stateLabel(result.components?.[key])}</dd></div>)}
          <div><dt>MAIN theme exclusion</dt><dd>{result.components?.controlled_shopify_target?.ready === true ? 'ENFORCED' : 'NOT_READY'}</dd></div>
        </dl>
        {result.qa_review_recovery?.available === true && typeof onRecoverQa === 'function' && recoveryOutcome?.status !== 'recovered' && <button className="button button--primary button--compact" type="button" disabled={controlsPending} onClick={recoverQa}>{recoveringQa ? 'Recovering…' : 'Recover saved review'}</button>}
        {result.qa_review_submission?.available === true && typeof onSubmitQa === 'function' && qaOutcome?.status !== 'submitted' && <button className="button button--primary button--compact" type="button" disabled={controlsPending} onClick={submitQa}>{submittingQa ? 'Submitting…' : 'Continue with accepted review'}</button>}
        {result.preview_provenance_recovery?.available === true && typeof onRecoverPreviewProvenance === 'function' && previewRecoveryOutcome?.status !== 'recovered' && <button className="button button--primary button--compact" type="button" disabled={controlsPending} onClick={recoverPreviewProvenance}>{recoveringPreview ? 'Recovering…' : 'Recover preview provenance'}</button>}
        {result.render_target_succession?.available === true && typeof onSucceedRenderTarget === 'function' && targetSuccessionOutcome?.status !== 'started' && <button className="button button--primary button--compact" type="button" disabled={controlsPending} onClick={succeedRenderTarget}>{succeedingTarget ? 'Revalidating…' : 'Revalidate preview target'}</button>}
        {typeof onRefresh === 'function' && <button className="button button--quiet button--compact" type="button" disabled={controlsPending} onClick={refresh}>{refreshing ? 'Refreshing…' : 'Refresh readiness'}</button>}
      </>}
    </section>}
  </>;
}
