// Part 2, page 1: "what a planet's gravity would do", which closes the clustering
// page. One picture, With a planet, drawn like the page's head (leanhead.js: seen
// from above, to scale) so the reader already knows how to read it, and beside it a
// small No planet picture with the notes under it.
//
//   No planet      sixteen distant orbits stretching out and tilting every which way; they stay scattered
//   With a planet  the same orbits, with Planet Nine going round its predicted orbit, in three acts, so
//                  its effects are seen apart (in reality they happen together). Each act shows the
//                  gravity at work, not just its result (2026-11-17: readers could not see how gravity
//                  did any of it):
//     1 Flung out    an object on an orbit stretching out the planet's way lights up on its orbit as the
//                    planet comes near (which are flung is a draw, likelier the nearer an orbit stretches to the
//                    planet's way: most of those along it go, one survives, one far round goes; 2026-11-17, asked
//                    for: a cutoff, every orbit within 80° flung and none beyond, hid that it is chance); a pull line runs from it to the planet, thicker and brighter the
//                    closer they are; as the planet passes, the object is pulled in behind it, swung round
//                    to its outer side and let go there along the way it is moving, so it overtakes the
//                    planet and runs on ahead, curving away from the Sun: the same slingshot for every one
//                    (a dotted trail ending inside the picture); its orbit fades
//     2 Turned round the planet speeds up (time passing) and every time it sweeps past on the near side
//                    of its orbit it nudges the remaining orbits: each brightens, shows a curved
//                    arrow at its far end and turns a notch towards stretching out the opposite way as the
//                    planet passes nearest it, so the turning follows the planet across the picture; resting
//                    while it is far out (the first nudge slow, the later ones quick); the notches add up, like pushes on a swing (the picture Batygin and Brown
//                    gave Caltech), and leave each orbit clear of the planet's path, leaving a faint copy
//                    where it started
//     3 Tilted alike the camera tips down to look along the planets' plane, from the side, both pictures
//                    together; the same nudges then tip the remaining orbits a notch at a time towards
//                    Planet Nine's own plane, until they tilt roughly the way it does, a loose bundle, not
//                    one line. The side view looks
//                    along the line where Planet Nine's orbit crosses the plane, so its orbit is a straight
//                    line tipped out of it.
//
//     4 Like 2016   the camera tips back up and Planet Nine's orbit eases back to its predicted shape, so the run
//                    ends on the page head's picture, the six named in a small key. Objects are flung until six are
//                    left, and those six are the six orbits of 2016, each started where the nudges carry it to its
//                    own place, worked backwards (2026-11-18, asked for: to show a cluster ending up as was seen)
//
// The orbits are drawn in 3-D (each has a tilt and the line it tilts about) and projected; from above,
// the tilts only squash them a little.
//
// Planet Nine's orbit is drawn more stretched than predicted (e = P9_E, against about 0.3; 2026-11-16):
// nearly round, every orbit seemed to cross it alike, and readers could not see why only some were flung.
// As an oval, the orbits that stretch out its way visibly run along its path, the others only cut across
// it. Its tilt and the line it tilts about are the predicted ones.
//
// The explanation is a short note beside the picture at the moments that matter, the run pausing on each
// until Continue, on every run, Play again's too:
//   start   what to watch; Start
//   flung   at the first object flung away, its trail still on the picture: a close pass pulls hard
//           enough to fling it, and orbits stretching out the planet's way meet it often
//   spared  once the last is gone: the further round an orbit stretches out, the less often it crosses the planet's
//           path and the less likely it is flung; which go is partly chance
//   turn    after a couple of nudges: the nudges add up and turn the orbits round, clear of its path
//   tilt    seen from the side, after a couple of nudges
//   end     what is left, and that with no planet they would stretch out and tilt every way; Play again
// No clock and no counts: it is a cartoon, so its years and tallies meant nothing. It shows what the
// proposal predicts and takes no side on whether it is right.
//
// A cartoon of the mechanism in Batygin & Brown (2016), not a simulation of gravity. The planet makes
// LAPS laps over act 1 (Kepler's speed along the way: slow at the far end), starting at its far end,
// where the head draws it, then FAST laps per unit of time from act 2 on. Each orbit drawn to be flung
// (its chance falling from certain within FLING_NEAR degrees of the planet's way to none beyond FLING_FAR)
// is flung at a moment when the planet really passes within REACH pixels of it, seen from above, worked
// out before the run, one at a time.

import * as d3 from 'd3'
import { positionAt, trueAnomaly, PLANET_NINE as REAL_P9 } from '../orbits.js'
import { seededRandom } from '../stats.js'

const S = 360
const c = S / 2
const R = 164                     // pixels from the Sun to the farthest any of the orbits reaches
let k = 1                         // pixels per AU, to scale as the head; set from the orbits in makeCompare
const N = 16
const FLING_NEAR = 20             // degrees from the planet's direction: an orbit this close is always flung,
const FLING_FAR = 140             // one this far round never, and between the two its chance falls off evenly
const FLING_SEED = 1716           // the draw: most along the planet's way go, one at 49° stays, one at 127° goes
const SQUEEZE = 0.5               // how much of its angle from the far side an orbit keeps once it has turned:
                                  // half, so they gather that way without bunching up (a quarter looked too drastic)
