"""Build TC vehicle .blend — R5 realism (wheels, silhouette, LOD).

  blender --background --python build_tc_veh.py
"""
from __future__ import annotations

import os
import sys

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from tc_mesh_lib import build_vehicle_lods, clear_scene, hauler_mesh, runner_mesh  # noqa: E402

_OUT = os.path.join(_SCRIPT_DIR, "tc_veh.blend")


def main() -> int:
    clear_scene()
    build_vehicle_lods("TC Runner", runner_mesh)
    build_vehicle_lods("TC Hauler", hauler_mesh)
    import bpy

    bpy.ops.wm.save_as_mainfile(filepath=_OUT)
    print(f"[tc-veh] blend → {_OUT}")
    print("Export:")
    print('  npm run blender:export -- --blend plugins/threshold-blender/tc_veh.blend --object "TC Runner" --slug tc_run --lod --mass 3.4 --friction 0.36 --restitution 0.14 --tc-ed tc-veh')
    print('  npm run blender:export -- --blend plugins/threshold-blender/tc_veh.blend --object "TC Hauler" --slug tc_haul --lod --mass 5.8 --friction 0.44 --restitution 0.1 --tc-ed tc-veh')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())