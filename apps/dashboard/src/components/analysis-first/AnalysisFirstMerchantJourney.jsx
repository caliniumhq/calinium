import { useEffect, useRef, useState } from 'react';

function actionById(projection, id) {
  return [projection?.primary_action, ...(projection?.secondary_actions || [])]
    .find((action) => action?.id === id && action.enabled);
}

const merchantStageLabels = Object.freeze({
  analyzing_store: 'Analyze your store',
  building_storefront: 'Build your storefront',
  review_preview: 'Review your preview'
});

export function MerchantJourneyStages({ stages }) {
  return <nav className="analysis-first-stages" aria-label="Storefront progress">
    <ol>{stages.map((stage, index) => <li key={stage.id} className={`analysis-first-stages__item is-${stage.status}`} aria-current={stage.status === 'current' ? 'step' : undefined}>
      <span aria-hidden="true">{stage.status === 'complete' ? '✓' : String(index + 1).padStart(2, '0')}</span>
      <span>{merchantStageLabels[stage.id] || stage.label}</span>
      <span className="visually-hidden">{stage.status === 'complete' ? 'Complete' : stage.status === 'current' ? 'Current stage' : 'Upcoming'}</span>
    </li>)}</ol>
  </nav>;
}

export function RecommendationBriefing({ projection, pending, onBuild, onAdjust, onTrack }) {
  const [expanded, setExpanded] = useState(false);
  const reasonButton = useRef(null);
  const direction = projection.direction?.selected_direction;
  const build = projection.primary_action?.id === 'build_preview' ? projection.primary_action : null;
  const adjust = actionById(projection, 'adjust_direction');
  const seeWhy = actionById(projection, 'see_why');
  if (!direction || projection.direction?.choice_required) return null;
  const toggleReasons = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) onTrack?.('recommendation_reason_opened');
  };
  const closeReasons = () => {
    setExpanded(false);
    reasonButton.current?.focus();
  };
  return <article className="analysis-first-card analysis-first-recommendation" aria-labelledby="analysis-first-recommendation-title">
    <p className="eyebrow">Recommended direction</p>
    <h2 id="analysis-first-recommendation-title">{direction.title}</h2>
    <p>{direction.description}</p>
    {expanded && <div className="analysis-first-reasons" id="analysis-first-reasons">
      <h3>Why this fits</h3>
      {projection.direction.reasons.length
        ? <ul>{projection.direction.reasons.slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}</ul>
        : <p>This direction reflects the store information currently available.</p>}
      <button className="text-button" type="button" onClick={closeReasons}>Close explanation</button>
    </div>}
    <div className="analysis-first-actions">
      {build && <button className="button button--primary button--large" type="button" disabled={pending || !build.enabled} onClick={onBuild}>{pending ? 'Working…' : build.label}</button>}
      {seeWhy && <button ref={reasonButton} className="button button--quiet" type="button" aria-expanded={expanded} aria-controls="analysis-first-reasons" onClick={toggleReasons}>{seeWhy.label}</button>}
      {adjust && <button className="text-button" type="button" disabled={pending} onClick={onAdjust}>{adjust.label}</button>}
    </div>
  </article>;
}

export function DirectionChoiceCards({ direction, pending, error, onChoose }) {
  const [selected, setSelected] = useState('');
  const errorId = 'analysis-first-direction-error';
  const submit = async (event) => {
    event.preventDefault();
    if (selected) await onChoose(selected);
  };
  return <form className="analysis-first-card analysis-first-direction" onSubmit={submit} aria-describedby={error ? errorId : undefined}>
    <fieldset disabled={pending}>
      <legend>Choose how customers should experience your store</legend>
      <div className="analysis-first-direction__grid">
        {direction.options.slice(0, 2).map((option) => <label key={option.id} className={`analysis-first-direction__card${selected === option.id ? ' is-selected' : ''}`}>
          <input type="radio" name="storefront-direction" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} />
          <span className="analysis-first-direction__title">{option.title}</span>
          <span>{option.description}</span>
          <span className="visually-hidden">{selected === option.id ? 'Selected' : 'Not selected'}</span>
        </label>)}
      </div>
    </fieldset>
    {error && <p id={errorId} className="form-error" role="alert">{error}</p>}
    <button className="button button--primary button--large" type="submit" disabled={pending || !selected}>{pending ? 'Saving…' : 'Continue'}</button>
  </form>;
}

