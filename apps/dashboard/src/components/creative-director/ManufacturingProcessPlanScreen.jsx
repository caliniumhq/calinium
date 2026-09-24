import { useEffect, useMemo, useRef, useState } from 'react';

function editableStep(step = {}) {
  return {
    content_id: step.content_id || null,
    title: step.title || '',
    text: step.text || '',
    process_icon: step.process_icon || 'none',
    image_asset_id: step.image_asset_id || '',
    image_alt_text: step.image_alt_text || '',
    decorative_media: Boolean(step.decorative_media),
    evidence_note: step.evidence_note || ''
  };
}

function copySteps(steps) { return (steps || []).map(editableStep); }

export function ManufacturingProcessPlanScreen({ session, assets = [], onSave, onRegenerate, onApprove, onReturnResources, pending, embedded = false }) {
  const candidate = session.content_plan?.manufacturing_process || {};
  const [steps, setSteps] = useState(() => copySteps(candidate.steps));
  const lastSaved = useRef(JSON.stringify(copySteps(candidate.steps)));
  const Heading = embedded ? 'h2' : 'h1';

  useEffect(() => {
    const next = copySteps(candidate.steps);
    setSteps(next);
    lastSaved.current = JSON.stringify(next);
  }, [candidate.candidate_version]);

  const fingerprint = JSON.stringify(steps);
  useEffect(() => {
    if (fingerprint === lastSaved.current || !Number.isInteger(candidate.candidate_version)) return undefined;
    const timer = window.setTimeout(() => onSave(candidate.candidate_version, steps), 700);
    return () => window.clearTimeout(timer);
  }, [candidate.candidate_version, fingerprint, onSave, steps]);

  const images = useMemo(() => assets.filter((asset) => asset.upload_status === 'ready' && asset.mime_type?.startsWith('image/')), [assets]);
  const update = (index, patch) => setSteps((current) => current.map((step, position) => position === index ? { ...step, ...patch } : step));
  const remove = (index) => setSteps((current) => current.filter((_, position) => position !== index));
  const move = (index, direction) => setSteps((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const saveNow = () => { lastSaved.current = fingerprint; return onSave(candidate.candidate_version, steps); };

  return <section className="editorial-grid-plan" aria-labelledby="manufacturing-process-plan-title">
    <div className="cd-stage-intro"><p className="eyebrow">Content plan</p><Heading id="manufacturing-process-plan-title">Review your Manufacturing Process</Heading><p>List only the verified stages you want customers to understand, in the order you approve. Calinium will not supply a process, origin, timing, or quality claim.</p></div>
    <p className="resource-plan-note" role="status">Changes save automatically. Approval requires two or more merchant-confirmed, ordered stages. Project images are optional; video, duration, and statistics are not part of this workflow.</p>
    {candidate.warnings?.length > 0 && <section className="resource-validation" role="alert"><p>Resolve these details before approval.</p><ul>{candidate.warnings.map((warning) => <li key={warning}>{warning.replaceAll('_', ' ')}</li>)}</ul></section>}
    <ol className="editorial-grid-plan__stories">
      {steps.map((step, index) => <li key={step.content_id || `new-${index}`}>
        <article className="editorial-grid-plan__story">
          <div className="editorial-grid-plan__story-header"><h3>Process stage {index + 1}</h3><div><button className="text-button" type="button" onClick={() => move(index, -1)} disabled={pending || index === 0}>Move earlier</button><button className="text-button" type="button" onClick={() => move(index, 1)} disabled={pending || index === steps.length - 1}>Move later</button><button className="text-button" type="button" onClick={() => remove(index)} disabled={pending}>Remove</button></div></div>
          <div className="editorial-grid-plan__fields">
            <label><span>Stage title</span><input value={step.title} onChange={(event) => update(index, { title: event.target.value })} maxLength="240" required /></label>
            <label><span>Stage explanation <small>(optional)</small></span><textarea value={step.text} onChange={(event) => update(index, { text: event.target.value })} maxLength="1200" rows="3" /></label>
            <label><span>Decorative icon <small>(optional)</small></span><select value={step.process_icon} onChange={(event) => update(index, { process_icon: event.target.value })}><option value="none">No icon</option><option value="settings">Settings</option><option value="factory">Factory</option><option value="check">Check</option><option value="package">Package</option></select></label>
            <label><span>Supporting image <small>(optional)</small></span><select value={step.image_asset_id} onChange={(event) => update(index, { image_asset_id: event.target.value, image_alt_text: event.target.value ? step.image_alt_text : '', decorative_media: event.target.value ? step.decorative_media : false })}><option value="">No image</option>{images.map((asset) => <option key={asset.id} value={asset.id}>{asset.display_title}</option>)}</select></label>
            {step.image_asset_id && <><label className="editorial-grid-plan__wide"><span>Image description <small>(required unless decorative)</small></span><input value={step.image_alt_text} onChange={(event) => update(index, { image_alt_text: event.target.value })} maxLength="500" disabled={step.decorative_media} /></label><label><span><input type="checkbox" checked={step.decorative_media} onChange={(event) => update(index, { decorative_media: event.target.checked, image_alt_text: event.target.checked ? '' : step.image_alt_text })} /> Decorative image</span></label></>}
            <label className="editorial-grid-plan__wide"><span>Merchant-confirmed evidence record</span><textarea value={step.evidence_note} onChange={(event) => update(index, { evidence_note: event.target.value })} maxLength="1200" rows="3" required /></label>
          </div>
          <p className="resource-plan-note">Evidence source: merchant confirmation. {step.image_asset_id ? 'Image source: approved project image.' : 'No image selected.'} This only describes the approved ordered stage; it does not make claims about craft, materials, location, sustainability, quality, or duration.</p>
        </article>
      </li>)}
    </ol>
    {steps.length === 0 && <p className="resource-plan-note">Add at least two real, merchant-confirmed process stages when ready. Calinium will not generate generic stages.</p>}
    <div className="cd-stage-actions editorial-grid-plan__actions"><button className="button button--quiet" type="button" onClick={onReturnResources} disabled={pending}>Return to resources</button><button className="button button--quiet" type="button" onClick={() => setSteps((current) => [...current, editableStep()])} disabled={pending || steps.length >= 10}>Add process stage</button><button className="button button--quiet" type="button" onClick={() => onRegenerate(candidate.candidate_version)} disabled={pending}>Refresh validation</button><button className="button button--quiet" type="button" onClick={saveNow} disabled={pending}>Save now</button><button className="button button--primary button--large" type="button" onClick={() => onApprove(candidate.candidate_version)} disabled={pending || steps.length < 2}>Approve Manufacturing Process plan</button></div>
  </section>;
}
