// Evidence, last page (rebuilt 2026-11-18, asked for): one figure, every idea placed by how much of the clustering it
// explains and by what it needs that nobody has seen (charts/weigh.js), pinned on the left; on the right an
// introduction card, then a card per idea, the idea being read bright and the rest dimmed; after the last card the
// figure fills the width again, everything lit, a click on an idea scrolling back to its card. Each card
// is built here from alternatives.json (scripts/tag_alternatives.py, our reading of the papers): the idea's mark and
// name, its picture (altart.js PANEL_ART), how it deals with the stretch and the tilt, and its main problem. The ideas
// run from the most familiar to the least. Luck's numbers come from bb2016.json, as on the probability page.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { altHead } from '../charts/althead.js'
import { makeWeigh, makeCites, weighItems, VERDICT } from '../charts/weigh.js'
import { ROW_ART, PANEL_ART } from '../charts/altart.js'
import { scrolly } from '../scrolly.js'
import { oneIn } from '../stats.js'
import { watchClues } from '../clues.js'
import { isOriginalSix } from '../orbits.js'

// “stretch out” and “tilt” in the part's red wherever the page writes them, as on the last two pages
watchClues()

const $ = s => document.querySelector(s)
const fmt = n => n.toLocaleString('en-US')
const pct = p => `${+(p * 100).toPrecision(2)}%`
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const auTint = html => html.replace(/(\d[\d,.]*)\s+AU\b/g, '<span class="k-au">$1&nbsp;AU</span>')

async function main () {
  const { alternatives: ALTS, papers: PAPERS, etnos, bb2016: bb } = await loadData('alternatives', 'papers', 'etnos', 'bb2016')

  // luck on today's orbits, as the probability page quotes it (multiplied, as in 2016)
  const today = bb.today.find(r => r.a_min_au === 150 && r.q_min_au === 30)
  const odds = fmt(oneIn(today.product))
  const fill = t => t.replace('{p_stretch}', pct(today.closest.p)).replace('{p_tilt}', pct(today.tilt.p)).replace('{odds}', odds)

  // the head: the six bunched orbits, the ideas round them
  altHead($('#altHead'), { six: etnos.filter(isOriginalSix), alternatives: ALTS.alternatives })

  // --- one card per idea, in the page's order ---------------------------------------------------------------------
  const items = weighItems(ALTS)
  const cites = makeCites(PAPERS.papers)
  const said = s => `${auTint(esc(fill(s.text)))}${cites.html(s.cite)}`
  const row = (label, s, cls = '') => `<dt class="${cls}">${label}</dt><dd>${s.v ? `<b class="wg-v is-${s.v}">${VERDICT[s.v]}.</b> ` : ''}${said(s)}</dd>`
  const title = it => it.id === 'planet_nine' ? 'Planet Nine' : it.short
  const n = items.length + 1
  // first, how to read the figure, nothing dimmed (2026-11-18, asked for)
  const intro = `<div class="step" data-step="intro"><div class="step-card wg-step is-intro">
      <div class="step-n">1 / ${n}</div>
      <h3>The ideas side by side</h3>
      <ul>
        <li>The further right an idea sits, the more of the clustering it explains.</li>
        <li>The higher up an idea sits, the more it relies on things that have never been observed.</li>
      </ul>
    </div></div>`
  $('#weighSteps').innerHTML = intro + items.map((it, i) => `<div class="step" data-step="${it.id}"><div class="step-card wg-step">
      <div class="step-n">${i + 2} / ${n}</div>
      <h3${it.id === 'inclination_instability' ? ' data-no-tint' : ''}><span class="step-ic${it.ids.length > 1 ? ' is-two' : ''}" aria-hidden="true">${it.ids.map(id => ROW_ART[id]?.() || '').join('')}</span>${esc(title(it))}</h3>
      <figure class="wg-fig${it.ids.length > 1 ? ' is-two' : ''}" aria-hidden="true">${it.ids.map(id => PANEL_ART[id]?.() || '').join('')}</figure>
      <dl class="wg-dl">${row('Stretch', it.fits.stretch)}${row('Tilt', it.fits.tilt)}${row('Issue', it.issue, 'is-issue')}</dl>
    </div></div>`).join('') +
    // the end: no card, the figure fills the width, everything lit
    '<div class="step wg-end" data-step="end" aria-hidden="true"></div>'

  // --- the figure, then the story ------------------------------------------------------------------------------------
  const story = $('#weighStory')
  const chart = makeWeigh($('#weighView'), {
    items, tiers: ALTS.tiers, odds: `1 in ${odds}`,
    // an idea clicked: its card
    onPick: id => story.querySelector(`.step[data-step="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
  })
  scrolly(story, {
    onStep: (i, id) => {
      story.classList.toggle('is-full', id === 'end')
      chart.focus(id === 'intro' || id === 'end' ? null : id)
    },
  })
}

main().catch(showLoadError)
