import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// Separate app from the main site: its own deps, its own port, its own data
// copy. Run both at once — main site on 5173, prototypes on 5174.
export default defineConfig({
  server: { port: 5174, open: true },
  build: {
    rollupOptions: {
      input: {
        index: resolve(process.cwd(), 'index.html'),
        a: resolve(process.cwd(), 'a.html'),
        b: resolve(process.cwd(), 'b.html'),
      },
    },
  },
})
