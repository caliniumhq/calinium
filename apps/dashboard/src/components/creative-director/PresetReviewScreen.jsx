function label(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PresetReviewScreen({ session, onSelect, onApprove, onReturnStrategy, pending }) {
  const candidate = session.preset_selection;
  if (!candidate) return <section aria-labelledby="preset-title"><h1 id="preset-title">Storefront direction</h1><p role="alert">Calinium could not load the preset recommendation.</p></section>;
  const options = [candidate.recommended_preset_id, ...(candidate.alternatives || []).map((item) => item.preset_id)];
  return <section aria-labelledby="preset-title">
    <div className="cd-stage-intro">
      <p className="eyebrow">Storefront preset</p>
      <h1 id="preset-title">Choose the visual system for your storefront</h1>
      <p>Presets shape composition and presentation. They never create products, claims, quotations, or merchant copy.</p>
    </div>
    <section className="summary-card" aria-labelledby="preset-recommendation-title">
      <p className="eyebrow">Recommended</p>
      <h2 id="preset-recommendation-title">{label(candidate.recommended_preset_id)}</h2>
      <ul>{(candidate.recommendation_reasons || []).map((reason) => <li key={reason}>{reason}</li>)}</ul>
    </section>
    <fieldset disabled={pending}>
      <legend>Compatible choices</legend>
      {options.map((presetId) => {
        const alternative = (candidate.alternatives || []).find((item) => item.preset_id === presetId);
        return <label className="approval-card" key={presetId}>
          <input type="radio" name="storefront-preset" value={presetId} checked={candidate.selected_preset_id === presetId} onChange={() => onSelect(candidate.candidate_version, presetId)} />
          <span><strong>{label(presetId)}</strong>{presetId === candidate.recommended_preset_id ? ' — Calinium recommendation' : ''}</span>
          {alternative?.differences?.length ? <small>{alternative.differences.join(' · ')}</small> : null}
        </label>;
      })}
    </fieldset>
    {!candidate.compatibility?.content_ready && candidate.compatibility?.missing_required_content?.length ? <p className="preview-note">Before generation, Store Resources will ask for: {candidate.compatibility.missing_required_content.map(label).join(', ')}.</p> : null}
    {candidate.fallback ? <p className="preview-note">Safe fallback: {label(candidate.fallback.to_preset_id)}. {candidate.fallback.reason}</p> : null}
    <div className="cd-stage-actions">
      <button className="button button--quiet" type="button" onClick={onReturnStrategy} disabled={pending}>Return to strategy</button>
      <button className="button button--primary button--large" type="button" onClick={() => onApprove(candidate.candidate_version)} disabled={pending || !candidate.compatibility?.compatible}>{pending ? 'Saving…' : `Approve ${label(candidate.selected_preset_id)}`}</button>
    </div>
  </section>;
}
