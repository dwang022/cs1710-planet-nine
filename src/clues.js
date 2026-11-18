// The two clues' words, “stretch out” (and “stretched”, “the stretch”) and “tilt”, in the part's red wherever a page writes them: the titles, the
// cards, the charts' labels (2026-11-17, asked for; first on the clustering page, then the probability page, which
// carries the same two clues on). Like site.js's Planet Nine lettering, applied at load and again as content arrives;
// inside a drawing the word becomes a tspan.
//
// The test is a separate, non-global pattern: a global one used with test() keeps the place it stopped, which
// matchAll() inherits, so a match would be missed and the text rewritten unchanged, which the watcher below would see
// and tint again, forever (as site.js warns; it froze the clustering page).

const CLUE_SRC = String.raw`\b(?:[Ss]tretch(?:es|ing|ed)?(?: far)?(?: out)?|[Tt]ilt(?:s|ed|ing)?)\b`
const CLUE_TEST = new RegExp(CLUE_SRC)
const CLUE_SKIP = '.k-clue, .clu-sci, .pick-card, nav, footer, script, style, title, [data-no-tint]'

function tintClues (root) {
  if (!root) return
  const found = []
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = root.nodeType === 3 ? root : walk.nextNode(); n; n = walk.nextNode()) {
    if (CLUE_TEST.test(n.data) && !n.parentElement?.closest(CLUE_SKIP)) found.push(n)
    if (n === root) break
  }
  for (const n of found) {
    const matches = [...n.data.matchAll(new RegExp(CLUE_SRC, 'g'))]
    if (!matches.length || !n.isConnected) continue    // never rewrite a text unchanged: the watcher would loop
    const svg = n.parentElement.closest('svg'), frag = document.createDocumentFragment()
    let last = 0
    for (const m of matches) {
      frag.append(n.data.slice(last, m.index))
      const el = svg ? document.createElementNS('http://www.w3.org/2000/svg', 'tspan') : document.createElement('span')
      el.setAttribute('class', 'k-clue')
      el.textContent = m[0]
      frag.append(el)
      last = m.index + m[0].length
    }
    frag.append(n.data.slice(last))
    n.replaceWith(frag)
  }
}

/** Tint the clues' words in the page now and in whatever is added to it later. */
export function watchClues () {
  tintClues(document.body)
  new MutationObserver(records => {
    for (const r of records) for (const a of r.addedNodes) if (a.isConnected) tintClues(a)
  }).observe(document.body, { childList: true, subtree: true })
}
