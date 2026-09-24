import { useMemo, useState } from 'react';
import { t } from '../../lib/i18n';

const ROLES = ['primary', 'secondary', 'accent', 'background', 'text'];
function normalize(color, fallback = '#000000') { return /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color.toUpperCase() : fallback; }
function luminance(hex) { const values = hex.slice(1).match(/../g).map((part) => parseInt(part, 16) / 255).map((value) => value <= .03928 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]; }
function ratio(left, right) { const a = luminance(left); const b = luminance(right); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
function contrastStatus(value) { return value >= 4.5 ? 'acceptable' : value >= 3 ? 'caution' : 'failing'; }
function emptyPalette(source = 'manual') { return { source, approved: source !== 'extracted', source_asset_id: null, colors: { primary: '#18201B', secondary: null, accent: null, background: '#FFFFFF', text: '#18201B', additional: [] } }; }
function valid(color) { return /^#[0-9A-Fa-f]{6}$/.test(color || ''); }

export function ColorPaletteEditor({ question, answer, answers, assetService, onCommit }) {
  const extracted = question.ui?.palette_mode === 'extracted';
  const source = extracted ? 'extracted' : answers?.content_color_source === 'use_existing_brand' ? 'existing_brand' : 'manual';
  const [palette, setPalette] = useState(answer || emptyPalette(source));
  const [suggestions, setSuggestions] = useState([]); const [message, setMessage] = useState(null); const [loading, setLoading] = useState(false);
  const update = (role, value) => {
    const next = { ...palette, colors: { ...palette.colors, [role]: value ? value.toUpperCase() : null } };
    setPalette(next);
    const required = ['primary', 'background', 'text'];
    if (!extracted && required.every((requiredRole) => valid(next.colors[requiredRole]))) {
      onCommit(question.id, { ...next, colors: Object.fromEntries(Object.entries(next.colors).map(([key, color]) => [key, color ? normalize(color) : null])) });
    }
  };
  const checks = useMemo(() => [{ key: 'text_background', ratio: ratio(normalize(palette.colors.text), normalize(palette.colors.background, '#FFFFFF')) }, { key: 'button_primary', ratio: ratio(normalize(palette.colors.text, '#FFFFFF'), normalize(palette.colors.primary)) }, { key: 'primary_background', ratio: ratio(normalize(palette.colors.primary), normalize(palette.colors.background, '#FFFFFF')) }], [palette]);
  const extract = async () => {
    const assetId = answers?.[question.ui?.source_question_id];
    if (!assetId) { setMessage(t('colors.logo_required')); return; }
    setLoading(true); setMessage(null);
    try { const result = await assetService.extractAssetPalette(assetId); setSuggestions(result.suggestions || []); }
    catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };
  const approve = (hex) => {
    const values = suggestions.map((item) => item.hex); const next = { source: 'extracted', approved: true, source_asset_id: answers?.[question.ui?.source_question_id] || null, colors: { primary: hex, secondary: values.find((value) => value !== hex) || null, accent: values.find((value) => value !== hex && value !== values[1]) || null, background: '#FFFFFF', text: '#18201B', additional: values.filter((value) => value !== hex).slice(0, 3) } };
    setPalette(next); onCommit(question.id, next);
  };
  return <div className="palette-editor">{extracted ? <div className="palette-editor__extract"><button type="button" className="button button--quiet" onClick={extract} disabled={loading}>{loading ? t('colors.extracting') : t('colors.extract')}</button><p>{t('colors.extraction_note')}</p>{suggestions.length > 0 && <div className="palette-suggestions" aria-label={t('colors.suggestions_label')}>{suggestions.map((item) => <button type="button" key={item.hex} className="palette-swatch" style={{ '--swatch': item.hex }} onClick={() => approve(item.hex)}><span aria-hidden="true" /><span>{item.hex}</span><small>{Math.round(item.prominence * 100)}%</small></button>)}</div>}{message && <p className="form-error" role="alert">{message}</p>}</div> : <div className="palette-editor__fields">{ROLES.map((role) => <label key={role}><span>{t(`colors.${role}`)}</span><input type="color" value={normalize(palette.colors[role], role === 'background' ? '#FFFFFF' : '#000000')} onChange={(event) => update(role, event.target.value)} /><input value={palette.colors[role] || ''} placeholder="#000000" onChange={(event) => update(role, event.target.value)} /></label>)}</div>}<div className="contrast-list" aria-live="polite">{checks.map((check) => <p key={check.key} className={`contrast-list__${contrastStatus(check.ratio)}`}><strong>{t(`colors.${check.key}`)}</strong> {check.ratio.toFixed(2)}:1 · {t(`colors.${contrastStatus(check.ratio)}`)}</p>)}</div></div>;
}
