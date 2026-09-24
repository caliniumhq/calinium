import { useEffect, useMemo, useRef, useState } from 'react';

function editableStory(story = {}) {
  return {
    content_id: story.content_id || null,
    title: story.title || '',
    eyebrow: story.eyebrow || '',
    excerpt: story.excerpt || '',
    destination: { type: 'shopify_collection', resource_id: story.destination?.resource_id || '' },
    image_asset_id: story.image_asset_id || '',
    image_alt_text: story.image_alt_text || ''
  };
}

function copyStories(stories) { return (stories || []).map(editableStory); }

export function EditorialGridPlanScreen({ session, assets = [], onLoadShopifyResources, onSave, onRegenerate, onApprove, onReturnResources, pending, embedded = false }) {
  const candidate = session.content_plan || {};
  const [stories, setStories] = useState(() => copyStories(candidate.stories));
  const [collections, setCollections] = useState([]);
  const lastSaved = useRef(JSON.stringify(copyStories(candidate.stories)));
  const Heading = embedded ? 'h2' : 'h1';
  const StoryHeading = embedded ? 'h3' : 'h2';

  useEffect(() => {
    let active = true;
    onLoadShopifyResources?.({ resourceType: 'collection' }).then((result) => {
      if (!active) return;
      setCollections((result?.resources || []).filter((entry) => entry.approval?.approval_status === 'approved' && entry.resource?.availability_status === 'available' && entry.resource?.resource_type === 'collection'));
    }).catch(() => { if (active) setCollections([]); });
    return () => { active = false; };
  }, [onLoadShopifyResources]);

  useEffect(() => {
    const next = copyStories(candidate.stories);
    setStories(next);
    lastSaved.current = JSON.stringify(next);
  }, [candidate.candidate_version]);

  const fingerprint = JSON.stringify(stories);
  useEffect(() => {
    if (fingerprint === lastSaved.current || !Number.isInteger(candidate.candidate_version)) return undefined;
    const timer = window.setTimeout(() => {
      // The server owns candidate identities, ordering, and validation. The
      // browser sends only merchant-editable fields plus its expected version.
      onSave(candidate.candidate_version, stories);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [candidate.candidate_version, fingerprint, onSave, stories]);

  const imageAssets = useMemo(() => assets.filter((asset) => asset.upload_status === 'ready' && asset.mime_type?.startsWith('image/')), [assets]);
  const update = (index, patch) => setStories((current) => current.map((story, position) => position === index ? { ...story, ...patch } : story));
  const updateDestination = (index, resourceId) => update(index, { destination: { type: 'shopify_collection', resource_id: resourceId } });
  const remove = (index) => setStories((current) => current.filter((_, position) => position !== index));
  const move = (index, direction) => setStories((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const saveNow = () => { lastSaved.current = fingerprint; return onSave(candidate.candidate_version, stories); };

  return <section className="editorial-grid-plan" aria-labelledby="editorial-grid-plan-title">
    <div className="cd-stage-intro"><p className="eyebrow">Content plan</p><Heading id="editorial-grid-plan-title">Review your Editorial Grid</Heading><p>Choose the approved collection stories you want shoppers to discover. Calinium uses only the text and resources you confirm here.</p></div>
    <p className="resource-plan-note" role="status">Changes save automatically. Shopify articles and external links are not available in this first review workflow.</p>
    {candidate.warnings?.length > 0 && <section className="resource-validation" role="alert"><p>Resolve these details before approval.</p><ul>{candidate.warnings.map((warning) => <li key={warning}>{warning.replaceAll('_', ' ')}</li>)}</ul></section>}
    <ol className="editorial-grid-plan__stories">
      {stories.map((story, index) => <li key={story.content_id || `new-${index}`}>
        <article className="editorial-grid-plan__story">
          <div className="editorial-grid-plan__story-header"><StoryHeading>Story {index + 1}</StoryHeading><div><button className="text-button" type="button" onClick={() => move(index, -1)} disabled={pending || index === 0}>Move earlier</button><button className="text-button" type="button" onClick={() => move(index, 1)} disabled={pending || index === stories.length - 1}>Move later</button><button className="text-button" type="button" onClick={() => remove(index)} disabled={pending}>Remove</button></div></div>
          <div className="editorial-grid-plan__fields">
            <label><span>Title</span><input value={story.title} onChange={(event) => update(index, { title: event.target.value })} maxLength="240" required /></label>
            <label><span>Eyebrow <small>(optional)</small></span><input value={story.eyebrow} onChange={(event) => update(index, { eyebrow: event.target.value })} maxLength="120" /></label>
            <label className="editorial-grid-plan__wide"><span>Short description <small>(optional)</small></span><textarea value={story.excerpt} onChange={(event) => update(index, { excerpt: event.target.value })} maxLength="1200" rows="3" /></label>
            <label><span>Collection destination</span><select value={story.destination.resource_id} onChange={(event) => updateDestination(index, event.target.value)} required><option value="">Choose an approved collection</option>{collections.map((entry) => <option key={entry.resource.id} value={entry.resource.id}>{entry.resource.display_title}</option>)}</select></label>
            <label><span>Story image <small>(optional)</small></span><select value={story.image_asset_id} onChange={(event) => update(index, { image_asset_id: event.target.value, image_alt_text: event.target.value ? story.image_alt_text : '' })}><option value="">No image</option>{imageAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.display_title}</option>)}</select></label>
            {story.image_asset_id && <label className="editorial-grid-plan__wide"><span>Image description</span><input value={story.image_alt_text} onChange={(event) => update(index, { image_alt_text: event.target.value })} maxLength="500" required /></label>}
          </div>
          <p className="resource-plan-note">Destination source: approved Shopify collection. {story.image_asset_id ? 'Image source: approved project image.' : 'No image selected.'} This story remains a draft until you approve the complete plan.</p>
        </article>
      </li>)}
    </ol>
    {stories.length === 0 && <p className="resource-plan-note">Add a real collection story when you are ready. Calinium will not fill this grid with placeholder content.</p>}
    <div className="cd-stage-actions editorial-grid-plan__actions"><button className="button button--quiet" type="button" onClick={onReturnResources} disabled={pending}>Return to resources</button><button className="button button--quiet" type="button" onClick={() => setStories((current) => [...current, editableStory()])} disabled={pending || stories.length >= 8}>Add approved story</button><button className="button button--quiet" type="button" onClick={() => onRegenerate(candidate.candidate_version)} disabled={pending}>Refresh plan</button><button className="button button--quiet" type="button" onClick={saveNow} disabled={pending}>Save now</button><button className="button button--primary button--large" type="button" onClick={() => onApprove(candidate.candidate_version)} disabled={pending || stories.length === 0}>Approve Editorial Grid plan</button></div>
  </section>;
}
