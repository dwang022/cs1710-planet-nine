#!/usr/bin/env python3
"""Derived sky geometry for the 'where do the telescopes look' map.

Produces the predicted sky track of Planet Nine's orbit (from the Brown &
Batygin 2021 best-fit elements and a few variants spanning their quoted
uncertainty), plus the sky direction of each extreme TNO's perihelion.

Everything here is computed from orbital elements, not observed. Positions are
heliocentric; at 300-500 AU the Earth's 1 AU offset shifts a position by under
0.2 degrees, which does not matter for a schematic all-sky map.
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "processed")
OBLIQ = math.radians(23.439291)   # J2000 obliquity of the ecliptic

# Brown & Batygin 2021 (AJ 162:219), marginalized posterior medians read off
# their Figure 8 corner plot, with the quoted 1-sigma spreads:
#   m = 6.9 +2.6/-1.6 Mearth      a = 460.7 +178.8/-103.3 AU
#   e = 0.3 +0.1/-0.1             i = 15.6 +5.2/-5.4 deg
#   varpi = 246.7 +15.1/-13.4 deg Omega = 96.9 +17.3/-15.5 deg
# Their abstract instead quotes 6.2 Mearth, a = 380 AU, i = 16 deg, q = 300 AU.
# We use the corner-plot set here because it is the only one that supplies the
# two angles the sky track actually needs.
P9 = {"a": 460.7, "e": 0.30, "i": 15.6, "varpi": 246.7, "Omega": 96.9}
P9_VARIANTS = [
    ("nominal", 0, 0, 0),
    ("varpi +15.1", 15.1, 0, 0), ("varpi -13.4", -13.4, 0, 0),
    ("Omega +17.3", 0, 17.3, 0), ("Omega -15.5", 0, -15.5, 0),
    ("i +5.2", 0, 0, 5.2), ("i -5.4", 0, 0, -5.4),
]
# Brown & Batygin (2016) put Planet Nine at 22 < V < 25 and likely near
# aphelion. We anchor at V = 22 at 300 AU and scale as reflected light. This is
# our own rough anchor, not a number either paper states; treat it as a label on
# the map, not a photometric prediction.
V_AT_PERIHELION = 22.0
R_REF = 300.0


def orbital_to_ecliptic(a, e, i, Omega, w, nu):
    """Heliocentric ecliptic cartesian position (AU) at true anomaly nu."""
    i, Omega, w, nu = map(math.radians, (i, Omega, w, nu))
    r = a * (1 - e * e) / (1 + e * math.cos(nu))
    u = w + nu                      # argument of latitude
    cu, su, cO, sO, ci, si = (math.cos(u), math.sin(u), math.cos(Omega),
                              math.sin(Omega), math.cos(i), math.sin(i))
    return (r * (cO * cu - sO * su * ci),
            r * (sO * cu + cO * su * ci),
            r * (su * si)), r


def ecliptic_to_radec(x, y, z):
    """Ecliptic cartesian -> equatorial RA/Dec in degrees."""
    xe = x
    ye = y * math.cos(OBLIQ) - z * math.sin(OBLIQ)
    ze = y * math.sin(OBLIQ) + z * math.cos(OBLIQ)
    ra = math.degrees(math.atan2(ye, xe)) % 360.0
    dec = math.degrees(math.asin(ze / math.sqrt(xe * xe + ye * ye + ze * ze)))
    return ra, dec


def ecliptic_lonlat(x, y, z):
    lon = math.degrees(math.atan2(y, x)) % 360.0
    lat = math.degrees(math.asin(z / math.sqrt(x * x + y * y + z * z)))
    return lon, lat


def track(a, e, i, Omega, varpi, step=2):
    w = (varpi - Omega) % 360.0
    pts = []
    for nu in range(0, 360, step):
        (x, y, z), r = orbital_to_ecliptic(a, e, i, Omega, w, nu)
        ra, dec = ecliptic_to_radec(x, y, z)
        lon, lat = ecliptic_lonlat(x, y, z)
        pts.append({
            "true_anomaly_deg": nu, "r_au": round(r, 2),
            "ra_deg": round(ra, 3), "dec_deg": round(dec, 3),
            "ecl_lon_deg": round(lon, 3), "ecl_lat_deg": round(lat, 3),
            # Reflected sunlight falls off as r^-4, so brightness drops 10*log10(r/r0) mag.
            "est_V_mag": round(V_AT_PERIHELION + 10 * math.log10(r / R_REF), 2),
        })
    return pts


def main():
    tracks = []
    for label, dvarpi, dOmega, di in P9_VARIANTS:
        tracks.append({
            "label": label,
            "elements": {"a_au": P9["a"], "e": P9["e"], "i_deg": P9["i"] + di,
                         "varpi_deg": (P9["varpi"] + dvarpi) % 360,
                         "Omega_deg": (P9["Omega"] + dOmega) % 360},
            "points": track(P9["a"], P9["e"], P9["i"] + di,
                            (P9["Omega"] + dOmega) % 360, (P9["varpi"] + dvarpi) % 360),
        })
    nominal = tracks[0]["points"]
    peri = min(nominal, key=lambda p: p["r_au"])
    aph = max(nominal, key=lambda p: p["r_au"])
    with open(os.path.join(OUT, "p9_sky_track.json"), "w") as f:
        json.dump({
            "_what": "Predicted sky path of Planet Nine, computed from the Brown & Batygin 2021 orbit fit. The 'nominal' track is the best fit; the others span their quoted 1-sigma spreads in longitude of perihelion, node and inclination, and together give a band to shade on the sky map.",
            "_caution": "Derived, not observed. Magnitudes assume V = 22 at 300 AU and reflected-light scaling (flux ~ r^-4); they are indicative only. Where on this track the planet actually sits is unknown.",
            "_source_elements": "Brown & Batygin 2021, AJ 162:219, doi:10.3847/1538-3881/ac2056, Figure 8 marginalized posterior (arXiv:2108.09868v2). Their abstract quotes a slightly different headline set (6.2 Mearth, a=380 AU, i=16 deg, q=300 AU) but gives neither varpi nor Omega.",
            "perihelion": peri, "aphelion": aph,
            "tracks": tracks,
        }, f, indent=1)

    # Sky direction of each extreme TNO's perihelion: the quantity the
    # clustering claim is actually about.
    with open(os.path.join(OUT, "etnos.json")) as f:
        etnos = json.load(f)
    peris = []
    for o in etnos:
        w = (o["argperi_deg"]) % 360.0
        (x, y, z), r = orbital_to_ecliptic(o["a_au"], o["e"], o["i_deg"], o["node_deg"], w, 0.0)
        ra, dec = ecliptic_to_radec(x, y, z)
        lon, lat = ecliptic_lonlat(x, y, z)
        peris.append({
            "id": o["id"], "name": o["name"], "a_au": o["a_au"], "q_au": o["q_au"],
            "i_deg": o["i_deg"], "varpi_deg": o["varpi_deg"],
            "delta_varpi_deg": o["delta_varpi_deg"], "alignment": o["alignment"],
            "well_determined": o["well_determined"],
            "peri_ra_deg": round(ra, 3), "peri_dec_deg": round(dec, 3),
            "peri_ecl_lon_deg": round(lon, 3), "peri_ecl_lat_deg": round(lat, 3),
        })
    with open(os.path.join(OUT, "etno_perihelion_sky.json"), "w") as f:
        json.dump({
            "_what": "Sky direction of the perihelion point of each extreme TNO (a > 150 AU, q > 30 AU). Plotting these on the all-sky map is the clustering claim, made visible.",
            "_caution": "Derived from orbital elements. Objects flagged well_determined = false have short observational arcs and their perihelion directions can move substantially as more data arrives.",
            "n": len(peris), "objects": peris,
        }, f, indent=1)

    print(f"p9_sky_track.json: {len(tracks)} tracks, {len(nominal)} points each")
    print(f"  perihelion r={peri['r_au']} AU at RA {peri['ra_deg']:.1f} Dec {peri['dec_deg']:.1f}, V~{peri['est_V_mag']}")
    print(f"  aphelion   r={aph['r_au']} AU at RA {aph['ra_deg']:.1f} Dec {aph['dec_deg']:.1f}, V~{aph['est_V_mag']}")
    print(f"etno_perihelion_sky.json: {len(peris)} objects")


main()
