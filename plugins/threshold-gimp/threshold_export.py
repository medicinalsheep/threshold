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
ENGINE_VERSION = "4.0.0"


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

    if export_albedo:
        bump("Exporting albedo…")
        filename = f"{slug}_albedo.png"
        filepath = os.path.join(export_dir, filename)
        export_drawable_png(image, drawable, filepath)
        entries.append(
            {
                "id": f"{slug}_albedo",
                "objectName": display_name,
                "slot": "albedo",
                "file": filename,
                "path": rel_path(export_dir, filename),
            }
        )

    if export_roughness:
        bump("Exporting roughness…")
        layer = find_layer_by_name(image, rough_layer)
        if layer:
            filename = f"{slug}_roughness.png"
            filepath = os.path.join(export_dir, filename)
            export_drawable_png(image, layer, filepath)
            entries.append(
                {
                    "id": f"{slug}_roughness",
                    "objectName": display_name,
                    "slot": "roughness",
                    "file": filename,
                    "path": rel_path(export_dir, filename),
                }
            )
        else:
            gimp.message(f'Roughness layer "{rough_layer}" not found — skipped.')

    if export_metalness:
        bump("Exporting metalness…")
        layer = find_layer_by_name(image, metal_layer)
        if layer:
            filename = f"{slug}_metalness.png"
            filepath = os.path.join(export_dir, filename)
            export_drawable_png(image, layer, filepath)
            entries.append(
                {
                    "id": f"{slug}_metalness",
                    "objectName": display_name,
                    "slot": "metalness",
                    "file": filename,
                    "path": rel_path(export_dir, filename),
                }
            )
        else:
            gimp.message(f'Metalness layer "{metal_layer}" not found — skipped.')

    if export_normal:
        bump("Exporting normal map…")
        layer = find_layer_by_name(image, normal_layer)
        if layer:
            filename = f"{slug}_normal.png"
            filepath = os.path.join(export_dir, filename)
            export_drawable_png(image, layer, filepath)
            entries.append(
                {
                    "id": f"{slug}_normal",
                    "objectName": display_name,
                    "slot": "normal",
                    "file": filename,
                    "path": rel_path(export_dir, filename),
                }
            )
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
    ],
    [],
    threshold_export_pbr,
)

main()