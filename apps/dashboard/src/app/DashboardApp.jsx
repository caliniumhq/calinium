import { useEffect, useMemo, useState } from 'react';
import { AuthScreen } from '../components/dashboard/AuthScreen';
import { HomeScreen } from '../components/dashboard/HomeScreen';
import { ProjectForm } from '../components/dashboard/ProjectForm';
import { ProjectScreen } from '../components/dashboard/ProjectScreen';
import { AssetLibraryScreen } from '../components/dashboard/AssetLibraryScreen';
import { MerchantProfileScreen } from '../components/dashboard/MerchantProfileScreen';
import { SettingsScreen } from '../components/dashboard/SettingsScreen';
import { CreativeLandingScreen } from '../components/creative-director/CreativeLandingScreen';
import { DashboardShell } from '../components/layout/DashboardShell';
import { DashboardRuntimeErrorBoundary } from '../components/dashboard/DashboardRuntimeErrorBoundary';
import { useAppRoute } from '../hooks/use-app-route';
import { t } from '../lib/i18n';
import { InterviewService } from '../services/interview-service';
import { DashboardService } from '../services/dashboard-service';
import { InterviewApp } from './InterviewApp';
import { CreativeDirectorApp } from './CreativeDirectorApp';
import { CreativeDirectorService } from '../services/creative-director-service';

export function DashboardApp({ service, dashboardService = null }) {
  if (service) return <InterviewApp service={service} />;
  return <DashboardRuntimeErrorBoundary><CaliniumDashboard dashboardService={dashboardService} /></DashboardRuntimeErrorBoundary>;
}

export function embeddedProjectId(search = globalThis.window?.location?.search || '') {
  const projectId = new URLSearchParams(search).get('project');
  return /^prj_[a-zA-Z0-9-]+$/.test(String(projectId || '')) ? projectId : null;
}

export function embeddedRouteProjectId(pathname = globalThis.window?.location?.pathname || '') {
  const match = String(pathname || '').match(/^\/projects\/(prj_[a-zA-Z0-9-]+)(?:\/|$)/);
  return match ? match[1] : null;
}

function embeddedBillingReturnSearch(search = globalThis.window?.location?.search || '') {
  const parameters = new URLSearchParams(search);
  if (parameters.get('calinium_billing') !== 'return') return '';
  const orderId = String(parameters.get('calinium_order') || '');
  if (!/^cto_[a-zA-Z0-9-]+$/.test(orderId)) return '';
  return `?${new URLSearchParams({ calinium_billing: 'return', calinium_order: orderId }).toString()}`;
}

