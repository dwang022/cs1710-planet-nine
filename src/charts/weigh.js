// The alternatives page's figure (rebuilt 2026-11-18, asked for): every idea placed by how much of the clustering it
// explains (across: neither, the stretch only, the stretch and the tilt) and by what it needs that nobody has seen (up,
// a ladder of four: nothing new, one unseen body, much unseen matter, new physics). Luck's odds are written under it.
//
// It is pinned on the left while cards scroll past on the right (pages/alternatives.js): an introduction card, nothing
// dimmed, then a card per idea, the idea being read bright and everything else dim, its row's and column's names too
// (focus); after the last card it fills the width again, everything lit. Pointing at an idea gives a few words on
// what it is; clicking it scrolls to its card.
// With the black-hole skin, a click on the black hole pulls every other idea into it and lets them go (the old
// scorecard's egg).
//
// The verdicts and the ladder are our reading of the papers (scripts/tag_alternatives.py, with page references).

import * as d3 from 'd3'
import { url as siteUrl } from '../data.js'
import { ROW_ART } from './altart.js'
import './weigh.css'

/** What a verdict says, in a word or two. */
export const VERDICT = { yes: 'Fits', no: 'Doesn’t fit', times: 'At times', disputed: 'Disputed', fades: 'Would fade', unshown: 'Not shown', chance: 'By chance', apparent: 'Only apparent' }
/** How much of a clue a verdict accounts for, for the map: luck's chance counts, its odds written beside it. */
const COUNTS = { yes: 1, chance: 1, apparent: 1, times: 0.5, disputed: 0.5 }
const KINDS = ['stretch', 'tilt']
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** Superscript citations numbered in the order the page first cites each paper. */
export function makeCites (papers) {
  const byDoi = new Map(papers.map(p => [p.doi, p]))
  const nums = new Map()
  const citeId = label => 'cite-' + label.replace(/\(.*?\)/g, '').replace(/&/g, ' ').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const links = dois => dois.map(d => byDoi.get(d)).filter(Boolean).map(p => {
    if (!nums.has(p.doi)) nums.set(p.doi, nums.size + 1)
    return p
  }).sort((a, b) => nums.get(a.doi) - nums.get(b.doi))
    .map(p => `<a href="${siteUrl('credits.html')}#${citeId(p.label)}" title="${esc(p.label)}">${nums.get(p.doi)}</a>`).join(',')
  return { html: dois => dois?.length ? `<sup class="cite">${links(dois)}</sup>` : '' }
}

/** The page's items in order: each idea, but luck and where telescopes looked as one (alts.groups, with its own text). */
export function weighItems (alts) {
  const grouped = new Map((alts.groups || []).flatMap(gr => gr.ids.map(id => [id, gr])))
  const items = []
  for (const a of alts.alternatives) {
    const gr = grouped.get(a.id)
    if (!gr) items.push({ ...a, ids: [a.id] })
    else if (!items.some(it => it.id === gr.id)) items.push(gr)
  }
  return items
}

/** An idea's drawing (altart.js) as a nested svg, `s` across, centred on (x, y); for a group, its two overlapping. */
export function ideaArt (g, ids, x, y, s) {
  const one = (gg, id, xx, yy, ss) => {
    gg.html(ROW_ART[id]?.() || '')
    gg.select('svg').attr('x', xx - ss / 2).attr('y', yy - ss / 2).attr('width', ss).attr('height', ss)
  }
  if (ids.length < 2) one(g, ids[0], x, y, s)
  else ids.forEach((id, i) => one(g.append('g'), id, x + (i ? 1 : -1) * s * 0.24, y + (i ? 2 : -2), s * 0.8))
  return g
}

/**
 * root: the figure; items: weighItems(); tiers: alts.tiers; odds: luck's (“1 in 49”); onPick(id): an idea clicked.
 * Returns { focus(id | null) }.
 */
