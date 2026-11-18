// What Planet Nine is made of, as far as the drawing is concerned.
//
// Nobody knows: no paper predicts a colour. The reader picks a skin on the
// intro screen and the same drawing follows them through every page. Four
// skins stand for materials the literature actually discusses (and one
// alternative to a planet); two are for fun. Every skin keeps the question
// mark, because whatever it is made of, it is still a prediction.
//
// Pure: each `paint(id)` returns the markup for the inside of the disc (the
// caller clips it) so art.js and scripts/export_art.mjs can both use it.
//   outline  the disc's edge, in the skin's own hue
//   q        recolours (and for the nine-ball moves) the question mark
//   colour   one flat colour for thin strokes and dots on the near-black page:
//            the orbit in a chart, the herding planet, the case for a planet.
//            site.js publishes it as --p9. Each is at least 15 (OKLab ΔE × 100)
//            from violet, ember and red, the site's other three meanings.
//   text     the CSS background painted through the lettering of every
//            "Planet Nine" (--p9-text): the one thing on the site that is not
//            flat, and each skin's own. Gradients, bands and an inline SVG
//            pattern only; spots are chopped up by the thin strokes of the
//            letters. Every colour in it reads on #0f0f11 at 15 px.
//            The letters sit between 22% (cap height) and 77% (baseline) of
//            the box a span paints, 37% being the top of the lower case;
//            the bands are placed by those numbers.
//   stops    [light, deep]: the same two tones for SVG linearGradients, such as
//            Planet Nine's label inside a chart.
// The ocean world is deep blue, by request.

const R = 40

const disc = fill => `<circle cx="50" cy="50" r="${R}" fill="${fill}"/>`
const shade = (opacity = 0.32) => `<circle cx="${50 + R * 0.52}" cy="50" r="${R}" fill="#06100e" opacity="${opacity}"/>`
function band (y, h, fill, opacity = 1, amp = 2.2) {
  const y2 = y + h
  return `<path d="M0,${y} C25,${y - amp} 40,${y + amp} 60,${y} S90,${y - amp} 100,${y + amp / 2} ` +
    `L100,${y2 + amp} C80,${y2 - amp} 60,${y2 + amp} 40,${y2} S15,${y2 - amp} 0,${y2 + amp / 2} Z" ` +
    `fill="${fill}" opacity="${opacity}"/>`
}

/** An SVG drawing as a CSS background image. */
const svgBg = svg => `url("data:image/svg+xml,${svg.replace(/\s+/g, ' ').replace(/"/g, "'")
  .replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`

// Two rows of waves for the ocean's lettering, one tile 110 wide and 127 tall (the box of one
// line of text, 1.27 em): spray above the lower case, a white crest through the middle of the
// letters, a second, deeper row below it. The ends meet, so the tile repeats along the word.
const WAVES = svgBg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 127" preserveAspectRatio="none">
  <rect width="110" height="127" fill="#cfe6ff"/>
  <path d="M0,46 C18,46 22,58 55,58 S92,46 110,46 V127 H0 Z" fill="#69a8ff"/>
  <path d="M0,46 C18,46 22,58 55,58 S92,46 110,46" fill="none" stroke="#ffffff" stroke-width="7"/>
  <path d="M0,80 C18,80 22,68 55,68 S92,80 110,80 V127 H0 Z" fill="#3a7ff6"/>
  <path d="M0,80 C18,80 22,68 55,68 S92,80 110,80" fill="none" stroke="#a9d1ff" stroke-width="5"/>
