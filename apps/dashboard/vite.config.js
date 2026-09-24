import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { viteDashboardIndexTransform } = require('./server/embedded-shell.cjs');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'calinium-embedded-app-shell',
      apply: 'serve',
      transformIndexHtml: viteDashboardIndexTransform(process.env)
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020'
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    css: true
  }
});
