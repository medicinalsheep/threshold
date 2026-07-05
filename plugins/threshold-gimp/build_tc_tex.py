"""
Build TC PBR textures + HILOD variants (GIMP Python-Fu) — parity with scripts/tc-gen-tex.cjs (r8).

Run inside GIMP after npm run gimp:install:
  Filters → Threshold → Build TC Textures (R8)

Batch:
  gimp -i -b '(python-fu-threshold-build-tc-textures 1 0 0)' -b '(gimp-quit 0)'
"""
from __future__ import annotations

import json
import math
import os
from datetime import datetime, timezone

try:
    from gimpfu import *
except ImportError as exc:
    raise SystemExit(f"gimpfu required — run from GIMP: {exc}")

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CFG_PATH = os.path.join(_SCRIPT_DIR, "..", "..", "config", "tc-textures.json")
_MANIFEST = "threshold_manifest.json"
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


def _surface_normal(x, y, seed=71, strength=0.85):
    hx = _noise(x + 1, y, seed) - _noise(x - 1, y, seed)
    hy = _noise(x, y + 1, seed + 1) - _noise(x, y - 1, seed + 1)
    nx, ny, nz = -hx * strength, -hy * strength, 1.0
    ln = math.hypot(nx, ny, nz) or 1.0
    return (
        int((nx / ln * 0.5 + 0.5) * 255),
        int((ny / ln * 0.5 + 0.5) * 255),
        int((nz / ln * 0.5 + 0.5) * 255),
    )


# --- style generators (mirror tc-gen-tex.cjs) ---

def _veh_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    stripe = abs(v - 0.52) < 0.03
    cabin = 0.2 < u < 0.8 and 0.55 < v < 0.78
    base = list(pal.get("trim" if cabin else "body", [128, 128, 128]))
    if stripe:
        base = list(pal.get("accent", base))
    n = _noise(x, y, 3) * 18
    return tuple(min(255, c + n) for c in base)


def _veh_rough(x, y, w, h):
    u, v = x / w, y / h
    wheel = (u < 0.2 or u > 0.8) and (v < 0.35 or v > 0.65)
    base = 210 if wheel else 140
    g = min(255, base + _noise(x, y, 7) * 35)
    return (g, g, g)


def _veh_metal(x, y, w, h):
    u, v = x / w, y / h
    wheel = (u < 0.22 or u > 0.78) and (v < 0.38 or v > 0.62)
    val = 220 if wheel else 25
    return (val, val, val)


def _chr_albedo(x, y, w, h, pal):
    v = y / h
    badge = abs(v - 0.55) < 0.06 and w * 0.42 < x < w * 0.58
    if badge:
        base = pal.get("accent", [128, 128, 128])
    elif v > 0.72:
        base = pal.get("skin", [255, 212, 184])
    elif v < 0.42:
        base = pal.get("pants", [32, 32, 32])
    else:
        base = pal.get("shirt", [64, 64, 128])
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
    base = pal.get("rail" if rail else "deck", [64, 64, 64])
    if line:
        base = pal.get("accent", base)
    n = _noise(x, y, 17) * 10
    return tuple(min(255, c + n) for c in base)


def _span_rough(x, y, w, h):
    g = min(255, 165 + _noise(x, y, 19) * 25)
    return (g, g, g)


def _concrete_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    ring = math.hypot(u - 0.5, v - 0.5)
    edge = 0.38 < ring < 0.44
    base = list(pal.get("ring" if edge else "base", [48, 48, 48]))
    n = _noise(x, y, 23) * 14
    speck = 18 if _noise(x * 2, y * 2, 29) > 0.92 else 0
    return tuple(min(255, c + n + speck) for c in base)


def _concrete_rough(x, y, w, h):
    g = min(255, 198 + _noise(x, y, 31) * 22)
    return (g, g, g)


def _wall_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    panel = int(v * 5) % 2 == 0
    seam = abs((u * 8) % 1 - 0.5) < 0.04 or abs((v * 5) % 1 - 0.5) < 0.03
    base = list(pal.get("base" if panel else "speck", [64, 64, 64]))
    if seam:
        base = list(pal.get("ring", base))
    n = _noise(x, y, 53) * 11
    return tuple(min(255, c + n) for c in base)


def _wall_rough(x, y, w, h):
    g = min(255, 192 + _noise(x, y, 57) * 28)
    return (g, g, g)


