// A guided walkthrough for someone who has never looked at an orbit plot.
//
// Each stop scrolls to a target, spotlights it, explains in plain language, and
// may set the controls so the reader sees the thing being described rather than
// being told to go find it.

const STOPS = [
  {
    target: '#scaleStrip',
    title: 'First, how far away is "far"?',
    body: 'One AU is the distance from Earth to the Sun. Neptune sits at 30. The objects on this page swing out to hundreds. Nothing we have ever launched has been that far.',
  },
  {
    target: '#chartScatter',
    title: 'Each dot is one real object',
    body: 'Left to right: how far the orbit reaches. Bottom to top: how close it gets to the Sun. Objects above the grey line never come near enough for Neptune to have pushed them around — so something else shaped them.',
  },
  {
    target: '#chartOrbits',
    title: 'Now the same objects as orbits',
    body: 'Each bright arc is one object\'s path near the Sun. The dot is its closest point — think of it as the direction that orbit "points". Hover any arc and watch it light up in every other chart at once.',
  },
  {
    target: '#chartRose',
    title: 'The pattern, boiled down',
    body: 'Here each object is just one number: which way it points, 0 to 360 degrees. If nothing were organising them, the dots would ring the circle evenly. They do not — they bunch up. The white arrow is the average, and its length is how strongly they agree.',
  },
  {
    target: '#chartNull',
    title: 'But could that bunching be luck?',
    body: 'We built thousands of fake solar systems where objects point in totally random directions, and measured how bunched each one looked. Grey is luck. The blue line is reality. The further right the blue line sits, the harder it is to explain as coincidence.',
    action: { quality: true, aMin: 150, qMin: 30 },
  },
  {
    target: '#controls',
    title: 'Here is the honest part',
    body: 'Untick "only well-measured orbits" and watch everything move. Including objects we have only glimpsed briefly drops the sample from 44 to 90 and the pattern nearly vanishes. The conclusion depends on a judgement call, which is exactly what astronomers are still arguing about.',
    action: { quality: false },
  },
  {
    target: '#chartSky',
    title: 'And where have we actually looked?',
    body: 'This is the whole sky flattened onto a page. Shaded patches are where telescopes have searched. The green line is where Planet Nine would have to be. Most of it has been covered — the gap is where it crosses the crowded band of the Milky Way.',
    action: { quality: true },
  },
]

export function initTour (applyState) {
  const btn = document.querySelector('#tourBtn')
  if (!btn) return
  let i = -1

  const bar = document.createElement('div')
  bar.className = 'tour-bar'
  bar.hidden = true
  bar.innerHTML = `
    <div class="tour-inner">
      <div class="tour-step" id="tourStep"></div>
      <div class="tour-text">
        <strong id="tourTitle"></strong>
        <span id="tourBody"></span>
      </div>
      <div class="tour-nav">
        <button class="btn-reset" id="tourPrev" type="button">Back</button>
        <button class="btn-reset" id="tourNext" type="button">Next</button>
        <button class="btn-reset" id="tourEnd" type="button">Done</button>
      </div>
    </div>`
  document.body.appendChild(bar)

  const clearSpot = () =>
    document.querySelectorAll('.tour-spot').forEach(e => e.classList.remove('tour-spot'))

  function show (n) {
    if (n < 0 || n >= STOPS.length) return end()
    i = n
    const s = STOPS[i]
    clearSpot()
    const el = document.querySelector(s.target)
    if (el) {
      el.classList.add('tour-spot')
      const top = el.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: top - 140, behavior: 'smooth' })
    }
    if (s.action) applyState(s.action)
    bar.hidden = false
    document.body.classList.add('touring')
    document.querySelector('#tourStep').textContent = `${i + 1} / ${STOPS.length}`
    document.querySelector('#tourTitle').textContent = s.title
    document.querySelector('#tourBody').textContent = s.body
    document.querySelector('#tourPrev').disabled = i === 0
    document.querySelector('#tourNext').textContent = i === STOPS.length - 1 ? 'Finish' : 'Next'
  }

  function end () {
    clearSpot()
    bar.hidden = true
    document.body.classList.remove('touring')
    i = -1
  }

  btn.addEventListener('click', () => show(0))
  document.querySelector('#tourNext').addEventListener('click', () => show(i + 1))
  document.querySelector('#tourPrev').addEventListener('click', () => show(i - 1))
  document.querySelector('#tourEnd').addEventListener('click', end)
  document.addEventListener('keydown', e => {
    if (bar.hidden) return
    if (e.key === 'Escape') end()
    if (e.key === 'ArrowRight') show(i + 1)
    if (e.key === 'ArrowLeft') show(i - 1)
  })
}
