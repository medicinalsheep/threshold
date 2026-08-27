# Wave 9 — origin harden + walk / avatar / opener

**Date:** 2026-08-17 · **Product:** 10.21.5  
**Related:** [BOOTCAMP.md](BOOTCAMP.md) · [TRAINING_BACKLOG.md](TRAINING_BACKLOG.md) · [ART_PIPELINE_TRAINING_PLAN.md](ART_PIPELINE_TRAINING_PLAN.md) · [BLENDER_AVATARS.md](BLENDER_AVATARS.md)

**Status:** seeded + local minis recreated (2026-08-17). Golden **29/33 (88%)**.

---

## What we audited (this session)

| Layer | How | Result |
|-------|-----|--------|
| Local weights | `ollama list` | `threshold-mini-npc` / `-dev` / `-mobile` — last create **4 days ago** (wave 8) |
| Product golden | `npm run ollama:golden` | **26/28 (93%) PASS** at 85% floor — **origin 2 FAIL** |
| Origin (Modelfile SYSTEM) | `wave9-mini-probe` empty system | **PASS** npc + mobile + dev — medicinalsheep MIT |
| Origin (golden coach SYSTEM) | same questions + override | **Flaky** — this run: “Ollama Games”, “Anthropic is the creator”, “UK studio Medicinalsheep” |
| Walk / avatar / opener | probe | **Product-wrong** (see honest table) |
| Art slug (wave 8) | Mat Brick Wall paths | **PASS** |
| Intent / patches / plans | golden remainder | **PASS** (type-first, no clearWorld, mode 4, pipeline) |
| Disk walk gate | `avatar:audit` · `walk:verify` · `walk:smoke` | **37/37 · PASS · 11/11** (engine is fine; minis are not) |

Local bases: `llama3.2:3b` (npc) · `qwen2.5-coder:1.5b` (dev) · `llama3.2:1b` (mobile).  
Public `medicinalsheep/threshold-mini-*` copies are **1 day older** than local — do not publish until wave 9 is green.

---

## Honest probe (do not trust the 11/15 headline)

Loose scorers marked some walk answers PASS. Read the text:

| ID | What they said | Truth |
|----|----------------|-------|
| `W-clips` | idle/walk/run **plus jump + death** | Only **idle · walk · run** |
| `W-audit` | `perf:harness:compare` | `avatar:audit` + `walk:verify` + `walk:smoke` |
| `W-tps` | “Threshold Performance System” / GPU temps | **Third-person** PLAY · mixer · real `dt` |
| `W-honest` | Answered about the **mini model**, not the body | Starter GLBs are **procedural mannequins**, not skinned Blender |
| `W-intent-walk` | `API: AvatarWalkAudit` (invented) | `avatar:audit` + `walk:verify` |
| `W-intent-opener` | Lobby invite / room codes | Lobby **How to** → copy Grok opener (`thresholdOpenerPrompt`) |
| `L-opener` | “Press Shift + ENTER” | Lobby How-to dropdown · no ENTER required |
| `D-walk-plan` | Cube “walk” mesh + GIMP 2k + wet shaders | HumanMesh loco · mixer bind · idle rest · TPS smoke |

**Lesson (same as wave 8):** few-shot minis invent APIs. Train the **words that exist** (`avatar:audit`, idle/walk/run, How to) and keep product sanitizers for code. Origin few-shots work **only when Modelfile SYSTEM is not replaced**.

---

## Why origin flakes

`ollama:golden` origin cases send:

`system: "You are a Threshold coach. Short product-accurate answers."`

Ollama then **does not keep** the Modelfile `ORIGIN (always true): …` line. Base-model priors win: Ollama Games, Anthropic, UK studio.

Empty-system chats (how Engine NPC actually runs) are correct.

**Wave 9 must do both:**

1. More origin paraphrases that survive a coach-style SYSTEM (few-shots on the exact golden wording).
2. Tighten golden: empty-SYSTEM origin cases + reject “UK studio Medicinalsheep” / “Ollama Games”.
3. Keep `entryPriority` origin boost (already +110/+120).

---

## Gap vs product 10.21.5

Shipped since last train (wave 8, Aug 12):

- Track A — real `dt`, mixer bind, idle rest, intent speed
- Track B — `idle` / `walk` / `run` on starter bodies + LODs + NPCs
- Track C — `avatar:audit` gate
- TPS `walk:smoke` (ENTER → PLAY → third person)
- Lobby **How to** Grok opener
- Honest floor: still **not** a skinned Blender hero

**Zero** of that is in JSONL. Existing “walk” pairs mean “PLAY walk the scene” or a **metal walkway** cube — that is why the planner built a wet crate for “frozen player walk”.

---

## Wave 9 seed (proposed)

New files (do not wipe wave 5–8):

| File | Role |
|------|------|
| `datasets/small/wave9_walk.jsonl` | intents, NPC coaches, guides |
| `datasets/medium/wave9_walk.jsonl` | plans, patches, suggests |
| grow `datasets/small/origin.jsonl` + `medium/origin.jsonl` | coach-SYSTEM survivors + anti–Ollama Games |

### Small (npc) — must-say / must-not

**Must say**

