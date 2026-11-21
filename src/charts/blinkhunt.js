// Spot Planet Nine (search/how.html, #build): the reader searches the way the real searches do. It replaced “Find
// Planet Nine” (a telescope-pointing game, not fun: asked for, 2026-11-20), which had replaced the two versions of
// the build-a-planet activity.
//
// How the real searches work, and what the game keeps of it: photos of the same field taken nights apart are
// compared, the stars stay put and anything in the solar system shifts, and the farther an object is the less it
// shifts (its apparent motion is mostly Earth's own, seen from farther away). So Planet Nine would be the slowest
// mover of all: main-belt asteroids cross the field, icy bodies near Neptune move about ten times less, Planet Nine
// ten times less again. A search must also throw out what only looks like a find: stars that flicker, and glitches
// seen in one photo only. And most fields hold no planet at all.
//
// The game, in three parts, as a find would really be followed up:
//   1. Spot it  seven fields seen through the telescope, each three photos blinking in turn, as in the blink
//      comparator that found Pluto. Click the dot that creeps (every field holds the planet: fields with nothing in them, and a “Nothing here”
//      button, were tried and cut as too hard, asked for). A wrong pick names what it was
//      and costs seconds; the points are the seconds left. Fields get more crowded and the planet fainter, and
//      the last field looks into the Milky Way. (A “Longer exposure” button that brought out a too-faint planet
//      was tried and cut as confusing, asked for.)
//   2. How far  the same three photos of an asteroid, of Neptune and of the find, one row each: the find shifts so
//      many times less than Neptune, so it is that many times as far (the shift goes as one over the distance).
//   3. How big  how bright Earth and Neptune would look from that distance, and the find between them. Both wait
//      for Continue. (A dial the reader dragged to match a “test object”, then the same dial turning by itself, were
//      tried and not understood, asked for.) Then a discovery card: what the telescope showed (a dot) beside what it might be (the
//      reader's skin), with the distance, the width, the mass and the length of its year.
//
// From the data (pages/search.js passes them): the range of distances along the best-fit orbit, the range of masses
// the fit allows and the papers' rule that turns a mass into a width, the orbit's period, Neptune's distance.
// Made up, and said so in the caption: the star fields, the speeds (kept in order, not to scale), the timing, the
// score, and drawing brightness as a dot's size.
//
// Keys: every dot that is not a plain star can be reached with Tab and picked with Enter; 1, 2 and 3 hold a photo,
// Space plays or pauses the blinking. With less motion asked for the photos do not blink on
// their own: the reader steps through them.

import './blinkhunt.css'
import { svgMarkup } from '../art.js'
import { currentSkin } from '../site.js'

const W = 1000, H = 520, FRAMES = 3, BLINK_MS = 620, BEST_KEY = 'p9-spot-best'
const FIELDS = 7, MILKY = 3            // the last three fields look into the Milky Way
const rnd = (a, b) => a + Math.random() * (b - a)

// what each impostor is, in a few words, said when the reader picks it
const WHAT = {
  asteroid: ['Asteroid', 'Far too fast, so far too close.'],
  icy: ['Icy body near Neptune', 'Still too fast.'],
  flicker: ['Flickering star', 'It changed, but never moved.'],
  glitch: ['Camera glitch', 'Seen in one photo only.'],
  star: ['A star', 'Stars stay put.'],
}
const RANKS = [[7, 'Planet hunter'], [5, 'Astronomer'], [3, 'Observer'], [0, 'Stargazer']]

