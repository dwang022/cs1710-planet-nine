// Shooting stars: now and then a bright head crosses `sky` (an empty, absolutely
// placed element over the scene) trailing a fading tail (.meteor in site.css).
// Used by the intro and the data page's head. Starting points fall across the
// width and in the top `top` share of the height (at most `maxH` px); each
// travels between `dist` px down and to the right. None when the reader asks
// for reduced motion.

export function meteors (sky, { top = 0.45, maxH = 900, dist = [260, 680], every = [1600, 4800] } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const one = () => {
    if (document.hidden) return
    const m = document.createElement('div')
    m.className = 'meteor'
    m.style.left = `${Math.random() * sky.clientWidth * 0.9}px`
    m.style.top = `${Math.random() * Math.min(sky.clientHeight, maxH) * top}px`
    m.style.setProperty('--angle', `${18 + Math.random() * 22}deg`)
    m.style.setProperty('--dist', `${dist[0] + Math.random() * (dist[1] - dist[0])}px`)
    m.style.setProperty('--len', `${90 + Math.random() * 120}px`)
    m.style.setProperty('--dur', `${0.9 + Math.random() * 0.9}s`)
    sky.appendChild(m)
    m.addEventListener('animationend', () => m.remove())
  }
  const loop = () => {
    one()
    if (Math.random() < 0.25) setTimeout(one, 180 + Math.random() * 300)
    setTimeout(loop, every[0] + Math.random() * (every[1] - every[0]))
  }
  setTimeout(loop, 700)
  // A hidden tab pauses the animations but not the timers, so meteors made
  // while away would all streak at once on return: clear them instead.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sky.querySelectorAll('.meteor').forEach(m => m.remove()) })
}
