const MODE_NAMES = ['Threshold', '1-Bit', 'Terminal', 'SMPTE', 'Hyper'];

export function getSceneContext() {
    const State = window.State;
    const Engine = window.Engine;
    if (!State || !Engine) return 'Scene not loaded.';

    const objects = (State.objects || []).map((o) => ({
        name: o.userData?.name,
        type: o.userData?.type,
        color: o.material?.color?.getHexString?.() || null,
        position: { x: +o.position.x.toFixed(2), y: +o.position.y.toFixed(2), z: +o.position.z.toFixed(2) },
        physics: !!o.userData?.hasPhysics,
        rotating: !!o.userData?.isRotating,
        isHuman: !!(o.userData?.isHuman || o.userData?.isCharacter),
        isPlayer: !!o.userData?.isPlayer
    }));
    const humanNpcCount = objects.filter((o) => o.isHuman && !o.isPlayer).length;

    const env = State.env || {};
    const runningCode = window.Runtime?.runningCode || '(none)';
    const network = window.Network;
    const session = window.Session;
    const player = window.PlayerController;
    const playerLine = player?.spawned
        ? `- Playable human: YES @ (${player.group.position.x.toFixed(1)}, ${player.group.position.y.toFixed(1)}, ${player.group.position.z.toFixed(1)})`
        : '- Playable human: none (use World.spawnPlayablePlayer() or Insert → Spawn as Player)';
    const netLine = network?.mode === 'host'
        ? `- Session: HOST room ${network.roomId}, ${network.peerCount} guest(s)`
        : network?.mode === 'guest'
            ? `- Session: GUEST in room ${network.roomId}`
            : '- Session: solo';

    return `
CURRENT LIVE SCENE (use as base — extend, do not blindly clear unless asked):
${netLine}
- Your player key: ${session?.playerKey || '?'}
- Render mode: ${MODE_NAMES[State.renderMode] || State.renderMode}
- Object count: ${objects.length}
- Time of day: ${env.timeOfDay ?? '?'}h
- Fog density: ${env.fogDensity ?? '?'}
- Water: ${env.waterEnabled ? 'ON' : 'OFF'}
- Atmosphere: ${env.atmosphereEnabled ? 'ON' : 'OFF'}
- Paused: ${State.isPaused ? 'YES' : 'NO'}
- Control mode: ${State.controlMode || 'fly'}
${playerLine}
- Human NPCs: ${humanNpcCount} (static characters for reference)

OBJECTS:
${objects.length ? objects.map((o) => `  - ${o.name} (${o.type}) @ (${o.position.x},${o.position.y},${o.position.z})`).join('\n') : '  (empty scene)'}

CURRENTLY RUNNING CODE:
${runningCode}
`.trim();
}

export function getSceneObjectsForSpawn() {
    const State = window.State;
    if (!State?.objects) return [];
    return State.objects.map((o) => ({
        type: o.userData?.type,
        name: o.userData?.name,
        color: o.material?.color?.getHex?.() ?? 0xffffff,
        pos: { x: o.position.x, y: o.position.y, z: o.position.z },
        rot: { x: o.rotation.x, y: o.rotation.y, z: o.rotation.z },
        scl: { x: o.scale.x, y: o.scale.y, z: o.scale.z },
        userData: { ...o.userData }
    }));
}