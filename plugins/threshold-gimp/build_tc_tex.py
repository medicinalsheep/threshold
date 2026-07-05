"""
Build TC PBR textures + HILOD variants (GIMP Python-Fu).

Run inside GIMP after npm run gimp:install:
  Filters → Threshold → Build TC Textures (R6)

Or batch (GIMP 2.10+):
  gimp -i -b '(python-fu-threshold-build-tc-textures 1 0 0)' -b '(gimp-quit 0)'

Mirrors scripts/tc-gen-tex.cjs output → textures/tc_*_{slot}.png + HILOD + threshold_manifest.json
"""
from __future__ import annotations

import json
import math
import os
import random
from datetime import datetime, timezone

try:
    from gimpfu import *
except ImportError as exc:
    raise SystemExit(f"gimpfu required — run from GIMP: {exc}")

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CFG_PATH = os.path.join(_SCRIPT_DIR, "..", "..", "config", "tc-textures.json")
_MANIFEST = "threshold_manifest.json"
_HILOD = [("_512", 128), ("_1k", 256), ("_2k", 512)]
_REALISM = "r6"
_LICENSE = "Original — TC"


def _noise(x, y, seed=0.0):
    return (math.sin((x * 12.9898 + y * 78.233 + seed) * 43758.5453) % 1.0)


def _new_gray_image(w, h):
    img = gimp.Image(w, h, RGB)
    layer = gimp.Layer(img, "layer", w, h, RGB_IMAGE, 100, NORMAL_MODE)
    img.add_layer(layer, 0)
    return img, layer


def _fill_rgb(layer, w, h, fn):
    px = layer.get_pixel_rgn(0, 0, w, h, True, False)
    for y in range(h):
        for x in range(w):
            r, g, b = fn(x, y, w, h)
            px[x, y] = chr(int(r)) + chr(int(g)) + chr(int(b))
    gimp.progress_update(y / max(h - 1, 1))


def _export_png(image, drawable, filepath):
    os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)
    pdb.file_png_save_defaults(image, drawable, filepath, filepath)


def _scale_export(image, layer, filepath, max_px):
    w, h = image.width, image.height
    long_edge = max(w, h)
    if long_edge <= max_px:
        _export_png(image, layer, filepath)
        return
    if w >= h:
        nw, nh = max_px, max(1, int(h * max_px / w))
    else:
        nh, nw = max_px, max(1, int(w * max_px / h))
    dup = pdb.gimp_image_duplicate(image)
    dlayer = pdb.gimp_image_get_active_layer(dup)
    pdb.gimp_image_scale(dup, nw, nh)
    _export_png(dup, dlayer, filepath)
    pdb.gimp_image_delete(dup)


def _veh_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    stripe = abs(v - 0.52) < 0.03
    cabin = 0.2 < u < 0.8 and 0.55 < v < 0.78
    base = list(pal["trim"] if cabin else pal["body"])
    if stripe:
        base = list(pal["accent"])
    n = _noise(x, y, 3) * 18
    return tuple(min(255, c + n) for c in base)


def _veh_rough(x, y, w, h):
    u, v = x / w, y / h
    wheel = (u < 0.2 or u > 0.8) and (v < 0.35 or v > 0.65)
    base = 210 if wheel else 140
    return (min(255, base + _noise(x, y, 7) * 35),) * 3


def _veh_metal(x, y, w, h):
    u, v = x / w, y / h
    wheel = (u < 0.22 or u > 0.78) and (v < 0.38 or v > 0.62)
    val = 220 if wheel else 25
    return (val, val, val)


def _chr_albedo(x, y, w, h, pal):
    v = y / h
    badge = abs(v - 0.55) < 0.06 and w * 0.42 < x < w * 0.58
    if badge:
        base = pal["accent"]
    elif v > 0.72:
        base = pal["skin"]
    elif v < 0.42:
        base = pal["pants"]
    else:
        base = pal["shirt"]
    n = _noise(x, y, 11) * 12
    return tuple(min(255, c + n) for c in base)


def _chr_rough(x, y, w, h):
    v = y / h
    base = 175 if v > 0.7 else 155
    g = min(255, base + _noise(x, y, 13) * 30)
    return (g, g, g)


def _span_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    rail = u < 0.08 or u > 0.92
    line = abs(v - 0.5) < 0.02
    base = pal["rail"] if rail else pal["deck"]
    if line:
        base = pal["accent"]
    n = _noise(x, y, 17) * 10
    return tuple(min(255, c + n) for c in base)


