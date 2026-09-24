import { t } from '../../lib/i18n';

const navigation = [
  ['dashboard', '/', 'shell.dashboard'],
  ['projects', '/projects', 'shell.projects'],
  ['settings', '/settings', 'shell.settings']
];

export function DashboardShell({ children, pathname, navigate, user, organization, onSignOut, embedded = false }) {
  return <div className="dashboard-shell"><header className="dashboard-shell__header"><button className="wordmark wordmark--button" type="button" onClick={() => navigate('/')}>{t('shell.wordmark')}</button><nav aria-label={t('shell.primary_navigation')}><ul>{navigation.map(([id, destination, label]) => <li key={id}><button type="button" className={pathname === destination || (id === 'projects' && pathname.startsWith('/projects')) ? 'is-active' : ''} aria-current={pathname === destination ? 'page' : undefined} onClick={() => navigate(destination)}>{t(label)}</button></li>)}</ul></nav><div className="dashboard-shell__account"><button className="account-chip" type="button" onClick={() => navigate('/account')} aria-label={t('shell.account_for', { name: user.full_name || user.email })}><span aria-hidden="true">{(user.full_name || user.email).slice(0, 1).toUpperCase()}</span><span>{user.full_name || user.email}</span></button>{!embedded && <button className="button button--quiet button--compact" type="button" onClick={onSignOut}>{t('shell.sign_out')}</button>}</div></header><main className="dashboard-shell__main"><div className="dashboard-shell__context"><p>{organization?.name}</p></div>{children}</main></div>;
}
