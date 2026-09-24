import { t } from '../../lib/i18n';

export function StatusBadge({ status }) {
  const key = `creative_director.status.${status}`;
  return <span className={`cd-status cd-status--${status}`}>{t(key)}</span>;
}
