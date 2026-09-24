import { t } from '../../lib/i18n';

export function PreviewCard({ view }) {
  return <article className="preview-card"><div aria-hidden="true" className={`preview-card__illustration preview-card__illustration--${view}`}><span /><span /><span /></div><h2>{t(`creative_director.preview.views.${view}`)}</h2><p>{t(`creative_director.preview.view_descriptions.${view}`)}</p></article>;
}