export function makeWeigh (root, { items, tiers, odds, onPick }) {
  const wrapEl = d3.select(root).style('position', 'relative')
  const svg = wrapEl.append('svg').attr('class', 'wg').attr('role', 'img')
    .attr('aria-label', 'Each idea placed by how much of the clustering it explains and by what it needs that nobody has seen.')
  const tip = wrapEl.append('div').attr('class', 'wg-tip').attr('hidden', true).attr('aria-hidden', 'true')
  let place = new Map(), current = null, sz = 40

  const xOf = a => KINDS.reduce((t, k) => t + (COUNTS[a.fits[k].v] || 0), 0)

  // a few words on what the idea is, just above it
  function showTip (a) {
    const p = place.get(a.id), k = root.getBoundingClientRect().width / (+svg.attr('data-w') || 1)
    tip.attr('hidden', null).html(`<b>${esc(a.short)}</b>${esc(a.gist)}`)
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight, bw = root.clientWidth
    tip.style('left', `${Math.max(4, Math.min(bw - tw - 4, p.x * k - tw / 2))}px`).style('top', `${p.y * k - sz * k / 2 - th - 10}px`)
  }
  const hideTip = () => tip.attr('hidden', true)

  function render (width) {
    const W = Math.max(300, Math.round(width)), small = W < 640
    const labW = small ? 0 : 150, rowH = small ? 92 : 100, top = 12, bottom = small ? 40 : 46
    const H = top + rowH * tiers.length + bottom
    const X0 = labW + (small ? 34 : 56), X1 = W - (small ? 72 : 96)
    const x = d3.scaleLinear([0, 2], [X0, X1])
    const rowTop = t => top + rowH * (tiers.length - 1 - t)
    const y = t => rowTop(t) + rowH / 2 + (small ? 8 : 0)
    sz = small ? 28 : 40
    svg.attr('viewBox', `0 0 ${W} ${H}`).attr('data-w', W).selectAll('*').remove()
    // up: what it needs, each rung's name at the left (over its row on a phone), a faint line between rungs
    tiers.forEach((name, t) => {
      svg.append('text').attr('class', 'wg-tier').attr('data-t', t).attr('x', 0).attr('y', small ? rowTop(t) + 16 : y(t) + 4).text(name)
      if (t) svg.append('line').attr('class', 'wg-rule').attr('x1', 0).attr('x2', W).attr('y1', rowTop(t) + rowH).attr('y2', rowTop(t) + rowH)
    })
    // across: how much it explains (2026-11-18, asked for: “clues” was a harder word)
    const baseY = top + rowH * tiers.length
    svg.append('line').attr('class', 'wg-axis').attr('x1', X0 - 30).attr('x2', W).attr('y1', baseY).attr('y2', baseY)
    if (!small) svg.append('text').attr('class', 'wg-tier wg-axt').attr('x', 0).attr('y', baseY + 22).text('Explains')
    const ticks = small ? [[0, 'Neither'], [1, 'Stretch'], [2, 'Both']] : [[0, 'Neither'], [1, 'The stretch'], [2, 'The stretch and tilt']]
    for (const [v, t] of ticks) {
      svg.append('text').attr('class', 'wg-tick').attr('data-v', v).attr('x', x(v)).attr('y', baseY + 22).attr('text-anchor', 'middle').text(t)
    }
    // the ideas: those that share a place side by side
    const gapX = small ? 58 : 88
    const cells = d3.group(items, a => `${xOf(a)}|${a.needs.tier}`)
    place = new Map()
    for (const [key, list] of cells) {
      const [xv, tv] = key.split('|').map(Number)
      list.forEach((a, i) => place.set(a.id, { x: x(xv) + (i - (list.length - 1) / 2) * gapX, y: y(tv) - (small ? 8 : 10) }))
    }
    const g = svg.append('g').selectAll('g').data(items, a => a.id).join('g')
      .attr('class', a => `wg-idea${a.id === 'planet_nine' ? ' is-p9' : ''}`).attr('tabindex', 0).attr('role', 'button')
      .attr('aria-label', a => `${a.short}: ${a.gist}`)
      .attr('transform', a => `translate(${place.get(a.id).x},${place.get(a.id).y})`)
    g.append('circle').attr('class', 'wg-hit').attr('r', sz * 0.8).attr('cy', 6)
    g.each(function (a) { ideaArt(d3.select(this).append('g').attr('class', 'wg-art'), a.ids, 0, 0, sz) })
    g.append('text').attr('class', 'wg-name').attr('data-no-tint', '').attr('y', sz / 2 + 15).attr('text-anchor', 'middle').each(function (a) {
      // on a phone a name of more than one word goes on two lines when it is wider than its room
      const t = d3.select(this).text(a.short), words = a.short.split(' ')
      if (!small || words.length < 2 || this.getComputedTextLength() <= gapX - 6) return
      t.text(null)
      const cut = Math.ceil(words.length / 2)
      t.append('tspan').attr('x', 0).text(words.slice(0, cut).join(' '))
      t.append('tspan').attr('x', 0).attr('dy', '1.15em').text(words.slice(cut).join(' '))
    })
    g.filter(a => a.id === 'primordial_black_hole').append('text').attr('class', 'wg-egg').attr('y', sz / 2 + 30).attr('text-anchor', 'middle').text('Your pick')
    // luck's odds under its point
    const pp = place.get('small_sample')
    if (pp) svg.append('text').attr('class', 'wg-odds').attr('x', pp.x).attr('y', pp.y + sz / 2 + (small ? 44 : 32)).attr('text-anchor', 'middle').text(odds)
    g.on('pointerenter focus', (ev, a) => showTip(a))
      .on('pointerleave blur', hideTip)
      .on('click', (ev, a) => { hideTip(); if (a.id === 'primordial_black_hole') swallow(); onPick?.(a.id) })
      .on('keydown', (ev, a) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPick?.(a.id) } })
    focus(current)
  }

  /** The idea being read bright, everything else dim, its row's and column's names too; null shows all. */
  function focus (id) {
    current = id
    const it = id && items.find(i => i.id === id)
    svg.classed('is-focus', !!it)
    svg.selectAll('.wg-idea').classed('is-on', a => a.id === id)
    svg.selectAll('.wg-tier[data-t]').classed('is-on', function () { return !!it && +this.dataset.t === it.needs.tier })
    svg.selectAll('.wg-tick').classed('is-on', function () { return !!it && Math.abs(+this.dataset.v - xOf(it)) <= 0.5 })
    svg.selectAll('.wg-odds').classed('is-on', id === 'small_sample')
  }

  // the egg: with the black-hole skin, a click on the black hole pulls every other idea in and lets them go
  let swallowing = false
  function swallow () {
    if (swallowing || reduced() || document.documentElement.dataset.skin !== 'black-hole') return
    swallowing = true
    const hole = place.get('primordial_black_hole')
    svg.selectAll('g.wg-idea').filter(a => a.id !== 'primordial_black_hole')
      .transition().duration(1000).ease(d3.easeCubicIn)
      .attrTween('transform', a => {
        const p = place.get(a.id)
        return t => `translate(${p.x + (hole.x - p.x) * t},${p.y + (hole.y - p.y) * t}) rotate(${540 * t}) scale(${1 - t})`
      })
      .transition().duration(700).ease(d3.easeBackOut)
      .attrTween('transform', a => {
        const p = place.get(a.id)
        return t => `translate(${hole.x + (p.x - hole.x) * t},${hole.y + (p.y - hole.y) * t}) scale(${t})`
      })
    svg.selectAll('.wg-odds').transition().duration(300).attr('opacity', 0).transition().delay(1400).duration(300).attr('opacity', 1)
    const egg = svg.select('.wg-egg').classed('show', true)
    setTimeout(() => { swallowing = false }, 1800)
    setTimeout(() => egg.classed('show', false), 3200)
  }

  // drawn to the figure's width, so the words keep their size; again whenever the width changes (it narrows as the
  // cards come up beside it)
  let size = 0, raf = 0
  const now = () => Math.round(svg.node().getBoundingClientRect().width || root.clientWidth)
  render(now())
  size = now()
  new ResizeObserver(() => {
    if (Math.abs(now() - size) < 4) return
    size = now()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(() => { hideTip(); render(size) })
  }).observe(root)
  return { focus }
}
