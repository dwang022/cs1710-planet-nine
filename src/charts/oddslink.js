// The timeline page's version 2 (2026-11-17): the paper chosen on the distance and mass dashboard, lit on the odds
// chart (charts/odds.js) when that chart has a row for the very same paper. Papers are matched by DOI only, which
// both files carry (planet_nine_predictions.json, published_odds.json), so a review or a later paper by the same
// authors is never taken for another; with no match nothing on the chart changes. Only the look changes: a soft band
// behind the row in Planet Nine's colour, its dot pulsing once, the other rows a little quieter but readable. No
// value moves.
//
// odds.js is used as it is: its rows carry the study's DOI in their bound data (a field it ignores), and since it
// redraws from scratch when its width changes, the band is put back after every redraw (a MutationObserver).
// Remove this module and its call in pages/timeline.js to take the link out.

const NS = 'http://www.w3.org/2000/svg'

/** root: the element drawOdds draws into. Returns { set(doi | null) }. */
export function oddsLink (root) {
  let doi = null
  const apply = () => {
    const svg = root.querySelector('svg')
    if (!svg) return
    const W = svg.viewBox.baseVal?.width || 900
    let any = false
    for (const g of svg.querySelectorAll('g.row')) {
      const on = !!doi && g.__data__?.doi === doi
      any ||= on
      g.classList.toggle('is-hl', on)
      const band = g.querySelector(':scope > .pv-hl')
      if (on && !band) {
        const b = g.getBBox()
        const r = document.createElementNS(NS, 'rect')
        r.setAttribute('class', 'pv-hl')
        r.setAttribute('x', -6); r.setAttribute('width', W + 12)
        r.setAttribute('y', b.y - 7); r.setAttribute('height', b.height + 14)
        r.setAttribute('rx', 8)
        g.insertBefore(r, g.firstChild)   // first, so it sits behind the row's words and marks
      } else if (!on && band) band.remove()
    }
    svg.classList.toggle('has-hl', any)
    if (!svg.classList.length) svg.removeAttribute('class')   // unlit, the chart is exactly as odds.js drew it
  }
  // childList only: the band's own insertion re-runs apply once, which then finds nothing to change
  new MutationObserver(apply).observe(root, { childList: true, subtree: true })
  return { set (d) { if (d === doi) return; doi = d; apply() } }
}
