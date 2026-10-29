// Part 1, page 1: the planet lineup and the definition of a planet.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLineup } from '../charts/lineup.js'
import { RULE_ART } from '../charts/rulesart.js'
import { scrolly } from '../scrolly.js'

// A drawing above each of the three requirements.
document.querySelectorAll('.definition li[data-rule]').forEach(li => {
  li.insertAdjacentHTML('afterbegin', `<figure class="rule-fig" aria-hidden="true">${RULE_ART[li.dataset.rule]()}</figure>`)
})

loadData('planets').then(({ planets }) => {
  const PLANETS = planets.planets.map(p => ({ name: p.name, a: p.a, e: p.e }))
  const lineup = makeLineup(document.querySelector('#chartLineup'), { planets: PLANETS })
  scrolly(document.querySelector('#lineupStory'), { onStep: (i, step) => lineup.setStep(step) })
}).catch(showLoadError)
