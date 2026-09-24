import { useEffect, useRef } from 'react';

export function ConfirmationDialog({ open, title, description, confirmLabel, dismissLabel, onConfirm, onDismiss, destructive = false }) {
  const confirmRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss, open]);
  if (!open) return null;
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onDismiss(); }}><section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description"><h2 id="confirmation-title">{title}</h2><p id="confirmation-description">{description}</p><div><button type="button" className="button button--quiet" onClick={onDismiss}>{dismissLabel}</button><button ref={confirmRef} type="button" className={`button ${destructive ? 'button--danger-solid' : 'button--primary'}`} onClick={onConfirm}>{confirmLabel}</button></div></section></div>;
}
