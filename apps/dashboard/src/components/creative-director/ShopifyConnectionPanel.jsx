import { useState } from 'react';
import { t } from '../../lib/i18n';
import { StatusBadge } from './StatusBadge';

// OAuth consent cannot render inside Shopify Admin's iframe. App Bridge v4
// supports a top-level navigation target, which keeps the authorization flow
// in the merchant's current Shopify Admin context instead of loading a
// frame-blocked Shopify authorization page.
export function openShopifyAuthorization(authorizationUrl) {
  if (authorizationUrl) window.open(authorizationUrl, '_top');
}

export function ShopifyConnectionPanel({ connection, approvedResourceCount = 0, onConnect, onSync, onCheck, onDisconnect, pending }) {
  const [shopDomain, setShopDomain] = useState('');
  const startOAuth = async (domain) => {
    const result = await onConnect(domain);
    openShopifyAuthorization(result?.authorization_url);
  };
  const submit = async (event) => { event.preventDefault(); await startOAuth(shopDomain); };
  if (!connection) return <section className="resource-connection" aria-labelledby="shopify-connection-title">
    <div><p className="eyebrow">{t('creative_director.resources.shopify.eyebrow')}</p><h2 id="shopify-connection-title">{t('creative_director.resources.shopify.connect_title')}</h2><p>{t('creative_director.resources.shopify.connect_description')}</p></div>
    <form className="shopify-connect-form" onSubmit={submit}><label><span>{t('creative_director.resources.shopify.domain')}</span><input value={shopDomain} onChange={(event) => setShopDomain(event.target.value)} inputMode="url" autoComplete="url" placeholder="your-store.myshopify.com" required /></label><button className="button button--primary" type="submit" disabled={pending}>{t('creative_director.resources.shopify.connect')}</button></form>
  </section>;
  return <section className="resource-connection" aria-labelledby="shopify-connection-title">
    <div className="shopify-connection__heading">
      <div><p className="eyebrow">{t('creative_director.resources.shopify.eyebrow')}</p><h2 id="shopify-connection-title">{connection.display_name || t('creative_director.resources.shopify.connected_title')}</h2></div>
      <StatusBadge status={connection.connection_status} />
    </div>
    <dl className="shopify-connection__details">
      <div><dt>Shopify store</dt><dd>{connection.shop_domain}</dd></div>
      <div><dt>Connection</dt><dd>{t(`shopify_live.health.${connection.health?.status || 'unknown'}`)}</dd></div>
      <div><dt>{t('shopify_live.permissions')}</dt><dd>{connection.granted_scopes?.length ? t('shopify_live.permissions_granted', { count: connection.granted_scopes.length }) : t('shopify_live.permissions_pending')}</dd></div>
      <div><dt>Last refreshed</dt><dd>{connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : 'Not yet refreshed'}</dd></div>
      <div><dt>Approved resources</dt><dd>{approvedResourceCount}</dd></div>
    </dl>
    <details className="shopify-connection__technical"><summary>Connection details</summary><dl><dt>{t('shopify_live.webhooks')}</dt><dd>{t(`shopify_live.webhook.${connection.health?.webhook_status || 'not_received'}`)}</dd><dt>{t('shopify_live.admin_api_version')}</dt><dd>{connection.health?.admin_api_version || '—'}</dd><dt>{t('shopify_live.webhook_api_version')}</dt><dd>{connection.health?.webhook_api_version || '—'}</dd>{connection.health?.last_failed_sync_at ? <><dt>{t('shopify_live.last_sync_issue')}</dt><dd>{new Date(connection.health.last_failed_sync_at).toLocaleString()}</dd></> : null}</dl></details>
    {connection.health?.missing_scopes?.length ? <p className="shopify-connection__warning" role="status">{t('creative_director.resources.shopify.missing_permissions')}</p> : null}
    {connection.health?.last_failed_sync_at ? <p className="shopify-connection__warning" role="status">{t('shopify_live.sync_needs_attention')}</p> : null}
    <div className="shopify-connection__actions">{connection.connection_status === 'reauthorization_required' ? <button className="button button--primary" type="button" onClick={() => startOAuth(connection.shop_domain)} disabled={pending}>{t('creative_director.resources.shopify.reconnect')}</button> : <button className="button button--primary" type="button" onClick={() => onSync(connection.id)} disabled={pending}>{t('creative_director.resources.shopify.refresh')}</button>}<button className="button button--quiet" type="button" onClick={() => onCheck(connection.id)} disabled={pending}>{t('creative_director.resources.shopify.check')}</button><button className="text-button shopify-connection__disconnect" type="button" onClick={() => onDisconnect(connection.id)} disabled={pending}>{t('creative_director.resources.shopify.disconnect')}</button></div>
  </section>;
}
