import { useEffect, useState } from 'react';
import { t } from '../../lib/i18n';

function capabilityStatus(status) { return status === 'ready' ? 'project.ready' : 'project.locked'; }

export function ProjectScreen({ projectId, service, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { let mounted = true; service.project(projectId).then((value) => { if (mounted) setData(value); }).catch((reason) => { if (mounted) setError(reason.message); }); return () => { mounted = false; }; }, [projectId, service]);
  if (!data) return <section className="dashboard-loading" aria-busy="true"><p>{error || t('app.loading')}</p></section>;
  const { project, interview, merchant_profile: merchantProfile, activity } = data;
  const hasInProgress = interview?.engine_session?.status === 'in_progress';
  const capabilities = [
    ['design', t('project.design'), 'ready', t('project.design_description'), t('project.start_designing'), () => navigate(`/projects/${project.id}/design`)],
    ['interview', t('project.interview'), hasInProgress ? 'ready' : 'locked', hasInProgress ? t('project.resume_interview') : t('project.start_interview'), hasInProgress ? t('project.resume_interview') : t('project.start_interview'), () => navigate(`/projects/${project.id}/interview`)],
    ['profile', t('project.profile'), merchantProfile ? 'ready' : 'locked', merchantProfile ? t('project.view_profile') : t('project.profile_pending'), merchantProfile ? t('project.view_profile') : null, merchantProfile ? () => navigate(`/projects/${project.id}/profile`) : null],
    ['assets', t('project.assets'), 'ready', t('project.assets_description'), t('project.open_assets'), () => navigate(`/projects/${project.id}/assets`)],
    ['strategy', t('project.strategy'), 'locked', t('project.locked_description'), null, null],
    ['theme', t('project.theme'), 'locked', t('project.locked_description'), null, null]
  ];
  return <section className="project-page"><header className="dashboard-page-heading"><div><p className="eyebrow">{project.business_name}</p><h1>{project.name}</h1><p>{project.country}{project.website_url ? ` · ${project.website_url}` : ''}</p></div><span className="project-page__icon" aria-hidden="true">{project.icon || project.name.slice(0, 1)}</span></header><div className="project-capabilities">{capabilities.map(([id, title, status, description, actionLabel, action]) => <article key={id}><div><span className={`status-pill status-pill--${status}`}>{t(capabilityStatus(status))}</span><h2>{title}</h2><p>{description}</p></div>{action && <button className="button button--quiet" type="button" onClick={action}>{actionLabel}</button>}</article>)}</div><section className="project-activity" aria-labelledby="project-activity-title"><h2 id="project-activity-title">{t('project.activity')}</h2>{activity.length ? <ol className="activity-list">{activity.map((event) => <li key={event.id}><span aria-hidden="true" /><p>{t(`activity.${event.type}`)}</p><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleDateString()}</time></li>)}</ol> : <p>{t('project.empty_activity')}</p>}</section></section>;
}
