"""
Headless Threshold GLTF export — no UI required.

  blender --background scene.blend --python headless_export.py -- \\
    --object "Stone Block" [--blend-object Cube] [--output import] [--lod] [--no-physics]
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import bpy

MANIFEST_NAME = "threshold_blender_manifest.json"
MANIFEST_FORMAT = "threshold-blender-manifest"
ENGINE_VERSION = "4.6.0"

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PKG = os.path.join(_SCRIPT_DIR, "threshold_blender")
if _PKG not in sys.path:
    sys.path.insert(0, _PKG)

from lod_export import build_lod_entries, slugify  # noqa: E402


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
    parser.add_argument("--lod", action="store_true", help="Export LOD1/LOD2 objects ({name}_LOD1, _LOD2)")
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
    models = [m for m in models if m.get("objectName") != entry.get("objectName")]
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

    export_dir = os.path.abspath(args.output)
    os.makedirs(export_dir, exist_ok=True)

    slug = slugify(display_name)
    filepath, lods = build_lod_entries(
        display_name,
        obj,
        export_dir,
        export_lods=args.lod,
        slug=slug,
    )

    filename = os.path.basename(filepath)
    entry = {
        "id": slug,
        "objectName": display_name,
        "file": filename,
        "path": lods[0]["path"],
        "lods": lods,
        "lodDistances": [lod["distance"] for lod in lods],
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
    if len(lods) > 1:
        print(f"[threshold] LOD chain: {len(lods)} level(s)")
    print(f"[threshold] Manifest {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())