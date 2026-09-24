import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

Object.defineProperty(window, 'scrollTo', { value: () => {}, writable: true });
Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }), writable: true });

afterEach(() => {
  cleanup();
  document.body.focus();
});