def _stripe_albedo(x, y, w, h, pal):
    u = x / w
    stripe = int(u * 14) % 2 == 0
    base = pal.get("paint" if stripe else "asphalt", [200, 180, 60])
    n = _noise(x, y, 61) * 8
    return tuple(min(255, c + n) for c in base)


def _stripe_rough(x, y, w, h):
    g = min(255, 175 + _noise(x, y, 63) * 20)
    return (g, g, g)


def _terminal_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    screen = 0.18 < u < 0.82 and 0.52 < v < 0.82
    trim = v < 0.2 or v > 0.88
    base = list(pal.get("body", [40, 40, 48]))
    if screen:
        base = list(pal.get("screen", base))
    if trim:
        base = list(pal.get("trim", base))
    n = _noise(x, y, 37) * 10
    return tuple(min(255, c + n) for c in base)


def _terminal_rough(x, y, w, h):
    v = y / h
    screen = 0.52 < v < 0.82
    base = 95 if screen else 175
    g = min(255, base + _noise(x, y, 41) * 20)
    return (g, g, g)


def _terminal_metal(x, y, w, h):
    v = y / h
    bezel = 0.48 < v < 0.86
    val = 140 if bezel else 18
    g = min(255, val + _noise(x, y, 43) * 12)
    return (g, g, g)


def _grass_albedo(x, y, w, h, pal):
    blade = math.sin((x / w) * 48 + _noise(x, y, 81) * 4) > 0.1
    base = list(pal.get("blade" if blade else "dark", [48, 92, 42]))
    n = _noise(x * 3, y * 3, 83) * 16
    speck = 22 if _noise(x, y, 87) > 0.94 else 0
    return (min(255, base[0] + n + speck), min(255, base[1] + n + speck), min(255, base[2] + n))


def _grass_rough(x, y, w, h):
    g = min(255, 210 + _noise(x, y, 89) * 28)
    return (g, g, g)


def _wood_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    plank = int(v * 6) % 2 == 0
    grain = math.sin(u * 42 + _noise(x, y, 91) * 2) * 0.5 + 0.5
    base = list(pal.get("grain" if plank else "dark", [118, 88, 58]))
    if grain > 0.72:
        base = list(pal.get("ring", base))
    gap = abs((v * 6) % 1 - 0.5) < 0.03
    if gap:
        base = [max(0, c - 28) for c in base]
    n = _noise(x, y, 93) * 10
    return tuple(min(255, c + n) for c in base)


def _wood_rough(x, y, w, h):
    g = min(255, 178 + _noise(x, y, 95) * 24)
    return (g, g, g)


def _gravel_albedo(x, y, w, h, pal):
    cell = _noise(int(x / 4), int(y / 4), 97)
    base = pal.get("stone" if cell > 0.55 else "dark", [98, 96, 92])
    speck = pal.get("speck", base) if _noise(x, y, 99) > 0.9 else base
    n = _noise(x, y, 101) * 12
    return tuple(min(255, c + n) for c in speck)


def _gravel_rough(x, y, w, h):
    g = min(255, 205 + _noise(x, y, 103) * 30)
    return (g, g, g)


def _asphalt_albedo(x, y, w, h, pal):
    crack = _noise(x, y, 105) > 0.97
    base = list(pal.get("crack" if crack else "base", [36, 38, 42]))
    n = _noise(x, y, 107) * 9
    speck = 14 if _noise(x * 2, y * 2, 109) > 0.93 else 0
    return tuple(min(255, c + n + speck) for c in base)


def _asphalt_rough(x, y, w, h):
    g = min(255, 200 + _noise(x, y, 111) * 22)
    return (g, g, g)


def _fabric_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    weave = (int(u * 24) + int(v * 24)) % 2 == 0
    base = list(pal.get("weave" if weave else "thread", [88, 72, 118]))
    fold = math.sin(v * 8) * 0.08
    shade = list(pal.get("shadow", base)) if fold < -0.04 else base
    n = _noise(x, y, 113) * 8
    return tuple(min(255, c + n) for c in shade)


def _fabric_rough(x, y, w, h):
    g = min(255, 220 + _noise(x, y, 115) * 18)
    return (g, g, g)


def _metal_grate_albedo(x, y, w, h, pal):
    u, v = x / w, y / h
    slot = (int(u * 16) % 2 == 0) and (int(v * 16) % 2 == 0)
    edge = u < 0.06 or u > 0.94 or v < 0.06 or v > 0.94
    base = list(pal.get("slot" if slot else "plate", [72, 76, 82]))
    if edge:
        base = list(pal.get("edge", base))
    n = _noise(x, y, 117) * 10
    return tuple(min(255, c + n) for c in base)


