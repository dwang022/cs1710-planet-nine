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
// `outline` is the disc's edge colour; `q` recolours the question mark.

const R = 40

const disc = fill => `<circle cx="50" cy="50" r="${R}" fill="${fill}"/>`
const shade = (opacity = 0.32) => `<circle cx="${50 + R * 0.52}" cy="50" r="${R}" fill="#06100e" opacity="${opacity}"/>`
function band (y, h, fill, opacity = 1, amp = 2.2) {
  const y2 = y + h
  return `<path d="M0,${y} C25,${y - amp} 40,${y + amp} 60,${y} S90,${y - amp} 100,${y + amp / 2} ` +
    `L100,${y2 + amp} C80,${y2 - amp} 60,${y2 + amp} 40,${y2} S15,${y2 - amp} 0,${y2 + amp / 2} Z" ` +
    `fill="${fill}" opacity="${opacity}"/>`
}

export const SKINS = {
  'ice-giant': {
    name: 'Ice giant',
    blurb: 'The mainstream guess: a small Neptune, ice and rock wrapped in hydrogen and helium.',
    source: 'Batygin et al. 2019; Brown & Batygin 2021',
    outline: '#1b3a32',
    paint: () => `${disc('#3b6d60')}
      ${band(29, 8, '#487f71')}
      ${band(46, 11, '#2f5b50')}
      ${band(66, 6, '#487f71', 0.9)}
      <ellipse cx="37" cy="25" rx="11" ry="5" fill="#6a9d8d" opacity="0.4"/>
      ${shade(0.36)}`,
  },
  rock: {
    name: 'Rocky super-Earth',
    blurb: 'A bare rock-and-ice world a few times Earth’s mass, with at most a thin atmosphere.',
    source: 'one of the compositions Brown & Batygin 2021 allow',
    outline: '#4a3a30',
    paint: () => `${disc('#8c7366')}
      <circle cx="36" cy="38" r="8" fill="#6f5a4e"/><circle cx="62" cy="58" r="6" fill="#6f5a4e"/>
      <circle cx="58" cy="30" r="3.5" fill="#6f5a4e"/><circle cx="40" cy="66" r="4" fill="#6f5a4e"/>
      <circle cx="30" cy="56" r="2.6" fill="#a08a7a" opacity=".6"/>
      ${shade(0.34)}`,
  },
  ocean: {
    name: 'Ocean world',
    blurb: 'Water ice and a deep ocean under a thin, hazy sky, far too cold to be liquid at the surface.',
    source: 'a water-rich composition, as in Linder & Mordasini 2016',
    outline: '#143f3a',
    paint: () => `${disc('#2a7f72')}
      ${band(34, 7, '#4a9d8e', 0.75, 1.6)}
      ${band(58, 9, '#1f6459', 0.85, 1.6)}
      <path d="M26,46 C34,40 42,44 48,40" fill="none" stroke="#dbe9f7" stroke-width="3.2" stroke-linecap="round" opacity=".7"/>
      <path d="M56,70 C62,66 70,68 76,64" fill="none" stroke="#dbe9f7" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      <ellipse cx="50" cy="14" rx="14" ry="5" fill="#eef5fb" opacity=".8"/>
      ${shade(0.3)}`,
  },
  iron: {
    name: 'Iron world',
    blurb: 'Mostly metal, like a giant Mercury: dense, dark and dull, with rust-coloured plains.',
    source: 'a dense composition the mass estimates do not rule out',
    outline: '#2c2a2e',
    paint: () => `${disc('#5d5a62')}
      ${band(40, 6, '#746f75', 0.8, 1.4)}
      <path d="M22,62 C34,54 50,58 62,52 C72,48 82,54 90,50 L90,70 L22,70 Z" fill="#8a4a3a" opacity=".55"/>
      <circle cx="40" cy="30" r="5" fill="#49464d"/><circle cx="64" cy="36" r="3" fill="#49464d"/>
      <ellipse cx="36" cy="22" rx="9" ry="4" fill="#9b98a0" opacity=".35"/>
      ${shade(0.38)}`,
  },
  'black-hole': {
    name: 'Primordial black hole',
    blurb: 'Same mass, same orbit, but a black hole the size of a grapefruit instead of a planet.',
    source: 'Scholtz & Unwin 2020',
    outline: '#000000',
    q: { fill: '#f3e6c8', stroke: '#3a2a10' },
    paint: () => `${disc('#050507')}
      <circle cx="50" cy="50" r="31" fill="none" stroke="#f0a04a" stroke-width="5" opacity=".9"/>
      <circle cx="50" cy="50" r="31" fill="none" stroke="#fff1c9" stroke-width="1.6" opacity=".8"/>
      <ellipse cx="50" cy="50" rx="39" ry="7" fill="none" stroke="#e58a3a" stroke-width="3.5" opacity=".7" transform="rotate(-18 50 50)"/>
      <circle cx="50" cy="50" r="25" fill="#000"/>`,
  },
  cheese: {
    name: 'Cheese',
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
    blurb: 'The ninth ball on the table. Also not a serious proposal.',
    source: 'the game of nine-ball',
    outline: '#7a6a10',
    q: { fill: '#161618', stroke: '#ffffff', x: 61, size: 34, y: 62 },
    paint: () => `${disc('#f6f0dc')}
      <path d="M0,34 L100,34 L100,66 L0,66 Z" fill="#e8c21c"/>
      <ellipse cx="50" cy="50" rx="27" ry="20" fill="#fbf7ea" stroke="#d9cfa8" stroke-width="1"/>
      <text x="39" y="62" text-anchor="middle" font-family="ui-sans-serif, -apple-system, 'Segoe UI', Inter, system-ui, sans-serif" font-size="34" font-weight="800" fill="#161618">9</text>
      <ellipse cx="38" cy="24" rx="11" ry="4" fill="#ffffff" opacity=".7"/>
      ${shade(0.28)}`,
  },
}

export const SKIN_IDS = Object.keys(SKINS)
export const DEFAULT_SKIN = 'ice-giant'

/** The skin named, or the default when the name is unknown. */
export const skin = id => SKINS[id] || SKINS[DEFAULT_SKIN]
