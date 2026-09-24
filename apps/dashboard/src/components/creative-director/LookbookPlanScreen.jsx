import { useEffect, useMemo, useRef, useState } from 'react';

function editableFrame(frame = {}) {
  return {
    content_id: frame.content_id || null,
    image_asset_id: frame.image_asset_id || '',
    mobile_image_asset_id: frame.mobile_image_asset_id || '',
    title: frame.title || '',
    text: frame.text || '',
    destination: { type: frame.destination?.type || '', resource_id: frame.destination?.resource_id || '' },
    media_ratio: frame.media_ratio || 'portrait',
    image_alt_text: frame.image_alt_text || '',
    accessible_label: frame.accessible_label || '',
    decorative_media: Boolean(frame.decorative_media)
  };
}

function copyFrames(frames) { return (frames || []).map(editableFrame); }

export function LookbookPlanScreen({ session, assets = [], onLoadShopifyResources, onSave, onRegenerate, onApprove, onReturnResources, pending, embedded = false }) {
  const candidate = session.content_plan?.lookbook || {};
  const [frames, setFrames] = useState(() => copyFrames(candidate.frames));
  const [products, setProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const lastSaved = useRef(JSON.stringify(copyFrames(candidate.frames)));
  const Heading = embedded ? 'h2' : 'h1';

  useEffect(() => {
    let active = true;
    Promise.all([
      onLoadShopifyResources?.({ resourceType: 'product' }),
      onLoadShopifyResources?.({ resourceType: 'collection' })
    ]).then(([productResult, collectionResult]) => {
      if (!active) return;
      const ready = (entry) => entry.approval?.approval_status === 'approved' && entry.resource?.availability_status === 'available';
      setProducts((productResult?.resources || []).filter((entry) => ready(entry) && entry.resource?.resource_type === 'product'));
      setCollections((collectionResult?.resources || []).filter((entry) => ready(entry) && entry.resource?.resource_type === 'collection'));
    }).catch(() => { if (active) { setProducts([]); setCollections([]); } });
    return () => { active = false; };
  }, [onLoadShopifyResources]);

  useEffect(() => {
    const next = copyFrames(candidate.frames);
    setFrames(next);
    lastSaved.current = JSON.stringify(next);
  }, [candidate.candidate_version]);

  const fingerprint = JSON.stringify(frames);
  useEffect(() => {
    if (fingerprint === lastSaved.current || !Number.isInteger(candidate.candidate_version)) return undefined;
    const timer = window.setTimeout(() => onSave(candidate.candidate_version, frames), 700);
    return () => window.clearTimeout(timer);
  }, [candidate.candidate_version, fingerprint, frames, onSave]);

  const imageAssets = useMemo(() => assets.filter((asset) => asset.upload_status === 'ready' && asset.mime_type?.startsWith('image/')), [assets]);
  const update = (index, patch) => setFrames((current) => current.map((frame, position) => position === index ? { ...frame, ...patch } : frame));
  const updateDestinationType = (index, type) => update(index, { destination: { type, resource_id: '' }, decorative_media: false });
  const updateDestination = (index, resourceId) => update(index, { destination: { ...frames[index].destination, resource_id } });
  const remove = (index) => setFrames((current) => current.filter((_, position) => position !== index));
  const move = (index, direction) => setFrames((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const saveNow = () => { lastSaved.current = fingerprint; return onSave(candidate.candidate_version, frames); };
  const resourcesFor = (type) => type === 'shopify_product' ? products : type === 'shopify_collection' ? collections : [];

  return <section className="editorial-grid-plan" aria-labelledby="lookbook-plan-title">
    <div className="cd-stage-intro"><p className="eyebrow">Content plan</p><Heading id="lookbook-plan-title">Review your Lookbook</Heading><p>Choose approved images and destinations for an ordered visual story. Calinium uses only the content and resources you confirm here.</p></div>
    <p className="resource-plan-note" role="status">Changes save automatically. This first workflow supports approved products, collections, and project images; it does not infer product relationships from imagery.</p>
    {candidate.warnings?.length > 0 && <section className="resource-validation" role="alert"><p>Resolve these details before approval.</p><ul>{candidate.warnings.map((warning) => <li key={warning}>{warning.replaceAll('_', ' ')}</li>)}</ul></section>}
    <ol className="editorial-grid-plan__stories">
      {frames.map((frame, index) => <li key={frame.content_id || `new-${index}`}>
        <article className="editorial-grid-plan__story">
          <div className="editorial-grid-plan__story-header"><h3>Frame {index + 1}</h3><div><button className="text-button" type="button" onClick={() => move(index, -1)} disabled={pending || index === 0}>Move earlier</button><button className="text-button" type="button" onClick={() => move(index, 1)} disabled={pending || index === frames.length - 1}>Move later</button><button className="text-button" type="button" onClick={() => remove(index)} disabled={pending}>Remove</button></div></div>
          <div className="editorial-grid-plan__fields">
            <label><span>Primary image</span><select value={frame.image_asset_id} onChange={(event) => update(index, { image_asset_id: event.target.value })} required><option value="">Choose an approved image</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.display_title}</option>)}</select></label>
            <label><span>Mobile image <small>(optional)</small></span><select value={frame.mobile_image_asset_id} onChange={(event) => update(index, { mobile_image_asset_id: event.target.value })}><option value="">Use primary image</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.display_title}</option>)}</select></label>
            <label><span>Image ratio</span><select value={frame.media_ratio} onChange={(event) => update(index, { media_ratio: event.target.value })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
            <label><span>Frame title <small>(required for links)</small></span><input value={frame.title} onChange={(event) => update(index, { title: event.target.value })} maxLength="240" /></label>
            <label className="editorial-grid-plan__wide"><span>Frame text <small>(optional)</small></span><textarea value={frame.text} onChange={(event) => update(index, { text: event.target.value })} maxLength="1200" rows="3" /></label>
            <label><span>Destination type <small>(optional)</small></span><select value={frame.destination.type} onChange={(event) => updateDestinationType(index, event.target.value)}><option value="">No destination</option><option value="shopify_product">Approved product</option><option value="shopify_collection">Approved collection</option></select></label>
            {frame.destination.type && <label><span>{frame.destination.type === 'shopify_product' ? 'Product destination' : 'Collection destination'}</span><select value={frame.destination.resource_id} onChange={(event) => updateDestination(index, event.target.value)} required><option value="">Choose an approved destination</option>{resourcesFor(frame.destination.type).map((entry) => <option key={entry.resource.id} value={entry.resource.id}>{entry.resource.display_title}</option>)}</select></label>}
            <label className="editorial-grid-plan__wide"><span>Image description <small>(required unless decorative)</small></span><input value={frame.image_alt_text} onChange={(event) => update(index, { image_alt_text: event.target.value })} maxLength="500" disabled={frame.decorative_media} /></label>
            <label><span>Accessible link label <small>(optional)</small></span><input value={frame.accessible_label} onChange={(event) => update(index, { accessible_label: event.target.value })} maxLength="500" /></label>
            <label><span><input type="checkbox" checked={frame.decorative_media} disabled={Boolean(frame.destination.type)} onChange={(event) => update(index, { decorative_media: event.target.checked, image_alt_text: event.target.checked ? '' : frame.image_alt_text })} /> Decorative image</span></label>
          </div>
          <p className="resource-plan-note">Image source: approved project image. {frame.destination.type ? 'Destination source: approved Shopify resource.' : 'This frame has no destination.'} This remains a draft until you approve the complete content plan.</p>
        </article>
      </li>)}
    </ol>
    {frames.length === 0 && <p className="resource-plan-note">Add an approved image frame when you are ready. Calinium will not create campaign content or captions for you.</p>}
    <div className="cd-stage-actions editorial-grid-plan__actions"><button className="button button--quiet" type="button" onClick={onReturnResources} disabled={pending}>Return to resources</button><button className="button button--quiet" type="button" onClick={() => setFrames((current) => [...current, editableFrame()])} disabled={pending || frames.length >= 6}>Add approved frame</button><button className="button button--quiet" type="button" onClick={() => onRegenerate(candidate.candidate_version)} disabled={pending}>Refresh plan</button><button className="button button--quiet" type="button" onClick={saveNow} disabled={pending}>Save now</button><button className="button button--primary button--large" type="button" onClick={() => onApprove(candidate.candidate_version)} disabled={pending || frames.length === 0}>Approve Lookbook plan</button></div>
  </section>;
}
