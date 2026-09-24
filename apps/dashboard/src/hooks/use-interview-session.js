import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorMap, persistenceValue } from '../lib/interview-values';
import { nowIso } from '../lib/time';

function categoryQuestions(catalog, session, categoryId) {
  const visible = new Set(session?.visible_question_ids || []);
  return (catalog?.questions || []).filter((question) => question.category_id === categoryId && visible.has(question.id));
}

function sameAnswer(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

export function useInterviewSession({ service }) {
  const [catalog, setCatalog] = useState(null);
  const [session, setSession] = useState(null);
  const [draftAnswers, setDraftAnswers] = useState({});
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [summaryPreview, setSummaryPreview] = useState(null);
  const [saveState, setSaveState] = useState({ status: 'idle', savedAt: null });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const savingSequence = useRef(0);

  const persist = useCallback((nextSession) => {
    setSession(nextSession);
    setDraftAnswers(nextSession.answers || {});
  }, []);

  const reportFailure = useCallback((error) => {
    setSaveState({ status: 'error', savedAt: null });
    setGlobalError(error.message);
    return { ok: false, error };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { catalog: nextCatalog } = await service.load();
      if (!mounted) return;
      setCatalog(nextCatalog);
      const stored = await service.savedSession();
      if (!mounted) return;
      if (stored?.session) {
        setSession(stored.session);
        setDraftAnswers(stored.session.answers || {});
        setActiveCategoryId(stored.activeCategoryId || nextCatalog.categories[0]?.id || null);
      } else setActiveCategoryId(nextCatalog.categories[0]?.id || null);
      setPhase('welcome');
    })().catch((error) => {
      if (mounted) setGlobalError(error.message);
    });
    return () => { mounted = false; };
  }, [service]);

  const start = useCallback(async () => {
    try {
      setGlobalError(null);
      const created = await service.create(nowIso());
      const firstCategoryId = catalog.categories[0]?.id || null;
      setActiveCategoryId(firstCategoryId);
      persist(created.session, firstCategoryId);
      setPhase('interview');
      setSaveState({ status: 'saved', savedAt: created.session.updated_at });
    } catch (error) { reportFailure(error); }
  }, [catalog, persist, reportFailure, service]);

  const resume = useCallback(async () => {
    if (!session) return;
    try {
      setGlobalError(null);
      const resumed = await service.resume(session, nowIso());
      const categoryId = activeCategoryId || catalog.categories[0]?.id || null;
      setActiveCategoryId(categoryId);
      persist(resumed.session, categoryId);
      setPhase('interview');
      setSaveState({ status: 'saved', savedAt: resumed.session.updated_at });
    } catch (error) { reportFailure(error); }
  }, [activeCategoryId, catalog, persist, reportFailure, service, session]);

  const updateDraft = useCallback((questionId, value) => {
    setDraftAnswers((current) => ({ ...current, [questionId]: value }));
    setErrors((current) => ({ ...current, [questionId]: [] }));
  }, []);

  const commitAnswer = useCallback(async (questionId, explicitValue) => {
    if (!session) return { ok: false };
    const localValue = explicitValue === undefined ? draftAnswers[questionId] : explicitValue;
    const normalizedValue = persistenceValue(localValue);
    const candidateAnswers = { ...session.answers, [questionId]: normalizedValue };
    const sequence = ++savingSequence.current;
    try {
      setSaveState({ status: 'saving', savedAt: null });
      const inspection = await service.inspect(candidateAnswers);
      const validationErrors = (inspection.answer_validation.errors || []).filter((message) => message.startsWith(questionId));
      if (validationErrors.length) {
        if (sequence === savingSequence.current) {
          setErrors((current) => ({ ...current, [questionId]: validationErrors }));
          setSaveState({ status: 'error', savedAt: null });
        }
        return { ok: false, errors: validationErrors };
      }
      const saved = await service.save(session, { [questionId]: normalizedValue }, nowIso(), activeCategoryId);
      if (sequence !== savingSequence.current) return { ok: true, session: saved.session };
      persist(saved.session, activeCategoryId);
      setErrors((current) => ({ ...current, [questionId]: [] }));
      setSaveState({ status: 'saved', savedAt: saved.session.updated_at });
      return { ok: true, session: saved.session, inactiveAnswersRemoved: saved.inactive_answers_removed };
    } catch (error) { return reportFailure(error); }
  }, [activeCategoryId, draftAnswers, persist, reportFailure, service, session]);

  const commitCategory = useCallback(async (categoryId) => {
    try {
      const questions = categoryQuestions(catalog, session, categoryId);
      let workingSession = session;
      for (const question of questions) {
        if (!sameAnswer(draftAnswers[question.id], workingSession.answers[question.id])) {
          const normalizedValue = persistenceValue(draftAnswers[question.id]);
          const candidateAnswers = { ...workingSession.answers, [question.id]: normalizedValue };
          const inspection = await service.inspect(candidateAnswers);
          const validationErrors = (inspection.answer_validation.errors || []).filter((message) => message.startsWith(question.id));
          if (validationErrors.length) {
            setErrors((current) => ({ ...current, [question.id]: validationErrors }));
            setSaveState({ status: 'error', savedAt: null });
            return { ok: false, errors: validationErrors };
          }
          const saved = await service.save(workingSession, { [question.id]: normalizedValue }, nowIso(), activeCategoryId);
          workingSession = saved.session;
          persist(workingSession, activeCategoryId);
          setSaveState({ status: 'saved', savedAt: workingSession.updated_at });
        }
      }
      const validation = await service.validate(workingSession.answers, true);
      const currentIds = new Set(questions.map((question) => question.id));
      const currentErrors = (validation.errors || []).filter((message) => currentIds.has(message.split(/[ .:]/, 1)[0]));
      if (currentErrors.length) {
        setErrors((current) => ({ ...current, ...errorMap(currentErrors) }));
        return { ok: false, errors: currentErrors };
      }
      return { ok: true };
    } catch (error) { return reportFailure(error); }
  }, [activeCategoryId, catalog, draftAnswers, persist, service, session]);

  const moveTo = useCallback((categoryId) => {
    setActiveCategoryId(categoryId);
    if (session) void service.savePosition?.(session, categoryId);
    window.scrollTo?.({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [service, session]);

  const previous = useCallback(() => {
    const index = catalog.categories.findIndex((category) => category.id === activeCategoryId);
    if (index > 0) moveTo(catalog.categories[index - 1].id);
  }, [activeCategoryId, catalog, moveTo]);

  const showSummary = useCallback(async () => {
    if (!session) return { ok: false };
    try {
      const validation = await service.validate(session.answers, true);
      if (!validation.valid) {
        setErrors(errorMap(validation.errors));
        return { ok: false, errors: validation.errors };
      }
      const preview = await service.preview(session);
      setSummaryPreview(preview);
      setPhase('summary');
      window.scrollTo?.({ top: 0, behavior: 'auto' });
      return { ok: true };
    } catch (error) { return reportFailure(error); }
  }, [reportFailure, service, session]);

  const next = useCallback(async () => {
    const validation = await commitCategory(activeCategoryId);
    if (!validation.ok) return validation;
    const index = catalog.categories.findIndex((category) => category.id === activeCategoryId);
    const following = catalog.categories[index + 1];
    if (following) {
      moveTo(following.id);
      return { ok: true };
    }
    return showSummary();
  }, [activeCategoryId, catalog, commitCategory, moveTo, showSummary]);

  const confirm = useCallback(async () => {
    if (!session) return { ok: false };
    try {
      const completed = await service.complete(session, nowIso());
      setSession(completed.session);
      setDraftAnswers(completed.session.answers || {});
      setSummaryPreview({ summary: completed.summary, profile: completed.profile, mappings: completed.mappings });
      service.clearPersisted();
      setPhase('completed');
      setSaveState({ status: 'saved', savedAt: completed.session.updated_at });
      return { ok: true };
    } catch (error) { return reportFailure(error); }
  }, [reportFailure, service, session]);

  const cancel = useCallback(async () => {
    if (!session) return { ok: true };
    try {
      await service.abandon(session, nowIso());
      service.clearPersisted();
      setSession(null);
      setDraftAnswers({});
      setSummaryPreview(null);
      setPhase('welcome');
      return { ok: true };
    } catch (error) { return reportFailure(error); }
  }, [reportFailure, service, session]);

  const restart = useCallback(() => {
    service.clearPersisted();
    setSession(null);
    setDraftAnswers({});
    setSummaryPreview(null);
    setErrors({});
    setPhase('welcome');
  }, [service]);

  const metrics = useMemo(() => {
    const total = session?.visible_question_ids?.length || 0;
    const answered = (session?.visible_question_ids || []).filter((questionId) => {
      const value = session.answers[questionId];
      return value !== null && value !== undefined && value !== '';
    }).length;
    const categoryIndex = Math.max(0, catalog?.categories.findIndex((category) => category.id === activeCategoryId) ?? 0);
    return { totalQuestions: total, answeredQuestions: answered, percent: total ? Math.round((answered / total) * 100) : 0, step: categoryIndex + 1, totalSteps: (catalog?.categories.length || 0) + 1 };
  }, [activeCategoryId, catalog, session]);

  return {
    catalog, session, draftAnswers, activeCategoryId, phase, summaryPreview, saveState, errors, globalError, metrics,
    start, resume, updateDraft, commitAnswer, next, previous, moveTo, showSummary, confirm, cancel, restart, setPhase, setGlobalError
  };
}
