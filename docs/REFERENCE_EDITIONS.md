# Reference editions (Threshold Child — v5.5)

Bundled content is **Threshold Child** — **original** assets for learning export and store workflows. Not third-party file drops.

**Policy:** [THRESHOLD_CHILD_ASSETS.md](THRESHOLD_CHILD_ASSETS.md)

---

## Active editions

| Edition | Lobby | Contents |
|---------|-------|----------|
| `threshold` | SOLO PLAY | Core starter scene |
| **`threshold-child-lite`** | **THRESHOLD CHILD** | Runner, Hauler, Circuit Span (procedural, original) |

Config: `config/reference-editions.json`

---

## Quick start

```bash
npm run dev
```

Lobby → **THRESHOLD CHILD →** — spawns original vehicles on the starter platform.

Then **MORE → EXPORT** — **SCENE** shows Child objects; **CREDITS** lists `Original — Threshold Child edition`.

---

## External seeds (developers only)

```bash
npm run reference:fetch   # optional CC0 packs → reference/_dev-seeds/ (gitignored)
```

Use only for **comparison** when authoring new Child GLBs in Blender. **Do not** ship unmodified downloads.

---

## Planned Child editions

| Edition | Focus |
|---------|--------|
| `threshold-child-vehicles` | Blender Child GLB + LOD |
| `threshold-child-characters` | Unique humanoids |
| `threshold-child-audio` | Original SFX |
| `threshold-child-showcase` | Full export demo world |

---

## Related

- [GETTING_STARTED.md](GETTING_STARTED.md)
- [EXPORT_WALKTHROUGH.md](EXPORT_WALKTHROUGH.md)
- [reference/ATTRIBUTION.md](../reference/ATTRIBUTION.md)