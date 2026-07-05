"""
Headless Threshold GLTF export — no UI required.

  blender --background scene.blend --python headless_export.py -- \\
    --object "Stone Block" [--blend-object Cube] [--output import] [--no-physics]
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone

import bpy

MANIFEST_NAME = "threshold_blender_manifest.json"
MANIFEST_FORMAT = "threshold-blender-manifest"
ENGINE_VERSION = "4.0.0"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (name or "model").strip().lower())
    return s.strip("_") or "model"


def parse_cli() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    parser = argparse.ArgumentParser(description="Threshold headless GLTF export")
    parser.add_argument("--object", required=True, help="Engine object name")
    parser.add_argument("--blend-object", default="", help="Blender object name (defaults to --object)")
    parser.add_argument("--output", default="import", help="Export directory")
    parser.add_argument("--no-physics", action="store_true", help="Disable physics metadata")
    parser.add_argument("--mass", type=float, default=1.0)
    parser.add_argument("--friction", type=float, default=0.3)
    parser.add_argument("--restitution", type=float, default=0.5)
    return parser.parse_args(argv)


def load_manifest(path: str) -> dict:
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            return data
    return {
        "format": MANIFEST_FORMAT,
        "formatVersion": 1,
        "engineVersion": ENGINE_VERSION,
        "models": [],
    }


def merge_manifest(manifest: dict, export_dir: str, entry: dict) -> dict:
    manifest["format"] = MANIFEST_FORMAT
    manifest["formatVersion"] = 1
    manifest["engineVersion"] = ENGINE_VERSION
    manifest["exportedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["exportDir"] = export_dir.replace("\\", "/")

    models = manifest.get("models") or []
    models = [
        m
        for m in models
        if not (
            m.get("objectName") == entry.get("objectName")
            and m.get("file") == entry.get("file")
        )
    ]
    models.append(entry)
    manifest["models"] = models
    return manifest


def main() -> int:
    args = parse_cli()
    display_name = args.object.strip()
    blend_name = (args.blend_object or args.object).strip()
    obj = bpy.data.objects.get(blend_name)

    if not obj:
        print(f"[threshold] Blender object not found: {blend_name}", file=sys.stderr)
        return 1

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    export_dir = os.path.abspath(args.output)
    os.makedirs(export_dir, exist_ok=True)

    slug = slugify(display_name)
    filepath = os.path.join(export_dir, f"{slug}.glb")

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )

    rel_dir = os.path.basename(export_dir.rstrip("/\\")) or "import"
    filename = os.path.basename(filepath)
    entry = {
        "id": slug,
        "objectName": display_name,
        "file": filename,
        "path": f"{rel_dir}/{filename}".replace("\\", "/"),
        "hasPhysics": not args.no_physics,
        "mass": args.mass,
        "friction": args.friction,
        "restitution": args.restitution,
    }

    manifest_path = os.path.join(export_dir, MANIFEST_NAME)
    manifest = merge_manifest(load_manifest(manifest_path), export_dir, entry)
    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print(f"[threshold] Exported {filepath}")
    print(f"[threshold] Manifest {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())