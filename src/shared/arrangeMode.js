/**
 * Arrange mode — select props/NPCs, move with drag + WASD, snap via GridSystem.
 * Physics paused (same as EDIT). PLAY = sim; EDIT = full gizmo/inspector.
 */
import * as THREE from 'three';
import { ViewPrefs } from './viewPrefs.js';

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _hit = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();

let _drag = null;
let _keyNudgeAccum = { x: 0, z: 0 };
let _bound = false;
let _highlight = null;

function State() {
    return window.State;
}

function isArrange() {
    return State()?.interactionMode === 'arrange';
}

function canArrangeTarget(obj) {
    if (!obj) return false;
    const ud = obj.userData || {};
    if (ud.isFloor || ud.negativeLodFloor || ud.isGridHelper) return false;
    if (ud.isPlayer) return false;
    if (ud.locked) return false;
    if (ud.isAiTerminal) return false;
    return true;
}

function pickFilter(obj) {
    const root = window.Engine?.resolveRegistryObject?.(obj) || obj;
    if (!root) return null;
    const ud = root.userData || {};
    if (ud.isFloor || ud.negativeLodFloor || ud.isGridHelper) return null;
    if (ud.isPlayer) return null;
    return root;
}

function setBodyKinematic(mesh, on) {
    const entry = State()?.physicsObjects?.find((p) => p.mesh === mesh);
    if (!entry?.body) return;
    const body = entry.body;
    if (on) {
        if (body._arrangeMass == null) body._arrangeMass = body.mass;
        body.mass = 0;
        body.updateMassProperties?.();
        body.velocity?.set?.(0, 0, 0);
        body.angularVelocity?.set?.(0, 0, 0);
        body.type = window.CANNON?.Body?.KINEMATIC ?? body.type;
    } else {
        const m = body._arrangeMass ?? mesh.userData?.mass ?? 1;
        delete body._arrangeMass;
        body.mass = m;
        body.updateMassProperties?.();
        if (window.CANNON?.Body) {
            body.type = m > 0 ? window.CANNON.Body.DYNAMIC : window.CANNON.Body.STATIC;
        }
        window.Physics?.syncBodyFromUserData?.(mesh);
    }
}

function applyPos(mesh, x, y, z) {
    let px = x;
    let py = y;
    let pz = z;
    if (window.GridSystem?.isSnapEnabled?.()) {
        const s = window.GridSystem.snapPosition({ x, y, z }, { y: false });
        px = s.x;
        py = s.y;
        pz = s.z;
    }
    mesh.position.set(px, py, pz);
    mesh.updateMatrixWorld?.(true);
    const entry = State()?.physicsObjects?.find((p) => p.mesh === mesh);
    if (entry?.body) {
        entry.body.position.set(px, py, pz);
        entry.body.velocity?.set?.(0, 0, 0);
        entry.body.angularVelocity?.set?.(0, 0, 0);
    }
}

function clearHighlight() {
    if (_highlight?.mat && _highlight.mesh) {
        try {
            if (_highlight.mesh.material) {
                const mats = Array.isArray(_highlight.mesh.material)
                    ? _highlight.mesh.material
                    : [_highlight.mesh.material];
                mats.forEach((m, i) => {
                    if (m && _highlight.emissive?.[i] != null) {
                        m.emissive?.setHex?.(_highlight.emissive[i]);
                        m.emissiveIntensity = _highlight.intensity?.[i] ?? 0;
                    }
                });
            }
        } catch { /* */ }
    }
    _highlight = null;
}

function highlightObject(root) {
    clearHighlight();
    if (!root) return;
    // Tint first mesh emissive lightly
    let target = null;
    root.traverse?.((c) => {
        if (!target && c.isMesh && c.material) target = c;
    });
    if (!target && root.isMesh) target = root;
    if (!target?.material) return;
    const mats = Array.isArray(target.material) ? target.material : [target.material];
    const emissive = [];
    const intensity = [];
    mats.forEach((m) => {
        emissive.push(m.emissive?.getHex?.() ?? 0);
        intensity.push(m.emissiveIntensity ?? 0);
        if (m.emissive) {
            m.emissive.setHex(0x39ff14);
            m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.35);
            m.needsUpdate = true;
        }
    });
    _highlight = { mesh: target, emissive, intensity };
}

