// Evidence, last page: the competing explanations and the case against a planet.
// The scorecard (charts/matrix.js) opens a panel under each row; the ledger
// below (charts/field.js) is the compact one, with each row's line kept.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawScorecard, markKey } from '../charts/matrix.js'
import { drawField, PICK } from '../charts/field.js'

const $ = s => document.querySelector(s)
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const word = n => WORDS[n] ?? String(n)

async function main () {
  const { alternatives: ALTS, papers: PAPERS, field_timeline: FIELD } = await loadData('alternatives', 'papers', 'field_timeline')

  // the counts in the heading come from the data
  const t = `${word(ALTS.alternatives.length)} explanations, ${word(ALTS.phenomena.length)} tests`
  $('#altTitle').textContent = t[0].toUpperCase() + t.slice(1)

  $('#altKey').innerHTML = markKey()
  drawScorecard($('#altTable'), { alternatives: ALTS.alternatives, phenomena: ALTS.phenomena, papers: PAPERS.papers })

  drawField($('#againstLedger'), {
    timeline: FIELD, papers: PAPERS.papers, legend: $('#againstLegend'), filter: PICK.against,
    compact: true, lines: true, future: false, lanes: ['against', 'data'],
  })
}

main().catch(showLoadError)
