import { t } from '../../lib/i18n';

export function FinishScreen({ onExit }) {
  return <section className="finish-screen" aria-labelledby="finish-title"><p className="eyebrow">{t('creative_director.finish.eyebrow')}</p><h1 id="finish-title">{t('creative_director.finish.title')}</h1><p>{t('creative_director.finish.description')}</p><button className="button button--primary button--large" type="button" onClick={onExit}>{t('creative_director.finish.return')}</button></section>;
}
