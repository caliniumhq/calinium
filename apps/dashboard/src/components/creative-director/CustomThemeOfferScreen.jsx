import { useEffect, useRef } from 'react';
import { t } from '../../lib/i18n';
import { StatusBadge } from './StatusBadge';
import { MerchantFlowStatus } from './MerchantFlowStatus';

function formatPrice(price) {
  if (!price?.currency || !Number.isInteger(price.amount_cents)) return t('creative_director.offer.price_unavailable');
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: price.currency }).format(price.amount_cents / 100);
}

function idempotencyKey(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function leaveForShopifyApproval(url) {
  if (!url) return;
  // Shopify owns the confirmation page. The redirect stays in the top-level
  // Admin context; no purchase data is retained in browser storage.
  try {
    if (window.top && window.top !== window) { window.top.location.assign(url); return; }
  } catch {
    // Cross-origin frame access is expected. A same-frame navigation remains
    // a safe fallback for a standalone development session.
  }
  window.location.assign(url);
}

export function CustomThemeOfferScreen({ customTheme, merchantFlow, onPurchase, onConfirmPayment, onVerifyPayment, onGenerate, onReturnResources, onStartFlow, onAnswerFlow, onResumeFlow, pending }) {
  const key = useRef(idempotencyKey('custom-theme'));
  const purchaseAttempt = useRef(0);
  const verificationStarted = useRef(false);
  const eligibility = customTheme?.eligibility || { eligible: false, reasons: [{ message: t('creative_director.offer.loading') }] };
  const blockers = eligibility.blocked || eligibility.reasons || [];
  const offer = customTheme?.offer || {};
  const order = customTheme?.order || null;
  const payment = customTheme?.payment || {};
  const returnedOrderId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('calinium_order') : null;
  const returnedFromShopify = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('calinium_billing') === 'return' && returnedOrderId === order?.id;
  useEffect(() => {
    if (!returnedFromShopify || verificationStarted.current || !order || order.payment_status !== 'pending' || !payment.checkout_required) return;
    verificationStarted.current = true;
    onVerifyPayment(order.id, `${key.current}-verify-return`);
  }, [onVerifyPayment, order, payment.checkout_required, returnedFromShopify]);
  const action = async () => {
    const previousPurchaseEnded = ['failed', 'declined', 'cancelled', 'expired', 'invalid', 'refunded'].includes(order?.payment_status);
    if (!order || previousPurchaseEnded) {
      purchaseAttempt.current += 1;
      const result = await onPurchase(`${key.current}-purchase-${purchaseAttempt.current}`, eligibility.readiness_token);
      if (result?.checkout?.redirect_url) leaveForShopifyApproval(result.checkout.redirect_url);
      return result;
    }
    if (order.payment_status === 'pending') return payment.checkout_required
      ? onVerifyPayment(order.id, `${key.current}-verify`)
      : onConfirmPayment(order.id, `${key.current}-payment`);
    if (order.payment_status === 'paid' && order.generation_status !== 'ready') return onGenerate(order.id);
    return null;
  };
  const actionLabel = !order || ['failed', 'declined', 'cancelled', 'expired', 'invalid', 'refunded'].includes(order.payment_status)
    ? t('creative_director.offer.purchase')
    : order.payment_status === 'pending'
      ? payment.checkout_required
        ? t('creative_director.offer.verify_shopify_payment')
        : payment.staging
          ? t('creative_director.offer.confirm_staging_validation')
          : t('creative_director.offer.confirm_development_payment')
      : order.generation_status === 'ready'
        ? t('creative_director.offer.ready')
        : t('creative_director.offer.resume_generation');
  const requiresCurrentEligibility = !order || ['failed', 'declined', 'cancelled', 'expired', 'invalid', 'refunded'].includes(order.payment_status);
  const flowBlocksPurchase = !order && merchantFlow?.flow && merchantFlow.flow.architecture?.status !== 'frozen';
  const actionDisabled = pending || flowBlocksPurchase || (requiresCurrentEligibility && (!eligibility.eligible || !eligibility.readiness_token)) || (order?.payment_status === 'pending' && !payment.available) || order?.generation_status === 'ready';
  return <section className="custom-theme-offer" aria-labelledby="custom-theme-offer-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.offer.eyebrow')}</p><h1 id="custom-theme-offer-title">{t('creative_director.offer.title')}</h1><p>{t('creative_director.offer.description')}</p></div>
    <section className="custom-theme-offer__summary" aria-label={t('creative_director.offer.summary_label')}>
      <div><p className="eyebrow">{t('creative_director.offer.price')}</p><strong>{formatPrice(eligibility.price)}</strong><p>{t('creative_director.offer.price_note')}</p></div>
      {order && <StatusBadge status={order.generation_status === 'ready' ? 'ready' : payment.staging && order.payment_status === 'paid' ? 'staging_authorized' : order.payment_status} />}
    </section>
    <div className="custom-theme-offer__grid">
      <article><h2>{t('creative_director.offer.direction')}</h2><p>{offer.design_direction || t('creative_director.common.not_known')}</p></article>
      <article><h2>{t('creative_director.offer.resources')}</h2><p>{t('creative_director.offer.resources_count', { count: offer.selected_resource_count || 0 })}</p></article>
      <article><h2>{t('creative_director.offer.output')}</h2><p>{offer.output_format || t('creative_director.offer.output_default')}</p></article>
    </div>
    <section className="custom-theme-offer__details"><h2>{t('creative_director.offer.pages_sections')}</h2><ul>{[...(offer.pages || []), ...(offer.sections || [])].slice(0, 16).map((item) => <li key={item}>{item}</li>)}</ul></section>
    <MerchantFlowStatus result={merchantFlow} pending={pending} onStart={onStartFlow} onAnswer={onAnswerFlow} onResume={onResumeFlow} />
    {!eligibility.eligible && <section className="custom-theme-offer__blockers" role="alert"><h2>{t('creative_director.offer.needs_attention')}</h2><ul>{blockers.map((reason) => <li key={reason.id || reason.code || reason.message}>{reason.reason || reason.message || reason.label}</li>)}</ul><button className="button button--quiet" type="button" onClick={onReturnResources}>{t('creative_director.offer.return_resources')}</button></section>}
    {order?.failure_reason && <section className="form-error" role="alert"><p>{order.failure_reason}</p>{order.failure?.stage && <p>{t('creative_director.offer.failure_stage', { stage: order.failure.stage.replaceAll('_', ' ') })}</p>}{order.failure?.reasons?.length > 0 && <ul>{order.failure.reasons.map((reason) => <li key={`${reason.field || 'shopify'}-${reason.message}`}>{reason.message}</li>)}</ul>}</section>}
    {order?.payment_status === 'pending' && payment.checkout_required && <p className="resource-plan-note" role="status">{returnedFromShopify ? t('creative_director.offer.verifying_shopify_payment') : t('creative_director.offer.awaiting_shopify_approval')}</p>}
    {payment.staging && <p className="resource-plan-note" role="status">{payment.label || t('creative_director.offer.staging_no_charge')}</p>}
    {order?.payment_status === 'pending' && !payment.available && <p className="resource-plan-note" role="status">{t('creative_director.offer.payment_unavailable')}</p>}
    <p className="custom-theme-offer__notice">{offer.notice || t('creative_director.offer.notice')}</p>
    <div className="cd-stage-actions"><button className="button button--primary button--large" type="button" onClick={action} disabled={actionDisabled}>{pending ? t('creative_director.offer.working') : actionLabel}</button></div>
  </section>;
}
