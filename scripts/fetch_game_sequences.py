#!/usr/bin/env python3
"""Build the find-the-moving-object game from the telescope archives: for each
distant object, five to ten frames of one patch of sky taken over a night
(or a few), aligned on the stars, with the object's position in every frame
computed from the Minor Planet Center's own records of it.

Sources
  NOIRLab Astro Data Archive, for DECam on the 4-metre Blanco telescope: the
    community pipeline's calibrated images ("InstCal", ooi), one CCD per
    exposure, fetched with the archive's per-HDU retrieval (~5 MB each). The
    archive's SIA HDU search says which exposures and CCDs hold the object;
    where its HDU table lacks a night, the exposure search and the header
    listing find the CCD.
  Canadian Astronomy Data Centre (CADC), for MegaCam on the 3.6-metre CFHT:
    Elixir-processed images ("p"), cut out on the server (~3-6 MB each). CADC's
    Solar System Object Image Search (SSOIS) says which exposures, CCDs and
    pixels hold the object (and fixes the Elixir header WCS, which is only the
    telescope's pointing, to tens of arcseconds).
  Gaia DR3 (ESA archive TAP) for the astrometry; where fewer than eight Gaia
    stars fall on the CCD, Pan-STARRS1 DR2 (MAST), whose positions are tied to
    Gaia and go deeper.
  The MPC observations cached in data/raw/mpc_obs/ by build_observatories.py
    (fetched from the MPC observations API if a file is missing).

How a round is made
  1. The MPC positions from the listed observatories in the round's window are
     fitted with a straight line in RA and Dec against time (a parabola when
     they span more than a day). That gives where the object is at the middle
     of each exposure. For a night the MPC has no positions from, the window
     takes the nights round it (mpc_windows) and the fit interpolates.
  2. Cosmic-ray hits are replaced on the native pixels (a hit is far sharper
     than a star), then a sky grid is laid down: a tangent plane, north up and
     east left, SCALE arcsec per saved pixel, with the track's midpoint at PLACE
     (fractions of the saved frame) so the track sits off-centre; if a CCD edge
     cuts the frame there, it slides to the nearest clear spot. Every exposure
     is resampled onto the grid (bicubic) through its WCS (TPV for DECam).
  3. Stars found in each resampled exposure are matched to the first one's and
     the exposure is resampled again through the fitted correction, so all agree
     on the stars to a fraction of a pixel (the median residual is printed).
     Fluxes are scaled to the first exposure by the same stars. With stack = 2,
     each frame is the mean of two exposures taken minutes apart.
  4. The median of the frames is matched to the catalogue (Gaia propagated to
     the night with its proper motions) and an affine fit gives the grid's true
     astrometry. Each MPC position goes through it into saved pixels.
  5. Check: each frame minus the median of the frames where the object is well
     away leaves what moved. Where that residual peaks near the computed
     position, its significance and its offset are printed and kept in
     game.json; --debug draws both on copies in DEBUG_DIR.
  6. Display: a smooth background is taken off (amplifier steps and flat-field
     residuals far below the noise would otherwise show), the frame is smoothed
     a little (SMOOTH, under the seeing) so a faint source reads as a dot, and
     one asinh stretch serves all frames of a round, in units of the first
     frame's noise; greyscale JPEG.
Positions are in saved-frame pixels: origin at the top-left corner, x right,
y down, pixel centres at +0.5. Times are mid-exposure (mid-pair for stacked
frames), UT. Objects tried and set aside, and why, go into "skipped".

Writes public/game/<id>-<n>.jpg, public/game/game.json and public/game/CREDITS.md,
and removes frames no round uses (this replaces the Commons-based rounds of
fetch_game_frames.py, which now writes elsewhere). Downloads are cached in
data/raw/game_frames/ (gitignored; about 180 MB for the rounds below).
Pillow is needed; numpy and astropy are not: FITS, Rice decompression and the
TPV WCS are done here. On this machine:
  python -P scripts/fetch_game_sequences.py [--debug] [--only id,id]
"""
import json, math, os, re, struct, sys, time, urllib.parse, urllib.request
from array import array
from collections import Counter, defaultdict

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "game")
CACHE = os.path.join(ROOT, "data", "raw", "game_frames")
MPC_CACHE = os.path.join(ROOT, "data", "raw", "mpc_obs")
DEBUG_DIR = os.environ.get("GAME_DEBUG_DIR", os.path.join(CACHE, "debug"))
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"

SIA_HDU = "https://astroarchive.noirlab.edu/api/sia/vohdu"
SIA_IMG = "https://astroarchive.noirlab.edu/api/sia/voimg"
RETRIEVE = "https://astroarchive.noirlab.edu/api/retrieve/{md5}/?hdus=0,{hdu}"
SSOIS = "https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/cadcbin/ssos/ssosclf.pl"
SSOIS_PAGE = "https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/ssois/results.html"
CADC_CUT = "https://ws.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/data/pub/CFHT/{file}.fits.fz?cutout=[{ext}][{x0}:{x1},{y0}:{y1}]"
GAIA_TAP = "https://gea.esac.esa.int/tap-server/tap/sync"
PS1_CAT = "https://catalogs.mast.stsci.edu/api/v0.1/panstarrs/dr2/mean.csv"
MPC_OBS = "https://data.minorplanetcenter.net/api/get-obs"

SIZE = (900, 540)    # saved frame, pixels
MARGIN = 260         # grid pixels kept round the saved frame for alignment and astrometry
QUALITY = 88         # JPEG quality
MAX_FRAMES = 10
STACK_GAP = 7.0      # minutes: the most between two exposures averaged into one frame

# Display stretch, in units of the first frame's sky noise: black a little below
# the sky, an asinh knee, white for the brightest stars.
BLACK, KNEE, WHITE = -1.0, 4.0, 150.0
SMOOTH = 0.45        # arcsec, the display smoothing

DECAM = "Dark Energy Camera, 4-metre Blanco telescope, Cerro Tololo"
MEGACAM = "MegaCam, 3.6-metre Canada-France-Hawaii Telescope, Maunakea"

# What the archives ask to be acknowledged, verbatim from their pages: NOIRLab's statement for DECam
# data from the Astro Data Archive (its version for short articles; {prop} and {pi} are filled from the
# FITS headers), and CFHT's shorter MegaCam statement followed by CADC's (cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/about.html).
ACK = {
    "noirlab": ("This research draws upon DECam data as distributed by the Astro Data Archive at NSF NOIRLab. NOIRLab is "
                "managed by the Association of Universities for Research in Astronomy (AURA) under a cooperative "
                "agreement with the U.S. National Science Foundation. This project used data obtained with the Dark "
                "Energy Camera (DECam), which was constructed by the Dark Energy Survey (DES) collaboration. Funding for "
                "the DES Projects has been provided by the DOE and NSF (USA), MISE (Spain), STFC (UK), HEFCE (UK), NCSA "
                "(UIUC), KICP (U. Chicago), CCAPP (Ohio State), MIFPA (Texas A&M), CNPQ, FAPERJ, FINEP (Brazil), MINECO "
                "(Spain), DFG (Germany) and the Collaborating Institutions in the Dark Energy Survey, which are Argonne "
                "Lab, UC Santa Cruz, University of Cambridge, CIEMAT-Madrid, University of Chicago, University College "
                "London, DES-Brazil Consortium, University of Edinburgh, ETH Zürich, Fermilab, University of Illinois, "
                "ICE (IEEC-CSIC), IFAE Barcelona, Lawrence Berkeley Lab, LMU München and the associated Excellence "
                "Cluster Universe, University of Michigan, NSF NOIRLab, University of Nottingham, Ohio State University, "
                "OzDES Membership Consortium, University of Pennsylvania, University of Portsmouth, SLAC National Lab, "
                "Stanford University, University of Sussex, and Texas A&M University. Based on observations at NSF Cerro "
                "Tololo Inter-American Observatory, a program of NOIRLab (NOIRLab Prop. ID {prop}{pi}), which is managed "
                "by the Association of Universities for Research in Astronomy (AURA) under a cooperative agreement with "
                "the U.S. National Science Foundation."),
    "cadc": ("Based on observations obtained at the Canada-France-Hawaiʻi Telescope (CFHT) which is operated by the "
             "National Research Council of Canada, the Institut National des Sciences de l'Univers of the Centre "
             "National de la Recherche Scientifique of France, and the University of Hawaiʻi. CFHT is located on "
             "Maunakea on Hawaiʻi Island, a mountain of considerable cultural, natural, and ecological significance. "
             "Maunakea is a sacred site to Native Hawaiians, also known as Kānaka ʻŌiwi. Quality observations are made "
             "possible by relentless effort of the entire staff at Canada-France-Hawaiʻi Telescope. Based on "
             "observations obtained with MegaPrime/MegaCam, a joint project of CFHT and CEA/DAPNIA. This research used "
             "the facilities of the Canadian Astronomy Data Centre operated by the National Research Council of Canada "
             "with the support of the Canadian Space Agency."),
}
ACK_URL = {
    "noirlab": "https://noirlab.edu/science/about/scientific-acknowledgments#decam",
    "cadc": "https://www.cfht.hawaii.edu/en/science/Publications/",
}
TERMS = {
    "noirlab": "public since {release}, when the NOIRLab proprietary period (usually 18 months) ended",
    "cadc": "public since {release}, when CFHT's proprietary period ended (the REL_DATE in the headers)",
}