</svg>`)

export const SKINS = {
  'ice-giant': {
    name: 'Ice giant',
    colour: '#45ecd2',
    stops: ['#e6fffb', '#2fd8c8'],
    // ice on the tops of the capitals, over slanting aurora bands of green, cyan and ice white
    text: 'linear-gradient(180deg, #f2fffd 22% 31%, rgba(242,255,253,0) 31%), ' +
      'repeating-linear-gradient(112deg, #45f5a6 0 .1em, #34e3f5 .42em, #e4fffb .64em, #7cf6d6 .86em, #45f5a6 1.12em)',
    blurb: 'The mainstream guess: a small Neptune, ice and rock wrapped in hydrogen and helium.',
    source: 'Batygin et al. 2019; Brown & Batygin 2021',
    outline: '#123f36',
    paint: () => `${disc('#2aa092')}
      ${band(29, 8, '#50c8b0')}
      ${band(46, 11, '#1c786b')}
      ${band(66, 6, '#50c8b0', 0.9)}
      <ellipse cx="37" cy="25" rx="11" ry="5" fill="#b4f5e3" opacity="0.5"/>
      ${shade(0.32)}`,
  },
  rock: {
    name: 'Rock world',
    colour: '#dcb88a',
    stops: ['#f4dcb2', '#c8916a'],
    // five level strata of sandstone, ochre and taupe across the height of the letters (capitals run
    // 22% to 77% of the box); level, because any slant is spread over the whole word's width
    text: 'linear-gradient(180deg, #f4dcb2 0 33%, #e3a96c 33% 44%, #f2d3a2 44% 55%, #c8916a 55% 66%, #b99a7c 66%)',
    blurb: 'A bare world of rock and ice, a few times heavier than Earth, with at most a thin atmosphere.',
    source: 'one of the compositions Brown & Batygin 2021 allow',
    outline: '#4a3a30',
    paint: () => `${disc('#a08069')}
      <circle cx="36" cy="38" r="8" fill="#6a4f40"/><circle cx="62" cy="58" r="6" fill="#6a4f40"/>
      <circle cx="58" cy="30" r="3.5" fill="#6a4f40"/><circle cx="40" cy="66" r="4" fill="#6a4f40"/>
      <circle cx="30" cy="56" r="2.6" fill="#bea38d" opacity=".65"/>
      ${shade(0.34)}`,
  },
  ocean: {
    name: 'Ocean world',
    colour: '#2f74f0',
    stops: ['#cfe6ff', '#3a7ff6'],
    // two rows of waves running through the letters, a white crest between them
    text: `${WAVES} 0 0 / 1.1em 100% repeat-x, #5c9dff`,
    blurb: 'Water ice and a deep ocean under a thin, hazy sky, far too cold to be liquid at the surface.',
    source: 'a water-rich composition, as in Linder & Mordasini 2016',
    outline: '#0f2d5c',
    paint: () => `${disc('#2059b0')}
      ${band(34, 7, '#3681dc', 0.75, 1.6)}
      ${band(58, 9, '#18428a', 0.85, 1.6)}
      <path d="M26,46 C34,40 42,44 48,40" fill="none" stroke="#e1edfa" stroke-width="3.2" stroke-linecap="round" opacity=".8"/>
      <path d="M56,70 C62,66 70,68 76,64" fill="none" stroke="#e1edfa" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <ellipse cx="50" cy="14" rx="14" ry="5" fill="#eef5fb" opacity=".8"/>
      ${shade(0.28)}`,
  },
  iron: {
    name: 'Iron world',
    colour: '#ffb52e',
    stops: ['#e8edf2', '#ffa53a'],
    // forged: polished steel at the tops of the letters, a glint, then heat rising from the
    // baseline, orange to white-hot
    text: 'linear-gradient(180deg, #c3ccd6 22%, #f7f9fb 30% 32%, #a3aebb 36%, #7f8b99 44%, #ff9a30 52%, #ffbf4a 64%, #fff0b8 77%)',
    blurb: 'Mostly metal, like a giant Mercury: dense, dark and dull, with rust-red plains.',
    source: 'a dense composition the mass estimates do not rule out',
    outline: '#3a1814',
    paint: () => `${disc('#8b3e31')}
      ${band(40, 6, '#a85142', 0.8, 1.4)}
      <path d="M22,62 C34,54 50,58 62,52 C72,48 82,54 90,50 L90,70 L22,70 Z" fill="#d6623f" opacity=".62"/>
      <circle cx="40" cy="30" r="5" fill="#5a2620"/><circle cx="64" cy="36" r="3" fill="#5a2620"/>
      <ellipse cx="36" cy="22" rx="9" ry="4" fill="#dca393" opacity=".32"/>
      ${shade(0.36)}`,
  },
  'black-hole': {
    name: 'Primordial black hole',
    colour: '#ffcf8f',
    stops: ['#fff4dc', '#f5a04a'],
    // a thin white-hot disc through the middle of the letters, amber above and below,
    // brighter on the side coming towards us
    text: 'linear-gradient(90deg, rgba(255,250,236,.4), rgba(255,250,236,0) 60%), ' +
      'linear-gradient(180deg, #e8893a 22%, #ffb24f 40%, #fff8ea 48% 54%, #ffb24f 62%, #e8893a 77%)',
    blurb: 'Same mass, same orbit, but a black hole the size of a grapefruit instead of a planet.',
    source: 'Scholtz & Unwin 2020',
    outline: '#000000',
    q: { fill: '#f3e6c8', stroke: '#3a2a10' },
    paint: () => `${disc('#050507')}
      <circle cx="50" cy="50" r="31" fill="none" stroke="#f5a64a" stroke-width="5" opacity=".95"/>
      <circle cx="50" cy="50" r="31" fill="none" stroke="#fff1c9" stroke-width="1.6" opacity=".85"/>
      <ellipse cx="50" cy="50" rx="39" ry="7" fill="none" stroke="#ec8f3a" stroke-width="3.5" opacity=".75" transform="rotate(-18 50 50)"/>
      <circle cx="50" cy="50" r="25" fill="#000"/>`,
  },
  cheese: {
    name: 'Cheese',
    colour: '#f7e04a',
    stops: ['#ffe680', '#e8932a'],
    // a slice across the wheel: rind along the tops and the feet of the letters, a cream
    // edge inside each, the paste between
    text: 'linear-gradient(180deg, #d98c2b 22%, #f2a43a 31%, #fff6d2 33% 35%, #ffe680 37%, #ffd84a 62%, ' +
      '#fff0b0 66% 67.5%, #f2a43a 69.5%, #d98c2b 77%)',
    blurb: 'Not a serious proposal. But nobody can prove otherwise until someone sees it.',
    source: 'folklore',
    outline: '#8c6a1a',
    q: { fill: '#fff6d6', stroke: '#6b4e0e' },
    paint: () => `${disc('#f1c64f')}
      <circle cx="33" cy="36" r="7" fill="#c9981f"/><circle cx="60" cy="30" r="4.5" fill="#c9981f"/>
      <circle cx="66" cy="60" r="7.5" fill="#c9981f"/><circle cx="38" cy="66" r="4" fill="#c9981f"/>
      <circle cx="50" cy="82" r="3" fill="#c9981f"/><circle cx="22" cy="56" r="3" fill="#c9981f"/>
      <ellipse cx="36" cy="24" rx="10" ry="4.5" fill="#fff0b8" opacity=".55"/>
      ${shade(0.22)}`,
  },
  'nine-ball': {
    name: 'Nine-ball',
    colour: '#ffcc1a',
    stops: ['#fffdf6', '#ffcc1a'],
    // the ball's white above and below, its yellow stripe round the middle of the letters
    text: 'linear-gradient(180deg, #fffdf6 35%, #e9a800 35% 37%, #ffcc1a 37% 63%, #e9a800 63% 65%, #fffdf6 65%)',
    blurb: 'The ninth ball on the table. Also not a serious proposal.',
    source: 'the game of nine-ball',
    outline: '#7a6a10',
    q: { fill: '#161618', stroke: '#ffffff', x: 61, size: 34, y: 62 },
    paint: () => `${disc('#f6f0dc')}
      <path d="M0,34 L100,34 L100,66 L0,66 Z" fill="#e8c21c"/>
      <ellipse cx="50" cy="50" rx="27" ry="20" fill="#fbf7ea" stroke="#d9cfa8" stroke-width="1"/>
      <text x="39" y="62" text-anchor="middle" font-family="'Space Grotesk Variable', 'Space Grotesk', ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="700" fill="#161618">9</text>
      <ellipse cx="38" cy="24" rx="11" ry="4" fill="#ffffff" opacity=".7"/>
      ${shade(0.28)}`,
  },
}

export const SKIN_IDS = Object.keys(SKINS)
export const DEFAULT_SKIN = 'ice-giant'

/** The skin named, or the default when the name is unknown. */
export const skin = id => SKINS[id] || SKINS[DEFAULT_SKIN]
