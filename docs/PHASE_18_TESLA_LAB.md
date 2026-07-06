# Phase 18 — Tesla Lab Intro Makeover

**Inspiration:** Late-1800s / early-1900s electrical research lab — wooden interior, brick accents, brass/copper apparatus, Tesla coil, rotary switches, wire cages, warm incandescent bulbs, glassware. Showcases Threshold capabilities: **PBR textures, collisions, doors, animations, zone audio, interact, LOD-ready props, intro flythrough.**

**Reference:** User-provided Tesla lab photos (wood slat walls, coil tower, instrument tables, vintage lighting). Procedural starter meshes + PBR until Blender GLB pass (Phase 18.5).

---

## Capability showcase matrix

| Capability | Lab element | Phase |
|------------|-------------|-------|
| PBR + HILOD | Wood floor, brick, copper coil | 18.1 |
| Physics colliders | Walls, floor, bench, door frame | 18.1 |
| Interact + door SFX | Double doors to plaza | 18.1 |
| Emissive + particles | Coil arc, bulb filaments | 18.1 |
| Zone ambient audio | Coil hum, spark crackle | 18.1 |
| Intro flythrough | Camera: coil → bench → doors → plaza | 18.1 |
| Third eye / F interact | Rotary switch, vacuum tube rack | 18.2 |
| Mesh LOD | Coil + bench GLB | 18.5 |
| NPC in lab coat | Guide NPC spawn in lab | 18.3 |
| Weather / rain | Wet windows on annex | 18.4 |

---

## Layout (west annex)

```
        [N] brick + instrument wall
              ┌─────────────────┐
              │  bulbs · cables │
              │    ┌─coil─┐     │
  plaza ──door│    │ ⚡    │ bench
        [E]   │    └──────┘     │
              │  wood floor      │
              └─────────────────┘
        [W] full wall   origin plaza (0,0) east of door
```

- **Lab origin:** `(-9, 0, 2)` · **Door threshold:** `(-4.2, 0, 2)` · **Plaza spawn:** `(0, 0, 2.5)`

---

## Phase 18.1 — Lab shell + intro flythrough (v7.3.0) ✅

| Step | Deliverable |
|------|-------------|
| 18.1.1 | `starterTeslaLab18.js` — room, coil, bench, bulbs, door |
| 18.1.2 | Textures: `tesla_wood`, `tesla_brick`, `tesla_copper` |
| 18.1.3 | SFX: `starter_tesla_coil_hum`, `starter_tesla_spark` |
| 18.1.4 | `teslaLabAmbient.js` — hum zone + random sparks |
| 18.1.5 | Intro path: 4.8s fly coil → door → plaza |
| 18.1.6 | Guest sync marker `starter_tesla_coil` |

---

## Phase 18.2 — Interactables + controls demo (v7.4.0) ✅

| Item | Behavior |
|------|----------|
| Rotary switch | `[F]` — crank anim + spark SFX |
| Vacuum tube rack | Emissive warm-up sequence |
| Leyden jars | Glass transmission material |
| Lab journal | `[F]` — PromptGen hint prop |

---

## Phase 18.3 — NPC + VO (v7.5.0) ✅

| Item | Notes |
|------|-------|
| Nikola / guide NPC | Lab coat palette, patrol bench ↔ coil |
| Radio chatter | Reuse interior radio loop, lab-only zone |
| Intro status lines | UI captions during flythrough |

---

## Phase 18.4 — Annex weather + exterior (v7.6.0) ✅

| Item | Notes |
|------|-------|
| Rain on skylight | Wet roughness on glass planes |
| Lightning flash | Sync with `WeatherSystem` thunder |
| Exterior sign | "THRESHOLD LAB" canvas emissive |

---

## Phase 18.5 — Blender GLB + LOD (v7.7)

| Asset | Export |
|-------|--------|
| `tesla_coil.glb` | LOD0/1/2 |
| `lab_bench.glb` | Instruments baked |
| `lab_door.glb` | Hinged animation |

```bash
npm run blender:export -- --blend lab.blend --object TeslaCoil --slug tesla_coil --lod
```

---

## Animation registry

| Prop | Anim hook |
|------|-----------|
| Coil | Arc emissive pulse, particle burst |
| Bulbs | `emissiveIntensity` flicker |
| Rotary switch | `rotation.z` on interact |
| Door | Swing + `starter_interior_door_creak` |
| Cables | Sway with wind / coil discharge |

---

## Sound registry

| ID | Type | Zone |
|----|------|------|
| `starter_tesla_coil_hum` | Loop | Coil radius 6 m |
| `starter_tesla_spark` | One-shot | Random + on switch |
| `starter_interior_door_creak` | Interact | Door (existing) |

---

## Implementation order (one at a time)

1. **18.1** Lab shell + intro ✅
2. **18.2** Interactables ✅
3. **18.3** Lab NPC ✅
4. **18.4** Weather annex ✅
5. **R8.2** Female avatar ← **current**
6. **R8.3** Creatures / animals
7. **18.5** Blender LOD pass

```bash
npm run tex:gen && npm run sounds:gen && npm run assets:pack
```