// The argument over Planet Nine as a ledger: one full-width row per paper,
// year by year, the year riding in a gutter on the left.
//
// Each row is one claim: a title that says what the paper means for the
// search, one line of context, a small drawing of the point, and a link. The
// lane is said three ways at once: colour, a large icon, and placement
// (arguments for a planet are boxes shifted left, arguments against one
// shifted right, data and searches centred with centred text). When a data
// row's authors draw a conclusion, it hangs a for/against row of its own
// beneath the data row, joined by a connector and labelled as their reading.
//
// Used on four pages of part 3, each showing the subset it needs:
//   filter    keeps only the entries it returns true for (a hung row follows its data row)
//   compact   title, icon and year only; drawings only on key papers (the timeline page)
//   future    include the "what comes next" group (the future page shows nothing else)
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

function links (e, byDoi, compact) {
  const out = []
  if (e.doi) out.push(paperLink(byDoi.get(e.doi)))
  if (!compact) {
    for (const d of e.also || []) out.push(paperLink(byDoi.get(d)))
    for (const l of e.links || []) out.push(`<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
    const p = e.doi && byDoi.get(e.doi)
    if (p && p.citations_crossref != null) out.push(`<span>${p.citations_crossref} citations</span>`)
  } else if (!e.doi && e.links?.length) out.push(`<a href="${esc(e.links[0].url)}" rel="noopener">${esc(e.links[0].label)}</a>`)
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

/** One row. `from` labels a row that hangs off the data row above it. */
function row (e, byDoi, from = null, compact = false) {
  const lane = LANE[e.lane]
  const foot = links(e, byDoi, compact)
  const art = compact ? (e.key && e.diagram ? diagram(e.diagram, e.id) : '') : (e.diagram ? diagram(e.diagram, e.id) : '')
  return `<article class="fr ${lane.cls}${e.key ? ' is-key' : ''}${from ? ' is-branch' : ''}${art ? '' : ' no-art'}" data-id="${esc(e.id)}" data-kind="${esc(e.kind || '')}">
    <div class="fr-icon" title="${esc(lane.word)}">${icon(KIND_ICON[e.kind] || lane.icon)}</div>
    <div class="fr-body">
      ${from ? `<div class="fr-from"><span aria-hidden="true">↳</span> ${esc(from)}</div>` : ''}
      <h4 class="fr-title">${esc(e.title)}</h4>
      ${!compact && e.line ? `<p class="fr-line">${avatars(e)}${esc(e.line)}</p>` : ''}
    </div>
    <div class="fr-art">${art}</div>
    <div class="fr-meta">${compact ? '' : bar(e)}${foot ? `<div class="fr-foot">${foot}</div>` : ''}</div>
  </article>`
}

/** The for/against row a data entry's authors earned it. */
function branchRow (e, compact) {
  const b = e.branch
  return row({ id: e.id + '-branch', lane: b.side, kind: 'branch', title: b.title, line: b.line, diagram: b.diagram, key: e.key },
    new Map(), b.from || 'What its finders concluded', compact)
}

function credits (entries) {
  const seen = new Map()
  for (const e of entries) for (const p of e.photos || []) if (p.src && !seen.has(p.src)) seen.set(p.src, p)
  if (!seen.size) return ''
  const rows = [...seen.values()].map(p =>
    `<li>${esc(p.alt)} — ${esc(p.credit)} · ${p.license_url ? `<a href="${esc(p.license_url)}" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}${p.source ? ` · <a href="${esc(p.source)}" rel="noopener">source</a>` : ''}</li>`)
  return `<details class="fl-credits"><summary>Portrait credits (${rows.length}, Wikimedia Commons)</summary><ul>${rows.join('')}</ul></details>`
}

export function legend (lanes = ['for', 'against', 'data', 'next'], { key = true } = {}) {
  const items = {
    for: ['is-for', 'planet', 'For a planet'],
    against: ['is-against', 'noplanet', 'Against a planet'],
    data: ['is-data', 'object', 'Data and searches'],
    next: ['is-next', 'next', 'What comes next'],
  }
  return lanes.map(l => items[l]).map(([cls, ic, word]) => `<div class="legend-item ${cls}"><span class="fr-icon">${icon(ic)}</span>${word}</div>`).join('') +
    (key ? '<div class="legend-item is-muted">Larger rows: the papers the field answers to</div>' : '')
}

export function drawField (root, { timeline, papers, legend: legendEl, filter = () => true, compact = false, future = true, dated = true, lanes }) {
  root.__field?.destroy()
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const kept = timeline.entries.filter(filter)
  const datedEntries = dated ? kept.filter(e => e.lane !== 'next').sort((a, b) => a.year - b.year || a.order - b.order) : []
  const futureEntries = future ? kept.filter(e => e.lane === 'next').sort((a, b) => a.order - b.order) : []

  const years = []
  for (const e of datedEntries) {
    const y = years[years.length - 1]
    if (y && y.year === e.year) y.entries.push(e)
    else years.push({ year: e.year, entries: [e] })
  }

  const group = (label, entries, cls = '') => `
    <div class="fy ${cls}">
      <div class="fy-year"><span>${label}</span></div>
      <div class="fy-rows">${entries.map(e => row(e, byDoi, null, compact) + (e.branch ? branchRow(e, compact) : '')).join('')}</div>
    </div>`

  root.classList.toggle('is-compact', compact)
  root.innerHTML = years.map(y => group(y.year, y.entries)).join('') +
    (futureEntries.length ? group('Next', futureEntries, 'fy-next') : '') +
    (compact ? '' : credits(kept))
  if (legendEl) legendEl.innerHTML = legend(lanes || ['for', 'against', 'data', ...(futureEntries.length ? ['next'] : [])], { key: !compact || true })

  // --- entrance: each row comes in from its own side; a hung row follows its data row
  const rows = [...root.querySelectorAll('.fr')]
  let enter = null, leave = null
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!reduce && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('has-reveal')
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

/** Entry pickers for the part 3 pages. */
export const PICK = {
  /** a direct search, a limit, a candidate or a survey */
  searches: e => e.lane !== 'next' && ['search', 'limit', 'candidate', 'survey'].includes(e.kind),
  /** the case against: bias and alternative-mechanism papers, and discoveries whose finders read them against */
  against: e => e.lane === 'against' || (e.lane === 'data' && e.branch?.side === 'against'),
  /** everything dated */
  all: e => e.lane !== 'next',
  /** only what comes next */
  next: e => e.lane === 'next',
}
