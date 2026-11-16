// Part 1, page 1: the planet lineup and the definition of a planet.

import '../site.js'
import { showLoadError } from '../data.js'
import { fontsReady } from '../fonts.js'
import { makeLineup } from '../charts/lineup.js'
import { RULE_ART } from '../charts/rulesart.js'
import { scrolly } from '../scrolly.js'

// A drawing above each of the three requirements.
document.querySelectorAll('.definition li[data-rule]').forEach(li => {
  li.insertAdjacentHTML('afterbegin', `<figure class="rule-fig" aria-hidden="true">${RULE_ART[li.dataset.rule]()}</figure>`)
})

// The lineup quotes no distances (the distance page does), so it needs no data, only the fonts its bubbles are measured in.
fontsReady.then(() => {
  const lineup = makeLineup(document.querySelector('#chartLineup'))
  scrolly(document.querySelector('#lineupStory'), { onStep: (i, step) => lineup.setStep(step) })
}).catch(showLoadError)
