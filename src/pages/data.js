// Part 1, page 3: how the objects are found and tracked (the real discovery
// frames and the arc chart), the two catalogues that hold them, and the grid
// of every catalogued body.

import '../site.js'
import { loadData, showLoadError, url } from '../data.js'
import { buildBlinks, drawArcChart, drawGrid } from '../charts/tracking.js'

const $ = s => document.querySelector(s)
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

// The six objects Batygin & Brown (2016) built the proposal on.
const ORIGINAL_SIX = ['Sedna', '2012 VP113', '2004 VN112', '2010 GB174', '2007 TG422', '2013 RF98']

async function main () {
  const [{ etnos, catalogue_samples: cat, tno_summary: summary }, credits] = await Promise.all([
    loadData('etnos', 'catalogue_samples', 'tno_summary'),
    fetch(url('tracking/credits.json')).then(r => r.json()),
  ])

  // --- numbers quoted in the text ------------------------------------------------
  const nums = {
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
    { n: summary.n_etno_a150_q30, label: 'are "extreme": beyond 150 AU, never closer than 30 AU', colour: '#a78bfa', opacity: 0.45 },
    { n: summary.n_etno_well_determined, label: 'of those have well-measured orbits: the sample this site trusts', colour: '#a78bfa' },
    { n: six, label: 'were the six orbits the 2016 proposal was built on', colour: 'var(--p9)' },
  ]
  drawGrid($('#chartGrid'), { tiers })
  $('#gridLegend').innerHTML = tiers.map(t => `<li><i style="background:${t.colour};opacity:${t.opacity ?? 1}"></i><span><b>${t.n.toLocaleString()}</b> ${t.label}</span></li>`).join('')
}

main().catch(showLoadError)
