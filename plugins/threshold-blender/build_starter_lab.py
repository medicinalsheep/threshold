"""Build Tesla lab .blend scaffold — Phase 18.5 (coil LOD, bench, door).

  blender --background --python build_starter_lab.py

Export with:
  npm run blender:export -- --blend plugins/threshold-blender/starter_lab.blend --object "Tesla Coil" --slug tesla_coil --lod
  npm run blender:export -- --blend plugins/threshold-blender/starter_lab.blend --object "Lab Bench" --slug lab_bench
  npm run blender:export -- --blend plugins/threshold-blender/starter_lab.blend --object "Lab Door" --slug lab_door
"""
from __future__ import annotations

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

_OUT = os.path.join(_SCRIPT_DIR, "starter_lab.blend")


def main() -> int:
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.data.collections.new("StarterLab")
    bpy.context.scene.collection.children.link(coll)

    def box(name, loc, scale, parent=coll):
        bpy.ops.mesh.primitive_cube_add(location=loc)
        obj = bpy.context.active_object
        obj.name = name
        obj.scale = scale
        for c in obj.users_collection:
            c.objects.unlink(obj)
        parent.objects.link(obj)
        return obj

    coil = box("Tesla Coil", (0, 1.1, 0), (0.55, 1.1, 0.55))
    bench = box("Lab Bench", (3, 0.4, 0), (1.1, 0.4, 0.33))
    door = box("Lab Door", (6, 1.0, 0), (0.07, 1.0, 0.68))

    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[starter-lab] blend scaffold → {_OUT}")
    print("Replace primitives with sculpted meshes, then export via npm run blender:export")
    print("Node fallback: npm run lab:gen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())