// The site's two typefaces, bundled so every device draws the same letters:
// Space Grotesk for text and charts, Space Mono (its sibling) for the small
// uppercase labels. Space Mono comes in 400 and 700 only, so a 600 label takes 700.
// fontsReady settles once both are in; loadData() waits for it, so a chart that
// measures its words measures these letters, and site.js waits for it (briefly)
// before showing the page, so the text never swaps under the reader.
import '@fontsource-variable/space-grotesk'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'

const FACES = ['16px "Space Grotesk Variable"', '400 16px "Space Mono"', '700 16px "Space Mono"']

export const fontsReady = document.fonts
  ? Promise.all(FACES.map(f => document.fonts.load(f))).catch(() => {})
  : Promise.resolve()
