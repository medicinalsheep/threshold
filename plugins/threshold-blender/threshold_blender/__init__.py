bl_info = {
    "name": "Threshold Export",
    "author": "Threshold Team",
    "version": (1, 0, 0),
    "blender": (3, 0, 0),
    "location": "File > Export > Threshold GLTF (.glb)",
    "description": "Export GLB with embedded PBR textures for Threshold Engine",
    "category": "Import-Export",
}

from . import export_gltf_threshold


def register():
    export_gltf_threshold.register()


def unregister():
    export_gltf_threshold.unregister()