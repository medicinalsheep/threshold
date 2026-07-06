"""Build Wardenclyffe building .blend scaffold — Phase 19.2.

  blender --background --python build_starter_building.py

Export with:
  npm run blender:export -- --blend plugins/threshold-blender/starter_building.blend --object "Wardenclyffe Building" --slug wardenclyffe_building --lod
  npm run blender:export -- --blend plugins/threshold-blender/starter_building.blend --object "Lab Wood Liner" --slug lab_wood_liner
  npm run blender:export -- --blend plugins/threshold-blender/starter_building.blend --object "Wardenclyffe Door" --slug wardenclyffe_door

Node fallback: npm run building:gen
"""
from __future__ import annotations

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

_OUT = os.path.join(_SCRIPT_DIR, "starter_building.blend")


def main() -> int:
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.data.collections.new("StarterBuilding")
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

    box("Wardenclyffe Building", (0, 1.9, 0), (6, 1.9, 2.6))
    box("Lab Wood Liner", (8, 1.8, 0), (5.4, 1.6, 2))
    box("Wardenclyffe Door", (16, 1.2, 0), (0.8, 1.2, 0.08))

    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[starter-building] blend scaffold → {_OUT}")
    print("Sculpt façade + wood slats, then export via npm run blender:export")
    print("Node fallback: npm run building:gen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())