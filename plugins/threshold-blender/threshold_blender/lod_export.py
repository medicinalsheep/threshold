"""LOD export helpers — Threshold Blender addon + headless CLI."""
from __future__ import annotations

import os
import re

import bpy

LOD_DISTANCES = [0, 12, 28]
LOD_SUFFIXES = ("_LOD1", "_LOD2", "_lod1", "_lod2")


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (name or "model").strip().lower())
    return s.strip("_") or "model"


def export_selection_gltf(filepath: str) -> None:
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


def find_lod_objects(base_name: str) -> list:
    found = []
    seen = set()
    for suffix in LOD_SUFFIXES:
        obj = bpy.data.objects.get(f"{base_name}{suffix}")
        if obj and obj.name not in seen:
            found.append(obj)
            seen.add(obj.name)
    return found[:2]


def build_lod_entries(
    display_name: str,
    blend_obj,
    export_dir: str,
    *,
    export_lods: bool = True,
    slug: str | None = None,
) -> tuple[str, list[dict]]:
    slug = slug or slugify(display_name)
    rel_dir = os.path.basename(export_dir.rstrip("/\\")) or "import"

    filepath0 = os.path.join(export_dir, f"{slug}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    blend_obj.select_set(True)
    bpy.context.view_layer.objects.active = blend_obj
    export_selection_gltf(filepath0)

    lods = [
        {
            "level": 0,
            "file": f"{slug}.glb",
            "path": f"{rel_dir}/{slug}.glb".replace("\\", "/"),
            "distance": LOD_DISTANCES[0],
        }
    ]

    if export_lods:
        for i, lod_obj in enumerate(find_lod_objects(blend_obj.name), start=1):
            fn = f"{slug}_lod{i}.glb"
            fp = os.path.join(export_dir, fn)
            bpy.ops.object.select_all(action="DESELECT")
            lod_obj.select_set(True)
            bpy.context.view_layer.objects.active = lod_obj
            export_selection_gltf(fp)
            dist = LOD_DISTANCES[i] if i < len(LOD_DISTANCES) else LOD_DISTANCES[-1] + (i - 2) * 12
            lods.append(
                {
                    "level": i,
                    "file": fn,
                    "path": f"{rel_dir}/{fn}".replace("\\", "/"),
                    "distance": dist,
                }
            )

    return filepath0, lods