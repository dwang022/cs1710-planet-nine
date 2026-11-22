// The ledger's rows: one paper or event as a card with a title, a line, a small drawing (fieldart.js) and links to the
// paper. The search page's step-through of the searches (searchsteps.js) draws each card with `milestone`, and
// `credits` writes the line crediting the portraits.
//
// Content comes from field_timeline.json; titles, journals and links come from papers.json by DOI, so the two files
// cannot disagree. Also exported: `au`, which colours every distance in AU in a piece of HTML, and `PICK`, the entries
// the search page picks out.

import '../field.css'
import { diagram, icon } from './fieldart.js'
import { url } from '../data.js'

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
// a distance in AU is gold and kept on one line (.k-au in style.css)
export const au = html => html.replace(/(\d[\d,.]*(?:\s+to\s+\d[\d,.]*)?)\s+AU\b/g, '<span class="k-au">$1&nbsp;AU</span>')

function paperLink (p) {
  if (!p) return ''
  const href = p.arxiv_url || p.url
  const journal = (p.journal || '').replace(/&amp;/g, '&')
  return `<a href="${esc(href)}" rel="noopener">${esc(p.label)}${journal ? ' · ' + esc(journal) : ''}</a>`
}

function links (e, byDoi, compact, citations = true) {
  const out = []
  if (e.doi) out.push(paperLink(byDoi.get(e.doi)))
  if (!compact) {
    for (const d of e.also || []) out.push(paperLink(byDoi.get(d)))
    for (const l of e.links || []) out.push(`<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
    const p = e.doi && byDoi.get(e.doi)
    if (citations && p && p.citations_crossref != null) out.push(`<span>${p.citations_crossref} citations</span>`)
  } else if (!e.doi) {
    // no paper to link: keep every source (Rubin's start of survey and its first find)
    for (const l of e.links || []) out.push(`<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
  }
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
function row (e, byDoi, from = null, compact = false, lines = !compact, opts = {}) {
  // plain: the search page's cards, all one design: no lane icon, no citation count, no bar repeating the drawing's
  // share, no larger "key" row (2026-11-20, asked for)
  const plain = !!opts.plain
  if (plain) e = { ...e, key: false }
  const lane = LANE[e.lane]
  const foot = links(e, byDoi, compact, !plain)
  const art = compact ? (e.key && e.diagram ? diagram(e.diagram, e.id) : '') : (e.diagram ? diagram(e.diagram, e.id) : '')
  return `<article class="fr ${lane.cls}${e.key ? ' is-key' : ''}${from ? ' is-branch' : ''}${art ? '' : ' no-art'}" data-id="${esc(e.id)}" data-kind="${esc(e.kind || '')}">
    ${plain ? '' : `<div class="fr-icon" title="${esc(lane.word)}">${icon(KIND_ICON[e.kind] || lane.icon)}</div>`}
    <div class="fr-body">
      ${from ? `<div class="fr-from"><span aria-hidden="true">↳</span> ${esc(from)}</div>` : ''}
      <h4 class="fr-title">${au(esc(e.title))}</h4>
      ${lines && e.line ? `<p class="fr-line">${avatars(e)}${au(esc(e.line))}</p>` : ''}
    </div>
    <div class="fr-art">${art}</div>
    <div class="fr-meta">${compact || plain ? '' : bar(e)}${foot ? `<div class="fr-foot">${foot}</div>` : ''}</div>
  </article>`
}

/** The for/against row a data entry's authors earned it. */
function branchRow (e, compact, lines) {
  const b = e.branch
  return row({ id: e.id + '-branch', lane: b.side, kind: 'branch', title: b.title, line: b.line, diagram: b.diagram, key: e.key },
    new Map(), b.from || 'What its finders concluded', compact, lines)
}

/** One full milestone as the ledger draws it, its hung for/against row included (the search page's stepper,
    charts/searchsteps.js, shows one at a time). */
export function milestone (e, byDoi, opts = {}) {
  return row(e, byDoi, null, false, true, opts) + (e.branch && !opts.plain ? branchRow(e, false, true) : '')
}

/** The portraits beside the lines: one dim line, the full credits on the credits page. */
export function credits (entries) {
  const licences = new Set()
  for (const e of entries) for (const p of e.photos || []) if (p.src) licences.add(p.license)
  if (!licences.size) return ''
  return `<p class="fl-credits">Portrait · ${[...licences].map(esc).join(', ')} · <a href="${url('credits.html')}#photos">credits</a></p>`
}

/** Entry pickers for the part 3 pages. */
export const PICK = {
  /** a direct search, a limit, a candidate or a survey */
  searches: e => e.lane !== 'next' && ['search', 'limit', 'candidate', 'survey'].includes(e.kind),
  /** the case against: bias and alternative-mechanism papers, and discoveries whose finders read them against a
      planet (not those read only against the proposed orbit, branch.of === 'orbit', such as Ammonite) */
  against: e => e.lane === 'against' || (e.lane === 'data' && e.branch?.side === 'against' && e.branch.of !== 'orbit'),
  /** everything dated */
  all: e => e.lane !== 'next',
  /** only what comes next */
  next: e => e.lane === 'next',
}
