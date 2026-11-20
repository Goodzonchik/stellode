import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../dist/apps/frontend'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@stellode/models': path.resolve(__dirname, '../../libs/models/src/index.ts'),
    },
  },
});
