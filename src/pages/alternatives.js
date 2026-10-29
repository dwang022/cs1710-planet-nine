// Part 3, page 2: the competing explanations and the case against a planet.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawMatrix } from '../charts/matrix.js'
import { drawField, PICK } from '../charts/field.js'

const $ = s => document.querySelector(s)

async function main () {
  const { alternatives: ALTS, papers: PAPERS, field_timeline: FIELD } = await loadData('alternatives', 'papers', 'field_timeline')
  let selected = null

  const mark = (fill, how) => `<svg width="18" height="18" viewBox="-11 -11 22 22" aria-hidden="true">
    <circle r="9" fill="none" stroke="${fill}" stroke-width="2"/>
    ${how === 'full' ? `<circle r="9" fill="${fill}"/>` : ''}
    ${how === 'half' ? `<path d="M 0,-9 A 9,9 0 0,1 0,9 Z" fill="${fill}"/>` : ''}</svg>`
  $('#matrixLegend').innerHTML = `
    <div class="legend-item">${mark('var(--series-3)', 'full')}Accounts for it</div>
    <div class="legend-item">${mark('var(--series-2)', 'half')}Partly accounts for it</div>
    <div class="legend-item">${mark('var(--text-muted)', 'none')}Does not account for it</div>`

  function renderMatrix () {
    drawMatrix($('#chartMatrix'), {
      alternatives: ALTS.alternatives, phenomena: ALTS.phenomena, selected,
      onSelect: id => { selected = id; renderMatrix(); renderDetail() },
    })
  }
  function renderDetail () {
    const el = $('#altDetail')
    const a = ALTS.alternatives.find(x => x.id === selected)
    if (!a) { el.innerHTML = ''; return }
    const colours = { mainstream: 'var(--series-3)', viable: 'var(--series-1)', fringe: 'var(--series-2)' }
    const cites = (a.key_dois || []).map(doi => PAPERS.papers.find(p => p.doi === doi)).filter(Boolean)
    el.innerHTML = `
      <div class="detail">
        <div class="eyebrow">Selected explanation</div>
        <h4>${a.name} <span class="status-chip" style="background:${colours[a.status] || 'var(--surface-3)'}22;color:${colours[a.status] || 'var(--text-muted)'}">${a.status}</span></h4>
        <div class="d-lede">${a.one_liner}</div>
        <div class="detail-cols">
          <div><h5>Accounts for</h5><ul>${a.explains.map(x => `<li>${x}</li>`).join('')}</ul></div>
          <div><h5>Struggles with</h5><ul>${a.struggles_with.map(x => `<li>${x}</li>`).join('')}</ul></div>
        </div>
        ${cites.length ? `<p class="caption" style="margin-top:16px">Key papers: ${cites.map(c => `<a href="${c.arxiv_url || c.url}">${c.label}</a>`).join(' · ')}</p>` : ''}
      </div>`
  }
  renderMatrix()
  let t
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(renderMatrix, 180) })

  drawField($('#againstLedger'), { timeline: FIELD, papers: PAPERS.papers, legend: $('#againstLegend'), filter: PICK.against, future: false, lanes: ['against', 'data'] })
}

main().catch(showLoadError)
