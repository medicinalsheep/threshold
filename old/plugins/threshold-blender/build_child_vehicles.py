"""
Build Threshold Child vehicle .blend for R2 — original meshes + LOD duplicates.

  blender --background --python build_child_vehicles.py
  npm run child:vehicles:blender

Then export with headless_export.py (--lod) per vehicle.
"""
from __future__ import annotations

import os
import sys

import bpy
from mathutils import Vector

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_OUT_BLEND = os.path.join(_SCRIPT_DIR, "child_vehicles.blend")


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat(name: str, color, roughness=0.45, metallic=0.35):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return m


def box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    obj.data.materials.append(material)
    return obj


def vehicle_runner(name: str, detail: str = "full") -> bpy.types.Object:
    body_m = mat(f"{name}_body", (0.1, 0.16, 0.27), 0.32, 0.58)
    trim_m = mat(f"{name}_trim", (0.05, 0.08, 0.12), 0.38, 0.42)
    accent_m = mat(f"{name}_accent", (0.22, 1.0, 0.08), 0.18, 0.2)

    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_proxy", (1.8, 0.9, 3.8), (0, 0.45, 0), body_m))
    else:
        parts.append(box(f"{name}_chassis", (1.75, 0.38, 3.5), (0, 0.32, 0), body_m))
        parts.append(box(f"{name}_deck", (1.55, 0.22, 2.8), (0, 0.52, 0.15), trim_m))
        if detail == "full":
            parts.append(box(f"{name}_cabin", (1.35, 0.42, 1.35), (0, 0.78, -0.35), trim_m))
        parts.append(box(f"{name}_stripe", (1.76, 0.06, 3.52), (0, 0.54, 0), accent_m))

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = name
    return root


def vehicle_hauler(name: str, detail: str = "full") -> bpy.types.Object:
    bed_m = mat(f"{name}_bed", (0.18, 0.29, 0.21), 0.52, 0.22)
    cab_m = mat(f"{name}_cab", (0.23, 0.35, 0.28), 0.42, 0.28)
    rail_m = mat(f"{name}_rail", (0.0, 1.0, 0.67), 0.25, 0.15)

    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_proxy", (2.2, 1.2, 4.2), (0, 0.6, 0), bed_m))
    else:
        parts.append(box(f"{name}_bed", (2.15, 0.85, 2.6), (0, 0.52, -0.55), bed_m))
        parts.append(box(f"{name}_cab", (1.65, 1.05, 1.45), (0, 0.78, 1.35), cab_m))
        parts.append(box(f"{name}_rail", (2.12, 0.07, 3.65), (0, 1.02, 0.1), rail_m))

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = name
    return root


def duplicate_lod(base: bpy.types.Object, suffix: str, detail: str, builder) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    base.select_set(True)
    bpy.ops.object.duplicate()
    lod = bpy.context.active_object
    bpy.ops.object.delete()
    return builder(f"{base.name}{suffix}", detail=detail)


def main() -> int:
    clear_scene()

    runner = vehicle_runner("Threshold Runner", "full")
    vehicle_runner("Threshold Runner_LOD1", "mid")
    vehicle_runner("Threshold Runner_LOD2", "proxy")

    hauler = vehicle_hauler("Threshold Hauler", "full")
    vehicle_hauler("Threshold Hauler_LOD1", "mid")
    vehicle_hauler("Threshold Hauler_LOD2", "proxy")

    bpy.ops.wm.save_as_mainfile(filepath=_OUT_BLEND)
    print(f"[child-vehicles] blend saved → {_OUT_BLEND}")
    print("Export:")
    print('  npm run blender:export -- --blend plugins/threshold-blender/child_vehicles.blend --object "Threshold Runner" --lod --mass 3.4')
    print('  npm run blender:export -- --blend plugins/threshold-blender/child_vehicles.blend --object "Threshold Hauler" --lod --mass 5.8')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())