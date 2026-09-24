import { useCallback, useEffect, useState } from 'react';

export function useCreativeDirector({ service }) {
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);

  const apply = useCallback(async (work) => {
    setPending(true); setError(null); setErrorDetails(null);
    try {
      const result = await work();
      if (result?.session || result?.recommended_resource_set) setData((current) => ({ ...(current || {}), ...(result?.session ? { session: result.session } : {}), ...(result?.recommended_resource_set ? { recommended_resource_set: result.recommended_resource_set } : {}) }));
      return result;
    } catch (reason) { setError(reason.message); setErrorDetails({ code: reason.code || null, details: reason.details || null }); return null; }
    finally { setPending(false); }
  }, []);
  const refresh = useCallback(async () => {
    const result = await service.load(); setData(result); return result;
  }, [service]);
  const applyAndRefresh = useCallback(async (work) => {
    const result = await apply(work);
    if (result) await refresh();
    return result;
  }, [apply, refresh]);
  const applyOperatorAction = useCallback(async (work) => {
    setPending(true); setError(null); setErrorDetails(null);
    try {
      const result = await work();
      if (result) await refresh();
      return result;
    } catch (reason) {
      setError(reason.message);
      setErrorDetails({ code: reason.code || null, status: Number(reason.status || 0), details: reason.details || null });
      throw reason;
    } finally {
      setPending(false);
    }
  }, [refresh]);

  useEffect(() => {
    let active = true;
    service.load().then((result) => { if (active) setData(result); }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [service]);

  useEffect(() => {
    if (data?.store_intelligence?.status !== 'learning') return undefined;
    let active = true;
    const timer = globalThis.setInterval(() => {
      service.merchantIntake().then((result) => {
        if (!active) return;
        setData((current) => ({ ...(current || {}), store_intelligence: result }));
        if (result?.status !== 'learning') refresh().catch(() => {});
      }).catch(() => {});
    }, 1500);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [data?.store_intelligence?.status, data?.store_intelligence?.revision_id, refresh, service]);

  useEffect(() => {
    const flow = data?.merchant_flow?.flow;
    if (!flow || !['generation_running', 'artifact_ready', 'render_qa_running'].includes(flow.state)) return undefined;
    let active = true;
    const timer = globalThis.setInterval(() => {
      service.merchantGenerationFlow().then((result) => {
        if (!active) return;
        setData((current) => ({ ...(current || {}), merchant_flow: result }));
        if (result?.flow?.preview_ready) refresh().catch(() => {});
      }).catch(() => {});
    }, 1500);
    return () => { active = false; globalThis.clearInterval(timer); };
  }, [data?.merchant_flow?.flow?.flow_id, data?.merchant_flow?.flow?.state, refresh, service]);

  return {
    data, session: data?.session || null, pending, error, errorDetails,
    start: () => apply(() => service.start()),
    restart: () => apply(() => service.restart()),
    // A saved answer can change Intake, Recommendation, Design DNA, Resource
    // Set, and Live Preview state. Reload the server-authoritative projection
    // after every response so a successor refinement is never displayed as
    // the historical Generated preview.
    respond: (message) => applyAndRefresh(() => {
      const conversationId = data?.session?.conversation_state?.conversationId;
      const expectedSessionUpdatedAt = data?.session?.updated_at;
      return conversationId && expectedSessionUpdatedAt
        ? service.respond(message, { conversationId, expectedSessionUpdatedAt })
        : service.respond(message);
    }),
    correct: (path, value) => apply(() => service.correct(path, value)),
    createBrief: () => apply(() => service.createBrief()),
    approveBrief: () => apply(() => service.approveBrief()),
    requestBriefRevision: (comment) => apply(() => service.requestBriefRevision(comment)),
    decideRecommendation: (path, status, comment) => apply(() => service.decideRecommendation(path, status, comment)),
    approveStrategy: () => apply(() => service.approveStrategy()),
    selectPreset: (expectedVersion, presetId) => applyAndRefresh(() => service.selectPreset(expectedVersion, presetId)),
    approvePreset: (expectedVersion) => applyAndRefresh(() => service.approvePreset(expectedVersion)),
    updateResources: (assetSelections, requiredAssetSelections, shopifySelections, emptyFields, confirmedRequiredConfirmations, expectedResourceDecisionChecksum) => applyAndRefresh(() => service.updateResources(assetSelections, requiredAssetSelections, shopifySelections, emptyFields, confirmedRequiredConfirmations, expectedResourceDecisionChecksum)),
    saveEditorialGridPlan: (expectedVersion, stories) => applyAndRefresh(() => service.saveEditorialGridPlan(expectedVersion, stories)),
    regenerateEditorialGridPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateEditorialGridPlan(expectedVersion)),
    approveEditorialGridPlan: (expectedVersion) => applyAndRefresh(() => service.approveEditorialGridPlan(expectedVersion)),
    saveLookbookPlan: (expectedVersion, frames) => applyAndRefresh(() => service.saveLookbookPlan(expectedVersion, frames)),
    regenerateLookbookPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateLookbookPlan(expectedVersion)),
    approveLookbookPlan: (expectedVersion) => applyAndRefresh(() => service.approveLookbookPlan(expectedVersion)),
    saveCraftsmanshipPlan: (expectedVersion, steps) => applyAndRefresh(() => service.saveCraftsmanshipPlan(expectedVersion, steps)),
    regenerateCraftsmanshipPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateCraftsmanshipPlan(expectedVersion)),
    approveCraftsmanshipPlan: (expectedVersion) => applyAndRefresh(() => service.approveCraftsmanshipPlan(expectedVersion)),
    saveManufacturingProcessPlan: (expectedVersion, steps) => applyAndRefresh(() => service.saveManufacturingProcessPlan(expectedVersion, steps)),
    regenerateManufacturingProcessPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateManufacturingProcessPlan(expectedVersion)),
    approveManufacturingProcessPlan: (expectedVersion) => applyAndRefresh(() => service.approveManufacturingProcessPlan(expectedVersion)),
    saveBrandTimelinePlan: (expectedVersion, milestones) => applyAndRefresh(() => service.saveBrandTimelinePlan(expectedVersion, milestones)),
    regenerateBrandTimelinePlan: (expectedVersion) => applyAndRefresh(() => service.regenerateBrandTimelinePlan(expectedVersion)),
    approveBrandTimelinePlan: (expectedVersion) => applyAndRefresh(() => service.approveBrandTimelinePlan(expectedVersion)),
    saveSustainabilityPlan: (expectedVersion, initiatives) => applyAndRefresh(() => service.saveSustainabilityPlan(expectedVersion, initiatives)),
    regenerateSustainabilityPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateSustainabilityPlan(expectedVersion)),
    approveSustainabilityPlan: (expectedVersion) => applyAndRefresh(() => service.approveSustainabilityPlan(expectedVersion)),
    saveTeamPlan: (expectedVersion, members) => applyAndRefresh(() => service.saveTeamPlan(expectedVersion, members)),
    regenerateTeamPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateTeamPlan(expectedVersion)),
    approveTeamPlan: (expectedVersion) => applyAndRefresh(() => service.approveTeamPlan(expectedVersion)),
    saveAwardsCertificationsPlan: (expectedVersion, recognitions) => applyAndRefresh(() => service.saveAwardsCertificationsPlan(expectedVersion, recognitions)),
    regenerateAwardsCertificationsPlan: (expectedVersion) => applyAndRefresh(() => service.regenerateAwardsCertificationsPlan(expectedVersion)),
    approveAwardsCertificationsPlan: (expectedVersion) => applyAndRefresh(() => service.approveAwardsCertificationsPlan(expectedVersion)),
    saveCrossSellProductsPlan: (version, products, scene) => applyAndRefresh(() => service.saveCrossSellProductsPlan(version, products, scene)),
    regenerateCrossSellProductsPlan: (version) => applyAndRefresh(() => service.regenerateCrossSellProductsPlan(version)),
    approveCrossSellProductsPlan: (version) => applyAndRefresh(() => service.approveCrossSellProductsPlan(version)),
    saveProductBundleShowcasePlan: (version, products, scene) => applyAndRefresh(() => service.saveProductBundleShowcasePlan(version, products, scene)),
    regenerateProductBundleShowcasePlan: (version) => applyAndRefresh(() => service.regenerateProductBundleShowcasePlan(version)),
    approveProductBundleShowcasePlan: (version) => applyAndRefresh(() => service.approveProductBundleShowcasePlan(version)),
    saveShopTheLookPlan: (version, products, scene) => applyAndRefresh(() => service.saveShopTheLookPlan(version, products, scene)),
    regenerateShopTheLookPlan: (version) => applyAndRefresh(() => service.regenerateShopTheLookPlan(version)),
    approveShopTheLookPlan: (version) => applyAndRefresh(() => service.approveShopTheLookPlan(version)),
    saveComplementaryProductsFallbackPlan: (version, products, scene) => applyAndRefresh(() => service.saveComplementaryProductsFallbackPlan(version, products, scene)),
    regenerateComplementaryProductsFallbackPlan: (version) => applyAndRefresh(() => service.regenerateComplementaryProductsFallbackPlan(version)),
    approveComplementaryProductsFallbackPlan: (version) => applyAndRefresh(() => service.approveComplementaryProductsFallbackPlan(version)),
    // Retained for sessions created before the paid offer. The server rejects
    // it and directs merchants to the purchase stage.
    generate: () => apply(() => service.generate()),
    setStage: (stage) => apply(() => service.setStage(stage)),
    customThemeEligibility: () => applyAndRefresh(() => service.customThemeEligibility()),
    createCustomThemeOrder: (idempotencyKey, readinessToken) => applyAndRefresh(() => service.createCustomThemeOrder(idempotencyKey, readinessToken)),
    confirmDevelopmentCustomThemePayment: (orderId, idempotencyKey) => applyAndRefresh(() => service.confirmDevelopmentCustomThemePayment(orderId, idempotencyKey)),
    verifyCustomThemePayment: (orderId, idempotencyKey) => applyAndRefresh(() => service.verifyCustomThemePayment(orderId, idempotencyKey)),
    retryCustomThemeGeneration: (orderId) => applyAndRefresh(() => service.retryCustomThemeGeneration(orderId)),
    startMerchantGenerationFlow: () => applyAndRefresh(() => service.startMerchantGenerationFlow()),
    answerMerchantGenerationFlow: (flowId, questionId, message, checksum) => applyAndRefresh(() => service.answerMerchantGenerationFlow(flowId, questionId, message, checksum)),
    resumeMerchantGenerationFlow: (flowId, checksum, sequence) => applyAndRefresh(() => service.resumeMerchantGenerationFlow(flowId, checksum, sequence)),
    recoverFounderQaEvidence: (submission) => applyOperatorAction(() => service.recoverFounderQaEvidence(submission)),
    recoverPreviewProvenance: (submission) => applyOperatorAction(() => service.recoverPreviewProvenance(submission)),
    succeedRenderTarget: (submission) => applyOperatorAction(() => service.succeedRenderTarget(submission)),
    submitFounderQa: (submission) => applyOperatorAction(() => service.submitFounderQa(submission)),
    downloadCustomThemeArtifact: (orderId, artifact) => apply(() => service.downloadCustomThemeArtifact(orderId, artifact)),
    refresh,
    startShopifyConnection: (shopDomain, purpose) => apply(() => service.startShopifyConnection(shopDomain, purpose)),
    assignShopifyConnection: (connectionId) => applyAndRefresh(() => service.assignShopifyConnection(connectionId)),
    checkShopifyConnection: (connectionId) => applyAndRefresh(() => service.checkShopifyConnection(connectionId)),
    syncShopifyResources: (connectionId) => applyAndRefresh(() => service.syncShopifyResources(connectionId)),
    refreshMerchantIntake: () => applyAndRefresh(() => service.refreshMerchantIntake()),
    retryLivePreview: () => applyAndRefresh(() => service.retryLivePreview()),
    refreshRecommendedResourceSet: () => applyAndRefresh(() => service.refreshRecommendedResourceSet()),
    approveRecommendedResourceSet: (revisionId) => applyAndRefresh(() => service.approveRecommendedResourceSet(revisionId)),
    replaceRecommendedResource: (revisionId, slotId, selectionId) => applyAndRefresh(() => service.replaceRecommendedResource(revisionId, slotId, selectionId)),
    refreshCreativeDirection: () => applyAndRefresh(() => service.refreshCreativeDirection()),
    approveCreativeDirection: (recommendationRevisionId, designDnaRevisionId) => applyAndRefresh(() => service.approveCreativeDirection(recommendationRevisionId, designDnaRevisionId)),
    disconnectShopifyConnection: (connectionId) => applyAndRefresh(() => service.disconnectShopifyConnection(connectionId)),
    shopifyResources: (options) => apply(() => service.shopifyResources(options)),
    decideShopifyResource: (resourceId, status, note) => applyAndRefresh(() => service.decideShopifyResource(resourceId, status, note)),
    revokeShopifyResource: (resourceId, note) => applyAndRefresh(() => service.revokeShopifyResource(resourceId, note)),
    prepareShopifyPreview: (buildId) => applyAndRefresh(() => service.prepareShopifyPreview(buildId))
  };
}
