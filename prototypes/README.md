# Dashboard prototypes — CS 1710 week 9

Two ways of wiring the same three views together, to test whether coordinated
views help answer: **does the alignment survive, whichever objects you trust?**

**Live:** https://dwang022.github.io/cs1710-planet-nine-prototypes/
([A — cross-filter](https://dwang022.github.io/cs1710-planet-nine-prototypes/a.html) ·
[B — comparison](https://dwang022.github.io/cs1710-planet-nine-prototypes/b.html))

Runs **separately from the main site**: own `package.json`, own dependencies,
own port. Both can run at once.

```bash
cd prototypes
npm install
npm run dev        # http://localhost:5174
```

Main site stays on 5173.

## The three views

| View | Role |
|---|---|
| Distance vs. closest-approach scatter | **the selector** — drag to choose objects |
| Polar plot of lean direction | **the claim** — do they agree on a direction? |
| Null histogram + readouts | **the verdict** — could that be luck? |

The scatter's two axes are deliberately **independent of lean direction**.
Selecting on the angle we then test for clustering would manufacture the result —
the same circularity trap that kept the sky map out of the selector role.

## Prototype A — cross-filter (`/a.html`)

One selection, applied live. Drag a box, both downstream views recompute.
Unidirectional flow.

## Prototype B — two-sample comparison (`/b.html`)

Two selections held at once, shown side by side with the difference called out.
Switch which group you are editing, then drag. No filtering — comparison.

## What to look for

Select the objects above the grey line (closest approach > 45 AU — the ones
Neptune cannot reach) **and** tick "well-measured orbits only":

| Selection | n | agreement | odds by luck |
|---|---|---|---|
| everything | 90 | 0.082 | 1 in 2 |
| well-measured only | 44 | 0.332 | 1 in 137 |
| q > 45 only | 15 | 0.360 | 1 in 7 |
| **q > 45 AND well-measured** | **11** | **0.611** | **1 in 78** |
| split by distance instead | 45 / 45 | 0.135 / 0.053 | 1 in 2 / 1 in 1 |

Perihelion depth separates the signal; distance barely does. That is the
finding the coordinated views are meant to surface, and it needs *two* filters
combined — which is the real test of whether either layout makes it findable.

## Honest caveat, built in

Both prototypes count how many selections you have tried. A dashboard that lets
you hunt for low p-values **is a p-hacking machine**: brush enough boxes and
something crosses 0.05. The counter is there to keep that visible.

## Provenance

`src/stats.js` is copied from the main app, where the Rayleigh test was checked
against a 200,000-trial Monte Carlo (agreement within 5%). Data is the same
verified ETNO table — JPL elements cross-checked against the Minor Planet Centre.

## Deploying

`./deploy.sh` rebuilds and republishes to GitHub Pages. It force-pushes the
built output to the public repo `dwang022/cs1710-planet-nine-prototypes`; only
compiled files and the data go there, never the source or the process book.

Hosting is free: GitHub Pages on a public repo, no account or card needed.
