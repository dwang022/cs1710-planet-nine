#!/usr/bin/env python3
"""Batygin & Brown (2016)'s luck test, reproduced, for the probability page.

Their paper (Astronomical Journal 151, 22, section 2) put the chance that the six
most distant orbits then known are bunched by luck at 0.007%. This script does
their calculation again, step by step, so the page can show how the number was
reached, and then runs the same calculation on what has changed since.

The six    Sedna, 2012 VP113, 2004 VN112, 2010 GB174, 2007 TG422 and 2013 RF98,
           the objects beyond a = 250 AU with q > 30 AU in their Figure 1.
           Today's orbits (etnos.json).

Statistic 1, where the six come closest. Each orbit's closest point to the Sun
           is placed on the sky (ecliptic longitude and latitude of its
           perihelion direction); the middle of the six is the average of those
           directions; the spread is the root-mean-square of the angle on the sky
           from each to the middle, as the paper describes ("the root-mean-square
           (RMS) of the angular distance between the perihelion position of each
           object and the average perihelion position of the selected bodies").

Statistic 2, which way they tilt. The paper's "RMS spread of the polar angles":
           the direction of each orbit's projected pole, which is its longitude of
           ascending node less 90 degrees, so the spread of the nodes (one angle
           each, the root-mean-square of each one's difference from their
           circular mean). Two other readings of the sentence were tried, the
           angle between the poles in 3-D and the pole's direction on the sky at
           perihelion; both give about 4% where the paper says 1%, this one about
           1%.

The allowance for where telescopes looked, as theirs: "assuming that the
           detection biases for our clustered objects are similar to the detection
           biases for the collection of all objects with q > 30 AU and a > 50 AU.
           We then randomly select 6 objects from the sample 100,000 times". We
           draw 100,000 too (2026-11-17, asked for: the page had drawn a million,
           which readers asked about). The pool is every object with q > 30 AU and
           a > 50 AU in the team's JPL download first seen before 2016: for
           numbered objects the discovery date in the MPC's list of numbered minor
           planets, otherwise the year in the provisional designation. Some of
           these were announced only after January 2016, so the pool is a little
           larger than the one they had; the sensitivity runs (pools cut at 2013,
           2014, 2015) show how much that moves the answer.

Results    p = the share of the draws at least as tight as the six, for each
           statistic; their product (the paper's 0.007%); and the share of draws
           tight in both at once, which the product stands in for.

Is multiplying fair? joint_check runs the same draws on, to 1,000,000 (the
           same seed, so its first 100,000 are repro's), and counts the draws tight
           in both against the number multiplying predicts. At 100,000 so few are
           tight in both that the count is left to chance (11 in one run, 19 in
           another); a million lets the page count them.

Then the same calculation on today's catalogue: the objects of etnos.json seen in
more than one year (well_determined) with q > 30 AU beyond 150 AU (the sample the
data and clustering pages use, 62 objects), and beyond 200, 250 and 300 AU, each
drawn from every object with q > 30 AU and a > 50 AU known today; and, as Brown &
Batygin (2021) now prefer, only the orbits that stay clear of Neptune (q > 42 AU)
beyond 150 AU. Each cut keeps its objects' closest points on the sky (points) and
their middle. The runs go in parallel, one process each; each has its own seed,
so the results do not depend on the order they finish in.

The opening test against random directions (uniform_spread) and the alignment test
(uniform) were dropped on 2026-11-17: the page draws only from known objects.

Writes data/processed/bb2016.json and the copy in public/data/. Stdlib only:
python -P scripts/build_bb2016.py (a minute or two on several cores;
PYTHONIOENCODING=utf-8 on Windows)
"""
import json, math, os, random, re
from concurrent.futures import ProcessPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ETNOS = os.path.join(ROOT, "data", "processed", "etnos.json")
RAW_DIRS = [os.path.join(os.path.dirname(ROOT), "FinalProject", "data", "raw"), os.path.join(ROOT, "data", "raw")]
JPL_FILE, NUMBERED_FILE = "jpl_sbdb_a_gt30_asteroids.json", "NumberedMPs.txt"
OUTS = [os.path.join(ROOT, "data", "processed", "bb2016.json"), os.path.join(ROOT, "public", "data", "bb2016.json")]

