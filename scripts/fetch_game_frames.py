#!/usr/bin/env python3
"""Fetch real discovery frames for the find-the-moving-object game from
Wikimedia Commons, split each animated GIF into its frames, and measure where
the moving object sits in every frame.

Superseded: the game now uses scripts/fetch_game_sequences.py, which takes five
to ten exposures per object from the telescope archives. This script is kept
for the record and writes to data/raw/game_commons/ (gitignored), not to
public/game/: <id>-<n>.jpg (one per frame), game.json and CREDITS.md, in the
format the page reads. Pillow is needed; on this machine run
it as `python -P scripts/fetch_game_frames.py` (`-I` hides the user
site-packages where Pillow lives).

How a position is found:
  1. Each plain GIF has an annotated twin on Commons that marks the object with
     an arrow or a circle in every frame. The mark's pixels (picked by colour)
     give a rough position. The twin is a crop of the plain GIF; the offset
     between them comes from matching bright stars in both.
  2. On the plain frames, the per-pixel median of all frames is the static sky.
     Each frame minus that median, lightly blurred, leaves what moved; the
     brightest residual blob near the mark is the object, and its centroid is
     the position.
Positions are in the saved frame's pixels: origin at the top-left corner, x to
the right, y down, a pixel's centre at +0.5 (so they scale with the image).
A round is skipped, and listed under "skipped" with the reason, when colour
annotation is burned into the plain frames' sky, the twin cannot be matched,
the object cannot be told from the noise, or it moves less than MIN_MOTION
pixels in all.

Each entry below: the Commons titles of the plain and annotated GIFs, the
output id, and
  crop     [left, top, right, bottom] in the GIF's pixels: the sky only, without
           Aladin's file-name line, grey panel, scale bar and compass
  mark     colour of the twin's mark: yellow or green
  points   "down" for an arrow whose tip sits just above the object; omitted
           for a circle round it
  ignore   boxes in the twin's pixels holding its date caption, which is drawn
           in the mark's colour
"""
import html, io, json, math, os, re, time, urllib.parse, urllib.request
from collections import Counter

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageSequence, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "raw", "game_commons")   # not public/game: fetch_game_sequences.py owns that
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"

MAX_WIDTH = 900      # wider frames are scaled down to this
QUALITY = 88         # JPEG quality
BLUR = 1.5           # Gaussian sigma (px) applied to the residual before the search
MIN_MOTION = 6       # px in the saved frames, summed over the sequence
MIN_CONTRAST = 4     # residual peak over the search disc's noise, below which we refuse to guess
TELESCOPE = "Dark Energy Camera, 4-metre Blanco telescope, Cerro Tololo"

ROUNDS = [
    {"id": "vp113", "commons": "File:2012 VP113 DECam 2012-11-05.gif",
     "annotated": "File:2012 VP113 DECam 2012-11-05 annotated.gif",
     "crop": [0, 22, 1012, 555], "mark": "yellow", "points": "down", "ignore": [[0, 360, 600, 400]]},
    {"id": "fe72", "commons": "File:2014 FE72 DECam 2014-03-26.gif",
     "annotated": "File:2014 FE72 DECam 2014-03-26 annotated.gif",
     "crop": [0, 24, 1445, 880], "mark": "yellow", "points": "down", "ignore": [[0, 0, 260, 100]]},
    {"id": "chiminigagua", "commons": "File:Chiminigagua DECam 2013-03-17.gif",
     "annotated": "File:Chiminigagua DECam 2013-03-17 annotated.gif",
     "crop": [0, 22, 1096, 583], "mark": "yellow", "points": "down", "ignore": [[0, 535, 900, 600]]},
    {"id": "uz224", "commons": "File:2014 UZ224 DECam 2014-10-21-23.gif",
     "annotated": "File:2014 UZ224 DECam 2014-10-21-23 annotated.gif",
     "crop": [0, 22, 1096, 583], "mark": "yellow", "ignore": [[0, 460, 800, 500]]},
    # 2025 GN1 (File:2025 GN1 DECam 2025-04-04.gif) measures fine but is a near-Earth
    # asteroid, not a distant object, so it is left out of a game about them.
    # Kept so the skip and its reason are recorded, not silently lost: KQ14's
    # yellow circle is drawn into the frames themselves, and Torifune has no
    # annotated twin (its two frames are also in different filters, so stars
    # change brightness between them).
    {"id": "kq14", "commons": "File:2023 KQ14 DECam 2014-05-04+05.gif",
     "crop": [0, 22, 1012, 583]},
    {"id": "torifune", "commons": "File:Torifune DECam 2021-05-24.gif",
     "crop": [0, 0, 1445, 512]},
]

