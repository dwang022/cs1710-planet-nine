// One shared tooltip for the charts that show a few words on pointing (the distance map, the planets lineup, the
// catalogue, the arcs chart): a single element made on first use, placed beside the pointer and kept on screen.

let el = null

function node () {
  if (!el) {
    el = document.createElement('div')
    el.className = 'tooltip'
    el.setAttribute('role', 'tooltip')
    document.body.appendChild(el)
  }
  return el
}

/** Show `html` beside the pointer of `event`, flipped to the other side near the window's edge. */
export function showTip (event, html) {
  const t = node()
  t.innerHTML = html
  t.classList.add('show')
  const r = t.getBoundingClientRect()
  const pad = 14
  let x = event.clientX + pad
  let y = event.clientY + pad
  if (x + r.width > window.innerWidth - 8) x = event.clientX - r.width - pad
  if (y + r.height > window.innerHeight - 8) y = event.clientY - r.height - pad
  t.style.left = Math.max(8, x) + 'px'
  t.style.top = Math.max(8, y) + 'px'
}

export function hideTip () { if (el) el.classList.remove('show') }
