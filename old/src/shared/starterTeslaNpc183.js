/** Phase 18.3 / 19.5 / R8.2.7 — Nikola lab guide, coat prop, intro captions */

import { NpcPatrol } from './npcPatrol.js';
import { spawnHumanWithAvatar } from './avatarLoader.js';
import { AvatarManifest } from './avatarManifest.js';
import { attachLabCoat } from './labCoatProp.js';
import { labPos } from './starterSiteLayout.js';

const LAB_BENCH = labPos(-2.8, -1.2);
const LAB_COIL = labPos(0.2, -0.35);
const LAB_TUBES = labPos(4.5, 0.9);
const LAB_ROTARY = labPos(-4.2, -0.85);

export const INTRO_CAPTIONS = [
    { at: 0, dur: 1400, text: 'THRESHOLD — Wardenclyffe Research Lab' },
    { at: 1500, dur: 1500, text: 'Lab north · courtyard demos south · Nikola on patrol' },
    { at: 3100, dur: 1400, text: 'ESC to skip · F to talk · PromptGen extends your world' },
];

export const TeslaIntroCaptions = {
    _el: null,
    _lastKey: '',

    init() {
        this._el = document.getElementById('intro-caption');
    },

    _hide() {
        if (!this._el) return;
        this._el.classList.remove('visible');
        this._el.textContent = '';
        this._lastKey = '';
    },

    tick() {
        const State = window.State;
        if (!this._el) this.init();
        if (!this._el || !State?.introPlaying) {
            this._hide();
            return;
        }

        const elapsed = performance.now() - (State.introStart || 0);
        const line = INTRO_CAPTIONS.find((c) => elapsed >= c.at && elapsed < c.at + c.dur);
        if (!line) {
            this._hide();
            return;
        }

        const key = `${line.at}:${line.text}`;
        if (key !== this._lastKey) {
            this._el.textContent = line.text;
            this._lastKey = key;
        }
        this._el.classList.add('visible');
    },
};

export async function spawnTeslaGuideNpc() {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !State) return null;

    if (State.objects.some((o) => o.userData?.id === 'tesla_guide_npc')) {
        return null;
    }

    const THREE = window.THREE;
    const roleBase = AvatarManifest.resolveProfileForRole('tesla_guide');
    const npc = await spawnHumanWithAvatar({
        id: 'tesla_guide_npc',
        appearance: {
            ...roleBase,
            bodyColor: 0xf0ece4,
            pantsColor: 0x2a2830,
            skinColor: 0xd4a882,
            hairColor: 0x3a3028,
        },
    });
    if (THREE) attachLabCoat(npc, THREE);
    npc.position.set(LAB_COIL.x, LAB_COIL.y, LAB_COIL.z);
    npc.rotation.y = 0.65;
    npc.userData = {
        id: 'tesla_guide_npc',
        name: 'Nikola',
        type: 'human',
        isHuman: true,
        isCharacter: true,
        locked: false,
        idleSeed: 1.8,
        thirdEyeTarget: true,
        interactAction: 'agents',
        interactLabel: 'Nikola — lab guide',
        interactHint: 'Nikola — coil safety · tube warm-up · PromptGen tips',
        interactRadius: 2.4,
        labCoat: true,
    };
    Engine.scene.add(npc);
    State.objects.push(npc);

    NpcPatrol.register(npc, [
        { x: LAB_COIL.x, z: LAB_COIL.z },
        { x: LAB_BENCH.x, z: LAB_BENCH.z },
        { x: LAB_TUBES.x, z: LAB_TUBES.z },
        { x: LAB_ROTARY.x, z: LAB_ROTARY.z },
    ], 0.82);

    return npc;
}

export const StarterTeslaNpc183 = {
    async ensureGuide() {
        return spawnTeslaGuideNpc();
    },
};

window.TeslaIntroCaptions = TeslaIntroCaptions;
window.StarterTeslaNpc183 = StarterTeslaNpc183;
window.spawnTeslaGuideNpc = spawnTeslaGuideNpc;