MONTHS = ["January", "February", "March", "April", "May", "June", "July",
          "August", "September", "October", "November", "December"]


def api(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def info(title):
    d = api({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata",
             "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit|ImageDescription|DateTimeOriginal"})
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"not on Commons: {title}")
    ii = page["imageinfo"][0]
    meta = {k: html.unescape(re.sub(r"<[^>]+>", "", str(v.get("value", "")))).strip()
            for k, v in ii.get("extmetadata", {}).items()}
    return ii, meta


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def frames_of(data):
    """Every frame of an animated GIF, composed, as RGB, with its duration in ms."""
    im = Image.open(io.BytesIO(data))
    return [(f.convert("RGB"), f.info.get("duration")) for f in ImageSequence.Iterator(im)]


def date_from_title(title):
    """'2014-10-21-23' -> '21 and 23 October 2014'; '2012-11-05' -> '5 November 2012'."""
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})(?:[-+](\d{2}))?", title)
    if not m:
        return None
    y, mo, d1, d2 = m.groups()
    days = f"{int(d1)} and {int(d2)}" if d2 else f"{int(d1)}"
    return f"{days} {MONTHS[int(mo) - 1]} {y}"


# ---------- pixels -------------------------------------------------------------

def colour_mask(rgb, colour):
    """255 where a pixel is saturated yellow or green (annotation), else 0."""
    r, g, b = rgb.split()
    cut = lambda im, t: im.point(lambda v: 255 if v > t else 0)
    if colour == "yellow":
        m = ImageChops.multiply(cut(ImageChops.subtract(r, b), 60), cut(ImageChops.subtract(g, b), 60))
        return ImageChops.multiply(m, ImageChops.difference(r, g).point(lambda v: 255 if v < 60 else 0))
    if colour == "green":
        return ImageChops.multiply(cut(ImageChops.subtract(g, r), 60), cut(ImageChops.subtract(g, b), 60))
    # any strong colour at all
    return ImageChops.lighter(cut(ImageChops.difference(r, g), 40), cut(ImageChops.difference(g, b), 40))


