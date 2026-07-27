# Physics & engineering simulation

**Engine:** cannon-es · **Module:** `src/engine/physics.js` · **Version:** see `src/config.js`

Threshold physics is for **playable props + lightweight engineering demos** (mass, friction, hinges) — not FEM/soft-body CAD.

---

## PLAY / ARRANGE / EDIT

| Mode | Physics |
|------|---------|
| **PLAY** | `Physics.update` steps world · walk · push props |
| **ARRANGE** | Paused · select/drag/WASD props · kinematic while moving |
| **EDIT** | Paused · gizmo · inspector · insert |
| **Play as** | Solo possess · drives target body/mesh · player parked |

Solo **ENTER** defaults **PLAY** on the **terminal void** (empty grid). Hub top-left cycles **PLAY → ARRANGE → EDIT**. Kit is **not** auto-spawned.

---

## Entry (10.15+)

- **Default:** terminal void + `GridHelper` + simple ground (no auto kit / pad / AI)  
- **Opt-in:** INSERT → **QUALITY** tab (or CHARACTER)  
  - **PHYSICS KIT** · **AI BUILD STATION** · materials · **PHYSICS LAB** · **WORKSPACE PAD**  
- Lobby template **Workspace Pad** = pad + day light (opt-in base)  
- Pad API: `Environment.useWorkspacePad` / `QualityLadder.applyWorkspacePad`  

**CLEAR SIM SAMPLES** removes kit + lab props only.

---

## Inspector (truth)

On a dynamic object:

| Field | Effect |
|-------|--------|
| Physics | Add/remove body |
| Mass | Live `body.mass` (0 = static) |
| Friction | Per-body contact material |
| Restitution | Bounciness via contact material |

Always applied through `Physics.syncBodyFromUserData(mesh)`.

---

## API

```js
// Bodies
Physics.addBody(mesh, 'cube'|'sphere')
Physics.addBodyFromObject(root, mass)
Physics.syncBodyFromUserData(mesh)
Physics.setBodyMass(mesh, 12)
Physics.setStatic(mesh, true)
Physics.massFromDensity(mesh, 400)

// World
Physics.setGravity(0, -9.82, 0)
Physics.resetGravity()
Physics.setSolverIterations(24)
Physics.setTimeStep(1/60)
Physics.raycast(from, to)
Physics.raycastDown(origin, maxDist)

// Joints (max 48)
Physics.lockBodies(meshA, meshB)
Physics.hingeBodies(meshA, meshB, pivotA, pivotB, axis)
Physics.pointBodies(meshA, meshB, pivotA, pivotB)
Physics.removeConstraint(id)
Physics.clearConstraints()

// World shortcuts
World.hingeBodies(...)
World.setGravity(0, y, 0)
World.createObject('cube', 'Block', 0x888888, { physics: true, mass: 5, friction: 0.4, force: true })
```

SCENE panel: **Gravity Y** slider + RESET G.

---

## Agent rules

- Prefer real Cannon bodies over fake animation “physics”  
- Set `userData.mass` / `friction` / `restitution` then `syncBodyFromUserData`  
- Hinges need **both** bodies already in `State.physicsObjects`  
- Keep joint counts low; raise solver iterations for stiff stacks  

---

## Related

- [MATERIALS.md](MATERIALS.md) · [GETTING_STARTED.md](GETTING_STARTED.md) · [NEGATIVE_LOD.md](NEGATIVE_LOD.md)  
- Verify: `npm run physics:verify`
