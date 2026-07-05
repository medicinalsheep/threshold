"""Build TC vehicle .blend — abbreviated names. blender --background --python build_tc_veh.py"""
from __future__ import annotations

import os
import bpy
from mathutils import Vector

_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tc_veh.blend")


def mat(name, color, rough=0.45, metal=0.35):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = metal
    return m


def box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = Vector(size)
    o.data.materials.append(material)
    return o


def veh(name, detail="full"):
    body = mat(f"{name}_b", (0.1, 0.16, 0.27), 0.32, 0.58)
    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_p", (1.8, 0.9, 3.8), (0, 0.45, 0), body))
    else:
        parts.append(box(f"{name}_c", (1.75, 0.38, 3.5), (0, 0.32, 0), body))
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = name
    return root


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    veh("TC Runner", "full")
    veh("TC Runner_L1", "mid")
    veh("TC Runner_L2", "proxy")
    veh("TC Hauler", "full")
    veh("TC Hauler_L1", "mid")
    veh("TC Hauler_L2", "proxy")
    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[tc] blend → {_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())