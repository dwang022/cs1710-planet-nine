// Part 1, page 3: "your turn at the telescope", a game on real archive frames.
//
// Each round is one object's frames over a few nights from public/game/game.json (real
// exposures from the telescope archives, one round in colour from three filters): the
// frames, where the object sits in each (measured from the frames), and when
// each was taken. On the first frame an arrow points at the object and names
// it, and every play or replay starts there; it goes once the frames move.
// Play runs the frames once, slowly, and stops on the last; the reader clicks
// where the object is now and submits. The reveal stays on the last frame,
// still, so there is time to look: a ring round each place the object stood,
// wide enough that the object shows inside it, joined by a dim line that stops
// short of the rings; the ring of the frame on show is bright and an arrow
// points at it from outside; the guess; Found or Missed; the round's button
// turns green or red. Replay then plays the frames with the bright ring and
// the arrow following the object. Everything the reader touches sits on the
// image: the rounds, the count found, replay, and submit (greyed until there
// is a guess).
//
// The frames are cut with the object's track off-centre (scripts/fetch_game_sequences.py),
// so clicking the middle wins nothing. A round can still be shown through a
// window of its frame (WINDOW of the width, placed at random with the track
// inside) for frames centred on their object; at 1 the whole frame shows.

import { url } from '../data.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const FRAME_MS = 1300                 // how long each frame stays up while playing
const WINDOW = 1                      // the window's share of the frame's width
const EDGE = 0.15                     // the track keeps at least this share of the window from its edges
const FOUND = 0.035                   // a guess this close (share of the window's width) has found it
const RING = 0.022                    // the reveal's rings: radius as a share of the window's width

// A window of the frame, the frame's shape, at a random place that keeps the track inside.
function pickView (r) {
  const [w, h] = r.size
  const xs = r.positions.map(p => p[0]), ys = r.positions.map(p => p[1])
  const span = Math.max((Math.max(...xs) - Math.min(...xs)) / (1 - 2 * EDGE), (Math.max(...ys) - Math.min(...ys)) * w / h / (1 - 2 * EDGE))
  const vw = Math.min(w, Math.max(w * WINDOW, span)), vh = vw * h / w
  const place = (lo, hi, size, full) => {
    const a = Math.max(0, hi + EDGE * size - size), b = Math.min(full - size, lo - EDGE * size)
    return a <= b ? a + Math.random() * (b - a) : Math.min(Math.max(0, (lo + hi) / 2 - size / 2), full - size)
  }
  return [place(Math.min(...xs), Math.max(...xs), vw, w), place(Math.min(...ys), Math.max(...ys), vh, h), vw, vh]
}

// "2012-11-05 04:40 UT" or "5 November 2012" → the label shown on the frame
function stamp (r, k) {
  const t = r.times?.[k]
  if (!t) return `${r.date || ''}${r.files.length > 1 ? ` · frame ${k + 1} of ${r.files.length}` : ''}`
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(t)
  if (!m) return t
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]
  return `${+m[3]} ${mon} ${m[1]} · ${m[4]} UT`
}

