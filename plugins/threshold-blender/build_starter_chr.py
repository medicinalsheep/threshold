"""Build starter character .blend scaffold — male + female + hair (R8.2).

  blender --background --python build_starter_chr.py

Export:
  npm run blender:avatar -- --blend plugins/threshold-blender/starter_chr.blend --object Armature --file starter_avatar_female.glb
"""
from __future__ import annotations

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_OUT = os.path.join(_SCRIPT_DIR, "starter_chr.blend")


def main() -> int:
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)
    coll = bpy.data.collections.new("StarterCharacters")
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

    box("Starter Avatar Male", (0, 0.9, 0), (0.22, 0.9, 0.12))
    box("Starter Avatar Female", (2.5, 0.85, 0), (0.2, 0.85, 0.11))
    box("hair_short_m", (5, 1.7, 0), (0.2, 0.12, 0.2))
    box("hair_long_f", (7, 1.7, 0), (0.22, 0.35, 0.12))
    box("hair_bun_f", (9, 1.75, 0), (0.18, 0.2, 0.18))

    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[starter-chr] blend scaffold → {_OUT}")
    print("Node fallback: npm run avatar:gen")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())