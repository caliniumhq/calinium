import { t } from '../../lib/i18n';
import { estimatedRemainingMinutes } from '../../lib/time';

export function ProgressBar({ metrics }) {
  const minutes = estimatedRemainingMinutes({ answered: metrics.answeredQuestions, visible: metrics.totalQuestions });
  return (
    <section className="progress-bar" aria-label={t('progress.label')}>
      <div className="progress-bar__meta">
        <span>{t('progress.step', { current: metrics.step, total: metrics.totalSteps })}</span>
        <span>{t('progress.complete', { percent: metrics.percent })}</span>
      </div>
      <div className="progress-bar__track" aria-hidden="true"><span className="progress-bar__value" style={{ '--progress': `${metrics.percent}%` }} /></div>
      <p className="progress-bar__remaining">{minutes === 1 ? t('progress.remaining_one') : t('progress.remaining_many', { minutes })}</p>
    </section>
  );
}
