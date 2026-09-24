import { t } from '../../lib/i18n';
import { PreviewCard } from './PreviewCard';
import { StatusBadge } from './StatusBadge';

export function PreviewScreen({ session, onRegenerate, onApprove, pending }) {
  const preview = session.preview_state || {};
  const shopifyPreview = preview.shopify_preview || null;
  const hasShopifyPreview = shopifyPreview?.status === 'ready' && /^https:\/\//.test(shopifyPreview.preview_url || '');
  return <section className="preview-screen" aria-labelledby="preview-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.preview.eyebrow')}</p><h1 id="preview-title">{t('creative_director.preview.title')}</h1><p>{t('creative_director.preview.description')}</p></div>
    <StatusBadge status={preview.status || 'not_available'} />
    <div className="preview-grid">{(preview.available_views || []).map((view) => <PreviewCard key={view} view={view} />)}</div>
    {hasShopifyPreview ? <a className="button button--primary" href={shopifyPreview.preview_url} target="_blank" rel="noreferrer">{t('creative_director.preview.open_shopify')}</a> : <p className="preview-note">{t('creative_director.preview.shopify_unavailable')}</p>}
    <p className="preview-note">{preview.warning || t('creative_director.preview.note')}</p>
    <div className="cd-stage-actions"><button className="button button--quiet" type="button" onClick={onRegenerate} disabled={pending}>{t('creative_director.actions.regenerate')}</button><button className="button button--primary button--large" type="button" onClick={onApprove} disabled={pending}>{t('creative_director.preview.approve')}</button></div>
  </section>;
}
