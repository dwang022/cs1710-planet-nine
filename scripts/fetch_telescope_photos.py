#!/usr/bin/env python3
"""Fetch photographs of the telescopes that have measured the extreme objects
most (one per site, shown in the map's pop-ups), from Wikimedia Commons, with every credit read from the Commons API.

Each entry names the MPC observatory codes it stands for, so the page can put
the photograph beside that observatory's numbers in observatories.json.

Writes public/telescopes/*.jpg (cropped to 3:2, 720 px wide),
public/telescopes/credits.json (read by the page) and
public/telescopes/CREDITS.md. Pillow is needed; on this machine run it as
`python -P scripts/fetch_telescope_photos.py`. Name ids to redo only those
(`... fetch_telescope_photos.py keystone`); the other entries are kept.

A site with no free photograph can use a local one (`local`, a path under
data/photos/) with its credit, licence and source written in the entry; an
empty licence is left out wherever the credit is shown.

Each entry: the Commons title, the output id, the codes, the name and place
to print, and `focus`, the point ([x, y] as fractions of the photo) the 3:2
crop is centred on; `zoom` above 1 crops tighter than the largest 3:2 box.
"""
import io, json, os, re, sys, time, urllib.parse, urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "telescopes")
API = "https://commons.wikimedia.org/w/api.php"
UA = "cs1710-planet-nine/1.0 (mailto:rluo@g.harvard.edu)"
WIDTH, ASPECT = 720, 3 / 2

PHOTOS = [
    {"id": "panstarrs", "commons": "File:Pan-STARRS Observatory (2019-12-4315).jpg", "codes": ["F51", "F52"],
     "name": "Pan-STARRS", "place": "Haleakalā, Hawaiʻi", "focus": [0.5, 0.5]},
    {"id": "blanco", "commons": "File:Blanco's Open Dome (Cerro-Tololo-Drone-Pic 15-CC) - edit1.jpg", "codes": ["W84"],
     "name": "Blanco Telescope", "place": "Cerro Tololo, Chile", "focus": [0.5, 0.5]},
    {"id": "rubin", "commons": "File:Vera C Rubin Observatory in the Snow (IMG 0315-CC).jpg", "codes": ["X05"],
     "name": "Rubin Observatory", "place": "Cerro Pachón, Chile", "focus": [0.265, 0.36], "zoom": 2.6},
    {"id": "subaru", "commons": "File:Subaru Telescope. Mauna Kea Summit (503947) (21404240034).jpg", "codes": ["T09", "266"],
     "name": "Subaru Telescope", "place": "Maunakea, Hawaiʻi", "focus": [0.5, 0.5]},
    # the summit's dot: Maunakea's shared code (mostly CFHT's surveys), CFHT and Gemini North; Subaru keeps its own
    {"id": "maunakea", "commons": "File:Mauna Kea Eastern Telescopes.jpg",
     "codes": ["568", "T14", "T15"], "name": "Maunakea Observatories", "place": "Hawaiʻi", "focus": [0.5, 0.5]},
    {"id": "magellan", "commons": "File:Magellan-Telescopes-at-LCO-2014-04-19.jpg", "codes": ["304", "269"],
     "name": "Magellan Telescopes", "place": "Las Campanas, Chile", "focus": [0.5, 0.5]},
    {"id": "hubble", "commons": "File:View of Hubble after Being Released from the Shuttle Atlantis (28223588012).jpg", "codes": ["250"],
     "name": "Hubble Space Telescope", "place": "in orbit", "focus": [0.5, 0.5]},
    {"id": "palomar", "commons": "File:Palomar Observatory 2012 01.jpg", "codes": ["675", "644", "261"],
     "name": "Palomar Observatory", "place": "California", "focus": [0.5, 0.5]},
    {"id": "kittpeak", "commons": "File:Kitt Peak National Observatory (Kitt-Peak).jpg", "codes": ["695"],
     "name": "Kitt Peak", "place": "Arizona", "focus": [0.5, 0.5]},
    {"id": "ldt", "commons": "File:The Dome of Discovery Channel Telecope.JPG", "codes": ["G37"],
     "name": "Lowell Discovery Telescope", "place": "Arizona", "focus": [0.5, 0.5]},
    {"id": "lapalma", "commons": "File:Roque de los Muchachos - ORM - ATC - WHT - DOT - LT - SST - GOTO - INT - JKT.jpg", "codes": ["950"],
     "name": "Roque de los Muchachos", "place": "La Palma, Canary Islands", "focus": [0.5, 0.5]},
    {"id": "lasilla", "commons": "File:Telescopes at La Silla.jpg", "codes": ["809"],
     "name": "La Silla Observatory", "place": "Chile", "focus": [0.5, 0.5]},
    {"id": "paranal", "commons": "File:Paranal and the Pacific at sunset (dsc4088, retouched, cropped).jpg", "codes": ["309"],
     "name": "Paranal Observatory", "place": "Chile", "focus": [0.5, 0.5]},
    # A dome at XuYi Station (the photo's coordinates are the station's; Commons calls it the observation
    # building). Commons has no other exterior of the station, only the main campus in Nanjing.
    {"id": "purplemountain", "commons": "File:观测楼 - panoramio.jpg", "codes": ["D29"],
     "name": "Purple Mountain Observatory", "place": "XuYi Station, China", "focus": [0.52, 0.56], "zoom": 1.35},
    # The Sloan telescope (645); 705 is the same mountaintop's 3.5-metre telescope.
    {"id": "apachepoint", "commons": "File:SDSS and du Pont Telescopes 01.jpg", "codes": ["645", "705"],
     "name": "Apache Point Observatory", "place": "New Mexico", "focus": [0.5, 0.4]},
    {"id": "klet", "commons": "File:Výlet na Klet - 28 srpna 2009 114.JPG", "codes": ["246"],
     "name": "Kleť Observatory", "place": "Czechia", "focus": [0.5, 0.42]},
    {"id": "calaralto", "commons": "File:Sierra de los Filabres Observatorium.jpg", "codes": ["Z79"],
     "name": "Calar Alto Observatory", "place": "Almería, Spain", "focus": [0.45, 0.36], "zoom": 1.1},
    {"id": "wendelstein", "commons": "File:Wendelstein Domes.jpg", "codes": ["230"],
     "name": "Wendelstein Observatory", "place": "Bavaria, Germany", "focus": [0.5, 0.42]},
    {"id": "george", "commons": "File:Brazos Bend State Park 2 Feb 2021 NZ7 1048.jpg", "codes": ["735"],
     "name": "George Observatory", "place": "Texas", "focus": [0.5, 0.55]},
    {"id": "lemmon", "commons": "File:Catalina Sky Survey Observatory at Dusk.jpg", "codes": ["G96"],
     "name": "Catalina Sky Survey", "place": "Mount Lemmon, Arizona", "focus": [0.55, 0.5]},
    # No freely licensed photograph exists; this one was posted by Keystone College. No licence is printed.
    {"id": "keystone", "local": "data/photos/keystone.jpg", "codes": ["I17"],
     "name": "Thomas G. Cupillari Observatory", "place": "Fleetville, Pennsylvania", "focus": [0.58, 0.6],
     "credit": "Rob, via Keystone College", "license": "",
     "source": "https://www.facebook.com/KeystoneCollege/posts/-thank-you-rob-for-these-photos-and-for-sharing-your-experience-of-keystones-cup/1176382641180093/"},
]


