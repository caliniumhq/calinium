import { t } from '../../lib/i18n';
import { ApprovalCard } from './ApprovalCard';
import { RecommendationCard } from './RecommendationCard';

function StrategyDetail({ title, value, reason }) {
  return <article className="strategy-detail"><h2>{title}</h2><p>{value}</p>{reason && <small>{reason}</small>}</article>;
}

export function StoreStrategyScreen({ session, onDecide, onApprove, onRevise, pending }) {
  const strategy = session.store_strategy;
  const decisionFor = (recommendation) => (session.review?.decisions || []).find((item) => item.path === recommendation.id);
  const details = [
    [t('creative_director.strategy.homepage'), strategy.homepage.hero.treatment, strategy.homepage.hero.rationale],
    [t('creative_director.strategy.navigation'), strategy.navigation.primaryItems.join(', '), strategy.navigation.rationale],
    [t('creative_director.strategy.typography'), strategy.typographyDirection.style, strategy.typographyDirection.rationale],
    [t('creative_director.strategy.colors'), strategy.colorDirection.paletteRole, strategy.colorDirection.rationale],
    [t('creative_director.strategy.product_pages'), strategy.productPage.galleryStyle, strategy.productPage.purchaseExperience],
    [t('creative_director.strategy.collections'), strategy.collectionPage.layout, strategy.collectionPage.sorting],
    [t('creative_director.strategy.motion'), strategy.motion.level, strategy.motion.principles.join(' ')]
  ];
  return <section className="strategy-screen" aria-labelledby="strategy-title">
    <div className="cd-stage-intro"><p className="eyebrow">{t('creative_director.strategy.eyebrow')}</p><h1 id="strategy-title">{t('creative_director.strategy.title')}</h1><p>{t('creative_director.strategy.description')}</p></div>
    <div className="strategy-detail-grid">{details.map(([title, value, reason]) => <StrategyDetail key={title} title={title} value={value} reason={reason} />)}</div>
    <section className="strategy-recommendations" aria-labelledby="recommendations-title"><h2 id="recommendations-title">{t('creative_director.strategy.recommendations')}</h2>{strategy.recommendations.map((recommendation) => <RecommendationCard key={recommendation.id} recommendation={recommendation} decision={decisionFor(recommendation)} onDecide={onDecide} pending={pending} />)}</section>
    <ApprovalCard title={t('creative_director.strategy.approval_title')} body={t('creative_director.strategy.approval_body')} status={session.review?.storeStrategyStatus || 'pending'} onApprove={onApprove} onRevise={onRevise} pending={pending} approveLabel="creative_director.actions.approve_strategy" />
  </section>;
}
