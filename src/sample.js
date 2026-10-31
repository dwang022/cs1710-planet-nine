// Which extreme objects count. The reader's choice is shared between the
// clustering and probability pages (and remembered between visits), so a
// filter set on one page is the filter the other page shows.

import { angleDiff, PLANET_NINE } from './orbits.js'

const KEY = 'p9-sample'

export const DEFAULTS = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true, showP9: true }
/** The fixed samples the guided steps describe, so their numbers never move under the reader. */
export const STRICT = { aMin: 150, qMin: 30, aMax: Infinity, qMax: Infinity, quality: true }
export const LOOSE = { ...STRICT, quality: false }

export function loadSample () {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (s && typeof s === 'object') {
      return { ...DEFAULTS, ...s, aMax: s.aMax == null ? Infinity : s.aMax, qMax: s.qMax == null ? Infinity : s.qMax }
    }
  } catch {}
  return { ...DEFAULTS }
}

export function saveSample (s) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, aMax: isFinite(s.aMax) ? s.aMax : null, qMax: isFinite(s.qMax) ? s.qMax : null }))
  } catch {}
}

/** The objects that pass a sample definition. */
export function selected (etnos, s) {
  return etnos.filter(o =>
    o.a_au >= s.aMin && o.a_au <= s.aMax &&
    (o.q_au ?? 0) >= s.qMin && (o.q_au ?? 0) <= s.qMax &&
    (!s.quality || o.well_determined))
}

/** Tag each object with which side of the predicted planet it points. */
export function withAlignment (objects) {
  return objects.map(o => {
    const d = angleDiff(o.varpi_deg, PLANET_NINE.varpi_deg)
    return { ...o, delta_varpi_deg: d, alignment: Math.abs(d) > 90 ? 'anti-aligned' : 'aligned' }
  })
}

export const isBoxed = s => isFinite(s.aMax) || isFinite(s.qMax)

/**
 * The filter controls, rendered into `root`. `onChange` runs after every
 * change with the updated state. Returns { sync } to push state back into the
 * controls when something else changes it.
 */
export function renderControls (root, state, onChange, { note = 'Changes every chart below', showP9 = true } = {}) {
  root.innerHTML = `
    <div class="controls" role="group" aria-label="Choose which objects count">
      <div class="controls-head">
        <div class="eyebrow">Which objects count · ${note}</div>
        <button class="btn-reset" type="button" data-reset>Reset</button>
      </div>
      <div class="filter-grid">
        <div class="filter">
          <label class="filter-name" for="aMin">Average distance at least <b class="k-au"><span data-v="aMin">${state.aMin}</span> AU</b></label>
          <input type="range" id="aMin" min="100" max="400" step="10" value="${state.aMin}" />
        </div>
        <div class="filter">
          <label class="filter-name" for="qMin">Never nearer the Sun than <b class="k-au"><span data-v="qMin">${state.qMin}</span> AU</b></label>
          <input type="range" id="qMin" min="30" max="60" step="1" value="${state.qMin}" />
        </div>
        <div class="filter">
          <label class="filter-name" for="quality">Only objects seen in more than one season</label>
          <label class="toggle" for="quality"><input type="checkbox" id="quality" ${state.quality ? 'checked' : ''} /><span class="box"></span><span class="state"></span></label>
        </div>
        <div class="filter"${showP9 ? '' : ' hidden'}>
          <label class="filter-name" for="showP9"><svg class="art" viewBox="0 0 100 100" aria-hidden="true"><use href="#art-planet-nine-mark"/></svg> Show Planet Nine</label>
          <label class="toggle" for="showP9"><input type="checkbox" id="showP9" ${state.showP9 ? 'checked' : ''} /><span class="box"></span><span class="state"></span></label>
          <p class="filter-desc">Draws the predicted planet for comparison. It never changes the numbers.</p>
        </div>
      </div>
    </div>`
  const box = root.querySelector('.controls')
  const $ = s => box.querySelector(s)
  const fire = () => { saveSample(state); onChange(state) }
  $('#aMin').addEventListener('input', e => { state.aMin = +e.target.value; state.aMax = Infinity; state.qMax = Infinity; $('[data-v=aMin]').textContent = state.aMin; fire() })
  $('#qMin').addEventListener('input', e => { state.qMin = +e.target.value; state.aMax = Infinity; state.qMax = Infinity; $('[data-v=qMin]').textContent = state.qMin; fire() })
  $('#quality').addEventListener('change', e => { state.quality = e.target.checked; fire() })
  $('#showP9').addEventListener('change', e => { state.showP9 = e.target.checked; fire() })
  $('[data-reset]').addEventListener('click', () => { Object.assign(state, DEFAULTS); sync(); fire() })
  function sync () {
    $('#aMin').value = state.aMin; $('[data-v=aMin]').textContent = Math.round(state.aMin)
    $('#qMin').value = state.qMin; $('[data-v=qMin]').textContent = Math.round(state.qMin)
    $('#quality').checked = state.quality; $('#showP9').checked = state.showP9
  }
  return { sync, el: box }
}
