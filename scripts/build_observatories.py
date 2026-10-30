#!/usr/bin/env python3
"""Every telescope that has measured the extreme objects, from the Minor Planet
Center's own records.

For each of the 90 extreme objects in data/processed/etnos.json this asks the
MPC observations API for every reported position (the 80-column format), and
reads off the date, the observatory code, and whether the line is the
discovery observation. The MPC's list of observatory codes gives each code's
name and place (longitude and the parallax constants, turned into a geodetic
latitude here); codes with no place are in orbit (Hubble and the like).

Writes data/processed/observatories.json and the copy in public/data/:
  observatories  one row per code: name, lon, lat (null in orbit), how many
                 positions and objects, the years, which objects it discovered
  objects        one row per object: how many positions and nights, from how
                 many observatories, the dates of its nights (decimal years),
                 and JPL's formal uncertainty on its far end (sigma_ad, AU) and
                 average distance (sigma_a), for the arc timeline. The
                 uncertainties come from the team's raw JPL download
                 (../FinalProject/data/raw, falling back to data/raw).

Raw API answers are cached in data/raw/mpc_obs/ (gitignored); delete the
folder to fetch afresh. Stdlib only: python -P scripts/build_observatories.py
"""
import collections, json, math, os, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ETNOS = os.path.join(ROOT, "data", "processed", "etnos.json")
CACHE = os.path.join(ROOT, "data", "raw", "mpc_obs")
OUTS = [os.path.join(ROOT, "data", "processed", "observatories.json"), os.path.join(ROOT, "public", "data", "observatories.json")]
RAW_DIRS = [os.path.join(os.path.dirname(ROOT), "FinalProject", "data", "raw"), os.path.join(ROOT, "data", "raw")]
JPL_FILES = ["jpl_sbdb_a_gt30_asteroids.json", "jpl_sbdb_a_gt30.json"]
OBS_API = "https://data.minorplanetcenter.net/api/get-obs"
CODES_URL = "https://minorplanetcenter.net/iau/lists/ObsCodes.html"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"
E2 = 0.00669438                       # WGS84 first eccentricity squared, geocentric to geodetic latitude


def get_obs(desig):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, desig.replace(" ", "_") + ".txt")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return f.read()
    body = json.dumps({"desigs": [desig], "output_format": ["OBS80"]}).encode()
    req = urllib.request.Request(OBS_API, data=body, method="GET",
                                 headers={"Content-Type": "application/json", "User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.load(r)
    text = (d[0].get("OBS80") or "") if d else ""
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    time.sleep(0.3)
    return text


def obs_codes():
    req = urllib.request.Request(CODES_URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        text = r.read().decode("utf-8", "replace")
    out = {}
    for line in text.split("<pre>")[1].split("</pre>")[0].splitlines():
        if len(line) < 4 or line.startswith("Code"):
            continue
        code, name = line[0:3], line[30:].strip()
        lon, c, s = line[4:13].strip(), line[13:21].strip(), line[21:30].strip()
        if lon and c and s:
            lon = float(lon)
            phi_c = math.atan2(float(s), float(c))                 # geocentric latitude
            lat = math.degrees(math.atan(math.tan(phi_c) / (1 - E2)))
            out[code] = {"name": name, "lon": round(((lon + 180) % 360) - 180, 4), "lat": round(lat, 4)}
        else:
            out[code] = {"name": name, "lon": None, "lat": None}
    return out


def jpl_sigmas():
    """pdes -> (sigma_ad, sigma_a) from the raw JPL query, if it is on this machine."""
    for d in RAW_DIRS:
        for n in JPL_FILES:
            path = os.path.join(d, n)
            if os.path.exists(path):
                with open(path, encoding="utf-8") as f:
                    raw = json.load(f)
                fields = raw["fields"]
                if "sigma_ad" not in fields:
                    continue
                rows = (dict(zip(fields, r)) for r in raw["data"])
                return {r["pdes"]: (r["sigma_ad"], r["sigma_a"]) for r in rows}
    print("no raw JPL file with sigma_ad found; uncertainties left out")
    return {}


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def decimal_year(y, m, d):
    days = [31, 29 if y % 4 == 0 and (y % 100 or y % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    doy = sum(days[:m - 1]) + d - 1
    return y + doy / (366 if days[1] == 29 else 365)


def main():
    with open(ETNOS, encoding="utf-8") as f:
        etnos = json.load(f)
    codes = obs_codes()
    sigmas = jpl_sigmas()

    per_code = collections.defaultdict(lambda: {"n_obs": 0, "objects": set(), "years": set(), "discovered": []})
    objects = {}
    for o in etnos:
        # numbered objects are asked for by number, the rest by provisional designation
        desig = o["id"] if o["id"].isdigit() else (o["provisional_desig"] or o["id"])
        text = get_obs(desig)
        nights, n, used = set(), 0, set()
        for line in text.splitlines():
            if len(line) < 80 or line[14] in "sv":                 # satellite or roving-observer position lines
                continue
            try:
                y, m, d = int(line[15:19]), int(line[20:22]), float(line[23:32])
            except ValueError:
                continue
            code = line[77:80]
            n += 1
            used.add(code)
            nights.add(round(decimal_year(y, m, d), 3))
            pc = per_code[code]
            pc["n_obs"] += 1
            pc["objects"].add(o["id"])
            pc["years"].add(y)
            if line[12] == "*":
                pc["discovered"].append(o["id"])
        objects[o["id"]] = {
            "n_obs": n, "n_nights": len({round(t, 2) for t in nights}), "n_observatories": len(used),
            "nights": sorted({round(t, 2) for t in nights}),
            "sigma_Q_au": num(sigmas.get(o["id"], (None, None))[0]),
            "sigma_a_au": num(sigmas.get(o["id"], (None, None))[1]),
        }
        print(f"{desig:>14}: {n:5d} positions from {len(used):2d} observatories")

    rows = []
    for code, pc in per_code.items():
        c = codes.get(code, {"name": "unknown", "lon": None, "lat": None})
        rows.append({
            "code": code, "name": c["name"], "lon": c["lon"], "lat": c["lat"],
            "n_obs": pc["n_obs"], "n_objects": len(pc["objects"]),
            "first_year": min(pc["years"]), "last_year": max(pc["years"]),
            "discovered": sorted(set(pc["discovered"])), "objects": sorted(pc["objects"]),
        })
    rows.sort(key=lambda r: -r["n_obs"])
    out = {
        "_what": "Every observatory that has reported a position of one of the 90 extreme objects, and each object's nights, "
                 "from the MPC observations API. Built by scripts/build_observatories.py.",
        "_source": f"{OBS_API} (80-column observations) and {CODES_URL} (observatory codes)",
        "_fetched": time.strftime("%Y-%m-%d"),
        "n_objects": len(objects), "n_obs": sum(r["n_obs"] for r in rows), "n_observatories": len(rows),
        "observatories": rows, "objects": objects,
    }
    for p in OUTS:
        with open(p, "w", encoding="utf-8") as f:
            json.dump(out, f, separators=(",", ":"))
    print(f"{out['n_obs']} positions of {len(objects)} objects from {len(rows)} observatories "
          f"({sum(1 for r in rows if r['lat'] is None)} without a place on Earth)")


main()
