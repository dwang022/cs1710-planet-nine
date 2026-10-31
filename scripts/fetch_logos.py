#!/usr/bin/env python3
"""Fetch the organisation logos the site shows (the IAU's and JPL's) from
Wikimedia Commons and record their credits from the Commons API.

Writes public/logos/<id>.svg and public/logos/credits.json, which the credits
page reads. A logo marked `mono` also gets public/logos/<id>-mono.svg, made
from the downloaded file: one colour for a dark page, holes kept as holes, the
viewBox cropped to the artwork. Stdlib only: `python -P scripts/fetch_logos.py`.
"""
import json, math, os, re, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "logos")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"

LOGOS = [
    {"id": "iau", "commons": "File:IAU logo.svg", "what": "International Astronomical Union logo",
     "shown": "setting/planets.html, beside the definition of a planet"},
    # The red "JPL" wordmark over "Jet Propulsion Laboratory / California Institute of
    # Technology". Commons also has the NASA-meatball lockup (File:NASA JPL meatball logo.svg),
    # but NASA's insignia may not be recoloured, so the wordmark is the one made monochrome.
    {"id": "jpl", "commons": "File:Jet Propulsion Laboratory logo.svg", "what": "Jet Propulsion Laboratory logo",
     "shown": "setting/data.html, beside the JPL catalogue section", "mono": True},
]

SVG = "{http://www.w3.org/2000/svg}"
SKIP = {"defs", "metadata", "title", "desc", "style", "clipPath", "mask", "symbol", "pattern",
        "linearGradient", "radialGradient", "filter", "marker"}
WHITE = {"#fff", "#ffffff", "#fffffe", "white"}


def api(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def strip_tags(s):
    t = re.sub(r"<[^>]+>", "", s or "")
    t = re.sub(r"\s+", " ", t)
    return re.sub(r" ([,.;:])", r"\1", t).strip()


def info(title):
    d = api({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata",
             "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|Restrictions"})
    page = next(iter(d["query"]["pages"].values()))
    ii = page["imageinfo"][0]
    em = ii.get("extmetadata", {})
    g = lambda k: strip_tags(em.get(k, {}).get("value", ""))
    return {"url": ii["url"], "mime": ii["mime"], "size": [ii["width"], ii["height"]],
            "credit": g("Artist") or g("Credit"), "vectorised_by": g("Credit"),
            "license": g("LicenseShortName"), "license_url": em.get("LicenseUrl", {}).get("value", ""),
            "restrictions": g("Restrictions"),
            "source": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))}


def path_points(d):
    """The points that bound an SVG path: every vertex plus each Bézier's turning points,
    so the box is exact rather than the looser box of the control points."""
    toks = re.findall(r"[A-DF-Za-df-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?", d)
    pts, i, cmd = [], 0, None
    x = y = sx = sy = 0.0
    last_c = last_q = None                       # previous control point, for S and T

    def take(n, rel):
        nonlocal i
        v = [float(t) for t in toks[i:i + n]]
        if len(v) < n:
            raise ValueError("truncated path data")
        i += n
        return [a + (x if k % 2 == 0 else y) if rel else a for k, a in enumerate(v)]

    def turning(p0, p1, p2, p3):                 # t in (0, 1) where a cubic's coordinate turns
        a, b, c = -p0 + 3 * p1 - 3 * p2 + p3, 2 * (p0 - 2 * p1 + p2), p1 - p0
        if abs(a) < 1e-12:
            return [-c / b] if abs(b) > 1e-12 else []
        disc = b * b - 4 * a * c
        if disc < 0:
            return []
        r = math.sqrt(disc)
        return [(-b + r) / (2 * a), (-b - r) / (2 * a)]

    def cubic(p0, p1, p2, p3):
        for t in turning(p0[0], p1[0], p2[0], p3[0]) + turning(p0[1], p1[1], p2[1], p3[1]):
            if 0 < t < 1:
                u = 1 - t
                pts.append(tuple(u ** 3 * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t ** 3 * p3[k]
                                 for k in (0, 1)))
        pts.append(p3)

    while i < len(toks):
        if toks[i][0].isalpha():
            cmd = toks[i]
            i += 1
            if cmd in "Zz":
                x, y, last_c, last_q = sx, sy, None, None
                continue
        elif cmd is None or cmd in "Zz":
            raise ValueError("numbers without a command")
        rel, C = cmd.islower(), cmd.upper()
        if C == "M":
            x, y = take(2, rel)
            sx, sy = x, y
            pts.append((x, y))
            cmd = "l" if rel else "L"             # further pairs are line-tos
        elif C == "L":
            x, y = take(2, rel)
        elif C == "H":
            v, i = float(toks[i]), i + 1
            x = x + v if rel else v
        elif C == "V":
            v, i = float(toks[i]), i + 1
            y = y + v if rel else v
        elif C in "CS":
            if C == "C":
                x1, y1, x2, y2, ex, ey = take(6, rel)
            else:
                x1, y1 = (2 * x - last_c[0], 2 * y - last_c[1]) if last_c else (x, y)
                x2, y2, ex, ey = take(4, rel)
            cubic((x, y), (x1, y1), (x2, y2), (ex, ey))
            x, y, last_c = ex, ey, (x2, y2)
            continue
        elif C in "QT":
            if C == "Q":
                qx, qy, ex, ey = take(4, rel)
            else:
                qx, qy = (2 * x - last_q[0], 2 * y - last_q[1]) if last_q else (x, y)
                ex, ey = take(2, rel)
            # a quadratic is the cubic with control points two thirds of the way to q
            cubic((x, y), (x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y)),
                  (ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey)), (ex, ey))
            x, y, last_q = ex, ey, (qx, qy)
            last_c = None
            continue
        else:
            raise ValueError(f"path command {cmd} is not handled")
        pts.append((x, y))
        last_c = last_q = None
    return pts


