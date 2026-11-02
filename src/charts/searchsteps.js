// The searches so far, one at a time: a row of markers along a line, one per
// milestone (several may share a year), and under it the chosen milestone as
// the ledger draws it (charts/field.js), with Previous and Next beneath.
//
// Every card is in the page at once, stacked in one grid cell so one can fade
// into the next; only the chosen one is visible, the rest are inert. The stage
// takes the chosen card's height, eased, so a short card leaves no empty box
// and the one taller milestone (a candidate with its reading hung beneath)
// grows the stage smoothly instead of jumping. The markers are a tab list:
// arrow keys, Home and End move along it.

import { milestone, credits } from './field.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
// what each milestone was, under its year
const KIND = { search: 'Search', limit: 'Limit', candidate: 'Candidate', survey: 'Survey' }

export function drawSearchSteps (root, { timeline, papers, filter }) {
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const entries = timeline.entries.filter(filter).sort((a, b) => a.year - b.year || a.order - b.order)
  const n = entries.length
  if (!n) return
  const id = (k, i) => `st-${k}-${i}`

  root.classList.add('st')
  root.innerHTML = `
    <div class="st-rail-wrap">
      <ol class="st-rail" role="tablist" aria-label="Searches, earliest first" style="--n:${n}">
        <li class="st-line" aria-hidden="true"><i></i></li>
        ${entries.map((e, i) => `<li class="st-mark-li">
          <button type="button" class="st-mark" role="tab" id="${id('tab', i)}" aria-controls="${id('card', i)}"
            aria-selected="false" tabindex="-1" aria-label="${e.year}, ${esc(e.title)}">
            <span class="st-dot" aria-hidden="true"></span>
            <span class="st-year">${e.year}</span>
            ${KIND[e.kind] ? `<span class="st-kind">${KIND[e.kind]}</span>` : ''}
          </button></li>`).join('')}
      </ol>
    </div>
    <div class="st-stage">
      ${entries.map((e, i) => `<div class="st-card" role="tabpanel" id="${id('card', i)}" aria-labelledby="${id('tab', i)}">${milestone(e, byDoi)}</div>`).join('')}
    </div>
    <div class="st-nav">
      <button type="button" class="st-btn st-prev"><span aria-hidden="true">←</span> Previous</button>
      <span class="st-count" aria-hidden="true"></span>
      <button type="button" class="st-btn st-next"></button>
    </div>
    <p class="st-status" aria-live="polite"></p>
    ${credits(entries)}`

  // the ledger's rows wait for a scroll reveal; here they are always shown
  root.querySelectorAll('.fr').forEach(r => r.classList.add('is-in'))

  const tabs = [...root.querySelectorAll('.st-mark')]
  const cards = [...root.querySelectorAll('.st-card')]
  const rail = root.querySelector('.st-rail-wrap')
  const prev = root.querySelector('.st-prev'), next = root.querySelector('.st-next')
  const count = root.querySelector('.st-count'), status = root.querySelector('.st-status')
  const stage = root.querySelector('.st-stage')
  let at = -1
  const fit = () => { stage.style.height = cards[at].offsetHeight + 'px' }
  // fonts, images and a narrower screen all change a card's height
  new ResizeObserver(() => at >= 0 && fit()).observe(root)

  function show (i, { announce = true } = {}) {
    i = (i + n) % n
    if (i === at) return
    at = i
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i))
      t.tabIndex = k === i ? 0 : -1
      t.classList.toggle('is-past', k < i)
    })
    cards.forEach((c, k) => {
      c.classList.toggle('is-active', k === i)
      c.classList.toggle('is-before', k < i)
      c.inert = k !== i
      c.setAttribute('aria-hidden', String(k !== i))
    })
    fit()
    // the line fills up to the chosen marker
    root.style.setProperty('--st-progress', n > 1 ? i / (n - 1) : 0)
    // aria-disabled, not disabled, so a focused Previous keeps focus when it reaches the first milestone
    prev.setAttribute('aria-disabled', String(i === 0))
    const last = i === n - 1
    next.innerHTML = last ? 'Start over <span aria-hidden="true">↺</span>' : 'Next <span aria-hidden="true">→</span>'
    count.textContent = `${i + 1} of ${n}`
    if (announce) status.textContent = `${i + 1} of ${n}. ${entries[i].year}: ${entries[i].title}`
    // keep the chosen marker in view when the rail scrolls sideways (a phone), without moving the page
    const t = tabs[i], r = rail.getBoundingClientRect(), b = t.getBoundingClientRect()
    if (b.left < r.left || b.right > r.right) rail.scrollTo({ left: rail.scrollLeft + b.left - r.left - (r.width - b.width) / 2, behavior: 'smooth' })
  }

  tabs.forEach((t, i) => t.addEventListener('click', () => show(i)))
  root.querySelector('.st-rail').addEventListener('keydown', ev => {
    const k = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: n - 1 }[ev.key]
    if (k === undefined) return
    ev.preventDefault()
    show(Math.max(0, Math.min(n - 1, k)))
    tabs[at].focus()
  })
  prev.addEventListener('click', () => { if (at > 0) show(at - 1) })
  next.addEventListener('click', () => show(at === n - 1 ? 0 : at + 1))

  show(0, { announce: false })
}
