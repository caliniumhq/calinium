import { t } from '../../lib/i18n';

const stages = ['preparing', 'configuration', 'accessibility', 'storefront', 'resource_review', 'validation'];

export function GenerationTimeline({ state }) {
  const completed = new Map((state.stages || []).map((entry) => [entry.id, entry]));
  return <ol className="generation-timeline">{stages.map((id) => {
    const entry = completed.get(id);
    return <li key={id} className={entry ? 'is-complete' : ''}><span aria-hidden="true">{entry ? '✓' : '○'}</span><div><strong>{t(`creative_director.generation.stages.${id}`)}</strong>{entry?.detail && <p>{entry.detail}</p>}</div></li>;
  })}</ol>;
}
