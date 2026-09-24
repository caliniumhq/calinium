import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';

export function CreativeLandingScreen({ service, navigate, onStart }) {
  const [overview, setOverview] = useState(null);
  useEffect(() => { let active = true; service.overview().then((result) => { if (active) setOverview(result); }).catch(() => {}); return () => { active = false; }; }, [service]);
  return <section className="creative-landing" aria-labelledby="landing-title">
    <div className="creative-landing__intro"><p className="eyebrow">{t('creative_director.landing.eyebrow')}</p><h1 id="landing-title">{t('creative_director.landing.title')}</h1><p>{t('creative_director.landing.description')}</p><div className="creative-landing__actions"><button className="button button--primary button--large" type="button" onClick={onStart || (() => navigate('/projects/new'))}>{t('creative_director.landing.start')}</button><a className="button button--quiet button--large" href="#premium-themes">{t('creative_director.landing.browse')}</a></div></div>
    {overview?.projects?.length ? <section className="creative-landing__continue" aria-labelledby="continue-title"><h2 id="continue-title">{t('creative_director.landing.continue_title')}</h2><ul>{overview.projects.slice(0, 3).map((project) => <li key={project.id}><button type="button" onClick={() => navigate(`/projects/${project.id}/design`)}><span aria-hidden="true">{project.icon || project.name.slice(0, 1)}</span><strong>{project.name}</strong><small>{project.business_name}</small><b aria-hidden="true">→</b></button></li>)}</ul></section> : null}
    <section id="premium-themes" className="creative-landing__themes" aria-labelledby="premium-themes-title"><p className="eyebrow">{t('creative_director.landing.themes_eyebrow')}</p><h2 id="premium-themes-title">{t('creative_director.landing.themes_title')}</h2><p>{t('creative_director.landing.themes_description')}</p></section>
  </section>;
}
