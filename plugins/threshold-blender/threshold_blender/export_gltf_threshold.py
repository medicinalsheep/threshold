import json
import os
import re
from datetime import datetime, timezone

import bpy
from bpy.props import BoolProperty, FloatProperty, StringProperty
from bpy_extras.io_utils import ExportHelper

MANIFEST_NAME = "threshold_blender_manifest.json"
MANIFEST_FORMAT = "threshold-blender-manifest"
ENGINE_VERSION = "4.0.0"


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9]+", "_", (name or "model").strip().lower())
    return s.strip("_") or "model"


def load_manifest(path: str) -> dict:
    if os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as handle:
            data = json.load(handle)
        if isinstance(data, dict):
            return data
    return {
        "format": MANIFEST_FORMAT,
        "formatVersion": 1,
        "engineVersion": ENGINE_VERSION,
        "models": [],
    }


def merge_manifest(manifest: dict, export_dir: str, entry: dict) -> dict:
    manifest["format"] = MANIFEST_FORMAT
    manifest["formatVersion"] = 1
    manifest["engineVersion"] = ENGINE_VERSION
    manifest["exportedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["exportDir"] = export_dir.replace("\\", "/")

    models = manifest.get("models") or []
    models = [
        m
        for m in models
        if not (
            m.get("objectName") == entry.get("objectName")
            and m.get("file") == entry.get("file")
        )
    ]
    models.append(entry)
    manifest["models"] = models
    return manifest


def save_manifest(path: str, manifest: dict) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")


class THRESHOLD_OT_export_gltf(bpy.types.Operator, ExportHelper):
    bl_idname = "threshold.export_gltf"
    bl_label = "Threshold GLTF (.glb)"
    bl_description = "Export GLB with embedded textures + threshold_blender_manifest.json"
    bl_options = {"PRESET"}

    filename_ext = ".glb"
    filter_glob: StringProperty(default="*.glb", options={"HIDDEN"})

    object_name: StringProperty(
        name="Engine Object Name",
        description="Must match the mesh name in Threshold Engine inspector",
        default="",
    )
    export_physics: BoolProperty(
        name="Enable Physics",
        description="Compiler/Engine userData.hasPhysics",
        default=True,
    )
    mass: FloatProperty(
        name="Mass",
        default=1.0,
        min=0.1,
        max=500.0,
    )
    friction: FloatProperty(name="Friction", default=0.3, min=0.0, max=1.0)
    restitution: FloatProperty(name="Bounce", default=0.5, min=0.0, max=1.0)

    def invoke(self, context, event):
        obj = context.active_object
        if obj and not self.object_name:
            self.object_name = obj.name
        if not self.filepath:
            slug = slugify(self.object_name or (obj.name if obj else "model"))
            self.filepath = os.path.join(
                os.getcwd(), "import", f"{slug}.glb"
            )
        return ExportHelper.invoke(self, context, event)

    def execute(self, context):
        if not context.selected_objects:
            self.report({"ERROR"}, "Select at least one object to export")
            return {"CANCELLED"}

        display_name = (self.object_name or context.active_object.name).strip()
        slug = slugify(display_name)
        filepath = bpy.path.abspath(self.filepath)
        export_dir = os.path.dirname(filepath)
        os.makedirs(export_dir, exist_ok=True)

        if not filepath.lower().endswith(".glb"):
            filepath = os.path.splitext(filepath)[0] + ".glb"

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

        rel_dir = os.path.basename(export_dir.rstrip("/\\")) or "import"
        filename = os.path.basename(filepath)
        entry = {
            "id": slug,
            "objectName": display_name,
            "file": filename,
            "path": f"{rel_dir}/{filename}".replace("\\", "/"),
            "hasPhysics": self.export_physics,
            "mass": self.mass,
            "friction": self.friction,
            "restitution": self.restitution,
        }

        manifest_path = os.path.join(export_dir, MANIFEST_NAME)
        manifest = merge_manifest(load_manifest(manifest_path), export_dir, entry)
        save_manifest(manifest_path, manifest)

        self.report(
            {"INFO"},
            f"Exported {filename} — Engine: INSERT → GLTF or load {MANIFEST_NAME}",
        )
        return {"FINISHED"}


def menu_func_export(self, context):
    self.layout.operator(
        THRESHOLD_OT_export_gltf.bl_idname,
        text="Threshold GLTF (.glb)",
    )


def register():
    bpy.utils.register_class(THRESHOLD_OT_export_gltf)
    bpy.types.TOPBAR_MT_file_export.append(menu_func_export)


def unregister():
    bpy.types.TOPBAR_MT_file_export.remove(menu_func_export)
    bpy.utils.unregister_class(THRESHOLD_OT_export_gltf)