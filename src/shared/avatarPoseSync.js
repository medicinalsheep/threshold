/**
 * Keep avatar LOD tiers posed in sync so zoom LOD swaps don't "hop".
 * Multi-clip locomotion (idle / walk / run) shared across LOD mixers.
 */
import * as THREE from 'three';

const WALK_CLIP_NAMES = ['walk', 'Walk', 'locomotion', 'Locomotion'];
const IDLE_CLIP_NAMES = ['idle', 'Idle', 'stand', 'Stand'];
const RUN_CLIP_NAMES = ['run', 'Run', 'sprint', 'Sprint'];
const PART_NAMES = ['legL', 'legR', 'armL', 'armR', 'torso', 'head', 'hips', 'shoulders', 'neck', 'collar', 'hairCap'];
const MOVE_EPS = 0.15;

function pickNamed(anims, names) {
    if (!anims?.length) return null;
    return anims.find((c) => names.some((n) => c.name?.includes(n))) || null;
}

function pickWalkClip(animations = []) {
    return pickNamed(animations, WALK_CLIP_NAMES) || animations[0] || null;
}

function pickMixerRoots(model) {
    const roots = [];
    if (!model) return roots;
    let skinned = null;
    model.traverse((c) => {
        if (c.isSkinnedMesh && c.skeleton?.bones?.length && !skinned) skinned = c;
    });
    if (skinned) roots.push(skinned);
    roots.push(model);
    const named = model.getObjectByName('StarterAvatar')
        || model.getObjectByName('StarterAvatarFemale')
        || model.getObjectByName('StarterGuard')
        || model.getObjectByName('StarterMech');
    if (named && named !== model) roots.push(named);
    return [...new Set(roots)];
}

function collectNamedParts(object) {
    const parts = {};
    if (!object) return parts;
    object.traverse((c) => {
        if (PART_NAMES.includes(c.name) && parts[c.name] == null) parts[c.name] = c;
    });
    return parts;
}

function captureBases(parts) {
    if (!parts) return null;
    const base = {};
    if (parts.torso) base.torsoY = parts.torso.position.y;
    if (parts.shoulders) base.shouldersY = parts.shoulders.position.y;
    if (parts.collar) base.collarY = parts.collar.position.y;
    if (parts.neck) base.neckY = parts.neck.position.y;
    if (parts.head) base.headY = parts.head.position.y;
    if (parts.hairCap) base.hairY = parts.hairCap.position.y;
    if (parts.hips) base.hipsY = parts.hips.position.y;
    return base;
}

function makeAction(mixer, clip, weight = 0) {
    if (!mixer || !clip) return null;
    const action = mixer.clipAction(clip);
    action.enabled = true;
    action.setEffectiveWeight(weight);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    action.paused = weight <= 0;
    return action;
}

function buildLocoActions(mixer, idleClip, walkClip, runClip) {
    if (!mixer || !walkClip) return null;
    const walk = makeAction(mixer, walkClip, 1);
    const idle = idleClip && idleClip !== walkClip
        ? makeAction(mixer, idleClip, 0)
        : null;
    const run = runClip && runClip !== walkClip
        ? makeAction(mixer, runClip, 0)
        : null;
    return { idle, walk, run, singleClip: !idle && !run };
}

function setLoco(actions, name, timeScale = 1) {
    if (!actions) return;
    // Same clip must not be three keys — last Object.entries pass zeros weight
    if (actions.singleClip || (!actions.idle && !actions.run)) {
        const a = actions.walk;
        if (!a) return;
        a.enabled = true;
        a.setEffectiveWeight(1);
        a.play();
        if (name === 'idle') {
            a.paused = true;
            a.timeScale = 0;
        } else {
            a.paused = false;
            a.timeScale = name === 'run' ? Math.max(timeScale, 1.35) : timeScale;
        }
        return;
    }
    for (const key of ['idle', 'walk', 'run']) {
        const action = actions[key];
        if (!action) continue;
        const exact = key === name;
        if (exact) {
            action.setEffectiveWeight(1);
            action.paused = false;
            action.timeScale = timeScale;
            action.play();
        } else {
            action.setEffectiveWeight(0);
            action.paused = true;
            action.timeScale = 0;
        }
    }
}

function pickLocoName(speed, sprinting) {
    if (speed <= MOVE_EPS) return 'idle';
    if (sprinting || speed > 5.2) return 'run';
    return 'walk';
}

function bindLocoOnScene(scene, anims) {
    if (!scene) return null;
    const walk = pickWalkClip(anims);
    if (!walk) return null;
    const idle = pickNamed(anims, IDLE_CLIP_NAMES);
    const run = pickNamed(anims, RUN_CLIP_NAMES);
    const leg = scene.getObjectByName('legL');

    for (const root of pickMixerRoots(scene)) {
        try {
            const mixer = new THREE.AnimationMixer(root);
            const probe = makeAction(mixer, walk, 1);
            probe.paused = false;
            probe.timeScale = 1;
            if (leg) {
                const q0 = leg.quaternion.clone();
                mixer.update(0.12);
                if (q0.equals(leg.quaternion)) {
                    mixer.stopAllAction();
                    continue;
                }
            }
            mixer.stopAllAction();
            const actions = buildLocoActions(mixer, idle, walk, run);
            setLoco(actions, idle ? 'idle' : 'idle', 1);
            return {
                mixer,
                action: actions.walk || actions.idle,
                actions,
                scene,
                root,
                clips: {
                    idle: idle?.name || null,
                    walk: walk.name,
                    run: run?.name || null,
                },
            };
        } catch {
            /* next */
        }
    }
    return null;
}