# Each round (in the order the game plays them, the easiest first):
#   object, desig   name on the page; designation for SSOIS and the MPC
#   mpc             file in data/raw/mpc_obs; codes: the MPC observatory codes to fit
#   archive         noirlab (DECam) or cadc (MegaCam)
#   windows         UT ranges holding the exposures (and the MPC lines that are fitted)
#   filter          only exposures in this filter, min_exp seconds or longer
#   scale, place    arcsec per saved pixel; where the track's midpoint sits (fractions of the frame)
#   stack           2: each frame is the mean of two consecutive exposures (STACK_GAP)
#   drop            exposures left out (file-name prefixes), with the reason beside them
#   skip            tried and set aside: the reason goes into game.json's "skipped"
ROUNDS = [
    {"id": "chiminigagua", "object": "Chiminigagua", "desig": "2013 FY27", "mpc": "532037.txt", "codes": ["W84", "807"],
     "archive": "noirlab", "windows": [("2013-05-07 20:00", "2013-05-08 12:00"), ("2013-05-08 20:00", "2013-05-09 12:00"),
                                       ("2013-05-09 20:00", "2013-05-10 12:00")], "filter": "r", "min_exp": 190,
     "scale": 0.263, "place": (0.60, 0.66),
     # taken through cloud: its stars at 0.42 of their brightness in the first frame, its noise blown up
     "drop": ["c4d_130510_021735"]},
    # No MPC positions from this night: the line through the Pan-STARRS positions of the nights round it
    # (12 to 24 April) gives its place, and the check against the pixels says how well.
    {"id": "fp185", "object": "2001 FP185", "desig": "2001 FP185", "mpc": "82158.txt", "codes": ["F51"],
     "archive": "cadc", "windows": [("2015-04-14 08:00", "2015-04-14 12:00")],
     "mpc_windows": [("2015-04-12 00:00", "2015-04-25 00:00")], "filter": "R.MP9602", "min_exp": 50,
     "scale": 0.14, "place": (0.22, 0.42),
     # the telescope stepped the field between visits; in the last two of these the object sits too near the
     # CCD's edge for a frame that every exposure covers, and the first was taken through cloud (its stars at
     # 0.46 of their brightness in the first frame)
     "drop": ["1795604p", "1795611p", "1795612p"], "max_frames": 7},
    {"id": "vp113", "object": "2012 VP113", "desig": "2012 VP113", "mpc": "2012_VP113.txt", "codes": ["807", "W84"],
     "archive": "noirlab", "windows": [("2012-11-05 00:00", "2012-11-05 12:00")], "filter": "r", "min_exp": 60,
     "scale": 0.17, "place": (0.62, 0.34), "stack": 2},
    {"id": "gt50", "object": "2015 GT50", "desig": "2015 GT50", "mpc": "2015_GT50.txt", "codes": ["568"],
     "archive": "cadc", "windows": [("2015-04-13 05:00", "2015-04-13 16:00")], "filter": "R.MP9602", "min_exp": 200,
     "scale": 0.187, "place": (0.30, 0.66)},
    {"id": "kg163", "object": "2015 KG163", "desig": "2015 KG163", "mpc": "2015_KG163.txt", "codes": ["568"],
     "archive": "cadc", "windows": [("2015-05-17 05:00", "2015-05-17 16:00")], "filter": "R.MP9602", "min_exp": 200,
     "scale": 0.187, "place": (0.68, 0.64)},
    # Tried, and too faint to follow by eye in single frames (the check's signal-to-noise in brackets).
    {"id": "sy99", "object": "2013 SY99", "desig": "2013 SY99", "mpc": "2013_SY99.txt", "codes": ["568"],
     "archive": "cadc", "windows": [("2013-09-29 06:00", "2013-09-29 16:00")], "filter": "R.MP9601", "min_exp": 200,
     "scale": 0.16, "place": (0.66, 0.40),
     "skip": "too faint to follow by eye: its discovery night's nine 287-s MegaCam exposures (OSSOS, 29 September 2013) "
             "show it at r = 24 to 25, three to four times the noise in each, and most are too far apart in time to add"},
    {"id": "rf98", "object": "2013 RF98", "desig": "2013 RF98", "mpc": "2013_RF98.txt", "codes": ["W84", "807"],
     "archive": "noirlab", "windows": [("2013-10-10 00:00", "2013-10-10 12:00")], "filter": "z", "min_exp": 200,
     "scale": 0.17, "place": (0.40, 0.36), "stack": 2,
     "skip": "too faint to follow by eye: on its best-covered night (10 October 2013, thirteen 330-s DECam z exposures "
             "in a Dark Energy Survey supernova field) it stands two to five times above the noise even with exposures "
             "added in pairs, and its track runs past a brighter galaxy"},
    {"id": "dy248", "object": "2015 DY248", "desig": "2015 DY248", "mpc": "2015_DY248.txt", "codes": ["W84", "807"],
     "archive": "noirlab", "windows": [("2015-02-18 00:00", "2015-02-18 12:00")], "filter": "g", "min_exp": 60,
     "scale": 0.263, "place": (0.38, 0.62),
     "skip": "too faint to follow by eye: its discovery night (18 February 2015, five 86-s DECam g exposures of the "
             "HiTS survey, 1.6 hours apart) shows it at g = 24, four to five times the noise in each"},
    {"id": "kh163", "object": "2015 KH163", "desig": "2015 KH163", "mpc": "2015_KH163.txt", "codes": ["568"],
     "archive": "cadc", "windows": [("2015-05-17 05:00", "2015-05-17 16:00")], "filter": "R.MP9602", "min_exp": 200,
     "scale": 0.187, "place": (0.62, 0.38),
     "skip": "too faint to follow by eye: on 17 May 2015 (five 300-s MegaCam exposures, OSSOS) it is at r = 24.5 to 25, "
             "about three times the noise in each"},
]

# Column 72 of an MPC line: the star catalogue the position was measured against
# (https://www.minorplanetcenter.net/iau/info/CatalogueCodes.html). Positions
# reduced against the older catalogues carry their zonal errors, a few tenths
# of an arcsecond; the check against the pixels shows them.
CATALOGUES = {"c": "USNO-A2.0", "o": "USNO-B1.0", "r": "UCAC-2", "u": "UCAC-3", "q": "UCAC-4", "Y": "UCAC-5",
              "t": "PPMXL", "L": "2MASS", "U": "Gaia DR1", "V": "Gaia DR2", "X": "Gaia EDR3", "W": "Gaia DR3",
              "N": "SDSS-DR7", "n": "SDSS-DR8", "1": "PS1-DR1", "2": "PS1-DR2", "S": "URAT-1"}

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


# ---------- time and sky -------------------------------------------------------

def mjd(y, m, d):
    """Calendar date (d may carry a fraction of a day) to MJD."""
    a = (14 - m) // 12
    yy, mm = y + 4800 - a, m + 12 * a - 3
    jdn = int(d) + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
    return jdn - 2400001 + (d - int(d))


def mjd_of(text):
    """'2012-11-05 04:39:17.9' (or with a T) to MJD."""
    m = re.match(r"(\d{4})-(\d\d)-(\d\d)[ T]?(\d\d)?:?(\d\d)?:?([\d.]+)?", text)
    y, mo, d, hh, mi, ss = m.groups()
    return mjd(int(y), int(mo), int(d)) + (int(hh or 0) + int(mi or 0) / 60 + float(ss or 0) / 3600) / 24


