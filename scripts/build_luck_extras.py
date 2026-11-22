#!/usr/bin/env python3
"""More luck tests for the probability page, beyond the closest-point test in
build_clustering_null.py.

The statistic throughout is R, the length of the average of the objects' arrows
(each one unit long): 0 when they point every which way, 1 when all point the
same way. Two kinds of arrow, as on the site's two Evidence pages:

  pointing  from the Sun towards the object's closest point to the Sun
            (its longitude of perihelion, varpi)
  tilt      from the Sun towards the half of its orbit raised above the plane of
            the planets (its longitude of ascending node plus 90 degrees)

All on the page's sample: a > 150 AU, q > 30 AU, seen in more than one year.

then_2016   The pointing test on the objects of that sample first seen before
            2016, the year Planet Nine was proposed. "First seen" is the date of
            the MPC's discovery observation (the line marked "*" in the
            observations cached by build_observatories.py in data/raw/mpc_obs/),
            or, where no line is marked, the year in the provisional designation,
            which is the year it was first seen. Today's orbits are used.
            200,000 simulated solar systems.

random      Both tests at once against luck: each simulated object gets a random
            closest-point direction and, independently, a random tilt direction
            (a random orientation in space; the tilt test keeps no tilt sizes, as
            every arrow is one unit long). 1,000,000 simulated solar systems, so
            the rare "both at once" count rests on dozens of cases. Gives the tilt
            pile, the tilt odds, and the two-way grid with the both-at-once odds.

looking     The same, with a rough allowance, ours, for where telescopes looked.
            A distant object is seen almost only near its closest point to the
            Sun, so each simulated object is placed at its closest point on a spot
            of sky where a known object beyond Neptune (a > 30 AU, the team's raw
            JPL download) was first seen: the heliocentric ecliptic longitude and
            latitude of that object on the date of its first observation, from its
            orbit, moved by up to 5 degrees in longitude and 1 in latitude. Each
            simulated object keeps the tilt of one of the real objects; a tilted
            orbit only reaches latitudes up to its tilt, so spots too far from the
            plane are drawn again. The spot and the tilt fix the orbit's
            orientation, so both arrows follow. It ignores how deep each survey
            reached, how far the objects are, and that the Kuiper belt itself is
            not spread evenly; the studies that model each survey in detail (Brown
            & Batygin 2019, Napier et al. 2021) disagree on how much the bias
            matters. 200,000 simulated solar systems.

Writes data/processed/luck_extras.json (no page loads it, so there is no copy in public/data/). Stdlib only:
python -P scripts/build_luck_extras.py (about two minutes)
"""
import json, math, os, random

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ETNOS = os.path.join(ROOT, "data", "processed", "etnos.json")
MPC_CACHE = os.path.join(ROOT, "data", "raw", "mpc_obs")
RAW_DIRS = [os.path.join(os.path.dirname(ROOT), "FinalProject", "data", "raw"), os.path.join(ROOT, "data", "raw")]
JPL_FILE = "jpl_sbdb_a_gt30_asteroids.json"
OUTS = [os.path.join(ROOT, "data", "processed", "luck_extras.json")]

SEED = 1710
TRIALS_THEN, TRIALS_RANDOM, TRIALS_LOOKING = 200_000, 1_000_000, 200_000
BEFORE = 2016            # first seen before this year
JITTER_LON, JITTER_LAT = 5, 1
BIN, NBINS = 0.025, 40   # piles and grid cells: R in steps of 2.5%
RAD = math.pi / 180
TAU = 2 * math.pi


def resultant(degs):
    c = sum(math.cos(d * RAD) for d in degs) / len(degs)
    s = sum(math.sin(d * RAD) for d in degs) / len(degs)
    return math.hypot(c, s), math.degrees(math.atan2(s, c)) % 360


def length(rads):
    """R of angles in radians (the simulations' inner loop)."""
    c = s = 0.0
    for a in rads:
        c += math.cos(a); s += math.sin(a)
    return math.hypot(c, s) / len(rads)


def pile(values):
    counts = [0] * NBINS
    for v in values:
        counts[min(int(v / BIN), NBINS - 1)] += 1
    return {"bin_edges": [round(i * BIN, 4) for i in range(NBINS + 1)], "counts": counts}


def odds(beat, trials):
    p = (beat + 1) / (trials + 1)
    return {"p_value": round(p, 7), "one_in": round(1 / p), "n_as_aligned": beat}


