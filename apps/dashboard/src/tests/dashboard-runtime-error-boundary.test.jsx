import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardRuntimeErrorBoundary } from '../components/dashboard/DashboardRuntimeErrorBoundary';

function BrokenRoute() {
  throw new Error('test rendering failure');
}

describe('DashboardRuntimeErrorBoundary', () => {
  it('renders a safe visible fallback instead of a blank dashboard', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const preventJsdomError = (event) => event.preventDefault();
    window.addEventListener('error', preventJsdomError);
    try {
      render(<DashboardRuntimeErrorBoundary><BrokenRoute /></DashboardRuntimeErrorBoundary>);
      expect(screen.getByRole('alert')).toHaveTextContent('This page could not finish loading.');
      expect(screen.getByRole('button', { name: 'Refresh Calinium' })).toBeVisible();
    } finally {
      window.removeEventListener('error', preventJsdomError);
      consoleError.mockRestore();
    }
  });
});