def calendar(t):
    """MJD to (y, m, d, hh, mm, ss)."""
    jd = t + 2400000.5
    z, f = int(jd + 0.5), jd + 0.5 - int(jd + 0.5)
    a = int((z - 1867216.25) / 36524.25)
    b = z + 1 + a - a // 4 + 1524
    c = int((b - 122.1) / 365.25)
    d = int(365.25 * c)
    e = int((b - d) / 30.6001)
    day = b - d - int(30.6001 * e)
    month = e - 1 if e < 14 else e - 13
    year = c - 4716 if month > 2 else c - 4715
    secs = f * 86400
    return year, month, day, int(secs // 3600), int(secs % 3600 // 60), secs % 60


def stamp(t):
    """MJD to '2012-11-05 04:40 UT' (nearest minute)."""
    y, mo, d, hh, mi, ss = calendar(round(t * 1440) / 1440 + 1e-7)
    return f"{y:04d}-{mo:02d}-{d:02d} {hh:02d}:{mi:02d} UT"


def date_words(times):
    days = sorted({calendar(t)[:3] for t in times})
    y, m, _ = days[0]
    if len(days) == 1:
        return f"{days[0][2]} {MONTHS[m - 1]} {y}"
    if all(dd[:2] == (y, m) for dd in days):
        sep = " and " if len(days) == 2 else " to "
        return f"{days[0][2]}{sep}{days[-1][2]} {MONTHS[m - 1]} {y}"
    return " to ".join(f"{dd[2]} {MONTHS[dd[1] - 1]} {dd[0]}" for dd in (days[0], days[-1]))


def tan_project(ra, de, ra0, de0):
    """Gnomonic projection; degrees in, arcsec out (xi east, eta north)."""
    ra, de, ra0, de0 = map(math.radians, (ra, de, ra0, de0))
    cosc = math.sin(de0) * math.sin(de) + math.cos(de0) * math.cos(de) * math.cos(ra - ra0)
    xi = math.cos(de) * math.sin(ra - ra0) / cosc
    eta = (math.cos(de0) * math.sin(de) - math.sin(de0) * math.cos(de) * math.cos(ra - ra0)) / cosc
    return math.degrees(xi) * 3600, math.degrees(eta) * 3600


def tan_deproject(xi, eta, ra0, de0):
    xi, eta, ra0, de0 = math.radians(xi / 3600), math.radians(eta / 3600), math.radians(ra0), math.radians(de0)
    den = math.cos(de0) - eta * math.sin(de0)
    ra = ra0 + math.atan2(xi, den)
    de = math.atan2(math.sin(de0) + eta * math.cos(de0), math.hypot(xi, den))
    return math.degrees(ra) % 360, math.degrees(de)


# ---------- small linear algebra ------------------------------------------------

def solve(a, b):
    """Gauss-Jordan solve of a small dense system."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(n):
            if r != c and m[c][c]:
                f = m[r][c] / m[c][c]
                for k in range(c, n + 1):
                    m[r][k] -= f * m[c][k]
    return [m[i][n] / m[i][i] for i in range(n)]


def lstsq(rows, ys, w=None):
    """Least squares coefficients for y ~ rows . c."""
    n = len(rows[0])
    w = w or [1.0] * len(ys)
    ata = [[sum(wi * r[i] * r[j] for r, wi in zip(rows, w)) for j in range(n)] for i in range(n)]
    aty = [sum(wi * r[i] * y for r, y, wi in zip(rows, ys, w)) for i in range(n)]
    return solve(ata, aty)


def fit_affine(src, dst, clip=3.0, iters=4):
    """Affine (a, b, c, d, e, f) with dst = (a x + b y + c, d x + e y + f), sigma-clipped.
    Returns the coefficients, the rms residual and the number of pairs kept."""
    keep = list(range(len(src)))
    for _ in range(iters):
        rows = [(src[i][0], src[i][1], 1.0) for i in keep]
        cx = lstsq(rows, [dst[i][0] for i in keep])
        cy = lstsq(rows, [dst[i][1] for i in keep])
        res = [math.hypot(cx[0] * src[i][0] + cx[1] * src[i][1] + cx[2] - dst[i][0],
                          cy[0] * src[i][0] + cy[1] * src[i][1] + cy[2] - dst[i][1]) for i in range(len(src))]
        rms = math.sqrt(sum(res[i] ** 2 for i in keep) / len(keep))
        new = [i for i in range(len(src)) if res[i] < max(clip * rms, 0.15)]
        if new == keep or len(new) < 4:
            break
        keep = new
    return (cx[0], cx[1], cx[2], cy[0], cy[1], cy[2]), rms, len(keep)


def apply(A, x, y):
    return A[0] * x + A[1] * y + A[2], A[3] * x + A[4] * y + A[5]


def compose(A, B):
    """The affine x -> A(B(x))."""
    a, b, c, d, e, f = A
    p, q, r, s, t, u = B
    return (a * p + b * s, a * q + b * t, a * r + b * u + c, d * p + e * s, d * q + e * t, d * r + e * u + f)


def median(v):
    s = sorted(v)
    n = len(s)
    return s[n // 2] if n % 2 else 0.5 * (s[n // 2 - 1] + s[n // 2])


# ---------- network --------------------------------------------------------------

def get(url, data=None, headers=None, timeout=300, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 - retry anything, then give up loudly
            if k == tries - 1:
                raise
            print(f"    retry {url[:90]}... ({e})")
            time.sleep(3 * (k + 1))


def cached(path, url, **kw):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = get(url, **kw)
        with open(path + ".part", "wb") as f:
            f.write(data)
        os.replace(path + ".part", path)
    with open(path, "rb") as f:
        return f.read()


# ---------- FITS ------------------------------------------------------------------

def read_hdus(data):
    """[(header dict, start of data, length of data)] for every HDU in a FITS byte string."""
    out, pos = [], 0
    while pos + 2880 <= len(data):
        h, done = {}, False
        while not done:
            blk = data[pos:pos + 2880]
            pos += 2880
            for i in range(36):
                c = blk[i * 80:(i + 1) * 80].decode("ascii", "replace")
                if c.startswith("END") and not c[3:].strip():
                    done = True
                    break
                if c[8:10] != "= ":
                    continue
                key, v = c[:8].strip(), c[10:].strip()
                if v.startswith("'"):
                    j = 1
                    while True:
                        j = v.find("'", j)
                        if j < 0 or v[j + 1:j + 2] != "'":
                            break
                        j += 2
                    h[key] = v[1:j].replace("''", "'").rstrip()
                    continue
                v = v.split("/")[0].strip()
                for cast in (int, float):
                    try:
                        h[key] = cast(v.replace("D", "E")) if cast is float else cast(v)
                        break
                    except ValueError:
                        pass
                else:
                    h[key] = v == "T" if v in ("T", "F") else v
        size = 0
        if h.get("NAXIS", 0):
            size = abs(h.get("BITPIX", 8)) // 8
            for i in range(1, h["NAXIS"] + 1):
                size *= h["NAXIS%d" % i]
        size += h.get("PCOUNT", 0)
        out.append((h, pos, size))
        pos += (size + 2879) // 2880 * 2880
    return out


NBITS = [i.bit_length() for i in range(256)]


def rice_decode(buf, n, nblock):
    """The first n 32-bit integers of a RICE_1 tile (after cfitsio's fits_rdecomp)."""
    fsbits, fsmax, M = 5, 25, 0xFFFFFFFF
    lastpix = struct.unpack(">I", buf[0:4])[0]
    p, b, nbits = 5, buf[4], 8
    out = [0] * n
    i = 0
    while i < n:
        nbits -= fsbits
        while nbits < 0:
            b = (b << 8) | buf[p]
            p += 1
            nbits += 8
        fs = (b >> nbits) - 1
        b &= (1 << nbits) - 1
        imax = min(i + nblock, n)
        if fs < 0:
            for k in range(i, imax):
                out[k] = lastpix
        elif fs == fsmax:
            for k in range(i, imax):
                kk = 32 - nbits
                diff = b << kk
                kk -= 8
                while kk >= 0:
                    b = buf[p]
                    p += 1
                    diff |= b << kk
                    kk -= 8
                if nbits > 0:
                    b = buf[p]
                    p += 1
                    diff |= b >> (-kk)
                    b &= (1 << nbits) - 1
                else:
                    b = 0
                diff &= M
                lastpix = (lastpix - (diff >> 1) - 1) & M if diff & 1 else (lastpix + (diff >> 1)) & M
                out[k] = lastpix
        else:
            for k in range(i, imax):
                while b == 0:
                    nbits += 8
                    b = buf[p]
                    p += 1
                nzero = nbits - NBITS[b]
                nbits -= nzero + 1
                b ^= 1 << nbits
                nbits -= fs
                while nbits < 0:
                    b = (b << 8) | buf[p]
                    p += 1
                    nbits += 8
                diff = (nzero << fs) | (b >> nbits)
                b &= (1 << nbits) - 1
                lastpix = (lastpix - (diff >> 1) - 1) & M if diff & 1 else (lastpix + (diff >> 1)) & M
                out[k] = lastpix
        i = imax
    return [v - 4294967296 if v & 0x80000000 else v for v in out]


# FITS tile-compression's dither sequence (Pence et al. 2010)
RAND = []
_s = 1.0
for _ in range(10000):
    _t = 16807.0 * _s
    _s = _t - 2147483647.0 * int(_t / 2147483647.0)
    RAND.append(_s / 2147483647.0)


class Rice:
    """A tile-compressed image HDU, RICE_1, one tile per row: rows decoded on demand."""

    def __init__(self, data, hdu):
        h, start, _ = hdu
        if h.get("ZCMPTYPE") != "RICE_1" or h.get("ZTILE2", 1) != 1:
            raise ValueError(f"unsupported compression {h.get('ZCMPTYPE')} {h.get('ZTILE2')}")
        self.h, self.data, self.start = h, data, start
        self.nx, self.ny = h["ZNAXIS1"], h["ZNAXIS2"]
        self.rowlen = h["NAXIS1"]
        self.heap = start + h.get("THEAP", self.rowlen * h["NAXIS2"])
        self.cols, off = {}, 0
        for i in range(1, h["TFIELDS"] + 1):
            form = h["TFORM%d" % i].strip()
            self.cols[h["TTYPE%d" % i]] = (off, form)
            off += 8 if "P" in form else {"D": 8, "E": 4, "J": 4, "K": 8, "I": 2}[form[-1]]
        self.nblock = h.get("ZVAL1", 32) if h.get("ZNAME1") == "BLOCKSIZE" else 32
        self.dither = str(h.get("ZQUANTIZ", "")).startswith("SUBTRACTIVE_DITHER")
        self.zdither0 = h.get("ZDITHER0", 1)

    def field(self, r, name):
        off, form = self.cols[name]
        base = self.start + r * self.rowlen + off
        if "P" in form:
            return struct.unpack(">ii", self.data[base:base + 8])
        return struct.unpack(">d" if form[-1] == "D" else ">f", self.data[base:base + (8 if form[-1] == "D" else 4)])[0]

    def row(self, r, x0, x1):
        n, o = self.field(r, "COMPRESSED_DATA")
        ints = rice_decode(self.data[self.heap + o:self.heap + o + n], x1, self.nblock)
        if "ZSCALE" not in self.cols:
            return [float(v) for v in ints[x0:x1]]
        zs, zz = self.field(r, "ZSCALE"), self.field(r, "ZZERO")
        if not self.dither:
            return [v * zs + zz for v in ints[x0:x1]]
        iseed = (r + self.zdither0 - 1) % 10000
        nxt = int(RAND[iseed] * 500)
        out = []
        for k in range(x1):
            if k >= x0:
                v = ints[k]
                out.append(float("nan") if v == -2147483647 else (v - RAND[nxt] + 0.5) * zs + zz)
            nxt += 1
            if nxt == 10000:
                iseed = (iseed + 1) % 10000
                nxt = int(RAND[iseed] * 500)
        return out

    def region(self, x0, x1, y0, y1):
        a = array("f")
        for r in range(y0, y1):
            a.extend(self.row(r, x0, x1))
        return a


def plain_image(data, hdu):
    """A plain (uncompressed) image HDU as a float array."""
    h, start, size = hdu
    bp, n = h["BITPIX"], h["NAXIS1"] * h["NAXIS2"]
    fmt = {8: "B", 16: "h", 32: "i", -32: "f", -64: "d"}[bp]
    a = array(fmt, data[start:start + n * abs(bp) // 8])
    if sys.byteorder == "little" and bp != 8:
        a.byteswap()
    bs, bz = h.get("BSCALE", 1.0), h.get("BZERO", 0.0)
    return array("f", (v * bs + bz for v in a))


class WCS:
    """FITS celestial WCS: TAN, or TPV with its polynomial distortion. Pixels 1-based."""

    def __init__(self, h):
        self.crpix = (h["CRPIX1"], h["CRPIX2"])
        self.crval = (h["CRVAL1"], h["CRVAL2"])
        if "CD1_1" in h:
            self.cd = (h["CD1_1"], h.get("CD1_2", 0.0), h.get("CD2_1", 0.0), h["CD2_2"])
        else:
            self.cd = (h["CDELT1"], 0.0, 0.0, h["CDELT2"])
        a, b, c, d = self.cd
        det = a * d - b * c
        self.icd = (d / det, -b / det, -c / det, a / det)
        self.tpv = "TPV" in str(h.get("CTYPE1", ""))
        self.pv1 = [h.get("PV1_%d" % k, 1.0 if k == 1 else 0.0) for k in range(17)]
        self.pv2 = [h.get("PV2_%d" % k, 1.0 if k == 1 else 0.0) for k in range(17)]

    @staticmethod
    def poly(c, u, v):
        r = math.hypot(u, v)
        t = (1, u, v, r, u * u, u * v, v * v, u ** 3, u * u * v, u * v * v, v ** 3, r ** 3,
             u ** 4, u ** 3 * v, u * u * v * v, u * v ** 3, v ** 4)
        return sum(ci * ti for ci, ti in zip(c, t))

    def distort(self, x, y):
        if not self.tpv:
            return x, y
        return self.poly(self.pv1, x, y), self.poly(self.pv2, y, x)

    def pix2sky(self, p1, p2):
        dx, dy = p1 - self.crpix[0], p2 - self.crpix[1]
        xi, eta = self.distort(self.cd[0] * dx + self.cd[1] * dy, self.cd[2] * dx + self.cd[3] * dy)
        return tan_deproject(xi * 3600, eta * 3600, *self.crval)

    def sky2pix(self, ra, de):
        xi, eta = (v / 3600 for v in tan_project(ra, de, *self.crval))
        x, y = xi, eta
        for _ in range(30):
            fx, fy = self.distort(x, y)
            ex, ey = fx - xi, fy - eta
            if abs(ex) < 1e-13 and abs(ey) < 1e-13:
                break
            e = 1e-7
            a11, a21 = ((p - q) / e for p, q in zip(self.distort(x + e, y), (fx, fy)))
            a12, a22 = ((p - q) / e for p, q in zip(self.distort(x, y + e), (fx, fy)))
            det = a11 * a22 - a12 * a21
            x -= (a22 * ex - a12 * ey) / det
            y -= (-a21 * ex + a11 * ey) / det
        return (self.icd[0] * x + self.icd[1] * y + self.crpix[0],
                self.icd[2] * x + self.icd[3] * y + self.crpix[1])


# ---------- the MPC's positions ----------------------------------------------------

def mpc_lines(rd):
    path = os.path.join(MPC_CACHE, rd["mpc"])
    if not os.path.exists(path):
        desig = rd["mpc"][:-4].replace("_", " ")
        body = json.dumps({"desigs": [desig], "output_format": ["OBS80"]}).encode()
        req = urllib.request.Request(MPC_OBS, data=body, method="GET",
                                     headers={"Content-Type": "application/json", "User-Agent": UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.load(r)
        os.makedirs(MPC_CACHE, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write((d[0].get("OBS80") or "") if d else "")
    out = []
    windows = [(mjd_of(a), mjd_of(b)) for a, b in rd.get("mpc_windows", rd["windows"])]
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if len(line) < 80 or line[14] in "sSvVrRxX" or line[77:80] not in rd["codes"]:
                continue
            t = mjd(int(line[15:19]), int(line[20:22]), float(line[23:32]))
            if not any(a <= t <= b for a, b in windows):
                continue
            h, m, s = line[32:44].split()
            ra = 15 * (int(h) + int(m) / 60 + float(s) / 3600)
            ds = line[44:56].strip()
            d, m, s = ds.lstrip("+-").split()
            de = (-1 if ds[0] == "-" else 1) * (int(d) + int(m) / 60 + float(s) / 3600)
            out.append((t, ra, de, line))
    return out


def track_fit(lines):
    """Polynomial in time through the MPC positions; returns where(t) -> (ra, dec), the rms in arcsec, the degree."""
    t0 = sum(l[0] for l in lines) / len(lines)
    ra0, de0 = lines[0][1], lines[0][2]
    span = max(l[0] for l in lines) - min(l[0] for l in lines)
    deg = 2 if span > 1.0 and len(lines) >= 4 else 1
    rows = [[(l[0] - t0) ** k for k in range(deg + 1)] for l in lines]
    pts = [tan_project(l[1], l[2], ra0, de0) for l in lines]
    cx = lstsq(rows, [p[0] for p in pts])
    cy = lstsq(rows, [p[1] for p in pts])
    ev = lambda c, t: sum(ci * (t - t0) ** k for k, ci in enumerate(c))
    rms = math.sqrt(sum((ev(cx, l[0]) - p[0]) ** 2 + (ev(cy, l[0]) - p[1]) ** 2 for l, p in zip(lines, pts)) / len(lines))
    return (lambda t: tan_deproject(ev(cx, t), ev(cy, t), ra0, de0)), rms, deg


# ---------- the archives -------------------------------------------------------------

class Frame:
    """One exposure: its pixels near the object, WCS, mid-exposure time and provenance."""


def noirlab_frames(rd, where):
    """DECam InstCal CCDs that hold the object, one per exposure, from the NOIRLab archive."""
    frames = []
    for a, b in rd["windows"]:
        ta, tb = mjd_of(a), mjd_of(b)
        ra, de = where((ta + tb) / 2)
        caldat = "%04d-%02d-%02d" % calendar((ta + tb) / 2 - 0.5)[:3]
        q = urllib.parse.urlencode({"POS": f"{ra:.5f},{de:.5f}", "SIZE": 0.004, "VERB": 3, "limit": 0, "format": "json",
                                    "instrument": "decam", "proc_type": "instcal", "prod_type": "image", "caldat": caldat})
        path = os.path.join(CACHE, "noirlab", f"sia_{rd['id']}_{caldat}.json")
        rows = json.loads(cached(path, f"{SIA_HDU}?{q}"))[1:]
        if not rows:
            # Some nights' CCDs are missing from the archive's HDU table though their files are public:
            # search whole exposures (by their centres, so a box the camera's size) and find the CCD
            # from the headers below.
            q = urllib.parse.urlencode({"POS": f"{ra:.5f},{de:.5f}", "SIZE": 2.4, "VERB": 3, "limit": 0, "format": "json",
                                        "instrument": "decam", "proc_type": "instcal", "prod_type": "image", "caldat": caldat})
            path = os.path.join(CACHE, "noirlab", f"sia_img_{rd['id']}_{caldat}.json")
            rows = [dict(r, hdu_idx=None) for r in json.loads(cached(path, f"{SIA_IMG}?{q}"))[1:]]
        by_exp = defaultdict(list)
        for r in rows:
            if (r["filter"] or "").split()[:1] != [rd["filter"]] or (r["exposure"] or 0) < rd["min_exp"]:
                continue
            t = mjd_of(r["file_dateobs"][:19])
            if ta <= t <= tb:
                by_exp[r["file_dateobs"][:19]].append(r)
        for _, rs in sorted(by_exp.items()):
            # one version per exposure: the community pipeline's own (v), then a, then the rest
            rank = lambda r: next((k for k, p in enumerate(("_v", "_a", "_ls", "_d")) if p in r["archive_filename"].split("/")[-1][-14:]), 9)
            r = min(rs, key=rank)
            frames.append(r)
    out = []
    for r in frames:
        name = r["archive_filename"].split("/")[-1]
        f = None
        if r["hdu_idx"] is None:
            tries = [ccd_holding(r, where)]
            if tries[0] is None:
                print(f"    {name}: no CCD holds the object")
                continue
        else:
            tries = (r["hdu_idx"] + 1, r["hdu_idx"])    # the SIA index counts extensions from 0
        for hdu in tries:
            path = os.path.join(CACHE, "noirlab", f"{name[:-8]}_hdu{hdu}.fits")
            data = cached(path, RETRIEVE.format(md5=r["md5sum"], hdu=hdu))
            hdus = read_hdus(data)
            prim, ext = hdus[0][0], hdus[1]
            w = WCS(ext[0])
            mid = mjd_of(prim["DATE-OBS"]) + prim["EXPTIME"] / 2 / 86400
            x, y = w.sky2pix(*where(mid))
            if 0.5 <= x <= ext[0]["ZNAXIS1"] + 0.5 and 0.5 <= y <= ext[0]["ZNAXIS2"] + 0.5:
                f = Frame()
                f.name, f.hdu, f.md5 = name, hdu, r["md5sum"]
                f.url = RETRIEVE.format(md5=r["md5sum"], hdu=hdu)
                f.wcs, f.mid, f.exptime = w, mid, prim["EXPTIME"]
                f.filter = r["filter"].split()[0]
                f.nx, f.ny = ext[0]["ZNAXIS1"], ext[0]["ZNAXIS2"]
                f.saturate = ext[0].get("SATURATE") or 4e4
                f.prop, f.pi = prim.get("PROPID", r["proposal"]), (prim.get("PROPOSER") or "").strip()
                f.release = r["file_release_date"]
                f.ccd = ext[0].get("EXTNAME", "")
                rice = Rice(data, ext)
                f.read = lambda x0, x1, y0, y1, rice=rice: rice.region(x0, x1, y0, y1)
                break
            print(f"    {name}: hdu {hdu} does not hold the object, trying the next")
        if f is None:
            print(f"    {name}: object on no fetched CCD, skipped")
            continue
        out.append(f)
    return out


def ccd_holding(r, where):
    """Which extension of a DECam file holds the object: every CCD's WCS from the archive's header listing."""
    path = os.path.join(CACHE, "noirlab", f"header_{r['md5sum']}.html")
    text = cached(path, f"https://astroarchive.noirlab.edu/api/header/{r['md5sum']}/").decode("utf-8", "replace")
    hdus, cur = [], None
    for k, v in re.findall(r"<th><b>([^<]*)</b></th>\s*<td>([^<]*)</td>", text):
        if k in ("SIMPLE", "XTENSION"):
            cur = {}
            hdus.append((k, cur))
        if cur is not None:
            v = v.strip()
            for cast in (int, float):
                try:
                    v = cast(v)
                    break
                except ValueError:
                    pass
            cur[k] = v
    t = mjd_of(r["file_dateobs"][:19])
    exts = [h for kind, h in hdus if kind == "XTENSION" or "CRPIX1" in h]
    ra, de = where(t)
    for i, h in enumerate(exts):
        if "CRPIX1" not in h or "CD1_1" not in h:
            continue
        x, y = WCS(h).sky2pix(ra, de)
        if 1 <= x <= h.get("ZNAXIS1", h.get("NAXIS1", 2046)) and 1 <= y <= h.get("ZNAXIS2", h.get("NAXIS2", 4094)):
            return i + 1                                 # the listing leaves out the primary header
    return None


def ssois_rows(desig, a, b):
    t0, t1 = calendar(mjd_of(a) - 1), calendar(mjd_of(b) + 1)
    q = urllib.parse.urlencode({"lang": "en", "object": desig, "search": "bynameall",
                                "epoch1": "%04d %02d %02d" % t0[:3], "epoch2": "%04d %02d %02d" % t1[:3],
                                "eellipse": "", "eunits": "arcseconds", "extres": "yes", "xyres": "yes", "format": "tsv"})
    path = os.path.join(CACHE, "cadc", f"ssois_{desig.replace(' ', '_')}_{a[:10]}.tsv")
    text = cached(path, f"{SSOIS}?{q}").decode("utf-8", "replace")
    return [l.split("\t") for l in text.splitlines()[1:] if l.count("\t") >= 10], SSOIS_PAGE + "?" + q.replace("&format=tsv", "")


def cadc_frames(rd, where, half_arcsec):
    """MegaCam cutouts round the object from CADC, one per exposure."""
    out = []
    for a, b in rd["windows"]:
        ta, tb = mjd_of(a), mjd_of(b)
        rows, rd["_search"] = ssois_rows(rd["desig"], a, b)
        for p in rows:
            img, ext, x, y, t, filt, exp, ora, ode, target, tel = p[:11]
            name = img.split()[0]
            if "MegaCam" not in tel or not name.endswith("p") or filt != rd["filter"] or float(exp) < rd["min_exp"]:
                continue
            if not ta <= float(t) <= tb or ext == "-9999":
                continue
            ext, x, y = int(ext), float(x), float(y)
            r = int(half_arcsec / 0.187) + 40
            x0, x1 = max(1, int(x - r)), min(2048, int(x + r))
            y0, y1 = max(1, int(y - r)), min(4612, int(y + r))
            url = CADC_CUT.format(file=name, ext=ext, x0=x0, x1=x1, y0=y0, y1=y1)
            path = os.path.join(CACHE, "cadc", f"{name}_{ext}_{x0}_{x1}_{y0}_{y1}.fits")
            data = cached(path, url.replace("[", "%5B").replace("]", "%5D"))
            hdus = read_hdus(data)
            h = hdus[0][0]
            f = Frame()
            f.name, f.hdu, f.url = name, ext, url
            f.wcs = WCS(h)
            # The Elixir header WCS is the telescope's pointing, off by tens of arcseconds; SSOIS's own
            # astrometry of the frame puts its ephemeris position at (x, y). Shift the WCS to agree, then
            # the catalogue fit below does the rest.
            px, py = f.wcs.sky2pix(float(ora), float(ode))
            f.wcs.crpix = (f.wcs.crpix[0] + (x - x0 + 1) - px, f.wcs.crpix[1] + (y - y0 + 1) - py)
            f.mid = h["MJD-OBS"] + h["EXPTIME"] / 2 / 86400
            f.exptime, f.filter = h["EXPTIME"], h.get("FILTER", filt)
            f.nx, f.ny = h["NAXIS1"], h["NAXIS2"]
            f.saturate = h.get("SATURATE", 6e4)
            f.prop, f.pi = h.get("RUNID", "").strip(), h.get("PI_NAME", "").strip()
            f.release = h.get("REL_DATE", "")[:10]
            f.ccd = h.get("EXTNAME", "")
            pix = plain_image(data, hdus[0])
            nx = f.nx
            # MegaCam reads each CCD through two amplifiers (columns 1-1024 and 1025-2048), and the Elixir
            # images keep a small step in sky level between the halves: level the right half to the left.
            split = 1024 - (x0 - 1)
            if 24 <= split <= nx - 24:
                ny = f.ny
                left = [pix[r * nx + c] for r in range(0, ny, 3) for c in range(split - 24, split)]
                right = [pix[r * nx + c] for r in range(0, ny, 3) for c in range(split, split + 24)]
                step = median(right) - median(left)
                for r in range(ny):
                    for c in range(split, nx):
                        pix[r * nx + c] -= step
            f.read = lambda x0, x1, y0, y1, pix=pix, nx=nx: array("f", (v for r in range(y0, y1) for v in pix[r * nx + x0:r * nx + x1]))
            out.append(f)
    out.sort(key=lambda f: f.mid)
    return out


def gaia(ra, de, radius, epoch_mjd):
    """Gaia DR3 stars (G < 20.7) in a circle, moved to the epoch by their proper motions."""
    q = (f"SELECT ra, dec, pmra, pmdec, phot_g_mean_mag FROM gaiadr3.gaia_source WHERE phot_g_mean_mag < 20.7 AND "
         f"CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra:.6f}, {de:.6f}, {radius:.5f})) = 1")
    path = os.path.join(CACHE, "gaia", f"gaia_{ra:.4f}_{de:+.4f}_{radius:.4f}.csv")
    body = urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": q}).encode()
    text = cached(path, GAIA_TAP, data=body).decode()
    years = (epoch_mjd - 57388.0) / 365.25           # Gaia DR3 epoch J2016.0 = MJD 57388
    out = []
    for line in text.splitlines()[1:]:
        r, d, pr, pd, g = (line.split(",") + [""] * 5)[:5]
        r, d = float(r), float(d)
        if pr and pd:
            d += float(pd) * years / 3.6e6
            r += float(pr) * years / 3.6e6 / math.cos(math.radians(d))
        out.append((r, d, float(g) if g else 99))
    return out


def ps1(ra, de, radius):
    """Pan-STARRS1 DR2 mean positions (sources seen more than five times) in a circle, from MAST."""
    q = urllib.parse.urlencode({"ra": f"{ra:.6f}", "dec": f"{de:.6f}", "radius": f"{radius:.5f}", "nDetections.gt": 5,
                                "columns": "[raMean,decMean,rMeanPSFMag]", "pagesize": 50000})
    path = os.path.join(CACHE, "ps1", f"ps1_{ra:.4f}_{de:+.4f}_{radius:.4f}.csv")
    text = cached(path, f"{PS1_CAT}?{q}").decode()
    out = []
    for line in text.splitlines()[1:]:
        r, d, m = (line.split(",") + ["", "", ""])[:3]
        if r and d:
            out.append((float(r), float(d), float(m) if m else 99))
    return out


def calibrate(ref, found, s):
    """Match catalogue stars (grid pixels from the nominal astrometry) to stars found in the median frame:
    a vote on the shift, then two rounds of fit and re-match. Returns (affine, rms px, n, pairs) or None."""
    pairs = match(ref, found, search=20 / s, tol=5.0)
    if len(pairs) < 3:
        return None
    dx = median([found[j][0] - ref[i][0] for i, j in pairs])
    dy = median([found[j][1] - ref[i][1] for i, j in pairs])
    C = (1, 0, dx, 0, 1, dy)
    for tol in (3.0, 1.5, 1.5):
        pairs, used = [], set()
        for i, (x, y, *_) in enumerate(ref):
            u, v = apply(C, x, y)
            best = min(((math.hypot(fx - u, fy - v), j) for j, (fx, fy, *_) in enumerate(found) if j not in used), default=None)
            if best and best[0] < tol:
                used.add(best[1])
                pairs.append((i, best[1]))
        if len(pairs) < 6:
            return (C, 0.0, len(pairs), pairs) if pairs else None
        C, rms, n = fit_affine([ref[i][:2] for i, _ in pairs], [found[j][:2] for _, j in pairs])
    return C, rms, n, pairs


# ---------- pixels -----------------------------------------------------------------

def robust(vals):
    """Median and sigma (from the median absolute deviation) of a sample."""
    m = median(vals)
    return m, 1.4826 * median([abs(v - m) for v in vals])


def find_stars(a, w, h, valid, sky, sig, rcen, satur=None, nsig=6.0):
    """Centroids, fluxes and peaks of compact sources well above the sky."""
    thr, lo = sky + nsig * sig, sky + 2.0 * sig
    out = []
    b = 2 * rcen + 3
    for i in (i for i, v in enumerate(a) if v > thr):
        x, y = i % w, i // w
        if x < b or y < b or x >= w - b or y >= h - b or not valid[i]:
            continue
        v = a[i]
        if any(a[(y + dy) * w + x + dx] > v or (a[(y + dy) * w + x + dx] == v and (dy, dx) < (0, 0))
               for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2) if dx or dy):
            continue
        if sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dx or dy) and a[(y + dy) * w + x + dx] > lo) < 7:
            continue                                   # a cosmic ray or hot pixel, not a star
        cx, cy = x + 0.5, y + 0.5
        for _ in range(3):
            sw = sx = sy = 0.0
            ix, iy = int(cx), int(cy)
            for yy in range(iy - rcen, iy + rcen + 1):
                for xx in range(ix - rcen, ix + rcen + 1):
                    if (xx + 0.5 - cx) ** 2 + (yy + 0.5 - cy) ** 2 <= rcen * rcen:
                        q = a[yy * w + xx] - sky
                        if q > 0:
                            sw += q
                            sx += q * (xx + 0.5)
                            sy += q * (yy + 0.5)
            if sw <= 0:
                break
            cx, cy = sx / sw, sy / sw
            if abs(cx - x - 0.5) > rcen or abs(cy - y - 0.5) > rcen:
                break                                  # pulled away by a neighbour: keep the last good centroid
        if abs(cx - x - 0.5) > rcen or abs(cy - y - 0.5) > rcen:
            continue
        out.append((cx, cy, sw, v, satur is not None and v > satur))
    out.sort(key=lambda s: -s[2])
    kept = []
    for s in out:
        if all((s[0] - k[0]) ** 2 + (s[1] - k[1]) ** 2 > (rcen * 1.5) ** 2 for k in kept):
            kept.append(s)
    return kept


def match(a, b, search, tol):
    """Pairs (i, j) of a and b after the integer shift most of them agree on (within search px)."""
    votes = Counter()
    for ax, ay, *_ in a:
        for bx, by, *_ in b:
            dx, dy = bx - ax, by - ay
            if abs(dx) < search and abs(dy) < search:
                votes[(round(dx), round(dy))] += 1
    if not votes:
        return []
    near = lambda d: sum(votes.get((d[0] + i, d[1] + j), 0) for i in (-1, 0, 1) for j in (-1, 0, 1))
    best = max(votes, key=near)
    pairs, used = [], set()
    for i, (ax, ay, *_) in enumerate(a):
        cand = [(math.hypot(bx - ax - best[0], by - ay - best[1]), j) for j, (bx, by, *_) in enumerate(b)
                if abs(bx - ax - best[0]) <= tol and abs(by - ay - best[1]) <= tol and j not in used]
        if cand:
            j = min(cand)[1]
            used.add(j)
            pairs.append((i, j))
    return pairs


def clean_cosmics(a, w, h, nsig=5.0, sharp=0.6):
    """Replace cosmic-ray hits in a native-pixel image, in place. A hit stands well above the sky and far
    above the median of its eight neighbours (a star's neighbours, a seeing disc away from sharp, carry most
    of its peak). Hit pixels and their neighbours take the median of the ring round them. Returns the count."""
    sky, sig = robust([a[i] for i in range(0, len(a), 41)])
    total = 0
    for _ in range(3):                                   # tracks are found from their ends inwards
        thr = sky + nsig * sig
        hits = []
        for i in (i for i, v in enumerate(a) if v > thr):
            x, y = i % w, i // w
            if x < 3 or y < 3 or x >= w - 3 or y >= h - 3:
                continue
            nb = sorted((a[i - w - 1], a[i - w], a[i - w + 1], a[i - 1], a[i + 1], a[i + w - 1], a[i + w], a[i + w + 1]))
            if a[i] - 0.5 * (nb[3] + nb[4]) > sharp * (a[i] - sky):
                hits.append(i)
        if not hits:
            break
        bad = {j for i in hits for j in (i - w - 1, i - w, i - w + 1, i - 1, i, i + 1, i + w - 1, i + w, i + w + 1)}
        for i in bad:
            ring = [a[i + dy * w + dx] for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2)
                    if max(abs(dx), abs(dy)) == 2 and i + dy * w + dx not in bad]
            a[i] = median(ring) if ring else sky
        total += len(hits)
    return total


def flatten(a, w, h, mesh=30):
    """Subtract a smooth background: the clipped median in meshes of MESH pixels, median-filtered and
    interpolated. Smoothing for display lowers the noise several times, and would otherwise turn sky
    steps far below the noise (amplifier halves, flat-field residuals) into visible patches."""
    m0, sg = robust([a[i] for i in range(0, len(a), 13)])
    nxm, nym = (w + mesh - 1) // mesh, (h + mesh - 1) // mesh
    grid = []
    for j in range(nym):
        for i in range(nxm):
            vals = [a[y * w + x] for y in range(j * mesh, min(h, (j + 1) * mesh), 2)
                    for x in range(i * mesh, min(w, (i + 1) * mesh), 2) if abs(a[y * w + x] - m0) < 3 * sg]
            grid.append(median(vals) if len(vals) > 20 else m0)
    filt = array("f", (median([grid[jj * nxm + ii] for jj in range(max(0, j - 1), min(nym, j + 2))
                               for ii in range(max(0, i - 1), min(nxm, i + 2))])
                       for j in range(nym) for i in range(nxm)))
    bg = from_image(to_image(filt, nxm, nym).resize((nxm * mesh, nym * mesh), Image.BILINEAR).crop((0, 0, w, h)))
    return array("f", (v - b for v, b in zip(a, bg)))


def destripe(a, w, h, span=31):
    """Take out column-level offsets in place (bad columns, amplifier seams): each column's clipped median,
    less the running median of the columns round it, is subtracted from that column."""
    m0, sg = robust([a[i] for i in range(0, len(a), 17)])
    col = []
    for x in range(w):
        vals = [a[y * w + x] for y in range(0, h, 3) if abs(a[y * w + x] - m0) < 3 * sg]
        col.append(median(vals) if len(vals) > 10 else m0)
    half = span // 2
    for x in range(w):
        off = col[x] - median(col[max(0, x - half):x + half + 1])
        if off:
            for y in range(h):
                a[y * w + x] -= off


def gauss(a, w, h, sigma):
    """Separable Gaussian smoothing of a float image (edges reflected)."""
    if sigma < 0.3:
        return a
    r = max(1, int(3 * sigma + 0.5))
    k = [math.exp(-0.5 * (i / sigma) ** 2) for i in range(-r, r + 1)]
    t = sum(k)
    k = [v / t for v in k]

    def line(v):
        n = len(v)
        pad = v[r:0:-1] + v + v[n - 2:n - r - 2:-1]
        out = [0.0] * n
        for j, kj in enumerate(k):
            seg = pad[j:j + n]
            out = [o + kj * x for o, x in zip(out, seg)]
        return out

    rows = [line(list(a[y * w:(y + 1) * w])) for y in range(h)]
    cols = [line([rows[y][x] for y in range(h)]) for x in range(w)]
    return array("f", (cols[x][y] for y in range(h) for x in range(w)))


def to_image(a, w, h):
    return Image.frombytes("F", (w, h), a.tobytes())


def from_image(im):
    return array("f", im.tobytes())


# ---------- one round -----------------------------------------------------------------

def build(rd, debug):
    print(f"\n== {rd['id']}: {rd['object']}")
    lines = mpc_lines(rd)
    if len(lines) < 2:
        return None, f"only {len(lines)} MPC positions in the window"
    where, fit_rms, deg = track_fit(lines)
    print(f"   MPC: {len(lines)} positions from {sorted({l[3][77:80] for l in lines})}, "
          f"degree {deg} fit, rms {fit_rms:.2f}\"")

    W, H = SIZE
    s = rd["scale"]
    Wb, Hb = W + 2 * MARGIN, H + 2 * MARGIN
    half = math.hypot(Wb, Hb) / 2 * s
    if rd["archive"] == "noirlab":
        frames = noirlab_frames(rd, where)
    else:
        frames = cadc_frames(rd, where, half + 10)
    frames = [f for f in frames if not any(f.name.startswith(x) for x in rd.get("drop", []))]
    # Frames: single exposures, or (stack = 2) the mean of two consecutive exposures taken within
    # STACK_GAP of each other, for objects too faint to follow in one exposure. An exposure left
    # without a partner is not used, so every frame has the same depth.
    if rd.get("stack", 1) == 2:
        groups, k = [], 0
        while k < len(frames) - 1:
            if (frames[k + 1].mid - frames[k].mid) * 1440 <= STACK_GAP:
                groups.append([k, k + 1])
                k += 2
            else:
                k += 1
    else:
        groups = [[k] for k in range(len(frames))]
    if len(groups) < 5:
        return None, f"only {len(groups)} usable frames in the archive"
    most = rd.get("max_frames", MAX_FRAMES)
    if len(groups) > most:                         # evenly spread through the list, first and last kept
        n = len(groups)
        groups = [groups[round(k * (n - 1) / (most - 1))] for k in range(most)]
    picked = [[frames[j] for j in g] for g in groups]
    frames = [f for g in picked for f in g]                  # the exposures used, in order
    groups, k = [], 0
    for g in picked:
        groups.append(list(range(k, k + len(g))))
        k += len(g)
    nf = len(groups)
    times = [sum(frames[j].mid for j in g) / len(g) for g in groups]
    track = [where(t) for t in times]

    # The grid: tangent point at the track's middle, which lands on PLACE in the saved frame.
    ra0, de0 = where((times[0] + times[-1]) / 2)
    u0, v0 = MARGIN + rd["place"][0] * W, MARGIN + rd["place"][1] * H
    to_grid = lambda ra, de: (lambda xi, eta: (u0 - xi / s, v0 - eta / s))(*tan_project(ra, de, ra0, de0))
    to_sky = lambda u, v: tan_deproject(-(u - u0) * s, -(v - v0) * s, ra0, de0)

    # Resample each exposure onto the grid through its header WCS.
    grid_pts = [(Wb * i / 6, Hb * j / 6) for i in range(7) for j in range(7)]
    images, masks, maps, n_cr = [], [], [], []
    for f in frames:
        pix = [f.wcs.sky2pix(*to_sky(u, v)) for u, v in grid_pts]
        x0 = max(0, int(min(p[0] for p in pix)) - 8)
        x1 = min(f.nx, int(max(p[0] for p in pix)) + 8)
        y0 = max(0, int(min(p[1] for p in pix)) - 8)
        y1 = min(f.ny, int(max(p[1] for p in pix)) + 8)
        A, res, _ = fit_affine(grid_pts, [(p[0] - 0.5 - x0, p[1] - 0.5 - y0) for p in pix], iters=1)
        if res > 0.15:
            print(f"    {f.name}: the WCS is not affine over the grid to {res:.2f} px")
        f.box = (x0, x1, y0, y1)
        reg = f.read(x0, x1, y0, y1)
        ncr = clean_cosmics(reg, x1 - x0, y1 - y0)
        destripe(reg, x1 - x0, y1 - y0)
        f.region = to_image(reg, x1 - x0, y1 - y0)
        n_cr.append(ncr)
        ones = Image.new("F", (x1 - x0 - 6, y1 - y0 - 6), 1.0)
        f.ones = Image.new("F", (x1 - x0, y1 - y0), 0.0)
        f.ones.paste(ones, (3, 3))
        maps.append(A)
    print(f"   cosmic-ray pixels replaced per exposure: {', '.join(str(n) for n in n_cr)}")
    rcen = max(3, round(1.0 / s))

    def resample(k, A):
        f = frames[k]
        im = from_image(f.region.transform((Wb, Hb), Image.AFFINE, A, resample=Image.BICUBIC))
        mk = from_image(f.ones.transform((Wb, Hb), Image.AFFINE, A, resample=Image.NEAREST))
        return im, mk

    def stars_of(im, mk, satur):
        sample = [im[i] for i in range(0, len(im), 37) if mk[i]]
        sky, sig = robust(sample)
        return find_stars(im, Wb, Hb, mk, sky, sig, rcen, satur * 0.6), sky, sig

    for k in range(len(frames)):
        im, mk = resample(k, maps[k])
        images.append(im)
        masks.append(mk)

    # Align every frame on the first frame's stars.
    ref_stars, _, _ = stars_of(images[0], masks[0], frames[0].saturate)
    ref_stars = [st for st in ref_stars if not st[4]][:400]
    align = []
    for k in range(1, len(frames)):
        st, _, _ = stars_of(images[k], masks[k], frames[k].saturate)
        st = [x for x in st if not x[4]][:400]
        pairs = match(ref_stars, st, search=40, tol=2.5)
        if len(pairs) < 5:
            return None, f"{frames[k].name}: only {len(pairs)} stars in common with the first frame"
        if len(pairs) >= 10:
            T, rms, n = fit_affine([ref_stars[i][:2] for i, _ in pairs], [st[j][:2] for _, j in pairs])
        else:                                      # few stars: a shift only (same CCD, same optics)
            dx = median([st[j][0] - ref_stars[i][0] for i, j in pairs])
            dy = median([st[j][1] - ref_stars[i][1] for i, j in pairs])
            T, rms, n = (1, 0, dx, 0, 1, dy), 0.0, len(pairs)
        maps[k] = compose(maps[k], T)
        images[k], masks[k] = resample(k, maps[k])
        st2, _, _ = stars_of(images[k], masks[k], frames[k].saturate)
        pairs2 = match(ref_stars, [x for x in st2 if not x[4]][:400], search=3, tol=1.5)
        st2 = [x for x in st2 if not x[4]][:400]
        d = [math.hypot(st2[j][0] - ref_stars[i][0], st2[j][1] - ref_stars[i][1]) for i, j in pairs2]
        align.append((n, rms, median(d)))
    print("   alignment: " + ", ".join(f"{n}*{m:.2f}px" for n, _, m in align) + " (stars matched * median residual)")

    # The saved frame must have data in every frame: if the CCD's edge cuts it at PLACE, slide it (within
    # the margin) to the nearest spot that is clear and still keeps the track 15% from every edge.
    allmask = array("f", (min(col) for col in zip(*masks)))
    tr = [to_grid(ra, de) for ra, de in track]
    def clear(ox, oy):
        if not all(ox + 0.15 * W <= u <= ox + 0.85 * W and oy + 0.15 * H <= v <= oy + 0.85 * H for u, v in tr):
            return False
        edges = all(allmask[oy * Wb + x] and allmask[(oy + H - 1) * Wb + x] for x in range(ox, ox + W)) and \
            all(allmask[y * Wb + ox] and allmask[y * Wb + ox + W - 1] for y in range(oy, oy + H))
        return edges and all(allmask[y * Wb + x] for y in range(oy, oy + H, 5) for x in range(ox, ox + W, 5))
    spots = sorted(((dx, dy) for dx in range(-MARGIN + 10, MARGIN - 9, 10) for dy in range(-MARGIN + 10, MARGIN - 9, 10)),
                   key=lambda d: d[0] ** 2 + d[1] ** 2)
    spot = next((d for d in spots if clear(MARGIN + d[0], MARGIN + d[1])), None)
    if spot is None:
        uc, vc = int(sum(u for u, _ in tr) / len(tr)), int(sum(v for _, v in tr) / len(tr))
        row = [x for x in range(Wb) if allmask[vc * Wb + x]]
        col = [y for y in range(Hb) if allmask[y * Wb + uc]]
        return None, (f"no placement of the saved frame lies on the CCD in every exposure (through the track's middle "
                      f"({uc}, {vc}) the exposures share x {row[0] if row else '-'} to {row[-1] if row else '-'}, "
                      f"y {col[0] if col else '-'} to {col[-1] if col else '-'})")
    crop = (MARGIN + spot[0], MARGIN + spot[1], MARGIN + spot[0] + W, MARGIN + spot[1] + H)
    if spot != (0, 0):
        print(f"   the CCD edge moved the saved frame by {spot} px from PLACE")

    # Photometric scale and sky of every frame, from stars matched to the first frame.
    skies, ratios, sigs = [], [], []
    for k in range(len(frames)):
        st, sky, sig = stars_of(images[k], masks[k], frames[k].saturate)
        st = [x for x in st if not x[4]]
        pairs = match(ref_stars, st, search=2, tol=1.0)
        r = [st[j][2] / ref_stars[i][2] for i, j in pairs if ref_stars[i][2] > 0]
        skies.append(sky)
        sigs.append(sig)
        ratios.append(median(r) if r else 1.0)
    norm = [array("f", ((v - skies[k]) / ratios[k] for v in images[k])) for k in range(len(frames))]
    print("   flux scale: " + ", ".join(f"{r:.2f}" for r in ratios))
    if any(len(g) > 1 for g in groups):          # stacked frames: the mean of their exposures
        norm = [array("f", (sum(col) / len(col) for col in zip(*(norm[j] for j in g)))) for g in groups]

    # Median of the frames, then astrometry against Gaia DR3.
    med = array("f", (median(col) for col in zip(*norm)))
    msky, msig = robust([med[i] for i in range(0, len(med), 37) if allmask[i]])
    mstars = [x for x in find_stars(med, Wb, Hb, allmask, msky, msig, rcen, frames[0].saturate * 0.6 - skies[0]) if not x[4]]
    epoch = (times[0] + times[-1]) / 2
    on_grid = lambda cat: [p for p in (to_grid(r, d) for r, d, _ in cat)
                           if 0 <= p[0] < Wb and 0 <= p[1] < Hb and allmask[int(p[1]) * Wb + int(p[0])]]
    refcat = "Gaia DR3"
    gpix = on_grid(gaia(ra0, de0, half / 3600 * 1.05, epoch))
    cal = calibrate(gpix, mstars, s)
    if not cal or cal[2] < 8:
        # too few Gaia stars on the CCD: Pan-STARRS1 DR2, whose astrometry is tied to Gaia, goes deeper
        print(f"   Gaia: {cal[2] if cal else 0} of {len(gpix)} stars on the grid matched; using Pan-STARRS1 DR2")
        refcat = "Pan-STARRS1 DR2"
        gpix = on_grid(ps1(ra0, de0, half / 3600 * 1.05))
        cal = calibrate(gpix, mstars, s)
    if not cal or cal[2] < 8:
        return None, f"only {cal[2] if cal else 0} catalogue stars matched (of {len(gpix)} on the grid)"
    C, grms, gn, pairs = cal
    shift = apply(C, u0, v0)
    print(f"   {refcat}: {gn} of {len(gpix)} stars on the grid matched, rms {grms:.2f} px = {grms * s:.2f}\"; "
          f"header WCS off by {(shift[0] - u0) * s:+.2f}\", {(shift[1] - v0) * s:+.2f}\"")

    # The object in every frame: MPC position -> grid -> Gaia correction -> saved pixels.
    pos = [apply(C, *to_grid(ra, de)) for ra, de in track]
    positions = [[round(u - crop[0], 1), round(v - crop[1], 1)] for u, v in pos]
    steps = [math.hypot(positions[i][0] - positions[i - 1][0], positions[i][1] - positions[i - 1][1]) for i in range(1, len(positions))]
    span = math.hypot(positions[-1][0] - positions[0][0], positions[-1][1] - positions[0][1])
    xs, ys = [p[0] for p in positions], [p[1] for p in positions]
    if min(xs) < 0.15 * W or max(xs) > 0.85 * W or min(ys) < 0.15 * H or max(ys) > 0.85 * H:
        print("   NOTE: the track comes within 15% of the frame's edge")

    # Check against the pixels: frame minus median, smoothed with a box about the seeing's size; the peak
    # of that near each computed position, its centroid, and its significance against the same box sum
    # placed at random across the frame.
    checks = []
    R = max(6, round(1.6 / s))
    hb = max(1, round(0.55 / s))
    rng = __import__("random").Random(1)
    fwhm = 1.2 / s
    fars = []
    for k, (u, v) in enumerate(pos):
        # the static sky for this frame: the median of the frames where the object is well away
        far = [j for j, (uj, vj) in enumerate(pos) if math.hypot(uj - u, vj - v) > 2.5 * fwhm]
        if len(far) < 2:
            far = list(range(nf))
        fars.append(far)
        diff = lambda x, y, far=far, k=k: norm[k][y * Wb + x] - median([norm[j][y * Wb + x] for j in far])
        box = lambda x, y: sum(diff(x + dx, y + dy) for dy in range(-hb, hb + 1) for dx in range(-hb, hb + 1))
        noise = robust([box(rng.randrange(crop[0] + hb, crop[2] - hb), rng.randrange(crop[1] + hb, crop[3] - hb))
                        for _ in range(500)])[1]
        best = None
        for y in range(int(v) - R, int(v) + R + 1):
            for x in range(int(u) - R, int(u) + R + 1):
                if (x + 0.5 - u) ** 2 + (y + 0.5 - v) ** 2 <= R * R:
                    q = box(x, y)
                    if best is None or q > best[0]:
                        best = (q, x, y)
        q, bx, by = best
        sw = sx = sy = 0.0
        r2 = (2 * hb + 1) ** 2
        for y in range(by - 2 * hb - 1, by + 2 * hb + 2):
            for x in range(bx - 2 * hb - 1, bx + 2 * hb + 2):
                dd = diff(x, y)
                if dd > 0 and (x - bx) ** 2 + (y - by) ** 2 <= r2:
                    sw += dd
                    sx += dd * (x + 0.5)
                    sy += dd * (y + 0.5)
        mx, my = (sx / sw, sy / sw) if sw else (bx + 0.5, by + 0.5)
        checks.append((mx - u, my - v, q / noise if noise else 0))
    off = [math.hypot(c[0], c[1]) for c in checks]
    print("   measured - computed (px): " + ", ".join(f"{c[0]:+.1f},{c[1]:+.1f}" for c in checks))
    print("   residual peak S/N: " + ", ".join(f"{c[2]:.1f}" for c in checks))
    print(f"   median offset {median(off):.2f} px; steps " + ", ".join(f"{d:.1f}" for d in steps) + f" px; end to end {span:.1f} px")

    # One stretch for the round. Each frame is smoothed a little (a Gaussian of SMOOTH arcsec, well
    # under the seeing) so a faint source reads as a dot rather than as a clump of noise; the first
    # frame's smoothed sky noise is the unit of the stretch.
    sm = [gauss(flatten(from_image(to_image(norm[k], Wb, Hb).crop(crop)), W, H), W, H, rd.get("smooth", SMOOTH) / s)
          for k in range(nf)]
    unit = robust([sm[0][i] for i in range(0, W * H, 29)])[1]
    top = math.asinh((WHITE - BLACK) / KNEE)
    lut = lambda x: max(0, min(255, round(255 * math.asinh(max(0.0, x / unit - BLACK) / KNEE) / top)))
    files, saved = [], []
    for k in range(nf):
        g = Image.frombytes("L", (W, H), bytes(lut(v) for v in sm[k]))
        name = f"{rd['id']}-{k + 1}.jpg"
        g.save(os.path.join(OUT, name), "JPEG", quality=QUALITY, optimize=True, progressive=True)
        files.append(name)
        saved.append(g)

    if debug:
        os.makedirs(DEBUG_DIR, exist_ok=True)
        medim = Image.frombytes("L", (W, H), bytes(lut(v) for v in from_image(to_image(med, Wb, Hb).crop(crop)))).convert("RGB")
        dr = ImageDraw.Draw(medim)
        for k, (x, y) in enumerate(positions):
            dr.ellipse([x - 9, y - 9, x + 9, y + 9], outline=(255, 80, 80))
        for (gx, gy), (i, j) in ((gpix[i], (i, j)) for i, j in pairs):
            gx, gy = apply(C, gx, gy)
            dr.rectangle([gx - crop[0] - 4, gy - crop[1] - 4, gx - crop[0] + 4, gy - crop[1] + 4], outline=(80, 200, 255))
        medim.save(os.path.join(DEBUG_DIR, f"{rd['id']}_median.png"))
        # each frame near the track, and its residual, with the computed position circled
        cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
        half_w = max(60, int(max(max(xs) - min(xs), max(ys) - min(ys)) / 2) + 40)
        box = (int(cx - half_w), int(cy - half_w), int(cx + half_w), int(cy + half_w))
        tiles = []
        zoom = 2 if half_w < 110 else 1
        lin = lambda x: max(0, min(255, round(255 * (x / unit + 3) / 11)))
        for k in range(nf):
            a = saved[k].crop(box)
            bw, bh = box[2] - box[0], box[3] - box[1]
            d = Image.frombytes("L", (bw, bh), bytes(
                lin(norm[k][(y + crop[1]) * Wb + x + crop[0]] - median([norm[j][(y + crop[1]) * Wb + x + crop[0]] for j in fars[k]]))
                if 0 <= x < W and 0 <= y < H else 0
                for y in range(box[1], box[3]) for x in range(box[0], box[2])))
            pair = []
            for t in (a, d):
                t = t.resize((t.size[0] * zoom, t.size[1] * zoom), Image.NEAREST).convert("RGB")
                px, py = (positions[k][0] - box[0]) * zoom, (positions[k][1] - box[1]) * zoom
                mx, my = px + checks[k][0] * zoom, py + checks[k][1] * zoom
                dr = ImageDraw.Draw(t)
                dr.ellipse([px - 12 * zoom, py - 12 * zoom, px + 12 * zoom, py + 12 * zoom], outline=(255, 80, 80))
                dr.line([mx - 4, my, mx + 4, my], fill=(80, 255, 120))
                dr.line([mx, my - 4, mx, my + 4], fill=(80, 255, 120))
                pair.append(t)
            tiles.append(tuple(pair))
        tw = tiles[0][0].size[0] + 4
        cols = min(5, len(tiles))
        nrow = (len(tiles) + cols - 1) // cols
        sheet = Image.new("RGB", (tw * cols, tw * 2 * nrow), (90, 90, 90))
        for k, (a, d) in enumerate(tiles):
            sheet.paste(a, ((k % cols) * tw, (k // cols) * 2 * tw))
            sheet.paste(d, ((k % cols) * tw, (k // cols) * 2 * tw + tw))
        sheet.save(os.path.join(DEBUG_DIR, f"{rd['id']}_track.png"))

    f0 = frames[0]
    if rd["archive"] == "noirlab":
        pi = f"; PI {f0.pi}" if f0.pi else ""
        credit = f"DECam data via the Astro Data Archive at NSF NOIRLab (program {f0.prop}{', PI ' + f0.pi if f0.pi else ''}); NOIRLab/AURA/NSF"
        ack = ACK["noirlab"].format(prop=f0.prop, pi=pi)
        ack_url = ACK_URL["noirlab"]
        terms = TERMS["noirlab"].format(release=max(f.release for f in frames))
        source = f"https://astroarchive.noirlab.edu/api/header/{f0.md5}/"
        telescope = DECAM
    else:
        credit = f"CFHT MegaCam data via the Canadian Astronomy Data Centre (program {f0.prop}, PI {f0.pi}); NRC/CNRS/University of Hawaiʻi"
        ack, ack_url = ACK["cadc"], ACK_URL["cadc"]
        terms = TERMS["cadc"].format(release=max(f.release for f in frames))
        source = rd.get("_search", "")
        telescope = MEGACAM
    entry = {
        "id": rd["id"], "object": rd["object"], "date": date_words(times), "telescope": telescope,
        "files": files, "size": [W, H], "positions": positions, "times": [stamp(t) for t in times],
        "frames_are": ("the mean of two consecutive exposures (times are their midpoint)" if any(len(g) > 1 for g in groups)
                       else "single exposures"),
        "filter": f0.filter, "exposure_s": [round(sum(frames[j].exptime for j in g)) for g in groups],
        "credit": credit, "license": "public archive data", "license_url": ack_url, "terms": terms,
        "acknowledgement": ack, "source": source,
        "archive_files": [" + ".join(f"{frames[j].name}[{frames[j].hdu}]" for j in g) for g in groups],
        "positions_from": (f"{len(lines)} MPC positions of {rd['desig']} from observatory "
                           f"{'/'.join(sorted({l[3][77:80] for l in lines}))} (measured against "
                           f"{', '.join(sorted({CATALOGUES.get(l[3][71], repr(l[3][71])) for l in lines}))}), fitted with a "
                           f"degree-{deg} polynomial in time (rms {fit_rms:.2f}\"), through the frames' astrometry fitted "
                           f"to {gn} {refcat} stars (rms {grms * s:.2f}\")"),
        # the check: where the frame-minus-median residual peaks, relative to the computed position
        "check_offsets_px": [[round(c[0], 1), round(c[1], 1)] for c in checks],
        "check_median_px": round(median(off), 2),
    }
    print(f"   {len(files)} frames {W}x{H}, {s}\"/px, {telescope.split(',')[0]}, {entry['date']}")
    return entry, None


def main():
    debug = "--debug" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "game.json")
    old = {}
    if only and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            prev = json.load(f)
        old = {r["id"]: r for r in prev.get("rounds", [])}
    rounds, skipped = [], []
    for rd in ROUNDS:
        if only and rd["id"] not in only:
            if rd["id"] in old:
                rounds.append(old[rd["id"]])
            continue
        if rd.get("skip"):
            print(f"\n== {rd['id']}: SKIPPED: {rd['skip']}")
            skipped.append({"id": rd["id"], "object": rd["object"], "why": rd["skip"]})
            continue
        entry, why = build(rd, debug)
        if entry:
            rounds.append(entry)
        else:
            print(f"   SKIPPED: {why}")
            skipped.append({"id": rd["id"], "object": rd["object"], "why": why})
    # Objects of the earlier Commons-based game that could not be given a night of frames.
    skipped += NOT_POSSIBLE

    doc = {"_what": "Real exposures of distant solar-system objects for the find-the-moving-object game, fetched from the "
                    "telescope archives and aligned on the stars by scripts/fetch_game_sequences.py, with the object's "
                    "position in every frame computed from the Minor Planet Center's records and checked against the pixels.",
           "_positions": "Pixels in the saved frame: origin at the top-left corner, x right, y down, pixel centres at +0.5. "
                         "times are mid-exposure, UT.",
           "_fetched": time.strftime("%Y-%m-%d"), "rounds": rounds, "skipped": skipped}
    text = json.dumps(doc, indent=1, ensure_ascii=False)
    flat = lambda m: "[" + re.sub(r",\s+", ", ", m.group(1).strip()) + "]"
    text = re.sub(r"\[(\s+[^\[\]{}]*?)\s*\]", flat, text)
    text = re.sub(r"\[(\s+(?:\[[^\[\]]*\],?\s*)+)\]", flat, text)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text + "\n")
    lines = ["# Image credits for the moving-object game", "",
             "Every frame is cut by `scripts/fetch_game_sequences.py` from public archive data; credit, programme and",
             "release dates are read from the archives and the FITS headers, the acknowledgements copied from the",
             "archives' own pages. Positions come from the Minor Planet Center's observations.", ""]
    for c in rounds:
        lines.append(f"- `{'`, `'.join(c['files'])}` — {c['credit']} · {c['license']} ({c.get('terms', '')}) · {c['source']}")
        lines.append(f"  - {c['object']}, {c['date']}, {c['telescope']}; archive files: {', '.join(c.get('archive_files', []))}")
        lines.append(f"  - Acknowledgement ({c['license_url']}): {c.get('acknowledgement', '')}")
    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    # frames no round uses any more (an earlier run, or the old Commons rounds)
    used = {n for r in rounds for n in r["files"]}
    for n in os.listdir(OUT):
        if n.endswith(".jpg") and n not in used:
            os.remove(os.path.join(OUT, n))
            print(f"removed {n}")
    print(f"\n{len(rounds)} rounds, {len(skipped)} skipped -> {OUT}")


NOT_POSSIBLE = [
    {"id": "fe72", "object": "2014 FE72",
     "why": "its discovery night (26 March 2014) has only three DECam exposures; the archive's other nights with five "
            "or more in one filter (DECam, March 2016) last twenty minutes, in which it moves under three pixels, and the "
            "MPC has no positions from them"},
    {"id": "uz224", "object": "2014 UZ224",
     "why": "the Dark Energy Survey imaged it once or twice a night, each time in a different filter (21 October 2014: "
            "r, i, z, z), so no night has five exposures in one filter"},
]

if __name__ == "__main__":
    main()
