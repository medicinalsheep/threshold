"""
Headless Blender avatar export for Threshold.

  blender --background rig.blend --python export_avatar.py -- \\
    --object Armature --name StarterAvatar --output import --file starter_avatar.glb

Exports Y-up GLB with all actions as animation clips.
"""
from __future__ import annotations

import argparse
import os
import sys

import bpy

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_PKG = os.path.join(_SCRIPT_DIR, "threshold_blender")
if _PKG not in sys.path:
    sys.path.insert(0, _PKG)

from lod_export import slugify  # noqa: E402


def parse_cli() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser(description="Threshold avatar GLB export")
    parser.add_argument("--object", required=True, help="Armature or root object name")
    parser.add_argument("--name", default="StarterAvatar", help="Root node name in GLB")
    parser.add_argument("--output", default="import", help="Export directory")
    parser.add_argument("--file", default="", help="Output filename (default: slug.glb)")
    return parser.parse_args(argv)


def main() -> int:
    args = parse_cli()
    blend_name = args.object.strip()
    obj = bpy.data.objects.get(blend_name)
    if not obj:
        print(f"[avatar-export] object not found: {blend_name}", file=sys.stderr)
        return 1

    export_dir = os.path.abspath(args.output)
    os.makedirs(export_dir, exist_ok=True)
    root_name = args.name.strip() or "StarterAvatar"
    obj.name = root_name

    filename = args.file.strip() or f"{slugify(root_name)}.glb"
    filepath = os.path.join(export_dir, filename)

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    def select_tree(o):
        for ch in o.children:
            ch.select_set(True)
            select_tree(ch)
    select_tree(obj)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_def_bones=True,
        export_current_frame=False,
    )

    kb = os.path.getsize(filepath) / 1024
    print(f"[avatar-export] {filename} ({kb:.1f} KB) → {export_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())