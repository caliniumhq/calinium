import { t } from '../../lib/i18n';

export function CategorySidebar({ categories, activeCategoryId, onSelect, phase }) {
  return (
    <nav className="category-sidebar" aria-label={t('sidebar.label')}>
      <ol>
        {categories.map((category, index) => {
          const active = category.id === activeCategoryId;
          return <li key={category.id}>
            <button type="button" className={active ? 'is-active' : ''} onClick={() => onSelect(category.id)} aria-current={active ? 'step' : undefined}>
              <span aria-hidden="true">{index + 1}</span><span>{category.title}</span>{active && <span className="visually-hidden">{t('sidebar.current')}</span>}
            </button>
          </li>;
        })}
        <li><button type="button" className={phase === 'summary' ? 'is-active' : ''} onClick={() => onSelect('summary')} aria-current={phase === 'summary' ? 'step' : undefined}><span aria-hidden="true">{categories.length + 1}</span><span>{t('summary.eyebrow')}</span></button></li>
      </ol>
    </nav>
  );
}
