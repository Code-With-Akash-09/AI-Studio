"""Tile rig-QA crops into labelled contact sheets (used by rig-qa.mjs).

Usage: python3 qa_tile.py manifest.json
manifest = {"sheets": [{"out": path, "title": str, "cols": int,
            "cell": [w, h], "cells": [{"img": png, "box": [x, y, w, h] | null,
            "label": str}]}]}
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont


def font(size):
    for f in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    manifest = json.load(open(sys.argv[1]))
    small, big = font(14), font(20)
    cache = {}
    for sheet in manifest["sheets"]:
        cw, ch = sheet["cell"]
        cols = sheet["cols"]
        cells = sheet["cells"]
        rows = (len(cells) + cols - 1) // cols
        top = 34
        out = Image.new("RGB", (cols * (cw + 4) + 4, top + rows * (ch + 22) + 4), "#202020")
        d = ImageDraw.Draw(out)
        d.text((6, 6), sheet.get("title", ""), fill="#FFFFFF", font=big)
        for i, c in enumerate(cells):
            r, k = divmod(i, cols)
            x0, y0 = 4 + k * (cw + 4), top + r * (ch + 22)
            if c["img"] not in cache:
                cache.clear()
                cache[c["img"]] = Image.open(c["img"]).convert("RGB")
            im = cache[c["img"]]
            if c.get("box"):
                x, y, w, h = c["box"]
                im = im.crop((int(x), int(y), int(x + w), int(y + h)))
            im = im.resize((cw, ch), Image.LANCZOS)
            out.paste(im, (x0, y0 + 20))
            d.text((x0 + 2, y0 + 2), c.get("label", ""), fill="#FFE066", font=small)
        out.save(sheet["out"])
        print(sheet["out"])


if __name__ == "__main__":
    main()
