import { useState } from 'react';
import { t } from '../../lib/i18n';
import { StatusBadge } from './StatusBadge';

export function RecommendationCard({ recommendation, decision, onDecide, pending }) {
  const [showRevision, setShowRevision] = useState(false);
  const [comment, setComment] = useState('');
  const status = decision?.status || 'pending';
  const decide = async (nextStatus) => {
    await onDecide(recommendation.id, nextStatus, comment);
    setComment('');
    setShowRevision(false);
  };
  return <article className="recommendation-card">
    <div className="recommendation-card__heading"><p>{t(`creative_director.strategy.areas.${recommendation.area}`)}</p><StatusBadge status={status} /></div>
    <h2>{recommendation.recommendation}</h2>
    <p>{recommendation.rationale}</p>
    {decision?.merchantComment && <p className="recommendation-card__comment"><strong>{t('creative_director.strategy.your_note')}</strong> {decision.merchantComment}</p>}
    {showRevision && <label className="recommendation-card__revision"><span>{t('creative_director.strategy.revision_label')}</span><textarea value={comment} rows="2" onChange={(event) => setComment(event.target.value)} /></label>}
    <div className="recommendation-card__actions"><button className="button button--quiet" type="button" onClick={() => setShowRevision((value) => !value)} disabled={pending}>{t('creative_director.actions.revise')}</button><button className="button button--quiet" type="button" onClick={() => decide('rejected')} disabled={pending}>{t('creative_director.actions.reject')}</button><button className="button button--primary" type="button" onClick={() => decide(showRevision ? 'revision_requested' : 'approved')} disabled={pending}>{showRevision ? t('creative_director.actions.request_revision') : t('creative_director.actions.approve')}</button></div>
  </article>;
}