export function makeSpotGame (root, rounds) {
  const results = rounds.map(() => null)            // null, 'found' or 'missed' per round
  let i = 0, phase = 'ready', timer = null, guess = null, view = [0, 0, 1, 1]

  root.classList.add('game')
  root.innerHTML = `
    <div class="game-stage">
      <div class="game-frames"></div>
      <svg class="game-over" preserveAspectRatio="none" aria-hidden="true">
        <g class="trace"></g><g class="arrow"><path class="shaft"/><path class="head"/></g><g class="guess"><path/></g>
      </svg>
      <span class="game-tag"></span>
      <div class="game-top">
        <span class="game-levels" role="group" aria-label="Objects"></span>
        <span class="game-score"></span>
      </div>
      <span class="game-verdict" aria-live="polite"></span>
      <button type="button" class="game-play" data-act="play" aria-label="Play the frames">▶</button>
      <div class="game-bottom">
        <button type="button" class="game-btn" data-act="replay">↺ Replay</button>
        <span class="game-time"></span>
        <button type="button" class="game-btn primary" data-act="submit" disabled>Submit</button>
        <button type="button" class="game-btn primary" data-act="next">Next ›</button>
      </div>
    </div>
    <p class="game-src"></p>`

  const $ = s => root.querySelector(s)
  const stage = $('.game-stage'), framesEl = $('.game-frames'), over = $('.game-over')
  const tag = $('.game-tag'), levels = $('.game-levels'), scoreEl = $('.game-score'), verdict = $('.game-verdict')
  const timeEl = $('.game-time'), src = $('.game-src')
  const btn = act => root.querySelector(`[data-act="${act}"]`)
  // a point in frame pixels → a position on the stage, in percent
  const pct = ([x, y]) => [100 * (x - view[0]) / view[2], 100 * (y - view[1]) / view[3]]

  levels.innerHTML = rounds.map((r, k) => `<button type="button" data-level="${k}" aria-label="Object ${k + 1}">${k + 1}</button>`).join('')

  function load (k) {
    stop()
    i = k
    const r = rounds[i], [w, h] = r.size
    view = pickView(r)
    const [vx, vy, vw, vh] = view
    stage.style.aspectRatio = `${w} / ${h}`
    over.setAttribute('viewBox', view.map(v => v.toFixed(1)).join(' '))
    framesEl.style.cssText = `width:${(100 * w / vw).toFixed(3)}%;height:${(100 * h / vh).toFixed(3)}%;left:${(-100 * vx / vw).toFixed(3)}%;top:${(-100 * vy / vh).toFixed(3)}%`
    framesEl.innerHTML = r.files.map((f, j) => `<img src="${url(`game/${f}`)}" alt="" decoding="async" class="${j === 0 ? 'is-on' : ''}">`).join('')
    // its path, shown at the reveal: a ring round every stop, joined by lines that stop short of the
    // rings, so nothing is drawn over the object itself
    const pts = r.positions, R = vw * RING
    const links = pts.slice(1).map((p, j) => {
      const q = pts[j], d = Math.hypot(p[0] - q[0], p[1] - q[1])
      if (d <= 2 * R + vw * 0.004) return ''
      const ux = (p[0] - q[0]) / d, uy = (p[1] - q[1]) / d
      return `<line x1="${q[0] + ux * R}" y1="${q[1] + uy * R}" x2="${p[0] - ux * R}" y2="${p[1] - uy * R}"/>`
    }).join('')
    over.querySelector('.trace').innerHTML = links +
      pts.map(([x, y], j) => `<circle class="stop${j === pts.length - 1 ? ' end' : ''}" cx="${x}" cy="${y}" r="${R}"/>`).join('')
    // the arrow at where it starts, named at its tail (above the tail, or below it when the arrow comes from below)
    const tail = pointAt(pts[0])
    const [tx, ty] = pct(tail)
    tag.textContent = r.object
    tag.style.left = `${tx}%`; tag.style.top = `${ty}%`
    tag.classList.toggle('below', tail[1] > pts[0][1])
    src.innerHTML = `${esc(r.telescope?.split(',')[0] || '')}${r.date ? ` · ${esc(r.date)}` : ''}${r.license ? ` · ${esc(r.license)}` : ''} · <a href="${url('credits.html')}#photos">credits</a>`
    guess = null
    set('ready')
  }

  function show (k) {
    framesEl.querySelectorAll('img').forEach((im, j) => im.classList.toggle('is-on', j === k))
    timeEl.textContent = stamp(rounds[i], k)
    // every play starts with the arrow and the name on the object, as the round itself does
    const lead = phase === 'ready' || (phase === 'playing' && k === 0)
    over.querySelector('.arrow').style.display = lead || phase === 'reveal' ? null : 'none'
    tag.hidden = !lead
    if (phase === 'reveal') {
      over.querySelectorAll('.trace circle').forEach((c, j) => c.classList.toggle('is-now', j === k))
      pointAt(rounds[i].positions[k], view[2] * (RING + 0.008))
    } else if (lead) pointAt(rounds[i].positions[0])
  }

  // Play the frames once from the first; `then` runs when the last is up.
  function play (then) {
    stop()
    const n = rounds[i].files.length
    let k = 0
    show(0)
    const step = () => {
      k++
      show(k)
      if (k >= n - 1) { timer = null; then?.(); return }
      timer = setTimeout(step, FRAME_MS)
    }
    timer = setTimeout(step, FRAME_MS)
  }
  function stop () { clearTimeout(timer); timer = null }

  // An arrow on a diagonal, its tip `gap` short of the object; returns where its tail is. It comes from up and
  // to the left unless that would put it (or the name at its tail) off the picture or under the bars along
  // its top and foot, in which case it comes from whichever other corner is clear.
  function pointAt ([x, y], gap = view[2] * 0.016) {
    const L = view[2] * 0.07, d = Math.SQRT1_2, hl = view[2] * 0.018
    const [vx, vy, vw, vh] = view
    const clear = ([sx, sy]) => {
      const tx = x - sx * (gap + L) * d, ty = y - sy * (gap + L) * d
      return tx > vx + vw * 0.1 && tx < vx + vw * 0.9 && ty > vy + vh * (sy > 0 ? 0.24 : 0.1) && ty < vy + vh * (sy > 0 ? 0.9 : 0.78)
    }
    const [sx, sy] = [[1, 1], [-1, 1], [1, -1], [-1, -1]].find(clear) || [1, 1]   // the way the arrow travels
    const x1 = x - sx * gap * d, y1 = y - sy * gap * d, x0 = x1 - sx * L * d, y0 = y1 - sy * L * d
    over.querySelector('.arrow .shaft').setAttribute('d', `M${x0},${y0} L${x1},${y1}`)
    over.querySelector('.arrow .head').setAttribute('d', `M${x1 - sx * hl},${y1} L${x1},${y1} L${x1},${y1 - sy * hl}`)
    return [x0, y0]
  }

  function drawGuess () {
    const g = over.querySelector('.guess path')
    if (!guess) { g.setAttribute('d', ''); return }
    const [x, y] = guess, a = view[2] * 0.02, b = view[2] * 0.008
    g.setAttribute('d', `M${x - a},${y} H${x - b} M${x + b},${y} H${x + a} M${x},${y - a} V${y - b} M${x},${y + b} V${y + a}`)
  }

  function set (p) {
    phase = p
    stage.dataset.phase = p
    btn('play').hidden = p !== 'ready'
    btn('replay').hidden = p === 'ready'
    btn('submit').hidden = p === 'reveal'
    btn('submit').disabled = !(p === 'guess' && guess)
    btn('next').hidden = p !== 'reveal'
    btn('next').textContent = results.every(Boolean) ? 'Play again' : 'Next ›'
    tag.hidden = p !== 'ready'
    over.querySelector('.trace').style.display = p === 'reveal' ? null : 'none'
    over.querySelector('.arrow').style.display = p === 'ready' || p === 'reveal' ? null : 'none'
    // (show() keeps the arrow and the name up on a play's first frame)
    if (p !== 'reveal') verdict.textContent = ''
    stage.dataset.verdict = p === 'reveal' ? results[i] : ''
    if (p === 'ready') show(0)
    drawGuess()
    levels.querySelectorAll('button').forEach((b, k) => {
      b.classList.toggle('is-on', k === i)
      b.classList.toggle('found', results[k] === 'found')
      b.classList.toggle('missed', results[k] === 'missed')
    })
    const n = results.filter(v => v === 'found').length
    scoreEl.textContent = `${n} of ${rounds.length} found`
  }

  function submit () {
    const r = rounds[i], end = r.positions[r.positions.length - 1]
    const d = Math.hypot(guess[0] - end[0], guess[1] - end[1])
    results[i] = d <= FOUND * view[2] ? 'found' : 'missed'
    set('reveal')
    verdict.textContent = results[i] === 'found' ? 'Found' : 'Missed'
    // stay on the last frame, still, with the arrow at where it ended
    show(r.files.length - 1)
  }

  stage.addEventListener('click', ev => {
    if (phase !== 'guess' || ev.target.closest('button')) return
    const pt = over.createSVGPoint()
    pt.x = ev.clientX; pt.y = ev.clientY
    const p = pt.matrixTransform(over.getScreenCTM().inverse())
    guess = [p.x, p.y]
    set('guess')
  })
  root.addEventListener('click', ev => {
    const lvl = ev.target.closest('[data-level]')
    if (lvl) { load(+lvl.dataset.level); return }
    const act = ev.target.closest('[data-act]')?.dataset.act
    // after the reveal, Replay plays the frames with the arrow following the object; before it, a fresh try
    if (act === 'replay' && phase === 'reveal') play()
    else if (act === 'play' || act === 'replay') { guess = null; set('playing'); play(() => set('guess')) }
    if (act === 'submit' && guess) submit()
    if (act === 'next') {
      if (results.every(Boolean)) { results.fill(null); load(0) } else {
        const k = results.findIndex((v, j) => !v && j > i)
        load(k >= 0 ? k : results.findIndex(v => !v))
      }
    }
  })

  // stop playing when the game scrolls out of view
  new IntersectionObserver(es => { for (const e of es) if (!e.isIntersecting) stop() }).observe(root)

  load(0)
}
