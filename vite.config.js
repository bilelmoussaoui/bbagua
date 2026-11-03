import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths, so the build works under any GitHub Pages sub-path
  base: './',
  build: { chunkSizeWarningLimit: 900 },
});
