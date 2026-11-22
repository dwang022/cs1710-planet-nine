// One object, highlighted everywhere at once.
//
// Charts register a painter; hovering a mark in any view calls setHover, and
// every registered view repaints just that object. This is the "brushing and
// linking" part: you point at one thing and see where it sits in every other
// view, without any chart needing to know about the others.

const painters = new Set()
let current = null

export function registerHighlight (fn) {
  painters.add(fn)
  fn(current)
  return () => painters.delete(fn)
}

let painting = false

export function setHover (id) {
  // Guard against re-entry: a painter that moves a mark can make the browser
  // fire another pointer event mid-paint.
  if (painting || id === current) return
  painting = true
  current = id
  try {
    for (const fn of painters) fn(current)
  } finally {
    painting = false
  }
}