export const ArrangeMode = {
    isActive() {
        return isArrange();
    },

    canMove(obj) {
        return canArrangeTarget(obj);
    },

    enter() {
        const S = State();
        if (!S) return;
        // Pause physics like EDIT
        if (window.Session?.canControlPause?.()) {
            window.Session.setPaused?.(true, 'ARRANGE');
        } else {
            S.isPaused = true;
            if (window.Session) {
                window.Session.isPaused = true;
                window.Session.pauseReason = 'ARRANGE';
            }
        }
        S.interactionMode = 'arrange';
        ViewPrefs.set('sessionMode', 'build');
        window.Engine?._releaseLookLock?.();
        window.Engine?.transformControl?.detach?.();
        window.PlayerController?._syncWalkOrbit?.();
        window.UI?.updateSimMode?.();
        this._bindInput();
        window.UI?.status?.('ARRANGE — click to select · drag or WASD to move · Snap in SCENE · Esc deselect');
    },

    _restoreSelectedBody() {
        const obj = State()?.selectedObject;
        if (obj) setBodyKinematic(obj, false);
    },

    exitToPlay() {
        this._endDrag();
        this._restoreSelectedBody();
        clearHighlight();
        const S = State();
        if (S) S.interactionMode = 'play';
        if (window.Session?.canControlPause?.()) {
            window.Session.setPaused?.(false, '');
        } else if (S) {
            S.isPaused = false;
            if (window.Session) {
                window.Session.isPaused = false;
                window.Session.pauseReason = '';
            }
        }
        window.UI?.updateSimMode?.();
        window.UI?.status?.('PLAY — walk · sim');
    },

    exitToEdit() {
        this._endDrag();
        this._restoreSelectedBody();
        clearHighlight();
        const S = State();
        if (S) S.interactionMode = 'edit';
        if (window.Session?.canControlPause?.()) {
            window.Session.setPaused?.(true, 'EDIT');
        } else if (S) {
            S.isPaused = true;
        }
        window.UI?.updateSimMode?.();
        const obj = S?.selectedObject;
        if (obj && !obj.userData?.locked && window.SimMode?.isEdit?.()) {
            window.Engine?.transformControl?.attach?.(obj);
            window.GridSystem?.applyTransformSnap?.();
        }
        window.UI?.status?.('EDIT — gizmo · inspector · insert');
    },

    /** Cycle PLAY → ARRANGE → EDIT → PLAY. Returns true when handled. */
    cycleMode() {
        const S = State();
        if (!S) return false;
        if (window.Network?.mode === 'guest') {
            window.UI?.status?.('Only the host can change mode');
            return true;
        }
        const mode = S.interactionMode || (S.isPaused ? 'edit' : 'play');
        if (mode === 'play') this.enter();
        else if (mode === 'arrange') this.exitToEdit();
        else this.exitToPlay();
        return true;
    },

    setMode(mode) {
        if (mode === 'arrange') this.enter();
        else if (mode === 'edit') this.exitToEdit();
        else this.exitToPlay();
    },

    select(obj) {
        const root = pickFilter(obj) || obj;
        if (!root) {
            this.deselect();
            return null;
        }
        if (root.userData?.isFloor) {
            this.deselect();
            return null;
        }
        // Restore previous body before switching selection (avoid kinematic mass leak)
        const prev = State()?.selectedObject;
        if (prev && prev !== root) setBodyKinematic(prev, false);

        window.UI?.selectObject?.(root);
        // Detach gizmo in arrange — we use drag/WASD
        window.Engine?.transformControl?.detach?.();
        if (canArrangeTarget(root)) {
            setBodyKinematic(root, true);
            highlightObject(root);
        } else {
            clearHighlight();
            window.UI?.status?.('Selected (locked) — cannot arrange');
        }
        return root;
    },

    deselect() {
        const obj = State()?.selectedObject;
        if (obj) setBodyKinematic(obj, false);
        this._endDrag();
        clearHighlight();
        window.UI?.deselectObject?.();
    },

    _bindInput() {
        if (_bound) return;
        _bound = true;
        const canvas = () => window.Engine?.renderer?.domElement;
        const onDown = (e) => this._onPointerDown(e);
        const onMove = (e) => this._onPointerMove(e);
        const onUp = (e) => this._onPointerUp(e);
        const onKey = (e) => this._onKeyDown(e);
        // Capture phase so we run before walk look-lock when arranging
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('pointermove', onMove, true);
        document.addEventListener('pointerup', onUp, true);
        document.addEventListener('keydown', onKey, true);
        this._unsub = () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('pointermove', onMove, true);
            document.removeEventListener('pointerup', onUp, true);
            document.removeEventListener('keydown', onKey, true);
            _bound = false;
        };
        // Keep listeners always; gate inside handlers with isArrange()
    },

    _onPointerDown(e) {
        if (!isArrange() || e.button !== 0) return;
        const canvas = window.Engine?.renderer?.domElement;
        if (!canvas || e.target !== canvas) return;
        // Don't steal UI
        if (e.target.closest?.('.corner-hub, .panel, .dock, button, input, select, textarea, a')) return;

        e.preventDefault();
        e.stopPropagation();

        const Engine = window.Engine;
        const rect = canvas.getBoundingClientRect();
        _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        Engine.mouse.copy(_ndc);
        const picked = Engine.pickObjectAtMouse?.();
        const root = pickFilter(picked);

        if (root && canArrangeTarget(root)) {
            this.select(root);
            // Start drag
            _raycaster.setFromCamera(_ndc, Engine.camera);
            _plane.constant = 0;
            _plane.normal.set(0, 1, 0);
            // Plane at object Y
            const y = root.position.y;
            _plane.setFromNormalAndCoplanarPoint(
                new THREE.Vector3(0, 1, 0),
                new THREE.Vector3(0, y, 0),
            );
            if (_raycaster.ray.intersectPlane(_plane, _hit)) {
                _offset.copy(root.position).sub(_hit);
                _drag = { mesh: root, pointerId: e.pointerId, y };
                try { canvas.setPointerCapture?.(e.pointerId); } catch { /* */ }
            }
        } else if (root) {
            this.select(root);
        } else {
            this.deselect();
        }
    },

    _onPointerMove(e) {
        if (!isArrange() || !_drag) return;
        const canvas = window.Engine?.renderer?.domElement;
        if (!canvas) return;
        const Engine = window.Engine;
        const rect = canvas.getBoundingClientRect();
        _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_ndc, Engine.camera);
        _plane.setFromNormalAndCoplanarPoint(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, _drag.y, 0),
        );
        if (_raycaster.ray.intersectPlane(_plane, _hit)) {
            const next = _hit.add(_offset);
            applyPos(_drag.mesh, next.x, _drag.y, next.z);
        }
    },

    _onPointerUp(e) {
        if (!_drag) return;
        const canvas = window.Engine?.renderer?.domElement;
        try { canvas?.releasePointerCapture?.(e.pointerId); } catch { /* */ }
        if (_drag.mesh) {
            // Final snap
            const p = _drag.mesh.position;
            applyPos(_drag.mesh, p.x, p.y, p.z);
            window.Engine?.syncPhysicsFromMesh?.(_drag.mesh);
        }
        _drag = null;
    },

    _endDrag() {
        if (_drag?.mesh) {
            setBodyKinematic(_drag.mesh, true);
            window.Engine?.syncPhysicsFromMesh?.(_drag.mesh);
        }
        _drag = null;
    },

    _onKeyDown(e) {
        if (!isArrange()) return;
        const tag = (e.target?.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;

        if (e.code === 'Escape') {
            e.preventDefault();
            this.deselect();
            return;
        }

        const obj = State()?.selectedObject;
        if (!obj || !canArrangeTarget(obj)) return;

        const cell = window.GridSystem?.getCellSize?.() || 1;
        const snap = window.GridSystem?.isSnapEnabled?.() !== false;
        const step = snap ? cell : cell * 0.25;

        const cam = window.Engine?.camera;
        if (!cam) return;
        cam.getWorldDirection(_fwd);
        _fwd.y = 0;
        if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
        else _fwd.normalize();
        _right.crossVectors(_fwd, new THREE.Vector3(0, 1, 0)).normalize();

        let dx = 0;
        let dz = 0;
        let dy = 0;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            dx += _fwd.x * step;
            dz += _fwd.z * step;
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            dx -= _fwd.x * step;
            dz -= _fwd.z * step;
        }
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
            dx -= _right.x * step;
            dz -= _right.z * step;
        }
        if (e.code === 'KeyD' || e.code === 'ArrowRight') {
            dx += _right.x * step;
            dz += _right.z * step;
        }
        if (e.code === 'KeyQ' || e.code === 'PageDown') dy -= step;
        if (e.code === 'KeyE' || e.code === 'PageUp') dy += step;
        if (e.code === 'KeyR' && !e.repeat) {
            // Rotate 90° around Y when snap, else 15°
            const stepRad = snap ? Math.PI / 2 : (15 * Math.PI) / 180;
            obj.rotation.y += e.shiftKey ? -stepRad : stepRad;
            if (snap) obj.rotation.y = window.GridSystem.snapRotationY(obj.rotation.y, 90);
            obj.updateMatrixWorld?.(true);
            window.Engine?.syncPhysicsFromMesh?.(obj);
            e.preventDefault();
            return;
        }

        if (dx === 0 && dz === 0 && dy === 0) return;
        e.preventDefault();
        applyPos(obj, obj.position.x + dx, obj.position.y + dy, obj.position.z + dz);
        window.Engine?.syncPhysicsFromMesh?.(obj);
    },
};

window.ArrangeMode = ArrangeMode;
