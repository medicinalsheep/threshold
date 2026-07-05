#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Threshold GIMP plugin — export PBR maps + threshold_manifest.json
Install: npm run gimp:install  (or copy to GIMP plug-ins folder)
Menu: Filters → Threshold → Export PBR Maps...
GIMP 2.10+ (Python-Fu / gimpfu)
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone

try:
    from gimpfu import *
except ImportError as exc:
    raise SystemExit(
        "gimpfu not found — run this script from GIMP (Python-Fu).\n"
        f"Import error: {exc}"
    )


MANIFEST_NAME = "threshold_manifest.json"
MANIFEST_FORMAT = "threshold-gimp-manifest"
ENGINE_VERSION = "4.7.0"
HILOD_VARIANTS = [(512, "_512"), (1024, "_1k"), (2048, "_2k")]


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (name or "object").strip().lower())
    return s.strip("_") or "object"


def find_layer_by_name(image, name: str):
    target = (name or "").strip().lower()
    if not target:
        return None
    for layer in image.layers:
        if layer.name.lower() == target:
            return layer
    return None


def export_drawable_png(image, drawable, filepath: str) -> None:
    folder = os.path.dirname(filepath)
    if folder:
        os.makedirs(folder, exist_ok=True)
    pdb.file_png_save_defaults(image, drawable, filepath, filepath)


def export_layer_scaled(image, layer, filepath: str, max_px: int) -> None:
    width = pdb.gimp_drawable_width(layer)
    height = pdb.gimp_drawable_height(layer)
    long_edge = max(width, height)
    if long_edge <= max_px:
        export_drawable_png(image, layer, filepath)
        return
    if width >= height:
        new_width = max_px
        new_height = max(1, int(height * max_px / width))
    else:
        new_height = max_px
        new_width = max(1, int(width * max_px / height))
    pdb.gimp_image_set_active_layer(image, layer)
    dup_image = pdb.gimp_image_duplicate(image)
    dup_layer = pdb.gimp_image_get_active_layer(dup_image)
    pdb.gimp_image_scale(dup_image, new_width, new_height)
    export_drawable_png(dup_image, dup_layer, filepath)
    pdb.gimp_image_delete(dup_image)


def export_slot_with_hilod(image, layer, export_dir: str, slug: str, slot: str, export_hilod: bool) -> dict:
    filename = f"{slug}_{slot}.png"
    filepath = os.path.join(export_dir, filename)
    export_drawable_png(image, layer, filepath)
    entry = {
        "id": f"{slug}_{slot}",
        "objectName": None,
        "slot": slot,
        "file": filename,
        "path": rel_path(export_dir, filename),
        "variants": [],
    }
    if export_hilod:
        base, ext = os.path.splitext(filepath)
        for max_px, suffix in HILOD_VARIANTS:
            variant_name = f"{slug}_{slot}{suffix}{ext}"
            variant_path = os.path.join(export_dir, variant_name)
            export_layer_scaled(image, layer, variant_path, max_px)
            entry["variants"].append(
                {
                    "suffix": suffix,
                    "file": variant_name,
                    "path": rel_path(export_dir, variant_name),
                    "maxPx": max_px,
                }
            )
    return entry


def rel_path(export_dir: str, filename: str) -> str:
    base = os.path.basename(export_dir.rstrip("/\\")) or "textures"
    return f"{base}/{filename}".replace("\\", "/")


