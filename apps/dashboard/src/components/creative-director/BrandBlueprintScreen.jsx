import { t } from '../../lib/i18n';
import { SummaryCard } from './SummaryCard';
import { ApprovalCard } from './ApprovalCard';

export function BrandBlueprintScreen({ session, onApprove, onRevise, onEdit, pending }) {
  const brief = session.creative_brief;
  const cards = [
    [t('creative_director.blueprint.business'), brief.business.summary || brief.business.name, 'businessDescription'],
    [t('creative_director.blueprint.audience'), brief.audience.primary, 'targetAudience'],
    [t('creative_director.blueprint.brand'), [...brief.brand.personality, ...brief.brand.desiredFeeling], 'preferences.desiredFeeling'],
    [t('creative_director.blueprint.goals'), brief.goals.primary, 'primaryGoal'],
    [t('creative_director.blueprint.content'), brief.content.available],
    [t('creative_director.blueprint.assumptions'), brief.assumptions.map((item) => item.statement)],
    [t('creative_director.blueprint.unknowns'), brief.uncertainties.map((item) => item.path.replace(/\./g, ' '))]
  ];
  return <section className="blueprint-screen" aria-labelledby="blueprint-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.blueprint.eyebrow')}</p><h1 id="blueprint-title">{t('creative_director.blueprint.title')}</h1><p>{t('creative_director.blueprint.description')}</p></div>
    <div className="cd-summary-grid">{cards.map(([title, value, path]) => <SummaryCard key={title} title={title} value={value} path={path} onEdit={onEdit} />)}</div>
    <section className="cd-confidence"><h2>{t('creative_director.blueprint.confidence')}</h2><meter min="0" max="1" value={brief.confidence}>{Math.round(brief.confidence * 100)}%</meter><p>{t('creative_director.blueprint.confidence_value', { value: Math.round(brief.confidence * 100) })}</p></section>
    <ApprovalCard title={t('creative_director.blueprint.approval_title')} body={t('creative_director.blueprint.approval_body')} status={session.review?.creativeBriefStatus || 'pending'} onApprove={onApprove} onRevise={onRevise} pending={pending} />
  </section>;
}
