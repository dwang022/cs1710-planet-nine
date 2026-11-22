// The search, last page (rebuilt 2026-11-18, asked for): what searches are under way and how, when results could
// come, and how the site's readers answer the question it has been building to.
//
//   The head              three beats: the survey's start and planned end (surveys.json) and, between, 2029, when
//                         Batygin et al.'s 2019 review expected the planet, if it exists, to have been found
//   How Rubin searches    four small drawings with a line each (charts/futureart.js)
//   Other searches        three short items with a drawing each.
//   Your verdict          Yes, Maybe or No, sent to the tiny back end (server/poll.mjs), which keeps one answer per
//                         browser; then, for each answer, the readers' share as a bar and under it the papers we read that
//                         give that answer, a square each (papers.json's stance, our reading of each abstract, counted as
//                         the timeline page's debate counts them); pointing at a square names its paper. A browser that has
//                         answered sees the chart at once; Reset withdraws its answer so it can answer again. Where no back
//                         end runs (a static host), the answer is kept on the reader's device and the page says the
//                         readers' totals are unavailable. On GitHub Pages the answers go to a Google Sheet instead,
//                         through a small Apps Script (server/google-sheet-poll.gs), when the build is given its address
//                         (VITE_POLL_URL; .github/workflows/pages.yml reads it from the repository's POLL_URL variable).

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { HOW, OTHER } from '../charts/futureart.js'
import '../scrolly.css'
import '../charts/future.css'

const $ = s => document.querySelector(s)
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const fmt = n => n.toLocaleString('en-US')

/** Scroll entrances (scrolly.css .reveal): readers who ask for less motion get everything shown. */
function revealOnScroll (els) {
  if (reduced() || !('IntersectionObserver' in window)) return
  document.documentElement.classList.add('has-reveal')
  for (const el of els) el.style.transition = 'none'
  for (const el of els) void getComputedStyle(el).opacity
  for (const el of els) el.style.transition = ''
  const enter = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) e.target.classList.add('is-in') }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
  const root = document.documentElement
  const start = () => requestAnimationFrame(() => { for (const el of els) enter.observe(el) })
  if (root.hasAttribute('data-ready')) return start()
  const mo = new MutationObserver(() => { if (root.hasAttribute('data-ready')) { mo.disconnect(); start() } })
  mo.observe(root, { attributes: true, attributeFilter: ['data-ready'] })
}