def load_manifest(manifest_path: str) -> dict:
    if os.path.isfile(manifest_path):
        with open(manifest_path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            return data
    return {
        "format": MANIFEST_FORMAT,
        "formatVersion": 1,
        "engineVersion": ENGINE_VERSION,
        "textures": [],
    }


def merge_manifest(manifest: dict, export_dir: str, new_entries: list) -> dict:
    manifest["format"] = MANIFEST_FORMAT
    manifest["formatVersion"] = 1
    manifest["engineVersion"] = ENGINE_VERSION
    manifest["exportedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["exportDir"] = export_dir.replace("\\", "/")

    existing = manifest.get("textures") or []
    drop = {(e.get("objectName"), e.get("slot")) for e in new_entries}
    kept = [
        t
        for t in existing
        if (t.get("objectName"), t.get("slot")) not in drop
    ]
    manifest["textures"] = kept + new_entries
    return manifest


def save_manifest(manifest_path: str, manifest: dict) -> None:
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")


def threshold_export_pbr(
    image,
    drawable,
    object_name,
    export_dir,
    export_albedo,
    export_roughness,
    rough_layer,
    export_metalness,
    metal_layer,
    export_normal,
    normal_layer,
    export_hilod,
):
    gimp.progress_init("Exporting Threshold PBR maps…")

    export_dir = os.path.abspath(export_dir or "textures")
    os.makedirs(export_dir, exist_ok=True)

    slug = slugify(object_name)
    display_name = (object_name or "Object").strip() or "Object"
    entries = []
    step = 0
    total = sum(
        [
            1 if export_albedo else 0,
            1 if export_roughness else 0,
            1 if export_metalness else 0,
            1 if export_normal else 0,
        ]
    ) or 1

    def bump(msg: str) -> None:
        nonlocal step
        step += 1
        gimp.progress_update(step / total)
        gimp.progress_set_text(msg)

    def append_entry(entry: dict) -> None:
        entry["objectName"] = display_name
        entries.append(entry)

    if export_albedo:
        bump("Exporting albedo…")
        append_entry(export_slot_with_hilod(image, drawable, export_dir, slug, "albedo", export_hilod))

    if export_roughness:
        bump("Exporting roughness…")
        layer = find_layer_by_name(image, rough_layer)
        if layer:
            append_entry(export_slot_with_hilod(image, layer, export_dir, slug, "roughness", export_hilod))
        else:
            gimp.message(f'Roughness layer "{rough_layer}" not found — skipped.')

    if export_metalness:
        bump("Exporting metalness…")
        layer = find_layer_by_name(image, metal_layer)
        if layer:
            append_entry(export_slot_with_hilod(image, layer, export_dir, slug, "metalness", export_hilod))
        else:
            gimp.message(f'Metalness layer "{metal_layer}" not found — skipped.')

    if export_normal:
        bump("Exporting normal map…")
        layer = find_layer_by_name(image, normal_layer)
        if layer:
            append_entry(export_slot_with_hilod(image, layer, export_dir, slug, "normal", export_hilod))
        else:
            gimp.message(f'Normal layer "{normal_layer}" not found — skipped.')

    manifest_path = os.path.join(export_dir, MANIFEST_NAME)
    manifest = merge_manifest(load_manifest(manifest_path), export_dir, entries)
    save_manifest(manifest_path, manifest)

    gimp.progress_end()
    gimp.message(
        f"Threshold export complete.\n"
        f"Object: {display_name}\n"
        f"Maps: {len(entries)}\n"
        f"HILOD: {'512/1K/2K variants' if export_hilod else 'full-res only'}\n"
        f"Folder: {export_dir}\n"
        f"Manifest: {manifest_path}\n\n"
        f"In Engine: select mesh → Texture tab → GIMP SYNC"
    )


register(
    "python-fu-threshold-export-pbr",
    "Export PBR texture maps for Threshold Engine",
    "Exports albedo/roughness/metalness/normal layers to a textures folder "
    "and updates threshold_manifest.json for Engine GIMP SYNC.",
    "Threshold Team",
    "Threshold Team",
    "2026",
    "<Image>/Filters/Threshold/Export PBR Maps...",
    "",
    [
        (
            PF_STRING,
            "object_name",
            "Object name (must match Engine mesh name)",
            "Stone Block",
        ),
        (
            PF_DIRNAME,
            "export_dir",
            "Export folder",
            os.path.join(os.getcwd(), "textures"),
        ),
        (PF_TOGGLE, "export_albedo", "Export albedo (active layer)", True),
        (PF_TOGGLE, "export_roughness", "Export roughness layer", True),
        (PF_STRING, "rough_layer", "Roughness layer name", "roughness"),
        (PF_TOGGLE, "export_metalness", "Export metalness layer", True),
        (PF_STRING, "metal_layer", "Metalness layer name", "metalness"),
        (PF_TOGGLE, "export_normal", "Export normal map (optional)", False),
        (PF_STRING, "normal_layer", "Normal layer name", "normal"),
        (PF_TOGGLE, "export_hilod", "Export HILOD variants (_512/_1k/_2k)", True),
    ],
    [],
    threshold_export_pbr,
)

main()