import { useEffect, useMemo, useRef, useState } from 'react';
import { CompletionScreen } from '../components/interview/CompletionScreen';
import { ConfirmationDialog } from '../components/interview/ConfirmationDialog';
import { NavigationFooter } from '../components/interview/NavigationFooter';
import { QuestionCard } from '../components/interview/QuestionCard';
import { QuestionRenderer } from '../components/interview/QuestionRenderer';
import { ProfilePreview, SummaryCard } from '../components/interview/SummaryCard';
import { ValidationMessage } from '../components/interview/ValidationMessage';
import { WelcomeScreen } from '../components/interview/WelcomeScreen';
import { useInterviewSession } from '../hooks/use-interview-session';
import { t } from '../lib/i18n';
import { InterviewLayout } from '../layouts/InterviewLayout';

function activeCategory({ catalog, session, activeCategoryId }) {
  const visible = new Set(session.visible_question_ids);
  const category = catalog.categories.find((item) => item.id === activeCategoryId);
  return { category, questions: catalog.questions.filter((question) => question.category_id === activeCategoryId && visible.has(question.id)) };
}

export function InterviewApp({ service, onExit, onCompleted }) {
  const interview = useInterviewSession({ service });
  const [dialog, setDialog] = useState(null);
  const [stepError, setStepError] = useState([]);
  const stepHeading = useRef(null);
  const active = useMemo(() => interview.catalog && interview.session ? activeCategory({ catalog: interview.catalog, session: interview.session, activeCategoryId: interview.activeCategoryId }) : { category: null, questions: [] }, [interview.activeCategoryId, interview.catalog, interview.session]);

  useEffect(() => { if (interview.phase === 'interview') stepHeading.current?.focus(); }, [interview.activeCategoryId, interview.phase]);
  if (!interview.catalog) return <main className="app-loading" aria-busy="true"><p>{t('app.loading')}</p>{interview.globalError && <><p role="alert">{interview.globalError}</p><button type="button" className="button button--quiet" onClick={() => window.location.reload()}>{t('app.retry')}</button></>}</main>;
  if (interview.phase === 'welcome') return <WelcomeScreen hasSavedSession={Boolean(interview.session)} onStart={interview.start} onResume={interview.resume} onExit={onExit} />;
  if (interview.phase === 'completed') return <CompletionScreen profile={interview.summaryPreview?.profile || interview.session?.merchant_profile} onRestart={interview.restart} onComplete={onCompleted || onExit} />;

  const selectCategory = async (categoryId) => {
    setStepError([]);
    if (categoryId === 'summary') { const outcome = await interview.showSummary(); if (!outcome.ok) setStepError([t('validation.summary_incomplete')]); return; }
    const currentIndex = interview.catalog.categories.findIndex((category) => category.id === interview.activeCategoryId);
    const targetIndex = interview.catalog.categories.findIndex((category) => category.id === categoryId);
    if (targetIndex > currentIndex) { const outcome = await interview.next(); if (!outcome?.ok) setStepError([t('validation.step_incomplete')]); return; }
    interview.moveTo(categoryId);
    interview.setPhase('interview');
  };
  const handleNext = async () => { setStepError([]); const result = await interview.next(); if (!result?.ok) setStepError([t('validation.step_incomplete')]); };
  const handleSkip = () => { const index = interview.catalog.categories.findIndex((category) => category.id === interview.activeCategoryId); const following = interview.catalog.categories[index + 1]; if (following) interview.moveTo(following.id); else interview.showSummary().then((outcome) => { if (!outcome.ok) setStepError([t('validation.summary_incomplete')]); }); };
  const currentIndex = interview.catalog.categories.findIndex((category) => category.id === interview.activeCategoryId);
  const isLast = currentIndex === interview.catalog.categories.length - 1;
  const canSkip = active.questions.length > 0 && active.questions.every((question) => !question.required);

  return <InterviewLayout catalog={interview.catalog} activeCategoryId={interview.activeCategoryId} phase={interview.phase} metrics={interview.metrics} saveState={interview.saveState} onCategorySelect={selectCategory} onExit={onExit}>
    {interview.globalError && <p className="global-error" role="alert">{interview.globalError}</p>}
    {interview.phase === 'summary'
      ? <section className="summary-screen" aria-labelledby="summary-heading"><p className="eyebrow">{t('summary.eyebrow')}</p><h1 id="summary-heading">{t('summary.title')}</h1><p>{t('summary.description')}</p><ValidationMessage messages={stepError} /><ProfilePreview profile={interview.summaryPreview?.profile} />{interview.summaryPreview?.summary?.categories.map((category) => <SummaryCard key={category.id} category={category} onEdit={selectCategory} />)}<div className="summary-screen__actions"><button type="button" className="button button--quiet" onClick={() => selectCategory(interview.catalog.categories[interview.catalog.categories.length - 1].id)}>{t('navigation.back_to_interview')}</button><button type="button" className="button button--primary" onClick={() => setDialog('confirm')}>{t('summary.confirm')}</button></div></section>
      : <section className="question-step" aria-labelledby="step-heading"><p className="eyebrow">{active.category?.title}</p><h1 ref={stepHeading} id="step-heading" tabIndex="-1">{active.category?.description}</h1><ValidationMessage messages={stepError} />{active.questions.map((question) => <QuestionCard key={question.id} question={question} errors={interview.errors[question.id] || []}><QuestionRenderer question={question} answer={interview.draftAnswers[question.id]} answers={interview.draftAnswers} assetService={service} onDraftChange={interview.updateDraft} onCommit={interview.commitAnswer} /></QuestionCard>)}<NavigationFooter isFirst={currentIndex === 0} isLast={isLast} canSkip={canSkip} onPrevious={interview.previous} onNext={handleNext} onSkip={handleSkip} onSaveExit={onExit || (() => interview.setPhase('welcome'))} onCancel={() => setDialog('cancel')} /></section>}
    <ConfirmationDialog open={dialog === 'confirm'} title={t('summary.confirmation_title')} description={t('summary.confirmation_description')} confirmLabel={t('summary.confirm_action')} dismissLabel={t('summary.dismiss')} onDismiss={() => setDialog(null)} onConfirm={async () => { const result = await interview.confirm(); if (result.ok) setDialog(null); }} />
    <ConfirmationDialog open={dialog === 'cancel'} title={t('cancel.title')} description={t('cancel.description')} confirmLabel={t('cancel.confirm')} dismissLabel={t('cancel.dismiss')} destructive onDismiss={() => setDialog(null)} onConfirm={async () => { const result = await interview.cancel(); if (result.ok) setDialog(null); }} />
  </InterviewLayout>;
}
