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

## Iteration 2b — Environment (queued)

| Asset | Notes |
|-------|-------|
| **River / creek** | Water plane + flow normal anim |
| **Power lines** | Distant hum + swaying cables |
| **Fence chain** | Metal rattle on wind gusts |
| **Dirt mound** | `dirt` texture style + dust particles |

---

## Iteration 3 — Wildlife & life

| Asset | Notes |
|-------|-------|
| **Dog bark** | Proximity trigger near NPC |
| **Cat meow** | Alley spawn point |
| **Crickets night** | Time-of-day swap with cicadas |
| **Owl hoot** | Evening only |
| **Flies / bees** | Near garbage prop (future) |
| **Fish splash** | If water added |

---

## Iteration 4 — Urban / highway

| Asset | Notes |
|-------|-------|
| **Semi truck pass** | Doppler whoosh on highway |
| **Motorcycle** | Quick pass SFX |
| **Siren distant** | Rare ambient |
| **Construction beep** | Zone near props |
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