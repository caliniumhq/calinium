import { t } from '../../lib/i18n';

export function WelcomeScreen({ hasSavedSession, onStart, onResume, onExit }) {
  return <main className="welcome-screen"><div className="welcome-screen__mark" aria-hidden="true">C</div><p className="eyebrow">{t('welcome.eyebrow')}</p><h1>{t('welcome.title')}</h1><p className="welcome-screen__description">{t('welcome.description')}</p><p className="welcome-screen__time">{t('welcome.time')}</p>{hasSavedSession && <div className="welcome-screen__resume"><p>{t('welcome.resume_detail')}</p><button className="button button--quiet" type="button" onClick={onResume}>{t('welcome.resume')}</button></div>}<div className="welcome-screen__actions"><button className="button button--primary button--large" type="button" onClick={onStart}>{t('welcome.start')}</button>{onExit && <button className="button button--quiet" type="button" onClick={onExit}>{t('welcome.exit')}</button>}</div></main>;
}
