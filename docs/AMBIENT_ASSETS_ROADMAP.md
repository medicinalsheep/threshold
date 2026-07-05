# Ambient assets roadmap

Queued additions for the starter scene and TC editions — **one asset at a time**, wired with animation + zone audio.

**Shipped in 6.5.0 (iteration 1):**

| Asset | Type | Wiring |
|-------|------|--------|
| Wind loop | SFX | `AmbientAudio` zone — open ground |
| Highway traffic | SFX | Zone near **Highway Strip** |
| Bird chirps | SFX | Random near north backdrop |
| Cicadas | SFX | Grass patch zone |
| Dust gust | SFX | Gravel path random |
| Vehicle horn | SFX | **H** key |
| Highway strip | Mesh + PBR | `starter_highway` texture |
| Street lamp | Mesh + point light | Emissive pulse anim |
| Wind turbine | Mesh | Blade rotation |
| Birds (×4) | Mesh | Bob + drift anim |
| Texture pass | PBR | Richer ground/wall/grass/asphalt palettes |

---

## Iteration 2 — Environment (shipped 6.6.0)

| Asset | Notes |
|-------|-------|
| **Rain loops** | Real Mixkit clips — light / heavy / roof; crossfade via `WeatherSystem` |
| **Thunder one-shots** | 3 near + 3 distant pools; pitch/volume variation; staggered scheduling |
| **Wind gust** | Real storm gust clip during heavy rain |
| **Rain particles** | `Points` field over starter scene |
| **Wet surfaces** | Asphalt/concrete roughness + fog pull-in when raining |
| **API** | `World.setWeather({ rain: true, intensity: 0.7 })` |
| **Pipeline** | `npm run sounds:fetch:ambient` → ffmpeg trim + OGG compress |

## Iteration 2b — Environment (shipped 6.8.0)

| Asset | Notes |
|-------|-------|
| **River / creek** | `starter_creek` water plane + flow opacity anim · `starter_amb_creek` zone |
| **Power lines** | Swaying cables + `starter_amb_power_hum` distant zone |
| **Fence chain** | `starter_fence` wire sway · `starter_fence_rattle` on wind gusts |
| **Dirt mound** | `starter_dirt` PBR + `dirt` surface · dust particles on gust/nearby |

---

## Iteration 3 — Wildlife & life (shipped 6.9.0)

| Asset | Notes |
|-------|-------|
| **Dog bark** | Near Sam (`mechanic_npc`) + dog bowl prop |
| **Cat meow** | Alley cat west of backdrop |
| **Cicadas (day)** | Grass patch zone loop · 6:00–18:00 |
| **Crickets (night)** | Grass patch swap · 21:00–6:00 · dusk blend |
| **Owl hoot** | Evening/night random one-shots |
| **Fish splash** | Creek proximity when near water |
| **Flies / bees** | Near garbage prop (future) |

---

## Iteration 4 — Urban / highway (shipped 7.0.0)

| Asset | Notes |
|-------|-------|
| **Semi truck pass** | Doppler whoosh on highway strip |
| **Motorcycle** | Quick pass SFX with playback-rate ramp |
| **Siren distant** | Rare ambient one-shot |
| **Construction beep** | Zone near cones / barrier east of plaza |
| **Junction traffic lights** | Emissive cycle anim |
| **Billboard** | Scrolling UV emissive |

---

## Iteration 5 — Interior / RP

| Asset | Notes |
|-------|-------|
| **Radio chatter** | Terminal zone |
| **Coffee shop murmur** | Indoor reverb zone |
| **Door creak** | Interact prop |
| **Elevator ding** | Multi-floor kiosk |
| **Cash register** | Shop interact |

---

## How we add each asset

1. `gen-starter-sfx.cjs` or Blender/GLTF import
2. `config/starter-sounds.json` / `tc-textures.json` entry
3. Scene object in `starterScene.js` with `userData` hooks
4. `StarterAnim.register` or `AmbientAudio` zone
5. `assets:verify` smoke + doc line here

```bash
npm run sounds:gen
npm run tex:gen
npm run assets:pack
```