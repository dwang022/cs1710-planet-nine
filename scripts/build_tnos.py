#!/usr/bin/env python3
"""Join the JPL SBDB pull with the MPC distant-object catalogue and emit the
tables the Planet Nine site needs: every a > 30 AU body, plus the extreme
sample that the clustering argument rests on."""
import csv, gzip, json, math, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw")
OUT = os.path.join(ROOT, "data", "processed")

# Batygin & Brown's cut for the "extreme" sample, plus a looser one for context.
ETNO_A, ETNO_Q = 150.0, 30.0
# Predicted longitude of perihelion of Planet Nine's own orbit: 246.7 deg,
# the marginalized posterior median from Brown & Batygin 2021 (AJ 162:219,
# Figure 8). The clustered ETNOs sit anti-aligned with it.
P9_VARPI = 246.7


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def load_jpl():
    with open(os.path.join(RAW, "jpl_sbdb_a_gt_30.json")) as f:
        d = json.load(f)
    fields = d["fields"]
    return [dict(zip(fields, row)) for row in d["data"]]


def load_mpc():
    with gzip.open(os.path.join(RAW, "mpc_distant_extended.json.gz"), "rt") as f:
        return json.load(f)


def mpc_key(rec):
    n = rec.get("Number")
    if n:
        return re.sub(r"[()]", "", n).strip()
    return (rec.get("Principal_desig") or "").strip()


def main():
    jpl = load_jpl()
    mpc = {mpc_key(r): r for r in load_mpc() if mpc_key(r)}
    # MPC alternate designations give us a second chance at a match.
    for r in load_mpc():
        for alt in r.get("Other_desigs") or []:
            mpc.setdefault(alt.strip(), r)

    rows, matched = [], 0
    for o in jpl:
        a, e = num(o["a"]), num(o["e"])
        om, w = num(o["om"]), num(o["w"])
        if a is None or e is None or om is None or w is None:
            continue
        pdes = (o.get("pdes") or "").strip()
        m = mpc.get(pdes) or mpc.get((o.get("name") or "").strip())
        if m:
            matched += 1
        q = num(o["q"])
        # Numbered objects are keyed by their number, so the provisional
        # designation ("2015 BP519") would otherwise be unsearchable. JPL puts
        # it in parentheses inside full_name.
        full = (o.get("full_name") or "").strip()
        mdes = re.search(r"\(([^)]+)\)\s*$", full)
        provisional = mdes.group(1) if mdes else (pdes if re.match(r"^\d{4} ", pdes) else None)
        if not provisional and m:
            provisional = (m.get("Principal_desig") or "").strip() or None

        row = {
            "id": pdes,
            "provisional_desig": provisional,
            "spkid": o.get("spkid"),
            "name": (o.get("name") or "").strip(),
            "full_name": (o.get("full_name") or "").strip(),
            "orbit_class": o.get("class"),
            "a_au": a,
            "e": e,
            "i_deg": num(o["i"]),
            "node_deg": om,          # longitude of ascending node, Omega
            "argperi_deg": w,        # argument of perihelion, omega
            "varpi_deg": (om + w) % 360.0,   # longitude of perihelion
            "mean_anom_deg": num(o["ma"]),
            "tp_jd": num(o["tp"]),
            "q_au": q,
            "Q_au": num(o["ad"]),
            "period_yr": num(o["per_y"]),
            "epoch_jd": num(o["epoch"]),
            "H_mag": num(o["H"]),
            "diameter_km": num(o["diameter"]),
            "albedo": num(o["albedo"]),
            # JPL orbit condition code: 0 = well determined, 9 = very poor. Ordinal.
            "condition_code": o.get("condition_code"),
            "n_obs": num(o["n_obs_used"]),
            "data_arc_days": num(o["data_arc"]),
            "first_obs": o.get("first_obs"),
            "last_obs": o.get("last_obs"),
            # MPC cross-check
            "mpc_a_au": num(m.get("a")) if m else None,
            "mpc_q_au": num(m.get("Perihelion_dist")) if m else None,
            "mpc_e": num(m.get("e")) if m else None,
            "mpc_U": (m.get("U") if m else None),
            "mpc_num_opps": (m.get("Num_opps") if m else None),
            "mpc_arc_years": (m.get("Arc_years") if m else None),
        }
        # Ordinal quality flag so the site can drop one-opposition junk orbits.
        cc = num(o["condition_code"])
        opps = row["mpc_num_opps"]
        row["well_determined"] = bool(
            cc is not None and cc <= 3
            and (opps is None or int(opps) >= 3)
            and (row["data_arc_days"] or 0) >= 365
        )
        if row["mpc_a_au"]:
            row["a_disagreement_pct"] = round(100 * abs(row["mpc_a_au"] - a) / a, 4)
        else:
            row["a_disagreement_pct"] = None
        rows.append(row)

    rows.sort(key=lambda r: -r["a_au"])
    cols = list(rows[0].keys())
    with open(os.path.join(OUT, "tnos.csv"), "w", newline="") as f:
        wtr = csv.DictWriter(f, fieldnames=cols)
        wtr.writeheader()
        wtr.writerows(rows)

    # --- the extreme sample -------------------------------------------------
    etnos = [r for r in rows if r["a_au"] >= ETNO_A and (r["q_au"] or 0) >= ETNO_Q]
    for r in etnos:
        d = (r["varpi_deg"] - P9_VARPI + 180.0) % 360.0 - 180.0
        r["delta_varpi_deg"] = round(d, 3)
        # Anti-aligned with Planet Nine == clustered, in the Batygin & Brown framing.
        r["alignment"] = "anti-aligned" if abs(d) > 90 else "aligned"
    with open(os.path.join(OUT, "etnos.json"), "w") as f:
        json.dump(etnos, f, indent=1)

    summary = {
        "source_jpl": "JPL Small-Body Database Query API (ssd-api.jpl.nasa.gov/sbdb_query.api), a > 30 AU",
        "source_mpc": "Minor Planet Center Extended_Files/distant_extended.json.gz",
        "n_objects_a_gt_30": len(rows),
        "n_matched_to_mpc": matched,
        "n_a_gt_100": sum(1 for r in rows if r["a_au"] >= 100),
        "n_etno_a150_q30": len(etnos),
        "n_a250_q40": sum(1 for r in rows if r["a_au"] >= 250 and (r["q_au"] or 0) >= 40),
        "etno_cut": {"a_au_min": ETNO_A, "q_au_min": ETNO_Q},
        "planet_nine_varpi_deg_assumed": P9_VARPI,
        "n_etno_well_determined": sum(1 for r in etnos if r["well_determined"]),
        "anti_aligned_fraction": round(
            sum(1 for r in etnos if r["alignment"] == "anti-aligned") / max(len(etnos), 1), 3),
    }
    with open(os.path.join(OUT, "tno_summary.json"), "w") as f:
        json.dump(summary, f, indent=1)
    print(json.dumps(summary, indent=1))


main()
