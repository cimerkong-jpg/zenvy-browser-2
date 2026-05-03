import { defineConfig } from 'vite';

// Để Electron Forge tự quản lý build process
export default defineConfig({
  build: {
    rollupOptions: {
      // Only mark Node.js built-ins and native modules as external
      // uuid should be bundled
      external: ['electron', 'path', 'fs', 'child_process', 'better-sqlite3']
    }
  }
});
