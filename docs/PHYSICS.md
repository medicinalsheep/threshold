# Physics & engineering simulation

**Engine:** cannon-es · **Module:** `src/engine/physics.js` · **Version:** see `src/config.js`

Threshold physics is for **playable props + lightweight engineering demos** (mass, friction, hinges) — not FEM/soft-body CAD.

---

## PLAY vs EDIT

| Mode | Physics |
|------|---------|
| **PLAY** | `Physics.update` steps world · walk · push props |
| **EDIT** | Paused (`State.isPaused`) · place/tune · inspector |

Solo **ENTER** defaults **PLAY** on the workspace pad. Tap **EDIT** (top-left) to build.

---

## Entry workspace

- Concrete **slab pad** (`Environment.useWorkspacePad`) + matching pad collider  
- Infinite plane stays as a **safety net** under the pad  
- **Starter kit:** brick crate, sphere, ramp, hinge gate  
- **AI Build Station** for agents  

INSERT → **PHYSICS LAB SAMPLE** · **CLEAR SIM SAMPLES** · **MATERIAL LIBRARY EXAMPLES**

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