SEED = 2016
DRAWS = 100_000                 # as the paper: 'We then randomly select 6 objects from the sample 100,000 times'
JOINT_DRAWS = 1_000_000         # the check on multiplying: enough draws to count the few tight in both
BEFORE = 2016                   # the pool: first seen before this year
SENSITIVITY = (2013, 2014, 2015)
# (a above, q above), AU: the line drawn at each distance the page's line can be dragged to, with and without
# Brown & Batygin (2021)'s condition that the orbits stay clear of Neptune (q > 42 AU)
TODAY_CUTS = tuple((a, q) for q in (30, 42) for a in (150, 175, 200, 225, 250, 275, 300, 350, 400))
SPREAD_BIN, SPREAD_MAX = 2, 130         # histograms of spread, degrees
EXAMPLES = 80                           # draws kept for the page's animation
SIX = ["Sedna", "2012 VP113", "2004 VN112", "2010 GB174", "2007 TG422", "2013 RF98"]
RAD = math.pi / 180

# what the papers say, for the page's comparison (each with where it is from)
PUBLISHED = {
    "closest": {"p": 0.007, "src": "Batygin & Brown 2016, section 2: 'Orbits as tightly clustered in perihelion position as the 6 observed KBOs occur only 0.7% of the time'"},
    "tilt": {"p": 0.01, "src": "Batygin & Brown 2016, section 2: 'a cluster as tight as that observed in the data occurs only 1% of the time'"},
    "both": {"p": 0.00007, "src": "Batygin & Brown 2016, abstract and section 2: 'only 0.007%', 'about 3.8 sigma'"},
    "draws": {"n": 100_000, "src": "Batygin & Brown 2016, section 2: 'We then randomly select 6 objects from the sample 100,000 times'"},
}
STUDIES = [
    {"label": "Batygin & Brown 2016", "objects": 6, "allowance": "drew from every known object", "p": 0.00007, "side": "for",
     "src": "abstract: 'a probability of 0.007% to be due to chance'"},
    {"label": "Brown & Batygin 2019", "objects": 14, "allowance": "modelled where each object could have been found", "p": 0.002, "side": "for",
     "src": "abstract: 'only 0.2%', both clues tested together"},
    {"label": "Brown & Batygin 2021", "objects": 11, "allowance": "the same model", "p": 0.004, "side": "for",
     "src": "section 2: 'only a 0.4% chance that these data are selected from a random sample'"},
    {"label": "Shankman et al. 2017 (OSSOS VI)", "objects": 8, "allowance": "modelled one survey (OSSOS) in detail", "p": None, "side": "against",
     "src": "abstract: 'consistent with being detected from a uniform underlying angular distribution'; no single probability"},
    {"label": "Napier et al. 2021", "objects": 14, "allowance": "modelled three surveys in detail", "p": 0.17, "p_hi": 0.94, "side": "against",
     "src": "abstract: 'consistent with a uniform population at a level between 17% and 94%'"},
    {"label": "Bernardinelli et al. 2022 (DES)", "objects": 16, "allowance": "modelled one survey (DES) in detail", "p": 0.8788, "side": "against",
     "src": "section 5.2: p = 0.8788 for the longitude of perihelion, a > 150 AU; 'consistent with an underlying isotropic distribution'"},
]


def raw(name):
    for d in RAW_DIRS:
        p = os.path.join(d, name)
        if os.path.exists(p):
            return p
    raise SystemExit(f"missing {name} in {RAW_DIRS}")


# --- geometry --------------------------------------------------------------------
def perihelion(i, node, w):
    """Unit vector from the Sun to the closest point, ecliptic coordinates (angles in degrees)."""
    i, O, w = i * RAD, node * RAD, w * RAD
    return (math.cos(O) * math.cos(w) - math.sin(O) * math.sin(w) * math.cos(i),
            math.sin(O) * math.cos(w) + math.cos(O) * math.sin(w) * math.cos(i),
            math.sin(w) * math.sin(i))


def lonlat(v):
    return math.degrees(math.atan2(v[1], v[0])) % 360, math.degrees(math.asin(max(-1.0, min(1.0, v[2]))))


def middle(vs):
    m = [sum(v[k] for v in vs) for k in range(3)]
    n = math.sqrt(sum(x * x for x in m)) or 1.0
    return [x / n for x in m]


def sky_spread(vs):
    """RMS of the angle on the sky from each direction to their middle, degrees."""
    m = middle(vs)
    s = 0.0
    for v in vs:
        c = v[0] * m[0] + v[1] * m[1] + v[2] * m[2]
        s += math.acos(max(-1.0, min(1.0, c))) ** 2
    return math.sqrt(s / len(vs)) / RAD


def angle_spread(rads):
    """RMS of each angle's difference from their circular mean, degrees."""
    c = sum(math.cos(a) for a in rads); s = sum(math.sin(a) for a in rads)
    m = math.atan2(s, c)
    return math.sqrt(sum(((a - m + math.pi) % (2 * math.pi) - math.pi) ** 2 for a in rads) / len(rads)) / RAD


def alignment(degs):
    c = sum(math.cos(d * RAD) for d in degs) / len(degs)
    s = sum(math.sin(d * RAD) for d in degs) / len(degs)
    return math.hypot(c, s)


