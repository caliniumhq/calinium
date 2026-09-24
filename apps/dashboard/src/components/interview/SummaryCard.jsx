import { t } from '../../lib/i18n';

export function SummaryCard({ category, onEdit }) {
  return <article className="summary-card"><div className="summary-card__header"><h2>{category.title}</h2><button className="button button--quiet" type="button" onClick={() => onEdit(category.id)}>{t('navigation.edit')}</button></div><dl>{category.items.map((item) => <div key={item.question_id}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></article>;
}

export function ProfilePreview({ profile }) {
  const rows = [
    ['profile.brand', profile?.business?.name], ['profile.industry', profile?.industry], ['profile.audience', profile?.audience?.primary],
    ['profile.style', profile?.preferences?.design_languages?.join(', ')], ['profile.goals', profile?.goals?.primary?.join(', ')]
  ];
  return <section className="profile-preview" aria-labelledby="profile-preview-title"><h2 id="profile-preview-title">{t('summary.profile_title')}</h2><dl>{rows.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value || '—'}</dd></div>)}</dl></section>;
}
