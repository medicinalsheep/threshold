# Action controls reference

**Version:** 10.12+ · Rebind in toolbar → **KEYS** (or corner hub → TOOLS in EDIT)

Default layout: **LMB aim (hold)** · **RMB shoot** · **F interact / Third Eye** · **M UI mouse** · **E vehicle** · **T chat** · **Alt** hold = temporary UI mouse.

Each action supports a **primary** key and an optional **2nd** key or mouse button (e.g. Voice PTT: `N` + **MMB** / Mouse4). Open **KEYS** → click **Key 1** or **+ 2nd** → press key or mouse. Mouse labels: LMB · MMB · RMB · Mouse4 · Mouse5.

See [UI_AND_AGENTS.md](UI_AND_AGENTS.md) for touch layout, UNLOCK UI edit, and agent freeze workflow.

---

## On foot (walk mode)

| Action | Default | Gamepad |
|--------|---------|---------|
| Move | WASD | L-stick |
| Sprint | Shift (hold) | L3 (hold) |
| Jump | Space | A / Cross |
| Crouch | Ctrl (hold) | LT / L2 (hold) |
| Stealth walk | **U** (hold) | — |
| Interact | F | X / Square |
| Enter vehicle | E | Y / Triangle |
| Aim (ADS) | **LMB** (hold) | LT / L2 (hold) |
| Fire | **RMB** · G | RT / R2 |
| Reload | R | LB / L1 |
| Melee | B | B / Circle |
| Holster | Z | — |
| Emote / hands up | X | — |
| Flashlight | L | — |
| Look behind | O | — |
| FPS / TPS | V | D-pad Down |
| Third Eye (highlights) | F toggle (when not interacting) | D-pad Up |
| UI mouse (no highlights) | **M** toggle · **Alt hold** peek (PLAY) | — |
| Voice PTT | N (hold) | — |
| Walk / fly toggle | Y | Y / Triangle |
| Session panel | Tab | — |
| Keys menu | ` | — |

**Mouse:** click canvas in PLAY to capture pointer (look). **Esc** releases.

| Mode | Key | Pointer | Highlights |
|------|-----|---------|------------|
| Aim (default) | click canvas | Locked (look) | Off |
| **UI mouse** | **M** / **Alt** hold | Free — hubs, panels, props | **Off** |
| **Third Eye** | **F** (no interact target) | Free | **On** (green / locked orange) |

No ADS while any free-pointer mode is active.

**Touch:** corner hub **TOUCH** · dual-stick practical default (v3):

| Zone | Controls |
|------|----------|
| **Bottom-left** | Move stick · RUN · CRH |
| **Bottom-right** | Look stick · **FIRE** · **ADS** · JMP · R · ATK |
| **Mid-right** | **F** interact · VEH · 👁 Third Eye · **UI** mouse |
| **Top-right** | Pause · FPS · light · holster |

Arrange via hub **UNLOCK** · **+ BTN** for custom · reset layout restores defaults.

---

## Fly / edit

| Action | Default |
|--------|---------|
| Move | WASD + Q up / C down |
| Camera | Mouse orbit (BUILD) or R-stick |
| Walk toggle | Y |

---

## Gamepad layout

| Stick / button | Action |
|----------------|--------|
| L-stick | Move |
| R-stick | Camera / aim |
| A / Cross | Jump |
| B / Circle | Melee |
| X / Square | Interact |
| Y / Triangle | Walk / fly · vehicle |
| LT / L2 | Aim (hold) |
| RT / R2 | Fire |
| LB / L1 | Reload |
| L3 | Sprint |
| D-pad Up | Third Eye |
| D-pad Down | FPS / TPS |

---

## Host only

| Action | Default |
|--------|---------|
| Pause (BUILD) | P |

Host keyboard + gamepad profiles sync to guests; guests override in **Guest** profile.

Saved bindings migrate automatically when defaults change (schema v2: LMB aim · RMB fire).

---

## Related

- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) — GIMP/Blender quality pipeline