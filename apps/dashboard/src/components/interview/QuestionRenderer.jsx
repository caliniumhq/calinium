import { useId, useState } from 'react';
import { t } from '../../lib/i18n';
import { presentationValue } from '../../lib/interview-values';
import { AssetUploader } from './AssetUploader';
import { ColorPaletteEditor } from './ColorPaletteEditor';
import { ReferenceListEditor } from './ReferenceListEditor';

function ChoiceInput({ question, value, onChange, multiple }) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : value;
  const chooseAdjacent = (event, index) => {
    if (multiple || !['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + offset + question.options.length) % question.options.length;
    onChange(question.options[nextIndex].value);
  };
  return <fieldset className="choice-input"><legend className="visually-hidden">{multiple ? t('question.choose_all') : t('question.choose_one')}</legend>{question.options.map((option, index) => {
    const checked = multiple ? selected.includes(option.value) : selected === option.value;
    return <label className="choice-input__option" key={option.value}><input type={multiple ? 'checkbox' : 'radio'} name={question.id} value={option.value} checked={checked} onKeyDown={(event) => chooseAdjacent(event, index)} onChange={() => onChange(multiple ? (checked ? selected.filter((item) => item !== option.value) : [...selected, option.value]) : option.value)} /><span>{option.label}</span></label>;
  })}</fieldset>;
}

function TagInput({ question, value, onChange }) {
  const [entry, setEntry] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const add = () => {
    const next = entry.trim();
    if (!next || tags.includes(next)) return;
    onChange([...tags, next]);
    setEntry('');
  };
  return <div className="tag-input"><div className="tag-input__values" aria-live="polite">{tags.map((tag) => <span key={tag} className="tag-input__tag">{tag}<button type="button" aria-label={t('question.remove_tag', { tag })} onClick={() => onChange(tags.filter((item) => item !== tag))}>×</button></span>)}</div><div className="tag-input__entry"><input aria-label={question.title} value={entry} onChange={(event) => setEntry(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }} placeholder={t('question.tag_placeholder')} /><button type="button" onClick={add}>{t('question.add_tag')}</button></div></div>;
}

function BooleanInput({ question, value, onChange }) {
  return <div className="boolean-input" role="group" aria-label={question.title}><button type="button" className={value === true ? 'is-selected' : ''} aria-pressed={value === true} onClick={() => onChange(true)}>{t('question.yes')}</button><button type="button" className={value === false ? 'is-selected' : ''} aria-pressed={value === false} onClick={() => onChange(false)}>{t('question.no')}</button></div>;
}

export function QuestionRenderer({ question, answer, answers = {}, assetService, onDraftChange, onCommit, describedBy, invalid = false }) {
  const inputId = useId();
  const value = presentationValue(answer, question.answer_type);
  const change = (next, commit = false) => {
    onDraftChange(question.id, next);
    if (commit) onCommit(question.id, next);
  };
  if (question.answer_type === 'multiple_choice') return <ChoiceInput question={question} value={value} multiple onChange={(next) => change(next, true)} />;
  if (question.answer_type === 'single_choice') return <ChoiceInput question={question} value={value} onChange={(next) => change(next, true)} />;
  if (question.answer_type === 'tags') return <TagInput question={question} value={value} onChange={(next) => change(next, true)} />;
  if (question.answer_type === 'boolean') return <BooleanInput question={question} value={value} onChange={(next) => change(next, true)} />;
  if (question.answer_type === 'asset_reference') return <AssetUploader question={question} assetService={assetService} value={value} onCommit={onCommit} />;
  if (question.answer_type === 'color_palette') return <ColorPaletteEditor question={question} answer={answer} answers={answers} assetService={assetService} onCommit={onCommit} />;
  if (question.answer_type === 'reference_list') return <ReferenceListEditor question={question} answer={answer} assetService={assetService} onCommit={onCommit} />;
  if (question.answer_type === 'color') return <div className="color-input"><input id={inputId} aria-label={t('question.color_picker', { question: question.title })} aria-describedby={describedBy} aria-invalid={invalid} type="color" value={value || '#000000'} onChange={(event) => change(event.target.value, true)} /><input aria-label={question.title} aria-describedby={describedBy} aria-invalid={invalid} value={value} placeholder="#000000" onChange={(event) => change(event.target.value)} onBlur={(event) => onCommit(question.id, event.target.value)} /></div>;
  if (question.answer_type === 'textarea') return <textarea id={inputId} aria-label={question.title} aria-describedby={describedBy} aria-invalid={invalid} value={value} onChange={(event) => change(event.target.value)} onBlur={(event) => onCommit(question.id, event.target.value)} rows="5" />;
  if (question.answer_type === 'upload_placeholder' || question.answer_type === 'image_placeholder') return <div className="placeholder-input"><input id={inputId} aria-label={question.title} aria-describedby={describedBy} aria-invalid={invalid} value={value} onChange={(event) => change(event.target.value)} onBlur={(event) => onCommit(question.id, event.target.value)} /><p>{question.answer_type === 'image_placeholder' ? t('question.image_placeholder') : t('question.upload_placeholder')}</p></div>;
  const type = question.answer_type === 'number' || question.answer_type === 'currency' ? 'number' : question.answer_type === 'email' ? 'email' : question.answer_type === 'url' || question.answer_type === 'url_or_domain' ? 'url' : 'text';
  return <div className="text-input"><input id={inputId} aria-label={question.title} aria-describedby={describedBy} aria-invalid={invalid} type={type} inputMode={question.answer_type === 'currency' ? 'decimal' : undefined} min={question.validation.minimum} step={question.answer_type === 'number' ? '1' : question.answer_type === 'currency' ? '0.01' : undefined} value={value} onChange={(event) => change(type === 'number' || type === 'currency' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} onBlur={(event) => onCommit(question.id, type === 'number' || type === 'currency' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} />{question.answer_type === 'currency' && <p>{t('question.currency_hint')}</p>}</div>;
}