def props(el):
    """An element's presentation properties: its attributes, overridden by its style."""
    p = {k: v.strip() for k, v in el.attrib.items() if "}" not in k}
    for decl in el.get("style", "").split(";"):
        if ":" in decl:
            k, v = decl.split(":", 1)
            p[k.strip()] = v.strip()
    return p


def mono(data, title):
    """A one-colour copy of an SVG logo for a dark page. Every filled shape is painted
    currentColor (white unless the page sets a colour), each keeps its own fill rule so the
    counters of letters stay holes, nothing paints a background, and the viewBox is cropped
    to the artwork with a hairline margin. Anything this cannot copy faithfully (strokes,
    transforms, white knock-out shapes, other elements) raises rather than guess.
    Returns the SVG text and the viewBox's width and height."""
    paths, pts = [], []

    def walk(el, inherited):
        if not el.tag.startswith(SVG):
            return                                # metadata in other namespaces
        tag, own = el.tag[len(SVG):], props(el)
        if tag in SKIP or own.get("display") == "none" or own.get("opacity") in ("0", "0.0"):
            return
        if "transform" in el.attrib:
            raise ValueError(f"<{tag} id={el.get('id')}> has a transform")
        p = {**inherited, **{k: v for k, v in own.items() if k in ("fill", "fill-rule", "fill-opacity", "stroke")}}
        if tag in ("svg", "g"):
            for child in el:
                walk(child, p)
            return
        if tag != "path":
            raise ValueError(f"<{tag}> is not handled")
        if p.get("stroke", "none") != "none":
            raise ValueError(f"path {el.get('id')} is stroked")
        fill = p.get("fill", "#000").lower()
        if fill == "none" or p.get("fill-opacity") in ("0", "0.0"):
            return
        if fill in WHITE:
            raise ValueError(f"path {el.get('id')} is a white knock-out and would need a mask")
        d = re.sub(r"\s+", " ", el.get("d", "")).strip()
        if d:
            paths.append((d, p.get("fill-rule", "nonzero")))
            pts.extend(path_points(d))

    walk(ET.fromstring(data), {})
    xs, ys = [q[0] for q in pts], [q[1] for q in pts]
    pad = 0.004 * max(max(xs) - min(xs), max(ys) - min(ys))
    x0, y0 = math.floor((min(xs) - pad) * 100) / 100, math.floor((min(ys) - pad) * 100) / 100
    w, h = math.ceil((max(xs) + pad) * 100) / 100 - x0, math.ceil((max(ys) + pad) * 100) / 100 - y0
    n = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")
    body = "".join(f'<path d="{d}"' + (' fill-rule="evenodd"' if r == "evenodd" else "") + "/>" for d, r in paths)
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(x0)} {n(y0)} {n(w)} {n(h)}" '
           f'width="{n(w)}" height="{n(h)}" color="#fff" fill="currentColor">'
           f"<!-- {title}, one colour, made by scripts/fetch_logos.py -->{body}</svg>\n")
    return svg, (w, h)


def main():
    os.makedirs(OUT, exist_ok=True)
    out = []
    for L in LOGOS:
        i = info(L["commons"])
        ext = {"image/svg+xml": "svg", "image/png": "png"}.get(i["mime"], "bin")
        req = urllib.request.Request(i["url"], headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        fn = f"{L['id']}.{ext}"
        with open(os.path.join(OUT, fn), "wb") as f:
            f.write(data)
        entry = {"id": L["id"], "file": fn}
        if L.get("mono"):
            svg, (w, h) = mono(data, L["commons"])
            entry["mono_file"] = mf = f"{L['id']}-mono.svg"
            with open(os.path.join(OUT, mf), "w", encoding="utf-8") as f:
                f.write(svg)
            print(f"{mf}: {len(svg):,} bytes · viewBox {w:.2f} × {h:.2f}, width/height {w / h:.3f}")
        out.append({**entry, "what": L["what"], "shown": L["shown"], **i})
        print(f"{fn}: {len(data):,} bytes · {i['license']} · {i['credit']} · restrictions: {i['restrictions'] or 'none'}")
    with open(os.path.join(OUT, "credits.json"), "w", encoding="utf-8") as f:
        json.dump({"_what": "Organisation logos shown on the site, from Wikimedia Commons via scripts/fetch_logos.py. "
                            "Credits and restrictions were read from the Commons API; a trademarked logo identifies "
                            "the organisation and implies no endorsement.",
                   "logos": out}, f, indent=1, ensure_ascii=False)
        f.write("\n")


if __name__ == "__main__":
    main()
