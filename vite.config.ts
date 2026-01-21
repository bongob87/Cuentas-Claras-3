import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// We removed 'loadEnv' and the 'define' block because they cause crashes in production.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
