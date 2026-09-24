import { useRef, useState } from 'react';
import { QuestionRenderer } from '../interview/QuestionRenderer';

export function MerchantFlowStatus({ result, pending, onAnswer, onResume, compact = false }) {
  const flow = result?.flow || null;
  const [answer, setAnswer] = useState('');
  const [resumePending, setResumePending] = useState(false);
  const resumeInFlight = useRef(null);
  if (!flow) return null;
  const status = flow.merchant_status || { label: 'Preparing your storefront', message: null };
  const question = flow.state === 'awaiting_material_answer' ? flow.question : null;
  const submit = () => answer && onAnswer(flow.flow_id, question.question_id, answer, flow.flow_checksum);
  const resume = async () => {
    const action = `${flow.flow_id}:${flow.flow_checksum}`;
    if (resumeInFlight.current) return resumeInFlight.current.promise;
    setResumePending(true);
    const promise = Promise.resolve(onResume(flow.flow_id, flow.flow_checksum, flow.sequence))
      .finally(() => {
        if (resumeInFlight.current?.action === action) resumeInFlight.current = null;
        setResumePending(false);
      });
    resumeInFlight.current = { action, promise };
    return promise;
  };
  const questionInput = question ? { id: question.question_id, title: question.prompt, answer_type: 'single_choice', options: question.choices } : null;
  return <section className={`merchant-flow-status${compact ? ' merchant-flow-status--compact' : ''}`} aria-label="Storefront preparation" data-flow-state={flow.state}>
    <p className="eyebrow">Storefront preparation</p>
    <h3>{status.label}</h3>
    {status.message && <p className={flow.failure ? 'form-error' : ''} role={flow.failure ? 'alert' : undefined}>{status.message}</p>}
    {question && <div className="merchant-flow-question">
      <p>{question.prompt}</p>
      <QuestionRenderer question={questionInput} answer={answer} onDraftChange={(_id, value) => setAnswer(value)} onCommit={() => {}} />
      <button className="button button--primary button--compact" type="button" disabled={pending || !answer} onClick={submit}>{pending ? 'Saving…' : 'Continue'}</button>
    </div>}
    {status.retry_available && <button className="button button--quiet button--compact" type="button" disabled={pending || resumePending} onClick={resume}>{pending || resumePending ? 'Retrying…' : 'Try again'}</button>}
    {status.human_review_required && <p role="status">A founder/admin review is required. Your saved flow will continue after that review is recorded.</p>}
    {flow.preview_ready && <p role="status">Your reviewed storefront is available through the existing preview and download controls. Nothing has been published.</p>}
  </section>;
}
