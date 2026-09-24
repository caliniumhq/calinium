import { Component } from 'react';
import { t } from '../../lib/i18n';

// A route-level boundary keeps an unexpected client rendering failure from
// becoming a blank embedded Shopify frame. It deliberately does not render
// the original error because runtime details can contain internal information.
export class DashboardRuntimeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  retry = () => {
    this.setState({ failed: false });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-runtime-fallback" role="alert" aria-live="assertive">
      <section className="app-runtime-fallback__content">
        <p className="eyebrow">{t('app.runtime_error_eyebrow')}</p>
        <h1>{t('app.runtime_error_title')}</h1>
        <p>{t('app.runtime_error_description')}</p>
        <button className="button button--primary" type="button" onClick={this.retry}>{t('app.runtime_error_retry')}</button>
      </section>
    </main>;
  }
}