const KEEP_NODE = 0.2             // act 3: how much of its angle from Planet Nine's tilt an orbit keeps
const KEEP_TILT = 0.5             // and how much of the difference in steepness: a bundle, not one line (2026-11-17,
                                  // asked for; a tenth and a third left them all at the same tilt)
const LAPS = 5                    // the planet's laps per unit of time in act 1
const FAST = 15                   // and from act 2 on: a time-lapse, so its nudges come often enough to count
const REACH = 12                  // pixels: this close to the planet counts as a close pass
const PLAY_MS = 14000             // one unit of time
const PRE = 0.035                 // how long before a close pass the object lights up and the pull shows
const FLY = 0.045                 // share of the run an object takes to leave
const P9_E = 0.65                 // Planet Nine's orbit, stretched for the cartoon (see above)
const P9 = { a: REAL_P9.a_au, e: P9_E, varpi: REAL_P9.varpi_deg, node: REAL_P9.node_deg, i: REAL_P9.i_deg }
const FLING_BY = 0.43             // every object to be flung is gone by now (its trail faded before SPARED_AT)
const SPARED_AT = 0.47            // the last one's trail has faded (it lasts 3 × FLY): the note on the ones spared
const T1 = 0.5                    // act 1 (flung out) ends and act 2 (turned round) begins
const TURN = 0.3                  // how long act 2 lasts: the camera tips as soon as its last nudge is done
const NUDGE_FROM = 0.14           // a nudge turns (or tips) the orbits from this many laps before the planet's closest
const NUDGE_TO = 0.2              // point to the Sun to this many after: only while it is on the near side of its
                                  // orbit, the orbits resting while it is far out (2026-11-17)
const NOTCH = 0.3                 // share of a nudge over which one orbit turns its notch, centred on the moment the
                                  // planet passes nearest it, so the turning follows the planet along its path
                                  // (2026-11-17, asked for: a ring spreading from it did not show what did the nudging)
const SWING = 14                  // pixels: how far from the planet a flung object swings round it
const SWING_PATH = 26             // pixels the planet moves while an object swings round it: the same for every
                                  // fling, so every slingshot has the same hook wherever on its orbit the planet is
const SWING_MS = 500              // and how long the first swing lasts on screen: the run slows down for it (750 was
                                  // a tad slow, 2026-11-17)
const SWING_MS_NEXT = 260         // the later swings, quicker once the reader has seen one (2026-11-17)
const AFTER_FIRST = 1.6           // and the rest of act 1 runs this much faster
const SWING_AT = T1 + TURN        // act 3: the camera tips down to the side as soon as the turning is done
const TIP = 0.08
const SIDE_ZOOM = 1.18            // seen from the side the orbits are shorter, so the camera moves in a little
const TILT_AT = SWING_AT + TIP + 0.01   // and the orbits tip towards Planet Nine's plane
const TILT = 0.32
const GAP = 0.018                 // the least time between one object being flung and the next
const RAD = Math.PI / 180
const STEPS = 140                 // points along each orbit

const wrap180 = d => ((d + 540) % 360) - 180
const clamp01 = v => Math.max(0, Math.min(1, v))
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1])
const ease = d3.easeCubicInOut
const lerp = (p, q, f) => [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]

// The camera at time t: straight down from above until act 3, then tipped down to look along the plane, from the
// side, turned a little so it looks along the line Planet Nine's orbit tilts about; at the end, back up again.
let BACK_AT = Infinity            // when the camera tips back up (set once the run's acts are known)
const BACK = 0.1                  // and how long that, and the orbits easing into the six of 2016, takes
function camera (t) {
  const s = ease(clamp01((t - SWING_AT) / TIP)) * (1 - ease(clamp01((t - BACK_AT) / BACK)))
  return { s, up: (90 - 90 * s) * RAD, turn: (90 - P9.node) * s * RAD, zoom: 1 + (SIDE_ZOOM - 1) * s }
}
const project = ([x, y, z], cam) => {
  const x1 = x * Math.cos(cam.turn) - y * Math.sin(cam.turn)
  const y1 = x * Math.sin(cam.turn) + y * Math.cos(cam.turn)
  const Y = y1 * Math.sin(cam.up) + z * Math.cos(cam.up)
  return [c + x1 * k * cam.zoom, c - Y * k * cam.zoom]
}
// an orbit's shape in 3-D: which way its closest point lies (varpi), the line it tilts about (node) and how steeply (inc)
const orbitD = (a, e, st, cam) => {
  const w = st.varpi - st.node
  return d3.line()(d3.range(STEPS + 1).map(j => project(positionAt(a, e, st.inc, st.node, w, j * 360 / STEPS), cam)))
}
const pointAt = (a, e, st, nu, cam) => project(positionAt(a, e, st.inc, st.node, st.varpi - st.node, nu), cam)

