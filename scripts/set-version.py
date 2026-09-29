#!/usr/bin/env python3
"""Verziószám beállítása minden helyen, ahol szerepelnie kell.

Használat:  python3 scripts/set-version.py 1.4.0

Miért kell: a statikus fájlok URL-jébe beégetett ?v=<verzió> az, ami garantálja,
hogy egy új kiadás után a telefon tényleg az új JS/CSS-t tölti be, és nem a
service worker gyorsítótárában ülő régit.
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

def sub(path, pattern, repl, expect_min=1):
    p = ROOT / path
    text = p.read_text(encoding="utf-8")
    new, n = re.subn(pattern, repl, text)
    if n < expect_min:
        sys.exit(f"HIBA: {path} – a minta nem illeszkedett ({n} találat): {pattern}")
    p.write_text(new, encoding="utf-8")
    return n

def main():
    if len(sys.argv) != 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        sys.exit("Használat: set-version.py <major.minor.patch>")
    v = sys.argv[1]

    n = sub("index.html", r'((?:href|src)="(?:css|js)/[^"?]+)(?:\?v=[\d.]+)?"', rf'\1?v={v}"', 6)
    print(f"index.html: {n} hivatkozás")

    n = sub("sw.js", r"var VERSION = '[\d.]+';", f"var VERSION = '{v}';")
    n += sub("sw.js", r"(\./(?:css|js)/[^'?]+?)(?:\?v=[\d.]+)?'", rf"\1?v={v}'", 6)
    print(f"sw.js: {n} csere")

    n = sub("js/app.js", r"var APP_VERSION = '[\d.]+';", f"var APP_VERSION = '{v}';")
    print(f"js/app.js: {n} csere")
    print(f"\nKész – verzió: {v}")

if __name__ == "__main__":
    main()
