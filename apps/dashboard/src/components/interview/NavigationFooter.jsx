import { t } from '../../lib/i18n';

export function NavigationFooter({ isFirst, isLast, canSkip, onPrevious, onNext, onSkip, onSaveExit, onCancel }) {
  return <footer className="navigation-footer"><div className="navigation-footer__secondary">{!isFirst && <button type="button" className="button button--quiet" onClick={onPrevious}>{t('navigation.previous')}</button>}{canSkip && <button type="button" className="button button--quiet" onClick={onSkip}>{t('navigation.skip')}</button>}</div><div className="navigation-footer__actions"><button type="button" className="button button--quiet" onClick={onSaveExit}>{t('navigation.save_exit')}</button><button type="button" className="button button--quiet button--danger" onClick={onCancel}>{t('navigation.cancel')}</button><button type="button" className="button button--primary" onClick={onNext}>{isLast ? t('navigation.review') : t('navigation.next')}</button></div></footer>;
}
