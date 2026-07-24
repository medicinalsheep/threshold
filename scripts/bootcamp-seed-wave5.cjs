#!/usr/bin/env node
/**
 * Wave 5 — Threshold 10.13 product power pack for mini models.
 * Surfaces, Neg LOD + Vis E0–E5, Ollama CORS, no X OAuth, PERF harness,
 * store:ship literacy, BUILD_FROM spine, graphics tiers, host/guest, anti-slop v2.
 *
 *   npm run bootcamp:seed:wave5
 *   npm run train:mini -- --wave5
 *   npm run train:mini -- --full
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DS = path.join(ROOT, 'training', 'bootcamp', 'datasets');

function pair(task, user, assistant) {
    return {
        task,
        messages: [
            { role: 'user', content: user },
            { role: 'assistant', content: assistant },
        ],
    };
}
function classifyUser(msg) {
    return `Classify (two lines only — INTENT then API):\n${msg}`;
}
function intent(msg, name, api) {
    return pair('intent_classify', classifyUser(msg), `INTENT: ${name}\nAPI: ${api}`);
}
function npc(p, q, a) {
    return pair('npc_chat', `You are ${p}. Player says: ${q}`, a);
}
function plan(user, assistant) {
    return pair('production_plan', user, assistant);
}
function patch(broken, fixed) {
    return pair('dev_patch', `Fix this Threshold script:\n\`\`\`js\n${broken}\n\`\`\``, fixed);
}
function suggest(comment, code) {
    return pair('dev_suggest', `Improve or complete:\n\`\`\`js\n${comment}\n\`\`\``, code);
}
function scene(idea, code) {
    return pair('scene_script', `Generate realistic Threshold IIFE: ${idea}`, code);
}

const IIFE = (body) => `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
${body}
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;

// ═══════════════════════════════════════════════════════════════════════════
// SURFACES — player / creator / full
// ═══════════════════════════════════════════════════════════════════════════

const SURFACES = [
    intent('switch to play surface', 'other', 'SurfaceProfile.set player'),
    intent('enable creator tools', 'other', 'SurfaceProfile.set creator'),
    intent('full ui surface', 'other', 'SurfaceProfile.set full'),
    intent('phone layout hide ai', 'other', 'SurfaceProfile player surface'),
    intent('?surface=player', 'other', 'SurfaceProfile URL surface'),
    intent('why no ollama on mobile', 'other', 'player surface skips Ollama probe'),
    intent('open agent portal on phone', 'other', 'SurfaceProfile creator then AgentPortal'),
    intent('hide compiler on mobile', 'other', 'SurfaceProfile player'),
    npc('a Threshold UI coach', 'Why is there no AI button on my phone?',
        'You are on the player surface — phones hide Ollama and agent chrome. Tap Creator tools or use ?surface=creator.'),
    npc('a Threshold UI coach', 'How do I get Compiler and SETUP back?',
        'Switch to Creator surface in lobby chips, SCENE → Creator tools, or SETUP surface switcher.'),
    npc('a Threshold UI coach', 'Does BUILD mode change surface?',
        'Lobby BUILD nudges creator surface so insert and agents work. Play surface stays clean for join/test.'),
    npc('a product guide', 'What is BUILD_FROM?',
        'docs/BUILD_FROM.md is the one-page spine for forks and agents — live link, six-step loop, and do/don’t rules.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// NEG LOD + VISIBILITY + PERF
// ═══════════════════════════════════════════════════════════════════════════

const PERF_LOD = [
    intent('enable negative lod', 'edit', 'userData.negativeLOD + NegativeLod'),
    intent('far unlit materials', 'edit', 'NegativeLod.enableObject'),
    intent('auto neg lod lite mobile', 'graphics', 'NegativeLod.applyTierPolicy'),
    intent('visibility frustum classes', 'other', 'VisibilitySystem E0'),
    intent('skip offscreen lod work', 'other', 'VisibilitySystem shouldProcessLod'),
    intent('physics sleep far objects', 'physics', 'VisibilitySystem sleep E2'),
    intent('run perf harness', 'other', 'PerfHarness.measure or npm run perf:harness'),
    intent('measure fps p95', 'other', 'SETUP PERF or PerfHarness'),
    intent('floor far unlit slabs', 'edit', 'NegativeLod floor path C'),
    intent('graphics lite tier', 'graphics', 'GraphicsProfile.apply compatibility'),
    intent('graphics mobile tier', 'graphics', 'GraphicsProfile.apply balanced'),
    intent('realistic graphics tier', 'graphics', 'GraphicsProfile.apply realistic'),
    patch(
        "mesh.userData.negativeLOD = true;\n// no distance — too aggressive near camera",
        "mesh.userData.negativeLOD = true;\nmesh.userData.negativeLodDistance = 72;\nNegativeLod.enableObject(mesh, { distance: 72, source: 'user' });",
    ),
    patch(
        "for (const o of State.objects) NegativeLod.disableObject(o);\n// user wanted Lite perf with far flats",
        IIFE(`    GraphicsProfile.apply('compatibility', { silent: true });
    NegativeLod.applyTierPolicy('compatibility');
    // static props get far unlit automatically on Lite/Mobile/Realistic`),
    ),
    suggest(
        '// mark background props for far unlit Neg LOD with scene-aware tint',
        IIFE(`    const props = [];
    for (let i = 0; i < 8; i++) {
      const p = World.createObject('cube', 'prop_' + i, 0x6a7a88, false);
      p.position.set((i % 4) * 2 - 3, 0.5, -4 - Math.floor(i / 4) * 2);
      p.userData.surfaceType = 'concrete';
      p.userData.locked = true;
      NegativeLod.enableObject(p, { distance: 68, source: 'user' });
      props.push(p);
    }`),
    ),
    plan(
        'Write a Threshold production plan for: exterior plaza props, Lite graphics, Neg LOD far flats, poly low, sequential ollama.',
        `PLAN: lite plaza props
1. scope — exterior dressing · many static cubes
2. collision — locked static · surfaceType:concrete
3. mesh — cube · poly:low · scale variety
4. textures — catalog preset or gimp 1k
5. hilod — prefer 1k on Lite
6. weather — optional light fog
7. atmosphere — GraphicsProfile compatibility
8. shaders — PBR default · Neg LOD auto on Lite
9. interact — none
10. codegen — pause-guard · createObject · locked
11. verify — PLAY · Lite · walk far · flats soft
PERF: graphicsTier=compatibility · NegLOD auto · sequential ollama
ACCEPT: 60fps class on mid PC · far props unlit · no clearWorld`,
    ),
    npc('a perf coach', 'My scene stutters with 200 cubes',
        'Use Graphics Lite or Mobile, enable Neg LOD auto, keep dynamics under ~12, and run SETUP → PERF for p95. Avoid clearWorld spam.'),
    npc('a perf coach', 'What is Neg LOD?',
        'Far objects swap to cheap unlit materials tinted by fog and lights — longer distance so the switch is subtle. Auto on static props for Lite/Mobile/Realistic.'),
    npc('a perf coach', 'How do I measure before and after?',
        'SETUP → PERF → RUN SAMPLE, or npm run perf:harness:compare for headless Neg LOD on vs off.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// OLLAMA / GROK / AUTH (no X)
// ═══════════════════════════════════════════════════════════════════════════

const AUTH_AI = [
    intent('sign in with x twitter', 'other', 'X OAuth removed — use display name'),
    intent('connect grok api', 'other', 'Auth Grok key console.x.ai'),
    intent('ollama cors blocked', 'other', 'npm run ollama:serve port 11435'),
    intent('ollama 403 pages', 'other', 'ollama:serve CORS proxy'),
    intent('local mini models', 'other', 'threshold-mini-npc threshold-mini-dev'),
    intent('pull threshold mini', 'other', 'ollama pull medicinalsheep/threshold-mini-npc'),
    intent('train mini agents', 'other', 'npm run train:mini'),
    intent('super grok browser login', 'other', 'console.x.ai API key not SuperGrok tab'),
    npc('an AI setup coach', 'Ollama fails with CORS on GitHub Pages',
        'Run npm run ollama:serve in the Threshold repo — it proxies :11435 with CORS. Plain ollama serve on :11434 is blocked from Pages.'),
    npc('an AI setup coach', 'Do I need X / Twitter login?',
        'No. X OAuth was removed. Optional Grok key from console.x.ai plus a custom display name is enough.'),
    npc('an AI setup coach', 'Which mini model for chat vs code?',
        'Small tier: threshold-mini-npc for intent and NPC. Medium: threshold-mini-dev for patches and plans. Large scenes prefer Grok or 7B+.'),
    npc('an AI setup coach', 'Player surface and Ollama?',
        'Player surface never probes Ollama — switch to Creator tools first, keep ollama:serve running, then RE-SCAN.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLAYER + CONTROLS + EXPORT
// ═══════════════════════════════════════════════════════════════════════════

const SESSION = [
    intent('create multiplayer session', 'other', 'Lobby CREATE SESSION'),
    intent('join with room code', 'other', 'Lobby JOIN room code'),
    intent('host passcode', 'other', 'hostPasscode lobby More options'),
    intent('can guests use compiler', 'other', 'CollaborateGuard host approval'),
    intent('export to steam', 'export', 'package:steam store:ship'),
    intent('store ship command', 'export', 'npm run store:ship'),
    intent('macos notarize', 'export', 'MAC_NOTARIZE package:mac'),
    intent('pause edit multiplayer', 'other', 'host pause State.isPaused'),
    npc('a multiplayer host', 'Guest wants to run AI generate',
        'Keep scene lock if you need control. Approve guest AI runs in the host panel when CollaborateGuard queues them.'),
    npc('a multiplayer host', 'CREATE hangs forever',
        'Peer host times out after ~12s. Use ENTER for solo. Check network; voice never blocks CREATE.'),
    npc('an export coach', 'How do I ship Windows and guide uploads?',
        'npm run store:ship -- --manifest your.threshold-game.json --targets win. Signing keys stay local; upload-guide.md lists console steps.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// CODE: modern APIs (surface, NegLOD, pause, World)
// ═══════════════════════════════════════════════════════════════════════════

const CODE = [
    patch(
        "SurfaceProfile.set('play');\n// invalid profile",
        "SurfaceProfile.set('player'); // player | creator | full",
    ),
    patch(
        "ollama fetch('http://127.0.0.1:11434/api/tags');\n// from GitHub Pages",
        "// use OllamaClient / portal probe — prefers :11435 proxy; never hardcode :11434 from Pages\nawait OllamaClient.probe(3000);",
    ),
    patch(
        "World.createObject('box', 'wall', 0x888888, false);\nmesh.userData.negLod = true;",
        IIFE(`    const wall = World.createObject('cube', 'wall', 0x888888, false);
    wall.scale.set(4, 2, 0.3);
    wall.position.set(0, 1, -6);
    wall.userData.locked = true;
    wall.userData.surfaceType = 'concrete';
    NegativeLod.enableObject(wall, { distance: 72, source: 'user' });`),
    ),
    patch(
        "if (window.location.hostname.includes('github.io')) fetch('http://127.0.0.1:11434/api/tags');",
        "// Pages: OllamaClient probes :11435 only; run npm run ollama:serve on the machine\nif (window.SurfaceProfile?.allowsOllamaProbe?.()) await OllamaClient.probe(2000);",
    ),
    suggest(
        '// spawn 12 locked concrete markers in a grid with Neg LOD for Lite demos',
        IIFE(`    GraphicsProfile.apply('compatibility', { silent: true });
    for (let z = 0; z < 3; z++) {
      for (let x = 0; x < 4; x++) {
        const m = World.createObject('cube', 'mk_' + x + '_' + z, 0x7a8078, false);
        m.position.set(x * 2.5 - 3.75, 0.4, -3 - z * 2.5);
        m.userData.locked = true;
        m.userData.surfaceType = 'concrete';
        m.userData.polyBudget = 'low';
        NegativeLod.enableObject(m, { distance: 52, source: 'user' });
      }
    }
    NegativeLod.applyTierPolicy('compatibility');`),
    ),
    suggest(
        '// realistic courtyard pad — mode 4, locked floor, no clearWorld',
        IIFE(`    const pad = World.createObject('cube', 'courtyard_pad', 0x4a4a52, false);
    pad.scale.set(14, 0.15, 14);
    pad.position.set(0, 0.08, 0);
    pad.userData.locked = true;
    pad.userData.surfaceType = 'concrete';
    Environment.setTimeOfDay?.(14);
    Environment.setFog?.(0.014);`),
    ),
    scene(
        'six low poly crates in two rows, wood surface, physics off, Neg LOD, realistic PBR',
        IIFE(`    for (let i = 0; i < 6; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b5a2b, false);
      c.position.set((i % 3) * 1.4 - 1.4, 0.5, -2 - Math.floor(i / 3) * 1.4);
      c.userData.surfaceType = 'wood';
      c.userData.polyBudget = 'low';
      c.userData.locked = true;
      NegativeLod.enableObject(c, { distance: 68, source: 'user' });
    }`),
    ),
];

// ═══════════════════════════════════════════════════════════════════════════
// NPC product coaches (Threshold-accurate)
// ═══════════════════════════════════════════════════════════════════════════

const COACHES = [
    npc('a Threshold lobby guide', 'What do I click first?',
        'ENTER for solo blank grid — no account. CREATE SESSION only if friends join. Phones start in play surface.'),
    npc('a Threshold lobby guide', 'Where is Sign in with X?',
        'Removed. Use a display name and optional Grok key from console.x.ai.'),
    npc('a Threshold build coach', 'Agent wrote THREE.Scene and broke my world',
        'Prefer World.createObject and never new THREE.Scene. Run SMART DEV with mini-dev or Grok; anti-slop sanitizers strip clearWorld and scene.add spam.'),
    npc('a Threshold build coach', 'Plan then code?',
        'Ask for a production plan first (medium tier), then IMPLEMENT PLAN with createObject. Export training pairs from SETUP to grow minis.'),
    npc('a Threshold ship coach', 'How do I notarize Mac?',
        'On a Mac: set CSC_LINK and APPLE_ID env vars, npm run package:mac, then mac:staple. See docs/MAC_NOTARIZE.md — keys never go in git.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// GUIDE facts (small)
// ═══════════════════════════════════════════════════════════════════════════

const GUIDE = [
    pair('guide', 'What is player surface?', 'player surface hides AI/Ollama/export chrome; default on phones; ?surface=player'),
    pair('guide', 'Ollama port for Pages?', 'Proxy http://127.0.0.1:11435 via npm run ollama:serve — not raw :11434'),
    pair('guide', 'Neg LOD default distance?', 'About 72m default; Lite ~52m Mobile ~68m Realistic ~88m Ultra ~110m'),
    pair('guide', 'World.createObject argument order?', "World.createObject(type, name, colorHex, usePhysics) — type first: cube|sphere|cone|torus"),
    pair('guide', 'Default render mode?', 'Engine.setRenderMode(4) realistic PBR'),
    pair('guide', 'How to train minis?', 'npm run train:mini -- --full then SAVE TIERS small=threshold-mini-npc medium=threshold-mini-dev'),
    pair('guide', 'Perf compare CLI?', 'npm run perf:harness:compare — 200 cubes, 5s, warm 1s, Neg LOD on vs off'),
    pair('guide', 'store:ship does what?', 'store:prep + package targets + upload-guide.md; signing stays local'),
];

function mergeFile(rel, rows, { rewrite = false } = {}) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    let existing = [];
    if (!rewrite && fs.existsSync(file)) {
        existing = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);
    }
    const key = (r) => JSON.stringify(r.messages?.[0]?.content || '');
    const seen = new Set(existing.map(key));
    let added = 0;
    for (const r of rows) {
        const k = key(r);
        if (seen.has(k)) continue;
        seen.add(k);
        existing.push(r);
        added += 1;
    }
    fs.writeFileSync(file, existing.map((r) => JSON.stringify(r)).join('\n') + '\n');
    console.log(`  ${rel}: +${added} (total ${existing.length})`);
    return added;
}

function main() {
    console.log('bootcamp:seed:wave5 — 10.13 product power pack\n');

    const smallIntent = [
        ...SURFACES.filter((r) => r.task === 'intent_classify'),
        ...PERF_LOD.filter((r) => r.task === 'intent_classify'),
        ...AUTH_AI.filter((r) => r.task === 'intent_classify'),
        ...SESSION.filter((r) => r.task === 'intent_classify'),
    ];
    const smallNpc = [
        ...SURFACES.filter((r) => r.task === 'npc_chat'),
        ...PERF_LOD.filter((r) => r.task === 'npc_chat'),
        ...AUTH_AI.filter((r) => r.task === 'npc_chat'),
        ...SESSION.filter((r) => r.task === 'npc_chat'),
        ...COACHES,
    ];
    const smallGuide = GUIDE;
    const smallCritical = [
        intent('enable creator tools on phone', 'other', 'SurfaceProfile.set creator'),
        intent('ollama cors 403', 'other', 'npm run ollama:serve'),
        intent('sign in with x', 'other', 'X OAuth removed'),
        intent('negative lod far materials', 'edit', 'NegativeLod.enableObject'),
        intent('realistic lighting default', 'graphics', 'Engine.setRenderMode(4)'),
    ];

    const medPatch = [
        ...PERF_LOD.filter((r) => r.task === 'dev_patch' || r.task === 'dev_suggest'),
        ...CODE.filter((r) => r.task === 'dev_patch' || r.task === 'dev_suggest'),
    ];
    const medPlan = PERF_LOD.filter((r) => r.task === 'production_plan');
    const medPerf = [
        pair('dev_suggest', 'Improve for Lite + Neg LOD:\n```js\n// many props\n```', IIFE(`    GraphicsProfile.apply('compatibility', { silent: true });
    for (let i = 0; i < 10; i++) {
      const p = World.createObject('cube', 'lite_' + i, 0x667788, false);
      p.position.set((i % 5) * 2 - 4, 0.4, -3 - Math.floor(i / 5) * 2);
      p.userData.locked = true;
      p.userData.polyBudget = 'low';
      NegativeLod.enableObject(p, { distance: 52, source: 'user' });
    }
    NegativeLod.applyTierPolicy('compatibility');`)),
        pair('dev_suggest', 'Improve: skip Ollama probe on player surface\n```js\nOllamaClient.probe();\n```',
            "if (window.SurfaceProfile?.allowsOllamaProbe?.() !== false) {\n  await OllamaClient.probe(3000);\n} else {\n  UI.status('Switch to Creator surface for Ollama');\n}"),
    ];
    const medSafety = [
        patch(
            "fetch('http://127.0.0.1:11434/api/tags');\n// github pages",
            '// Pages: use OllamaClient (proxy :11435). npm run ollama:serve on host PC.',
        ),
        patch(
            "Auth.loginWithX();\n// oauth",
            "// X OAuth removed — optional Grok key only\n// Auth.login(xaiKey) from console.x.ai",
        ),
    ];
    const largeScenes = CODE.filter((r) => r.task === 'scene_script');

    mergeFile('small/classify.jsonl', smallIntent);
    mergeFile('small/npc.jsonl', smallNpc);
    mergeFile('small/guide.jsonl', smallGuide);
    mergeFile('small/critical.jsonl', smallCritical);
    mergeFile('small/safety_npc.jsonl', AUTH_AI.filter((r) => r.task === 'npc_chat').concat(SESSION.filter((r) => r.task === 'npc_chat')));

    mergeFile('medium/compiler.jsonl', medPatch);
    mergeFile('medium/planning.jsonl', medPlan);
    mergeFile('medium/performance.jsonl', medPerf);
    mergeFile('medium/safety.jsonl', medSafety);
    mergeFile('medium/critical.jsonl', [
        patch("SurfaceProfile.set('play');", "SurfaceProfile.set('player');"),
        patch("NegativeLod.enableObject(m); // no dist", "NegativeLod.enableObject(m, { distance: 72, source: 'user' });"),
    ]);
    mergeFile('large/scenes.jsonl', largeScenes);

    // Dedicated wave5 corpora for rebuild visibility
    const allSmall = [...smallIntent, ...smallNpc, ...smallGuide, ...smallCritical];
    const allMed = [...medPatch, ...medPlan, ...medPerf, ...medSafety];
    mergeFile('small/wave5_product.jsonl', allSmall, { rewrite: true });
    mergeFile('medium/wave5_product.jsonl', allMed, { rewrite: true });

    console.log('\nwave5 done — run: npm run bootcamp:build && npm run models:mini');
    console.log('or: npm run train:mini -- --wave5');
    console.log('full: npm run train:mini -- --full --golden');
}

main();
