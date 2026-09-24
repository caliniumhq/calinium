import { useEffect, useRef, useState } from 'react';
import { t } from '../../lib/i18n';
import { ConversationBubble, ThinkingIndicator } from './ConversationBubble';

export function ConversationScreen({ session, onRespond, pending, compact = false, replyAllowed = true, messageId = 'creative-director-message', submitLabel = null }) {
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState(null);
  const end = useRef(null);
  const messages = useRef(null);
  const mounted = useRef(false);
  const previousTranscriptLength = useRef(session.transcript.length);
  useEffect(() => {
    const transcriptLength = session.transcript.length;
    const shouldScroll = mounted.current
      ? pending || transcriptLength > previousTranscriptLength.current
      : pending || transcriptLength > 1;
    mounted.current = true;
    previousTranscriptLength.current = transcriptLength;
    if (shouldScroll && compact && messages.current) {
      messages.current.scrollTop = messages.current.scrollHeight;
    } else if (shouldScroll && typeof end.current?.scrollIntoView === 'function') {
      end.current.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'end' });
    }
  }, [pending, session.transcript.length]);
  const submit = async (event) => {
    event.preventDefault();
    const value = message.trim();
    if (!value || pending || !replyAllowed) return;
    setSubmitError(null);
    setMessage('');
    const result = await onRespond(value);
    if (!result) {
      setMessage(value);
      setSubmitError('I couldn’t save that answer yet. Your text is still here so you can retry.');
    }
  };
  const titleId = compact ? 'quick-start-conversation-title' : 'conversation-title';
  return <section className={`conversation-screen${compact ? ' conversation-screen--compact' : ''}`} aria-labelledby={titleId}>
    <div className={compact ? 'quick-start-panel__heading' : 'cd-stage-intro'}><p className="eyebrow">{compact ? 'Conversation' : t('creative_director.conversation.eyebrow')}</p>{compact ? <h2 id={titleId}>Shape your storefront with Calinium.</h2> : <h1 id={titleId}>{t('creative_director.conversation.title')}</h1>}<p>{compact ? 'Your saved conversation stays visible while you review the direction.' : t('creative_director.conversation.description')}</p></div>
    <div className="conversation-screen__messages" ref={messages} role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation history">
      {session.transcript.map((entry) => <ConversationBubble key={entry.id} message={entry} />)}
      {pending && <ThinkingIndicator />}
      <span ref={end} />
    </div>
    {replyAllowed ? <form className="conversation-composer" onSubmit={submit}>
      <label className="visually-hidden" htmlFor={messageId}>{t('creative_director.conversation.message_label')}</label>
      <textarea id={messageId} value={message} onChange={(event) => setMessage(event.target.value)} disabled={pending} rows="2" placeholder={t('creative_director.conversation.placeholder')} />
      {submitError && <p className="form-error conversation-composer__error" role="alert">{submitError}</p>}
      <div><button className="text-button" type="button" disabled={pending} onClick={() => setMessage(t('creative_director.conversation.unknown'))}>{t('creative_director.conversation.unknown')}</button><button className="text-button" type="button" disabled={pending} onClick={() => setMessage(t('creative_director.conversation.decide'))}>{t('creative_director.conversation.decide')}</button><button className="button button--primary" type="submit" disabled={!message.trim() || pending}>{submitLabel || t('creative_director.actions.continue')}</button></div>
    </form> : <p className="conversation-screen__paused" role="status">Your conversation is saved. Use Review for the current decision, or open Advanced to inspect the detailed workflow.</p>}
  </section>;
}
