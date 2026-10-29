// Part 1, page 2: the zoom-out, the discovery frames, the arc chart, the
// catalogue cards, and the grid of every catalogued body.

import * as d3 from 'd3'
import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { makeDistance, fmtAu, lightTime } from '../charts/distance.js'
import { buildBlinks, drawArcChart, drawGrid } from '../charts/tracking.js'
import { scrolly, scrollyProgress } from '../scrolly.js'
import { PLANET_NINE } from '../orbits.js'
import { STRICT, selected, withAlignment } from '../sample.js'

const $ = s => document.querySelector(s)
const fmt = d3.format(',.0f')
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// The six objects Batygin & Brown (2016) built the proposal on.
const ORIGINAL_SIX = ['Sedna', '2012 VP113', '2004 VN112', '2010 GB174', '2007 TG422', '2013 RF98']

async function main () {
  const [{ etnos, planets, planet_nine_predictions: preds, catalogue_samples: cat, tno_summary: summary }, credits] = await Promise.all([
    loadData('etnos', 'planets', 'planet_nine_predictions', 'catalogue_samples', 'tno_summary'),
    fetch(url('tracking/credits.json')).then(r => r.json()),
  ])
  const PLANETS = planets.planets.map(p => ({ name: p.name, a: p.a, e: p.e, q: p.a * (1 - p.e), Q: p.a * (1 + p.e) }))

  // --- the zoom-out ------------------------------------------------------------
  const bb21 = preds.orbit_predictions.find(p => p.is_default) || {}
  const distance = makeDistance($('#chartDist'), {
    planets: PLANETS,
    p9: { a: PLANET_NINE.a_au, e: PLANET_NINE.e, aErr: bb21.a_au_err || [0, 0], eErr: bb21.e_err || [0, 0] },
  })
  $('#distP9q').textContent = fmt(distance.p9.q); $('#distP9Q').textContent = fmt(distance.p9.Q)
  $('#distP9min').textContent = fmt(distance.p9.qMin); $('#distP9max').textContent = fmt(distance.p9.QMax)

  // The zoom-out draws one fixed group, the well-measured extreme objects:
  // briefly observed orbits have far ends too uncertain to put on a ruler.
  const objs = withAlignment(selected(etnos, STRICT))
  const far = objs.reduce((m, o) => (o.Q_au > m.Q_au ? o : m))
  $('#distFarAu').textContent = `${fmtAu(far.Q_au)} (${far.name || far.provisional_desig || far.id})`

  // The width of the view, in AU, at each card; scrolling eases between them in log space.
  const as = objs.map(o => o.a_au).sort(d3.ascending)
  const extreme = Math.max(420, (d3.quantile(as, 0.75) || 500) * 1.6)
  const keys = [1.75, 11.5, 34, 56, extreme, Math.max(extreme, distance.p9.QMax * 1.12), distance.viewFor(far)]
  for (let i = 1; i < keys.length; i++) keys[i] = Math.max(keys[i], keys[i - 1] * 1.05)

  let step = 'home', progress = { k: 0, t: 0 }
  distance.update({ objects: objs, showP9: true, far, step })
  function applyView () {
    const { k, t } = progress
    const a = keys[Math.min(k, keys.length - 1)], b = keys[Math.min(k + 1, keys.length - 1)]
    const u = Math.min(1, Math.max(0, (t - 0.25) / 0.5)), s = u * u * (3 - 2 * u)
    const view = Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * s)
    distance.setView(view)
    $('#distReadout').innerHTML = `Sun out to <b>${fmtAu(view)}</b> · light takes <b>${lightTime(view)}</b> to cross this view`
  }
  scrolly($('#distStory'), { onStep: (i, s) => { step = s; distance.update({ step: s }) } })
  scrollyProgress($('#distStory'), (k, t) => { progress = { k, t }; applyView() })

  // --- numbers quoted in the text ------------------------------------------------
  const nums = {
    strictN: objs.length,
    shortN: etnos.filter(o => !o.well_determined).length,
    total: summary.n_objects_a_gt_30.toLocaleString(),
    matched: summary.n_matched_to_mpc.toLocaleString(),
  }
  document.querySelectorAll('[data-n]').forEach(el => { el.textContent = nums[el.dataset.n] ?? '—' })

  // --- the discovery frames -----------------------------------------------------------
  buildBlinks(credits, { pluto: $('#blinkPluto'), sedna: $('#blinkSedna'), vp113: $('#blinkVP113'), bp519: $('#blinkBP519') })

  // --- arc against disagreement ---------------------------------------------------------
  drawArcChart($('#chartArc'), etnos)

  // --- the catalogue cards -----------------------------------------------------------
  const j = cat.jpl, m = cat.mpc
  const row = (k, v, b) => `<dt>${esc(k)}</dt><dd>${b ? `<b>${esc(v)}</b>` : esc(v)}</dd>`
  $('#cardJpl').innerHTML = `
    <h3>JPL Small-Body Database</h3>
    <div class="who">NASA's Jet Propulsion Laboratory, Solar System Dynamics group · one record per body, orbit fitted by JPL</div>
    <p>A queryable database of every asteroid, comet and distant body with a known orbit. This site asked it for
    everything with an average distance beyond 30 AU and got <b>${cat.counts.jpl_rows_a_gt_30.toLocaleString()} rows</b>
    of <b>${cat.counts.jpl_fields} fields</b> each: the orbit, how well it is known, and when and how often the object was observed.</p>
    <pre><i>GET</i> ${esc(cat.query.endpoint)}
  <b>sb-kind</b>=a  <b>full-prec</b>=true
  <b>sb-cdata</b>=${esc(cat.query['sb-cdata'])}
  <b>fields</b>=spkid,full_name,e,a,q,i,om,w,ma,epoch,
         data_arc,first_obs,last_obs,n_obs_used,condition_code,…</pre>
    <div class="eyebrow" style="margin:16px 0 4px">Sedna, as JPL stores it</div>
    <dl class="record">
      ${row('full_name', j.full_name.trim(), true)}${row('a (AU)', j.a)}${row('e', j.e)}${row('q (AU)', j.q)}
      ${row('i (°)', j.i)}${row('om (node, °)', j.om)}${row('w (arg. peri., °)', j.w)}${row('ma (°)', j.ma)}
      ${row('epoch', j.epoch_cal)}${row('data_arc (days)', j.data_arc, true)}${row('first_obs', j.first_obs)}${row('last_obs', j.last_obs)}
      ${row('n_obs_used', j.n_obs_used, true)}${row('condition_code', j.condition_code, true)}${row('orbit_id', j.orbit_id)}
    </dl>
    <p class="caption" style="margin-top:12px">Condition code 0 to 9: how uncertain the orbit is. Sedna's ${j.condition_code} is as good as it gets
    for a body this far out. <code>data_arc</code> of ${Number(j.data_arc).toLocaleString()} days is ${(j.data_arc / 365.25).toFixed(0)} years of photographs,
    counting ones found in old archives after the discovery.</p>`
  $('#cardMpc').innerHTML = `
    <h3>Minor Planet Center</h3>
    <div class="who">The IAU's clearing house for observations, run at the Smithsonian Astrophysical Observatory · every measured position, and the MPC's own orbit fit</div>
    <p>Every observation of a small body, from a 1930 plate to last night's survey image, is reported here first.
    The Center assigns designations, numbers and names, and publishes orbit files anyone can download. This site uses
    its distant-object file (<b>${cat.counts.mpc_distant_rows.toLocaleString()} rows</b>) as an independent check on JPL,
    and its list of <b>${cat.counts.mpc_numbered_lines.toLocaleString()} numbered bodies</b> for who found what, where and when.</p>
    <pre><i>GET</i> https://www.minorplanetcenter.net/Extended_Files/distant_extended.json.gz
<i>GET</i> https://www.minorplanetcenter.net/iau/lists/NumberedMPs.txt</pre>
    <div class="eyebrow" style="margin:16px 0 4px">Sedna, as the MPC stores it</div>
    <dl class="record">
      ${row('Number · Name', `${m.Number} ${m.Name}`, true)}${row('Principal_desig', m.Principal_desig)}${row('a', m.a)}${row('e', m.e)}
      ${row('Perihelion_dist', m.Perihelion_dist)}${row('Aphelion_dist', m.Aphelion_dist)}${row('i', m.i)}${row('Node', m.Node)}${row('Peri', m.Peri)}
      ${row('Arc_years', m.Arc_years, true)}${row('Num_opps', m.Num_opps, true)}${row('Num_obs', m.Num_obs, true)}${row('U (uncertainty)', m.U, true)}
      ${row('Last_obs', m.Last_obs)}${row('Orbit_type', m.Orbit_type)}
    </dl>
    <p class="caption" style="margin-top:12px">Same object, same photographs, a different fit: JPL puts Sedna's average distance at
    ${Number(j.a).toFixed(2)} AU and the MPC at ${Number(m.a).toFixed(2)} AU, a ${(100 * Math.abs(j.a - m.a) / j.a).toFixed(4)}% disagreement.
    <code>Num_opps</code> ${m.Num_opps}: it has been observed in ${m.Num_opps} separate years.</p>
    ${cat.numbered ? `<div class="eyebrow" style="margin:16px 0 4px">…and in the numbered-object list</div><pre>${esc(cat.numbered)}</pre>` : ''}`

  // --- the grid ---------------------------------------------------------------------
  const six = etnos.filter(o => ORIGINAL_SIX.includes(o.name) || ORIGINAL_SIX.includes(o.provisional_desig)).length
  const tiers = [
    { n: summary.n_objects_a_gt_30, label: 'bodies with an average distance beyond 30 AU (the JPL query)', colour: '#3a3a36' },
    { n: summary.n_a_gt_100, label: 'of them reach beyond 100 AU', colour: '#5a5a54' },
    { n: summary.n_etno_a150_q30, label: 'are "extreme": beyond 150 AU, never closer than 30 AU', colour: '#3987e5', opacity: 0.45 },
    { n: summary.n_etno_well_determined, label: 'of those have well-measured orbits: the sample this site trusts', colour: '#3987e5' },
    { n: six, label: 'were the six orbits the 2016 proposal was built on', colour: '#199e70' },
  ]
  drawGrid($('#chartGrid'), { tiers })
  $('#gridLegend').innerHTML = tiers.map(t => `<li><i style="background:${t.colour};opacity:${t.opacity ?? 1}"></i><span><b>${t.n.toLocaleString()}</b> ${t.label}</span></li>`).join('')
}

main().catch(showLoadError)
