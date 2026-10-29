import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// One HTML entry per page. Each page has its own module in src/pages/; the
// shared chrome (nav, sprite, skin, footer) comes from src/site.js.
const pages = {
  index: 'index.html',
  planets: 'setting/planets.html',
  distance: 'setting/distance.html',
  clustering: 'insights/clustering.html',
  probability: 'insights/probability.html',
  search: 'search/how.html',
  alternatives: 'search/alternatives.html',
  timeline: 'search/timeline.html',
  future: 'search/future.html',
  credits: 'credits.html',
}

export default defineConfig({
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, resolve(__dirname, p)])),
    },
  },
})