export function drawBlinkHunt (root, { rRange, massRange, widthOf, periodYears, neptuneAu, neptuneWidth }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  root.classList.add('bh')
  root.innerHTML = `
    <div class="bh-hud">
      <div class="bh-count">Field <b class="bh-i">1</b> of ${FIELDS}</div>
      <div class="bh-timer" role="img" aria-label="Time left"><i></i></div>
      <div class="bh-score"><b class="bh-pts">0</b> points</div>
      <button type="button" class="bh-reset" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5"/></svg>Restart</button>
    </div>
    <div class="bh-stage pic">
      <svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Three photos of the same patch of sky, blinking in turn">
        <rect class="bh-sky" width="${W}" height="${H}"/>
        <g class="bh-stars"></g><g class="bh-objs"></g><g class="bh-fx"></g>
      </svg>
      <div class="bh-msg" aria-live="polite"></div>
      <div class="pic-bar bh-bar">
        <span class="bh-nights" role="group" aria-label="Which photo is showing">
          <span class="bh-nk">Photo</span>
          ${[0, 1, 2].map(i => `<button type="button" class="bh-pip" data-f="${i}" aria-label="Hold photo ${i + 1}">${i + 1}</button>`).join('')}
          <button type="button" class="bh-play" aria-label="Pause the blinking" aria-pressed="true"></button>
        </span>
      </div>
      <div class="pic-bar bh-dial" hidden><button type="button" class="bh-go bh-next">Continue</button></div>
      <div class="bh-scene" hidden></div>
      <div class="bh-over"></div>
    </div>`
  const $ = s => root.querySelector(s)
  const svg = $('.bh-stage svg'), gStars = $('.bh-stars'), gObjs = $('.bh-objs'), gFx = $('.bh-fx')
  const NS = 'http://www.w3.org/2000/svg'
  const el = (name, attrs, parent) => { const n = document.createElementNS(NS, name); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n }

  let best = 0
  try { best = +localStorage.getItem(BEST_KEY) || 0 } catch {}
  let field = null, idx = 0, score = 0, right = 0, phase = 'intro', frame = 0, playing = true
  let tLeft = 0, tMax = 0, lastTick = 0, raf = 0, blink = 0, after = 0, msgT = 0

  // --- one field: its stars, the planet and the impostors -------------------------------------------
  function makeField (i) {
    const hard = i / (FIELDS - 1)                       // 0 on the first field, 1 on the last
    const lvl = Math.round(hard * 6)
    // the last fields look into the Milky Way, each deeper than the one before: many times the stars, more of them
    // flickering, and more time to search
    const deepIn = i - (FIELDS - MILKY), milky = deepIn >= 0
    const n = milky ? 400 + 170 * deepIn : Math.round(70 + 330 * hard * hard + rnd(0, 20))
    const stars = Array.from({ length: n }, () =>
      ({ x: rnd(8, W - 8), y: rnd(8, H - 8), r: 0.7 + Math.pow(Math.random(), 3) * 2.6, o: rnd(0.45, 1) }))
    const objs = []
    const clear = (x, y, d) => objs.every(o => Math.hypot(o.x - x, o.y - y) > d)
    const place = (margin, d = 90) => { let x, y, n = 0; do { x = rnd(margin, W - margin); y = rnd(margin, H - 70 - margin / 2); n++ } while (!clear(x, y, d) && n < 60); return [x, y] }
    const mover = (kind, speed, r, o) => {
      const a = rnd(0, 2 * Math.PI), [x, y] = place(kind === 'asteroid' ? 200 : 70)
      objs.push({ kind, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, o })
    }
    mover('planet', 7.5 - 2.5 * hard, 3.3 - 1.1 * hard, 1 - 0.3 * hard)
    if (lvl >= 1) mover('asteroid', rnd(75, 110), rnd(2.2, 3.2), 0.95)
    if (lvl >= 2) mover('icy', rnd(24, 30), rnd(2.2, 3), 0.9)
    if (lvl >= 3) { const [x, y] = place(40); objs.push({ kind: 'flicker', x, y, vx: 0, vy: 0, r: 2.8, o: 1 }) }
    if (lvl >= 4) { const [x, y] = place(40); objs.push({ kind: 'glitch', x, y, vx: 0, vy: 0, r: 2.6, o: 1, only: Math.floor(rnd(0, FRAMES)) }) }
    if (lvl >= 5) mover('asteroid', rnd(60, 100), rnd(2, 3), 0.9)
    if (lvl >= 6) mover('icy', rnd(22, 28), rnd(2, 2.8), 0.85)
    if (milky) for (let k = 0; k <= deepIn; k++) { const [x, y] = place(40); objs.push({ kind: 'flicker', x, y, vx: 0, vy: 0, r: 2.4, o: 1 }) }
    return { stars, objs, planet: objs.find(o => o.kind === 'planet'), milky, deepIn, time: Math.round(22 - 6 * hard) + (milky ? 12 + 3 * deepIn : 0) }
  }
  // where an object is, and how bright, in one photo (the middle photo is its home position)
  const at = (o, f) => {
    const k = f - 1
    const op = o.kind === 'flicker' ? [1, 0.35, 0.8][f] : o.kind === 'glitch' ? (f === o.only ? 1 : 0) : o.o
    return { x: o.x + o.vx * k, y: o.y + o.vy * k, o: op }
  }

  function drawField () {
    gStars.innerHTML = ''; gObjs.innerHTML = ''; gFx.innerHTML = ''
    if (field.milky) el('ellipse', { class: 'bh-haze', cx: W / 2, cy: H / 2, rx: 720, ry: 130, transform: `rotate(-16 ${W / 2} ${H / 2})` }, gStars)
    for (const s of field.stars) el('circle', { cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: s.r.toFixed(2), opacity: s.o.toFixed(2) }, gStars)
    field.objs.forEach((o, n) => {
      o.node = el('circle', { r: o.r.toFixed(2), tabindex: 0, role: 'button', 'aria-label': `Dot ${n + 1}: pick it as the planet` }, gObjs)
      o.node.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); choose(o) } })
    })
    showFrame(frame)
  }
  function showFrame (f) {
    frame = f
    if (field) for (const o of field.objs) { const p = at(o, f); o.node.setAttribute('cx', p.x.toFixed(1)); o.node.setAttribute('cy', p.y.toFixed(1)); o.node.setAttribute('opacity', p.o) }
    root.querySelectorAll('.bh-pip').forEach(b => b.classList.toggle('is-on', +b.dataset.f === f))
  }
  function setPlaying (on) {
    playing = on
    clearInterval(blink); blink = 0
    if (on) blink = setInterval(() => showFrame((frame + 1) % FRAMES), BLINK_MS)
    const b = $('.bh-play'); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', on ? 'Pause the blinking' : 'Play the blinking'); b.classList.toggle('is-paused', !on)
  }

  // --- words and marks ----------------------------------------------------------------------------------------
  function say (word, line = '', cls = '', hold = 1700) {
    const m = $('.bh-msg')
    m.className = `bh-msg is-on ${cls}`
    m.innerHTML = `<b>${word}</b>${line ? `<span>${line}</span>` : ''}`
    clearTimeout(msgT)
    if (hold) msgT = setTimeout(() => m.classList.remove('is-on'), hold)
  }
  function tag (x, y, text, cls = '') {
    const g = el('g', { class: `bh-tag ${cls}`, transform: `translate(${x.toFixed(1)},${y.toFixed(1)})` }, gFx)
    el('circle', { r: 16 }, g)
    const t = el('text', { y: y < 60 ? 36 : -24 }, g); t.textContent = text
  }
  // the solution, shown at the end of every field (asked for): the planet popped out in ember with the three places
  // it crept through, and each impostor named
  function reveal (found) {
    const p = at(field.planet, frame)
    const a0 = at(field.planet, 0), a2 = at(field.planet, FRAMES - 1)
    for (const o of field.objs) {
      if (o.kind === 'planet') continue
      const q = at(o, o.kind === 'glitch' ? o.only : frame)
      if (q.x > 10 && q.x < W - 10 && q.y > 10 && q.y < H - 10) tag(q.x, q.y, WHAT[o.kind][0])
    }
    el('line', { class: 'bh-creep', x1: a0.x.toFixed(1), y1: a0.y.toFixed(1), x2: a2.x.toFixed(1), y2: a2.y.toFixed(1) }, gFx)
    const g = el('g', { class: `bh-planet ${found ? 'is-found' : 'is-missed'}`, transform: `translate(${p.x.toFixed(1)},${p.y.toFixed(1)})` }, gFx)
    el('circle', { class: 'bh-pop', r: 26 }, g); el('circle', { class: 'bh-halo', r: 26 }, g)
    const a = el('g', { class: 'bh-art' }, g)
    a.innerHTML = `<g transform="translate(-20,-20)">${svgMarkup('planet-nine', { size: 40, skin: currentSkin(), question: false })}</g>`
  }
  function hud () {
    $('.bh-count').innerHTML = phase === 'far' ? '<b>How far is it?</b>' : phase === 'big' ? '<b>How big is it?</b>' : phase === 'end' ? '<b>Found</b>' : `Field <b class="bh-i">${Math.min(FIELDS, idx + 1)}</b> of ${FIELDS}`
    $('.bh-pts').textContent = score
    const bar = $('.bh-timer i')
    bar.style.transform = `scaleX(${tMax ? Math.max(0, tLeft / tMax) : 1})`
    $('.bh-timer').classList.toggle('is-low', phase === 'play' && tLeft <= 5)
  }

  // --- the round --------------------------------------------------------------------------------------------------
  function tick (now) {
    raf = 0
    if (phase !== 'play') return
    tLeft -= (now - lastTick) / 1000; lastTick = now
    if (tLeft <= 0) { tLeft = 0; hud(); return end('time') }
    hud()
    raf = requestAnimationFrame(tick)
  }
  function start (i) {
    idx = i; field = makeField(i); phase = 'play'
    tMax = tLeft = field.time
    root.classList.remove('is-over')
    $('.bh-over').innerHTML = ''
    setPlaying(!reduce.matches); if (reduce.matches) showFrame(0)
    drawField(); hud()
    if (i === 0) say('One dot creeps between photos', 'Click it.', '', 4200)
    else if (i === 1) say('Now with an asteroid', 'The planet is the slow one.', '', 3200)
    else if (field.milky) say(field.deepIn ? 'Deeper into the Milky Way' : 'The Milky Way', field.deepIn ? 'More stars still.' : 'Crowded with stars. Look closely.', '', 4200)
    lastTick = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick)
  }
  function end (how) {
    if (phase !== 'play') return
    phase = 'between'; cancelAnimationFrame(raf); raf = 0
    setPlaying(false)
    const gain = Math.ceil(tLeft) * 10
    if (how === 'found') { score += gain; right++; reveal(true); say('Found it!', `+${gain}`, 'is-found', 0) } else { reveal(false); say('Out of time', 'It was here.', 'is-missed', 0) }
    hud()
    clearTimeout(after)
    after = setTimeout(() => (idx + 1 < FIELDS ? start(idx + 1) : measure('far')), how === 'found' ? 2300 : 3000)
  }
  function choose (o) {
    if (phase !== 'play') return
    if (o.kind === 'planet') return end('found')
    const p = at(o, frame), [name, why] = WHAT[o.kind]
    tag(p.x, p.y, name)
    tLeft = Math.max(0.01, tLeft - 3)
    say(name, `${why} −3 s`, 'is-missed')
  }
  function finish () {
    phase = 'end'
    clearInterval(mBlink); root.classList.remove('is-measure', 'is-match'); $('.bh-dial').hidden = true
    root.classList.add('is-over')
    gFx.innerHTML = ''; tMax = tLeft = 1; hud()
    $('.bh-msg').classList.remove('is-on')
    const record = score > best
    if (record) { best = score; try { localStorage.setItem(BEST_KEY, String(best)) } catch {} }
    const rank = RANKS.find(([n]) => right >= n)[1]
    const near = (n, to) => (Math.round(n / to) * to).toLocaleString('en-US')
    $('.bh-over').innerHTML = `<div class="bh-card is-end">
      <p class="bh-k">Your discovery</p>
      <div class="bh-pair">
        <figure><span class="bh-dot"></span><figcaption>through the telescope</figcaption></figure>
        <figure>${svgMarkup('planet-nine', { size: 96, skin: currentSkin(), question: false })}<figcaption>imagined up close</figcaption></figure>
      </div>
      <dl class="bh-facts">
        <div><dt>distance</dt><dd><span class="k-au">${near(find.d, 10)}&nbsp;AU</span></dd></div>
        <div><dt>width</dt><dd>${find.w.toFixed(1)}× Earth</dd></div>
        <div><dt>mass</dt><dd>about ${Math.round(find.m)} Earths</dd></div>
        <div><dt>one orbit</dt><dd>${near(periodYears, 100)} years</dd></div>
      </dl>
      <p class="bh-total"><b>${rank}</b> · ${right} of ${FIELDS} fields right · <b>${score}</b> points${record ? ', your best' : best ? ` · best ${best}` : ''}</p>
      <button type="button" class="bh-go">Play again</button></div>`
    $('.bh-go').focus({ preventScroll: true })
  }
  // --- the opening scene (asked for): a hill at night, a telescope, and an astronomer who walks up to it and looks in
  // when the reader presses the button or the telescope; the picture then dives into the eyepiece and the game is
  // what is seen through it. A second press skips the walk. With less motion asked for there is no walk or dive.
  const EYE = [586, 377], WALK = 368            // the eyepiece, and how far the astronomer walks to reach it
  function sceneMarkup () {
    const rs = (() => { let v = 7; return () => (v = (v * 16807) % 2147483647) / 2147483647 })()
    const stars = Array.from({ length: 120 }, () => `<circle cx="${(rs() * W).toFixed(0)}" cy="${(rs() * 400).toFixed(0)}" r="${(0.6 + rs() * 1.3).toFixed(2)}" opacity="${(0.3 + rs() * 0.6).toFixed(2)}"/>`).join('')
    return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <rect width="${W}" height="${H}" class="sc-sky"/>
      <g class="sc-stars">${stars}</g>
      <path class="sc-hill" d="M0,436 Q500,404 ${W},436 L${W},${H} L0,${H}Z"/>
      <g class="sc-scope" role="button" tabindex="0" aria-label="Look through the telescope">
        <path class="sc-leg" d="M660,342 L628,432 M660,342 L694,432 M660,342 L660,434"/>
        <g transform="rotate(-30 660 335)">
          <rect class="sc-tube" x="574" y="318" width="172" height="34" rx="6"/>
          <rect class="sc-tube is-front" x="736" y="312" width="22" height="46" rx="5"/>
          <rect class="sc-tube is-eye" x="556" y="327" width="20" height="16" rx="3"/>
        </g>
        <circle class="sc-mount" cx="660" cy="338" r="9"/>
        <circle class="sc-hint" cx="${EYE[0] - 14}" cy="${EYE[1] + 6}" r="16"/>
      </g>
      <g class="sc-walker"><g class="sc-person" transform="translate(190,432)">
        <g class="sc-lean">
          <path class="sc-limb sc-leg-a" d="M0,-30 L-7,0"/><path class="sc-limb sc-leg-b" d="M0,-30 L7,0"/>
          <rect class="sc-body" x="-11" y="-64" width="22" height="38" rx="9"/>
          <path class="sc-limb sc-arm" d="M2,-54 L16,-40"/>
          <circle class="sc-head" cx="0" cy="-77" r="11"/>
        </g>
      </g></g>
    </svg>`
  }
  let sceneT = 0, sceneOn = false
  function playScene () {
    const sc = $('.bh-scene')
    if (reduce.matches || !sceneOn) { endScene(); return newGame() }
    if (sc.classList.contains('is-walk')) { clearTimeout(sceneT); return dive() }      // pressed again: skip the walk
    $('.bh-over').classList.add('is-gone')
    sc.classList.add('is-walk')
    sceneT = setTimeout(() => { sc.classList.add('is-look'); sceneT = setTimeout(dive, 650) }, 1700)
  }
  function dive () {
    const sc = $('.bh-scene')
    if (sc.classList.contains('is-dive')) return
    newGame()                                   // the first field is already there, behind the scene, as it opens
    sc.classList.add('is-dive')
    sceneT = setTimeout(endScene, 950)
  }
  function endScene () {
    clearTimeout(sceneT); sceneOn = false
    const sc = $('.bh-scene'); sc.hidden = true; sc.className = 'bh-scene'; sc.innerHTML = ''
    $('.bh-over').classList.remove('is-gone', 'is-intro')
  }
  function intro () {
    phase = 'intro'
    root.classList.add('is-over')
    root.classList.remove('is-measure'); $('.bh-dial').hidden = true
    field = makeField(2); drawField(); setPlaying(false)
    tMax = tLeft = 1; idx = 0; score = 0; right = 0; hud()
    const sc = $('.bh-scene')
    sc.hidden = false; sc.innerHTML = sceneMarkup(); sceneOn = true
    sc.style.setProperty('--eye-x', `${(100 * EYE[0] / W).toFixed(1)}%`); sc.style.setProperty('--eye-y', `${(100 * EYE[1] / H).toFixed(1)}%`)
    sc.style.setProperty('--walk', `${WALK}px`)
    const scope = sc.querySelector('.sc-scope')
    scope.addEventListener('click', playScene)
    scope.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playScene() } })
    $('.bh-over').classList.add('is-intro')
    $('.bh-over').innerHTML = `<div class="bh-card">
      <p class="bh-lede">Through a telescope, Planet Nine would be one faint dot among thousands.</p>
      <ul class="bh-how">
        <li><i class="bh-ic is-stay"></i><span>Stars stay put.</span></li>
        <li><i class="bh-ic is-fast"></i><span>Asteroids race.</span></li>
        <li><i class="bh-ic is-slow"></i><span>Planet Nine creeps.</span></li>
      </ul>
      <button type="button" class="bh-go" data-scene>Look through the telescope</button></div>`
  }
  function newGame () {
    clearTimeout(after); clearTimeout(lockT); clearTimeout(msgT)
    $('.bh-msg').classList.remove('is-on'); root.classList.remove('is-match')
    $('.bh-reset').hidden = false
    score = 0; right = 0
    clearInterval(mBlink); root.classList.remove('is-measure'); $('.bh-dial').hidden = true
    // the planet this game's find turns out to be: somewhere on the best-fit orbit, likelier far out (it lingers
    // there), with a mass the fit allows and the width the papers' rule gives it
    const m = rnd(massRange[0], massRange[1])
    find = { d: rRange[0] + (rRange[1] - rRange[0]) * Math.sqrt(Math.random()), m, w: widthOf(m) }
    start(0)
  }

  // --- parts two and three: what the find is, shown beside things the reader knows ---------------------------------
  // No dial and no “test object” (both were tried and not understood, asked for): the find's shift is set beside
  // Neptune's and an asteroid's, then its brightness beside Earth's and Neptune's as they would look from there. Each
  // waits for Continue.
  let find = null, mBlink = 0, lockT = 0
  function measure (kind) {
    phase = kind
    clearInterval(blink); blink = 0; clearInterval(mBlink); clearTimeout(lockT); clearTimeout(after)
    root.classList.add('is-measure'); root.classList.remove('is-over')
    gObjs.innerHTML = ''; gFx.innerHTML = ''
    gStars.querySelectorAll('circle').forEach(c => c.setAttribute('opacity', 0.14))
    $('.bh-dial').hidden = false
    tMax = tLeft = 1; hud()
    const text = (x, y, str, cls = 'bh-lane') => { const t = el('text', { x, y, class: cls }, gFx); t.textContent = str; return t }
    const far = Math.round(find.d / 10) * 10, times = Math.round(find.d / neptuneAu)
    if (kind === 'far') {
      // each row is the same three photos; Neptune's shift and the find's are to one scale, the asteroid's runs off
      const X0 = 330, SN = 150, rows = [
        { y: 165, name: 'An asteroid', step: 420 },
        { y: 265, name: 'Neptune', step: SN },
        { y: 365, name: 'Your find', step: SN * neptuneAu / find.d, mine: true },
      ]
      for (const r of rows) {
        text(70, r.y + 6, r.name, `bh-lane${r.mine ? ' is-mine' : ''}`)
        for (let k = 0; k < FRAMES; k++) el('circle', { class: 'bh-ghost', cx: X0 + k * r.step, cy: r.y, r: 5 }, gFx)
        if (!r.mine) el('line', { class: 'bh-span', x1: X0, x2: Math.min(W - 30, X0 + 2 * r.step), y1: r.y + 22, y2: r.y + 22 }, gFx)
        r.dot = el('circle', { class: `bh-live${r.mine ? ' is-mine' : ''}`, cy: r.y, r: 5 }, gFx)
      }
      text(X0 + SN, 265 + 48, 'its shift between photos', 'bh-lane is-mid is-small')
      text(X0 + 2 * rows[2].step + 22, 365 + 6, `${times} times less`, 'bh-lane is-mine')
      let f = 0
      const draw = () => rows.forEach(r => r.dot.setAttribute('cx', X0 + f * r.step))
      draw(); mBlink = setInterval(() => { f = (f + 1) % FRAMES; draw() }, reduce.matches ? 1500 : BLINK_MS)
      say('The less a dot shifts, the farther it is', `Yours shifts ${times} times less than Neptune, so it is ${times} times as far: about ${far.toLocaleString('en-US')} AU.`, 'is-found', 0)
    } else {
      // how bright Earth and Neptune would look from that far, and the find between them; brightness drawn as size
      const U = 9, Y = 250, items = [
        { x: 300, name: 'Earth', w: 1 }, { x: 500, name: 'Your find', w: find.w, mine: true }, { x: 720, name: 'Neptune', w: neptuneWidth },
      ]
      for (const it of items) {
        el('circle', { class: `bh-live${it.mine ? ' is-mine' : ''}`, cx: it.x, cy: Y, r: U * it.w }, gFx)
        text(it.x, Y + 78, it.name, `bh-lane is-mid${it.mine ? ' is-mine' : ''}`)
      }
      text(500, Y + 108, `as each would look from ${far.toLocaleString('en-US')} AU`, 'bh-lane is-mid is-small')
      say('The brighter a dot, the bigger it is', `Yours is brighter than Earth would be out there and fainter than Neptune: about ${find.w.toFixed(1)} times as wide as Earth.`, 'is-found', 0)
    }
    const go = $('.bh-next')
    go.onclick = () => (kind === 'far' ? measure('big') : finish())
    go.focus({ preventScroll: true })
  }

  // --- input ------------------------------------------------------------------------------------------------------
  svg.addEventListener('click', e => {
    if (phase !== 'play') return
    const m = svg.getScreenCTM(); if (!m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    let hit = null, d = 28
    for (const o of field.objs) { const q = at(o, frame); if (q.o <= 0) continue; const dd = Math.hypot(q.x - p.x, q.y - p.y); if (dd < d) { d = dd; hit = o } }
    if (hit) return choose(hit)
    const s = field.stars.find(s => Math.hypot(s.x - p.x, s.y - p.y) < 9)
    if (s) { tag(s.x, s.y, WHAT.star[0]); tLeft = Math.max(0.01, tLeft - 1); say(WHAT.star[0], `${WHAT.star[1]} −1 s`, 'is-missed') }
  })
  root.querySelectorAll('.bh-pip').forEach(b => b.addEventListener('click', () => { setPlaying(false); showFrame(+b.dataset.f) }))
  $('.bh-play').addEventListener('click', () => setPlaying(!playing))
  $('.bh-over').addEventListener('click', e => { const b = e.target.closest('.bh-go'); if (b) (b.hasAttribute('data-scene') ? playScene() : newGame()) })
  $('.bh-reset').addEventListener('click', () => { endScene(); newGame() })
  root.addEventListener('keydown', e => {
    if (phase !== 'play' || e.target.closest('button')) return
    if (['1', '2', '3'].includes(e.key)) { setPlaying(false); showFrame(+e.key - 1) } else if (e.key === ' ') { e.preventDefault(); setPlaying(!playing) }
  })
  // nothing blinks or counts down while the game is off screen
  new IntersectionObserver(es => {
    const on = es[0].isIntersecting
    if (!on) { clearInterval(blink); blink = 0 } else if (playing && !blink && phase !== 'between' && phase !== 'end') setPlaying(true)
    if (phase === 'play') { if (on && !raf) { lastTick = performance.now(); raf = requestAnimationFrame(tick) } else if (!on) { cancelAnimationFrame(raf); raf = 0 } }
  }).observe(root)

  intro()
}
