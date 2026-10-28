// Sketch RL5 — who supports it. The argument, year by year, in three lanes.
//
// Arguments for a planet sit on the left, arguments against one on the right,
// and the data (new objects, searches, surveys) run down the middle. A data
// card branches toward the side its authors say it favours; a search that
// finds nothing takes no side and instead shows how much of the predicted
// planet it ruled out. Key papers are drawn larger. Each year's label sticks
// to the top of the screen while its row scrolls past, so the years advance
// with the reader. Within a year, entries pack into as few rows as the three
// lanes allow.
//
// Content comes from field_timeline.json (which entries, which lane, the
// plain-language text, the images); titles, journals, citation counts and
// links come from papers.json by DOI, so the two files cannot disagree.

import '../field.css'

const LANE = {
  support: { word: 'For a planet', cls: 'is-support', col: 1 },
  against: { word: 'Against a planet', cls: 'is-against', col: 3 },
  data: { word: 'Data & searches', cls: 'is-data', col: 2 },
  future: { word: 'What comes next', cls: 'is-future', col: 2 },
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function paperLink (p) {
  if (!p) return ''
  const href = p.arxiv_url || p.url
  const journal = (p.journal || '').replace(/&amp;/g, '&')
  return `<a href="${esc(href)}" rel="noopener">${esc(p.label)}${journal ? ' · ' + esc(journal) : ''}</a>`
}

const img = (p, w, h, cls) =>
  `<img class="${cls}" src="${esc(p.src)}" alt="${esc(p.alt)}" width="${w}" height="${h}" loading="lazy" decoding="async"
    title="${esc(p.alt)} — ${esc(p.credit)} (${esc(p.license)})">`

function faces (e) {
  if (e.monogram) return `<span class="fl-face fl-mono" aria-hidden="true">${esc(e.monogram)}</span>`
  if (e.art) return `<svg class="fl-face fl-art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-${esc(e.art)}"/></svg>`
  return (e.photos || []).filter(p => p.src).map(p => img(p, 240, 240, 'fl-face')).join('')
}

function figure (e) {
  const f = e.figure
  if (!f || !f.src) return ''
  return `<figure class="fl-fig">${img(f, 720, 360, 'fl-fig-img')}</figure>`
}

function links (e, byDoi) {
  const out = []
  if (e.doi) out.push(paperLink(byDoi.get(e.doi)))
  for (const d of e.also || []) out.push(paperLink(byDoi.get(d)))
  for (const l of e.links || []) out.push(`<a href="${esc(l.url)}" rel="noopener">${esc(l.label)}</a>`)
  const p = e.doi && byDoi.get(e.doi)
  if (p && p.citations_crossref != null) out.push(`<span class="fl-cites">${p.citations_crossref} citations</span>`)
  return out.filter(Boolean).join('<span class="fl-sep">·</span>')
}

/** A null search: how much of the predicted parameter space it ruled out. */
function bar (e) {
  const x = e.excluded
  if (!x) return ''
  return `<div class="fl-bar" role="img" aria-label="${x.pct}% ${esc(x.text)}">
    <div class="fl-bar-track"><i class="fl-bar-fill" style="width:${x.pct}%"></i></div>
    <div class="fl-bar-label"><b>${x.pct}%</b> ${esc(x.text)}</div>
  </div>`
}

function item (e, byDoi, row) {
  const lane = LANE[e.lane]
  const when = e.lane === 'future' ? e.when : e.year
  const style = row ? ` style="grid-column:${lane.col};grid-row:${row}"` : ''
  const face = faces(e)
  return `<article class="fl-item ${lane.cls}${e.key ? ' is-key' : ''}" data-id="${esc(e.id)}"${style} aria-label="${esc(e.headline)}">
    ${e.key ? figure(e) : ''}
    <div class="fl-meta"><span class="fl-lane">${esc(lane.word)}</span>${e.type ? `<span class="fl-type">${esc(e.type)}</span>` : ''}${e.key ? '<span class="fl-key">Key paper</span>' : ''}<span class="fl-when">${esc(when)}</span></div>
    <h4 class="fl-head">${esc(e.headline)}</h4>
    <div class="fl-top">${face ? `<div class="fl-faces">${face}</div>` : ''}<div class="fl-who">${esc(e.who)}<span class="fl-org">${esc(e.org)}</span></div></div>
    <p class="fl-text">${esc(e.text)}</p>
    ${e.stat ? `<p class="fl-stat">${esc(e.stat)}</p>` : ''}
    ${bar(e)}
    ${e.note ? `<p class="fl-note">${esc(e.note)}</p>` : ''}
    ${e.unverified ? `<p class="fl-note fl-warn">⚠ ${esc(e.unverified)}</p>` : ''}
    <div class="fl-links">${links(e, byDoi)}</div>
  </article>`
}

/** What a data entry's authors concluded, drawn in the lane it favours and joined to the card. */
function branch (e, row) {
  const b = e.branch
  if (!b) return ''
  const lane = LANE[b.side]
  const label = b.side === 'support' ? `◀ ${lane.word}` : `${lane.word} ▶`
  return `<div class="fl-branch ${lane.cls}" style="grid-column:${lane.col};grid-row:${row}" aria-label="${esc(b.label)}">
    <div class="fl-branch-label">${label}</div>
    <div class="fl-branch-head">${esc(b.label)}</div>
    <p class="fl-branch-text">${esc(b.text)}</p>
  </div>`
}

/**
 * Pack one year's entries into rows. A side entry takes the next free row of
 * its lane; a data entry takes the next row free in the middle and, if it
 * branches, in the lane it branches to. So 2021's three papers share one row.
 */
function pack (entries) {
  const next = { 1: 1, 2: 1, 3: 1 }
  return entries.map(e => {
    const cols = e.lane === 'data'
      ? [2].concat(e.branch ? [LANE[e.branch.side].col] : [])
      : [LANE[e.lane].col]
    const row = Math.max(...cols.map(c => next[c]))
    cols.forEach(c => { next[c] = row + 1 })
    return { e, row }
  })
}

function credits (entries) {
  const seen = new Map()
  for (const e of entries) {
    for (const p of (e.photos || []).concat(e.figure ? [e.figure] : [])) {
      if (p.src && !seen.has(p.src)) seen.set(p.src, p)
    }
  }
  const rows = [...seen.values()].map(p =>
    `<li>${esc(p.alt)} — ${esc(p.credit)} · ${p.license_url ? `<a href="${esc(p.license_url)}" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}${p.source ? ` · <a href="${esc(p.source)}" rel="noopener">source</a>` : ''}</li>`)
  return `<details class="fl-credits"><summary>Image credits (${rows.length} images, Wikimedia Commons)</summary><ul>${rows.join('')}</ul></details>`
}

export function drawField (root, { timeline, papers }) {
  root.__field?.destroy()
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const dated = timeline.entries.filter(e => e.lane !== 'future')
    .sort((a, b) => a.year - b.year || a.order - b.order)
  const future = timeline.entries.filter(e => e.lane === 'future').sort((a, b) => a.order - b.order)

  const years = []
  for (const e of dated) {
    const y = years[years.length - 1]
    if (y && y.year === e.year) y.entries.push(e)
    else years.push({ year: e.year, entries: [e] })
  }

  const html = years.map(y => `
    <div class="fl-year" data-year="${y.year}">
      <div class="fl-year-head"><span class="fl-year-pill">${y.year}</span></div>
      <div class="fl-row">${pack(y.entries).map(({ e, row }) => item(e, byDoi, row) + branch(e, row)).join('')}</div>
    </div>`).join('')

  root.innerHTML = html + `
    <div class="fl-year fl-year-next">
      <div class="fl-year-head"><span class="fl-year-pill">What comes next</span></div>
      <div class="fl-next">${future.map(e => item(e, byDoi, 0)).join('')}</div>
    </div>` + credits(timeline.entries)

  // --- entrance: each block slides in from its own lane ---------------------
  // Scoped to html.has-reveal (set by initReveals in scrolly.js), so with
  // reduced motion or without JS the blocks are simply there.
  const blocks = [...root.querySelectorAll('.fl-item, .fl-branch')]
  let enter = null, leave = null
  if (document.documentElement.classList.contains('has-reveal') && 'IntersectionObserver' in window) {
    enter = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) e.target.classList.add('is-in')
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
    leave = new IntersectionObserver(es => {
      for (const e of es) if (!e.isIntersecting) e.target.classList.remove('is-in')
    }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })
    blocks.forEach(b => { enter.observe(b); leave.observe(b) })
  } else {
    blocks.forEach(b => b.classList.add('is-in'))
  }

  root.__field = { destroy () { enter?.disconnect(); leave?.disconnect() } }
}
