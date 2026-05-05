import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      // Externalize everything that is not a relative or absolute local path.
      // This ensures all node_modules (including puppeteer) are required at runtime
      // by Node.js instead of being bundled by Vite/Rollup.
      external: (id: string) =>
        !id.startsWith('.') && !id.startsWith('/') && !id.startsWith('\0')
    }
  }
})