// The planet's laps since the start: LAPS per unit of time in act 1, FAST after
const lapsAt = t => t <= T1 ? LAPS * t : LAPS * T1 + FAST * (t - T1)
// the moments between t0 and t1 when it passes its closest point to the Sun (half a lap on from its far end)
function passes (t0, t1) {
  const out = []
  for (let n = Math.ceil(lapsAt(t0) - 0.5); ; n++) {
    const t = T1 + (n + 0.5 - LAPS * T1) / FAST
    if (t > t1) return out
    if (t >= t0) out.push(t)
  }
}
// how far an act has got: each nudge moves an orbit one equal notch, eased in and out. phase runs from 0 to 1 over a
// nudge, the planet's passage of the near side of its orbit; `at` is the phase at which the planet passes nearest
// the orbit, the middle of its notch
const phase = (t, tk) => (lapsAt(t) - lapsAt(tk) + NUDGE_FROM) / (NUDGE_FROM + NUDGE_TO)
const notchAt = (t, tk, at) => clamp01((phase(t, tk) - at) / NOTCH + 0.5)
const notches = (list, t, at = 0.5) => d3.sum(list, tk => d3.easeSinInOut(notchAt(t, tk, at))) / (list.length || 1)
// how hard the planet is tugging an orbit now: 0 outside its notch, 1 in the middle
const tugOf = (list, t, at) => { for (const tk of list) { const f = notchAt(t, tk, at); if (f > 0 && f < 1) return Math.sin(Math.PI * f) } return 0 }

// One or two plain sentences each.
const POPS = {
  start: { text: 'Watch how Planet Nine’s gravity changes the orbits of these objects.', btn: '▶ Start' },
  flung: { k: 'Flung out', text: 'Objects whose orbits stretch out the same way as Planet Nine’s pass close to it often, and its gravity flings most of them out.', btn: 'Continue' },
  spared: { k: 'Spared', text: 'The further round an orbit stretches out, the less often it crosses Planet Nine’s path and the less likely it is to be flung. Which ones go is partly chance.', btn: 'Continue' },
  turn: { k: 'Turned round', n: 1, text: 'Each time Planet Nine sweeps past, its gravity nudges the remaining orbits the opposite way. Like pushes on a swing, the nudges add up.', btn: 'Continue' },
  tilt: { k: 'Tilted alike', n: 2, text: 'Seen from the side, the same nudges tip the remaining orbits until they tilt the same way as Planet Nine’s.', btn: 'Continue' },
  end: { text: 'What remains is the six orbits of 2016, stretching out opposite to Planet Nine’s and tilted the same way. With no planet, they would still stretch out and tilt in every direction.', btn: '↺ Play again' },
}

