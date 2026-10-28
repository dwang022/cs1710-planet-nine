// Sketch RL5 — who supports it. The argument as a timeline you scroll down.
//
// Years advance as the page scrolls. Papers for a planet enter from the left,
// papers against one (or narrowing where it can hide) enter from the right,
// new data runs across the spine in neutral grey, and the searches still to
// come sit at the bottom in dashed blue. A year badge rides the spine at the
// reading line and keeps a running tally of the two sides.
//
// Content comes from field_timeline.json (which entries, which side, the
// plain-language text and the photos); titles, journals, citation counts and
// links come from papers.json by DOI, so the two files cannot disagree.

import '../field.css'

const KIND = {
  support: { word: 'For a planet', cls: 'is-support' },
  against: { word: 'Against, or narrowing it', cls: 'is-against' },
  data: { word: 'New data', cls: 'is-data' },
  future: { word: 'What comes next', cls: 'is-future' },
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

function paperLink (p) {
  if (!p) return ''
  const href = p.arxiv_url || p.url
  const journal = (p.journal || '').replace(/&amp;/g, '&')
  return `<a href="${esc(href)}" rel="noopener">${esc(p.label)}${journal ? ' · ' + esc(journal) : ''}</a>`
}

function faces (e) {
  if (e.monogram) return `<span class="fl-face fl-mono" aria-hidden="true">${esc(e.monogram)}</span>`
  if (e.art) return `<svg class="fl-face fl-art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-${esc(e.art)}"/></svg>`
  return (e.photos || []).map(p =>
    `<img class="fl-face" src="${esc(p.src)}" alt="${esc(p.alt)}" width="240" height="240" loading="lazy" decoding="async"
      title="${esc(p.alt)} — ${esc(p.credit)} (${esc(p.license)})">`).join('')
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

/** One card. Data entries are split in two halves so the spine shows between them. */
function item (e, byDoi, tally) {
  const k = KIND[e.kind]
  const when = e.kind === 'future' ? e.when : e.year
  const meta = `<div class="fl-meta"><span class="fl-kind">${esc(k.word)}</span>${e.tag ? `<span class="fl-tag">${esc(e.tag)}</span>` : ''}<span class="fl-when">${esc(when)}</span></div>`
  const head = `<h4 class="fl-head">${esc(e.headline)}</h4>`
  const who = `<div class="fl-who">${esc(e.who)}<span class="fl-org">${esc(e.org)}</span></div>`
  const body = `<p class="fl-text">${esc(e.text)}</p>
    ${e.note ? `<p class="fl-note">${esc(e.note)}</p>` : ''}
    ${e.unverified ? `<p class="fl-note fl-warn">⚠ ${esc(e.unverified)}</p>` : ''}
    <div class="fl-links">${links(e, byDoi)}</div>`
  const attrs = `class="fl-item ${k.cls}" data-id="${esc(e.id)}" data-for="${tally.support}" data-against="${tally.against}"`

  if (e.kind === 'data') {
    return `<article ${attrs} aria-label="${esc(e.headline)}">
      <div class="fl-card fl-card-l"><div class="fl-faces">${faces(e)}</div><div class="fl-body">${meta}${head}${who}</div></div>
      <div class="fl-card fl-card-r"><div class="fl-body">${body}</div></div>
    </article>`
  }
  return `<article ${attrs} aria-label="${esc(e.headline)}">
    <div class="fl-card"><div class="fl-faces">${faces(e)}</div><div class="fl-body">${meta}${head}${who}${body}</div></div>
  </article>`
}

function credits (entries) {
  const seen = new Map()
  for (const e of entries) for (const p of e.photos || []) if (p.src && !seen.has(p.src)) seen.set(p.src, p)
  const rows = [...seen.values()].map(p =>
    `<li>${esc(p.alt)} — ${esc(p.credit)} · ${p.license_url ? `<a href="${esc(p.license_url)}" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}${p.source ? ` · <a href="${esc(p.source)}" rel="noopener">source</a>` : ''}</li>`)
  return `<details class="fl-credits"><summary>Photo credits (${rows.length} images, Wikimedia Commons)</summary><ul>${rows.join('')}</ul></details>`
}

export function drawField (root, { timeline, papers }) {
  root.__field?.destroy()
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const dated = timeline.entries.filter(e => e.kind !== 'future')
    .sort((a, b) => a.year - b.year || a.order - b.order)
  const future = timeline.entries.filter(e => e.kind === 'future').sort((a, b) => a.order - b.order)

  let html = ''
  let year = null
  const tally = { support: 0, against: 0 }
  for (const e of dated) {
    if (e.year !== year) {
      year = e.year
      html += `<div class="fl-year" data-year="${year}"><span>${year}</span></div>`
    }
    if (e.kind in tally) tally[e.kind]++
    html += item(e, byDoi, tally)
  }
  html += `<div class="fl-year fl-year-next" data-year="next"><span>What comes next</span></div>`
  html += `<div class="fl-next">${future.map(e => item(e, byDoi, tally)).join('')}</div>`

  root.innerHTML = `
    <div class="fl-sticky" aria-hidden="true"><div class="fl-pill">
      <div class="fl-pill-year">${dated[0]?.year ?? ''}</div>
      <div class="fl-pill-tally"><b class="for">0</b> for <span class="fl-sep">·</span> <b class="against">0</b> against</div>
    </div></div>
    <div class="fl-list">
      <div class="fl-spine" aria-hidden="true"></div>
      ${html}
    </div>
    ${credits(timeline.entries)}`

  const items = [...root.querySelectorAll('.fl-item')]
  const marks = [...root.querySelectorAll('.fl-year')]
  const sticky = root.querySelector('.fl-sticky')
  const pillYear = root.querySelector('.fl-pill-year')
  const pillFor = root.querySelector('.fl-pill-tally .for')
  const pillAgainst = root.querySelector('.fl-pill-tally .against')
  const spine = root.querySelector('.fl-spine')
  const next = root.querySelector('.fl-next')
  const list = root.querySelector('.fl-list')

  // --- scroll: the year badge rides the reading line and the tally follows --
  let raf = 0
  function measure () {
    raf = 0
    const phone = window.matchMedia('(max-width: 900px)').matches
    const line = window.innerHeight * (phone ? 0.6 : 0.5)
    const r = list.getBoundingClientRect()
    sticky.classList.toggle('is-on', r.top < line && r.bottom > line)

    let cur = marks[0]
    for (const m of marks) {
      const past = m.getBoundingClientRect().top <= line
      m.classList.toggle('is-past', past)
      if (past) cur = m
    }
    pillYear.textContent = cur.dataset.year === 'next' ? 'Next' : cur.dataset.year

    let last = null
    for (const it of items) if (it.getBoundingClientRect().top <= line) last = it
    pillFor.textContent = last ? last.dataset.for : 0
    pillAgainst.textContent = last ? last.dataset.against : 0

    // the spine stops where the future begins
    spine.style.height = `${next.offsetTop - 10}px`
  }
  const request = () => { if (!raf) raf = requestAnimationFrame(measure) }
  window.addEventListener('scroll', request, { passive: true })
  window.addEventListener('resize', request)
  measure()

  // --- entrance: each card slides in from its own side ----------------------
  // Scoped to html.has-reveal (set by initReveals in scrolly.js), so with
  // reduced motion or without JS the cards are simply there.
  let enter = null, leave = null
  if (document.documentElement.classList.contains('has-reveal') && 'IntersectionObserver' in window) {
    enter = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) e.target.classList.add('is-in')
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
    leave = new IntersectionObserver(es => {
      for (const e of es) if (!e.isIntersecting) e.target.classList.remove('is-in')
    }, { rootMargin: '10% 0px 10% 0px', threshold: 0 })
    items.forEach(it => { enter.observe(it); leave.observe(it) })
  } else {
    items.forEach(it => it.classList.add('is-in'))
  }

  root.__field = {
    destroy () {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      enter?.disconnect(); leave?.disconnect()
    },
  }
}