- Clips: **idle**, **walk** (or locomotion), **run** (or sprint) only
- Verify: `npm run avatar:audit` · `walk:verify` · `walk:smoke`
- Frozen walk: ENTER · PLAY · **third person** · mixer / procedural fallback · real frame `dt`
- Starter bodies: **procedural mannequins** (`avatar:gen`) until a Blender GLB is dropped
- Lobby How to copies a Grok Build opener (play link + repo spine) — no ENTER
- Origin: medicinalsheep MIT · not Anthropic · not Claude · not a UK studio · not Ollama Games

**Must not say**

- jump / death / attack clips on starter avatars
- TPS = performance harness / GPU temps
- `perf:harness` as the walk gate
- Invented APIs (`AvatarWalkAudit`)
- Shift+ENTER as the opener
- Frozen walk = spawn a cube named walk + GIMP wet maps

### Medium (dev)

- Plan “fix frozen walk” → HumanMesh / PoseSync / `rebindWalk` / TPS smoke — **not** 11-step crate pipeline
- Patch hardcoded `updateWalk(..., 0.016)` → pass engine `dt`
- Suggest: `HumanMesh.updateWalk(group, speed, dt, sprint)`
- Never `World.clearWorld` mid-job
- Optional: `avatar:audit` in verify step of any avatar plan

### Intents (two-line)

| User | INTENT | API |
|------|--------|-----|
| run avatar walk audit | other | `avatar:audit` + `walk:verify` |
| player walk frozen in third person | other | `walk:smoke` + HumanMesh.updateWalk |
| copy grok opener from lobby | other | lobby How to + `thresholdOpenerPrompt` |
| who made Threshold | other | medicinalsheep MIT |
| starter avatar clips | spawn | idle/walk/run + `avatar:gen` |

---

## Test harness (before / after train)

| Gate | Command | Pass bar |
|------|---------|----------|
| Origin empty SYSTEM | `node scripts/wave9-mini-probe.cjs` (tightened) | all origin IDs PASS |
| Origin coach SYSTEM | same + golden origin cases | medicinalsheep · reject Anthropic / Ollama Games / UK studio |
| Walk literacy | probe W-* tight scorers | clips exact · commands exact · TPS = third person |
| Opener | L-opener | How to / copy / opener — not Shift+ENTER |
| Regression | `npm run ollama:golden` | ≥ 85% **and** origin cases PASS |
| Art no-reg | `npm run art:audit` | hard fails = 0 |
| Engine still green | `avatar:audit` · `walk:verify` | already green; re-run after seed only if assets change |

Tighten:

- Golden `origin_not_uk_studio`: **fail** if `/uk\s+studio/i` unless `not a UK`.
- Probe `W-clips`: **fail** on jump/death.
- Probe `W-tps`: require third-person / mixer / `dt` — reject “performance system”.
- Golden: add empty-SYSTEM origin trio + `walk_clips` + `walk_audit_cmd` + `lobby_opener`.

---

## Train recipe (after plan accept)

```bash
npm run bootcamp:seed:wave9
npm run train:mini -- --wave9
npm run models:mobile
npm run ollama:golden
node scripts/wave9-mini-probe.cjs
npm run art:audit -- --skip-ollama   # or full if time
```

Wire: `bootcamp.json` v9 · `train-mini.cjs --wave9` · `--full` includes wave9 · `entryPriority` boosts for `avatar:audit` / idle+walk+run / How to opener.

In Engine: SETUP → AGENTS → Small `threshold-mini-npc` · Medium `threshold-mini-dev` → SAVE TIERS.  
Chat: “Who made Threshold?” · “Player walk is frozen” · “How do I copy a Grok opener?”

**Do not** `models:publish` until origin + walk probes are green twice (coach SYSTEM and empty SYSTEM).

---

## Out of scope

- Retraining to invent Blender-skinned heroes (content, not few-shots)
- `sanitizeAgentSlop` unit tests (still optional leftover from wave 8)
- Publishing public `medicinalsheep/threshold-mini-*` this pass
- Importing `datasets/raw/smart-dev-session-2026.jsonl`

---

## Suggested session order

1. ~~Audit local minis + golden + probe~~ **done (this doc)**
2. Seed `wave9_walk.jsonl` + origin grow + priority + golden/probe tighten
3. `train:mini -- --wave9` + `models:mobile`
4. Re-run golden + probe + art:audit · in-engine three questions
5. Commit datasets + Modelfiles (text only) · publish later

---

## Success criteria

| Gate | After wave 9 (2026-08-17) |
|------|---------------------------|
| Golden | **29/33 (88%) PASS** |
| Origin (empty + coach) | **PASS** — names medicinalsheep |
| Walk commands | **PASS** — `avatar:audit` + `walk:verify` |
| Clips | idle/walk/run present (3B may still mention jump) |
| TPS meaning | **PASS** — third person |
| Opener | How to / opener (golden still flaky on Shift+ENTER) |
| Art slug | **PASS** |
| `wave9:probe` | **15/15 PASS** |
| Residual | Golden 4 fails: opener Shift+ENTER fluke · Anthropic “No” only · `SurfaceProfile.set('player')` · Neg LOD distance (1.5b flaky) |
