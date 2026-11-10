// Part 1, page 3: a telescope finding an arc (the head graphic), every
// observatory behind the extreme objects on a map, how an orbit is pinned down
// from the pictures, a game on real archive frames, every known body beyond
// Neptune narrowed to the few the case uses, and how long each was watched.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { drawDataHero } from '../charts/datahero.js'
import { makeScopeMap } from '../charts/scopes.js'
import { makeSpotGame } from '../charts/spotgame.js'
import { buildBlinks } from '../charts/tracking.js'
import { ORBIT_ART } from '../charts/orbitart.js'
import { makeCatalogue } from '../charts/catalogue.js'
import { drawArcs } from '../charts/arcs.js'
import { STRICT } from '../sample.js'
import { isOriginalSix } from '../orbits.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',')


const getJSON = p => fetch(url(p)).then(r => (r.ok ? r.json() : null)).catch(() => null)

async function main () {
  const [{ etnos, observatories: obs, positions }, photos, tracking, game] = await Promise.all([
    loadData('etnos', 'observatories', 'positions'),
    getJSON('telescopes/credits.json'), getJSON('tracking/credits.json'), getJSON('game/game.json'),
  ])

  // --- the head graphic --------------------------------------------------------------
  const ground = obs.observatories.filter(r => r.lat != null)
  drawDataHero($('#dataHero'), { nGround: ground.length, nObjects: obs.n_objects, nObs: fmt(obs.n_obs), cut: STRICT.aMin })

  // --- the telescopes ---------------------------------------------------------------
  // where the new ones are found: every extreme object first seen since Rubin opened, and how many of them were Rubin's
  const rubin = obs.observatories.find(r => r.code === 'X05')
  const firstSeen = new Map(etnos.map(o => [o.id, +String(o.first_obs || '').slice(0, 4)]))
  const recent = rubin && {
    since: rubin.first_year,
    all: new Set(obs.observatories.flatMap(r => r.discovered).filter(id => firstSeen.get(id) >= rubin.first_year)).size,
    rubin: rubin.discovered.filter(id => firstSeen.get(id) >= rubin.first_year).length,
  }
  // the cards name the objects discovered at each site; the "nearest to you" pin is on the map itself
  const names = new Map(etnos.map(o => [o.id, o.name || o.provisional_desig || o.id]))
  makeScopeMap($('#scopeMap'), obs, photos?.photos || [], { recent, names })

  // --- from pictures to orbits ---------------------------------------------------------
  document.querySelectorAll('#orbit .definition li[data-art]').forEach(li => {
    li.insertAdjacentHTML('afterbegin', `<figure class="rule-fig" aria-hidden="true">${ORBIT_ART[li.dataset.art]()}</figure>`)
  })

  // --- your turn at the telescope, and three more discoveries ------------------------------
  if (game?.rounds?.length) makeSpotGame($('#game'), game.rounds)
  else $('#game').hidden = true
  if (tracking) {
    // the small players carry no caption; the line beside each says what it shows, and the
    // credit goes under it as one short dim line (the full one is on the credits page)
    const short = { ...tracking, images: tracking.images.map(im => ({ ...im, caption: '', credit: '' })) }
    buildBlinks(short, { pluto: $('#blinkPluto'), sedna: $('#blinkSedna'), bp519: $('#blinkBP519') })
    for (const [id, el] of [['pluto', '#blinkPluto'], ['sedna', '#blinkSedna'], ['bp519', '#blinkBP519']]) {
      const im = tracking.images.find(x => x.id === id)
      if (im) $(el).closest('li').insertAdjacentHTML('beforeend', `<p class="find-credit">${im.license} · <a href="${url('credits.html')}#photos">credits</a></p>`)
    }
  }

  // --- every known body beyond Neptune, level by level --------------------------------
  const six = isOriginalSix
  const objects = etnos.map(o => ({
    ...o, levels: ['extreme', ...(o.well_determined ? ['measured'] : []), ...(six(o) ? ['six'] : [])],
  }))
  const count = id => objects.filter(o => o.levels.includes(id)).length
  // the query on the map: each row adds a condition to the one above; choosing a row runs the query down
  // to it. Under the rows, the chosen condition's definition (none for "beyond Neptune", which says it):
  // the sample's cut (sample.js), the papers' rule, the original paper.
  const au = v => `<span class="k-au">${v} AU</span>`
  const QUERY = [
    { id: 'all', cond: 'beyond Neptune', n: positions.tnos.n, def: '' },
    { id: 'extreme', cond: 'with extreme orbits', n: count('extreme'), def: `Averaging past ${au(STRICT.aMin)}, never within ${au(STRICT.qMin)}.` },
    { id: 'measured', cond: 'and reliable orbits', n: count('measured'), def: 'Seen in more than one year.' },
    { id: 'six', cond: 'that first pointed to Planet Nine', n: count('six'), def: `The six of the original paper<sup class="cite"><a href="${url('credits.html')}#cite-batygin-brown-2016">1</a></sup>.` },
  ]
  const asOf = new Date(positions.epoch_cal + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const query = $('#catQuery')
  query.innerHTML = `<div class="q-head">JPL › known objects <span>${asOf}</span></div>
    <ol class="q-rows">${QUERY.map((q, i) => `<li><button type="button" data-level="${q.id}" aria-pressed="${i === 0}">
      <i class="q-mark" aria-hidden="true"></i><span class="q-cond">${q.cond}</span><span class="q-n">${fmt(q.n)}</span></button></li>`).join('')}</ol>
    <p class="q-def" aria-live="polite"></p>
    <label class="q-orbits"><input type="checkbox" id="catOrbits" disabled> Draw their orbits</label>`
  const cat = makeCatalogue($('#catMap'), { tnos: positions.tnos, objects, reserve: () => matchMedia('(max-width: 700px)').matches ? 0 : query.offsetWidth + 24 })
  function runQuery (id) {
    const depth = QUERY.findIndex(q => q.id === id)
    query.querySelectorAll('[data-level]').forEach((b, i) => {
      b.setAttribute('aria-pressed', String(i === depth))
      b.parentElement.classList.toggle('is-on', i <= depth)
    })
    query.querySelector('.q-def').innerHTML = QUERY[depth].def
    $('#catOrbits').disabled = id === 'all'
    cat.setLevel(id)
  }
  query.addEventListener('click', ev => { const b = ev.target.closest('[data-level]'); if (b) runQuery(b.dataset.level) })
  $('#catOrbits').addEventListener('change', ev => cat.setOrbits(ev.target.checked))
  runQuery('all')

  // --- watched longer, known better ---------------------------------------------------
  drawArcs($('#arcChart'), etnos.map(o => ({ ...o, rec: obs.objects[o.id] })).filter(o => o.rec?.nights.length))
  // the chart, with the section's title and line over it, fits one screen: its cap leaves room for the head
  const fitArcs = () => {
    const sec = $('#arcs'), head = sec.querySelector('.sec-head')
    const room = parseFloat(getComputedStyle(sec).paddingTop) + head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom || 0) + 12
    $('#arcChart').style.setProperty('--arc-head', `${Math.round(room)}px`)
  }
  fitArcs()
  addEventListener('resize', fitArcs)
}

main().catch(showLoadError)
