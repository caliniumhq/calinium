import { useCallback, useEffect, useRef, useState } from 'react';

const IMPRESSION_EVENTS = Object.freeze({
  analyzing_store: 'analysis_first_journey_viewed',
  building_storefront: 'build_started',
  review_preview: 'preview_ready'
});

function telemetryInput(experience, eventName, overrides = {}) {
  const projection = experience?.projection;
  return {
    event_name: eventName,
    journey_stage: projection?.current_stage?.id,
    visible_merchant_question_count: projection?.direction?.choice_required || projection?.direction?.essential_detail ? 1 : 0,
    direction_choice_required: projection?.direction?.choice_required === true,
    merchant_action_count: 0,
    retry_count: 0,
    advanced_mode_used: false,
    founder_intervention_count: 0,
    ...overrides
  };
}

async function recordTelemetry(service, experience, eventName, overrides = {}, { once = false } = {}) {
  if (!experience?.eligible || !experience.projection) return false;
  const key = `calinium:f1:${experience.projection_key}:${eventName}`;
  if (once && globalThis.sessionStorage?.getItem(key) === '1') return true;
  try {
    await service.recordAnalysisFirstTelemetry(telemetryInput(experience, eventName, overrides));
    if (once) globalThis.sessionStorage?.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

export function useAnalysisFirstMerchantExperience({ service, enabled, refreshKey = null }) {
  const [experience, setExperience] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const mutation = useRef(null);
  const requestGeneration = useRef(0);
  const explicitRefresh = useRef(null);

  const loadAuthoritativeProjection = useCallback(async () => {
    if (!enabled) return null;
    const generation = requestGeneration.current + 1;
    requestGeneration.current = generation;
    setPending(true);
    try {
      const result = await service.analysisFirstExperience();
      if (requestGeneration.current !== generation) return null;
      setExperience(result);
      setError(null);
      return result;
    } catch (reason) {
      if (requestGeneration.current === generation) setError(reason.message);
      throw reason;
    } finally {
      if (requestGeneration.current === generation) setPending(false);
    }
  }, [enabled, service]);

  const refresh = useCallback(() => {
    if (!enabled) return Promise.resolve(null);
    if (explicitRefresh.current) return explicitRefresh.current;
    const work = loadAuthoritativeProjection();
    explicitRefresh.current = work;
    return work.finally(() => {
      if (explicitRefresh.current === work) explicitRefresh.current = null;
    });
  }, [enabled, loadAuthoritativeProjection]);

  useEffect(() => {
    if (!enabled) {
      requestGeneration.current += 1;
      explicitRefresh.current = null;
      setExperience(null);
      setPending(false);
      setError(null);
      return undefined;
    }
    loadAuthoritativeProjection().catch(() => {});
    return undefined;
  }, [enabled, refreshKey, loadAuthoritativeProjection]);

  const track = useCallback(async (eventName, overrides = {}, { once = false } = {}) => {
    if (!enabled) return false;
    return recordTelemetry(service, experience, eventName, overrides, { once });
  }, [enabled, experience, service]);

  useEffect(() => {
    const stage = experience?.projection?.current_stage?.id;
    if (!stage) return;
    track(IMPRESSION_EVENTS[stage], {}, { once: true });
    if (experience.projection.direction?.choice_required) track('direction_choice_required', {}, { once: true });
    else if (experience.projection.direction?.selected_direction) track('direction_recommendation_shown', {}, { once: true });
  }, [experience?.projection_key, track]);

  const selectDirection = useCallback(async (directionId) => {
    if (!experience?.action_bindings?.choose_direction || mutation.current) return null;
    const work = service.selectAnalysisFirstDirection(directionId, experience.action_bindings.choose_direction);
    mutation.current = work;
    setPending(true);
    setError(null);
    try {
      const result = await work;
      setExperience(result);
      await recordTelemetry(service, result, 'direction_selected', { merchant_action_count: 1 }, { once: true });
      return result;
    } catch (reason) {
      setError(reason.message);
      return null;
    } finally {
      if (mutation.current === work) mutation.current = null;
      setPending(false);
    }
  }, [experience, service]);

  return { experience, pending, error, refresh, selectDirection, track };
}

export { telemetryInput, recordTelemetry };