def points_of(mask):
    w = mask.size[0]
    return [(i % w, i // w) for i, v in enumerate(mask.tobytes()) if v]


def components(hot, w):
    """8-connected groups of pixel indices."""
    hot = set(hot)
    while hot:
        seed = hot.pop()
        stack, comp = [seed], [seed]
        while stack:
            i = stack.pop()
            x = i % w
            for dy in (-w, 0, w):
                for dx in (-1, 0, 1):
                    j = i + dy + dx
                    if j in hot and 0 <= x + dx < w:
                        hot.remove(j)
                        stack.append(j)
                        comp.append(j)
        yield comp


def stars(gray, thr=200, min_area=12):
    """Centroids of bright blobs, for matching two views of the same sky."""
    s = gray.filter(ImageFilter.GaussianBlur(1.5))
    w = s.size[0]
    px = s.tobytes()
    out = []
    for comp in components((i for i, v in enumerate(px) if v > thr), w):
        if len(comp) < min_area:
            continue
        tot = sum(px[i] for i in comp)
        out.append((sum((i % w) * px[i] for i in comp) / tot, sum((i // w) * px[i] for i in comp) / tot))
    return out


def match_offset(a, b, tol=1.5):
    """Integer-vote the shift that carries star list a onto star list b, then refine it."""
    votes = Counter((round(bx - ax), round(by - ay)) for ax, ay in a for bx, by in b)
    near = lambda d: sum(votes.get((d[0] + i, d[1] + j), 0) for i in (-1, 0, 1) for j in (-1, 0, 1))
    best = max(votes, key=near)
    pairs = [(bx - ax, by - ay) for ax, ay in a for bx, by in b
             if abs(bx - ax - best[0]) <= tol and abs(by - ay - best[1]) <= tol]
    if len(pairs) < 5:
        return None
    dx = sum(p[0] for p in pairs) / len(pairs)
    dy = sum(p[1] for p in pairs) / len(pairs)
    spread = max(math.hypot(p[0] - dx, p[1] - dy) for p in pairs)
    return dx, dy, len(pairs), spread


def median_image(frames):
    n = len(frames)
    if n == 2:
        return ImageChops.add(frames[0], frames[1], scale=2.0)
    if n == 3:
        a, b, c = frames
        return ImageChops.lighter(ImageChops.darker(a, b), ImageChops.darker(ImageChops.lighter(a, b), c))
    cols = [f.tobytes() for f in frames]
    med = bytes((s[n // 2] + s[(n - 1) // 2]) // 2 for s in (sorted(t) for t in zip(*cols)))
    return Image.frombytes("L", frames[0].size, med)


def locate(frame, med, hint, radius):
    """Centroid of the brightest blob of (frame - median) within radius of hint.
    The blob is the connected patch round the peak that stands above 30% of the
    peak (so a trailed asteroid is taken whole, not just its brightest end).
    Returns (x, y) in continuous pixel coordinates and the peak's contrast."""
    res = ImageChops.subtract(frame, med).filter(ImageFilter.GaussianBlur(BLUR))
    w, h = res.size
    px = res.tobytes()
    hx, hy = hint
    vals, best = [], (-1, 0, 0)
    for y in range(max(0, int(hy - radius)), min(h, int(hy + radius) + 1)):
        for x in range(max(0, int(hx - radius)), min(w, int(hx + radius) + 1)):
            if (x - hx) ** 2 + (y - hy) ** 2 <= radius * radius:
                v = px[y * w + x]
                vals.append(v)
                if v > best[0]:
                    best = (v, x, y)
    peak, x0, y0 = best
    vals.sort()
    floor, p90 = vals[len(vals) // 2], vals[int(0.9 * len(vals))]
    if peak <= floor:
        return hint, 0.0
    cut = floor + 0.3 * (peak - floor)
    seen, stack = {(x0, y0)}, [(x0, y0)]
    sw = sx = sy = 0.0
    while stack:
        x, y = stack.pop()
        wt = px[y * w + x] - cut
        sw += wt
        sx += wt * x
        sy += wt * y
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                q = (x + dx, y + dy)
                if (q not in seen and 0 <= q[0] < w and 0 <= q[1] < h and px[q[1] * w + q[0]] > cut
                        and (q[0] - x0) ** 2 + (q[1] - y0) ** 2 <= 15 * 15):
                    seen.add(q)
                    stack.append(q)
    contrast = (peak - floor) / max(1, p90 - floor)
    return (sx / sw + 0.5, sy / sw + 0.5), contrast


def mark_hint(rgb, colour, points, ignore):
    """Where the twin's mark says the object is, and how far to look around it."""
    mask = colour_mask(rgb, colour)
    draw = ImageDraw.Draw(mask)
    for box in ignore:
        draw.rectangle([box[0], box[1], box[2] - 1, box[3] - 1], fill=0)
    pts = points_of(mask)
    if len(pts) < 20:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
    if points == "down":  # arrow: the object sits below the tip
        tip = max(ys)
        tx = sum(x for x, y in pts if y >= tip - 2) / sum(1 for x, y in pts if y >= tip - 2)
        return (tx, tip + 0.35 * h), max(12, 0.45 * h)
    return (sum(xs) / len(xs), sum(ys) / len(ys)), max(10, (w + h) / 4)


# ---------- one round ----------------------------------------------------------

def build(rd):
    ii, meta = info(rd["commons"])
    plain = frames_of(fetch(ii["url"]))
    l, t, r, b = rd["crop"]
    title = rd["commons"][5:].rsplit(".", 1)[0]
    entry = {"id": rd["id"], "object": title.split(" DECam")[0]}
    date = date_from_title(title)
    if date:
        entry["date"] = date
    desc = meta.get("ImageDescription", "")
    if "Dark Energy Camera" in desc or "DECam" in title:
        entry["telescope"] = TELESCOPE
    credit = {"credit": meta.get("Artist") or meta.get("Credit") or "unknown",
              "license": meta.get("LicenseShortName") or "see source",
              "license_url": meta.get("LicenseUrl") or "",
              "source": ii.get("descriptionurl") or ""}

    def skip(why):
        print(f"{rd['id']:<13} SKIPPED: {why}")
        return None, {"id": rd["id"], "object": entry["object"], "source": credit["source"], "why": why}

    # Colour inside the sky means a mark is burned in: the game would give the answer away.
    for rgb, _ in plain:
        if len(points_of(colour_mask(rgb.crop((l, t, r, b)), "any"))) > 10:
            return skip("annotation is burned into the sky area of the plain frames")
    if not rd.get("annotated"):
        return skip("no annotated twin to say which blob is the object")

    # Frames: grey sky only; drop exact or near repeats (their time goes to the kept
    # frame) and anything that does not share stars with the rest (a title card).
    grays = [(rgb.convert("L").crop((l, t, r, b)), dur) for rgb, dur in plain]
    star_lists = [stars(g) for g, _ in grays]
    frames, durs, src_index, dropped = [], [], [], []
    for k, (g, dur) in enumerate(grays):
        others = [s for j, s in enumerate(star_lists) if j != k]
        shared = sum(1 for x, y in star_lists[k] if any(any(math.hypot(x - u, y - v) < 2 for u, v in o) for o in others))
        if shared < 3:
            dropped.append(f"frame {k + 1}: shares {shared} stars with the others (title or caption)")
            continue
        if frames and ImageStat.Stat(ImageChops.difference(g, frames[-1])).mean[0] < 1.5:
            durs[-1] += dur or 0
            dropped.append(f"frame {k + 1}: repeats frame {src_index[-1] + 1}")
            continue
        frames.append(g)
        durs.append(dur)
        src_index.append(k)
    if len(frames) < 2:
        return skip("fewer than two distinct sky frames")

    # The twin: where its mark sits, carried into the plain GIF by matching stars.
    tii, _ = info(rd["annotated"])
    twin = frames_of(fetch(tii["url"]))
    if len(twin) != len(plain):
        return skip(f"annotated twin has {len(twin)} frames, plain GIF {len(plain)}")
    no_colour = lambda rgb: Image.composite(Image.new("L", rgb.size, 0), rgb.convert("L"), colour_mask(rgb, "any"))
    plain_stars = stars(no_colour(plain[0][0]))  # marks, captions and Aladin's lettering are not stars
    med = median_image(frames)
    found, notes = [], []
    for k, g in zip(src_index, frames):
        trgb = twin[k][0]
        hint = mark_hint(trgb, rd["mark"], rd.get("points"), rd.get("ignore", []))
        if hint is None:
            return skip(f"no {rd['mark']} mark found in annotated frame {k + 1}")
        (hx, hy), radius = hint
        off = match_offset(stars(no_colour(trgb)), plain_stars)
        if off is None or off[3] > 2.5:
            return skip(f"annotated frame {k + 1} could not be matched to the plain GIF")
        dx, dy, n_pairs, spread = off
        hint_c = (hx + dx - l, hy + dy - t)
        if not (0 <= hint_c[0] < r - l and 0 <= hint_c[1] < b - t):
            return skip(f"the mark in frame {k + 1} falls outside the crop")
        pos, contrast = locate(g, med, hint_c, radius)
        notes.append(f"f{k + 1}: twin +({dx:.1f},{dy:.1f}) from {n_pairs} stars, hint ({hint_c[0]:.0f},{hint_c[1]:.0f}) r{radius:.0f}, "
                     f"found ({pos[0]:.1f},{pos[1]:.1f}) contrast {contrast:.1f}")
        if contrast < MIN_CONTRAST:
            for line in notes:
                print("   ", line)
            return skip(f"no clear moving blob near the mark in frame {k + 1} (contrast {contrast:.1f})")
        found.append(pos)

    # Scale to MAX_WIDTH; positions scale with the pixels.
    cw, ch = frames[0].size
    s = min(1.0, MAX_WIDTH / cw)
    size = (round(cw * s), round(ch * s))
    sx, sy = size[0] / cw, size[1] / ch
    positions = [[round(x * sx, 1), round(y * sy, 1)] for x, y in found]
    steps = [math.hypot(positions[i][0] - positions[i - 1][0], positions[i][1] - positions[i - 1][1])
             for i in range(1, len(positions))]
    for line in notes + dropped:
        print("   ", line)
    if sum(steps) < MIN_MOTION:
        return skip(f"the object moves only {sum(steps):.1f} px across the frames")
    files = []
    for n, g in enumerate(frames, 1):
        img = g.resize(size, Image.LANCZOS) if s < 1 else g
        name = f"{rd['id']}-{n}.jpg"
        img.save(os.path.join(OUT, name), "JPEG", quality=QUALITY, optimize=True, progressive=True)
        files.append(name)

    entry.update({"files": files, "size": list(size), "positions": positions, "frame_ms": durs})
    entry.update(credit)
    entry["located_with"] = tii.get("descriptionurl") or ""
    print(f"{rd['id']:<13} {cw}x{ch} -> {size[0]}x{size[1]}, {len(files)} frames, "
          f"steps {', '.join(f'{d:.1f}' for d in steps)} px  [{credit['license']}] {credit['credit'][:50]}")
    return entry, None


def main():
    os.makedirs(OUT, exist_ok=True)
    rounds, skipped = [], []
    for rd in ROUNDS:
        entry, why = build(rd)
        if entry:
            rounds.append(entry)
        else:
            skipped.append(why)
        time.sleep(0.3)

    doc = {"_what": "Real discovery frames for the find-the-moving-object game, cut from Wikimedia Commons GIFs by "
                    "scripts/fetch_game_frames.py, with the moving object's measured position in every frame.",
           "_positions": "Pixels in the saved frame: origin at the top-left corner, x right, y down, pixel centres at +0.5.",
           "_fetched": time.strftime("%Y-%m-%d"), "rounds": rounds, "skipped": skipped}
    text = json.dumps(doc, indent=1, ensure_ascii=False)
    # lists of plain values on one line, then lists of those ([[x, y], ...]) too
    flat = lambda m: "[" + re.sub(r",\s+", ", ", m.group(1).strip()) + "]"
    text = re.sub(r"\[(\s+[^\[\]{}]*?)\s*\]", flat, text)
    text = re.sub(r"\[(\s+(?:\[[^\[\]]*\],?\s*)+)\]", flat, text)
    with open(os.path.join(OUT, "game.json"), "w", encoding="utf-8") as f:
        f.write(text + "\n")
    lines = ["# Image credits for the moving-object game", "",
             "Every frame is cut from a Wikimedia Commons GIF by `scripts/fetch_game_frames.py`;",
             "the object's position is measured on the plain frames, guided by the file's annotated twin.",
             "Credit, licence and source were read from the Commons API, not typed.", ""]
    for c in rounds:
        lines.append(f"- `{'`, `'.join(c['files'])}` — {c['credit']} · {c['license']} · {c['source']}"
                     f" (located with {c['located_with']})")
    open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"\n{len(rounds)} rounds, {len(skipped)} skipped -> {OUT}")


main()
