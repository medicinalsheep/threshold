"""Shared TC mesh builders — R5 realism pass (veh + chr)."""
from __future__ import annotations

import math

import bpy
from mathutils import Vector


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def mat(name: str, color, roughness=0.45, metallic=0.35, emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if emission is not None:
            bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    return m


def box(name: str, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=Vector(loc))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = Vector(size)
    obj.data.materials.append(material)
    return obj


def cylinder(name: str, radius: float, depth: float, loc, material, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=Vector(loc))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = Vector(rot)
    obj.data.materials.append(material)
    return obj


def join_parts(parts, root_name: str):
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    root = bpy.context.active_object
    root.name = root_name
    return root


def wheel_set(name: str, x: float, y: float, z: float, *, radius=0.32, width=0.22, detailed=True):
    rubber = mat(f"{name}_rub", (0.08, 0.08, 0.08), 0.92, 0.05)
    hub = mat(f"{name}_hub", (0.53, 0.6, 0.67), 0.35, 0.7)
    parts = [cylinder(f"{name}_tire", radius, width, (x, y, z), rubber)]
    if detailed:
        parts.append(cylinder(f"{name}_hub", radius * 0.55, width + 0.02, (x, y, z), hub))
    return parts


def runner_mesh(name: str, detail: str = "full"):
    body_m = mat(f"{name}_body", (0.1, 0.16, 0.27), 0.32, 0.58)
    trim_m = mat(f"{name}_trim", (0.05, 0.08, 0.12), 0.38, 0.42)
    accent_m = mat(f"{name}_accent", (0.22, 1.0, 0.08), 0.18, 0.2, (0.22, 1.0, 0.08), 0.4)
    bumper_m = mat(f"{name}_bumper", (0.12, 0.14, 0.18), 0.55, 0.48)

    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_proxy", (1.8, 0.9, 3.8), (0, 0.45, 0), body_m))
    else:
        parts.append(box(f"{name}_chassis", (1.75, 0.38, 3.5), (0, 0.32, 0), body_m))
        parts.append(box(f"{name}_deck", (1.55, 0.22, 2.8), (0, 0.52, 0.15), trim_m))
        if detail == "full":
            parts.append(box(f"{name}_cabin", (1.35, 0.42, 1.35), (0, 0.78, -0.35), trim_m))
            parts.append(box(f"{name}_nose", (1.4, 0.28, 0.55), (0, 0.48, 1.72), bumper_m))
            parts.append(box(f"{name}_spoiler", (1.5, 0.08, 0.35), (0, 0.72, -1.82), accent_m))
        parts.append(box(f"{name}_stripe", (1.76, 0.06, 3.52), (0, 0.54, 0), accent_m))
        if detail == "full":
            for x, z in [(-0.88, 1.15), (0.88, 1.15), (-0.88, -1.15), (0.88, -1.15)]:
                parts.extend(wheel_set(f"{name}_w{x}_{z}", x, 0.3, z, detailed=True))
        elif detail == "mid":
            for x, z in [(-0.88, 1.15), (0.88, 1.15), (-0.88, -1.15), (0.88, -1.15)]:
                parts.extend(wheel_set(f"{name}_w{x}_{z}", x, 0.3, z, detailed=False))

    return join_parts(parts, name)


def hauler_mesh(name: str, detail: str = "full"):
    bed_m = mat(f"{name}_bed", (0.18, 0.29, 0.21), 0.52, 0.22)
    cab_m = mat(f"{name}_cab", (0.23, 0.35, 0.28), 0.42, 0.28)
    rail_m = mat(f"{name}_rail", (0.0, 1.0, 0.67), 0.25, 0.15, (0.0, 0.67, 0.42), 0.3)
    frame_m = mat(f"{name}_frame", (0.14, 0.16, 0.2), 0.62, 0.38)

    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_proxy", (2.2, 1.2, 4.2), (0, 0.6, 0), bed_m))
    else:
        parts.append(box(f"{name}_bed", (2.15, 0.85, 2.6), (0, 0.52, -0.55), bed_m))
        parts.append(box(f"{name}_cab", (1.65, 1.05, 1.45), (0, 0.78, 1.35), cab_m))
        if detail == "full":
            parts.append(box(f"{name}_grille", (1.45, 0.35, 0.22), (0, 0.62, 2.12), frame_m))
            parts.append(box(f"{name}_tailgate", (2.0, 0.55, 0.12), (0, 0.68, -1.82), frame_m))
        parts.append(box(f"{name}_rail", (2.12, 0.07, 3.65), (0, 1.02, 0.1), rail_m))
        if detail in ("full", "mid"):
            for x, z in [(-0.95, 1.35), (0.95, 1.35), (-0.95, -1.35), (0.95, -1.35)]:
                parts.extend(wheel_set(f"{name}_w{x}_{z}", x, 0.34, z, radius=0.38, width=0.28, detailed=detail == "full"))

    return join_parts(parts, name)


def character_mesh(name: str, palette: dict, detail: str = "full"):
    shirt = mat(f"{name}_shirt", palette["shirt"], 0.68, 0.08)
    pants = mat(f"{name}_pants", palette["pants"], 0.78, 0.05)
    skin = mat(f"{name}_skin", palette["skin"], 0.82, 0.0)
    accent = mat(f"{name}_badge", palette.get("accent", (0.22, 1.0, 0.08)), 0.2, 0.1, palette.get("accent", (0.22, 1.0, 0.08)), 0.35)

    parts = []
    if detail == "proxy":
        parts.append(box(f"{name}_proxy", (0.5, 1.7, 0.35), (0, 0.85, 0), shirt))
    else:
        parts.append(box(f"{name}_pants", (0.44, 0.24, 0.28), (0, 0.9, 0), pants))
        parts.append(box(f"{name}_torso", (0.5, 0.64, 0.28), (0, 1.34, 0), shirt))
        parts.append(box(f"{name}_arm_l", (0.15, 0.5, 0.15), (-0.34, 1.1, 0), skin))
        parts.append(box(f"{name}_arm_r", (0.15, 0.5, 0.15), (0.34, 1.1, 0), skin))
        if detail == "full":
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.21, location=(0, 1.78, 0))
            head = bpy.context.active_object
            head.name = f"{name}_head"
            head.data.materials.append(skin)
            parts.append(head)
            parts.append(box(f"{name}_badge", (0.12, 0.12, 0.04), (0, 1.42, 0.16), accent))
            if palette.get("cap"):
                parts.append(box(f"{name}_cap", (0.46, 0.12, 0.3), (0, 1.92, 0.02), mat(f"{name}_cap", palette["cap"], 0.55, 0.1)))

    return join_parts(parts, name)


def build_vehicle_lods(base_name: str, builder):
    builder(base_name, "full")
    builder(f"{base_name}_LOD1", "mid")
    builder(f"{base_name}_LOD2", "proxy")


def build_character_lods(base_name: str, palette: dict):
    character_mesh(base_name, palette, "full")
    character_mesh(f"{base_name}_LOD1", palette, "mid")
    character_mesh(f"{base_name}_LOD2", palette, "proxy")