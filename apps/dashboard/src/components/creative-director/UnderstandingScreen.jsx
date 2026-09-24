import { useState } from 'react';
import { t } from '../../lib/i18n';
import { SummaryCard } from './SummaryCard';

function valueFor(state, path) { return (state.knownFacts || []).find((fact) => fact.path === path)?.value || null; }

export function UnderstandingScreen({ session, onCreateBrief, onCorrect, pending }) {
  const [editing, setEditing] = useState(null);
  const state = session.conversation_state;
  const items = [
    { title: t('creative_director.understanding.business'), path: 'businessName', value: valueFor(state, 'businessName') },
    { title: t('creative_director.understanding.audience'), path: 'targetAudience', value: valueFor(state, 'targetAudience') },
    { title: t('creative_director.understanding.goals'), path: 'primaryGoal', value: valueFor(state, 'primaryGoal') },
    { title: t('creative_director.understanding.brand'), path: 'preferences.desiredFeeling', value: valueFor(state, 'preferences.desiredFeeling') },
    { title: t('creative_director.understanding.products'), path: 'productsOrServices', value: valueFor(state, 'productsOrServices') },
    { title: t('creative_director.understanding.positioning'), value: session.creative_brief?.positioning?.marketPosition || t('creative_director.common.calinium_will_recommend') }
  ];
  const beginEdit = (path, value) => setEditing({ path, value: Array.isArray(value) ? value.join(', ') : value || '' });
  const saveEdit = async (event) => { event.preventDefault(); if (!editing) return; await onCorrect(editing.path, editing.value); setEditing(null); };
  return <section className="understanding-screen" aria-labelledby="understanding-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.understanding.eyebrow')}</p><h1 id="understanding-title">{t('creative_director.understanding.title')}</h1><p>{t('creative_director.understanding.description')}</p></div>
    <div className="cd-summary-grid">{items.map((item) => <SummaryCard key={item.title} {...item} onEdit={beginEdit} />)}</div>
    <section className="cd-understanding-summary"><h2>{t('creative_director.understanding.summary')}</h2><p>{state.missingCriticalFacts?.length ? t('creative_director.understanding.missing') : t('creative_director.understanding.ready')}</p></section>
    {editing && <form className="cd-inline-editor" onSubmit={saveEdit}><label htmlFor="understanding-edit">{t('creative_director.actions.revise')}</label><input id="understanding-edit" value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} autoFocus /><div><button className="button button--quiet" type="button" onClick={() => setEditing(null)}>{t('creative_director.actions.cancel')}</button><button className="button button--primary" type="submit" disabled={pending}>{t('creative_director.actions.save')}</button></div></form>}
    <div className="cd-stage-actions"><button className="button button--primary button--large" type="button" onClick={onCreateBrief} disabled={pending}>{t('creative_director.understanding.create_blueprint')}</button></div>
  </section>;
}
