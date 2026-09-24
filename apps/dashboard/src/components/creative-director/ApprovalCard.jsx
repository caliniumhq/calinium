import { t } from '../../lib/i18n';

export function ApprovalCard({ title, body, status, onApprove, onRevise, approveLabel = 'creative_director.actions.approve', reviseLabel = 'creative_director.actions.request_revision', pending = false, children }) {
  return <article className="approval-card">
    <div className="approval-card__body"><h2>{title}</h2>{body && <p>{body}</p>}{children}</div>
    <div className="approval-card__actions"><span className={`approval-card__status approval-card__status--${status}`}>{t(`creative_director.approval.${status}`)}</span>{onRevise && <button className="button button--quiet" type="button" onClick={onRevise} disabled={pending}>{t(reviseLabel)}</button>}{onApprove && <button className="button button--primary" type="button" onClick={onApprove} disabled={pending}>{t(approveLabel)}</button>}</div>
  </article>;
}
