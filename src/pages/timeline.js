// Part 3, page 2: the compact ledger and how the proposed planet changed.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { drawField, PICK } from '../charts/field.js'
import { drawProposals } from '../charts/proposals.js'

const $ = s => document.querySelector(s)

async function main () {
  const { field_timeline: FIELD, papers: PAPERS, planet_nine_predictions: PRED } = await loadData('field_timeline', 'papers', 'planet_nine_predictions')
  drawField($('#fieldTimeline'), { timeline: FIELD, papers: PAPERS.papers, legend: $('#fieldLegend'), filter: PICK.all, compact: true, future: false, lanes: ['for', 'against', 'data'] })
  // phones get their own layout of the chart (time running down); redraw when the screen crosses over
  const draw = () => drawProposals($('#chartProposals'), PRED.orbit_predictions)
  draw()
  window.matchMedia('(max-width: 640px)').addEventListener('change', draw)
}

main().catch(showLoadError)