/** root: where the pictures and the notes go. */
export function makeCompare ({ root, six = [] }) {
  // the make-believe orbits: shapes like the real ones, random starting directions, the same in both pictures
  // (the draws are in the order they always were, so the orbits are the ones readers have seen; the tilts come
  // from a second stream, so adding them changed nothing else)
  const rnd = seededRandom(1710), rndTilt = seededRandom(1711), rndFling = seededRandom(FLING_SEED)
  const anti = P9.varpi + 180
  const orbits = d3.range(N).map(() => {
    const a = 260 + rnd() * 320, e = 0.72 + rnd() * 0.2, from = rnd() * 360
    // flung or not is a draw (a third stream, so nothing else changes), likelier the nearer the planet's way
    const lined = rndFling() < clamp01((FLING_FAR - Math.abs(wrap180(from - P9.varpi))) / (FLING_FAR - FLING_NEAR))
    const drift = (rnd() - 0.5) * 24
    rnd()                                                        // a draw the old version used
    // tilted every which way, a little like the real ones
    const node0 = rndTilt() * 360, inc0 = 5 + rndTilt() * 27, nodeDrift = (rndTilt() - 0.5) * 20
    return {
      a, e, from, drift, lined, node0, inc0, nodeDrift,
      // the rest gather on the far side, the short way round: each keeps half its angle from it, so none
      // overtakes another
      to: lined ? from : from - wrap180(from - anti) * (1 - SQUEEZE),
      // act 3: towards the line Planet Nine tilts about, the short way, and towards its steepness
      node1: P9.node + wrap180(node0 - P9.node) * KEEP_NODE,
      inc1: P9.i + (inc0 - P9.i) * KEEP_TILT,
    }
  })
  // fling until six are left (2026-11-18, asked for): those drawn to be flung, then of the rest those nearest the
  // planet's way. The six left are the six orbits of 2016: each keeps its size and shape, and starts where the nudges
  // will carry it to its own place, worked backwards from the turning (half its angle from the far side kept, more
  // where that would start it past the planet's own way), the tipping (a fifth of its angle from Planet Nine's tilt
  // kept, more where that would start it more than 160° round) and the steepness (half the difference kept)
  if (six.length) {
    const rest = orbits.filter(o => !o.lined).sort((p, q) => Math.abs(wrap180(p.from - P9.varpi)) - Math.abs(wrap180(q.from - P9.varpi)))
    for (const o of rest.slice(0, Math.max(0, rest.length - six.length))) o.lined = true
    const left = orbits.filter(o => !o.lined).sort((p, q) => wrap180(p.from - anti) - wrap180(q.from - anti))
    const real = [...six].sort((p, q) => wrap180(p.varpi_deg - anti) - wrap180(q.varpi_deg - anti))
    left.forEach((o, i) => {
      const sv = real[i]
      if (!sv) return
      const d = wrap180(sv.varpi_deg - anti), kv = Math.max(1 - SQUEEZE, Math.abs(d) / 170)
      const w = wrap180(sv.node_deg - P9.node), kn = Math.max(KEEP_NODE, Math.abs(w) / 160)
      Object.assign(o, { a: sv.a_au, e: sv.e, id: sv.id,
        from: anti + d / kv, to: anti + d,
        node0: P9.node + w / kn, node1: P9.node + w,
        inc0: Math.max(3, P9.i + (sv.i_deg - P9.i) / KEEP_TILT), inc1: sv.i_deg })
    })
  }
  k = R / d3.max(orbits, o => o.a * (1 + o.e))
  const lined = orbits.filter(o => o.lined), kept = orbits.filter(o => !o.lined)
  const TOP = camera(0)
  const p9St = { varpi: P9.varpi, node: P9.node, inc: P9.i }
  // the end: how far Planet Nine's orbit has eased from the cartoon's stretched one back to its predicted shape
  const morphAt = t => ease(clamp01((t - BACK_AT) / BACK))
  const e9 = t => P9.e + (REAL_P9.e - P9.e) * morphAt(t)
  // the planet along its orbit at time t, starting at its far end
  const planetAt = (t, cam) => pointAt(P9.a, e9(t), p9St, trueAnomaly(180 + 360 * lapsAt(t), e9(t)), cam)
  // --- acts 2 and 3: a notch at every nudge ---
  // each nudge's turning lies wholly inside its act
  const before = NUDGE_FROM / FAST, after = NUDGE_TO / FAST
  const turnNudges = passes(T1 + before, T1 + TURN - after), tiltNudges = passes(TILT_AT + before, TILT_AT + TILT - after)
  // the run ends as the last nudge is done, with no lap after it that changes nothing (2026-11-17, asked for)
  const tiltEnd = (tiltNudges.at(-1) ?? TILT_AT + TILT - after) + after
  // then the camera tips back up, ending on the head's picture (there being the six of 2016 to end on)
  BACK_AT = six.length ? tiltEnd + 0.012 : Infinity
  const END = six.length ? BACK_AT + BACK + 0.012 : tiltEnd + 0.02
  // when in a nudge the planet passes nearest each remaining orbit, as the picture shows it: from above while they
  // turn, from the side while they tip. The planet's path is the same every lap, so one pass serves for all.
  {
    const side = camera(TILT_AT), fs = d3.range(0, 1.0001, 0.02), tk = T1 + (Math.ceil(LAPS * T1 - 0.5) + 0.5 - LAPS * T1) / FAST
    const nearest = (o, st, cam) => {
      const pts = d3.range(0, 360, 3).map(nu => pointAt(o.a, o.e, st, nu, cam))
      const f = fs[d3.minIndex(fs, f => { const p = planetAt(tk + (f * (NUDGE_FROM + NUDGE_TO) - NUDGE_FROM) / FAST, cam); return d3.min(pts, q => dist(p, q)) })]
      return Math.max(NOTCH / 2, Math.min(1 - NOTCH / 2, f))
    }
    kept.forEach(o => {
      o.atTurn = nearest(o, { varpi: o.from, node: o.node0, inc: o.inc0 }, TOP)
      o.atTilt = nearest(o, { varpi: o.to, node: o.node0, inc: o.inc0 }, side)
    })
  }
  const turnU = t => notches(turnNudges, t)                       // the middle orbit's progress: for the pauses
  const tiltU = t => notches(tiltNudges, t)
  const angle = (o, t) => o.lined ? o.from : o.from + (o.to - o.from) * notches(turnNudges, t, o.atTurn)
  const tugAt = (o, t) => o.lined ? 0 : Math.max(tugOf(turnNudges, t, o.atTurn), tugOf(tiltNudges, t, o.atTilt))
  const stateAt = (o, t) => {
    const u = o.lined ? 0 : notches(tiltNudges, t, o.atTilt)
    return { varpi: angle(o, t), node: o.node0 + (o.node1 - o.node0) * u, inc: o.inc0 + (o.inc1 - o.inc0) * u }
  }
  // with no planet: a slow drift, nothing more
  const looseAt = (o, t) => { const u = ease(Math.min(1, t)); return { varpi: o.from + o.drift * u, node: o.node0 + o.nodeDrift * u, inc: o.inc0 } }

  // --- act 1: when each orbit stretching out the planet's way is flung. One at a time, each at a moment the planet
  // really passes it, seen from above, the first alone so its note speaks of one object; all gone before act 2 ---
  const tl = d3.range(0.03 + PRE, FLING_BY, 0.001)
  const planetTl = tl.map(t => planetAt(t, TOP))
  for (const o of lined) {
    const st = stateAt(o, 0)
    o.pts = d3.range(0, 360, 1.8).map(nu => pointAt(o.a, o.e, st, nu, TOP))
    o.gap = planetTl.map(p => d3.min(o.pts, q => dist(q, p)))
  }
  {
    const left = new Set(lined)
    let next = 0.03 + PRE
    while (left.size) {
      let best = null
      for (const o of left) {
        let i0 = tl.findIndex(t => t >= next)
        if (i0 < 0) i0 = tl.length - 1
        let i = o.gap.findIndex((g, j) => j >= i0 && g < REACH)
        if (i < 0) i = i0 + d3.minIndex(o.gap.slice(i0))           // no close pass left: its closest
        if (!best || tl[i] < best.t) best = { o, t: tl[i] }
      }
      const o = best.o
      o.out = best.t; o.at = planetAt(o.out, TOP)
      // where the object is when the planet comes by: the point of its orbit nearest the pass
      o.q = o.pts[d3.minIndex(o.pts, p => dist(p, o.at))]
      next = o.out + (left.size === lined.length ? 2.4 : 1) * GAP
      left.delete(o)
    }
  }
  const first = lined.reduce((b, o) => !b || o.out < b.out ? o : b, null)
  // The slingshot, the same for every flung object, and carried along by the planet as it passes: the object is
  // pulled in to just behind the planet, swung round its outer side as the planet moves on, and let go ahead of
  // it, out along its way of motion and away from the Sun, to just inside the picture's edge.
  const unit = ([x, y]) => { const L = Math.hypot(x, y) || 1; return [x / L, y / L] }
  const motion = t => {                                          // where the planet is, its way of motion, its outer side
    const p = planetAt(t, TOP), a = planetAt(t - 0.002, TOP), b = planetAt(t + 0.002, TOP)
    const v = unit([b[0] - a[0], b[1] - a[1]])
    let n = unit([p[0] - c, p[1] - c])
    const along = n[0] * v[0] + n[1] * v[1]
    n = unit([n[0] - along * v[0], n[1] - along * v[1]])
    return { p, v, n }
  }
  // The swing: round the planet from just behind it (a little on the Sun's side) to beside it on its outer side,
  // speeding up as it goes, and let go there along the way it is already moving, forward and outward, so it
  // overtakes the planet and runs on ahead. It ended in front of the planet before, moving towards the Sun, and was
  // let go outward from there: a right-angle bend in its trail (2026-11-17).
  const SWING_FROM = 230 * RAD, SWING_TO = 110 * RAD               // angles from the planet's way of motion
  const swingAt = (o, u) => {                                    // u from 0 to 1 of the swing
    const { p, v, n } = motion(o.out + u * o.swingT)
    const phi = SWING_FROM - (SWING_FROM - SWING_TO) * (0.4 * u + 0.6 * u * u)
    const ring = [p[0] + SWING * (Math.cos(phi) * v[0] + Math.sin(phi) * n[0]), p[1] + SWING * (Math.cos(phi) * v[1] + Math.sin(phi) * n[1])]
    return lerp(o.q, ring, d3.easeCubicOut(Math.min(1, u / 0.4)))
  }
  // where a ray from p along d leaves the circle that keeps a flung object inside the picture
  const toEdge = (p, d) => {
    const ex = p[0] - c, ey = p[1] - c, b2 = ex * d[0] + ey * d[1], cc = ex * ex + ey * ey - (c * 0.94) ** 2
    return Math.max(10, -b2 + Math.sqrt(Math.max(0, b2 * b2 - cc)))
  }
  for (const o of lined) {
    // the swing lasts while the planet moves SWING_PATH pixels: quick near its closest point to the Sun, slow far out
    const speed = dist(planetAt(o.out + 0.001, TOP), planetAt(o.out - 0.001, TOP)) / 0.002
    o.swingT = Math.min(FLY * 0.6, Math.max(0.003, SWING_PATH / speed))
    o.rel = swingAt(o, 1)
    // it leaves the way it was moving at the end of the swing (no bend) and curves gently away from the Sun
    const pre = swingAt(o, 0.99)
    o.dir = unit([o.rel[0] - pre[0], o.rel[1] - pre[1]])
    const out = unit([o.rel[0] - c, o.rel[1] - c])
    const want = unit([o.dir[0] + out[0] * 0.7, o.dir[1] + out[1] * 0.7])
    o.end = [o.rel[0] + want[0] * toEdge(o.rel, want), o.rel[1] + want[1] * toEdge(o.rel, want)]
    const lead = Math.min(dist(o.rel, o.end) * 0.45, toEdge(o.rel, o.dir) * 0.9)
    o.ctrl = [o.rel[0] + o.dir[0] * lead, o.rel[1] + o.dir[1] * lead]
  }
  // where a flung object is at time t (from the moment the planet passes it)
  const flungAt = (o, t) => {
    const dt = Math.max(0, t - o.out)
    if (dt < o.swingT) return swingAt(o, dt / o.swingT)
    const h = clamp01((dt - o.swingT) / (FLY - o.swingT)), g = d3.easeQuadIn(h) * 0.6 + h * 0.4, m = 1 - g
    return [0, 1].map(i => m * m * o.rel[i] + 2 * m * g * o.ctrl[i] + g * g * o.end[i])
  }
  // the run's pace: slowed while an object swings round the planet, so each swing lasts SWING_MS on screen, easing in
  // a little before the pass and out after it
  // a little before the pass and out after it; the first swing slow, the later ones quicker, and the rest of act 1
  // faster once the first has been seen. In acts 2 and 3 the first nudge of each runs slowly, the later ones quickly.
  const RAMP = 0.006
  const within = (t, a, b) => t < a ? clamp01(1 - (a - t) / RAMP) : t > b ? clamp01(1 - (t - b) / RAMP) : 1
  // the first nudge of each act slowly, so the reader can follow the planet tugging each orbit in turn; the later
  // ones quicker, slowed a little while the planet is on the near side and quick while it is far out
  const NUDGE_SLOW = 0.22, NUDGE_NEAR = 0.8, NUDGE_FAR = 1.8
  const paceAt = t => {
    const swing = d3.min(lined, o => {
      const slow = Math.min(1, o.swingT * PLAY_MS / (o === first ? SWING_MS : SWING_MS_NEXT))
      return 1 - (1 - slow) * within(t, o.out - PRE * 0.5, o.out + o.swingT)
    }) ?? 1
    const quick = first && t > first.out + FLY && t < SPARED_AT ? AFTER_FIRST : 1
    let nudge = 1
    for (const [list, a, b] of [[turnNudges, T1, T1 + TURN], [tiltNudges, TILT_AT, TILT_AT + TILT]]) {
      if (!list.length || t < a || t > b) continue
      const w = within(t, list[0] - before, list[0] + after)
      const near = d3.max(list.slice(1), tk => within(t, tk - before, tk + after)) ?? 0
      nudge = w > 0 ? NUDGE_SLOW + (1 - NUDGE_SLOW) * (1 - w) : t > list[0] ? NUDGE_FAR - (NUDGE_FAR - NUDGE_NEAR) * near : 1
    }
    return swing * quick * nudge
  }

  // a curved arrow just outside an orbit's far end, the way it is turning (act 2, seen from above)
  function arrowD (o, t) {
    const sgn = Math.sign(o.to - o.from)
    const [fx, fy] = pointAt(o.a, o.e, stateAt(o, t), 180, TOP)
    const r = Math.hypot(fx - c, fy - c) + 9, ang = Math.atan2(c - fy, fx - c) / RAD
    const pts = d3.range(7).map(i => { const p = (ang + sgn * i * 3) * RAD; return [c + r * Math.cos(p), c - r * Math.sin(p)] })
    const [pb, pe] = pts.slice(-2), L = dist(pe, pb) || 1, ux = (pe[0] - pb[0]) / L, uy = (pe[1] - pb[1]) / L
    const head = s => [pe[0] - 7 * (ux * Math.cos(s) - uy * Math.sin(s)), pe[1] - 7 * (uy * Math.cos(s) + ux * Math.sin(s))]
    const f = p => p.map(v => v.toFixed(1)).join(',')
    return `M${pts.map(f).join('L')}M${f(head(0.55))}L${f(pe)}L${f(head(-0.55))}`
  }
  // shown while the orbit is being nudged, so the arrows come on one after another along the planet's path
  const arrowOp = (o, t) => Math.abs(o.to - o.from) < 12 ? 0 : tugOf(turnNudges, t, o.atTurn)
  // the copy of an orbit where it started: in as the turning (or tipping) begins, out once it is done
  const ghostIn = (u, t, at, len) => u <= 0 ? 0 : u < 1 ? Math.min(1, u / 0.05) : Math.max(0, 1 - (t - at - len) / 0.05)
  const turnGhostOp = t => ghostIn(turnU(t), t, T1, TURN)
  const tiltGhostOp = t => { const u = tiltU(t); return u <= 0 ? 0 : t < tiltEnd ? Math.min(1, u / 0.05) : Math.max(0, 1 - (t - tiltEnd) / 0.018) }

  const frame = (n, p9) => `<svg viewBox="0 0 ${S} ${S}" aria-hidden="true">
    ${p9 ? `<defs><marker id="cmp-pull-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--text-primary)"/></marker>
      <marker id="cmp-dir-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--p9)"/></marker></defs>` : ''}
    <g class="cmp-plane" opacity="0"><line x1="0" x2="${S}" y1="${c}" y2="${c}"/>${p9 ? `<text class="halo" x="${S - 8}" y="${c - 8}" text-anchor="end">the plane of the planets</text>` : ''}</g>
    ${p9 ? `<g class="cmp-ghosts">${kept.map(() => '<path class="cmp-ghost" opacity="0"/>').join('')}</g>
      <g class="cmp-ghosts-tilt">${kept.map(() => '<path class="cmp-ghost" opacity="0"/>').join('')}</g>` : ''}
    <g class="cmp-orbits">${d3.range(n).map(() => '<path class="cmp-orbit"/>').join('')}</g>
    ${p9 ? `<path class="lh-p9"/>
      <g class="cmp-dirs"><line class="cmp-dir is-s" marker-end="url(#cmp-dir-head)"/><text class="cmp-dir-lbl is-s halo" text-anchor="middle">stretch</text>
        <line class="cmp-dir is-t" marker-end="url(#cmp-dir-head)" opacity="0"/><text class="cmp-dir-lbl is-t halo" text-anchor="middle" opacity="0">tilt</text></g>
      <g class="cmp-arrows">${kept.map(() => '<path class="cmp-arrow" opacity="0"/>').join('')}</g>
      <g class="cmp-flung">${lined.map(() => '<g opacity="0"><line class="pull" marker-end="url(#cmp-pull-head)"/><path class="trail"/><circle class="flash" r="0"/><circle class="obj" r="4.5"/></g>').join('')}</g>
      <use class="cmp-planet" href="#art-planet-nine" width="26" height="26"/>` : ''}
    ${p9 ? `<g class="cmp-key6" opacity="0"><line x1="10" x2="28" y1="${S - 13}" y2="${S - 13}"/><text x="34" y="${S - 9}">the six orbits of 2016</text></g>` : ''}
    <use href="#art-sun" x="${c - 7}" y="${c - 7}" width="14" height="14"/>
  </svg>`

  // the picture with a planet; beside it the small one without, and under that the notes, so no note covers a drawing
  root.innerHTML = `
    <figure class="cmp-panel" data-p="p9" role="img" aria-label="With a planet going round its orbit, first each object on an orbit lined up with it is pulled in as the planet passes and flung out of the solar system; then, nudge by nudge each time the planet comes round, the orbits it never meets turn to stretch out the opposite way; then, seen from the side, the same nudges tip them until they tilt the same way as the planet's orbit."><figcaption>With a planet</figcaption>${frame(N, true)}</figure>
    <div class="cmp-side">
      <figure class="cmp-panel" data-p="none" role="img" aria-label="With no planet, the orbits stay stretching out and tilting every which way."><figcaption>No planet</figcaption>${frame(N, false)}</figure>
      <div class="cmp-notes" aria-live="polite"></div>
    </div>`
  const notes = root.querySelector('.cmp-notes')

  const sel = p => d3.select(root).selectAll(`.cmp-panel[data-p="${p}"] .cmp-orbit`).data(orbits)
  const none = sel('none'), withP9 = sel('p9')
  const ghosts = d3.select(root).selectAll('.cmp-ghosts .cmp-ghost').data(kept)
  const tiltGhosts = d3.select(root).selectAll('.cmp-ghosts-tilt .cmp-ghost').data(kept)
  const arrows = d3.select(root).selectAll('.cmp-arrow').data(kept)
  const flung = d3.select(root).selectAll('.cmp-flung > g').data(lined)
  const planet = d3.select(root).select('.cmp-planet')
  const violet = getComputedStyle(root).getPropertyValue('--series-1').trim() || '#a78bfa'
  const lit = d3.interpolateRgb(violet, '#ffffff')
  const p9Path = d3.select(root).select('.cmp-panel[data-p="p9"] .lh-p9')
  const planes = d3.select(root).selectAll('.cmp-plane')
  const key6 = d3.select(root).select('.cmp-key6')
  // Planet Nine's own two directions, as the dials draw them (2026-11-17, asked for): from above, an arrow from the Sun
  // towards its orbit's far end, the way it stretches out; from the side, an arrow along the plane towards the side
  // its orbit rises, the way it tilts; each in its act, the one fading as the camera tips and the other coming
  const dirs = d3.select(root).select('.cmp-dirs')
  // the arrows reach six-tenths of the way to the far end, short of where the planet starts, their words small,
  // beside the head (2026-11-18, asked for: the planet covered the word)
  const dirLen = P9.a * (1 + P9.e) * 0.6
  function drawDirs (cam) {
    for (const [cls, deg, op] of [['is-s', P9.varpi + 180, 1 - cam.s], ['is-t', P9.node + 90, cam.s]]) {
      const end = project([dirLen * Math.cos(deg * RAD), dirLen * Math.sin(deg * RAD), 0], cam)
      const L = dist(end, [c, c]) || 1, ux = (end[0] - c) / L, uy = (end[1] - c) / L
      dirs.select(`line.${cls}`).attr('x1', c + ux * 10).attr('y1', c + uy * 10).attr('x2', end[0]).attr('y2', end[1]).attr('opacity', op)
      // set off square to the arrow, on its left, a little back from the head
      dirs.select(`text.${cls}`).attr('x', end[0] - ux * 8 - uy * 12).attr('y', end[1] - uy * 8 + ux * 12 + 3.5).attr('opacity', op * 0.85)
    }
  }

  // --- the notes: one at a time, beside the picture (never over it) ---
  function pop (key, { onBtn } = {}) {
    const p = POPS[key]
    const el = document.createElement('div')
    el.className = 'cmp-pop'
    el.innerHTML = `${p.k ? `<b class="cmp-pop-k">${p.n ? `<span class="clue-n">${p.n}</span>` : ''}<span>${p.k}</span></b>` : ''}<p>${p.text}</p>${p.btn ? `<button type="button" class="pic-btn primary">${p.btn}</button>` : ''}`
    notes.replaceChildren(el)
    el.querySelector('button')?.addEventListener('click', () => { clearPops(); onBtn?.() })
    el.querySelector('button')?.focus({ preventScroll: true })
  }
  const clearPops = () => notes.replaceChildren()

  // --- the run: forward frame by frame, pausing at the moments that matter ----------
  let t = 0, timer = null, seen = new Set(), lastCam = null
  function show () {
    const cam = camera(t)
    const moved = !lastCam || lastCam.s !== cam.s
    lastCam = cam
    const pos = planetAt(t, cam)
    planet.attr('x', pos[0] - 13).attr('y', pos[1] - 13)
    if (moved) { p9Path.attr('d', orbitD(P9.a, e9(t), p9St, cam)); drawDirs(cam) }
    planes.attr('opacity', cam.s)
    none.attr('d', o => orbitD(o.a, o.e, looseAt(o, t), cam))
    const gone = o => !o.lined || t < o.out ? 0 : Math.min(1, (t - o.out) / FLY)
    const mEnd = morphAt(t)
    withP9.attr('opacity', o => 1 - gone(o)).classed('is-out', o => o.lined && t >= o.out - PRE)
      .attr('d', o => gone(o) >= 1 ? null : orbitD(o.a, o.e, stateAt(o, t), cam))
    key6.attr('opacity', mEnd)
    const gOp = turnGhostOp(t), tOp = tiltGhostOp(t)
    ghosts.attr('opacity', gOp).attr('d', o => gOp > 0 ? orbitD(o.a, o.e, { varpi: o.from, node: o.node0, inc: o.inc0 }, cam) : null)
    tiltGhosts.attr('opacity', tOp).attr('d', o => tOp > 0 ? orbitD(o.a, o.e, { varpi: o.to, node: o.node0, inc: o.inc0 }, cam) : null)
    arrows.each(function (o) {
      const op = arrowOp(o, t)
      d3.select(this).attr('opacity', op).attr('d', op > 0 ? arrowD(o, t) : null)
    })
    // a nudge: each remaining orbit brightens while the planet passes nearest it and turns its notch then (its curved
    // arrow showing which way), one orbit after another along the planet's path (2026-11-17, asked for: a ring
    // spreading from the planet did not show what did the nudging; pull lines to the orbits it was crossing were too
    // short to see)
    withP9.style('stroke', o => { const g = tugAt(o, t); return g > 0.02 ? lit(0.65 * g) : null })
      .style('stroke-opacity', o => { const g = tugAt(o, t); return g > 0.02 ? 0.8 + 0.2 * g : null })
    // a flung object: lit on its orbit as the planet comes near, a pull line to the planet growing with closeness,
    // then pulled in past it and slung out along a curve that fades inside the picture
    flung.each(function (o) {
      const g = d3.select(this)
      if (t < o.out - PRE) { g.attr('opacity', 0); return }
      const f = gone(o)
      const at = t < o.out ? o.q : flungAt(o, t)
      g.attr('opacity', t - o.out < FLY * 2 ? 1 : Math.max(0, 1 - (t - o.out - FLY * 2) / FLY))
      g.select('.obj').attr('cx', at[0]).attr('cy', at[1])
      // the pull: from the object towards the planet, stopping short of it so the head shows
      const d = dist(at, pos), close = clamp01(1 - d / 110), pullOn = t < o.out ? 1 : Math.max(0, 1 - f / 0.35)
      const end = d > 18 ? lerp(at, pos, (d - 16) / d) : at
      g.select('.pull').attr('x1', at[0]).attr('y1', at[1]).attr('x2', end[0]).attr('y2', end[1])
        .attr('stroke-width', 1 + 2.4 * close).attr('opacity', pullOn * (0.25 + 0.75 * close))
      // sampled finely through the swing, which is short, so its curve stays smooth
      const tEnd = Math.min(t, o.out + FLY)
      const ts = [...d3.range(o.out, Math.min(tEnd, o.out + o.swingT), o.swingT / 40), ...d3.range(o.out + o.swingT, tEnd, FLY / 80), tEnd]
      g.select('.trail').attr('d', t < o.out ? null : d3.line().curve(d3.curveCatmullRom)(ts.map(x => flungAt(o, x))))
      g.select('.flash').attr('cx', o.at[0]).attr('cy', o.at[1]).attr('r', t >= o.out && f < 1 ? 5 + 14 * f : 0).attr('opacity', 1 - f)
    })
  }
  function stop () { timer?.stop(); timer = null }
  function go () {
    stop(); clearPops()
    let last = null
    timer = d3.timer(ms => {
      const step = last == null ? 0 : ms - last
      last = ms
      t = Math.min(END, t + step / PLAY_MS * paceAt(t))
      show()
      // paused with the first object two-thirds of the way out, its trail still in the picture
      if (first && !seen.has('flung') && t >= first.out + FLY * 0.66) {
        seen.add('flung'); stop(); pop('flung', { onBtn: go }); return
      }
      // paused once every object stretching out the planet's way has gone, before the rest begin to turn
      if (!seen.has('spared') && t >= SPARED_AT) {
        seen.add('spared'); stop(); show(); pop('spared', { onBtn: go }); return
      }
      // paused after a couple of nudges
      if (kept.length && !seen.has('turn') && turnU(t) >= 0.3) {
        seen.add('turn'); stop(); show(); pop('turn', { onBtn: go }); return
      }
      // seen from the side, paused after a couple of nudges
      if (kept.length && !seen.has('tilt') && tiltU(t) >= 0.3) {
        seen.add('tilt'); stop(); show(); pop('tilt', { onBtn: go }); return
      }
      if (t >= END) { stop(); pop('end', { onBtn: play }) }
    })
  }
  // Start, and Play again from the last note: the same run each time, the notes and their pauses too
  function play () {
    t = 0; seen = new Set(); show(); clearPops()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      t = END; show()
      pop('end', { onBtn: play }); return
    }
    go()
  }
  show()
  pop('start', { onBtn: play })
}
