// Evidence, last page: the competing explanations, as a scorecard
// (charts/matrix.js) whose rows open a panel each, then one line of where that
// leaves things.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawScorecard, markKey } from '../charts/matrix.js'
import { altHead } from '../charts/althead.js'
import { isOriginalSix } from '../orbits.js'

const $ = s => document.querySelector(s)
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = n => WORDS[n] ?? String(n)

async function main () {
  const { alternatives: ALTS, papers: PAPERS, etnos } = await loadData('alternatives', 'papers', 'etnos')

  // the head: the six bunched orbits, the suspects round them
  altHead($('#altHead'), { six: etnos.filter(isOriginalSix), alternatives: ALTS.alternatives })

  // the counts in the heading come from the data
  const t = `${word(ALTS.alternatives.length)} explanations, ${word(ALTS.phenomena.length)} clues`
  $('#altTitle').textContent = t[0].toUpperCase() + t.slice(1)

  $('#altKey').innerHTML = markKey()
  drawScorecard($('#altTable'), { alternatives: ALTS.alternatives, phenomena: ALTS.phenomena, papers: PAPERS.papers })
}

main().catch(showLoadError)
