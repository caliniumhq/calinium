const STATE_COPY = Object.freeze({
  ready: 'Ready',
  optional_not_included: 'Optional — not included',
  needs_input: 'Needs your input',
  required_before_continuing: 'Required before continuing'
});

export function ContentPlanStatusList({ projection, onContinue = null, pending = false }) {
  const targets = (projection?.targets || []).filter((target) => target.available_in_direction || target.state !== 'optional_not_included');
  if (!targets.length) {
    if (!projection?.resolved) return null;
    return <section className="summary-card" aria-labelledby="content-plan-status-heading">
      <h2 id="content-plan-status-heading">Content availability</h2>
      <p>Ready — no storefront content decisions are required.</p>
      {onContinue && <div className="cd-stage-actions">
        <button className="button button--primary" type="button" disabled={pending} onClick={onContinue}>{pending ? 'Continuing…' : 'Continue'}</button>
      </div>}
    </section>;
  }
  return <section className="summary-card" aria-labelledby="content-plan-status-heading">
    <h2 id="content-plan-status-heading">Content availability</h2>
    <ul className="resource-validation">
      {targets.map((target) => <li key={target.content_key} data-content-plan-target={target.content_key}>
        <strong>{target.label}</strong> — <span>{STATE_COPY[target.state] || STATE_COPY.required_before_continuing}</span>
      </li>)}
    </ul>
    {projection.resolved && onContinue && <div className="cd-stage-actions">
      <button className="button button--primary" type="button" disabled={pending} onClick={onContinue}>{pending ? 'Continuing…' : 'Continue'}</button>
    </div>}
  </section>;
}

export { STATE_COPY };
