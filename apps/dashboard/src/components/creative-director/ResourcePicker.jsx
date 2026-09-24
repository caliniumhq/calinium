import { useEffect, useMemo, useState } from 'react';
import { t } from '../../lib/i18n';
import { ShopifyConnectionPanel } from './ShopifyConnectionPanel';
import { ShopifyResourceApprovalList } from './ShopifyResourceApprovalList';

const assetKinds = new Set(['image', 'video']);
const shopifyTypesByKind = { product: ['product'], collection: ['collection'], menu: ['menu'], image: ['file', 'product_media'], video: ['file', 'product_media'] };
const confirmationActionClasses = new Set(['merchant_confirmation_required', 'critical_confirmation_required']);

function effectivePlan(plan) {
  const omittedSections = new Set(plan.confirmation_eligibility?.summary?.omitted_section_ids || []);
  const omittedFields = new Set(plan.confirmation_eligibility?.summary?.omitted_field_refs || []);
  const fields = (plan.fields || []).filter((field) => !omittedSections.has(field.section_id) && !omittedFields.has(field.setting_ref));
  const retained = new Set(fields.map((field) => field.setting_ref));
  return {
    ...plan,
    fields,
    groups: (plan.groups || []).map((group) => ({ ...group, field_refs: (group.field_refs || []).filter((fieldRef) => retained.has(fieldRef)) })).filter((group) => group.field_refs.length),
    required_assets: (plan.required_assets || []).filter((asset) => !(asset.field_refs || []).length || (asset.field_refs || []).some((fieldRef) => retained.has(fieldRef)))
  };
}

