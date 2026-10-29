// Part 1, page 1: the planet lineup and the definition of a planet.

import '../site.js'
import { loadData, showLoadError } from '../data.js'
import { makeLineup } from '../charts/lineup.js'
import { scrolly } from '../scrolly.js'

loadData('planets').then(({ planets }) => {
  const PLANETS = planets.planets.map(p => ({ name: p.name, a: p.a, e: p.e }))
  const lineup = makeLineup(document.querySelector('#chartLineup'), { planets: PLANETS })
  scrolly(document.querySelector('#lineupStory'), { onStep: (i, step) => lineup.setStep(step) })
}).catch(showLoadError)
