/** Phase 18.3 — Tesla lab guide NPC, intro captions, lab radio zone */

import { NpcPatrol } from './npcPatrol.js';
import { spawnHumanWithAvatar } from './avatarLoader.js';

const LAB_BENCH = { x: -8.6, z: 3.45 };
const LAB_COIL = { x: -9.35, z: 1.55 };

export const INTRO_CAPTIONS = [
    { at: 0, dur: 1150, text: 'THRESHOLD RESEARCH LAB — Wardenclyffe Annex' },
    { at: 1200, dur: 1500, text: 'Lattice tower online · calibrating field coils' },
    { at: 2800, dur: 1400, text: 'Brick facade · vacuum tubes · Leyden array' },
    { at: 4300, dur: 1700, text: 'Approach the entrance — your project build begins here' },
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

    const npc = await spawnHumanWithAvatar({
        id: 'tesla_guide_npc',
        appearance: {
            bodyColor: 0xe8e4dc,
            pantsColor: 0x2a2830,
            skinColor: 0xd4a882,
            hairColor: 0x3a3028,
        },
    });
    npc.position.set(LAB_COIL.x, 0, LAB_COIL.z);
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
        { x: -10.5, z: 3.6 },
        { x: -10.2, z: 1.0 },
    ], 0.88);

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