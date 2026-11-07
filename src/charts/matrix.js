// What else could explain the pattern: a scorecard of the explanations in
// alternatives.json against the four things any of them has to account for,
// on the planets page's pattern (setting/planets.html, .criteria): a drawing
// and a name per row, a mark per test.
//
// Every row opens, in place, a panel directly under it: a drawing of the idea
// (charts/altart.js), a few plain sentences on what it is and what it explains,
// and where it falls short as the key line. Each sentence carries superscript
// citations to the papers on the credits page. One panel is open at a time; the
// row again, its × or Escape closes it.
//
// The clue column heads are the filter: pressing one requires that clue, and an
// idea that does not explain a required clue fades (one that partly explains it
// stays); the last head counts how many are left. Nothing pressed, every idea
// shows, and "Click a clue" under "The idea" says so until the first press.
//
// An easter egg: a reader who chose the black-hole skin on the intro and opens
// the black hole's row sees every other idea's drawing and marks fall into it and
// spring back out, and "Your pick" under its name.
//
// The marks say each verdict twice, by shape and by colour: a full aurora disc
// (accounts for it, white), a half disc (partly, white), an ember ring (does not), so
// ember means "fails" here as it does on the planets page.

import { url } from '../data.js'
import { ROW_ART, PANEL_ART } from './altart.js'
import { au } from './field.js'

export const MARK = {
  yes: 'Explains it',
  partial: 'Partly',
  no: 'Doesn’t',
}

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** One verdict as a drawn mark (styled in style.css, .mk). */
export function markSvg (v) {
  const inner = v === 'yes'
    ? '<circle r="8.5"/>'
    : v === 'partial'
      ? '<circle r="8.5" class="ring"/><path d="M0,-8.5 A8.5,8.5 0 0,1 0,8.5 Z"/>'
      : '<circle r="7.5" class="ring"/>'
  return `<svg class="mk mk-${v}" viewBox="-12 -12 24 24" aria-hidden="true" focusable="false">${inner}</svg>`
}

/** The key above the table: each mark with what it means. */
export const markKey = () => Object.entries(MARK).map(([v, label]) =>
  `<div class="legend-item">${markSvg(v)}${label}</div>`).join('')

// The anchor the credits page gives each paper (credits.js, papers()):
// "Brown & Batygin 2019" → cite-brown-batygin-2019. Keep the two in step.
const citeId = label => 'cite-' + label.replace(/\(.*?\)/g, '').replace(/&/g, ' ').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Sentences ({ text, cite: [doi] }) as running text, each followed by its
 * superscripts. `nums` numbers the papers within one panel in order of first use.
 */
function cited (segments, byDoi, nums) {
  return segments.map(({ text, cite = [] }) => {
    const refs = cite.map(d => byDoi.get(d)).filter(Boolean)
    for (const p of refs) if (!nums.has(p.doi)) nums.set(p.doi, nums.size + 1)
    const sup = refs.length
      ? `<sup class="cite">${refs.sort((a, b) => nums.get(a.doi) - nums.get(b.doi)).map(p =>
          `<a href="${url('credits.html')}#${citeId(p.label)}" title="${esc(p.label)}">${nums.get(p.doi)}</a>`).join(',')}</sup>`
      : ''
    return au(esc(text)) + sup
  }).join(' ')
}

const EGG = 'primordial_black_hole'
const CHEVRON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M3.5 6 L8 10.5 L12.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'