function dashboardReferenceId(reference, kind) {
  const expression = kind === 'shopify'
    ? /\/shopify-resources\/([^/?#]+)$/
    : /\/assets\/([^/?#]+)$/;
  return typeof reference === 'string' ? reference.match(expression)?.[1] || null : null;
}

export function savedSelections(session, plan) {
  plan = effectivePlan(plan);
  const context = session.generation_context || {};
  const groups = {};
  for (const group of plan.groups || []) {
    for (const fieldRef of group.field_refs || []) {
      const shopifyId = context.shopify_resource_references?.[fieldRef];
      const assetId = dashboardReferenceId(context.merchant_references?.[fieldRef], 'asset');
      if (shopifyId) { groups[group.kind] = `shopify:${shopifyId}`; break; }
      if (assetId) { groups[group.kind] = `asset:${assetId}`; break; }
    }
  }
  const requiredAssets = {};
  for (const asset of plan.required_assets || []) {
    const assetId = dashboardReferenceId(context.asset_references?.[asset.asset_id], 'asset');
    const shopifyId = dashboardReferenceId(context.asset_references?.[asset.asset_id], 'shopify');
    if (assetId) requiredAssets[asset.asset_id] = assetId;
    if (shopifyId) requiredAssets[asset.asset_id] = `shopify:${shopifyId}`;
  }
  const optionalFields = new Set((plan.fields || []).filter((field) => !field.required).map((field) => field.setting_ref));
  const requiredConfirmations = new Set(plan.confirmation_eligibility?.items
    ? plan.confirmation_eligibility.items.filter((item) => confirmationActionClasses.has(item.classification)).map((item) => item.confirmation_id)
    : plan.required_confirmations || []);
  return {
    groups,
    requiredAssets,
    emptyFields: (context.resolved_empty_fields || []).filter((fieldRef) => optionalFields.has(fieldRef)),
    confirmedRequiredConfirmations: (context.completed_confirmations || []).filter((confirmation) => requiredConfirmations.has(confirmation))
  };
}

function confirmationLabel(confirmation) {
  const value = String(confirmation || '').replace(/^review:/, '').replaceAll(/[_:.-]+/g, ' ').trim();
  return value ? value.replace(/^./, (character) => character.toUpperCase()) : 'Required merchant confirmation';
}

function requirementLabel(field) {
  const section = t(`creative_director.resources.section.${String(field.section_id || '').replaceAll('-', '_')}`);
  const kind = t(`creative_director.resources.field_kind.${field.kind}`);
  return t('creative_director.resources.field_label', {
    section: section.startsWith('creative_director.') ? field.section_id : section,
    kind: kind.startsWith('creative_director.') ? field.kind : kind
  });
}

function blockerLabel(blocker) {
  if (blocker?.displayLabel) return blocker.displayLabel;
  if (blocker?.sectionId) return requirementLabel({ section_id: blocker.sectionId, kind: blocker.expectedResourceKind });
  return blocker?.fieldPath || t('creative_director.resources.required_asset');
}

function sourceOptions(group, assets, shopifyResources) {
  const options = [];
  if (assetKinds.has(group.kind)) {
    for (const asset of assets.filter((item) => group.kind === 'video' ? item.asset_type === 'video' : item.mime_type.startsWith('image/'))) options.push({ value: `asset:${asset.id}`, label: asset.display_title });
  }
  for (const entry of shopifyResources.filter(({ resource, approval }) => approval?.approval_status === 'approved' && resource.availability_status === 'available' && (shopifyTypesByKind[group.kind] || []).includes(resource.resource_type))) options.push({ value: `shopify:${entry.resource.id}`, label: entry.resource.display_title });
  return options;
}
function requiredAssetOptions(assets, shopifyResources) {
  const options = assets
    .filter((asset) => asset.mime_type.startsWith('image/') || asset.asset_type === 'video')
    .map((asset) => ({ value: asset.id, label: asset.display_title }));
  for (const entry of shopifyResources.filter(({ resource, approval }) => approval?.approval_status === 'approved' && resource.availability_status === 'available' && ['file', 'product_media'].includes(resource.resource_type))) {
    options.push({ value: `shopify:${entry.resource.id}`, label: entry.resource.display_title });
  }
  return options;
}

export function ResourcePicker({ session, assets, shopify, error = null, errorDetails = null, onSave, onOpenAssets, onConnectShopify, onSyncShopify, onCheckShopify, onDisconnectShopify, onLoadShopifyResources, onDecideShopifyResource, onRevokeShopifyResource, pending }) {
  const plan = session.resource_plan || {};
  const displayPlan = effectivePlan(plan);
  const [groupSelections, setGroupSelections] = useState(() => savedSelections(session, plan).groups);
  const [requiredAssetSelections, setRequiredAssetSelections] = useState(() => savedSelections(session, plan).requiredAssets);
  const [emptyFields, setEmptyFields] = useState(() => savedSelections(session, plan).emptyFields);
  const [confirmedRequiredConfirmations, setConfirmedRequiredConfirmations] = useState(() => savedSelections(session, plan).confirmedRequiredConfirmations);
  const [saveValidation, setSaveValidation] = useState(null);
  const [shopifyResources, setShopifyResources] = useState([]);
  const activeAssets = useMemo(() => assets.filter((asset) => asset.upload_status === 'ready'), [assets]);
  const connection = shopify?.connection || null;
  useEffect(() => {
    const saved = savedSelections(session, plan);
    setGroupSelections(saved.groups);
    setRequiredAssetSelections(saved.requiredAssets);
    setEmptyFields(saved.emptyFields);
    setConfirmedRequiredConfirmations(saved.confirmedRequiredConfirmations);
  }, [session.id, session.updated_at]);
  const refreshResources = async () => {
    if (!connection) { setShopifyResources([]); return; }
    const result = await onLoadShopifyResources({ connectionId: connection.id });
    if (result?.resources) setShopifyResources(result.resources);
  };
  useEffect(() => { refreshResources(); }, [connection?.id, connection?.last_synced_at]);
  const connect = async (domain) => onConnectShopify(domain);
  const sync = async (connectionId) => { const result = await onSyncShopify(connectionId); if (result) await refreshResources(); return result; };
  const decide = async (resourceId, status) => { const result = await onDecideShopifyResource(resourceId, status); if (result) await refreshResources(); return result; };
  const revoke = async (resourceId) => { const result = await onRevokeShopifyResource(resourceId); if (result) await refreshResources(); return result; };
  const save = async () => {
    setSaveValidation(null);
    const assetSelections = {}; const selectedShopify = {};
    for (const group of displayPlan.groups || []) {
      const selected = groupSelections[group.kind];
      if (!selected) continue;
      const [source, id] = selected.split(':');
      for (const fieldRef of group.field_refs) {
        if (source === 'asset') assetSelections[fieldRef] = id;
        if (source === 'shopify') selectedShopify[fieldRef] = id;
      }
    }
    const result = await onSave(assetSelections, requiredAssetSelections, selectedShopify, emptyFields, confirmedRequiredConfirmations, session.generation_context?.resource_confirmation_decisions?.checksum || null);
    if (result?.resource_validation) setSaveValidation(result.resource_validation);
  };
  const errorBlockers = errorDetails?.details?.blockers || [];
  const visibleValidation = saveValidation?.blockers || errorBlockers;
  const counts = shopifyResources.reduce((all, { resource }) => ({ ...all, [resource.resource_type]: (all[resource.resource_type] || 0) + 1 }), {});
  const approvedResourceCount = shopifyResources.filter(({ approval }) => approval?.approval_status === 'approved').length;
  return <section className="resources-screen" aria-labelledby="resources-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.resources.eyebrow')}</p><h1 id="resources-title">{t('creative_director.resources.title')}</h1><p>{t('creative_director.resources.description')}</p></div>
    <ShopifyConnectionPanel connection={connection} approvedResourceCount={approvedResourceCount} onConnect={connect} onSync={sync} onCheck={onCheckShopify} onDisconnect={onDisconnectShopify} pending={pending} />
    {connection?.connection_status === 'ready' && <p className="shopify-resource-counts" role="status">{Object.entries(counts).length ? Object.entries(counts).map(([type, count]) => `${count} ${t(`creative_director.resources.kind.${type}`)}`).join(' · ') : t('creative_director.resources.shopify.no_resource_counts')}</p>}
    <section className="resource-asset-library"><div><h2>{t('creative_director.resources.assets.title')}</h2><p>{t('creative_director.resources.assets.description')}</p></div><button className="button button--quiet" type="button" onClick={onOpenAssets}>{t('creative_director.resources.assets.open')}</button></section>
    {plan.status === 'blocked' && <p className="form-error" role="alert">{plan.blocker}</p>}
    {error && <section className="resource-validation" role="alert"><p>{error}</p>{errorBlockers.length > 0 && <ul>{errorBlockers.map((blocker) => <li key={blocker.requirementId}>{t('creative_director.resources.blocker_detail', { label: blockerLabel(blocker), detail: blocker.exactValidationFailure })}</li>)}</ul>}</section>}
    {plan.reconciliation?.requires_merchant_review && <p className="resource-plan-note" role="status">{t('creative_director.resources.strategy_reconciled')}</p>}
    {plan.status === 'ready' && <>
      <ShopifyResourceApprovalList connection={connection} resources={shopifyResources} onDecision={decide} onRevoke={revoke} pending={pending} />
      <section className="resource-list" aria-labelledby="resource-list-title"><h2 id="resource-list-title">{t('creative_director.resources.requests')}</h2>{(displayPlan.groups || []).map((group) => {
        const options = sourceOptions(group, activeAssets, shopifyResources);
        const groupFields = (displayPlan.fields || []).filter((field) => group.field_refs.includes(field.setting_ref));
        const missing = groupFields.filter((field) => field.required && !groupSelections[group.kind]);
        return <article key={group.kind} className="resource-picker"><div><h3>{t(`creative_director.resources.kind.${group.kind}`)}</h3><p>{t('creative_director.resources.request_count', { count: group.section_ids.length })}</p>{missing.length > 0 && <p className="resource-picker__validation" role="status">{t('creative_director.resources.selection_needed', { items: missing.map(requirementLabel).join(', ') })}</p>}</div>{(assetKinds.has(group.kind) || shopifyTypesByKind[group.kind]) ? <label><span>{t('creative_director.resources.choose_resource')}</span><select value={groupSelections[group.kind] || ''} onChange={(event) => setGroupSelections({ ...groupSelections, [group.kind]: event.target.value })}><option value="">{t('creative_director.resources.no_asset')}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> : <p className="resource-picker__unavailable">{t(`creative_director.resources.kind_help.${group.kind}`)}</p>}{!group.required && <label className="resource-picker__empty"><input type="checkbox" checked={group.field_refs.every((fieldRef) => emptyFields.includes(fieldRef))} onChange={(event) => setEmptyFields(event.target.checked ? [...new Set([...emptyFields, ...group.field_refs])] : emptyFields.filter((item) => !group.field_refs.includes(item)))} /> {t('creative_director.resources.keep_empty')}</label>}</article>;
      })}</section>
      {(displayPlan.required_assets || []).length > 0 && <section className="resource-list" aria-labelledby="required-assets-title"><h2 id="required-assets-title">{t('creative_director.resources.required_assets')}</h2>{displayPlan.required_assets.map((asset) => <article key={asset.asset_id} className="resource-picker"><div><h3>{asset.label}</h3><p>{asset.explanation?.reasoning || t('creative_director.resources.asset_needed')}</p>{!requiredAssetSelections[asset.asset_id] && <p className="resource-picker__validation" role="status">{t('creative_director.resources.selection_needed', { items: asset.label })}</p>}</div><label><span>{t('creative_director.resources.choose_asset')}</span><select value={requiredAssetSelections[asset.asset_id] || ''} onChange={(event) => setRequiredAssetSelections({ ...requiredAssetSelections, [asset.asset_id]: event.target.value })}><option value="">{t('creative_director.resources.no_asset')}</option>{requiredAssetOptions(activeAssets, shopifyResources).map((candidate) => <option key={candidate.value} value={candidate.value}>{candidate.label}</option>)}</select></label></article>)}</section>}
      {((plan.confirmation_eligibility?.items || plan.required_confirmations || []).length > 0) && <section className="resource-list" aria-labelledby="resource-confirmations-title"><h2 id="resource-confirmations-title">Store facts and optional content</h2><p className="resource-plan-note">Calinium verifies trusted store data, asks only for material facts, and leaves unsupported optional content out.</p>{plan.confirmation_eligibility?.items ? plan.confirmation_eligibility.items.map((item) => {
        const actionable = confirmationActionClasses.has(item.classification);
        const decision = session.generation_context?.resource_confirmation_decisions?.items?.find((entry) => entry.confirmation_id === item.confirmation_id);
        const checked = confirmedRequiredConfirmations.includes(item.confirmation_id) || decision?.state === 'merchant_confirmed';
        return <article className="resource-picker" data-confirmation-state={decision?.state || item.policy_state} key={item.item_id}><div><h3>{item.requested_claim}</h3><p>{item.merchant_state_copy}</p>{item.current_blocking_reason && actionable && <p className="resource-picker__validation" role="status">{item.current_blocking_reason}</p>}</div>{actionable ? <label className="resource-picker__empty"><input type="checkbox" checked={checked} onChange={(event) => setConfirmedRequiredConfirmations(event.target.checked ? [...new Set([...confirmedRequiredConfirmations, item.confirmation_id])] : confirmedRequiredConfirmations.filter((entry) => entry !== item.confirmation_id))} /> Confirm this is accurate</label> : <p className="resource-plan-note">{item.merchant_state_copy}</p>}</article>;
      }) : plan.required_confirmations.map((confirmation) => <label className="resource-picker__empty" key={confirmation}><input type="checkbox" checked={confirmedRequiredConfirmations.includes(confirmation)} onChange={(event) => setConfirmedRequiredConfirmations(event.target.checked ? [...new Set([...confirmedRequiredConfirmations, confirmation])] : confirmedRequiredConfirmations.filter((item) => item !== confirmation))} /> {confirmationLabel(confirmation)}</label>)}</section>}
      {visibleValidation.length > 0 && <section className="resource-validation" aria-live="polite"><p>{t('creative_director.resources.validation_summary')}</p><ul>{visibleValidation.map((blocker) => <li key={blocker.requirementId}>{t('creative_director.resources.blocker_detail', { label: blockerLabel(blocker), detail: blocker.exactValidationFailure })}</li>)}</ul></section>}
      <p className="resource-plan-note">{t('creative_director.resources.approval_note')}</p><button className="button button--primary button--large" type="button" onClick={save} disabled={pending}>{t('creative_director.resources.save')}</button>
    </>}
  </section>;
}