def api(params):
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def info(title):
    d = api({"action": "query", "format": "json", "titles": title, "prop": "imageinfo",
             "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1600,
             "iiextmetadatafilter": "LicenseShortName|LicenseUrl|Artist|Credit"})
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page:
        raise SystemExit(f"not on Commons: {title}")
    ii = page["imageinfo"][0]
    meta = {k: re.sub(r"<[^>]+>", "", v.get("value", "")).strip() for k, v in ii.get("extmetadata", {}).items()}
    return ii, meta


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as r:
        return r.read()


def crop32(im, focus, zoom=1):
    w, h = im.size
    if w / h > ASPECT:
        cw, ch = round(h * ASPECT / zoom), round(h / zoom)
    else:
        cw, ch = round(w / zoom), round(w / ASPECT / zoom)
    x0 = min(max(0, round(focus[0] * w - cw / 2)), w - cw)
    y0 = min(max(0, round(focus[1] * h - ch / 2)), h - ch)
    return im.crop((x0, y0, x0 + cw, y0 + ch)).resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS)


def local(ph):
    """A photograph kept in the repo, with the credit written in its entry."""
    im = Image.open(os.path.join(ROOT, ph["local"])).convert("RGB")
    return im, {"credit": ph["credit"], "license": ph["license"], "license_url": ph.get("license_url", ""),
                "source": ph["source"], "original_size": list(im.size)}


def commons(ph):
    ii, meta = info(ph["commons"])
    data = fetch(ii.get("thumburl") or ii["url"])              # a 1600-px rendering is plenty for 720 px
    time.sleep(0.5)
    return Image.open(io.BytesIO(data)).convert("RGB"), {
        "credit": meta.get("Artist") or meta.get("Credit") or "",
        "license": meta.get("LicenseShortName", ""), "license_url": meta.get("LicenseUrl", ""),
        "source": "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(ph["commons"].replace(" ", "_")),
        "original_size": [ii["width"], ii["height"]],
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    only = set(sys.argv[1:])
    kept = {}
    if only and os.path.exists(os.path.join(OUT, "credits.json")):
        with open(os.path.join(OUT, "credits.json"), encoding="utf-8") as f:
            kept = {c["id"]: c for c in json.load(f)["photos"]}
    credits = []
    for ph in PHOTOS:
        if only and ph["id"] not in only and ph["id"] in kept:
            credits.append(kept[ph["id"]])
            continue
        im, cred = local(ph) if "local" in ph else commons(ph)
        out = f"{ph['id']}.jpg"
        crop32(im, ph["focus"], ph.get("zoom", 1)).save(os.path.join(OUT, out), quality=86, optimize=True, progressive=True)
        credits.append({"id": ph["id"], "file": out, "codes": ph["codes"], "name": ph["name"], "place": ph["place"], **cred})
        print(f"{out}: {cred['license'] or '(no licence)'} · {cred['credit'][:70]}")

    with open(os.path.join(OUT, "credits.json"), "w", encoding="utf-8") as f:
        json.dump({"_what": "Photographs of the telescopes that measured the extreme objects most, from Wikimedia Commons "
                            "via scripts/fetch_telescope_photos.py. Credits were read from the Commons API, except for "
                            "local photographs, whose credit is written in the script.",
                   "_fetched": time.strftime("%Y-%m-%d"), "photos": credits}, f, indent=1, ensure_ascii=False)
    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("# Telescope photographs\n\nFetched from Wikimedia Commons by `scripts/fetch_telescope_photos.py`; "
                "credits as the Commons API gives them; local photographs (data/photos/) carry the credit written in the script.\n\n")
        for c in credits:
            lic = c["license"] + (f" ({c['license_url']})" if c["license_url"] else "")
            f.write(f"- **{c['file']}** ({c['name']}, {c['place']}): "
                    + " · ".join(x for x in (c["credit"], lic, f"<{c['source']}>") if x) + "\n")


main()
