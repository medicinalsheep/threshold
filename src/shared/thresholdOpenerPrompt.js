/**
 * Lobby "How to" — copy Threshold project link + Grok Build / chat opener prompt.
 * Same idea as grokdevprompt / grokmusicvideoprompt: paste into Grok as a starter.
 */
import { APP_URL, VERSION } from '../config.js';

export const REPO_URL = 'https://github.com/medicinalsheep/threshold';
export const CHANGELOG_URL = `${REPO_URL}/blob/main/docs/CHANGELOG.md`;
export const BUILD_FROM_URL = `${REPO_URL}/blob/main/docs/BUILD_FROM.md`;
export const README_URL = `${REPO_URL}/blob/main/README.md`;

/** Live app URL (Pages or current origin when on a deployed host). */
export function getProjectLink() {
    try {
        const origin = typeof window !== 'undefined' ? window.location?.origin : '';
        const path = typeof window !== 'undefined' ? window.location?.pathname || '/' : '/';
        // Prefer live origin when already on github pages / custom host
        if (origin && /github\.io|threshold/i.test(origin + path)) {
            const base = path.includes('/threshold') ? `${origin}/threshold/` : `${origin}${path.endsWith('/') ? path : `${path}/`}`;
            return base.replace(/\/+$/, '/') || APP_URL;
        }
    } catch { /* */ }
    return APP_URL || REPO_URL;
}

/**
 * Full paste block for Grok Build / Grok chat (opener + links).
 * User can paste this without opening ENTER — Threshold as a starter prompt.
 */
export function buildGrokOpenerPrompt(opts = {}) {
    const app = opts.appUrl || getProjectLink();
    const idea = (opts.idea || '').trim();
    const ideaLine = idea
        ? `\nUSER GOAL:\n${idea}\n`
        : '\nUSER GOAL:\n(describe the 3D scene, game loop, or feature you want)\n';

    return `THRESHOLD OPENER (v${VERSION}) — paste into Grok Build / chat as project starter

You are helping me build with **Threshold** — an open MIT browser 3D sandbox (play-as-you-dev).
Not Anthropic / not a commercial UK studio. Author namespace: medicinalsheep.

## Project links (open these for ground truth)
- Live app: ${app}
- Repo: ${REPO_URL}
- One-page spine (agents & forks): ${BUILD_FROM_URL}
- README: ${README_URL}
- Changelog: ${CHANGELOG_URL}

## What Threshold is
- Vanilla JS + Vite + Three.js + Cannon-ES + PeerJS multiplayer
- Lobby ENTER solo (PLAY or BUILD) · CREATE/JOIN multiplayer
- Engine: PAUSE = EDIT world · PLAY = walk/TPS/FPS with locked map for guests
- Compiler: paste JS → CHECK CODE READY → RUN IN ENGINE
- PromptGen: builds agent prompts from live scene
- Optional Grok (xAI key) + local Ollama minis (threshold-mini-npc / threshold-mini-dev)
- Art pipeline: GIMP PBR maps + Blender GLB · Name → slug textures/name_albedo.png
- Export wizard → Web / store / Steam packaging scripts

## How to use THIS chat (without playing inside the app)
1. Treat the links above as the product spec + source of truth.
2. Prefer code that uses Threshold globals: World, Engine, State, UI, PlayerController, MaterialPresets, TextureBridge, LiveBuild.
3. World.createObject(type, name, colorHex, usePhysics) — type FIRST ('cube'|'sphere'|…).
4. Always pause-guard mutators: if (!State.isPaused) { UI.status('Pause (EDIT)…'); return; }
5. Extend the scene — never World.clearWorld unless the user asks to wipe.
6. Realistic default: Engine.setRenderMode(4) · MaterialPresets over CanvasTexture.
7. Naming contract: object "Stone Block" → textures/stone_block_albedo.png · import/stone_block.glb
8. Deliver executable IIFE JS the user can paste into Compiler, OR a short PLAN if they asked for a plan.
9. If they want to run the real app: open ${app} → ENTER → PLAY or BUILD.
${ideaLine}
## Reply format
- If coding: ONE complete (function(){ try { … } catch(e){…} })(); no markdown fences unless asked.
- If planning: PLAN: … numbered steps · GIMP/Blender paths if art · no clearWorld.
- Stay honest: starter avatars are procedural mannequins with idle/walk/run; real heroes = Blender GLB.

Start by confirming you loaded Threshold context, then answer the USER GOAL.`;
}

/** Shorter block — just links + one-liner (for “copy link pack”). */
export function buildLinkPack() {
    const app = getProjectLink();
    return `Threshold v${VERSION}
Play: ${app}
Repo: ${REPO_URL}
Spine: ${BUILD_FROM_URL}
Opener: copy "Copy Grok opener" from the lobby How to menu, or open PromptGen in the app.`;
}

/**
 * Compact one-liner for status bars / chat share.
 */
export function buildShareOneLiner() {
    return `Threshold (play-as-you-dev 3D) ${getProjectLink()} · ${REPO_URL}`;
}

window.ThresholdOpener = {
    VERSION,
    REPO_URL,
    getProjectLink,
    buildGrokOpenerPrompt,
    buildLinkPack,
    buildShareOneLiner,
};
