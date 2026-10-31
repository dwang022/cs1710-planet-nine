// Fetching the processed datasets from public/data/, wherever the site is
// served from (import.meta.env.BASE_URL is '/' in dev and whatever the
// deployment sets).

import { fontsReady } from './fonts.js'

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')

/** A root-relative site path ('data/etnos.json', '/art/svg/sun.svg') made absolute for this deployment. */
export const url = p => `${BASE}/${String(p).replace(/^\//, '')}`

async function getJSON (name) {
  const u = url(`data/${name}.json`)
  const r = await fetch(u)
  if (!r.ok) throw new Error(`${u} → ${r.status}`)
  return r.json()
}

/**
 * Load several datasets at once: `await loadData('etnos', 'planets')` gives
 * `{ etnos, planets }`. Names are the file names in public/data/ without .json.
 */
export async function loadData (...names) {
  // the charts draw once the data and the fonts are both in (fonts.js)
  const [all] = await Promise.all([Promise.all(names.map(getJSON)), fontsReady])
  return Object.fromEntries(names.map((n, i) => [n, all[i]]))
}

/** Show a load failure where the reader will see it. */
export function showLoadError (err) {
  console.error(err)
  const main = document.querySelector('main') || document.body
  main.insertAdjacentHTML('afterbegin',
    `<div class="wrap" style="padding:40px 24px;color:var(--series-2)">Could not load data: ${err.message}</div>`)
}
