import { t } from '../../lib/i18n';

export function ConversationBubble({ message }) {
  const isCalinium = message.role === 'calinium';
  return <article className={`conversation-bubble conversation-bubble--${isCalinium ? 'calinium' : 'merchant'}`}>
    <p className="conversation-bubble__name">{isCalinium ? t('creative_director.conversation.calinium') : t('creative_director.conversation.you')}</p>
    <p>{message.content}</p>
  </article>;
}

export function ThinkingIndicator() {
  return <div className="thinking-indicator" role="status" aria-label={t('creative_director.conversation.thinking')}>
    <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
    <span className="visually-hidden">{t('creative_director.conversation.thinking')}</span>
  </div>;
}
