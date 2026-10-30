// Part 1, page 3: the blink comparator, real discovery frames flipped the way
// Tombaugh flipped his plates (makeBlink), built for every image set in
// public/tracking/credits.json (buildBlinks).
//
// Nothing here is drawn from memory: the frames are Commons files fetched by
// scripts/fetch_tracking_images.py.

import { url } from '../data.js'

// --- the blink comparator -----------------------------------------------------

/**
 * frames  [{ src, label }]  one image per exposure, same field each time
 * credit  text for the caption's credit line
 * interval ms between flips
 */
export function makeBlink (root, { frames, caption, credit, license, licenseUrl, source, interval = 750 }) {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  const many = frames.length > 1
  root.classList.add('blink')
  // the pause button and each frame's date sit on the image itself
  root.innerHTML = `
    <div class="blink-stage">${frames.map((f, i) => `<img src="${esc(f.src)}" alt="" loading="lazy" decoding="async" class="${i === 0 ? 'is-on' : ''}">`).join('')}
      ${many ? '<button type="button" class="blink-play" aria-pressed="true" aria-label="Pause the blinking">❚❚</button>' : ''}
      ${frames[0].label ? `<span class="blink-label">${esc(frames[0].label)}</span>` : ''}
    </div>
    ${caption || credit ? `<figcaption>${esc(caption)}<span class="blink-credit">${esc(credit)}${license ? ` · ${licenseUrl ? `<a href="${esc(licenseUrl)}" rel="noopener">${esc(license)}</a>` : esc(license)}` : ''}${source ? ` · <a href="${esc(source)}" rel="noopener">source</a>` : ''}</span></figcaption>` : ''}`
  if (!many) return { stop () {} }

  const imgs = [...root.querySelectorAll('.blink-stage img')]
  const label = root.querySelector('.blink-label')
  const play = root.querySelector('.blink-play')
  let k = 0, timer = null, wanted = true
  const show = i => {
    k = i
    imgs.forEach((im, j) => im.classList.toggle('is-on', j === i))
    if (label) label.textContent = frames[i].label
  }
  const start = () => { if (!timer) timer = setInterval(() => show((k + 1) % frames.length), interval) }
  const stop = () => { if (timer) { clearInterval(timer); timer = null } }
  play.addEventListener('click', () => {
    wanted = !wanted
    play.setAttribute('aria-pressed', String(wanted))
    play.setAttribute('aria-label', wanted ? 'Pause the blinking' : 'Resume the blinking')
    play.textContent = wanted ? '❚❚' : '▶'
    wanted ? start() : stop()
  })
  root.querySelector('.blink-stage').addEventListener('click', ev => { if (!wanted && !ev.target.closest('button')) show((k + 1) % frames.length) })
  // Only blink while on screen; a dozen timers on a long page would be wasteful.
  const io = new IntersectionObserver(es => { for (const e of es) (e.isIntersecting && wanted) ? start() : stop() }, { threshold: 0.2 })
  io.observe(root)
  return { stop: () => { stop(); io.disconnect() } }
}

/** Build every blink player from public/tracking/credits.json. `slots` maps image id -> element. */
export function buildBlinks (credits, slots) {
  const out = []
  for (const im of credits.images) {
    const el = slots[im.id]
    if (!el) continue
    const frames = im.files.map((f, i) => ({ src: url(`tracking/${f}`), label: im.dates[i] || '' }))
    out.push(makeBlink(el, {
      frames, caption: im.caption, credit: im.credit, license: im.license, licenseUrl: im.license_url, source: im.source,
    }))
  }
  return out
}