export function EssentialDetailPrompt({ prompt, pending, error, onSubmit }) {
  const [answer, setAnswer] = useState('');
  const [saveError, setSaveError] = useState(null);
  const inputId = 'analysis-first-essential-detail';
  const errorId = 'analysis-first-essential-error';
  const submit = async (event) => {
    event.preventDefault();
    setSaveError(null);
    const result = await onSubmit(answer.trim());
    if (result) setAnswer('');
    else setSaveError('I couldn’t save that answer yet. Your text is still here so you can retry.');
  };
  return <form className="analysis-first-card analysis-first-essential" onSubmit={submit}>
    <label htmlFor={inputId}>{prompt}</label>
    <textarea id={inputId} value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={pending} aria-describedby={saveError || error ? errorId : undefined} />
    {(saveError || error) && <p id={errorId} className="form-error" role="alert">{saveError || error}</p>}
    <button className="button button--primary" type="submit" disabled={pending || !answer.trim()}>{pending ? 'Saving…' : 'Continue'}</button>
  </form>;
}

export function BuildingStatus({ status }) {
  return <section className="analysis-first-card analysis-first-building" role="status" aria-live="polite" aria-atomic="true">
    <span className="analysis-first-building__indicator" aria-hidden="true" />
    <div><h2>{status.headline}</h2><p>{status.explanation}</p></div>
  </section>;
}

export function PreviewReviewActions({ projection, previewLink, previewAvailability, pending, onApprove, onRequestChanges, onCompare, onAdvanced }) {
  const approve = projection.primary_action?.id === 'approve_design' && projection.primary_action.enabled ? projection.primary_action : null;
  const requestChanges = actionById(projection, 'request_changes');
  const compare = actionById(projection, 'compare_current_store');
  return <section className="analysis-first-card analysis-first-preview" aria-labelledby="analysis-first-preview-title">
    <div className="analysis-first-preview__heading">
      <div>
        <p className="eyebrow">Your Calinium storefront</p>
        <h2 id="analysis-first-preview-title">Ready to review</h2>
      </div>
      <span className="analysis-first-preview__status">Non-live preview</span>
    </div>
    <div className="analysis-first-preview__frame">
      <span className="analysis-first-preview__frame-mark" aria-hidden="true" />
      <div>
        <strong>Your storefront is ready</strong>
        <span>Review the experience in a separate, non-live preview.</span>
      </div>
      {previewLink && <a className="button button--primary" href={previewLink.url} target="_blank" rel="noreferrer">{previewLink.label}</a>}
      {!previewLink && previewAvailability?.status === 'preparing' && <p className="analysis-first-preview__note" role="status">Preparing your preview.</p>}
      {!previewLink && previewAvailability?.status !== 'preparing' && <div className="analysis-first-preview__attention" role="alert">
        <h3>Something needs attention</h3>
        <p>We couldn’t open this preview safely. Your saved storefront remains unchanged.</p>
        <button className="button button--quiet" type="button" onClick={onAdvanced}>Open Advanced</button>
      </div>}
    </div>
    <div className="analysis-first-reassurance">
      <strong>Preview first. Nothing changes without your approval.</strong>
      <span>{projection.safety_reassurance}</span>
    </div>
    <div className="analysis-first-actions analysis-first-decisions">
      {approve && <button className="button button--quiet button--large" type="button" disabled={pending} onClick={onApprove}>{approve.label}</button>}
      {requestChanges && <button className="text-button" type="button" disabled={pending} onClick={onRequestChanges}>{requestChanges.label}</button>}
      {compare && <button className="button button--quiet" type="button" disabled={pending} onClick={onCompare}>{compare.label}</button>}
    </div>
  </section>;
}

