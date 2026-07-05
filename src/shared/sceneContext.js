import { GraphicsProfile } from './graphicsProfile.js';
import { sanitizeUserDataForSync } from './lodSync.js';
import { LOD_DISTANCES } from './lodConfig.js';

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
        isPlayer: !!o.userData?.isPlayer,
        soundMode: o.userData?.soundMode || null,
        soundClipId: o.userData?.soundClipId || null,
        soundTrigger: o.userData?.soundTrigger || null,
        textures: o.userData?.textures || null,
        textureHint: o.userData?.textureHint || null,
        gltfUrl: o.userData?.gltfUrl || null,
        gltfPath: o.userData?.gltfPath || null,
        lodPaths: o.userData?.lodPaths || null,
        lodDistances: o.userData?.lodDistances || LOD_DISTANCES,
        textureHilod: o.userData?.textureHilod || null,
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
            : network?.mode === 'spectate'
                ? `- Session: SPECTATE room ${network.roomId} (read-only)`
                : '- Session: solo';

    return `
CURRENT LIVE SCENE (use as base — extend, do not blindly clear unless asked):
${netLine}
- Your player key: ${session?.playerKey || '?'}
- Graphics tier: ${State.graphicsTier || 'realistic'}${State.graphicsDetectedTier ? ` (detected: ${State.graphicsDetectedTier})` : ''}
- Render mode: ${MODE_NAMES[State.renderMode] || State.renderMode}
- Object count: ${objects.length}
- Time of day: ${env.timeOfDay ?? '?'}h
- Fog density: ${env.fogDensity ?? '?'}
- Water: ${env.waterEnabled ? 'ON' : 'OFF'}
- Atmosphere: ${env.atmosphereEnabled ? 'ON' : 'OFF'}
- Sim mode: ${State.isPaused ? 'EDIT (paused — world editable)' : 'PLAY (running — world locked)'}
- Control mode: ${State.controlMode || 'fly'}
${playerLine}
- Human NPCs: ${humanNpcCount} (static characters for reference)

OBJECTS:
${objects.length ? objects.map((o) => {
        const snd = o.soundClipId ? ` [sound:${o.soundClipId}/${o.soundTrigger || 'collision'}]` : '';
        const tex = o.textures
            ? ` [tex:${Object.entries(o.textures).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`).join(',')}]`
            : '';
        const lodCount = o.lodPaths?.length;
        const gltf = o.type === 'gltf'
            ? ` [gltf:${o.gltfPath || o.gltfUrl || '?'}${lodCount > 1 ? ` lod×${lodCount}` : ''}]`
            : '';
        return `  - ${o.name} (${o.type}) @ (${o.position.x},${o.position.y},${o.position.z})${snd}${tex}${gltf}`;
    }).join('\n') : '  (empty scene)'}

CURRENTLY RUNNING CODE:
${runningCode}
`.trim();
}

export function getAssetContext() {
    const State = window.State;
    const TextureLibrary = window.TextureLibrary;
    const objects = State?.objects || [];

    const textureClips = (TextureLibrary?.list?.() || []).map((t) => ({
        id: t.id,
        name: t.name,
        path: t.sourcePath || null,
    }));

    const sceneAssets = objects.map((o) => {
        const ud = o.userData || {};
        const slots = ud.textures
            ? Object.entries(ud.textures).filter(([, v]) => v).map(([slot, id]) => `${slot}:${id}`).join(', ')
            : null;
        return {
            name: ud.name,
            type: ud.type,
            textureHint: ud.textureHint || null,
            textureSlots: slots,
            gltfPath: ud.gltfPath || null,
            gltfUrl: ud.gltfUrl || null,
            gltfFile: ud.gltfFile || null,
        };
    }).filter((a) => a.textureHint || a.textureSlots || a.gltfPath || a.gltfUrl);

    const expectedPaths = sceneAssets.flatMap((a) => {
        const paths = [];
        if (a.textureHint) paths.push(a.textureHint);
        if (a.gltfPath) paths.push(a.gltfPath);
        return paths;
    });

    return `
ASSET MANIFEST (for PromptGen / Compiler — user imports files after RUN if paths are local):
- Texture library clips (IndexedDB): ${textureClips.length ? textureClips.map((t) => `${t.id} (${t.path || t.name})`).join('; ') : 'none'}
- Scene-linked assets:
${sceneAssets.length ? sceneAssets.map((a) => {
        const parts = [`  - ${a.name} (${a.type})`];
        if (a.textureSlots) parts.push(`maps: ${a.textureSlots}`);
        if (a.textureHint) parts.push(`hint: ${a.textureHint}`);
        if (a.gltfPath) parts.push(`gltf: ${a.gltfPath}`);
        else if (a.gltfUrl) parts.push(`gltf: ${a.gltfUrl}`);
        return parts.join(' · ');
    }).join('\n') : '  (none — set userData.textureHint or INSERT GLTF after Blender export)'}
- Expected local paths: ${expectedPaths.length ? expectedPaths.join(', ') : 'none yet'}
- GIMP export folder: textures/ + threshold_manifest.json → Engine Texture → GIMP SYNC
- Blender export folder: import/ + threshold_blender_manifest.json → INSERT → GLTF
- Dev hot-reload: npm run textures:watch (pairs with npm run dev)
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
        userData: sanitizeUserDataForSync(o.userData),
    }));
}