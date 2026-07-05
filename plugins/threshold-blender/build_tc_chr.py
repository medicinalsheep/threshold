"""Build TC character .blend — R5 realism (humanoid silhouette + LOD).

  blender --background --python build_tc_chr.py
"""
from __future__ import annotations

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from tc_mesh_lib import build_character_lods, clear_scene  # noqa: E402

_OUT = os.path.join(_SCRIPT_DIR, "tc_chr.blend")

MARSHAL = {
    "shirt": (0.1, 0.16, 0.27),
    "pants": (0.07, 0.09, 0.13),
    "skin": (1.0, 0.83, 0.72),
    "accent": (0.22, 1.0, 0.08),
    "cap": (0.1, 0.06, 0.04),
}

MECHANIC = {
    "shirt": (0.8, 0.4, 0.13),
    "pants": (0.2, 0.2, 0.27),
    "skin": (0.91, 0.72, 0.59),
    "accent": (0.9, 0.55, 0.1),
}


def main() -> int:
    clear_scene()
    build_character_lods("TC Marshal", MARSHAL)
    build_character_lods("TC Mechanic", MECHANIC)
    import bpy

    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[tc-chr] blend → {_OUT}")
    print("Export:")
    print('  npm run blender:export -- --blend plugins/threshold-blender/tc_chr.blend --object "TC Marshal" --slug tc_msh --lod --no-physics --tc-ed tc-chr')
    print('  npm run blender:export -- --blend plugins/threshold-blender/tc_chr.blend --object "TC Mechanic" --slug tc_mec --lod --no-physics --tc-ed tc-chr')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())