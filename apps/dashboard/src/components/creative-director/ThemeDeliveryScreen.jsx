import { t } from '../../lib/i18n';
import { StatusBadge } from './StatusBadge';
import { MerchantFlowStatus } from './MerchantFlowStatus';

export function ThemeDeliveryScreen({ customTheme, merchantFlow, merchantFlowBetaEnabled = false, onDownload, onReturnOffer, onStartFlow, onAnswerFlow, onResumeFlow, pending }) {
  const order = customTheme?.order;
  const artifacts = order?.artifacts || {};
  const download = async (artifact) => {
    const result = await onDownload(order.id, artifact);
    if (!result?.blob) return;
    const url = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = url; link.download = result.filename; link.click();
    URL.revokeObjectURL(url);
  };
  return <section className="theme-delivery" aria-labelledby="theme-delivery-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.delivery.eyebrow')}</p><h1 id="theme-delivery-title">{t('creative_director.delivery.title')}</h1><p>{t('creative_director.delivery.description')}</p></div>
    <StatusBadge status={order?.generation_status || 'not_started'} />
    {order?.validation_result && <section className="theme-delivery__validation"><h2>{t('creative_director.delivery.validation')}</h2><p>{order.validation_result.valid ? t('creative_director.delivery.validation_passed') : t('creative_director.delivery.validation_needs_attention')}</p>{order.validation_result.warnings?.length > 0 && <ul>{order.validation_result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}</section>}
    <MerchantFlowStatus result={merchantFlow} pending={pending} onStart={onStartFlow} onAnswer={onAnswerFlow} onResume={onResumeFlow} />
    {order?.generation_status === 'ready' && (!merchantFlowBetaEnabled || merchantFlow?.flow?.preview_ready) ? <section className="theme-delivery__downloads"><h2>{t('creative_director.delivery.downloads')}</h2><button className="button button--primary button--large" type="button" disabled={pending || !artifacts.theme_zip} onClick={() => download('theme-zip')}>{t('creative_director.delivery.download_theme')}</button><div>{artifacts.theme_specification && <button className="text-button" type="button" onClick={() => download('theme-specification')}>{t('creative_director.delivery.download_specification')}</button>}{artifacts.validation_report && <button className="text-button" type="button" onClick={() => download('validation-report')}>{t('creative_director.delivery.download_validation')}</button>}</div></section> : <p className="form-error" role="alert">{order?.failure_reason || t('creative_director.delivery.not_ready')}</p>}
    <section className="theme-delivery__instructions"><h2>{t('creative_director.delivery.installation')}</h2><ol><li>{t('creative_director.delivery.install_step_one')}</li><li>{t('creative_director.delivery.install_step_two')}</li><li>{t('creative_director.delivery.install_step_three')}</li></ol></section>
    <p className="custom-theme-offer__notice">{t('creative_director.delivery.notice')}</p>
    <div className="cd-stage-actions"><button className="button button--quiet" type="button" onClick={onReturnOffer}>{t('creative_director.delivery.return_offer')}</button></div>
  </section>;
}
