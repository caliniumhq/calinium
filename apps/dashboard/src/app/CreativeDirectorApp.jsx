import { useEffect, useRef, useState } from 'react';
import { StageHeader } from '../components/creative-director/StageHeader';
import { ConversationScreen } from '../components/creative-director/ConversationScreen';
import { UnderstandingScreen } from '../components/creative-director/UnderstandingScreen';
import { BrandBlueprintScreen } from '../components/creative-director/BrandBlueprintScreen';
import { StoreStrategyScreen } from '../components/creative-director/StoreStrategyScreen';
import { PresetReviewScreen } from '../components/creative-director/PresetReviewScreen';
import { ResourcePicker } from '../components/creative-director/ResourcePicker';
import { EditorialGridPlanScreen } from '../components/creative-director/EditorialGridPlanScreen';
import { LookbookPlanScreen } from '../components/creative-director/LookbookPlanScreen';
import { CraftsmanshipPlanScreen } from '../components/creative-director/CraftsmanshipPlanScreen';
import { ManufacturingProcessPlanScreen } from '../components/creative-director/ManufacturingProcessPlanScreen';
import { EvidencePlanScreen } from '../components/creative-director/EvidencePlanScreen';
import { CommercePlanScreen } from '../components/creative-director/CommercePlanScreen';
import { CustomThemeOfferScreen } from '../components/creative-director/CustomThemeOfferScreen';
import { GenerationScreen } from '../components/creative-director/GenerationScreen';
import { ThemeDeliveryScreen } from '../components/creative-director/ThemeDeliveryScreen';
import { PreviewScreen } from '../components/creative-director/PreviewScreen';
import { FinishScreen } from '../components/creative-director/FinishScreen';
import { QuickStartShell } from '../components/creative-director/QuickStartShell';
import { ProtectedOperatorDiagnosticsHost } from '../components/creative-director/ProtectedOperatorDiagnosticsHost';
import { AnalysisFirstMerchantJourney } from '../components/analysis-first/AnalysisFirstMerchantJourney';
import { ContentPlanStatusList } from '../components/creative-director/ContentPlanStatusList';
import { useCreativeDirector } from '../hooks/use-creative-director';
import { useAnalysisFirstMerchantExperience } from '../hooks/use-analysis-first-merchant-experience';
import { t } from '../lib/i18n';

const EXPLICIT_F1_PROJECTION_INVALIDATIONS = new Set(['preview_provenance_recovery', 'render_target_succession']);

