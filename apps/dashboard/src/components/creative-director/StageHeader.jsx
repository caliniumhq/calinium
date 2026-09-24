import { t } from '../../lib/i18n';

const stages = ['conversation', 'understanding', 'blueprint', 'strategy', 'preset', 'resources', 'content-plan', 'offer', 'delivery'];

function stageLabel(item) {
  return item === 'content-plan' ? 'Content plan' : item === 'preset' ? 'Preset' : t(`creative_director.stages.${item}`);
}

export function ProgressStepper({ stage }) {
  const current = Math.max(0, stages.indexOf(stage));
  const currentLabel = stageLabel(stages[current]);
  return <nav className="cd-progress" aria-label={`${t('creative_director.progress.label')}. Step ${current + 1} of ${stages.length}: ${currentLabel}`}>
    <ol>
      {stages.map((item, index) => <li key={item} className={index < current ? 'is-complete' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}>
        <span aria-hidden="true">{index < current ? '✓' : String(index + 1).padStart(2, '0')}</span><span>{stageLabel(item)}</span>
      </li>)}
    </ol>
  </nav>;
}

export function StageHeader({ stage, onExit, onRestart, onBack, onQuickStart, restarting = false }) {
  return <header className="cd-header">
    <button className="wordmark wordmark--button" type="button" onClick={onExit}>{t('shell.wordmark')}</button>
    <div className="cd-header__actions">
      <div className="cd-header__primary-actions">
        {onBack && <button className="text-button" type="button" onClick={onBack} disabled={restarting}>{t('creative_director.actions.back')}</button>}
        <button className="button button--quiet button--compact" type="button" onClick={onExit}>{t('creative_director.actions.continue_later')}</button>
      </div>
      <div className="cd-header__utility-actions" role="group" aria-label="Workflow utilities">
        {onQuickStart && <button className="text-button" type="button" onClick={onQuickStart} disabled={restarting}>Quick Start</button>}
        <button className="text-button" type="button" onClick={onRestart} disabled={restarting}>{t('creative_director.actions.restart')}</button>
      </div>
    </div>
    <div className="cd-header__progress"><ProgressStepper stage={stage} /></div>
  </header>;
}
