#!/usr/bin/env node
/**
 * Wave 3 — production planning, HILOD/compression/rescale, performance & parallel-safe workflows.
 * Merges into bootcamp JSONL for mini (and large) models.
 *
 * Usage: node scripts/bootcamp-seed-wave3.cjs
 *        npm run bootcamp:seed:wave3
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

const IIFE = (body, opts = {}) => {
    const mode = opts.mode != null ? opts.mode : 4;
    return `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(${mode});
${body}
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;
};

// ── Structured plan template (agents copy this shape) ─────────────────────

function makePlan({
    title,
    placement = 'exterior',
    collision = 'static',
    surface = 'concrete',
    texRes = '2k',
    poly = 'medium',
    weather = 'wet',
    workflow = 'gimp',
    audio = 'exterior_open',
    tier = 'Ultra',
    parallel = 'sequential',
    notes = '',
}) {
    return `PLAN: ${title}
1. scope — placement:${placement} · hero/dressing as needed
2. collision — ${collision} · surfaceType:${surface}
3. mesh — primitives or GLB · poly:${poly} · LOD if large
4. textures — ${workflow} master @ ${texRes} (object name = manifest slot)
5. hilod — textures:watch → _1k/_2k PNG + WebP for Lite/Mobile (no hand 512)
6. weather — ${weather} · zoneSheltered if interior
7. atmosphere — Environment time/fog · audioZone:${audio || 'none'}
8. shaders — MaterialPresets (no CanvasTexture slop)
9. interact — F hints / collision sfx if needed
10. codegen — pause-guard IIFE · World.createObject(type,name,color,physics)
11. verify — PLAY walk · weather · graphics ${tier} + Realistic mode 4
PERF: graphicsTier=${tier} · ollamaQueue=${parallel} · freeze after big GLB import
${notes ? `NOTES: ${notes}` : ''}`.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// INTENT
// ═══════════════════════════════════════════════════════════════════════════

const CLASSIFY = [
    intent('run production plan before generate', 'other', 'assetProductionPlan + AgentPortal'),
    intent('complete design brief step 3', 'other', 'designIntake production plan'),
    intent('why is generate blocked', 'other', 'validateProductionReady'),
    intent('set texture resolution to 2k master', 'texture', 'texRes 2k + textures:hilod'),
    intent('set texture resolution 1k for mobile', 'texture', 'texRes 1k + WebP lite'),
    intent('generate hilod tiers from masters', 'texture', 'textures:hilod'),
    intent('compress textures to webp', 'texture', 'tex:compress + WebP sidecars'),
    intent('run textures watch for hilod', 'texture', 'textures:watch'),
    intent('set graphics tier to lite', 'graphics', 'graphicsProfile Lite'),
    intent('set graphics tier mobile', 'graphics', 'graphicsProfile Mobile'),
    intent('set graphics ultra', 'graphics', 'graphicsProfile Ultra'),
    intent('lower poly budget for props', 'other', 'designIntake poly budget'),
    intent('export lod meshes from blender', 'spawn', 'blender lod_export + gltfImport'),
    intent('allow parallel ollama models', 'other', 'OllamaRunQueue allowParallelLocal'),
    intent('use sequential ollama queue', 'other', 'OllamaRunQueue sequential'),
    intent('too many glbs for parallel', 'other', 'OllamaRunQueue parallel guard'),
    intent('park glbs in working folder', 'other', 'workFolderScope parkMode'),
    intent('freeze memory after heavy build', 'other', 'aiMemoryFreeze'),
    intent('plan a courtyard before coding', 'other', 'production_plan'),
    intent('optimize scene for mobile devices', 'graphics', 'graphicsProfile Lite + tex WebP'),
    intent('rescale masters to 1k and 2k', 'texture', 'textures:hilod'),
    intent('what is hilod', 'other', 'textures:hilod HILOD tiers'),
    intent('poly budget low for phone', 'other', 'designIntake poly low'),
    intent('verify production plan complete', 'other', 'validateProductionReady'),
    intent('bundle webp for lite tier export', 'export', 'ExportWizard + WebP lite'),
    intent('performance pass fewer objects', 'edit', 'scene optimize poly budget'),
];

// ═══════════════════════════════════════════════════════════════════════════
// NPC coaches
// ═══════════════════════════════════════════════════════════════════════════

const NPC = [
    npc('a production plan coach', 'What is the build pipeline order?',
        'Scope, collision, mesh, 2K textures, HILOD+WebP, weather, atmosphere, material presets, interact, codegen, then PLAY verify. GENERATE stays locked until plan is complete.'),
    npc('a production plan coach', 'Why is GENERATE blocked?',
        'validateProductionReady needs title, placement, and type. Finish Portal or SETUP Step 3 — weather and collision — then try again.'),
    npc('a HILOD coach', 'What is HILOD?',
        'Author 2K masters, then textures:hilod or textures:watch builds _1k and _2k PNG tiers plus WebP for Lite/Mobile. Do not hand-paint 512 maps.'),
    npc('a compression coach', 'How do we compress for phones?',
        'Keep 2K masters, run tex:compress / hilod for WebP sidecars, pick graphics Lite or Mobile so the engine loads smaller tiers.'),
    npc('a performance coach', 'Scene feels heavy on a 2060',
        'Use sequential Ollama, freeze AI memory after big imports, park unused GLBs, prefer primitives over many meshes, graphics Lite for playtests.'),
    npc('a parallel coach', 'When can I allow parallel local models?',
        'Only on a strong PC with few GLBs. Default is sequential. Parallel blocks above ~12 GLBs and warns over 6 with full world scope.'),
    npc('a poly budget coach', 'Low vs medium poly?',
        'Low for phones and dressing props, medium for hero props, high only for close-up characters. LOD export from Blender for large meshes.'),
    npc('an export coach', 'Lite tier export tips?',
        'Web export bundles WebP when present. Verify on graphics Lite before shipping — mode 4 PBR still applies with smaller maps.'),
    npc('a planning mentor', 'Should AI plan before code?',
        'Yes — production_plan or Portal intake first. Agents that skip weather and surfaceType make sloppy scenes.'),
    npc('a rescale coach', 'Can I downscale only?',
        'Yes — textures:hilod rescales masters to 1K/2K tiers. Keep masters; never replace them with compressed-only files.'),
];

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTION_PLAN task examples
// ═══════════════════════════════════════════════════════════════════════════

const PLANS = [
    plan(
        'Write a Threshold production plan for: exterior wooden crate, GIMP PBR, physics, rain wetness. texRes 2k, poly low.',
        makePlan({
            title: 'Exterior wood crate',
            placement: 'exterior',
            collision: 'dynamic mass~12 friction~0.5',
            surface: 'wood',
            texRes: '2k',
            poly: 'low',
            weather: 'wet + dust optional',
            workflow: 'gimp',
            audio: 'exterior_open',
            tier: 'Ultra',
            parallel: 'sequential',
            notes: 'Name mesh wood_crate for manifest. After codegen PLAY with rain ON.',
        }),
    ),
    plan(
        'Production plan: interior lab bench, static, metal surface, sheltered, industrial hum audio, 2k, poly medium.',
        makePlan({
            title: 'Interior lab bench',
            placement: 'interior',
            collision: 'static locked',
            surface: 'metal',
            texRes: '2k',
            poly: 'medium',
            weather: 'sheltered (no wet required)',
            workflow: 'gimp+blender optional',
            audio: 'interior_warm',
            tier: 'Ultra',
            notes: 'zoneSheltered=true on volume. MaterialPresets pbr_metal_brushed.',
        }),
    ),
    plan(
        'Plan for mobile-first deco rocks: poly low, tex 1k masters ok, Lite tier, sequential ollama.',
        makePlan({
            title: 'Mobile deco rocks',
            placement: 'exterior',
            collision: 'static locked',
            surface: 'gravel',
            texRes: '1k',
            poly: 'low',
            weather: 'dust',
            workflow: 'gimp',
            audio: false,
            tier: 'Lite',
            parallel: 'sequential',
            notes: 'Prefer few primitives. WebP required for Lite. No heavy GLB batches.',
        }),
    ),
    plan(
        'Plan neon night sign: exterior, emissive marquee, wet_hero optional, poly low, 2k.',
        makePlan({
            title: 'Neon night marquee',
            placement: 'exterior',
            collision: 'static locked',
            surface: 'metal',
            texRes: '2k',
            poly: 'low',
            weather: 'wet + weatherMarquee',
            workflow: 'gimp',
            audio: 'highway_edge',
            tier: 'Mobile',
            notes: 'MaterialPresets pbr_emissive_marquee · shaderHook emissive_pulse.',
        }),
    ),
    plan(
        'Plan glass window wall: transitional, wetGlass, glass surface, visual-only collision, 2k.',
        makePlan({
            title: 'Wet glass window wall',
            placement: 'transitional',
            collision: 'static thin collider or visual-only',
            surface: 'glass',
            texRes: '2k',
            poly: 'low',
            weather: 'wet_glass',
            workflow: 'gimp',
            audio: 'interior_warm',
            notes: 'wetGlass=true · MaterialPresets pbr_glass_wet · ShaderNodeGraph glass_rim.',
        }),
    ),
    plan(
        'Plan physics playground: many dynamic spheres — warn about parallel ollama + GLB limits.',
        makePlan({
            title: 'Physics playground orbs',
            placement: 'exterior',
            collision: 'dynamic spheres + locked floor',
            surface: 'metal / concrete floor',
            texRes: '1k',
            poly: 'low',
            weather: 'none critical',
            workflow: 'procedural MaterialPresets',
            audio: false,
            tier: 'Lite',
            parallel: 'sequential (do not parallel with many meshes)',
            notes: 'Primitives only — avoid 12+ GLBs. Sequential Ollama queue.',
        }),
    ),
    plan(
        'Outline pipeline steps only (numbered) for any hero prop.',
        `PLAN: generic hero prop
1. scope 2. collision 3. mesh 4. textures(2k) 5. hilod+webp 6. weather 7. atmosphere 8. material presets 9. interact 10. codegen IIFE 11. PLAY verify
PERF: sequential ollama · freeze after GLB · Lite test pass before ship`,
    ),
    plan(
        'User wants compression only — no new mesh. Plan texture rescale path.',
        `PLAN: texture rescale / compression only
1. scope — existing mesh name must match manifest
2. collision — unchanged
3. mesh — skip
4. textures — keep 2K masters in textures/
5. hilod — npm run textures:hilod (or textures:watch on save) → _1k _2k + WebP
6-9. weather/shaders — keep surfaceType + MaterialPresets
10. codegen — optional TextureBridge.apply only
11. verify — switch graphics Lite/Mobile and confirm maps load
PERF: never replace masters with WebP-only; Lite reads WebP sidecars`,
    ),
    plan(
        'Plan multiplayer stage props: host flag + locked floor, medium poly, sequential.',
        makePlan({
            title: 'MP stage props',
            placement: 'exterior',
            collision: 'static floor locked + light props',
            surface: 'concrete',
            texRes: '2k',
            poly: 'medium',
            weather: 'wet',
            workflow: 'gimp',
            audio: 'exterior_open',
            tier: 'Ultra',
            parallel: 'sequential',
            notes: 'Host-only codegen. Guests get immersive replay.',
        }),
    ),
    plan(
        'Quick plan: snow path crates with snowCap, wood surface, 2k.',
        makePlan({
            title: 'Snow path crates',
            placement: 'exterior',
            collision: 'dynamic crates',
            surface: 'wood',
            texRes: '2k',
            poly: 'low',
            weather: 'snow + snowCap',
            workflow: 'gimp',
            audio: 'exterior_open',
            notes: 'MaterialPresets pbr_wood_snow · shaderHook snow_freshen.',
        }),
    ),
];

// ═══════════════════════════════════════════════════════════════════════════
// MEDIUM — performance / hilod / rescale code patterns
// ═══════════════════════════════════════════════════════════════════════════

const PERF_CODE = [
    suggest('// lite-friendly locked floor + single crate (low poly)', IIFE(`    // PERF: few meshes · locked floor · poly low
    const floor = World.createObject('cube', 'lite_floor', 0x3a3a40, false);
    floor.scale.set(12, 0.2, 12);
    floor.position.set(0, 0.1, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    const crate = World.createObject('cube', 'lite_crate', 0x8b4513, true);
    crate.position.set(0, 0.5, -2);
    crate.userData.surfaceType = 'wood';
    crate.userData.mass = 10;`)),
    suggest('// apply GIMP maps then note hilod tiers (masters stay 2k)', IIFE(`    const m = World.createObject('cube', 'stone_block', 0xffffff, false);
    m.position.set(1, 0.5, 0);
    m.userData.surfaceType = 'concrete';
    // Masters in textures/; hilod builds _1k/_2k + WebP for Lite/Mobile
    m.userData.textures = {
      albedo: 'textures/stone_block_albedo.png',
      roughness: 'textures/stone_block_roughness.png',
      normal: 'textures/stone_block_normal.png'
    };
    m.userData.texRes = '2k';
    if (window.TextureBridge) TextureBridge.apply(m);`)),
    suggest('// performance: mark heavy glb for lod distances if MeshLod present', IIFE(`    const prop = World.createObject('cube', 'hero_proxy', 0x667788, false);
    prop.position.set(0, 1, -4);
    prop.userData.surfaceType = 'metal';
    // LOD distances reference (Blender lod_export / meshLod): near, mid, far
    prop.userData.lodDistances = [0, 18, 48];
    prop.userData.polyBudget = 'medium';`)),
    suggest('// mobile tier comment + simpler materials', IIFE(`    // graphicsProfile Lite/Mobile will prefer WebP + lower HILOD
    const rock = World.createObject('cube', 'deco_rock', 0x6a6a5a, false);
    rock.scale.set(1.2, 0.8, 1.0);
    rock.position.set(-2, 0.4, -3);
    rock.userData.surfaceType = 'gravel';
    rock.userData.polyBudget = 'low';
    rock.userData.locked = true;
    if (rock.material) {
      rock.material.roughness = 0.9;
      rock.material.metalness = 0.05;
    }`)),
    patch(
        "// forgot pause guard and used too many clearWorld\nWorld.clearWorld();\nfor(let i=0;i<50;i++) World.createObject('cube','x'+i,0xffffff,true);",
        IIFE(`    // PERF: cap props — 50 dynamics is too heavy for Lite/2060 playtest
    for (let i = 0; i < 6; i++) {
      const c = World.createObject('cube', 'box_' + i, 0x8b4513, true);
      c.position.set((i % 3) - 1, 0.5 + Math.floor(i / 3), -2);
      c.userData.surfaceType = 'wood';
    }`),
    ),
    patch(
        "Engine.setRenderMode(4);\n// user asked mobile lite graphics — still mode 4 PBR, smaller maps via profile",
        "Engine.setRenderMode(4);\n// graphicsProfile Lite/Mobile selects HILOD/WebP — keep mode 4 for realistic PBR",
    ),
    suggest('// sequential-safe: one glb proxy note without spawning 12 meshes', IIFE(`    // OllamaRunQueue: sequential default; parallel blocked if GLB count high
    const marker = World.createObject('cone', 'import_marker', 0xffaa00, false);
    marker.position.set(0, 1.2, 0);
    marker.userData.importHint = 'gltfImport single file — freeze memory after';`)),
    suggest('// weather + hilod-ready exterior wall with dust', IIFE(`    const wall = World.createObject('cube', 'dust_wall', 0x9a958c, false);
    wall.scale.set(5, 2.5, 0.3);
    wall.position.set(-4, 1.25, -5);
    wall.userData.locked = true;
    wall.userData.surfaceType = 'concrete';
    wall.userData.dustExposure = 0.65;
    wall.userData.texRes = '2k';
    wall.userData.materialPreset = 'pbr_concrete_weathered';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(wall, 'pbr_concrete_weathered');`)),
    suggest('// rescale-aware texture userData for AI station', IIFE(`    const station = World.createObject('cube', 'AI Build Station', 0x2a4a6a, false);
    station.scale.set(1.6, 1.2, 1.0);
    station.position.set(0, 0.6, -8);
    station.userData.locked = true;
    station.userData.surfaceType = 'metal';
    station.userData.texRes = '2k';
    station.userData.hilod = true; // expect _1k/_2k + webp from textures:watch
    Object.assign(station.userData, { interactHint: 'AI Build (F)', interactRadius: 2.5 });`)),
    // planning as comment blocks in suggests
    pair('dev_suggest',
        'Return ONLY a short comment block listing pipeline steps before any code for: wet metal walkway',
        `// PLAN walkway: exterior · static · surfaceType metal · 2k GIMP · hilod+webp
// weather wet · MaterialPresets wet_hero · audio exterior_open · poly low
// codegen pause-guard IIFE · verify rain + Lite tier`,
    ),
    pair('dev_suggest',
        'Return ONLY production checklist lines (no JS) for mobile deco bush',
        `// PLAN bush: exterior · visual · grass · tex 1k · hilod webp · poly low · Lite
// shader wind_foliage · sequential ollama · no physics · verify Mobile tier`,
    ),
];

// ═══════════════════════════════════════════════════════════════════════════
// LARGE — performance-aware full scenes
// ═══════════════════════════════════════════════════════════════════════════

const SCENES = [
    scene('mobile-lite courtyard: few props, locked grass pad, one bench, exterior audio (poly low)', IIFE(`    // PERF target: Lite/Mobile — few meshes, locked ground
    const ground = World.createObject('cube', 'yard', 0x3a5a32, false);
    ground.scale.set(14, 0.15, 14);
    ground.position.set(0, 0.08, 0);
    ground.userData.locked = true;
    ground.userData.surfaceType = 'grass';
    ground.userData.polyBudget = 'low';
    const bench = World.createObject('cube', 'bench', 0x6b4f3a, false);
    bench.scale.set(2.0, 0.35, 0.7);
    bench.position.set(0, 0.2, -3);
    bench.userData.surfaceType = 'wood';
    bench.userData.polyBudget = 'low';
    const zone = World.createObject('cube', 'yard_zone', 0x888888, false);
    zone.scale.set(12, 3, 12);
    zone.position.set(0, 1.5, 0);
    zone.visible = false;
    zone.userData.audioZone = 'exterior_open';`)),
    scene('plan-following crate line: 3 wood crates physics, 2k texRes flags, wet-ready', IIFE(`    // PLAN: exterior crates · dynamic · wood · wet · poly low · sequential
    for (let i = 0; i < 3; i++) {
      const c = World.createObject('cube', 'crate_' + i, 0x8b4513, true);
      c.position.set(i * 1.4 - 1.4, 0.5, -2);
      c.userData.surfaceType = 'wood';
      c.userData.mass = 12;
      c.userData.texRes = '2k';
      c.userData.polyBudget = 'low';
    }`)),
    scene('hilod-ready stone wall with dust and locked collider', IIFE(`    const wall = World.createObject('cube', 'stone_wall', 0x9a958c, false);
    wall.scale.set(6, 2.8, 0.35);
    wall.position.set(-3, 1.4, -6);
    wall.userData.locked = true;
    wall.userData.surfaceType = 'concrete';
    wall.userData.dustExposure = 0.7;
    wall.userData.texRes = '2k';
    wall.userData.hilod = true;
    wall.userData.materialPreset = 'pbr_concrete_weathered';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(wall, 'pbr_concrete_weathered');`)),
    scene('performance physics: max 5 spheres + locked floor (not 20+)', IIFE(`    const floor = World.createObject('cube', 'phys_floor', 0x333340, false);
    floor.scale.set(14, 0.25, 14);
    floor.position.set(0, 0.12, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'concrete';
    for (let i = 0; i < 5; i++) {
      const s = World.createObject('sphere', 'orb_' + i, 0x00ffaa, true);
      s.position.set((i - 2) * 1.4, 3 + i * 0.2, 0);
      s.userData.surfaceType = 'metal';
      s.userData.polyBudget = 'low';
    }`)),
    scene('LOD-aware hero proxy with lodDistances metadata', IIFE(`    const hero = World.createObject('cube', 'hero_prop', 0x556677, false);
    hero.scale.set(1.5, 1.5, 1.5);
    hero.position.set(0, 0.75, -4);
    hero.userData.surfaceType = 'metal';
    hero.userData.lodDistances = [0, 18, 48];
    hero.userData.polyBudget = 'medium';
    hero.userData.texRes = '2k';
    if (hero.material) {
      hero.material.metalness = 0.55;
      hero.material.roughness = 0.4;
    }`)),
    scene('interior sheltered lounge low poly for Mobile tier', IIFE(`    const floor = World.createObject('cube', 'lounge_floor', 0x5a4030, false);
    floor.scale.set(10, 0.15, 10);
    floor.position.set(0, 0.08, 0);
    floor.userData.locked = true;
    floor.userData.surfaceType = 'wood';
    floor.userData.polyBudget = 'low';
    const seat = World.createObject('cube', 'seat', 0x4a3a50, false);
    seat.scale.set(1.4, 0.45, 0.8);
    seat.position.set(0, 0.25, -2);
    seat.userData.materialPreset = 'pbr_fabric_muted';
    if (window.MaterialPresets?.applyMaterialPreset) MaterialPresets.applyMaterialPreset(seat, 'pbr_fabric_muted');
    const zone = World.createObject('cube', 'lounge_zone', 0x555555, false);
    zone.scale.set(8, 3, 8);
    zone.position.set(0, 1.5, 0);
    zone.visible = false;
    zone.userData.zoneSheltered = true;
    zone.userData.audioZone = 'interior_warm';`)),
];

// Guide facts
const GUIDE = [
    pair('npc_chat',
        'You are a Threshold coach. Player says: List HILOD commands',
        'npm run textures:hilod builds _1k/_2k from masters; textures:watch does it on GIMP save; tex:compress makes WebP for Lite/Mobile.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Parallel Ollama rules?',
        'Default sequential. Parallel is opt-in; warns above ~6 GLBs full-world; blocks above ~12 GLBs. Prefer freeze + working folder park.'),
    pair('npc_chat',
        'You are a Threshold coach. Player says: Production plan steps?',
        'scope → collision → mesh → textures → HILOD → weather → atmosphere → shaders → interact → codegen → verify.'),
    pair('intent_classify', classifyUser('run hilod compression'), 'INTENT: texture\nAPI: textures:hilod + tex:compress'),
    pair('intent_classify', classifyUser('switch to lite graphics'), 'INTENT: graphics\nAPI: graphicsProfile Lite'),
    pair('intent_classify', classifyUser('write a production plan first'), 'INTENT: other\nAPI: production_plan'),
];

function mergeFile(rel, rows) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existing = fs.existsSync(file)
        ? fs.readFileSync(file, 'utf8').trim().split(/\n+/).filter(Boolean).map((l) => {
            try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean)
        : [];
    const keys = new Set(existing.map((r) => JSON.stringify(r.messages?.[0]?.content || '')));
    let added = 0;
    for (const r of rows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (keys.has(k)) continue;
        existing.push(r);
        keys.add(k);
        added++;
    }
    fs.writeFileSync(file, `${existing.map((r) => JSON.stringify(r)).join('\n')}\n`);
    console.log(`  ${rel}: +${added} → ${existing.length}`);
    return { added, total: existing.length };
}

function writeNew(rel, rows) {
    const file = path.join(DS, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const seen = new Set();
    const out = [];
    for (const r of rows) {
        const k = JSON.stringify(r.messages?.[0]?.content || '');
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(r);
    }
    fs.writeFileSync(file, `${out.map((r) => JSON.stringify(r)).join('\n')}\n`);
    console.log(`  ${rel}: write ${out.length}`);
    return out.length;
}

function main() {
    console.log('bootcamp:seed:wave3 — planning + compression + performance\n');
    mergeFile(path.join('small', 'classify.jsonl'), CLASSIFY);
    mergeFile(path.join('small', 'npc.jsonl'), NPC);
    mergeFile(path.join('small', 'guide.jsonl'), GUIDE);
    writeNew(path.join('medium', 'planning.jsonl'), PLANS);
    writeNew(path.join('medium', 'performance.jsonl'), PERF_CODE);
    mergeFile(path.join('medium', 'compiler.jsonl'), PERF_CODE.filter((r) => r.task === 'dev_patch' || r.task === 'dev_suggest'));
    mergeFile(path.join('large', 'scenes.jsonl'), SCENES);

    // Rebuild splits
    const full = fs.readFileSync(path.join(DS, 'medium', 'compiler.jsonl'), 'utf8')
        .trim().split(/\n+/).filter(Boolean).map((l) => JSON.parse(l));
    fs.writeFileSync(
        path.join(DS, 'medium', 'patches.jsonl'),
        `${full.filter((r) => r.task === 'dev_patch').map((r) => JSON.stringify(r)).join('\n')}\n`,
    );
    fs.writeFileSync(
        path.join(DS, 'medium', 'suggests.jsonl'),
        `${full.filter((r) => r.task === 'dev_suggest').map((r) => JSON.stringify(r)).join('\n')}\n`,
    );
    console.log('\nWave3 complete. Next: npm run bootcamp:build && npm run models:mini');
}

main();