def two_way(trials, draw, point_obs, tilt_obs, rng):
    """Both arrows' R for each simulated solar system: the two piles, the grid, and the odds."""
    points, tilts, cells = [], [], {}
    beat_p = beat_t = beat_both = 0
    for _ in range(trials):
        vp, td = draw(rng)
        rp, rt = length(vp), length(td)
        points.append(rp); tilts.append(rt)
        a, b = rp >= point_obs, rt >= tilt_obs
        beat_p += a; beat_t += b; beat_both += a and b
        key = (min(int(rp / BIN), NBINS - 1), min(int(rt / BIN), NBINS - 1))
        cells[key] = cells.get(key, 0) + 1
    return {
        "n_trials": trials,
        "pointing": {**odds(beat_p, trials), "null_histogram": pile(points)},
        "tilt": {**odds(beat_t, trials), "null_histogram": pile(tilts)},
        "both": odds(beat_both, trials),
        # [pointing bin, tilt bin, count] for every cell with any simulated solar system in it
        "grid": {"bin": BIN, "cells": sorted([i, j, c] for (i, j), c in cells.items())},
    }


def first_seen(o):
    """Decimal year of the MPC's discovery observation, else the year in the provisional designation."""
    desig = o["id"] if o["id"].isdigit() else (o["provisional_desig"] or o["id"])
    path = os.path.join(MPC_CACHE, desig.replace(" ", "_") + ".txt")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            for line in f:
                if len(line) >= 80 and line[12] == "*" and line[14] not in "sv":
                    return int(line[15:19]) + (int(line[20:22]) - 1) / 12
    pd = o.get("provisional_desig") or ""
    return float(pd[:4]) if pd[:4].isdigit() else None


def julian_day(date):
    y, m, d = (int(x) for x in date.split("-"))
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    return int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + 2 - a + a // 4 - 1524.5


def sky_on(row, f, jd):
    """Heliocentric ecliptic longitude and latitude (degrees) of an orbit on a Julian day: Kepler's equation, two-body."""
    a, e = float(row[f["a"]]), float(row[f["e"]])
    i, node, peri = (float(row[f[k]]) * RAD for k in ("i", "om", "w"))
    M = ((float(row[f["ma"]]) + float(row[f["n"]]) * (jd - float(row[f["epoch"]]))) % 360) * RAD
    E = M if e < 0.8 else math.pi
    for _ in range(60):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    nu = 2 * math.atan2(math.sqrt(1 + e) * math.sin(E / 2), math.sqrt(1 - e) * math.cos(E / 2))
    u = peri + nu
    x = math.cos(node) * math.cos(u) - math.sin(node) * math.sin(u) * math.cos(i)
    y = math.sin(node) * math.cos(u) + math.cos(node) * math.sin(u) * math.cos(i)
    z = math.sin(u) * math.sin(i)
    return math.degrees(math.atan2(y, x)) % 360, math.degrees(math.asin(max(-1.0, min(1.0, z))))


def where_found():
    for d in RAW_DIRS:
        path = os.path.join(d, JPL_FILE)
        if os.path.exists(path):
            with open(path, encoding="utf-8") as fh:
                raw = json.load(fh)
            f = {k: i for i, k in enumerate(raw["fields"])}
            out = []
            for row in raw["data"]:
                try:
                    if row[f["first_obs"]] and float(row[f["e"]]) < 1:
                        out.append(sky_on(row, f, julian_day(row[f["first_obs"]])))
                except (TypeError, ValueError):
                    continue
            return out
    raise SystemExit(f"no {JPL_FILE} in {RAW_DIRS}")


