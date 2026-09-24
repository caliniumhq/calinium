import { t } from '../../lib/i18n';

export function SummaryCard({ title, value, detail, path, onEdit }) {
  const formatted = Array.isArray(value) ? value.join(', ') : value;
  return <article className="cd-summary-card">
    <div><h2>{title}</h2><p>{formatted || t('creative_director.common.not_known')}</p>{detail && <small>{detail}</small>}</div>
    {path && <button className="text-button" type="button" onClick={() => onEdit(path, value)}>{t('creative_director.actions.edit')}</button>}
  </article>;
}