function CaliniumDashboard({ dashboardService }) {
  const dashboard = useMemo(() => dashboardService || new DashboardService(), [dashboardService]);
  const { pathname, navigate } = useAppRoute();
  const embedded = dashboard.isEmbedded();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authPending, setAuthPending] = useState(false);
  const callbackProjectId = embedded ? embeddedProjectId() : null;
  const routeProjectId = embedded ? embeddedRouteProjectId(pathname) : null;
  const bootstrapProjectId = callbackProjectId || routeProjectId;
  const callbackBillingSearch = embedded ? embeddedBillingReturnSearch() : '';

  const bootstrap = () => { setLoading(true); setAuthError(null); return dashboard.bootstrap(bootstrapProjectId).then((result) => { setAccount(result); return result; }).catch((error) => { setAuthError(error.message); return null; }).finally(() => setLoading(false)); };
  useEffect(() => { let mounted = true; dashboard.bootstrap(bootstrapProjectId).then((result) => { if (mounted) setAccount(result); }).catch((error) => { if (mounted) setAuthError(error.message); }).finally(() => { if (mounted) setLoading(false); }); return () => { mounted = false; }; }, [dashboard]);
  useEffect(() => {
    if (account?.entry_path && pathname === '/') navigate(`${account.entry_path}${callbackBillingSearch}`);
  }, [account, callbackBillingSearch, navigate, pathname]);
  const submitAuth = async (mode, values) => {
    setAuthPending(true); setAuthError(null);
    try { const result = mode === 'sign_up' ? await dashboard.signUp(values) : await dashboard.signIn(values); const context = await dashboard.account(); setAccount(context); navigate('/'); return result; }
    catch (error) { setAuthError(error.message); return null; }
    finally { setAuthPending(false); }
  };
  const signOut = async () => { await dashboard.signOut(); setAccount(null); navigate('/sign-in'); };
  const navigateWithinApp = (destination) => {
    const selectedProjectId = embedded && account?.project_status === 'selection_required'
      ? embeddedRouteProjectId(destination)
      : null;
    if (!selectedProjectId) return navigate(destination);
    setLoading(true); setAuthError(null);
    return dashboard.bootstrap(selectedProjectId)
      .then((result) => {
        if (!result?.entry_path) throw new Error('This project could not be verified for the current Shopify store.');
        setAccount(result);
        navigate(result.entry_path);
        return result;
      })
      .catch((error) => { setAccount(null); setAuthError(error.message); return null; })
      .finally(() => setLoading(false));
  };
  if (loading) return <main className="app-loading" aria-busy="true"><p>{t('app.loading')}</p></main>;
  if (!account) {
    if (embedded) return <main className="app-loading embedded-auth" aria-busy={Boolean(!authError)}><p className="eyebrow">{t('embedded_auth.eyebrow')}</p><h1>{t('embedded_auth.title')}</h1><p>{authError || t('embedded_auth.description')}</p>{authError && <button className="button button--primary" type="button" onClick={bootstrap}>{t('embedded_auth.retry')}</button>}</main>;
    const mode = pathname === '/sign-up' ? 'sign_up' : 'sign_in';
    return <AuthScreen mode={mode} onSubmit={(values) => submitAuth(mode, values)} onModeChange={(next) => navigate(next === 'sign_up' ? '/sign-up' : '/sign-in')} pending={authPending} error={authError} />;
  }
  if (pathname === '/') return <CreativeLandingScreen service={dashboard} navigate={navigateWithinApp} />;
  const projectDesign = pathname.match(/^\/projects\/([^/]+)\/design$/);
  if (projectDesign) {
    const projectId = projectDesign[1];
    const creativeDirector = new CreativeDirectorService({ client: dashboard.client, projectId });
    return <CreativeDirectorApp key={projectId} service={creativeDirector} dashboard={dashboard} navigate={navigateWithinApp} onExit={() => navigateWithinApp(`/projects/${projectId}`)} operatorDiagnosticsAvailable={embedded && account.operator_diagnostics_available === true} />;
  }
  const projectInterview = pathname.match(/^\/projects\/([^/]+)\/interview$/);
  if (projectInterview) {
    const projectId = projectInterview[1];
    const interview = new InterviewService({ client: dashboard.client, projectId });
    return <InterviewApp key={projectId} service={interview} onExit={() => navigateWithinApp(`/projects/${projectId}`)} onCompleted={() => navigateWithinApp(`/projects/${projectId}`)} />;
  }
  const projectAssets = pathname.match(/^\/projects\/([^/]+)\/assets$/);
  if (projectAssets) return <DashboardShell pathname={pathname} navigate={navigateWithinApp} user={account.user} organization={account.organizations[0]?.organization} onSignOut={signOut} embedded={embedded}><AssetLibraryScreen projectId={projectAssets[1]} service={dashboard} navigate={navigateWithinApp} /></DashboardShell>;
  const projectProfile = pathname.match(/^\/projects\/([^/]+)\/profile$/);
  if (projectProfile) return <ProjectProfileRoute projectId={projectProfile[1]} service={dashboard} navigate={navigateWithinApp} shell={{ pathname, user: account.user, organization: account.organizations[0]?.organization, onSignOut: signOut, embedded }} />;
  const projectMatch = pathname.match(/^\/projects\/([^/]+)$/);
  const organization = account.organizations[0]?.organization;
  return <DashboardShell pathname={pathname} navigate={navigateWithinApp} user={account.user} organization={organization} onSignOut={signOut} embedded={embedded}>{pathname === '/projects/new' ? <ProjectForm service={dashboard} onCreated={(project) => navigateWithinApp(`/projects/${project.id}/design`)} onCancel={() => navigateWithinApp('/')} /> : projectMatch ? <ProjectScreen projectId={projectMatch[1]} service={dashboard} navigate={navigateWithinApp} /> : pathname === '/settings' || pathname === '/account' ? <SettingsScreen service={dashboard} account={account.user} /> : <HomeScreen service={dashboard} navigate={navigateWithinApp} />}</DashboardShell>;
}

function ProjectProfileRoute({ projectId, service, navigate, shell }) {
  const [data, setData] = useState(null); const [error, setError] = useState(null);
  useEffect(() => { let mounted = true; service.project(projectId).then((result) => { if (mounted) setData(result); }).catch((reason) => { if (mounted) setError(reason.message); }); return () => { mounted = false; }; }, [projectId, service]);
  return <DashboardShell {...shell} navigate={navigate}>{data ? <MerchantProfileScreen projectData={data} navigate={navigate} /> : <section className="dashboard-loading" aria-busy="true"><p>{error || t('app.loading')}</p></section>}</DashboardShell>;
}
