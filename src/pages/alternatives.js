// Evidence, last page: the clues any explanation must fit, a drawing each
// (charts/clueart.js), then the competing explanations as a scorecard
// (charts/matrix.js) the reader filters by clue, whose rows open a panel each.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawScorecard, markKey } from '../charts/matrix.js'
import { altHead } from '../charts/althead.js'
import { clueArt } from '../charts/clueart.js'
import { isOriginalSix } from '../orbits.js'

const $ = s => document.querySelector(s)

async function main () {
  const { alternatives: ALTS, papers: PAPERS, etnos } = await loadData('alternatives', 'papers', 'etnos')

  // the head: the six bunched orbits, the suspects round them
  altHead($('#altHead'), { six: etnos.filter(isOriginalSix), alternatives: ALTS.alternatives })

  // the clues, a drawing and a line each
  const art = clueArt({ six: etnos.filter(isOriginalSix), sedna: etnos.find(o => o.id === '90377') })
  $('#clueCards').innerHTML = ALTS.phenomena.map(p => `<li><figure class="rule-fig" aria-hidden="true">${art[p.id]?.() || ''}</figure>
    <div><b>${p.label}</b>${p.plain}</div></li>`).join('')

  $('#altKey').innerHTML = markKey()
  drawScorecard($('#altTable'), { alternatives: ALTS.alternatives, phenomena: ALTS.phenomena, papers: PAPERS.papers })
}

main().catch(showLoadError)
