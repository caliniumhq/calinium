import { t } from '../../lib/i18n';
import { GenerationTimeline } from './GenerationTimeline';
import { StatusBadge } from './StatusBadge';

export function GenerationScreen({ session, onGenerate, onReturnResources, pending }) {
  const state = session.generation_state || {};
  return <section className="generation-screen" aria-labelledby="generation-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.generation.eyebrow')}</p><h1 id="generation-title">{t('creative_director.generation.title')}</h1><p>{t('creative_director.generation.description')}</p></div>
    <StatusBadge status={state.status || 'not_started'} />
    <GenerationTimeline state={state} />
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <div className="cd-stage-actions">{state.status === 'awaiting_resources' ? <button className="button button--quiet" type="button" onClick={onReturnResources}>{t('creative_director.generation.return_resources')}</button> : <button className="button button--primary button--large" type="button" onClick={onGenerate} disabled={pending}>{pending ? t('creative_director.generation.working') : t('creative_director.generation.action')}</button>}</div>
  </section>;
}
