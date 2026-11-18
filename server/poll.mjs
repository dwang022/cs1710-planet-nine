// A very small back end for the future page's question (2026-11-18, asked for): it keeps each visitor's answer and
// returns the totals, so the page can show how readers answered.
//
// No accounts and no personal data. A visitor is a random id their browser makes (kept in localStorage and sent as a
// header; the server also sets it as a cookie), stored only as a salted hash, so one browser answers once. Addresses
// are never stored, and never used to refuse an answer, since many readers share one campus network; a short limit
// held in memory slows a script that tries to answer over and over.
//
// Run it in either of two ways:
//   - inside Vite: `npm run dev` and `npm run preview` mount it at /api/poll (vite.config.js)
//   - on its own:  `npm run serve` serves the built site (dist/) and the API on one port (PORT, default 8080)
// Answers are kept in server/data/poll.json, next to a random salt (both gitignored). A static host such as GitHub
// Pages cannot run it: there the page says the results are unavailable and keeps the reader's answer on their device.
//
//   GET  /api/poll                  → { question, counts: { yes, maybe, no }, total, mine }
//   POST /api/poll { choice }       → the same, after recording the answer (201), or unchanged if this browser has
//                                      already answered (409)
//   DELETE /api/poll                → the same, after withdrawing this browser's answer, so it can answer again (the
//                                      page's Reset); still one answer per browser counted

import { createServer } from 'node:http'
import { readFile, writeFile, rename, mkdir, stat } from 'node:fs/promises'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { dirname, join, extname, resolve, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = join(HERE, 'data')
const STORE = join(DATA, 'poll.json')
const SALT_FILE = join(DATA, 'salt')

/** The questions the page may ask, each with the answers it accepts. */
export const QUESTIONS = { exists: ['yes', 'maybe', 'no'] }
const COOKIE = 'p9voter'
const LIMIT = { posts: 20, windowMs: 10 * 60 * 1000 }      // answers one address may send in ten minutes

let store = null, salt = null, writing = Promise.resolve()
const recent = new Map()                                     // address → recent post times, in memory only

async function load () {
  if (store) return store
  await mkdir(DATA, { recursive: true })
  try { salt = (await readFile(SALT_FILE, 'utf8')).trim() } catch {
    salt = process.env.POLL_SALT || randomBytes(24).toString('hex')
    await writeFile(SALT_FILE, salt)
  }
  try { store = JSON.parse(await readFile(STORE, 'utf8')) } catch { store = { votes: {} } }
  store.votes ||= {}
  return store
}

/** Write the answers to a temporary file, then move it into place, one write at a time. */
function save () {
  writing = writing.then(async () => {
    const tmp = `${STORE}.${process.pid}.tmp`
    await writeFile(tmp, JSON.stringify(store))
    await rename(tmp, STORE)
  }).catch(err => console.error('poll: could not save', err))
  return writing
}

const hash = id => createHash('sha256').update(`${salt}:${id}`).digest('hex').slice(0, 32)
const validId = id => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id)

/** Who is asking: the server's own cookie first (so clearing the page's storage alone does not allow a second answer),
 *  then the id the page sends. */
function voterOf (req) {
  const m = /(?:^|;\s*)p9voter=([A-Za-z0-9-]{8,64})/.exec(req.headers.cookie || '')
  if (m) return m[1]
  const fromHeader = req.headers['x-voter']
  return validId(fromHeader) ? fromHeader : null
}

function results (question, key) {
  const counts = Object.fromEntries(QUESTIONS[question].map(c => [c, 0]))
  for (const v of Object.values(store.votes)) if (v.q === question && v.c in counts) counts[v.c]++
  const total = Object.values(counts).reduce((t, n) => t + n, 0)
  const mine = key && store.votes[`${question}:${key}`]?.c || null
  return { question, counts, total, mine }
}

function send (res, status, body, voter) {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  if (voter) headers['set-cookie'] = `${COOKIE}=${voter}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly`
  const origin = process.env.POLL_ORIGIN
  if (origin) Object.assign(headers, { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-voter', 'access-control-allow-methods': 'GET, POST, DELETE', 'access-control-allow-credentials': 'true' })
  res.writeHead(status, headers)
  res.end(JSON.stringify(body))
}

function readBody (req) {
  return new Promise((ok, fail) => {
    let size = 0, data = ''
    req.on('data', chunk => { size += chunk.length; if (size > 2048) { fail(new Error('too large')); req.destroy() } else data += chunk })
    req.on('end', () => ok(data))
    req.on('error', fail)
  })
}

function tooMany (req) {
  const who = req.socket.remoteAddress || 'unknown', now = Date.now()
  const times = (recent.get(who) || []).filter(t => now - t < LIMIT.windowMs)
  times.push(now)
  recent.set(who, times)
  return times.length > LIMIT.posts
}

/** Handle a request to /api/poll; returns false for any other path, so it can sit in front of other handlers. */
export async function handlePoll (req, res) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname !== '/api/poll') return false
  await load()
  const question = url.searchParams.get('q') || 'exists'
  if (!QUESTIONS[question]) { send(res, 400, { error: 'unknown question' }); return true }
  if (req.method === 'OPTIONS') { send(res, 204, {}); return true }
  let voter = voterOf(req)
  if (req.method === 'GET') { send(res, 200, results(question, voter && hash(voter)), voter); return true }
  if (req.method !== 'POST' && req.method !== 'DELETE') { send(res, 405, { error: 'method' }); return true }
  if (tooMany(req)) { send(res, 429, { error: 'slow down' }); return true }
  if (req.method === 'DELETE') {
    // the page's Reset: this browser's answer withdrawn, so it may answer again
    if (voter && store.votes[`${question}:${hash(voter)}`]) { delete store.votes[`${question}:${hash(voter)}`]; await save() }
    send(res, 200, results(question, voter && hash(voter)), voter)
    return true
  }
  let body
  try { body = JSON.parse((await readBody(req)) || '{}') } catch { send(res, 400, { error: 'bad body' }); return true }
  const choice = body.choice
  if (!QUESTIONS[question].includes(choice)) { send(res, 400, { error: 'unknown answer' }); return true }
  if (!voter) voter = validId(body.voter) ? body.voter : randomUUID()
  const key = `${question}:${hash(voter)}`
  if (store.votes[key]) { send(res, 409, results(question, hash(voter)), voter); return true }
  store.votes[key] = { q: question, c: choice, t: new Date().toISOString().slice(0, 10) }
  await save()
  send(res, 201, results(question, hash(voter)), voter)
  return true
}

/** Connect-style middleware for Vite's dev and preview servers. */
export function pollMiddleware () {
  return (req, res, next) => { handlePoll(req, res).then(done => { if (!done) next() }).catch(err => { console.error(err); next(err) }) }
}

// --- on its own: the built site and the API on one port ---------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' }

async function serveStatic (req, res, root) {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  let file = normalize(join(root, path))
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403); res.end(); return }
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html') } catch {}
  try {
    const data = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' })
    res.end(data)
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found') }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(HERE, '..', 'dist')
  const port = Number(process.env.PORT) || 8080
  createServer((req, res) => {
    handlePoll(req, res).then(done => { if (!done) return serveStatic(req, res, root) })
      .catch(err => { console.error(err); res.writeHead(500); res.end() })
  }).listen(port, () => console.log(`The site and its poll on http://localhost:${port}`))
}
