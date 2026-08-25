#!/usr/bin/env python3
"""
Cache-buster for the stylesheets and scripts.

Browsers, and phone browsers especially, hold on to a CSS or JS file long after
the HTML that references it has changed. The symptom is always the same and
always confusing: a change looks correct on the machine you edited it on, and
looks missing on your phone. Nothing is wrong with the site. The phone is
showing a file it downloaded days ago.

The fix is to change the URL whenever the file changes, so the browser has no
cached copy to reach for. This rewrites every reference to a .css or .js file
under assets/, at any depth and by any kind of path:

    assets/css/site.css          ->  assets/css/site.css?v=<hash>
    assets/css/site.css?v=<old>  ->  assets/css/site.css?v=<new>
    ../assets/site.js            ->  ../assets/site.js?v=<hash>
    /assets/js/hero.js           ->  /assets/js/hero.js?v=<hash>

where <hash> is the first 8 characters of the SHA-1 of that file itself. Same
file, same hash, no churn in git. Changed file, new hash, guaranteed refresh.

Nothing is hard-coded, so the homepage's assets/css + assets/js layout and the
case studies' older flat assets/site.css both get stamped without this script
needing to know either of them exists.

Run it before publishing:
    python3 tools/stamp-css.py
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ("audit-before", "renders", "prototype", ".git", "_preview", "node_modules")

# Any reference to a .css or .js under assets/, with an optional existing ?v=
# stamp to overwrite. The (?![\w-]) after the extension is what stops
# "assets/data.jsonld" being read as "assets/data.js" plus a stray "onld", and
# the (?<![\w-]) in front stops "myassets/x.css" matching as "assets/x.css".
ASSET = re.compile(
    r"((?:\.\./)*/?(?<![\w-])assets/[\w./-]+?\.(?:css|js))(?![\w-])(?:\?v=[0-9a-f]+)?"
)

_cache = {}


def digest(path):
    """SHA-1 prefix of a file, or None if it isn't there."""
    if path not in _cache:
        try:
            with open(path, "rb") as fh:
                _cache[path] = hashlib.sha1(fh.read()).hexdigest()[:8]
        except OSError:
            _cache[path] = None
    return _cache[path]


def html_files():
    for dirpath, _dirnames, filenames in os.walk(ROOT):
        if any(s in dirpath for s in SKIP):
            continue
        for name in sorted(filenames):
            if name.endswith(".html"):
                yield os.path.join(dirpath, name)


def main():
    changed = 0
    stamped = {}
    missing = []

    for path in html_files():
        with open(path, encoding="utf-8") as fh:
            before = fh.read()

        here = os.path.dirname(path)

        def stamp(match):
            url = match.group(1)
            # a leading slash means "from the site root", anything else is
            # relative to the page doing the referencing
            base = ROOT if url.startswith("/") else here
            target = os.path.normpath(os.path.join(base, url.lstrip("/")))
            ver = digest(target)
            if ver is None:
                missing.append(f"{os.path.relpath(path, ROOT)} -> {url}")
                return match.group(0)
            stamped[os.path.relpath(target, ROOT)] = ver
            return f"{url}?v={ver}"

        after = ASSET.sub(stamp, before)

        if after != before:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(after)
            changed += 1
            print("  stamped", os.path.relpath(path, ROOT))

    if not stamped:
        print("stamp-css: no css or js references found under assets/", file=sys.stderr)
        return 1

    for ref in missing:
        print(f"  WARNING: referenced file does not exist: {ref}", file=sys.stderr)

    print(f"stamp-css: {len(stamped)} asset(s) hashed, {changed} file(s) updated")
    for rel, ver in sorted(stamped.items()):
        print(f"    {rel}?v={ver}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
