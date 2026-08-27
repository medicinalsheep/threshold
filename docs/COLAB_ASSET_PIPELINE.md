# Colab Cloud Asset Pipeline (optional)

**Local GIMP / Blender stay the default.** This path is an **opt-in accelerator** for heavier PBR maps on Google Colab’s **free T4** (when Colab offers one). Play, export, and basic creation never require it. Player surface hides the UI.

Engine entry: **SETUP → Cloud Asset Pipeline (Colab)** · **TOOLS → Cloud assets (Colab)** · Agent Portal **COLAB**.  
Notebook: [`colab/threshold_pbr_starter.ipynb`](../colab/threshold_pbr_starter.ipynb)  
Import: `npm run colab:import -- --zip <file.zip>` (Name inferred from `threshold-asset.json`)

---

## Honest free-tier limits

| Item | Reality |
|------|---------|
| GPU | NVIDIA **T4** (~15–16 GB) **if available** — not guaranteed |
| Session | Often **≤ ~12 hours** |
| Idle | Disconnect around **~90 minutes** without use |
| Quotas | Dynamic; Colab can refuse GPU or drop you mid-job |
| Account | Google account **outside** Threshold — this app never logs you into Google |
| Paid | **Not required.** Do not buy Colab Pro for this pipeline. |

Save to Drive or **download the zip before you walk away**. Treat cloud output as disposable until it is in `textures/` on disk.

Official FAQ: [Colab resource limits](https://research.google.com/colaboratory/faq.html#resource-limits).

---

## VS Code ↔ Colab (official extension)

Publisher: **Google** · id `Google.colab`

1. Install [Colab for VS Code](https://marketplace.visualstudio.com/items?itemName=Google.colab) (also on [Open VSX](https://open-vsx.org/extension/Google/colab)).
2. Open `colab/threshold_pbr_starter.ipynb` from this repo (local file — not bundled in the SPA).
3. **Select Kernel → Colab → Auto Connect**.
4. Sign in with Google **in the extension**, not in Threshold.
5. If offered, pick **T4 GPU**. If only CPU appears, run the procedural albedo cell and skip SD.
6. User guide: [colab-vscode wiki](https://github.com/googlecolab/colab-vscode/wiki/User-Guide).

You can also upload the same notebook to [colab.research.google.com](https://colab.research.google.com/) and run it in the browser. Output goes to `/content` on a Colab VM, or `./threshold_out` if the kernel is local.

---

## Naming contract (same as GIMP / Blender)

Engine object **Name** → files (`src/shared/artNaming.js`):

| Name | Files |
|------|--------|
| `Stone Block` | `textures/stone_block_albedo.png` · `_roughness.png` · `_metalness.png` · `_normal.png` |
| `Mat Wood Crate` | `textures/mat_wood_crate_albedo.png` · … |
| mesh (optional) | `import/<slug>.glb` — **not** produced by this notebook |

Slug rules: lowercase, underscores, no spaces. Pack also writes `threshold-asset.json` so import can infer the Engine Name.

---

## What the starter notebook does

| Cell | Always works? | Output |
|------|----------------|--------|
| Slug + family + portable OUT | Yes | Prints expected paths |
| GPU probe | Yes (torch optional) | Tells you if T4/CUDA is actually there |
| Procedural albedo | Yes (CPU or GPU) | `{slug}_albedo.png` 1024², tileable, family from the name (stone / wood / metal / fabric / ground) |
| Optional SD 1.5 | **No** — T4 + download + quota | Overwrites albedo if you set `RUN_SD = True` |
| Roughness + metalness + normal | Yes | Derived from albedo (wrap-friendly normal) |
| Manifest + zip | Yes | `threshold-asset.json` + `{slug}_threshold_pbr.zip` |

This does **not** replace MaterialPresets, GIMP, or Blender. It does **not** emit a GLB.

---

## Bring files home

```bash
# zip from Colab (preferred — reads threshold-asset.json):
npm run colab:import -- --zip path/to/stone_block_threshold_pbr.zip

# unzipped folder:
npm run colab:import -- --dir path/to/unzip --name "Stone Block"

# preview / skip HILOD / skip public/bundle copy:
node scripts/colab-asset-import.cjs --zip pack.zip --dry-run
node scripts/colab-asset-import.cjs --zip pack.zip --no-hilod --no-bundle
```

Import **runs HILOD** (`_1k` / `_2k`) unless you pass `--no-hilod`. If `npm run textures:watch` is already up it pings GIMP SYNC; otherwise start watch or reload the Engine.

Then Engine: name the object **exactly** `Stone Block` → inspector Art paths.

Static check (no GPU): `npm run colab:verify`. Creator/player UI smoke (dev server up): `npm run colab:smoke`.

---

## What this is not

- Not an auth provider. No Google token in Threshold.
- Not on **player** surface.
- Not in the Vite/Pages JS bundle (notebook stays under `colab/`).
- Not a substitute for `MaterialPresets` or the starter PBR library.
- Not Trellis / Veo / paid GPU.

---

## Agents

If a creator asks for “cloud GPU textures,” point here. Default still: GIMP maps + `artNaming` + HILOD. Do not probe Colab from the player surface. Do not add Google OAuth.
