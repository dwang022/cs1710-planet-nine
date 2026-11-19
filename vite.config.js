import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { pollMiddleware } from './server/poll.mjs'

// One HTML entry per page. Each page has its own module in src/pages/; the
// shared chrome (nav, sprite, skin, footer) comes from src/site.js.
const pages = {
  index: 'index.html',
  planets: 'setting/planets.html',
  distance: 'setting/distance.html',
  data: 'setting/data.html',
  clustering: 'insights/clustering.html',
  probability: 'insights/probability.html',
  alternatives: 'insights/alternatives.html',
  search: 'search/how.html',
  timeline: 'search/timeline.html',
  future: 'search/future.html',
  credits: 'credits.html',
}

// The future page's question keeps its answers in a tiny back end (server/poll.mjs), mounted at /api/poll in both the
// dev and the preview server; `npm run serve` runs it with the built site on its own.
const poll = {
  name: 'poll-api',
  configureServer (server) { server.middlewares.use(pollMiddleware()) },
  configurePreviewServer (server) { server.middlewares.use(pollMiddleware()) },
}

export default defineConfig({
  plugins: [poll],
  server: { port: 5173, open: true },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, resolve(__dirname, p)])),
    },
  },
})
