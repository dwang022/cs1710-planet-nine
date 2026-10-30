// Part 1, page 3: a telescope finding an arc (the head graphic), every
// observatory behind the extreme objects on a map, how an orbit is pinned down
// from the pictures, a game on real discovery frames, every known body beyond
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
import { fmtAu } from '../charts/distance.js'
import { STRICT } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',')

// The six objects Batygin & Brown (2016) built the proposal on.
const ORIGINAL_SIX = ['Sedna', '2012 VP113', '2004 VN112', '2010 GB174', '2007 TG422', '2013 RF98']

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
  const map = makeScopeMap($('#scopeMap'), obs, photos?.photos || [])
  $('#findMe').addEventListener('click', () => {
    const note = $('#findNote')
    if (!navigator.geolocation) { note.textContent = 'This browser cannot share a location.'; return }
    note.textContent = 'Asking your browser where you are…'
    navigator.geolocation.getCurrentPosition(p => {
      map.locate(p.coords.latitude, p.coords.longitude)
      note.textContent = 'Your location stays in your browser.'
    }, () => { note.textContent = 'No location shared.' }, { timeout: 15000, maximumAge: 600000 })
  })

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
  const six = o => ORIGINAL_SIX.includes(o.name) || ORIGINAL_SIX.includes(o.provisional_desig)
  const objects = etnos.map(o => ({
    ...o, levels: ['extreme', ...(o.well_determined ? ['measured'] : []), ...(six(o) ? ['six'] : [])],
  }))
  const count = id => objects.filter(o => o.levels.includes(id)).length
  const LEVELS = [
    { id: 'all', name: 'Beyond Neptune', n: positions.tnos.n, note: 'Every known one.' },
    { id: 'extreme', name: 'Extreme orbits', n: count('extreme'), note: 'Out of Neptune\'s reach.' },
    { id: 'measured', name: 'Seen again', n: count('measured'), note: 'In more than one season.' },
    { id: 'six', name: 'The 2016 six', n: count('six'), note: 'Where the idea began.' },
  ]
  const asOf = new Date(positions.epoch_cal + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  const cat = makeCatalogue($('#catMap'), { tnos: positions.tnos, objects, asOf })
  const levelsEl = $('#catLevels')
  levelsEl.innerHTML = LEVELS.map((l, i) => `<button type="button" class="cat-level" data-level="${l.id}" aria-pressed="${i === 0}">
      <span class="n">${fmt(l.n)}</span><b>${l.name}</b><span class="lvl-note">${l.note}</span></button>`).join('')
  levelsEl.addEventListener('click', ev => {
    const b = ev.target.closest('[data-level]')
    if (!b) return
    levelsEl.querySelectorAll('[data-level]').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
    cat.setLevel(b.dataset.level)
    $('#catOrbits').disabled = b.dataset.level === 'all'
  })
  $('#catOrbits').disabled = true
  $('#catOrbits').addEventListener('change', ev => cat.setOrbits(ev.target.checked))

  // --- watched longer, known better ---------------------------------------------------
  drawArcs($('#arcChart'), etnos.map(o => ({ ...o, rec: obs.objects[o.id] })).filter(o => o.rec?.nights.length))

  // --- numbers quoted in the text ------------------------------------------------
  const sedna = etnos.find(o => o.name === 'Sedna')
  const nums = { sednaQ: sedna ? fmtAu(sedna.q_au) : '—' }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })
}

main().catch(showLoadError)
