// Sketch RL5 — who supports it. The argument as a ledger: one full-width row
// per paper, year by year, the year riding in a gutter on the left.
//
// Each row is one claim: a title that says what the paper did to the question,
// one line of context, a small drawing of the point, and a link. The lane is
// said three ways at once: colour, icon, and which edge the drawing and the
// accent sit on (arguments for a planet open from the left, arguments against
// one from the right, data and searches are boxed and centred). A data row
// that ends in a conclusion grows a branch beneath it, in that side's colour.
//
// Content comes from field_timeline.json; titles, journals, citation counts
// and links come from papers.json by DOI, so the two files cannot disagree.

import '../field.css'
import { diagram, icon } from './fieldart.js'

const LANE = {
  for: { word: 'For a planet', cls: 'is-for', icon: 'planet' },
  against: { word: 'Against a planet', cls: 'is-against', icon: 'noplanet' },
  data: { word: 'Data and searches', cls: 'is-data', icon: 'object' },
  next: { word: 'What comes next', cls: 'is-next', icon: 'next' },
}
// what the row's icon says, when the lane alone would be too coarse
const KIND_ICON = {
  object: 'object', search: 'search', limit: 'search', constraint: 'constraint',
  candidate: 'candidate', survey: 'survey', bias: 'noplanet', alt: 'noplanet',
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function paperLink (p) {
  if (!p) return ''
  const href = p.arxiv_url || p.url
  const journal = (p.journal || '').replace(/&amp;/g, '&')
  return `<a href="${esc(href)}" rel="noopener">${esc(p.label)}${journal ? ' · ' + esc(journal) : ''}</a>`
}

function links (e, byDoi) {
  const out = []
  if (e.doi) out.push(paperLink(byDoi.get(e.doi)))
  for (const d of e.also || []) out.push(paperLink(byDoi.get(d)))
  for (const l of e.links || []) out.push(`<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
  const p = e.doi && byDoi.get(e.doi)
  if (p && p.citations_crossref != null) out.push(`<span>${p.citations_crossref} citations</span>`)
  return out.filter(Boolean).join('<span class="fr-sep">·</span>')
}

const avatars = e => (e.photos || []).filter(p => p.src).map(p =>
  `<img class="fr-avatar" src="${esc(p.src)}" alt="" width="240" height="240" loading="lazy" decoding="async" title="${esc(p.alt)} — ${esc(p.credit)} (${esc(p.license)})">`).join('')

function bar (e) {
  const x = e.excluded
  if (!x) return ''
  return `<div class="fr-bar" role="img" aria-label="${x.pct}% ${esc(x.text)}">
    <i class="fr-bar-track"><b style="width:${x.pct}%"></b></i><span><strong>${x.pct}%</strong> ${esc(x.text)}</span>
  </div>`
}

function row (e, byDoi) {
  const lane = LANE[e.lane]
  const b = e.branch && LANE[e.branch.side]
  const foot = links(e, byDoi)
  return `<article class="fr ${lane.cls}${e.key ? ' is-key' : ''}" data-id="${esc(e.id)}" data-kind="${esc(e.kind || '')}">
    <div class="fr-icon" title="${esc(lane.word)}">${icon(KIND_ICON[e.kind] || lane.icon)}</div>
    <div class="fr-body">
      <h4 class="fr-title">${esc(e.title)}</h4>
      <p class="fr-line">${avatars(e)}${esc(e.line)}</p>
      ${bar(e)}
      ${foot ? `<div class="fr-foot">${foot}</div>` : ''}
    </div>
    <div class="fr-art">${e.diagram ? diagram(e.diagram, e.id) : ''}</div>
    ${b ? `<div class="fr-branch ${b.cls}" aria-label="${esc(b.word)}">
      <span class="fr-turn" aria-hidden="true">↳</span>
      <span class="fr-bicon">${icon(b.icon)}</span>
      <p>${esc(e.branch.text)}</p>
    </div>` : ''}
  </article>`
}

function credits (entries) {
  const seen = new Map()
  for (const e of entries) for (const p of e.photos || []) if (p.src && !seen.has(p.src)) seen.set(p.src, p)
  if (!seen.size) return ''
  const rows = [...seen.values()].map(p =>
    `<li>${esc(p.alt)} — ${esc(p.credit)} · ${p.license_url ? `<a href="${esc(p.license_url)}" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}${p.source ? ` · <a href="${esc(p.source)}" rel="noopener">source</a>` : ''}</li>`)
  return `<details class="fl-credits"><summary>Portrait credits (${rows.length}, Wikimedia Commons)</summary><ul>${rows.join('')}</ul></details>`
}

function legend () {
  return [
    ['is-for', 'planet', 'For a planet'],
    ['is-against', 'noplanet', 'Against a planet'],
    ['is-data', 'object', 'Data and searches'],
    ['is-next', 'next', 'What comes next'],
  ].map(([cls, ic, word]) => `<div class="legend-item ${cls}"><span class="fr-icon">${icon(ic)}</span>${word}</div>`).join('') +
    `<div class="legend-item is-muted">Larger rows: the papers the field answers to</div>`
}

export function drawField (root, { timeline, papers, legend: legendEl }) {
  root.__field?.destroy()
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const dated = timeline.entries.filter(e => e.lane !== 'next')
    .sort((a, b) => a.year - b.year || a.order - b.order)
  const future = timeline.entries.filter(e => e.lane === 'next').sort((a, b) => a.order - b.order)

  const years = []
  for (const e of dated) {
    const y = years[years.length - 1]
    if (y && y.year === e.year) y.entries.push(e)
    else years.push({ year: e.year, entries: [e] })
  }

  const group = (label, entries, cls = '') => `
    <div class="fy ${cls}">
      <div class="fy-year"><span>${label}</span></div>
      <div class="fy-rows">${entries.map(e => row(e, byDoi)).join('')}</div>
    </div>`

  root.innerHTML = years.map(y => group(y.year, y.entries)).join('') +
    group('Next', future, 'fy-next') + credits(timeline.entries)
  if (legendEl) legendEl.innerHTML = legend()

  // --- entrance: each row comes in from its own side, a branch rises after it
  // Scoped to html.has-reveal (set by initReveals in scrolly.js), so with
  // reduced motion or without JS the rows are simply there.
  const rows = [...root.querySelectorAll('.fr')]
  let enter = null, leave = null
  if (document.documentElement.classList.contains('has-reveal') && 'IntersectionObserver' in window) {
    enter = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) e.target.classList.add('is-in')
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
    leave = new IntersectionObserver(es => {
      for (const e of es) if (!e.isIntersecting) e.target.classList.remove('is-in')
    }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })
    rows.forEach(r => { enter.observe(r); leave.observe(r) })
  } else {
    rows.forEach(r => r.classList.add('is-in'))
  }

  root.__field = { destroy () { enter?.disconnect(); leave?.disconnect() } }
}
