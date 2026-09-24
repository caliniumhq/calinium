import { OperatorReadinessDiagnostics } from './OperatorReadinessDiagnostics';

export function ProtectedOperatorDiagnosticsHost({ placement, onCheck, onRefresh, onRecoverQa, onSubmitQa, onRecoverPreviewProvenance, onSucceedRenderTarget }) {
  return <aside className={`protected-operator-diagnostics-host protected-operator-diagnostics-host--${placement}`} aria-label="Operator controls" data-operator-diagnostics-host={placement}>
    <OperatorReadinessDiagnostics available onCheck={onCheck} onRefresh={onRefresh} onRecoverQa={onRecoverQa} onSubmitQa={onSubmitQa} onRecoverPreviewProvenance={onRecoverPreviewProvenance} onSucceedRenderTarget={onSucceedRenderTarget} />
  </aside>;
}