export function drawScorecard (table, { alternatives, phenomena, papers }) {
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const cols = phenomena.length + 2

  const head = `<thead><tr>
    <th scope="col" class="alt-h-name">The idea<span class="alt-hint">Click a clue</span></th>
    ${phenomena.map(p => `<th scope="col" class="alt-h-test" data-clue="${esc(p.id)}"><button type="button" class="alt-h-btn" aria-pressed="false" title="Must explain: ${esc(p.label)}"><span class="tick" aria-hidden="true"></span><span class="long">${esc(p.label)}</span><span class="short" aria-hidden="true">${esc(p.short || p.label)}</span></button></th>`).join('')}
    <th scope="col" class="alt-h-more"><span class="alt-f-count" aria-live="polite"></span></th>
  </tr></thead>`

  const rows = alternatives.map(a => {
    const nums = new Map()
    const panel = `<figure class="alt-fig">${PANEL_ART[a.id]?.() || ''}</figure>
      <div class="alt-text">
        <p class="alt-explain">${cited(a.explain || [], byDoi, nums)}</p>
        <p class="alt-short">${cited(a.struggles || [], byDoi, nums)}</p>
      </div>
      <button type="button" class="alt-close" aria-label="Close">×</button>`
    const p9 = a.id === 'planet_nine'
    return `<tr class="alt-row${p9 ? ' p9' : ''}" data-id="${esc(a.id)}">
      <th scope="row">
        <button type="button" class="alt-btn" id="alt-btn-${esc(a.id)}" aria-expanded="false" aria-controls="alt-more-${esc(a.id)}">
          <span class="alt-ic-box">${ROW_ART[a.id]?.() || ''}</span>
          <span class="alt-name"><b${p9 ? ' class="k-p9"' : ''}>${esc(a.name)}</b>${a.tag ? `<small>${esc(a.tag)}</small>` : ''}${a.id === EGG ? '<span class="alt-egg" aria-hidden="true">Your pick</span>' : ''}</span>
        </button>
      </th>
      ${phenomena.map(p => {
        const v = (a.scorecard || {})[p.id] || 'no'
        return `<td class="alt-m">${markSvg(v)}<span class="vh">${MARK[v]}</span></td>`
      }).join('')}
      <td class="alt-more-cue" aria-hidden="true"><span class="alt-pill"><span class="w">More</span><span class="w2">Less</span>${CHEVRON}</span></td>
    </tr>
    <tr class="alt-more" id="alt-more-${esc(a.id)}" hidden>
      <td colspan="${cols}"><div class="alt-more-in"><div class="alt-clip">
        <div class="alt-panel" role="region" aria-labelledby="alt-btn-${esc(a.id)}">${panel}</div>
      </div></div></td>
    </tr>`
  }).join('')

  table.innerHTML = head + `<tbody>${rows}</tbody>`

  // --- opening and closing, one panel at a time ---------------------------------
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const MS = reduce ? 0 : 300
  const parts = id => ({
    row: table.querySelector(`tr.alt-row[data-id="${CSS.escape(id)}"]`),
    more: table.querySelector(`#alt-more-${CSS.escape(id)}`),
    btn: table.querySelector(`#alt-btn-${CSS.escape(id)}`),
  })
  let open = null
  const timers = new Map()

  function close (id) {
    const { row, more, btn } = parts(id)
    row.classList.remove('is-open')
    more.classList.remove('is-open')
    btn.setAttribute('aria-expanded', 'false')
    clearTimeout(timers.get(id))
    timers.set(id, setTimeout(() => { if (!more.classList.contains('is-open')) more.hidden = true }, MS))
  }

  function show (id) {
    const { row, more, btn } = parts(id)
    clearTimeout(timers.get(id))
    more.hidden = false
    void more.offsetHeight            // start the height transition from closed
    row.classList.add('is-open')
    more.classList.add('is-open')
    btn.setAttribute('aria-expanded', 'true')
    timers.set(id, setTimeout(() => reveal(row, more), MS + 20))
    if (id === EGG && document.documentElement.dataset.skin === 'black-hole' && !reduce) swallow(row)
  }

  // --- the easter egg: everything else falls into the black hole and springs back -------
  let swallowing = false
  function swallow (row) {
    if (swallowing) return
    swallowing = true
    const hole = row.querySelector('.alt-ic-box').getBoundingClientRect()
    const [hx, hy] = [hole.left + hole.width / 2, hole.top + hole.height / 2]
    const bits = [...table.querySelectorAll('tr.alt-row:not([data-id="' + EGG + '"]) :is(.alt-ic-box, .mk)')]
    bits.forEach(el => {
      const r = el.getBoundingClientRect()
      el.classList.add('is-sucked')
      el.style.transform = `translate(${hx - r.left - r.width / 2}px, ${hy - r.top - r.height / 2}px) rotate(540deg) scale(0)`
      el.style.opacity = '0'
    })
    const note = row.querySelector('.alt-egg')
    setTimeout(() => {
      note.classList.add('show')
      bits.forEach(el => { el.classList.replace('is-sucked', 'is-spat'); el.style.transform = ''; el.style.opacity = '' })
    }, 1100)
    setTimeout(() => { bits.forEach(el => el.classList.remove('is-spat')); swallowing = false }, 1800)
    setTimeout(() => note.classList.remove('show'), 3200)
  }

  // Bring the open panel into view gently, never pushing its row off the top.
  function reveal (row, more) {
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 0
    const top = row.getBoundingClientRect().top, bottom = more.getBoundingClientRect().bottom
    const room = window.innerHeight
    let dy = 0
    if (top < bar + 8) dy = top - bar - 8
    else if (bottom > room - 16) dy = Math.min(bottom - room + 16, top - bar - 8)
    if (Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: reduce ? 'auto' : 'smooth' })
  }

  function toggle (id) {
    if (open) close(open)
    open = open === id ? null : id
    if (open) show(open)
  }

  // --- the clue filter: the column heads ----------------------------------------------
  {
    const need = new Set()
    const apply = () => {
      let left = 0
      for (const a of alternatives) {
        const out = [...need].some(c => ((a.scorecard || {})[c] || 'no') === 'no')
        const { row } = parts(a.id)
        row.classList.toggle('is-out', out)
        if (out && open === a.id) toggle(a.id)
        if (!out) left++
      }
      table.querySelectorAll('th[data-clue]').forEach(th => th.classList.toggle('is-req', need.has(th.dataset.clue)))
      table.querySelector('.alt-f-count').textContent = need.size ? (left ? `${left} fit` : 'None fit') : ''
    }
    table.querySelector('thead').addEventListener('click', ev => {
      const btn = ev.target.closest('.alt-h-btn')
      if (!btn) return
      const c = btn.closest('th').dataset.clue
      need.has(c) ? need.delete(c) : need.add(c)
      btn.setAttribute('aria-pressed', String(need.has(c)))
      table.classList.add('was-filtered')
      apply()
    })
  }

  table.addEventListener('click', ev => {
    if (ev.target.closest('.alt-close')) {
      const id = open
      toggle(open)
      if (id) parts(id).btn.focus()
      return
    }
    const row = ev.target.closest('tr.alt-row')
    if (row) toggle(row.dataset.id)
  })
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape' || !open) return
    const id = open
    toggle(open)
    parts(id).btn.focus()
  })
}
