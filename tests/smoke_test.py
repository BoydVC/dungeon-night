#!/usr/bin/env python3
"""Dungeon Master Night smoke test.
Builds the offline snapshot, asserts self-contained HTML, then runs a headless
Chrome playthrough (tests/play.mjs via CDP) through combat to victory + recap.
Usage: python3 tests/smoke_test.py   (or ./run.sh test)
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(HERE, "dist", "dungeon-night.html")
RES = []


def check(ok, msg, info=""):
    RES.append(bool(ok))
    line = ("PASS " if ok else "FAIL ") + msg + (f"  [{info}]" if info else "")
    print(line, flush=True)


def main():
    print(f"Dungeon Master Night smoke · {time.strftime('%Y-%m-%d %H:%M %Z')}", flush=True)
    subprocess.run([sys.executable, os.path.join(HERE, "build.py")], check=True, capture_output=True)
    html = open(DIST, encoding="utf-8").read()
    check(os.path.getsize(DIST) > 30000, f"offline snapshot built ({os.path.getsize(DIST):,} bytes)")
    check("<style>" in html and "<script>" in html, "CSS and JS inlined into dist")
    bad_tags = re.findall(
        r'<(?:script|link|img|iframe|source)[^>]+(?:src|href)\s*=\s*["\'](?!data:)[^"\']+',
        html, re.I,
    )
    check(not bad_tags, "no external script/link/img tags", str(bad_tags[:3]))
    http_urls = [u for u in re.findall(r"https?://[^\s\"'<>)]+", html)
                 if "w3.org/2000/svg" not in u]
    check(not http_urls, "no external http(s) URLs (SVG xmlns OK)", str(http_urls[:3]))
    check("fonts.googleapis" not in html and "cdn." not in html.lower() and "unpkg" not in html,
          "no CDN font/script hosts")
    check("window.__DM__" in html or "__DM__" in html, "test API __DM__ present in snapshot")
    check("Sir Bold" in html and "Willow" in html and "Pip" in html, "three heroes embedded")
    check("Shadow Drake" in html or "Crystal of Story" in html, "boss/victory content embedded")
    check("localStorage" in html and "recap" in html.lower(), "recap localStorage support")

    print("headless Chrome playthrough (tests/play.mjs) ...", flush=True)
    t0 = time.time()
    r = subprocess.run(
        ["node", "--experimental-websocket", os.path.join(HERE, "tests", "play.mjs")],
        capture_output=True, text=True, timeout=180, cwd=HERE,
    )
    out = None
    try:
        for line in reversed(r.stdout.strip().splitlines()):
            line = line.strip()
            if line.startswith("{"):
                out = json.loads(line)
                break
    except Exception:
        out = None
    if not out:
        check(False, "play.mjs produced JSON", (r.stdout + r.stderr)[-800:])
    else:
        for c in out.get("checks", []):
            check(c.get("ok"), "browser: " + c.get("msg", "?"), c.get("info", "")[:200])
        check(out.get("failed", 1) == 0, f"playthrough summary {out.get('passed')}/{out.get('passed',0)+out.get('failed',0)}")
    print(f"     play took {time.time() - t0:.1f}s", flush=True)

    shots_dir = os.path.join(HERE, "screenshots")
    if os.path.isdir(shots_dir):
        pngs = [f for f in os.listdir(shots_dir) if f.endswith(".png")]
        best = [f for f in pngs if f.startswith("00-best")]
        if pngs:
            check(bool(best), f"hero screenshot 00-best-*.png ({len(pngs)} shots)", ",".join(best) or "none")

    n, p = len(RES), sum(RES)
    print(f"RESULT: {p}/{n} checks passed" + ("" if p == n else f" ({n - p} FAILED)"), flush=True)
    sys.exit(0 if p == n else 1)


if __name__ == "__main__":
    main()