export function setupAvatarLodMixers(group) {
    if (!group) return;
    const scenes = group.userData?._lodScenes;
    if (!scenes?.length) return;

    if (group.userData.avatarLodMixers) {
        for (const row of group.userData.avatarLodMixers) {
            try { row.mixer?.stopAllAction?.(); } catch { /* */ }
        }
    }

    const rows = [];
    scenes.forEach((scene, i) => {
        const anims = scene.userData?._gltfAnimations
            || (i === 0 ? group.userData?._lod0Animations : null)
            || [];
        const parts = collectNamedParts(scene);
        if (parts.legL && !parts._base) parts._base = captureBases(parts);
        scene.userData._lodParts = parts;

        const bound = bindLocoOnScene(scene, anims);
        if (bound) {
            rows.push({
                mixer: bound.mixer,
                action: bound.action,
                actions: bound.actions,
                scene,
                index: i,
                root: bound.root,
                clips: bound.clips,
            });
        }
    });

    group.userData.avatarLodMixers = rows;

    if (scenes[0]?.userData?._lodParts?.legL) {
        group.userData.humanParts = scenes[0].userData._lodParts;
    }

    if (rows[0]) {
        group.userData.mixer = rows[0].mixer;
        group.userData.mixerClip = rows[0].action;
        group.userData.locoActions = rows[0].actions;
        group.userData.locoClips = rows[0].clips;
        group.userData.locoActive = rows[0].actions?.idle ? 'idle' : 'walk';
        group.userData.walkMode = 'mixer';
        group.userData.walkClipName = rows[0].clips?.walk || 'walk';
    } else {
        group.userData.mixer = null;
        group.userData.mixerClip = null;
        group.userData.locoActions = null;
        group.userData.walkMode = group.userData.humanParts?.legL ? 'procedural' : 'none';
        if (window.HumanMesh?.rebindWalk) window.HumanMesh.rebindWalk(group);
    }

    if (!group.userData._walkLodLogged) {
        group.userData._walkLodLogged = true;
        const c = group.userData.locoClips || {};
        console.info(
            `[avatar-lod] walk mode=${group.userData.walkMode} mixers=${rows.length} clips=${[c.idle, c.walk, c.run].filter(Boolean).join(',') || '—'}`,
        );
    }
}

export function updateAvatarLodPose(group, horizontalSpeed, dt = 0.016, sprinting = false) {
    if (!group) return false;
    if (group.userData?.walkMode === 'procedural') return false;

    const rows = group.userData?.avatarLodMixers;
    const scenes = group.userData?._lodScenes;
    if (!rows?.length) return false;

    const speed = Number(horizontalSpeed) || 0;
    const frameDt = Number.isFinite(dt) && dt > 0 ? Math.min(0.08, Math.max(1 / 240, dt)) : 1 / 60;
    const want = pickLocoName(speed, sprinting);
    const walkTs = Math.max(0.55, Math.min(speed / 3.2, 2.0));
    const runTs = sprinting ? 1.15 : 1;

    if (group.userData.locoActive !== want) {
        group.userData.locoActive = want;
    }

    let sharedTime = 0;
    const primary = rows[0]?.actions?.[want] || rows[0]?.action;
    for (const row of rows) {
        const actions = row.actions;
        if (actions) {
            const ts = want === 'walk' ? walkTs : want === 'run' ? runTs : 1;
            setLoco(actions, want, ts);
            if (want !== 'idle' && primary && actions[want] && row !== rows[0]) {
                actions[want].time = primary.time;
            }
        } else if (row.action) {
            // Legacy single-clip row
            const moving = speed > MOVE_EPS;
            row.action.paused = !moving;
            row.action.timeScale = moving ? walkTs : 0;
        }
        row.mixer.update(frameDt);
        if (row === rows[0] && primary) sharedTime = primary.time;
    }

    // Align non-primary clip times
    if (want !== 'idle') {
        for (let i = 1; i < rows.length; i += 1) {
            const a = rows[i].actions?.[want];
            if (a && Number.isFinite(sharedTime)) {
                a.time = sharedTime;
                rows[i].mixer.update(0);
            }
        }
    }

    const active = group.userData?.lodActive ?? 0;
    if (scenes?.length > 1 && active > 0) {
        const srcParts = scenes[0]?.userData?._lodParts || collectNamedParts(scenes[0]);
        const dst = scenes[active];
        const hasMixer = rows?.some((r) => r.scene === dst);
        if (!hasMixer && srcParts && dst) {
            const dstParts = dst.userData?._lodParts || collectNamedParts(dst);
            for (const name of PART_NAMES) {
                const a = srcParts[name];
                const b = dstParts[name];
                if (a && b) {
                    b.quaternion.copy(a.quaternion);
                    b.rotation.copy(a.rotation);
                }
            }
        }
    }

    const activeScene = scenes?.[active] || scenes?.[0];
    if (activeScene?.userData?._lodParts?.legL) {
        group.userData.humanParts = activeScene.userData._lodParts;
    }

    return true;
}

export function disposeAvatarLodMixers(group) {
    if (!group?.userData?.avatarLodMixers) return;
    for (const row of group.userData.avatarLodMixers) {
        try { row.mixer?.stopAllAction?.(); } catch { /* */ }
    }
    group.userData.avatarLodMixers = null;
}

window.AvatarPoseSync = {
    setupAvatarLodMixers,
    updateAvatarLodPose,
    disposeAvatarLodMixers,
};