# --- the catalogues -------------------------------------------------------------------
def load_pool():
    """Every object with q > 30 AU and a > 50 AU in the JPL download, with the year it was first seen."""
    disc = {}
    for line in open(raw(NUMBERED_FILE), encoding="latin-1"):
        m = re.match(r"\s*\((\d+)\)", line)
        if m:
            dm = re.search(r"(\d{4}) (\d\d) (\d\d)", line[30:60])
            if dm:
                disc[m.group(1)] = int(dm.group(1)) + (int(dm.group(2)) - 1) / 12
    d = json.load(open(raw(JPL_FILE), encoding="utf-8"))
    out = []
    for r in (dict(zip(d["fields"], row)) for row in d["data"]):
        a, q = float(r["a"]), float(r["q"])
        if not (q > 30 and a > 50):
            continue
        if r["pdes"] in disc:
            year = disc[r["pdes"]]
        else:
            m = re.search(r"\((\d{4}) [A-Z]{2}", r["full_name"]) or re.match(r"(\d{4}) [A-Z]{2}", r["pdes"])
            year = int(m.group(1)) + 0.5 if m else None
        i, node, w = float(r["i"]), float(r["om"]), float(r["w"])
        out.append({"year": year, "v": perihelion(i, node, w), "node": node * RAD})
    return out


