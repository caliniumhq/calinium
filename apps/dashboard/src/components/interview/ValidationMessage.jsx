export function ValidationMessage({ messages = [] }) {
  if (!messages.length) return null;
  return <ul className="validation-message" role="alert">{messages.map((message) => <li key={message}>{message}</li>)}</ul>;
}
