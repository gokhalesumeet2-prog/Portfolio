#!/usr/bin/env python3
"""
Design-system guard for sumeetgokhale.com.

Static checks only, so it runs anywhere with no dependencies:
    python3 tools/check-consistency.py

Exits non-zero if any rule in DESIGN-SYSTEM.md that can be checked
statically has been broken. Runtime rules (contrast, target size, overflow,
image ratios) are covered by the headless render pass, not here.

The site now runs two design systems side by side. The homepage is its own
thing: its own stylesheet at assets/css/site.css, its own scripts, its own
typographic rules, and no contact band or CTA row to check. The case studies
still run the original system out of the flat assets/site.css. So the rules
below are scoped -- PAGES covers the original system, HOME covers the
homepage, and the link and asset integrity pass at the end covers everything,
because a broken reference is a broken reference whichever design it lives in.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ("audit-before", "renders", "prototype", ".git", "tools", "_preview")

# design explorations kept around for reference, not part of the site
SCRATCH = ("preview-restyle.html", "preview-section-rail.html")

HOME = "index.html"
HOME_CSS = "assets/css/site.css"
DOMAIN = "https://sumeetgokhale.com"

# pages running the original design system
PAGES = [
    "ux-design-case-studies/index.html",
    "about-sumeet-gokhale-ux-designer/index.html",
    "nirvana-mudra-recommendation-engine-case-study/index.html",
    "galls-uniform-customizer-ecommerce-ux-case-study/index.html",
    "nirvana-meditation-app-habit-design-case-study/index.html",
    "optivento-restaurant-inventory-management-ux-case-study/index.html",
]
CASE_STUDIES = PAGES[2:]

fails = []
def check(ok, msg):
    if not ok:
        fails.append(msg)


def html_files():
    for dp, dn, fn in os.walk(ROOT):
        if any(s in dp for s in SKIP):
            continue
        for f in sorted(fn):
            if f.endswith(".html") and f not in SCRATCH:
                yield os.path.join(dp, f)


def read(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


# ---------------------------------------------------------------- 1. one stylesheet
for p in html_files():
    rel = os.path.relpath(p, ROOT)
    s = open(p, encoding="utf-8").read()
    if 'http-equiv="refresh"' in s:
        continue          # legacy redirect stub, deliberately bare
    check("site.css" in s, f"{rel}: does not link a site stylesheet")
    check(":root" not in s, f"{rel}: declares its own :root, tokens must live in site.css")
    n_style = len(re.findall(r"<style", s))
    check(n_style <= 1, f"{rel}: {n_style} <style> blocks, at most one scoped block is allowed")

# ---------------------------------------------------------------- 2. typography
css = read("assets/site.css")
for bad in ("IBM Plex", "Plex Mono", "monospace", "SFMono", "Menlo", "Courier"):
    check(bad not in css, f"site.css: typewriter face '{bad}' is back")
check('--sans: "Inter"' in css, "site.css: --sans should lead with Inter")
check("SF Pro Text" in css, "site.css: --mono should request SF Pro from the system")

# The homepage runs Poppins over Inter and keeps a system mono stack for the
# clock and the render panel, so only the faces the old system was actually
# haunted by are worth guarding here.
home_css = read(HOME_CSS)
for bad in ("IBM Plex", "Plex Mono", "Courier"):
    check(bad not in home_css, f"{HOME_CSS}: typewriter face '{bad}' is back")

# ---------------------------------------------------------------- 3. no em or en dashes
# a rule of the original system only. The homepage sets its own voice and
# uses em dashes deliberately, in the title and the meta description.
for rel in PAGES + ["assets/site.css"]:
    s = read(rel)
    check("—" not in s, f"{rel}: contains an em dash")
    check("–" not in s, f"{rel}: contains an en dash")

# ---------------------------------------------------------------- 4. corrupted CSS values
# guards the regression where "clamp(1.5rem, .5rem + 3vw, 3.5rem)" lost its comma
mangled = re.compile(r"\d(?:rem|em|px|vw|vh|%)\.\d")
# colour functions that lost an argument separator, e.g. rgba(21,128,61.15)
def bad_colour(text):
    out = []
    for m in re.finditer(r"\brgba\(([^()]*)\)", text):
        if len([x for x in m.group(1).split(",")]) != 4:
            out.append("rgba(" + m.group(1) + ")")
    for m in re.finditer(r"\brgb\(([^()]*)\)", text):
        if "/" not in m.group(1) and len(m.group(1).split(",")) != 3:
            out.append("rgb(" + m.group(1) + ")")
    return out
fused = re.compile(r"(?:[a-z0-9\]\)]|::[a-z-]+)\.[a-zA-Z][\w-]*\s*\{")
for p in list(html_files()) + [os.path.join(ROOT, "assets/site.css"),
                               os.path.join(ROOT, HOME_CSS)]:
    rel = os.path.relpath(p, ROOT)
    s = open(p, encoding="utf-8").read()
    for m in mangled.finditer(s):
        check(False, f"{rel}: malformed length near '{s[max(0,m.start()-25):m.end()+15]}'")
    for c in bad_colour(s):
        check(False, f"{rel}: malformed colour function {c}")

# ---------------------------------------------------------------- 5. CTA system
BTN = re.compile(r'<a class="(btn[^"]*)"[^>]*>(.*?)</a>', re.S)

def buttons(rel):
    out = []
    for m in BTN.finditer(read(rel)):
        label = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(2))).strip()
        out.append((m.group(1), label))
    return out

for rel in PAGES:
    btns = buttons(rel)
    for cls, label in btns:
        check("btn--primary" in cls or "btn--ghost" in cls,
              f"{rel}: button '{label}' uses neither primary nor ghost")
        check("↗" not in label and "->" not in label,
              f"{rel}: button '{label}' has an arrow typed into the label, use .btn--ext")

    # contact band: exactly Email me + LinkedIn, on every page
    tail = read(rel).split('class="section contact-band"')[-1]
    cb = [(c, l) for c, l in BTN.findall(tail) for c, l in [(c, re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", l)).strip())]]
    check(len(cb) == 2, f"{rel}: contact band has {len(cb)} buttons, expected exactly 2")
    if len(cb) == 2:
        check(cb[0][1] == "Email me" and "btn--primary" in cb[0][0],
              f"{rel}: contact band primary should be 'Email me', found '{cb[0][1]}'")
        check(cb[1][1] == "LinkedIn" and "btn--ext" in cb[1][0],
              f"{rel}: contact band ghost should be 'LinkedIn' with .btn--ext, found '{cb[1][1]}'")

# every case study head: one primary + one ghost
for rel in CASE_STUDIES:
    head = read(rel).split('class="cs-head"')[-1].split("</section>")[0]
    hb = BTN.findall(head)
    check(len(hb) == 2, f"{rel}: case study head has {len(hb)} CTAs, expected 2")
    if len(hb) == 2:
        check("btn--primary" in hb[0][0], f"{rel}: first head CTA should be primary")
        check("btn--ghost" in hb[1][0], f"{rel}: second head CTA should be ghost")

# ---------------------------------------------------------------- 6. structure
for rel in PAGES:
    s = read(rel)
    h1 = re.findall(r"<h1[^>]*>", s)
    check(len(h1) == 1, f"{rel}: {len(h1)} <h1> elements, expected exactly 1")
    check(not any("sr-only" in h for h in h1), f"{rel}: the <h1> is hidden with sr-only")
    check('class="skip"' in s, f"{rel}: missing skip link")
    check("contact-band" in s, f"{rel}: missing contact band")

# ---------------------------------------------------------------- 6b. the homepage
# Different design, so different rules. What matters here is that it is still
# a real page for a crawler, that it points at the right domain, and that the
# work list actually leads somewhere -- the project links ship as href="#"
# placeholders in the design file and are easy to forget.
home = read(HOME)

h1 = re.findall(r"<h1[^>]*>", home)
check(len(h1) == 1, f"{HOME}: {len(h1)} <h1> elements, expected exactly 1")
check(not any("sr-only" in h for h in h1), f"{HOME}: the <h1> is hidden with sr-only")

check(HOME_CSS in home, f"{HOME}: does not link {HOME_CSS}")
check(f'rel="canonical" href="{DOMAIN}/"' in home,
      f"{HOME}: canonical does not point at {DOMAIN}/")
for prop in ("og:url", "og:image", "twitter:image"):
    m = re.search(rf'"{re.escape(prop)}"[^>]*content="([^"]+)"', home)
    check(m is not None and m.group(1).startswith(DOMAIN),
          f"{HOME}: {prop} does not point at {DOMAIN}")

placeholders = len(re.findall(r'href="#"', home))
check(placeholders == 0,
      f"{HOME}: {placeholders} link(s) still have the placeholder href=\"#\"")

projects = re.findall(r'<a class="proj[^"]*" href="([^"]+)"', home)
check(len(projects) == 5, f"{HOME}: {len(projects)} project links, expected 5")

check("TODO" not in home, f"{HOME}: still has a TODO comment in it")

# ---------------------------------------------------------------- 7. links and assets
for p in html_files():
    rel = os.path.relpath(p, ROOT)
    d = os.path.dirname(p)
    for target in re.findall(r'(?:href|src)="([^"#:]+)"', open(p, encoding="utf-8").read()):
        if target.startswith(("http", "mailto", "data", "//")):
            continue
        target = target.split("?", 1)[0]      # drop ?v= cache-buster before resolving
        if not target:
            continue
        base = ROOT if target.startswith("/") else d
        t = os.path.normpath(os.path.join(base, target.lstrip("/") if target.startswith("/") else target))
        if os.path.isdir(t):
            t = os.path.join(t, "index.html")
        check(os.path.exists(t), f"{rel}: broken reference to {target}")

# ---------------------------------------------------------------- report
if fails:
    print(f"FAIL: {len(fails)} design-system violation(s)\n")
    for f in fails:
        print("  -", f)
    sys.exit(1)

print("PASS: design system consistent across all pages")
