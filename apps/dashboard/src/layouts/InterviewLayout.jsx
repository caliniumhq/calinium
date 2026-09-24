import { AutosaveIndicator } from '../components/interview/AutosaveIndicator';
import { CategorySidebar } from '../components/interview/CategorySidebar';
import { ProgressBar } from '../components/interview/ProgressBar';
import { t } from '../lib/i18n';

export function InterviewLayout({ catalog, activeCategoryId, phase, metrics, saveState, onCategorySelect, onExit, children }) {
  return <main className="interview-layout"><header className="interview-layout__header">{onExit ? <button type="button" className="wordmark wordmark--button" onClick={onExit} aria-label={t('app.name')}>Calinium</button> : <a className="wordmark" href="/" aria-label={t('app.name')}>Calinium</a>}<AutosaveIndicator saveState={saveState} /></header><div className="interview-layout__body"><aside><CategorySidebar categories={catalog.categories} activeCategoryId={activeCategoryId} phase={phase} onSelect={onCategorySelect} /></aside><section className="interview-layout__content"><ProgressBar metrics={metrics} />{children}</section></div></main>;
}
