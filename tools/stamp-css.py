#!/usr/bin/env python3
"""
Cache-buster for the stylesheet.

Browsers, and phone browsers especially, hold on to a CSS file long after the
HTML that references it has changed. The symptom is always the same and always
confusing: a change looks correct on the machine you edited it on, and looks
missing on your phone. Nothing is wrong with the site. The phone is showing a
stylesheet it downloaded days ago.

The fix is to change the URL whenever the file changes, so the browser has no
cached copy to reach for. This rewrites every

    assets/site.css              ->  assets/site.css?v=<hash>
    assets/site.css?v=<old>      ->  assets/site.css?v=<new>

where <hash> is the first 8 characters of the SHA-1 of site.css itself. Same
file, same hash, no churn in git. Changed file, new hash, guaranteed refresh.

Run it before publishing:
    python3 tools/stamp-css.py
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "assets", "site.css")
JS = os.path.join(ROOT, "assets", "site.js")
SKIP = ("audit-before", "renders", ".git", "_preview", "node_modules")


def digest(path):
    with open(path, "rb") as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:8]


def html_files():
    for dirpath, _dirnames, filenames in os.walk(ROOT):
        if any(s in dirpath for s in SKIP):
            continue
        for name in sorted(filenames):
            if name.endswith(".html"):
                yield os.path.join(dirpath, name)


def main():
    if not os.path.exists(CSS):
        print("stamp-css: assets/site.css not found", file=sys.stderr)
        return 1

    stamps = {"site.css": digest(CSS)}
    if os.path.exists(JS):
        stamps["site.js"] = digest(JS)

    changed = 0
    for path in html_files():
        with open(path, encoding="utf-8") as fh:
            before = fh.read()
        after = before
        for asset, ver in stamps.items():
            # matches assets/site.css and assets/site.css?v=anything,
            # at any depth, and normalises both to the current hash
            after = re.sub(
                r"((?:\.\./|/)?assets/" + re.escape(asset) + r")(?:\?v=[0-9a-f]+)?",
                r"\1?v=" + ver,
                after,
            )
        if after != before:
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(after)
            changed += 1
            print("  stamped", os.path.relpath(path, ROOT))

    versions = ", ".join(f"{k}?v={v}" for k, v in stamps.items())
    print(f"stamp-css: {versions} ({changed} file(s) updated)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
