#!/usr/bin/env python3
"""Where everything on the distance page's map was on one date: every known
body beyond Neptune, and Voyager 1.

The date is the epoch most rows of data/processed/tnos.csv share (JPL's
June 2026 solution). For each body of class TNO in that file, the mean anomaly
is carried from its own epoch to that date, Kepler's equation gives the true
anomaly, and the orbit is laid flat on the ecliptic: the body sits at its true
distance from the Sun, in the direction of its longitude of perihelion plus its
true anomaly. Distances stay exact; only the tilt is dropped. Comets and the
other classes in the file are left out.

Voyager 1's heliocentric ecliptic position and velocity on the same date come
from JPL Horizons (target -31), laid flat the same way. If Horizons cannot be
reached, the values already in the output are kept.

Writes data/processed/positions.json and the copy in public/data/.
Stdlib only. Run from anywhere: python -P scripts/build_positions.py
"""
import collections, csv, json, math, os, re, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TNOS = os.path.join(ROOT, "data", "processed", "tnos.csv")
OUTS = [os.path.join(ROOT, "data", "processed", "positions.json"), os.path.join(ROOT, "public", "data", "positions.json")]

GAUSS_DEG_PER_DAY = 0.9856076686     # mean motion at 1 AU, degrees a day (Gaussian constant)
HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api"


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def true_anomaly(m_deg, e):
    """Mean anomaly to true anomaly (degrees), solving Kepler's equation by Newton's method."""
    m = math.radians(m_deg % 360.0)
    ecc = m if e < 0.8 else math.pi
    for _ in range(100):
        d = (ecc - e * math.sin(ecc) - m) / (1 - e * math.cos(ecc))
        ecc -= d
        if abs(d) < 1e-12:
            break
    return math.degrees(2 * math.atan2(math.sqrt(1 + e) * math.sin(ecc / 2), math.sqrt(1 - e) * math.cos(ecc / 2)))


def jd_to_cal(jd):
    """Julian date (at 0h) to an ISO calendar date, Fliegel & Van Flandern."""
    j = int(jd + 0.5) + 68569
    n = 4 * j // 146097
    j -= (146097 * n + 3) // 4
    i = 4000 * (j + 1) // 1461001
    j -= 1461 * i // 4 - 31
    k = 80 * j // 2447
    day = j - 2447 * k // 80
    j = k // 11
    return f"{100 * (n - 49) + i + j:04d}-{k + 2 - 12 * j:02d}-{day:02d}"


def bodies(epoch):
    xs, ys = [], []
    with open(TNOS, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["orbit_class"] != "TNO":
                continue
            a, e, varpi, ma, ep = (num(r[k]) for k in ("a_au", "e", "varpi_deg", "mean_anom_deg", "epoch_jd"))
            if None in (a, e, varpi, ma, ep) or e >= 1:
                continue
            m = ma + GAUSS_DEG_PER_DAY / a ** 1.5 * (epoch - ep)
            nu = true_anomaly(m, e)
            dist = a * (1 - e * e) / (1 + e * math.cos(math.radians(nu)))
            lon = math.radians(varpi + nu)
            xs.append(round(dist * math.cos(lon) * 10))
            ys.append(round(dist * math.sin(lon) * 10))
    return xs, ys


def voyager(epoch):
    q = {
        "format": "text", "COMMAND": "'-31'", "OBJ_DATA": "'NO'", "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'VECTORS'", "CENTER": "'500@10'", "REF_PLANE": "'ECLIPTIC'",
        "TLIST": f"'{epoch}'", "VEC_TABLE": "'2'", "OUT_UNITS": "'AU-D'",
    }
    with urllib.request.urlopen(f"{HORIZONS}?{urllib.parse.urlencode(q)}", timeout=60) as resp:
        text = resp.read().decode("utf-8")
    block = text.split("$$SOE")[1].split("$$EOE")[0]
    v = {k: float(x) for k, x in re.findall(r"(\w+)\s*=\s*(-?[\d.]+E[+-]\d+)", block)}
    r = math.sqrt(v["X"] ** 2 + v["Y"] ** 2 + v["Z"] ** 2)
    # radial speed: how fast the distance from the Sun grows
    out_per_day = (v["X"] * v["VX"] + v["Y"] * v["VY"] + v["Z"] * v["VZ"]) / r
    return {
        "r_au": round(r, 2),
        "lon_deg": round(math.degrees(math.atan2(v["Y"], v["X"])) % 360, 2),
        "outward_au_per_yr": round(out_per_day * 365.25, 2),
        "xyz_au": [round(v["X"], 4), round(v["Y"], 4), round(v["Z"], 4)],
        "src": "JPL Horizons API, target -31, heliocentric ecliptic J2000 vectors",
    }


def main():
    with open(TNOS, encoding="utf-8") as f:
        epochs = collections.Counter(num(r["epoch_jd"]) for r in csv.DictReader(f) if r["orbit_class"] == "TNO")
    epoch = epochs.most_common(1)[0][0]
    xs, ys = bodies(epoch)

    try:
        voy = voyager(epoch)
    except Exception as err:                      # offline: keep what the last run fetched
        print("Horizons unreachable, keeping the stored Voyager 1 values:", err)
        with open(OUTS[0], encoding="utf-8") as f:
            voy = json.load(f)["voyager_1"]

    out = {
        "_what": "Where every known body beyond Neptune (class TNO in tnos.csv) and Voyager 1 were on one date, "
                 "for the distance page's map. Orbits are laid flat on the ecliptic: each body keeps its true "
                 "distance from the Sun, in the direction of its longitude of perihelion plus its true anomaly. "
                 "Built by scripts/build_positions.py.",
        "_source": "Bodies: JPL Small-Body Database elements (tnos.csv), carried to the date by two-body motion. "
                   "Voyager 1: JPL Horizons.",
        "epoch_jd": epoch,
        "epoch_cal": jd_to_cal(epoch),
        "tnos": {"n": len(xs), "units": "tenths of an AU; Sun at the origin, x toward the vernal equinox", "x": xs, "y": ys},
        "voyager_1": voy,
    }
    for p in OUTS:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(out, f, separators=(",", ":"))
    print(f"{len(xs)} bodies on {out['epoch_cal']}; Voyager 1 at {voy['r_au']} AU, longitude {voy['lon_deg']} deg")


main()
