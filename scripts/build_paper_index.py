#!/usr/bin/env python3
"""Write papers/README.md: every paper this project reads, how to get it, and
whether a copy sits in papers/.

Generated from the datasets, so the list can never drift from what the site
cites. Also prints the papers that have no free preprint and no local copy,
so someone with journal access knows what to download. Drop a PDF into
papers/ under the filename shown in the table and re-run.

Run with --fetch to download every open-access copy (arXiv, HAL) that is not
yet on disk, three seconds apart as arXiv asks.
"""
import html, json, os, re, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, "data", "processed")
DIR = os.path.join(ROOT, "papers")
OUT = os.path.join(DIR, "README.md")

# Open-access copies outside arXiv (HAL, the French open archive), for papers with no preprint.
OPEN_ELSEWHERE = {
    "10.1051/0004-6361/202037919": ("HAL", "https://hal.science/hal-02881382", "https://hal.science/hal-02881382/file/aa37919-20.pdf"),
}

SECTIONS = {
    "05": "05 — put a planet anywhere (orbit and property predictions)",
    "06": "06 — competing explanations",
    "07": "07 — the field, year by year",
    "08": "08 — provenance list",
}


def load(name):
    with open(os.path.join(P, name), encoding="utf-8") as f:
        return json.load(f)


def clean(s):
    """Crossref titles carry HTML entities and tags."""
    return re.sub(r"<[^>]+>", "", html.unescape(s or "")).strip()


def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s


def dois_in(obj, found):
    """Every string in a JSON tree that looks like a DOI."""
    if isinstance(obj, dict):
        for v in obj.values():
            dois_in(v, found)
    elif isinstance(obj, list):
        for v in obj:
            dois_in(v, found)
    elif isinstance(obj, str):
        for m in re.findall(r"10\.\d{4,9}/[^\s\"')\]]+", obj):
            found.add(m.rstrip(".,;"))
    return found


UA = "cs1710-planet-nine/1.0 (mailto:danielwang@g.harvard.edu)"


def fetch_open(papers, local):
    """Download the open-access PDFs that are not yet in papers/."""
    for p in papers:
        fname = slug(p["label"]) + ".pdf"
        if fname.lower() in local:
            continue
        if p.get("arxiv"):
            url = f"https://arxiv.org/pdf/{p['arxiv']}"
        elif len(OPEN_ELSEWHERE.get(p["doi"], ())) > 2:
            url = OPEN_ELSEWHERE[p["doi"]][2]
        else:
            continue
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if not data.startswith(b"%PDF"):
                print(f"  !! not a PDF: {url}")
                continue
            with open(os.path.join(DIR, fname), "wb") as f:
                f.write(data)
            print(f"  fetched {fname} ({len(data) // 1024} KB)")
        except Exception as exc:
            print(f"  !! {fname}: {exc}")
        time.sleep(3)


def main():
    papers = load("papers.json")["papers"]
    used = {p["doi"]: set() for p in papers}

    for e in load("field_timeline.json")["entries"]:
        for d in [e.get("doi")] + list(e.get("also", [])):
            if d in used:
                used[d].add("07")
    for a in load("alternatives.json")["alternatives"]:
        for d in a.get("key_dois", []):
            if d in used:
                used[d].add("06")
    for d in dois_in(load("planet_nine_predictions.json"), set()):
        if d in used:
            used[d].add("05")
    # the six the provenance section lists by hand (src/main.js renderSources)
    for d in ["10.1038/nature13156", "10.3847/0004-6256/151/2/22", "10.3847/1538-3881/aa7aed",
              "10.3847/1538-3881/ac2056", "10.3847/PSJ/abe53e", "10.3847/1538-3881/ad24e9"]:
        if d in used:
            used[d].add("08")

    os.makedirs(DIR, exist_ok=True)
    local = {f.lower() for f in os.listdir(DIR) if f.lower().endswith(".pdf")}
    if "--fetch" in sys.argv:
        fetch_open(papers, local)
        local = {f.lower() for f in os.listdir(DIR) if f.lower().endswith(".pdf")}

    rows, missing_closed, missing_open = [], [], []
    for p in sorted(papers, key=lambda p: (p.get("year") or 0, p["label"])):
        fname = slug(p["label"]) + ".pdf"
        have = fname.lower() in local
        elsewhere = OPEN_ELSEWHERE.get(p["doi"])
        open_access = bool(p.get("arxiv_url")) or bool(elsewhere)
        if not have:
            (missing_open if open_access else missing_closed).append((p, fname))
        links = f"[doi]({p['url']})"
        if p.get("arxiv_url"):
            links += f" · [arXiv:{p['arxiv']}]({p['arxiv_url']})"
        if elsewhere:
            links += f" · [{elsewhere[0]}]({elsewhere[1]})"
        access = "open preprint" if p.get("arxiv_url") else (f"open ({elsewhere[0]})" if elsewhere else "**journal only**")
        where = ", ".join(sorted(used[p["doi"]])) or "—"
        title = clean(p["title"]).replace("|", "\\|")
        rows.append(
            f"| {p['year']} | **{p['label']}** | {title} | {clean(p.get('journal'))} | {links} | {access} | {'✓' if have else '—'} `{fname}` | {where} |")

    n_have = sum(1 for r in rows if "| ✓ " in r)
    lines = [
        "# Papers this project reads",
        "",
        f"{len(papers)} papers, all pinned to DOIs in `data/processed/papers.json`. Every summary the site shows",
        "was checked against the paper's abstract (see `data/SOURCES.md`). Generated by",
        "`scripts/build_paper_index.py`; regenerate rather than editing by hand.",
        "",
        f"**Local copies:** {n_have} of {len(papers)} PDFs are in this folder. PDFs are ignored by git",
        "(`papers/.gitignore`), so the journal versions never end up in the public repository.",
        "To add one, save it here under the filename in the table and re-run the script.",
        "",
    ]
    if missing_closed:
        lines += ["## Needs journal access — please download",
                  "",
                  "No free preprint exists for these. Save each PDF under the name shown.",
                  ""]
        for p, fname in missing_closed:
            lines.append(f"- **{p['label']}** — *{clean(p['title'])}*, {clean(p.get('journal'))} ({p['year']}). "
                         f"[doi]({p['url']}) → save as `{fname}`")
        lines.append("")
    if missing_open:
        lines += ["## Free preprints not yet saved locally",
                  "",
                  "These can be fetched from arXiv at any time; a local copy is optional.",
                  ""]
        for p, fname in missing_open:
            src = f"[arXiv:{p['arxiv']}]({p['arxiv_url']})" if p.get("arxiv_url") else f"[{OPEN_ELSEWHERE[p['doi']][0]}]({OPEN_ELSEWHERE[p['doi']][1]})"
            lines.append(f"- {p['label']} — {src} → `{fname}`")
        lines.append("")
    lines += ["## All papers",
              "",
              "Section codes: " + " · ".join(f"**{k}** {v}" for k, v in SECTIONS.items()),
              "",
              "| Year | Paper | Title | Journal | Links | Access | Local file | Used in |",
              "|---|---|---|---|---|---|---|---|"]
    lines += rows
    lines.append("")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote {OUT}: {len(papers)} papers, {n_have} local, "
          f"{len(missing_closed)} journal-only still to fetch")
    for p, fname in missing_closed:
        print(f"  needs download: {p['label']:<40} -> {fname}")


main()