def main():
    with open(ETNOS, encoding="utf-8") as fh:
        etnos = json.load(fh)
    sample = [o for o in etnos if o["a_au"] >= 150 and o["q_au"] >= 30 and o["well_determined"]]
    n = len(sample)
    point_obs, point_dir = resultant([o["varpi_deg"] for o in sample])
    tilt_obs, tilt_dir = resultant([o["node_deg"] + 90 for o in sample])

    # --- the pointing test before 2016 -------------------------------------------------------
    rng = random.Random(SEED)
    then = [o for o in sample if (first_seen(o) or 9999) < BEFORE]
    R_then, dir_then = resultant([o["varpi_deg"] for o in then])
    sims = [length([rng.random() * TAU for _ in then]) for _ in range(TRIALS_THEN)]
    then_2016 = {"n_objects": len(then), "objects": [o["id"] for o in then], "n_trials": TRIALS_THEN,
                 "R_observed": round(R_then, 4), "mean_varpi_deg": round(dir_then, 2),
                 **odds(sum(1 for v in sims if v >= R_then), TRIALS_THEN), "null_histogram": pile(sims)}
    print(f"first seen before {BEFORE}: n={len(then)} R={R_then:.3f} 1 in {then_2016['one_in']}")

    # --- both arrows, against random orientations -----------------------------------------------
    rng = random.Random(SEED)
    anywhere = lambda r: ([r.random() * TAU for _ in range(n)], [r.random() * TAU for _ in range(n)])
    rand = two_way(TRIALS_RANDOM, anywhere, point_obs, tilt_obs, rng)
    print(f"random orientations: pointing 1 in {rand['pointing']['one_in']}, tilt 1 in {rand['tilt']['one_in']}, "
          f"both 1 in {rand['both']['one_in']} ({rand['both']['n_as_aligned']} of {TRIALS_RANDOM})")

    # --- both arrows, found where telescopes have found distant objects ----------------------------
    spots = where_found()
    tilts = [o["i_deg"] * RAD for o in sample]

    def found(r):
        vp, td = [], []
        for inc in tilts:
            si = math.sin(inc)
            while True:                       # a spot this orbit can reach: no farther from the plane than its tilt
                lon, lat = r.choice(spots)
                sb = math.sin((lat + r.uniform(-JITTER_LAT, JITTER_LAT)) * RAD)
                if abs(sb) <= si:
                    break
            u = math.asin(sb / si)            # how far round from where it crosses the plane, at its closest point
            if r.random() < 0.5:
                u = math.pi - u               # the same latitude on the way down
            lon = (lon + r.uniform(-JITTER_LON, JITTER_LON)) * RAD
            node = lon - math.atan2(math.cos(inc) * math.sin(u), math.cos(u))
            vp.append(node + u)               # closest-point direction: node plus argument of perihelion
            td.append(node + math.pi / 2)     # tilt direction
        return vp, td

    rng = random.Random(SEED)
    look = two_way(TRIALS_LOOKING, found, point_obs, tilt_obs, rng)
    print(f"found where telescopes looked ({len(spots)} spots): pointing 1 in {look['pointing']['one_in']}, "
          f"tilt 1 in {look['tilt']['one_in']}, both 1 in {look['both']['one_in']}")

    out = {
        "_what": "More luck tests for the probability page: the pointing test on the objects first seen before 2016, "
                 "and the pointing and tilt tests together, against random orientations and against a rough allowance "
                 "for where telescopes looked. Built by scripts/build_luck_extras.py; its docstring gives the method.",
        "_statistic": "R, the length of the average of the objects' unit arrows: pointing, towards each closest point "
                      "to the Sun (varpi); tilt, towards the raised half of each orbit (node + 90 degrees).",
        "_sample": "a > 150 AU, q > 30 AU, seen in more than one year (the page's sample)",
        "_seed": SEED,
        "n_objects": n,
        "pointing_observed": {"R": round(point_obs, 4), "mean_deg": round(point_dir, 2)},
        "tilt_observed": {"R": round(tilt_obs, 4), "mean_deg": round(tilt_dir, 2)},
        "then_2016": {"_what": f"the pointing test on the objects of the sample first seen before {BEFORE} (the MPC's "
                               "discovery observation, or the year in the provisional designation), today's orbits",
                      **then_2016},
        "random": {"_what": "each simulated object a random closest-point direction and, independently, a random tilt "
                            "direction", **rand},
        "looking": {"_what": "ours: a rough allowance for where telescopes looked. Each simulated object sits at its "
                             "closest point on a spot of sky where a known object beyond Neptune (a > 30 AU, JPL) was "
                             f"first seen (moved by up to {JITTER_LON} degrees in longitude, {JITTER_LAT} in latitude), "
                             "with the tilt of one of the real objects. It ignores survey depth, distance and the "
                             "Kuiper belt's own unevenness.", "src": "ours", "n_spots": len(spots), **look},
    }
    for p in OUTS:
        with open(p, "w", encoding="utf-8") as fh:
            json.dump(out, fh, indent=1)
    print("wrote luck_extras.json")


main()
