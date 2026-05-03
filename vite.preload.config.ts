import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    rollupOptions: {
      external: ['electron'],
      output: {
        entryFileNames: 'preload.js'
      }
    }
  }
});