def _metal_grate_rough(x, y, w, h):
    g = min(255, 155 + _noise(x, y, 119) * 20)
    return (g, g, g)


def _metal_grate_metal(x, y, w, h):
    u, v = x / w, y / h
    slot = (int(u * 16) % 2 == 0) and (int(v * 16) % 2 == 0)
    val = 35 if slot else 195
    g = min(255, val + _noise(x, y, 121) * 15)
    return (g, g, g)


def _slot_fn(asset, slot):
    style = asset.get("style", "")
    pal = asset.get("palette", {})

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
    if style == "concrete":
        if slot == "albedo":
            return lambda x, y, w, h: _concrete_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _concrete_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 71, 0.75)
    if style == "wall":
        if slot == "albedo":
            return lambda x, y, w, h: _wall_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _wall_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 73, 0.9)
    if style == "stripe":
        if slot == "albedo":
            return lambda x, y, w, h: _stripe_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _stripe_rough(x, y, w, h)
    if style == "terminal":
        if slot == "albedo":
            return lambda x, y, w, h: _terminal_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _terminal_rough(x, y, w, h)
        if slot == "metalness":
            return lambda x, y, w, h: _terminal_metal(x, y, w, h)
    if style == "grass":
        if slot == "albedo":
            return lambda x, y, w, h: _grass_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _grass_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 125, 0.65)
    if style == "wood":
        if slot == "albedo":
            return lambda x, y, w, h: _wood_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _wood_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 127, 0.55)
    if style == "gravel":
        if slot == "albedo":
            return lambda x, y, w, h: _gravel_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _gravel_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 129, 0.95)
    if style == "asphalt":
        if slot == "albedo":
            return lambda x, y, w, h: _asphalt_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _asphalt_rough(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 131, 0.45)
    if style == "fabric":
        if slot == "albedo":
            return lambda x, y, w, h: _fabric_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _fabric_rough(x, y, w, h)
    if style == "metal_grate":
        if slot == "albedo":
            return lambda x, y, w, h: _metal_grate_albedo(x, y, w, h, pal)
        if slot == "roughness":
            return lambda x, y, w, h: _metal_grate_rough(x, y, w, h)
        if slot == "metalness":
            return lambda x, y, w, h: _metal_grate_metal(x, y, w, h)
        if slot == "normal":
            return lambda x, y, w, h: _surface_normal(x, y, 133, 0.7)
    return lambda x, y, w, h: (128, 128, 128)


def _load_cfg():
    with open(_CFG_PATH, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _load_manifest(export_dir):
    path = os.path.join(export_dir, _MANIFEST)
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    return {"format": "threshold-gimp-manifest", "formatVersion": 1, "textures": []}


def threshold_build_tc_textures(export_dir):
    cfg = _load_cfg()
    realism = cfg.get("realism", "r8")
    hilod = [(h["suffix"], int(h["maxPx"])) for h in cfg.get("hilod", [])]
    if not hilod:
        hilod = [("_512", 128), ("_1k", 256), ("_2k", 512), ("_4k", 1024)]

    gimp.progress_init(f"Building TC textures ({realism})…")
    export_dir = os.path.abspath(export_dir or os.path.join(os.getcwd(), "textures"))
    os.makedirs(export_dir, exist_ok=True)
    base_size = int(cfg.get("baseSize", 512))
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
                "realism": realism,
                "variants": [],
            }

            for suffix, max_px in hilod:
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
    manifest["tcRealism"] = realism
    manifest["exportedAt"] = datetime.now(timezone.utc).isoformat()

    with open(os.path.join(export_dir, _MANIFEST), "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    gimp.progress_end()
    gimp.message(
        f"TC textures ({realism}) exported.\n"
        f"Slots: {len(entries)} · HILOD tiers: {len(hilod)}\n"
        f"Folder: {export_dir}\n"
        f"Next: npm run tex:compress && npm run bundle:assets"
    )


register(
    "python-fu-threshold-build-tc-textures",
    "Build TC PBR textures + HILOD (R8)",
    "Full parity with tc-gen-tex.cjs — all surface styles from config/tc-textures.json",
    "Threshold Team",
    "Threshold Team",
    "2026",
    "<Image>/Filters/Threshold/Build TC Textures (R8)...",
    "",
    [
        (PF_DIRNAME, "export_dir", "Export folder", os.path.join(os.getcwd(), "textures")),
    ],
    [],
    threshold_build_tc_textures,
)

main()