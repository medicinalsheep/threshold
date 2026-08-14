/**
 * Play as — possess selected NPC / movable prop (solo-first).
 * Parks the real player mesh, drives target with walk controls + TPS camera.
 */
import * as THREE from 'three';

const TPS_DIST = 4.6;
const TPS_HEIGHT = 1.9;
const HUMAN_SPEED = 3.1;
const PROP_SPEED = 4.2;
const ACCEL = 14;
const DECEL = 18;
const PITCH_MIN = -0.4;
const PITCH_MAX = 1.2;
const JUMP = 5;

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
const _desired = new THREE.Vector3();

let _state = null;
let _camYaw = 0;
let _camPitch = 0.28;
let _velX = 0;
let _velZ = 0;
let _bound = false;
let _uiBound = false;
let _jumpLatch = false;

function State() {
    return window.State;
}

function isHumanLike(obj) {
    const ud = obj?.userData || {};
    return !!(ud.isHuman || ud.isCharacter || ud.type === 'human' || ud.humanParts);
}

function canPossess(obj) {
    if (!obj) return false;
    const ud = obj.userData || {};
    if (ud.isFloor || ud.negativeLodFloor || ud.isGridHelper) return false;
    if (ud.isPlayer) return false;
    if (ud.locked) return false;
    if (ud.isAiTerminal) return false;
    if (ud.isVehicle || ud.vehicleId || ud.drivenVehicle) return false;
    if (ud.playAsControlled && _state?.target !== obj) return false;
    return true;
}

function physicsEntry(mesh) {
    return State()?.physicsObjects?.find((p) => p.mesh === mesh) || null;
}

function ensurePlayMode() {
    const S = State();
    if (!S?.isPaused) {
        if (S) S.interactionMode = 'play';
        return;
    }
    if (window.ArrangeMode?.exitToPlay) {
        window.ArrangeMode.exitToPlay();
        return;
    }
    if (window.Session?.canControlPause?.()) {
        window.Session.setPaused?.(false, '');
    } else if (S) {
        S.isPaused = false;
        if (window.Session) {
            window.Session.isPaused = false;
            window.Session.pauseReason = '';
        }
    }
    if (S) S.interactionMode = 'play';
    window.UI?.updateSimMode?.();
}

function parkPlayer(PC) {
    if (!PC?.spawned) return null;
    const parked = {
        hadPlayer: true,
        pos: PC.group?.position?.clone?.() || null,
        bodyY: PC.body?.position?.y,
        visible: PC.group?.visible !== false,
        viewMode: window.State?.viewMode || 'tps',
        controlMode: window.State?.controlMode || 'walk',
        camYaw: PC._camYaw,
        camPitch: PC._camPitch,
    };
    if (PC.group) {
        PC.group.visible = false;
        PC.group.userData._playAsParked = true;
    }
    if (PC.body) {
        PC.body.velocity?.set?.(0, 0, 0);
        PC.body.angularVelocity?.set?.(0, 0, 0);
        PC.body.collisionResponse = false;
        PC._playAsMass = PC.body.mass;
        PC.body.mass = 0;
        PC.body.updateMassProperties?.();
        // Sink under floor so nothing collides
        PC.body.position.y = -50;
    }
    window.FpsViewmodel?.setVisible?.(false);
    return parked;
}

function restorePlayer(PC, parked, dropPos, yaw) {
    if (!PC?.spawned || !parked?.hadPlayer) return;
    const x = dropPos?.x ?? parked.pos?.x ?? 0;
    const y = dropPos?.y ?? parked.pos?.y ?? 0;
    const z = dropPos?.z ?? parked.pos?.z ?? 0;
    if (PC.group) {
        PC.group.visible = parked.visible !== false;
        delete PC.group.userData._playAsParked;
        PC.group.position.set(x, y, z);
    }
    if (PC.body) {
        PC.body.collisionResponse = true;
        if (PC._playAsMass != null) {
            PC.body.mass = PC._playAsMass;
            delete PC._playAsMass;
            PC.body.updateMassProperties?.();
        }
        PC.body.position.set(x, y + 0.86, z);
        PC.body.velocity?.set?.(0, 0, 0);
        PC.body.angularVelocity?.set?.(0, 0, 0);
    }
    if (yaw != null) PC._camYaw = yaw;
    if (parked.camPitch != null) PC._camPitch = parked.camPitch;
    window.State.controlMode = 'walk';
    if (parked.viewMode) window.State.viewMode = parked.viewMode;
    PC._applyViewMode?.();
    PC._syncWalkOrbit?.();
    PC._inheritLookFromCamera?.();
}

