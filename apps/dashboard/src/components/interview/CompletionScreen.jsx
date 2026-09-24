import { useState } from 'react';
import { t } from '../../lib/i18n';

export function CompletionScreen({ profile, onRestart, onComplete }) {
  const [expanded, setExpanded] = useState(false);
  return <main className="completion-screen"><p className="eyebrow">{t('completion.eyebrow')}</p><h1>{t('completion.title')}</h1><p>{t('completion.description')}</p><button type="button" className="button button--quiet" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>{t('completion.profile')}</button>{expanded && <pre className="profile-json">{JSON.stringify(profile, null, 2)}</pre>}<div className="completion-screen__actions">{onComplete && <button type="button" className="button button--primary" onClick={onComplete}>{t('completion.return_to_project')}</button>}<button type="button" className="button button--quiet" onClick={onRestart}>{t('completion.start_over')}</button></div></main>;
}
