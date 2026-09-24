import { cloneElement } from 'react';
import { t } from '../../lib/i18n';
import { ValidationMessage } from './ValidationMessage';

export function QuestionCard({ question, errors, children }) {
  const descriptionId = `${question.id}-description`;
  const errorId = `${question.id}-errors`;
  return (
    <section className={`question-card ${errors.length ? 'has-error' : ''}`} aria-labelledby={`${question.id}-title`}>
      <div className="question-card__header">
        <div><h2 id={`${question.id}-title`}>{question.title}</h2><p id={descriptionId}>{question.description}</p></div>
        <span className="question-card__requirement">{question.required ? t('question.required') : t('question.optional')}</span>
      </div>
      <div>{cloneElement(children, { describedBy: `${descriptionId}${errors.length ? ` ${errorId}` : ''}`, invalid: errors.length > 0 })}</div>
      <div id={errorId}><ValidationMessage messages={errors} /></div>
    </section>
  );
}