export function CreativeDirectorApp({ service, dashboard, navigate, onExit, initialMode = 'quick_start', operatorDiagnosticsAvailable = false }) {
  const director = useCreativeDirector({ service });
  const [mode, setMode] = useState(initialMode);
  const heading = useRef(null);
  const hasStartedNewSession = useRef(false);
  const f1ActionLock = useRef(false);
  const session = director.session;
  const stage = session?.stage || 'landing';
  const analysisFirstEnabled = director.data?.analysis_first_merchant_experience_enabled === true;
  const analysisFirst = useAnalysisFirstMerchantExperience({
    service,
    enabled: analysisFirstEnabled,
    refreshKey: `${session?.updated_at || 'none'}:${director.data?.merchant_flow?.flow?.state || 'none'}:${director.data?.merchant_flow?.flow?.sequence ?? 'none'}`
  });
  useEffect(() => {
    if (!session || mode !== 'advanced') return;
    window.scrollTo?.({ top: 0, behavior: 'auto' });
    heading.current?.focus({ preventScroll: true });
  }, [mode, stage, session]);
  useEffect(() => {
    if (director.data && !session && !director.pending && !director.error && !hasStartedNewSession.current) {
      hasStartedNewSession.current = true;
      director.start();
    }
  }, [director.data, director.error, director.pending, director.start, session]);
  if (!director.data && !director.error) return <main className="app-loading" aria-busy="true"><p>{t('app.loading')}</p></main>;
  if (!session) {
    if (director.error) return <main className="creative-director-app"><section className="creative-director-app__content"><p className="form-error" role="alert">{director.error}</p><button className="button button--primary" type="button" onClick={director.start}>{t('creative_director.landing.start')}</button></section></main>;
    return <main className="app-loading" aria-busy="true"><p>{t('creative_director.conversation.starting')}</p></main>;
  }
  const preparePurchase = async (idempotencyKey, readinessToken) => {
    if (director.data.merchant_flow_beta_enabled !== true) return director.createCustomThemeOrder(idempotencyKey, readinessToken);
    const started = await director.startMerchantGenerationFlow();
    if (!started?.flow || started.flow.architecture?.status !== 'frozen') return started;
    const current = await director.customThemeEligibility();
    return director.createCustomThemeOrder(idempotencyKey, current?.eligibility?.readiness_token || readinessToken);
  };
  const merchantFlowProps = {
    merchantFlow: director.data.merchant_flow,
    merchantFlowBetaEnabled: director.data.merchant_flow_beta_enabled === true,
    onStartFlow: director.startMerchantGenerationFlow,
    onAnswerFlow: director.answerMerchantGenerationFlow,
    onResumeFlow: director.resumeMerchantGenerationFlow
  };
  const applyOperatorMutationAndRefreshProjection = async (mutationKind, work) => {
    const result = await work();
    const applied = result?.operation?.status === 'applied';
    if (applied && analysisFirstEnabled && EXPLICIT_F1_PROJECTION_INVALIDATIONS.has(mutationKind)) {
      // The protected mutation has already refreshed Creative Director state.
      // Fetch F1 from its authenticated server projection instead of deriving
      // preview availability in the client. A projection read failure remains
      // visible through the F1 hook without rewriting the successful mutation.
      await analysisFirst.refresh().catch(() => null);
    }
    return result;
  };
  const renderOperatorDiagnostics = (placement) => operatorDiagnosticsAvailable ? <ProtectedOperatorDiagnosticsHost
    placement={placement}
    onCheck={() => service.operatorReadiness()}
    onRefresh={() => service.refreshOperatorReadiness()}
    onRecoverQa={director.recoverFounderQaEvidence}
    onSubmitQa={director.submitFounderQa}
    onRecoverPreviewProvenance={(submission) => applyOperatorMutationAndRefreshProjection(
      'preview_provenance_recovery',
      () => director.recoverPreviewProvenance(submission)
    )}
    onSucceedRenderTarget={(submission) => applyOperatorMutationAndRefreshProjection(
      'render_target_succession',
      () => director.succeedRenderTarget(submission)
    )}
  /> : null;
  const handleQuickStartDecision = async (action) => {
    if (action.kind === 'open_advanced') {
      setMode('advanced');
      return true;
    }
    if (action.kind === 'prepare_understanding') return director.createBrief();
    if (action.kind === 'approve_brief') return director.approveBrief();
    if (action.kind === 'approve_strategy_recommendation') return director.decideRecommendation(action.recommendationId, 'approved', '');
    if (action.kind === 'approve_strategy') return director.approveStrategy();
    if (action.kind === 'approve_preset') return director.approvePreset(action.expectedVersion);
    if (action.kind === 'refresh_store_intelligence') return director.refreshMerchantIntake();
    if (action.kind === 'retry_preview') return director.retryLivePreview();
    if (action.kind === 'approve_resource_set') return director.approveRecommendedResourceSet(action.revisionId);
    if (action.kind === 'approve_creative_direction') return director.approveCreativeDirection(action.recommendationRevisionId, action.designDnaRevisionId);
    if (action.kind === 'replace_resource_set_slot') return director.replaceRecommendedResource(action.revisionId, action.slotId, action.selectionId);
    const operationKey = () => `quick-start-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    if (action.kind === 'start_generation') return preparePurchase(operationKey(), action.readinessToken);
    if (action.kind === 'confirm_generation_payment') return director.confirmDevelopmentCustomThemePayment(action.orderId, operationKey());
    if (action.kind === 'verify_generation_payment') return director.verifyCustomThemePayment(action.orderId, operationKey());
    if (action.kind === 'retry_generation') return director.retryCustomThemeGeneration(action.orderId);
    if (action.kind === 'download_theme') {
      const result = await director.downloadCustomThemeArtifact(action.orderId, 'theme-zip');
      if (!result?.blob) return (await director.refresh().catch(() => null)) ? true : null;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      return true;
    }
    return null;
  };
  if (mode === 'quick_start') {
    if (analysisFirstEnabled && !analysisFirst.experience && !analysisFirst.error) {
      return <main className="app-loading" aria-busy="true"><p>{t('app.loading')}</p></main>;
    }
    if (analysisFirstEnabled && analysisFirst.experience?.eligible) {
      const explicitF1Action = async (eventName, work, telemetry = {}) => {
        if (f1ActionLock.current) return null;
        f1ActionLock.current = true;
        try {
          const result = await work();
          if (result) {
            if (eventName) await analysisFirst.track(eventName, { merchant_action_count: 1, ...telemetry }, { once: true });
            await analysisFirst.refresh();
          }
          return result;
        } finally {
          f1ActionLock.current = false;
        }
      };
      const openAdvanced = () => {
        analysisFirst.track('advanced_mode_opened', { advanced_mode_used: true, merchant_action_count: 1 }, { once: true });
        setMode('advanced');
      };
      const buildPreview = () => explicitF1Action('build_preview_selected', async () => {
        const operationKey = `analysis-first-${analysisFirst.experience.projection_key}`;
        if (director.data.merchant_flow_beta_enabled === true) return preparePurchase(operationKey);
        const current = await director.customThemeEligibility();
        return preparePurchase(operationKey, current?.eligibility?.readiness_token);
      });
      const retry = () => {
        const flow = director.data?.merchant_flow?.flow;
        if (!flow) return null;
        return explicitF1Action('build_resumed', () => director.resumeMerchantGenerationFlow(flow.flow_id, flow.flow_checksum, flow.sequence), { retry_count: 1 });
      };
      return <AnalysisFirstMerchantJourney
        experience={analysisFirst.experience}
        pending={director.pending || analysisFirst.pending || f1ActionLock.current}
        error={analysisFirst.error || director.error}
        operatorDiagnostics={renderOperatorDiagnostics('analysis-first')}
        onChooseDirection={analysisFirst.selectDirection}
        onEssentialDetail={(answer) => explicitF1Action(null, () => director.respond(answer))}
        onBuild={buildPreview}
        onRetry={retry}
        onApprove={() => explicitF1Action('design_approved', () => director.setStage('finish'))}
        onRequestChanges={() => { analysisFirst.track('request_changes_selected', { merchant_action_count: 1 }, { once: true }); setMode('advanced'); }}
        onCompare={() => { analysisFirst.track('compare_selected', { merchant_action_count: 1 }, { once: true }); setMode('advanced'); }}
        onAdvanced={openAdvanced}
        onTrack={(eventName) => analysisFirst.track(eventName, { merchant_action_count: 1 }, { once: true })}
      />;
    }
    return <QuickStartShell data={director.data} session={session} pending={director.pending} onRespond={director.respond} onExit={onExit} onOpenAdvanced={() => setMode('advanced')} onDecisionAction={handleQuickStartDecision} onStartFlow={director.startMerchantGenerationFlow} onAnswerFlow={director.answerMerchantGenerationFlow} onResumeFlow={director.resumeMerchantGenerationFlow} operatorDiagnostics={renderOperatorDiagnostics('quick-start')} />;
  }
  const returnToUnderstanding = () => director.setStage('understanding');
  const returnToResources = () => director.setStage('resources');
  const contentPlanProjection = session.content_plan_projection || null;
  const projectedTargets = new Map((contentPlanProjection?.targets || []).map((target) => [target.content_key, target]));
  const selectedHomepageSections = new Set((session.store_strategy?.homepage?.sections || []).map((section) => section.id || section.section_id || section.sectionId));
  const targetHasEditor = (key, legacySectionId = null) => {
    const target = projectedTargets.get(key);
    if (target) return target.state === 'needs_input' || target.state === 'ready';
    return legacySectionId ? selectedHomepageSections.has(legacySectionId) : Boolean(session.content_plan?.[key]?.status && session.content_plan[key].status !== 'not_required');
  };
  const hasEditorialGridPlan = targetHasEditor('editorial_grid', 'editorial-grid');
  const hasLookbookPlan = targetHasEditor('lookbook', 'lookbook');
  const hasCraftsmanshipPlan = targetHasEditor('craftsmanship', 'craftsmanship');
  const hasManufacturingProcessPlan = targetHasEditor('manufacturing_process', 'manufacturing-process');
  const hasBrandTimelinePlan = targetHasEditor('brand_timeline', 'brand-timeline');
  const hasSustainabilityPlan = targetHasEditor('sustainability', 'sustainability');
  const hasTeamPlan = targetHasEditor('team', 'team');
  const hasAwardsCertificationsPlan = targetHasEditor('awards_certifications', 'awards-certifications');
  const commerceCandidate = (key) => targetHasEditor(key);
  const commerceProps = { session, assets: director.data.assets || [], onLoadShopifyResources: director.shopifyResources, onReturnResources: returnToResources, pending: director.pending };
  const commerceScreens = <>{commerceCandidate('complementary_products_fallback') && <CommercePlanScreen {...commerceProps} planKey="complementary_products_fallback" title="Complementary Products fallback" note="Choose merchant-approved fallback products. Shopify's complementary response remains primary." maximum={8} fallback onSave={director.saveComplementaryProductsFallbackPlan} onRegenerate={director.regenerateComplementaryProductsFallbackPlan} onApprove={director.approveComplementaryProductsFallbackPlan} />}{commerceCandidate('shop_the_look') && <CommercePlanScreen {...commerceProps} planKey="shop_the_look" title="Shop the Look" note="Choose approved scene media and explicitly associate each approved product. Calinium never identifies products from the image." maximum={6} shopTheLook onSave={director.saveShopTheLookPlan} onRegenerate={director.regenerateShopTheLookPlan} onApprove={director.approveShopTheLookPlan} />}{commerceCandidate('product_bundle_showcase') && <CommercePlanScreen {...commerceProps} planKey="product_bundle_showcase" title="Product Bundle Showcase" note="Choose two or more products for a presentational showcase. This does not create a discount or combined purchase." minimum={2} maximum={5} onSave={director.saveProductBundleShowcasePlan} onRegenerate={director.regenerateProductBundleShowcasePlan} onApprove={director.approveProductBundleShowcasePlan} />}{commerceCandidate('cross_sell_products') && <CommercePlanScreen {...commerceProps} planKey="cross_sell_products" title="Cross-sell Products" note="Choose and order products you explicitly want to merchandise together. This is not a recommendation algorithm." maximum={8} onSave={director.saveCrossSellProductsPlan} onRegenerate={director.regenerateCrossSellProductsPlan} onApprove={director.approveCrossSellProductsPlan} />}</>;
  const evidenceProps = { embedded: true, session, assets: director.data.assets || [], onReturnResources: returnToResources, pending: director.pending };
  const contentPlanScreen = <section aria-labelledby="content-plan-heading"><div className="cd-stage-intro"><p className="eyebrow">Content plan</p><h1 id="content-plan-heading">Review your editorial content</h1><p>Review only the editorial sections selected for this storefront direction. Each uses approved merchant content and resources.</p></div>{hasAwardsCertificationsPlan && <EvidencePlanScreen {...evidenceProps} planKey="awards_certifications" itemsKey="recognitions" title="Awards and Certifications" plural="recognitions" itemName="Recognition" fields={[{key:'kind',label:'Recognition type',required:true,options:[{value:'award',label:'Award'},{value:'certification',label:'Certification'}]},{key:'title',label:'Verified title',required:true},{key:'issuer',label:'Issuing organisation',required:true},{key:'year',label:'Year',maxLength:40},{key:'text',label:'Approved detail',multiline:true,wide:true}]} icon={{key:'award_icon',label:'Display icon',default:'none',options:[{value:'none',label:'No icon'},{value:'award',label:'Award'},{value:'medal',label:'Medal'},{value:'star',label:'Star'},{value:'certificate',label:'Certificate'},{value:'verified',label:'Verified'},{value:'shield-check',label:'Shield check'}]}} note="Show only awards and certifications supported by merchant evidence. Calinium will not create a credential, issuer, date, or verification claim." onSave={director.saveAwardsCertificationsPlan} onRegenerate={director.regenerateAwardsCertificationsPlan} onApprove={director.approveAwardsCertificationsPlan} />}{hasTeamPlan && <EvidencePlanScreen {...evidenceProps} planKey="team" itemsKey="members" title="Team" plural="members" itemName="Team member" fields={[{key:'name',label:'Approved name',required:true},{key:'role',label:'Approved role',required:true},{key:'bio',label:'Approved biography',multiline:true,wide:true}]} note="Show only people, roles, biographies, and portraits the merchant has approved. Calinium will not infer team members or employment facts." onSave={director.saveTeamPlan} onRegenerate={director.regenerateTeamPlan} onApprove={director.approveTeamPlan} />}{hasSustainabilityPlan && <EvidencePlanScreen {...evidenceProps} planKey="sustainability" itemsKey="initiatives" title="Sustainability" plural="initiatives" itemName="Initiative" fields={[{key:'title',label:'Verified initiative title',required:true},{key:'text',label:'Verified explanation',required:true,multiline:true,wide:true}]} icon={{key:'initiative_icon',label:'Display icon',default:'leaf',options:[{value:'leaf',label:'Leaf'},{value:'recycle',label:'Recycle'},{value:'globe',label:'Globe'},{value:'heart',label:'Heart'}]}} note="Show only operational environmental or sourcing evidence the merchant has verified. Aspirations, metrics, certifications, and benefits are omitted unless separately approved." onSave={director.saveSustainabilityPlan} onRegenerate={director.regenerateSustainabilityPlan} onApprove={director.approveSustainabilityPlan} />}{hasBrandTimelinePlan && <EvidencePlanScreen {...evidenceProps} planKey="brand_timeline" itemsKey="milestones" title="Brand Timeline" plural="milestones" itemName="Milestone" fields={[{key:'date',label:'Verified date or year',required:true,maxLength:80},{key:'title',label:'Verified milestone title',required:true},{key:'text',label:'Approved chronology detail',multiline:true,wide:true}]} icon={{key:'timeline_icon',label:'Display icon',default:'none',options:[{value:'none',label:'No icon'},{value:'sparkle',label:'Sparkle'},{value:'star',label:'Star'},{value:'calendar',label:'Calendar'},{value:'arrow-right',label:'Arrow'}]}} note="List only merchant-confirmed dated milestones in the exact order you approve. Calinium will not infer company history or fill gaps in chronology." onSave={director.saveBrandTimelinePlan} onRegenerate={director.regenerateBrandTimelinePlan} onApprove={director.approveBrandTimelinePlan} />}{hasManufacturingProcessPlan && <ManufacturingProcessPlanScreen embedded session={session} assets={director.data.assets || []} onSave={director.saveManufacturingProcessPlan} onRegenerate={director.regenerateManufacturingProcessPlan} onApprove={director.approveManufacturingProcessPlan} onReturnResources={returnToResources} pending={director.pending} />}{hasCraftsmanshipPlan && <CraftsmanshipPlanScreen embedded session={session} assets={director.data.assets || []} onSave={director.saveCraftsmanshipPlan} onRegenerate={director.regenerateCraftsmanshipPlan} onApprove={director.approveCraftsmanshipPlan} onReturnResources={returnToResources} pending={director.pending} />}{hasLookbookPlan && <LookbookPlanScreen embedded session={session} assets={director.data.assets || []} onLoadShopifyResources={director.shopifyResources} onSave={director.saveLookbookPlan} onRegenerate={director.regenerateLookbookPlan} onApprove={director.approveLookbookPlan} onReturnResources={returnToResources} pending={director.pending} />}{hasEditorialGridPlan && <EditorialGridPlanScreen embedded session={session} assets={director.data.assets || []} onLoadShopifyResources={director.shopifyResources} onSave={director.saveEditorialGridPlan} onRegenerate={director.regenerateEditorialGridPlan} onApprove={director.approveEditorialGridPlan} onReturnResources={returnToResources} pending={director.pending} />}</section>;
  const completeContentPlanScreen = <><ContentPlanStatusList projection={contentPlanProjection} onContinue={stage === 'content-plan' ? () => director.setStage('offer') : null} pending={director.pending} />{contentPlanScreen}{commerceScreens}</>;
  const priorStage = { blueprint: 'understanding', strategy: 'blueprint', preset: 'strategy', resources: 'preset', 'content-plan': 'resources', offer: contentPlanProjection ? 'content-plan' : session.content_plan?.status === 'approved' ? 'content-plan' : 'resources', generation: 'offer', delivery: 'offer', preview: 'delivery', finish: 'preview' }[stage];
  const editFromBlueprint = (path, value) => director.correct(path, Array.isArray(value) ? value.join(', ') : value);
  const content = {
    conversation: <ConversationScreen session={session} onRespond={director.respond} pending={director.pending} />,
    understanding: <UnderstandingScreen session={session} onCreateBrief={director.createBrief} onCorrect={director.correct} pending={director.pending} />,
    blueprint: <BrandBlueprintScreen session={session} onApprove={director.approveBrief} onRevise={() => director.requestBriefRevision('')} onEdit={editFromBlueprint} pending={director.pending} />,
    strategy: <StoreStrategyScreen session={session} onDecide={director.decideRecommendation} onApprove={director.approveStrategy} onRevise={returnToUnderstanding} pending={director.pending} />,
    preset: <PresetReviewScreen session={session} onSelect={director.selectPreset} onApprove={director.approvePreset} onReturnStrategy={() => director.setStage('strategy')} pending={director.pending} />,
    resources: <ResourcePicker session={session} assets={director.data.assets || []} shopify={director.data.shopify} error={director.error} errorDetails={director.errorDetails} onSave={director.updateResources} onOpenAssets={() => navigate(`/projects/${session.project_id}/assets`)} onConnectShopify={director.startShopifyConnection} onSyncShopify={director.syncShopifyResources} onCheckShopify={director.checkShopifyConnection} onDisconnectShopify={director.disconnectShopifyConnection} onLoadShopifyResources={director.shopifyResources} onDecideShopifyResource={director.decideShopifyResource} onRevokeShopifyResource={director.revokeShopifyResource} pending={director.pending} />,
    'content-plan': completeContentPlanScreen,
    offer: <CustomThemeOfferScreen customTheme={director.data.custom_theme} {...merchantFlowProps} onPurchase={preparePurchase} onConfirmPayment={director.confirmDevelopmentCustomThemePayment} onVerifyPayment={director.verifyCustomThemePayment} onGenerate={director.retryCustomThemeGeneration} onReturnResources={returnToResources} pending={director.pending} />,
    generation: <GenerationScreen session={session} onGenerate={director.generate} onReturnResources={returnToResources} pending={director.pending} />,
    delivery: <ThemeDeliveryScreen customTheme={director.data.custom_theme} {...merchantFlowProps} onDownload={director.downloadCustomThemeArtifact} onReturnOffer={() => director.setStage('offer')} pending={director.pending} />,
    preview: <PreviewScreen session={session} onRegenerate={returnToResources} onApprove={() => director.setStage('finish')} pending={director.pending} />,
    finish: <FinishScreen onExit={onExit} />
  };
  return <main className="creative-director-app"><StageHeader stage={stage} onExit={onExit} onRestart={director.restart} onBack={priorStage ? () => director.setStage(priorStage) : null} onQuickStart={() => setMode('quick_start')} restarting={director.pending} /><div className="creative-director-app__content" ref={heading} tabIndex="-1">{director.error && stage !== 'resources' && <p className="form-error" role="alert">{director.error}</p>}{content[stage] || content.conversation}</div></main>;
}