def run(sample_v, sample_node, pool, seed, keep_examples=0, draws=DRAWS):
    """Draw len(sample) objects from the pool `draws` times; how often is a draw as tight as the sample?
    pool: [(unit vector to the closest point, node in radians)]. Each run has its own seeded generator."""
    rng = random.Random(seed)
    n = len(sample_v)
    obs_c, obs_t = sky_spread(sample_v), angle_spread(sample_node)
    nb = SPREAD_MAX // SPREAD_BIN
    hc, ht = [0] * nb, [0] * nb
    hit_c = hit_t = hit_both = 0
    examples = []
    pv = [p[0] for p in pool]
    pn = [p[1] for p in pool]
    idx_all = range(len(pool))
    for k in range(draws):
        idx = rng.sample(idx_all, n)
        sc = sky_spread([pv[j] for j in idx])
        st = angle_spread([pn[j] for j in idx])
        a, b = sc <= obs_c, st <= obs_t
        hit_c += a; hit_t += b; hit_both += a and b
        hc[min(nb - 1, int(sc // SPREAD_BIN))] += 1
        ht[min(nb - 1, int(st // SPREAD_BIN))] += 1
        if k < keep_examples:
            examples.append({"idx": idx, "spread": round(sc, 1)})
    p_c, p_t = hit_c / draws, hit_t / draws
    out = {
        "n": n, "pool_n": len(pool), "draws": draws, "seed": seed,
        "closest": {"spread_deg": round(obs_c, 2), "n_as_tight": hit_c, "p": p_c,
                    "hist": {"bin_deg": SPREAD_BIN, "counts": hc}},
        "tilt": {"spread_deg": round(obs_t, 2), "n_as_tight": hit_t, "p": p_t,
                 "hist": {"bin_deg": SPREAD_BIN, "counts": ht}},
        "product": p_c * p_t,
        "both": {"n_as_tight": hit_both, "p": hit_both / draws},
    }
    if keep_examples:
        out["examples"] = examples
    return out


def main():
    etnos = json.load(open(ETNOS, encoding="utf-8"))
    six = [o for o in etnos if o.get("name") in SIX or o.get("provisional_desig") in SIX]
    assert len(six) == 6, [o["name"] for o in six]
    six.sort(key=lambda o: o["varpi_deg"])
    six_v = [perihelion(o["i_deg"], o["node_deg"], o["argperi_deg"]) for o in six]
    six_node = [o["node_deg"] * RAD for o in six]

    pool_all = load_pool()
    pool16 = [p for p in pool_all if p["year"] is not None and p["year"] < BEFORE]
    as_pool = lambda P: [(p["v"], p["node"]) for p in P]
    vec = lambda o: perihelion(o["i_deg"], o["node_deg"], o["argperi_deg"])
    cut_objs = {(cut, qmin): [o for o in etnos if o["well_determined"] and o["q_au"] > qmin and o["a_au"] > cut]
                for cut, qmin in TODAY_CUTS}

    # every run at once, one process each: 2016 as the paper (the run the whole page uses), the pools cut at
    # earlier years, the opening tests, and today's catalogue at each line
    with ProcessPoolExecutor() as ex:
        f_main = ex.submit(run, six_v, six_node, as_pool(pool16), SEED, EXAMPLES)
        f_joint = ex.submit(run, six_v, six_node, as_pool(pool16), SEED, 0, JOINT_DRAWS)
        f_sens = {y: ex.submit(run, six_v, six_node, as_pool([p for p in pool_all if p["year"] is not None and p["year"] < y]),
                               SEED + y) for y in SENSITIVITY}
        f_today = {k: ex.submit(run, [vec(o) for o in s], [o["node_deg"] * RAD for o in s], as_pool(pool_all),
                                SEED + k[0] + k[1]) for k, s in cut_objs.items()}
        main_run, joint_run = f_main.result(), f_joint.result()
        sens_runs = {y: f.result() for y, f in f_sens.items()}
        today_runs = {k: f.result() for k, f in f_today.items()}

    print(f"2016 pool {len(pool16)}, {DRAWS:,} draws: closest {100 * main_run['closest']['p']:.3f}% (paper 0.7%), "
          f"tilt {100 * main_run['tilt']['p']:.3f}% (paper 1%), product {100 * main_run['product']:.4f}% (paper 0.007%), "
          f"both in one draw {100 * main_run['both']['p']:.4f}%")
    sens = []
    for y, r in sens_runs.items():
        n = r["pool_n"]
        sens.append({"first_seen_before": y, "pool_n": n, "closest_p": r["closest"]["p"], "tilt_p": r["tilt"]["p"],
                     "product": r["product"], "both_p": r["both"]["p"]})
        print(f"  pool before {y} ({n}): {100 * r['closest']['p']:.2f}% {100 * r['tilt']['p']:.2f}% product {100 * r['product']:.4f}%")

    # --- is multiplying fair? the same draws on to a million, counting both at once ---
    hc, ht, hb = joint_run["closest"]["n_as_tight"], joint_run["tilt"]["n_as_tight"], joint_run["both"]["n_as_tight"]
    joint_check = {"draws": JOINT_DRAWS, "seed": SEED, "first_draws_are": "repro", "closest_n": hc, "tilt_n": ht, "both_n": hb,
                   "product_expects_n": round(hc * ht / JOINT_DRAWS, 1), "ratio": round(hb / (hc * ht / JOINT_DRAWS), 2)}
    print("joint check:", joint_check)

    # --- today's catalogue ---
    today = []
    pool_today = pool_all
    for (cut, qmin), s in cut_objs.items():
        r = today_runs[(cut, qmin)]
        vs = [vec(o) for o in s]
        row = {"a_min_au": cut, "q_min_au": qmin, "ids": [o["id"] for o in s], **r,
               "middle": [round(x, 1) for x in lonlat(middle(vs))],
               "points": [[round(x, 1) for x in lonlat(v)] for v in vs]}
        today.append(row)
        print(f"today a > {cut}, q > {qmin} ({len(s)} objects, pool {len(pool_today)}): closest {100 * r['closest']['p']:.2f}% "
              f"tilt {100 * r['tilt']['p']:.2f}% product {100 * r['product']:.4f}% both {100 * r['both']['p']:.4f}%")

    pts = lambda P: [[round(x, 1) for x in lonlat(p["v"])] for p in P]
    out = {
        "_what": "Batygin & Brown (2016)'s luck test reproduced: the six objects beyond 250 AU against 100,000 draws of six from "
                 "every object with q > 30 AU and a > 50 AU first seen before 2016, as the paper drew, by the spread of their "
                 "closest points on the sky and of the lines their orbits tilt about; the same draws on to a million to count those "
                 "tight in both (joint_check); the same on today's catalogue. Computed by scripts/build_bb2016.py; see its header for the method.",
        "_src": "orbits: JPL Small-Body Database (the team's download) and etnos.json; discovery dates: MPC NumberedMPs.txt",
        "seed": SEED, "draws": DRAWS,
        "six": [{"id": o["id"], "name": o["name"] or o["provisional_desig"],
                 "closest": [round(x, 2) for x in lonlat(v)], "node_deg": round(o["node_deg"], 2),
                 "varpi_deg": round(o["varpi_deg"], 2)} for o, v in zip(six, six_v)],
        "middle": [round(x, 2) for x in lonlat(middle(six_v))],
        "pool_2016": {"first_seen_before": BEFORE, "n": len(pool16), "points": pts(pool16),
                      "node_deg": [round(p["node"] / RAD, 1) for p in pool16]},
        "pool_today": {"n": len(pool_today), "points": pts(pool_today),
                       "node_deg": [round(p["node"] / RAD, 1) for p in pool_today]},
        "repro": main_run,
        "sensitivity": sens,
        "joint_check": joint_check,
        "today": today,
        "published": PUBLISHED,
        "studies": STUDIES,
    }
    for path in OUTS:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, separators=(",", ":"))
        print("wrote", path, os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