function FailurePanel({ projection, pending, onRetry, onAdvanced }) {
  const retry = projection.primary_action?.id === 'retry' && projection.primary_action.enabled ? projection.primary_action : null;
  const contact = actionById(projection, 'contact_support');
  return <section className="analysis-first-card analysis-first-failure" role="alert">
    <h2>Something needs attention</h2>
    <p>{projection.status.explanation}</p>
    <div className="analysis-first-actions">
      {retry && <button className="button button--primary" type="button" disabled={pending} onClick={onRetry}>{pending ? 'Resuming…' : retry.label}</button>}
      {!retry && <button className="button button--quiet" type="button" onClick={onAdvanced}>Open Advanced</button>}
      {contact && <span className="analysis-first-support">Contact support</span>}
    </div>
  </section>;
}

export function AnalysisFirstMerchantJourney({ experience, pending = false, error = null, operatorDiagnostics = null, onChooseDirection, onEssentialDetail, onBuild, onRetry, onApprove, onRequestChanges, onCompare, onAdvanced, onTrack }) {
  const heading = useRef(null);
  const projection = experience?.projection;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [experience?.projection_key]);
  if (!experience?.eligible || !projection) return null;
  const isFailure = projection.status.headline === 'Something needs attention';
  const directionChoice = projection.current_stage.id === 'analyzing_store' && projection.direction?.choice_required;
  const essentialDetail = projection.current_stage.id === 'analyzing_store' && projection.direction?.essential_detail;
  const recommendation = projection.current_stage.id === 'analyzing_store' && projection.direction?.selected_direction && !directionChoice;
  return <main className="analysis-first-shell">
    <header className="analysis-first-header">
      <span className="wordmark">Calinium</span>
      {operatorDiagnostics}
      <button className="text-button" type="button" onClick={onAdvanced}>Advanced</button>
    </header>
    <MerchantJourneyStages stages={projection.stages} />
    <section className="analysis-first-content" aria-labelledby="analysis-first-stage-title">
      <div className="analysis-first-intro">
        <p className="eyebrow">Your storefront</p>
        <h1 id="analysis-first-stage-title" ref={heading} tabIndex="-1">{projection.current_stage.label}</h1>
        {projection.current_stage.id === 'review_preview' && <p>Explore the generated storefront before deciding what to do next.</p>}
        {!recommendation && !directionChoice && !essentialDetail && !isFailure && projection.current_stage.id !== 'review_preview' && <p>{projection.status.explanation}</p>}
      </div>
      {error && !directionChoice && !essentialDetail && <p className="form-error" role="alert">{error}</p>}
      {isFailure ? <FailurePanel projection={projection} pending={pending} onRetry={onRetry} onAdvanced={onAdvanced} /> : <>
        {recommendation && <RecommendationBriefing projection={projection} pending={pending} onBuild={onBuild} onAdjust={onAdvanced} onTrack={onTrack} />}
        {directionChoice && <DirectionChoiceCards direction={projection.direction} pending={pending} error={error} onChoose={onChooseDirection} />}
        {essentialDetail && <EssentialDetailPrompt prompt={projection.direction.essential_detail.prompt} pending={pending} error={error} onSubmit={onEssentialDetail} />}
        {projection.current_stage.id === 'analyzing_store' && !recommendation && !directionChoice && !essentialDetail && <section className="analysis-first-card analysis-first-analyzing" role="status" aria-live="polite"><span className="analysis-first-building__indicator" aria-hidden="true" /><p>{projection.status.headline}</p></section>}
        {projection.current_stage.id === 'building_storefront' && <BuildingStatus status={projection.status} />}
        {projection.current_stage.id === 'review_preview' && <PreviewReviewActions projection={projection} previewLink={experience.preview_link} previewAvailability={experience.preview_availability} pending={pending} onApprove={onApprove} onRequestChanges={onRequestChanges} onCompare={onCompare} onAdvanced={onAdvanced} />}
      </>}
    </section>
  </main>;
}

export { actionById };
