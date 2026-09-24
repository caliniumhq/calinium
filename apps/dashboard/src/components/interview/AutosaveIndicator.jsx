import { t } from '../../lib/i18n';
import { relativeSaveTime } from '../../lib/time';

export function AutosaveIndicator({ saveState }) {
  const label = saveState.status === 'saving'
    ? t('autosave.saving')
    : saveState.status === 'error'
      ? t('autosave.error')
      : saveState.savedAt
        ? relativeSaveTime(saveState.savedAt) === 'now' ? t('autosave.saved') : t('autosave.saved_at', { time: relativeSaveTime(saveState.savedAt) })
        : t('autosave.idle');
  return <p className={`autosave autosave--${saveState.status}`} role={saveState.status === 'error' ? 'alert' : 'status'} aria-live="polite">{label}</p>;
}
