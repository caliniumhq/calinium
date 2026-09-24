import { useState } from 'react';
import { t } from '../../lib/i18n';

const icons = ['✦', '◒', '◈', '◆', '●', '☼'];

export function ProjectForm({ service, onCreated, onCancel }) {
  const [values, setValues] = useState({ name: '', business_name: '', country: '', website_url: '', shopify_store_url: '', icon: icons[0] });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);
  const update = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setPending(true); setError(null); try { const result = await service.createProject(values); onCreated(result.project); } catch (reason) { setError(reason.message); } finally { setPending(false); } };
  return <section className="project-form-page"><header className="dashboard-page-heading"><div><p className="eyebrow">{t('project_form.eyebrow')}</p><h1>{t('project_form.title')}</h1><p>{t('project_form.description')}</p></div></header><form className="project-form" onSubmit={submit} noValidate><div className="form-grid"><label>{t('project_form.name')}<input name="name" value={values.name} onChange={update} required /></label><label>{t('project_form.business_name')}<input name="business_name" value={values.business_name} onChange={update} required /></label><label>{t('project_form.country')}<input name="country" value={values.country} onChange={update} maxLength="2" autoCapitalize="characters" placeholder="US" required /></label><label>{t('project_form.website')}<input name="website_url" type="url" value={values.website_url} onChange={update} placeholder="https://" /></label><label>{t('project_form.shopify')}<input name="shopify_store_url" type="url" value={values.shopify_store_url} onChange={update} placeholder="https://" /></label></div><fieldset><legend>{t('project_form.icon')}</legend><div className="icon-picker">{icons.map((icon) => <label key={icon}><input type="radio" name="icon" value={icon} checked={values.icon === icon} onChange={update} /><span aria-hidden="true">{icon}</span><span className="visually-hidden">{t('project_form.icon_choice', { icon })}</span></label>)}</div></fieldset>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button className="button button--quiet" type="button" onClick={onCancel}>{t('project_form.cancel')}</button><button className="button button--primary" type="submit" disabled={pending}>{t(pending ? 'project_form.creating' : 'project_form.create')}</button></div></form></section>;
}