def _span_rough(x, y, w, h):
    g = min(255, 165 + _noise(x, y, 19) * 25)
    return (g, g, g)


def _slot_fn(asset, slot):
    style = asset.get("style", "")
    pal = asset.get("palette", {})

    def wrap(fn):
        return lambda x, y, w, h: fn(x, y, w, h, pal) if "pal" in fn.__code__.co_varnames else fn(x, y, w, h)

    if style == "vehicle":
        if slot == "albedo":
            return lambda x, y, w, h: _veh_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _veh_rough(x, y, w, h)
        if slot == "metalness":
            return lambda x, y, w, h: _veh_metal(x, y, w, h)
    if style == "character":
        if slot == "albedo":
            return lambda x, y, w, h: _chr_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _chr_rough(x, y, w, h)
    if style == "span":
        if slot == "albedo":
            return lambda x, y, w, h: _span_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _span_rough(x, y, w, h)
    return lambda x, y, w, h: (128, 128, 128)


def _load_cfg():
    with open(_CFG_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_manifest(export_dir):
    path = os.path.join(export_dir, _MANIFEST)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    return {
        "format": "threshold-gimp-manifest",
        "formatVersion": 1,
        "textures": [],
    }


def threshold_build_tc_textures(export_dir):
    gimp.progress_init("Building TC textures (R6)…")
    cfg = _load_cfg()
    export_dir = os.path.abspath(export_dir or os.path.join(os.getcwd(), "textures"))
    os.makedirs(export_dir, exist_ok=True)
    base_size = int(cfg.get("baseSize", 256))
    entries = []

    total = sum(len(a.get("slots", [])) for a in cfg.get("assets", []))
    step = 0

    for asset in cfg.get("assets", []):
        slug = asset["slug"]
        for slot in asset.get("slots", []):
            step += 1
            gimp.progress_update(step / max(total, 1))
            gimp.progress_set_text(f"{slug}_{slot}")

            img, layer = _new_gray_image(base_size, base_size)
            _fill_rgb(layer, base_size, base_size, _slot_fn(asset, slot))
            gimp.displays_flush()

            base_name = f"{slug}_{slot}"
            full_path = os.path.join(export_dir, f"{base_name}.png")
            _export_png(img, layer, full_path)

            entry = {
                "id": f"{slug}_{slot}",
                "objectName": asset["objectName"],
                "slot": slot,
                "file": f"{base_name}.png",
                "path": f"textures/{base_name}.png",
                "tcEd": asset.get("tcEd", "tc-show"),
                "license": _LICENSE,
                "realism": _REALISM,
                "variants": [],
            }

            for suffix, max_px in _HILOD:
                vname = f"{base_name}{suffix}.png"
                vpath = os.path.join(export_dir, vname)
                _scale_export(img, layer, vpath, max_px)
                entry["variants"].append({
                    "suffix": suffix,
                    "file": vname,
                    "path": f"textures/{vname}",
                    "maxPx": max_px,
                })

            entries.append(entry)
            pdb.gimp_image_delete(img)

    manifest = _load_manifest(export_dir)
    drop = {(e["objectName"], e["slot"]) for e in entries}
    kept = [t for t in manifest.get("textures", []) if (t.get("objectName"), t.get("slot")) not in drop]
    manifest["textures"] = kept + entries
    manifest["exportDir"] = "textures"
    manifest["tcRealism"] = _REALISM
    manifest["exportedAt"] = datetime.now(timezone.utc).isoformat()

    with open(os.path.join(export_dir, _MANIFEST), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    gimp.progress_end()
    gimp.message(
        f"TC textures (R6) exported.\n"
        f"Maps: {len(entries)} slot groups\n"
        f"HILOD: _512 / _1k / _2k per slot\n"
        f"Folder: {export_dir}\n"
        f"Lobby TC → auto-applies on spawn"
    )


register(
    "python-fu-threshold-build-tc-textures",
    "Build TC PBR textures + HILOD (R6)",
    "Procedural TC vehicle/character/span maps → textures/ + threshold_manifest.json",
    "Threshold Team",
    "Threshold Team",
    "2026",
    "<Image>/Filters/Threshold/Build TC Textures (R6)...",
    "",
    [
        (PF_DIRNAME, "export_dir", "Export folder", os.path.join(os.getcwd(), "textures")),
    ],
    [],
    threshold_build_tc_textures,
)

main()