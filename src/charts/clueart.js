// The four clues on the alternatives page, one small drawing each, in the
// manner of orbitintro.js (300 × 170 boxes, laid out by the .definition list),
// keyed by the phenomenon ids in alternatives.json. Distances are square-rooted,
// as in the page's head, so the far orbits and Neptune fit one box.
//
//   clustering    the six orbits that first pointed to Planet Nine, all one way (real elements)
//   detached      Sedna's real orbit and Neptune's, with the gap between them
//   inclined      seen edge-on: the planets' orbits flat, one distant orbit tipped up out of them
//   nondetection  an observatory aimed at a patch of sky on the predicted path, and nothing there

import * as d3 from 'd3'
import { flatOrbit } from '../orbits.js'

const VIOLET = 'var(--series-1)', MUTED = '#8c8b83', DIM = '#5a5a64'
const W = 300, H = 170
const open = `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">`
const f1 = n => n.toFixed(1)
const sun = (x, y, s = 16) => `<use href="#art-sun" x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${s}" height="${s}"/>`
// distance square-rooted, direction kept: AU → picture units with the Sun at 0
const warp = ([x, y]) => { const r = Math.hypot(x, y); return r ? [x * Math.sqrt(r) / r, -y * Math.sqrt(r) / r] : [0, 0] }

/** six: the six founding objects; sedna: its row in etnos.json. */
export function clueArt ({ six, sedna }) {
  return {
    clustering: () => {
      const paths = six.map(o => flatOrbit(o.a_au, o.e, o.varpi_deg, 160).map(warp))
      const all = paths.flat()
      const [x0, x1] = d3.extent(all, p => p[0]), [y0, y1] = d3.extent(all, p => p[1])
      const k = Math.min((W - 40) / (x1 - x0), (H - 24) / (y1 - y0))
      const at = ([x, y]) => [W / 2 + (x - (x0 + x1) / 2) * k, H / 2 + (y - (y0 + y1) / 2) * k]
      const s = at([0, 0])
      return `${open}${paths.map(p => `<path d="${d3.line()(p.map(at))}" fill="none" stroke="${VIOLET}" stroke-width="1.6"/>`).join('')}${sun(...s)}</svg>`
    },

    detached: () => {
      // the near end to the right; Neptune's orbit as a circle, Sedna's oval clear of it
      const k = 6, S = [236, H / 2]
      const at = ([x, y]) => [S[0] + x * k, S[1] + y * k]
      const sednaPath = d3.line()(flatOrbit(sedna.a_au, sedna.e, 0, 200).map(warp).map(at))
      const nep = Math.sqrt(30) * k, near = Math.sqrt(sedna.q_au) * k
      return `${open}<path d="${sednaPath}" fill="none" stroke="${VIOLET}" stroke-width="1.8"/>
        <circle cx="${S[0]}" cy="${S[1]}" r="${f1(nep)}" fill="none" style="stroke:var(--c-neptune)" stroke-width="1.8"/>
        ${sun(...S)}
        <circle cx="${f1(S[0] + near)}" cy="${S[1]}" r="3.4" fill="${VIOLET}"/></svg>`
    },

    inclined: () => {
      // edge-on, the planets' orbits are thin ovals on one line; a distant orbit tips up across them
      const c = [W / 2, H / 2 + 6]
      const flat = [118, 82, 48].map((rx, i) => `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${(rx * 0.06).toFixed(1)}" fill="none" stroke="${i ? DIM : MUTED}" stroke-width="1.3"/>`).join('')
      return `${open}${flat}
        <ellipse cx="${c[0] + 18}" cy="${c[1]}" rx="112" ry="14" fill="none" stroke="${VIOLET}" stroke-width="1.8" transform="rotate(-32 ${c[0]} ${c[1]})"/>
        ${sun(...c, 14)}</svg>`
    },

    nondetection: () => {
      // a few stars, the predicted path dashed across the sky, an empty ring where the telescope looked
      const rnd = d3.randomLcg(9)
      const stars = d3.range(46).map(() => [rnd() * W, rnd() * (H - 40)])
      const ring = [214, 42]
      return `${open}${stars.map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.6 + rnd() * 0.9)}" fill="#c7c5bc" opacity="${f1(0.3 + rnd() * 0.5)}"/>`).join('')}
        <path d="M-10,140 Q150,0 310,60" fill="none" style="stroke:var(--p9)" stroke-width="1.6" stroke-dasharray="2 5" stroke-linecap="round" opacity=".8"/>
        <circle cx="${ring[0]}" cy="${ring[1]}" r="22" fill="#0f0f11" fill-opacity=".7" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="4 4"/>
        <use href="#art-observatory" x="22" y="104" width="80" height="60"/></svg>`
    },
  }
}
