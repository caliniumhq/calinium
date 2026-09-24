import { useMemo, useRef, useState } from 'react';
import { buildQuickStartProjection } from '../../lib/quick-start-projection';
import { ConversationScreen } from './ConversationScreen';
import { StorefrontPreview } from './StorefrontPreview';
import { MerchantFlowStatus } from './MerchantFlowStatus';

const destinations = Object.freeze([
  { id: 'chat', label: 'Chat' },
  { id: 'preview', label: 'Preview' },
  { id: 'review', label: 'Review' }
]);

function titleCase(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function QuickStartHeader({ project, status, onExit, onOpenAdvanced, onToggleReview, reviewOpen, operatorDiagnostics }) {
  return <header className={`quick-start-header${operatorDiagnostics ? ' quick-start-header--operator' : ''}`}>
    <button className="wordmark wordmark--button" type="button" onClick={onExit}>CALINIUM</button>
    <div className="quick-start-header__project">
      <strong>{project.name}</strong>
      <span className={`quick-start-status quick-start-status--${status.tone}`}>{status.label}</span>
    </div>
    <div className="quick-start-header__actions">
      {operatorDiagnostics}
      <button className="text-button quick-start-header__review" type="button" aria-expanded={reviewOpen} aria-controls="quick-start-review-panel" onClick={onToggleReview}>{reviewOpen ? 'Close review' : 'Review'}</button>
      <button className="text-button quick-start-header__advanced" type="button" onClick={onOpenAdvanced}>Advanced</button>
      <button className="button button--quiet button--compact" type="button" onClick={onExit}>Continue later</button>
    </div>
  </header>;
}

export function QuickStartPreviewHost({ preview, device, onDeviceChange, onRetry }) {
  return <section className="quick-start-panel quick-start-preview" aria-labelledby="quick-start-preview-title">
    <div className="quick-start-panel__bar">
      <div>
        <p className="eyebrow">Live Preview</p>
        <h2 id="quick-start-preview-title">Storefront direction</h2>
      </div>
      <span className={`quick-start-preview__state quick-start-preview__state--${preview.state}`}>{preview.label}</span>
    </div>
    <div className="quick-start-device-controls" role="group" aria-label="Preview device">
      <button type="button" aria-pressed={device === 'desktop'} onClick={() => onDeviceChange('desktop')}>Desktop</button>
      <button type="button" aria-pressed={device === 'mobile'} onClick={() => onDeviceChange('mobile')}>Mobile</button>
    </div>
    <div className={`quick-start-preview__host quick-start-preview__host--${device}${preview.model ? ' quick-start-preview__host--rendered' : ''}`} data-preview-state={preview.state} aria-busy={preview.qualifier === 'updating' ? 'true' : 'false'}>
      {preview.model
        ? <StorefrontPreview preview={preview} device={device} />
        : <div className="quick-start-preview__empty">
          <span className="quick-start-preview__mark" aria-hidden="true" />
          <h3>{preview.title}</h3>
          <p>{preview.description}</p>
        </div>}
    </div>
    {preview.error && <div className="quick-start-preview__error" role="alert"><span>{preview.error.message}</span><button className="button button--quiet button--compact" type="button" onClick={onRetry}>Retry Preview</button></div>}
    <p className="quick-start-preview__limitation"><strong>{preview.label}:</strong> {preview.limitation}</p>
  </section>;
}

function ResourceSetDecision({ item, pending, onAction }) {
  const resourceSet = item.resourceSet;
  return <article className="quick-start-decision quick-start-resource-set">
    <span className="quick-start-decision__status">{resourceSet.status === 'approved' ? 'Approved' : 'Needs review'}</span>
    <h3>{item.title}</h3>
    <p>{item.description}</p>
    <div className="quick-start-resource-slots">
      {resourceSet.slots.map((slot) => {
        const options = [slot.recommendation, ...(slot.alternatives || [])].filter(Boolean);
        return <section className="quick-start-resource-slot" key={slot.slot_id} aria-label={slot.label}>
          <div className="quick-start-resource-slot__heading">
            <strong>{slot.label}</strong>
            <span>{slot.required ? 'Required' : 'Optional'} · {slot.confidence}</span>
          </div>
          <p>{slot.recommendation?.name || slot.fallback}</p>
          <small>{slot.reason}</small>
          {options.length > 1 && <label>
            <span className="visually-hidden">Change {slot.label}</span>
            <select value={slot.recommendation?.selection_id || ''} disabled={pending || resourceSet.status === 'approved'} onChange={(event) => onAction({ kind: 'replace_resource_set_slot', revisionId: resourceSet.revision_id, slotId: slot.slot_id, selectionId: event.target.value })}>
              {options.map((option) => <option key={option.selection_id} value={option.selection_id}>{option.name}</option>)}
            </select>
          </label>}
          {slot.stale && <span className="quick-start-resource-slot__warning">This choice changed and needs review.</span>}
        </section>;
      })}
    </div>
    {resourceSet.exceptions?.length > 0 && <div className="quick-start-resource-exceptions">
      <strong>Review separately</strong>
      <ul>{resourceSet.exceptions.map((exception, index) => <li key={`${exception.slot_id || 'claim'}-${index}`}>{exception.label}: {exception.reason}</li>)}</ul>
    </div>}
    <button className="button button--primary button--compact" type="button" disabled={pending || (item.action.kind === 'approve_resource_set' && !resourceSet.approvable)} onClick={() => onAction(item.action)}>{item.action.label}</button>
  </article>;
}

function GenerationDecision({ item, generation, pending, onAction }) {
  const inProgress = ['queued', 'specification_building', 'package_generating', 'validating', 'running'].includes(generation.generationStatus);
  return <article className="quick-start-decision quick-start-generation" aria-labelledby={`quick-start-decision-${item.id}`}>
    <span className="quick-start-decision__status">{inProgress ? 'In progress' : item.status}</span>
    <h3 id={`quick-start-decision-${item.id}`}>{item.title}</h3>
    <p>{item.description}</p>
    {generation.staging && <p className="quick-start-generation__staging" role="status">{generation.stagingLabel || 'Staging validation — no Shopify charge'}</p>}
    {generation.failure && <p className="form-error" role="alert">{generation.failure}</p>}
    {item.blockers?.length > 0 && <ul className="quick-start-generation__blockers">{item.blockers.map((blocker) => <li key={blocker.id}>{blocker.reason}</li>)}</ul>}
    {generation.validationPassed && <p className="quick-start-generation__validation">Validated Shopify package</p>}
    <p className="quick-start-generation__boundary">Calinium creates a downloadable ZIP. It will not upload, install, publish, or update your Shopify theme.</p>
    <button className="button button--primary button--compact" type="button" disabled={pending || inProgress} onClick={() => onAction(item.action)}>{pending ? 'Working…' : item.action.label}</button>
  </article>;
}

export function QuickStartDecisionsPanel({ projection, merchantFlow, pending, error, onAction, onStartFlow, onAnswerFlow, onResumeFlow }) {
  const { decisions, summary, creativeDirection, generation } = projection;
  return <aside className="quick-start-panel quick-start-decisions" aria-labelledby="quick-start-decisions-title">
    <div className="quick-start-panel__bar">
      <div><p className="eyebrow">Decisions</p><h2 id="quick-start-decisions-title">Review</h2></div>
      {summary.pendingDecisions > 0 && <span className="quick-start-decisions__count" aria-label={`${summary.pendingDecisions} decision${summary.pendingDecisions === 1 ? '' : 's'} need review`}>{summary.pendingDecisions}</span>}
    </div>
    <dl className="quick-start-summary">
      <div><dt>Direction</dt><dd>{summary.preset || 'Still taking shape'}</dd></div>
      <div><dt>Resources</dt><dd>{summary.selectedResources} saved</dd></div>
      <div><dt>Compositions awaiting review</dt><dd>{summary.contentPlansAwaitingReview}</dd></div>
      <div><dt>Store learning</dt><dd>{summary.storeIntelligence?.label || 'Not available'}</dd></div>
    </dl>
    {creativeDirection?.name && <section className="quick-start-direction-summary" aria-labelledby="quick-start-direction-title">
      <p className="eyebrow">Current direction</p>
      <h3 id="quick-start-direction-title">{creativeDirection.name}</h3>
      {creativeDirection.reason && <p>{creativeDirection.reason}</p>}
      {creativeDirection.alternatives?.length > 0 && <p><strong>Compatible alternatives:</strong> {creativeDirection.alternatives.join(', ')}</p>}
      {creativeDirection.dna && <dl className="quick-start-dna-summary">
        <div><dt>Typography</dt><dd>{titleCase(creativeDirection.dna.typography)}</dd></div>
        <div><dt>Spacing</dt><dd>{titleCase(creativeDirection.dna.spacing)}</dd></div>
        <div><dt>Motion</dt><dd>{titleCase(creativeDirection.dna.motion)}</dd></div>
        <div><dt>Product emphasis</dt><dd>{titleCase(creativeDirection.dna.commerce_balance)}</dd></div>
      </dl>}
    </section>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {(merchantFlow?.flow || projection.generation.paymentStatus === 'not_started') && <MerchantFlowStatus compact result={merchantFlow} pending={pending} onStart={onStartFlow} onAnswer={onAnswerFlow} onResume={onResumeFlow} />}
    <div className="quick-start-decision-list">
      {decisions.length ? decisions.map((item) => item.resourceSet
        ? <ResourceSetDecision key={item.id} item={item} pending={pending} onAction={onAction} />
        : ['generation_readiness', 'generation_consent', 'generation_recovery', 'delivery'].includes(item.type)
          ? <GenerationDecision key={item.id} item={item} generation={generation} pending={pending} onAction={onAction} />
          : <article className="quick-start-decision" key={item.id}>
          <span className="quick-start-decision__status">{item.status}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <button className="button button--primary button--compact" type="button" disabled={pending} onClick={() => onAction(item.action)}>{item.action.label}</button>
        </article>) : <div className="quick-start-decisions__empty" role="status"><h3>{generation.generationStatus === 'validating' ? 'Validating your theme.' : generation.generationStatus !== 'not_started' ? 'Preparing your theme.' : 'No decision is waiting.'}</h3><p>{generation.generationStatus !== 'not_started' ? 'Your paid version is pinned to the approved inputs shown at generation time. You can leave and return without starting another order.' : 'Calinium will place the next canonical review here when it is ready.'}</p></div>}
    </div>
    <p className="quick-start-decisions__note">Detailed approvals remain available in Advanced. Nothing is approved simply by opening Quick Start.</p>
  </aside>;
}

export function QuickStartShell({ data, session, pending, onRespond, onExit, onOpenAdvanced, onDecisionAction, onStartFlow, onAnswerFlow, onResumeFlow, operatorDiagnostics = null }) {
  const projection = useMemo(() => buildQuickStartProjection(data), [data]);
  const [destination, setDestination] = useState('chat');
  const [device, setDevice] = useState('desktop');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const tabs = useRef([]);

  const selectDestination = (next) => {
    setDestination(next);
    if (next === 'review') setReviewOpen(true);
  };
  const handleTabKeyDown = (event, index) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? destinations.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + destinations.length) % destinations.length;
    selectDestination(destinations[nextIndex].id);
    tabs.current[nextIndex]?.focus();
  };
  const handleDecision = async (action) => {
    setDecisionError(null);
    if (action.kind === 'focus_conversation') {
      selectDestination('chat');
      globalThis.setTimeout(() => document.getElementById('quick-start-message')?.focus(), 0);
      return;
    }
    const result = await onDecisionAction(action);
    if (!result) setDecisionError('That decision could not be updated. Your saved work is unchanged, and you can retry or open Advanced.');
  };

  return <main className="quick-start-shell" data-mobile-destination={destination} data-review-open={reviewOpen ? 'true' : 'false'}>
    <div className="quick-start-persistent">
      <QuickStartHeader project={projection.project} status={projection.lifecycle.status} onExit={onExit} onOpenAdvanced={onOpenAdvanced} reviewOpen={reviewOpen} onToggleReview={() => setReviewOpen((current) => !current)} operatorDiagnostics={operatorDiagnostics} />
      <nav className="quick-start-destinations" role="tablist" aria-label="Quick Start workspace">
        {destinations.map((item, index) => <button id={`quick-start-tab-${item.id}`} key={item.id} ref={(element) => { tabs.current[index] = element; }} type="button" role="tab" aria-selected={destination === item.id} aria-controls={`quick-start-${item.id}-panel`} tabIndex={destination === item.id ? 0 : -1} onClick={() => selectDestination(item.id)} onKeyDown={(event) => handleTabKeyDown(event, index)}>{item.label}</button>)}
      </nav>
    </div>
    <div className="quick-start-workspace">
      <div id="quick-start-chat-panel" className="quick-start-panel quick-start-conversation" role="tabpanel" aria-labelledby="quick-start-tab-chat">
        <ConversationScreen compact session={session} onRespond={onRespond} pending={pending} replyAllowed={projection.conversation.replyAllowed} messageId="quick-start-message" submitLabel="Send" />
      </div>
      <div id="quick-start-preview-panel" className="quick-start-preview-slot" role="tabpanel" aria-labelledby="quick-start-tab-preview">
        <QuickStartPreviewHost preview={projection.preview} device={device} onDeviceChange={setDevice} onRetry={() => handleDecision({ kind: 'retry_preview' })} />
      </div>
      <div id="quick-start-review-panel" className="quick-start-review-slot" role="tabpanel" aria-labelledby="quick-start-tab-review">
        <QuickStartDecisionsPanel projection={projection} merchantFlow={data?.merchant_flow} pending={pending} error={decisionError} onAction={handleDecision} onStartFlow={onStartFlow} onAnswerFlow={onAnswerFlow} onResumeFlow={onResumeFlow} />
      </div>
    </div>
  </main>;
}
