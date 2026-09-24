import React from 'react';
import { createRoot } from 'react-dom/client';
import { isLaunchPreviewPath } from './app/launch-preview-route';

async function mount() {
  let App;
  if (isLaunchPreviewPath()) {
    ({ LaunchPreviewPage: App } = await import('./components/marketing/LaunchPreviewPage'));
  } else {
    await import('./styles/dashboard.css');
    ({ DashboardApp: App } = await import('./app/DashboardApp'));
  }
  createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
}

void mount();