// --- your verdict: the question, its back end, and the bars ---------------------------------------------------------
const API = `${import.meta.env.BASE_URL}api/poll`
const SHEET = import.meta.env.VITE_POLL_URL || ''
const ORDER = [['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]

/** This browser's own random id (the back end keeps only a salted hash of it), made once and kept. */
function voterId () {
  let id = null
  try { id = localStorage.getItem('p9-voter') } catch {}
  if (!id) {
    id = (crypto.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`)
    try { localStorage.setItem('p9-voter', id) } catch {}
  }
  return id
}
const savedVote = () => { try { return localStorage.getItem('p9-vote') } catch { return null } }
const saveVote = c => { try { localStorage.setItem('p9-vote', c) } catch {} }
const forgetVote = () => { try { localStorage.removeItem('p9-vote') } catch {} }

async function call (method, body) {
  if (SHEET) return callSheet(method, body)
  const res = await fetch(API, {
    method, credentials: 'same-origin',
    headers: { 'x-voter': voterId(), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (![200, 201, 409].includes(res.status)) throw new Error(`poll ${res.status}`)
  return res.json()
}

/** The same three calls to the Google Sheet's Apps Script, which answers with the same shape. Its web app takes no custom
 *  headers or DELETE, so the browser's id rides in the query or the body, and posts are plain text (no preflight). */
async function callSheet (method, body) {
  const voter = voterId()
  const res = method === 'GET'
    ? await fetch(`${SHEET}?voter=${encodeURIComponent(voter)}`)
    : await fetch(SHEET, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(method === 'DELETE' ? { action: 'reset', voter } : { action: 'vote', voter, choice: body.choice }) })
  if (!res.ok) throw new Error(`poll ${res.status}`)
  const r = await res.json()
  if (r.error) throw new Error(`poll ${r.error}`)
  return r
}

/** The papers we read, under the answer each one's stance gives (our reading of each abstract), counted as the timeline
 *  page's debate counts them: another cause with against, so the colours mean the same on both pages. */
const ANSWER_OF = { supports: 'yes', neutral: 'maybe', against: 'no', alternative: 'no' }
const STANCE = { supports: 'For a planet', neutral: 'No side', against: 'Against', alternative: 'Another cause' }
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
/** A paper's summary cut to its first sentence or two, enough to say what it did. */
function gist (text = '') {
  let out = ''
  for (const t of text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text]) { out += t; if (out.length > 70) break }
  return out.trim()
}

function setupVote (papers) {
  const q = $('#vote'), submit = q.querySelector('.cq-submit'), chart = $('#voteChart'), tip = $('#paperTip')
  const host = q.querySelector('.fx-results')
  const list = papers.papers, N = list.length
  let choice = null

  /** For each answer, the readers' share (a bar) and the papers that give it (a square each, so the squares' length is
   *  the papers' share on the same scale), the reader's own answer marked. */
  function draw (r, mine) {
    const total = r ? r.total : 0
    chart.innerHTML = ORDER.map(([k, name]) => {
      const g = `fx-g-${k}`
      const rpc = total ? Math.round(100 * (r.counts[k] || 0) / total) : null
      const these = list.map((p, i) => ({ p, i })).filter(({ p }) => ANSWER_OF[p.stance] === k)
      return `<span class="fx-ans ${g}">${name}${k === mine ? '<small>you</small>' : ''}</span>
        <span class="fx-who">readers</span>
        <span class="fx-bar ${g}">${rpc != null ? `<span class="fx-fill" style="--w:${rpc}%"></span>` : ''}</span>
        <span class="fx-pc">${rpc != null ? `${rpc}%` : '—'}</span>
        <span class="fx-who">papers</span>
        <span class="fx-units ${g}" style="--n:${N}">${these.map(({ p, i }, j) =>
          `<button type="button" class="fx-unit" data-i="${i}" style="--j:${j}" aria-label="${esc(p.label)}, ${STANCE[p.stance].toLowerCase()}"></button>`).join('')}</span>
        <span class="fx-pc is-papers">${Math.round(100 * these.length / N)}%</span>`
    }).join('<span class="fx-sep" aria-hidden="true"></span>')
    $('#voteNote').textContent = total ? `${fmt(total)} ${total === 1 ? 'reader has' : 'readers have'} answered` : 'Thanks. The readers’ totals are unavailable right now.'
  }

  // pointing at (or tapping, or tabbing to) a square names its paper in a small card under it
  let on = null
  function showTip (btn) {
    if (on === btn) return
    hideTip()
    const p = list[+btn.dataset.i]
    tip.innerHTML = `<b>${esc(p.label)}</b><span class="fx-tip-side fx-g-${ANSWER_OF[p.stance]}">${STANCE[p.stance]}</span>${esc(gist(p.summary))}`
    tip.hidden = false
    const hb = host.getBoundingClientRect(), bb = btn.getBoundingClientRect(), tw = tip.offsetWidth
    tip.style.left = `${Math.max(0, Math.min(hb.width - tw, bb.left + bb.width / 2 - hb.left - tw / 2))}px`
    tip.style.top = `${bb.bottom - hb.top + 8}px`
    btn.classList.add('is-on'); on = btn
  }
  function hideTip () { tip.hidden = true; on?.classList.remove('is-on'); on = null }
  chart.addEventListener('pointerover', e => { const b = e.target.closest('.fx-unit'); if (b) showTip(b) })
  chart.addEventListener('pointerout', e => { if (e.target.closest('.fx-unit') && !e.relatedTarget?.closest?.('.fx-unit')) hideTip() })
  chart.addEventListener('click', e => { const b = e.target.closest('.fx-unit'); if (b) showTip(b) })
  chart.addEventListener('focusin', e => { const b = e.target.closest('.fx-unit'); if (b) showTip(b) })
  chart.addEventListener('focusout', hideTip)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip() })

  function showResults (r, mine) {
    draw(r, mine)
    q.classList.add('is-submitted')
    q.querySelector('.cq-ask').inert = true
    requestAnimationFrame(() => q.classList.add('is-drawn'))
  }
  /** Back to the question, nothing chosen. */
  function ask () {
    choice = null
    hideTip()
    q.classList.remove('is-submitted', 'is-drawn')
    q.querySelector('.cq-ask').inert = false
    q.querySelectorAll('.fv-pl').forEach(x => x.setAttribute('aria-pressed', 'false'))
    submit.disabled = true
    q.querySelector('.fv-pl')?.focus({ preventScroll: true })
  }

  q.querySelector('.fv-choices').addEventListener('click', e => {
    const b = e.target.closest('.fv-pl'); if (!b) return
    choice = b.dataset.answer
    q.querySelectorAll('.fv-pl').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    submit.disabled = false
  })
  submit.addEventListener('click', async () => {
    if (!choice) return
    submit.disabled = true
    saveVote(choice)
    let r = null
    try { r = await call('POST', { choice, voter: voterId() }) } catch {}
    showResults(r, r?.mine || choice)
    host.focus({ preventScroll: true })
  })
  // Reset: this browser's answer withdrawn, so it can answer again (2026-11-18, asked for)
  $('#voteReset').addEventListener('click', async () => {
    forgetVote()
    try { await call('DELETE') } catch {}
    ask()
  })

  // a browser that has answered sees the chart at once
  const local = savedVote()
  call('GET').then(r => {
    if (r.mine) { saveVote(r.mine); showResults(r, r.mine) } else if (local) showResults(r, local)
  }).catch(() => { if (local) showResults(null, local) })
}

async function main () {
  revealOnScroll([$('#vote')])
  // the drawings
  document.querySelectorAll('.fx-pic[data-art]').forEach(el => { el.innerHTML = (HOW[el.dataset.art] || OTHER[el.dataset.art])?.() || '' })
  const { surveys: sv, papers } = await loadData('surveys', 'papers')
  const [start, end] = sv.surveys.find(s => s.id === 'lsst').years
  // the survey's start and planned end
  const nums = { lsstStart: start, lsstEnd: end }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
  setupVote(papers)
}

main().catch(showLoadError)
