import { useEffect, useMemo, useRef, useState } from 'react';

function editable(item = {}, fields) {
  const value = { content_id: item.content_id || null, image_asset_id: item.image_asset_id || '', image_alt_text: item.image_alt_text || '', decorative_media: Boolean(item.decorative_media), evidence_note: item.evidence_note || '' };
  for (const field of fields) value[field.key] = item[field.key] || field.default || '';
  return value;
}

export function EvidencePlanScreen({ session, assets = [], planKey, itemsKey, title, plural, itemName, fields, icon = null, note, onSave, onRegenerate, onApprove, onReturnResources, pending, embedded = false }) {
  const candidate = session.content_plan?.[planKey] || {};
  const [items, setItems] = useState(() => (candidate[itemsKey] || []).map((item) => editable(item, fields)));
  const lastSaved = useRef(JSON.stringify((candidate[itemsKey] || []).map((item) => editable(item, fields))));
  const Heading = embedded ? 'h2' : 'h1';
  useEffect(() => { const next = (candidate[itemsKey] || []).map((item) => editable(item, fields)); setItems(next); lastSaved.current = JSON.stringify(next); }, [candidate.candidate_version, fields, itemsKey]);
  const fingerprint = JSON.stringify(items);
  useEffect(() => { if (fingerprint === lastSaved.current || !Number.isInteger(candidate.candidate_version)) return undefined; const timer = window.setTimeout(() => onSave(candidate.candidate_version, items), 700); return () => window.clearTimeout(timer); }, [candidate.candidate_version, fingerprint, items, onSave]);
  const images = useMemo(() => assets.filter((asset) => asset.upload_status === 'ready' && asset.mime_type?.startsWith('image/')), [assets]);
  const update = (index, patch) => setItems((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item));
  const remove = (index) => setItems((current) => current.filter((_, position) => position !== index));
  const move = (index, direction) => setItems((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  const saveNow = () => { lastSaved.current = fingerprint; return onSave(candidate.candidate_version, items); };
  const add = () => setItems((current) => [...current, editable({}, fields)]);
  const max = candidate.max_items || 12;
  return <section className="editorial-grid-plan" aria-labelledby={`${planKey}-plan-title`}>
    <div className="cd-stage-intro"><p className="eyebrow">Content plan</p><Heading id={`${planKey}-plan-title`}>Review your {title}</Heading><p>{note}</p></div>
    <p className="resource-plan-note" role="status">Changes save automatically. Calinium uses only the facts, dates, people, credentials, and media you explicitly approve.</p>
    {candidate.warnings?.length > 0 && <section className="resource-validation" role="alert"><p>Resolve these details before approval.</p><ul>{candidate.warnings.map((warning) => <li key={warning}>{warning.replaceAll('_', ' ')}</li>)}</ul></section>}
    <ol className="editorial-grid-plan__stories">
      {items.map((item, index) => <li key={item.content_id || `new-${index}`}><article className="editorial-grid-plan__story">
        <div className="editorial-grid-plan__story-header"><h3>{itemName} {index + 1}</h3><div><button className="text-button" type="button" onClick={() => move(index, -1)} disabled={pending || index === 0}>Move earlier</button><button className="text-button" type="button" onClick={() => move(index, 1)} disabled={pending || index === items.length - 1}>Move later</button><button className="text-button" type="button" onClick={() => remove(index)} disabled={pending}>Remove</button></div></div>
        <div className="editorial-grid-plan__fields">
          {fields.map((field) => <label key={field.key} className={field.wide ? 'editorial-grid-plan__wide' : ''}><span>{field.label}{field.required ? '' : <small> (optional)</small>}</span>{field.multiline ? <textarea value={item[field.key]} onChange={(event) => update(index, { [field.key]: event.target.value })} maxLength={field.maxLength || 1200} rows="3" /> : field.options ? <select value={item[field.key]} onChange={(event) => update(index, { [field.key]: event.target.value })}>{field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input value={item[field.key]} onChange={(event) => update(index, { [field.key]: event.target.value })} maxLength={field.maxLength || 240} required={field.required} />}</label>)}
          {icon && <label><span>{icon.label} <small>(optional)</small></span><select value={item[icon.key] || icon.default} onChange={(event) => update(index, { [icon.key]: event.target.value })}>{icon.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>}
          <label><span>Approved supporting image <small>(optional)</small></span><select value={item.image_asset_id} onChange={(event) => update(index, { image_asset_id: event.target.value, image_alt_text: event.target.value ? item.image_alt_text : '', decorative_media: event.target.value ? item.decorative_media : false })}><option value="">No image</option>{images.map((asset) => <option key={asset.id} value={asset.id}>{asset.display_title}</option>)}</select></label>
          {item.image_asset_id && <><label className="editorial-grid-plan__wide"><span>Image description <small>(required unless decorative)</small></span><input value={item.image_alt_text} onChange={(event) => update(index, { image_alt_text: event.target.value })} maxLength="500" disabled={item.decorative_media} /></label><label><span><input type="checkbox" checked={item.decorative_media} onChange={(event) => update(index, { decorative_media: event.target.checked, image_alt_text: event.target.checked ? '' : item.image_alt_text })} /> Decorative image</span></label></>}
          <label className="editorial-grid-plan__wide"><span>Merchant-confirmed evidence record</span><textarea value={item.evidence_note} onChange={(event) => update(index, { evidence_note: event.target.value })} maxLength="1200" rows="3" required /></label>
        </div>
      </article></li>)}
    </ol>
    {items.length === 0 && <p className="resource-plan-note">Add only information you can approve as true. Calinium will not create a placeholder {itemName.toLowerCase()}.</p>}
    <div className="cd-stage-actions editorial-grid-plan__actions"><button className="button button--quiet" type="button" onClick={onReturnResources} disabled={pending}>Return to resources</button><button className="button button--quiet" type="button" onClick={add} disabled={pending || items.length >= max}>Add {itemName.toLowerCase()}</button><button className="button button--quiet" type="button" onClick={() => onRegenerate(candidate.candidate_version)} disabled={pending}>Refresh validation</button><button className="button button--quiet" type="button" onClick={saveNow} disabled={pending}>Save now</button><button className="button button--primary button--large" type="button" onClick={() => onApprove(candidate.candidate_version)} disabled={pending || !items.length}>Approve {title} plan</button></div>
  </section>;
}