export const PlayAs = {
    isActive() {
        return !!_state;
    },

    getTarget() {
        return _state?.target || null;
    },

    canPossess(obj) {
        return canPossess(obj);
    },

    /**
     * Solo / offline, or host with no guests yet (CREATE SESSION empty room).
     * Multiplayer possess with remotes still deferred.
     */
    networkOk() {
        const mode = window.Network?.mode;
        if (!mode || mode === 'solo') return true;
        if (mode === 'host') {
            const peers = window.Network?.peerCount ?? 0;
            const remotes = window.RemotePlayers?.list?.()?.length
                ?? window.RemotePlayers?.count
                ?? 0;
            return peers === 0 && remotes === 0;
        }
        return false;
    },

    toggle(obj) {
        if (_state) {
            this.release();
            return false;
        }
        return this.possess(obj);
    },

    possess(obj) {
        if (_state) this.release({ silent: true });

        if (!this.networkOk()) {
            window.UI?.status?.('Play as: solo or empty host only (no guests yet)');
            return false;
        }

        const root = window.Engine?.resolveRegistryObject?.(obj) || obj || State()?.selectedObject;
        if (!canPossess(root)) {
            window.UI?.status?.('Select an NPC or movable prop first (not floor / locked / vehicle)');
            return false;
        }

        ensurePlayMode();
        window.Engine?.transformControl?.detach?.();
        window.Engine?._releaseLookLock?.();

        const PC = window.PlayerController;
        const parked = parkPlayer(PC);
        const entry = physicsEntry(root);
        const human = isHumanLike(root);
        const kind = human ? 'human' : 'prop';

        // Prefer dynamic body when present
        if (entry?.body) {
            entry.body.wakeUp?.();
            entry.body.velocity?.set?.(0, 0, 0);
            entry.body.angularVelocity?.set?.(0, 0, 0);
            // Un-sleep static mass-0 props: drive as kinematic position
            if (entry.body.mass > 0 && window.CANNON?.Body) {
                entry.body.type = window.CANNON.Body.DYNAMIC;
            }
        }

        const S = State();
        if (S) {
            S.controlMode = 'walk';
            S.viewMode = 'tps';
            S.playAs = {
                targetId: root.userData?.id || null,
                name: root.userData?.name || kind,
                kind,
            };
            S.interactionMode = 'play';
        }

        _camYaw = root.rotation?.y ?? 0;
        _camPitch = 0.28;
        _velX = 0;
        _velZ = 0;
        _jumpLatch = false;

        root.userData.playAsControlled = true;
        _state = { target: root, kind, human, entry, parked };

        document.body.classList.add('play-as-active');
        window.UI?.updateSimMode?.();
        window.UI?.status?.(
            `PLAY AS — ${root.userData?.name || kind} · WASD move · look · K / Esc release`,
        );
        this._bindKeys();
        // Auto pointer lock for look when possible
        setTimeout(() => window.Engine?._requestLookLock?.(), 40);
        return true;
    },

    release(opts = {}) {
        if (!_state) return;
        const { target, entry, parked } = _state;
        const drop = target?.position?.clone?.() || null;

        if (target?.userData) delete target.userData.playAsControlled;
        if (entry?.body) {
            entry.body.velocity?.set?.(0, 0, 0);
            entry.body.angularVelocity?.set?.(0, 0, 0);
            window.Engine?.syncPhysicsFromMesh?.(target);
        }

        const PC = window.PlayerController;
        restorePlayer(PC, parked, drop, _camYaw);

        _state = null;
        const S = State();
        if (S) S.playAs = null;
        document.body.classList.remove('play-as-active');
        window.Engine?._releaseLookLock?.();
        window.UI?.updateSimMode?.();
        if (!opts.silent) {
            window.UI?.status?.('Released — player restored at release position');
        }
    },

    applyLookInput(dx, dy, sens = 1) {
        if (!_state || State()?.isPaused) return;
        _camYaw -= dx * 0.003 * sens;
        _camPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, _camPitch + dy * 0.0025 * sens));
    },

    prePhysics(dt = 1 / 60) {
        if (!_state || State()?.isPaused || State()?.cutscenePlaying) return;
        const { target, entry, human } = _state;
        if (!target) {
            this.release({ silent: true });
            return;
        }
        // Target removed from scene?
        if (target.parent == null && !State()?.objects?.includes(target)) {
            this.release();
            return;
        }

        const frameDt = Math.min(0.05, Math.max(0.001, Number(dt) || 1 / 60));
        this._lastDt = frameDt;
        const Controls = window.Controls;
        _fwd.set(Math.sin(_camYaw), 0, Math.cos(_camYaw));
        _right.crossVectors(_fwd, new THREE.Vector3(0, 1, 0)).normalize();

        let mx = 0;
        let mz = 0;
        if (Controls?.isAction('forward')) {
            mx += _fwd.x;
            mz += _fwd.z;
        }
        if (Controls?.isAction('back')) {
            mx -= _fwd.x;
            mz -= _fwd.z;
        }
        if (Controls?.isAction('left')) {
            mx -= _right.x;
            mz -= _right.z;
        }
        if (Controls?.isAction('right')) {
            mx += _right.x;
            mz += _right.z;
        }

        const base = human ? HUMAN_SPEED : PROP_SPEED;
        const sprint = Controls?.isAction('sprint') ? 1.75 : 1;
        const speed = base * sprint;
        const len = Math.hypot(mx, mz);
        // Re-resolve physics each tick (body may be added/removed mid-possess)
        const liveEntry = physicsEntry(target) || entry;
        if (_state) _state.entry = liveEntry;
        const body = liveEntry?.body;
        const dynamic = !!(body && body.mass > 0);
        const jumpHeld = !!Controls?.isAction('jump');
        const jumpEdge = jumpHeld && !_jumpLatch;
        if (!jumpHeld) _jumpLatch = false;

        if (dynamic) {
            if (len > 0) {
                mx /= len;
                mz /= len;
                const tx = mx * speed;
                const tz = mz * speed;
                _velX += (tx - _velX) * Math.min(1, ACCEL * frameDt);
                _velZ += (tz - _velZ) * Math.min(1, ACCEL * frameDt);
                target.rotation.y = Math.atan2(_velX, _velZ);
            } else {
                _velX += (0 - _velX) * Math.min(1, DECEL * frameDt);
                _velZ += (0 - _velZ) * Math.min(1, DECEL * frameDt);
            }
            body.velocity.x = _velX;
            body.velocity.z = _velZ;
            if (human && jumpEdge && Math.abs(body.velocity.y) < 0.45) {
                body.velocity.y = JUMP;
                _jumpLatch = true;
            }
        } else {
            // Kinematic / mesh-only (NPCs without bodies, static props)
            if (len > 0) {
                mx /= len;
                mz /= len;
                const step = speed * frameDt;
                target.position.x += mx * step;
                target.position.z += mz * step;
                target.rotation.y = Math.atan2(mx, mz);
                if (body) {
                    body.position.x = target.position.x;
                    body.position.y = target.position.y;
                    body.position.z = target.position.z;
                    body.velocity?.set?.(0, 0, 0);
                    body.angularVelocity?.set?.(0, 0, 0);
                }
            }
            // One-shot hop only (no hold-to-float)
            if (human && jumpEdge) {
                const baseY = target.position.y;
                target.position.y = baseY + 0.35;
                if (body) body.position.y = target.position.y;
                _jumpLatch = true;
                setTimeout(() => {
                    if (!_state || _state.target !== target) return;
                    target.position.y = baseY;
                    if (body) body.position.y = baseY;
                }, 180);
            }
        }
    },

    postPhysics() {
        if (!_state) return;
        const { target, entry, human } = _state;
        if (!target) return;

        const body = entry?.body;
        if (body && body.mass > 0) {
            if (human) {
                target.position.set(body.position.x, body.position.y - 0.86, body.position.z);
            } else {
                target.position.copy(body.position);
                if (body.quaternion) {
                    target.quaternion.set(
                        body.quaternion.x,
                        body.quaternion.y,
                        body.quaternion.z,
                        body.quaternion.w,
                    );
                }
            }
            const speed = Math.hypot(body.velocity.x, body.velocity.z);
            if (human && window.HumanMesh?.updateWalk) {
                window.HumanMesh.updateWalk(target, speed, (this._lastDt || 1 / 60), speed > 4.5);
            }
        } else if (human && window.HumanMesh?.updateWalk) {
            // estimate speed from last frame velocity intent
            const sp = Math.hypot(_velX, _velZ) || (window.Controls?.isAction('forward') ? HUMAN_SPEED : 0);
            window.HumanMesh.updateWalk(target, sp, (this._lastDt || 1 / 60), sp > 4.5);
        }

        this._updateCamera(target);
    },

    _updateCamera(target) {
        const Engine = window.Engine;
        const camera = Engine?.camera;
        if (!camera) return;

        _box.setFromObject(target);
        if (!_box.isEmpty()) {
            _box.getCenter(_center);
            _box.getSize(_size);
        } else {
            _center.copy(target.position);
            _size.set(1, 1.7, 1);
        }

        const height = Math.max(0.4, _size.y);
        const dist = Math.max(TPS_DIST, Math.min(12, _size.length() * 1.35 + 1.2));
        const focus = _center.clone();
        focus.y = _box.isEmpty() ? target.position.y + height * 0.55 : _box.min.y + height * 0.62;

        const yaw = _camYaw;
        const pitch = _camPitch;
        _desired.set(
            focus.x - Math.sin(yaw) * Math.cos(pitch) * dist,
            focus.y + Math.sin(pitch) * dist + TPS_HEIGHT * 0.35,
            focus.z - Math.cos(yaw) * Math.cos(pitch) * dist,
        );
        camera.position.lerp(_desired, 0.16);
        camera.lookAt(focus);
        if (Engine.controls) {
            Engine.controls.enabled = false;
            Engine.controls.target.copy(focus);
        }
    },

    _bindKeys() {
        if (_bound) return;
        _bound = true;
        document.addEventListener(
            'keydown',
            (e) => {
                if (!_state) return;
                const tag = (e.target?.tagName || '').toLowerCase();
                if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
                if (e.code === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.release();
                }
            },
            true,
        );
    },

    /** Wire UI once (inspector + hub actions call possess/release) */
    bindUi() {
        if (_uiBound) return;
        _uiBound = true;
        document.getElementById('btn-play-as')?.addEventListener('click', () => {
            if (this.isActive()) this.release();
            else this.possess(State()?.selectedObject);
        });
        document.getElementById('btn-play-as-release')?.addEventListener('click', () => this.release());
    },

    refreshUi() {
        const btn = document.getElementById('btn-play-as');
        if (!btn) return;
        const sel = State()?.selectedObject;
        const active = this.isActive();
        btn.textContent = active ? 'RELEASE' : 'PLAY AS';
        btn.disabled = !active && !canPossess(sel);
        btn.title = active
            ? 'Stop possessing (K / Esc)'
            : 'Possess selection — solo · WASD · look';
    },
};

window.PlayAs = PlayAs;
