#!/usr/bin/env node
/** Smoke: Agent Portal + reconnect chip DOM + responsive hooks */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const responsive = fs.readFileSync(path.join(root, 'src/css/responsive.css'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'src/css/engine.css'), 'utf8');

const requiredIds = [
    'agent-portal-modal',
    'agent-portal-detect',
    'agent-portal-provider-pick',
    'agent-portal-build-controls',
    'agent-portal-chat-log',
    'agent-portal-chat-input',
    'agent-portal-connect',
    'agent-portal-stop-job',
    'agent-portal-run-engine',
    'build-something-cta',
    'agent-reconnect-chip',
    'corner-hubs',
    'hub-mode-toggle',
    'hub-tools-toggle',
    'hub-scene-toggle',
    'hub-touch-quick',
    'hub-layout-lock',
    'game-chat',
    'game-chat-input',
    'help-menu-modal',
    'work-folder-scope',
    'work-folder-freeze',
];

const missing = requiredIds.filter((id) => !html.includes('id="' + id + '"'));
if (missing.length) {
    console.error('FAIL missing HTML ids:', missing.join(', '));
    process.exit(1);
}

const responsiveChecks = [
    'agent-portal-modal',
    'agent-reconnect-chip',
    'corner-hub-bl',
    'safe-area-inset-bottom',
    'min-height: 44px',
    'engine-walkthrough',
];
const respMissing = responsiveChecks.filter((s) => !responsive.includes(s));
if (respMissing.length) {
    console.error('FAIL responsive.css missing:', respMissing.join(', '));
    process.exit(1);
}

if (!engine.includes('body.agent-portal-open')) {
    console.error('FAIL engine.css missing portal scroll lock');
    process.exit(1);
}

if (!engine.includes('build-something-cta')) {
    console.error('FAIL engine.css missing build-something-cta styles');
    process.exit(1);
}

if (!fs.existsSync(path.join(root, 'src/shared/agentPortal.js'))) {
    console.error('FAIL agentPortal.js missing');
    process.exit(1);
}

const portalModules = [
    'codeSanitizer.js',
    'buildJob.js',
    'agentModelGuide.js',
    'sceneApiPrompt.js',
    'gameChat.js',
    'gameCommands.js',
    'helpMenu.js',
    'hubLayout.js',
    'modelCapability.js',
    'ollamaRunQueue.js',
    'modelStatusHud.js',
    'workFolderScope.js',
    'aiMemoryFreeze.js',
    'liveBuild.js',
];

const portalSrc = fs.readFileSync(path.join(root, 'src/shared/agentPortal.js'), 'utf8');
const phase2Needles = [
    'openBuildFast',
    'looksLikeBuildBrief',
    'inferBuildContext',
    'showBuildCta',
    'START BUILDING',
];
for (let i = 0; i < phase2Needles.length; i += 1) {
    const needle = phase2Needles[i];
    if (!portalSrc.includes(needle)) {
        console.error('FAIL agentPortal.js missing Phase 2:', needle);
        process.exit(1);
    }
}

const missingMods = portalModules.filter((f) => !fs.existsSync(path.join(root, 'src/shared', f)));
if (missingMods.length) {
    console.error('FAIL missing portal modules:', missingMods.join(', '));
    process.exit(1);
}

if (!fs.existsSync(path.join(root, 'src/shared/agentReconnectChip.js'))) {
    console.error('FAIL agentReconnectChip.js missing');
    process.exit(1);
}

const walkthrough = fs.readFileSync(path.join(root, 'src/shared/walkthrough.js'), 'utf8');
const stepCount = (walkthrough.match(/title:\s*'/g) || []).length;
if (!walkthrough.includes('Corner hubs')) {
    console.error('FAIL walkthrough missing corner hub step');
    process.exit(1);
}
if (!walkthrough.includes('openBuildFast') && !walkthrough.includes('Build something')) {
    console.error('FAIL walkthrough missing build-fast action');
    process.exit(1);
}

if (!fs.existsSync(path.join(root, 'src/shared/cornerHub.js'))) {
    console.error('FAIL cornerHub.js missing');
    process.exit(1);
}

const guided = fs.readFileSync(path.join(root, 'src/shared/guidedSession.js'), 'utf8');
if (!guided.includes('preferBuild')) {
    console.error('FAIL guidedSession.js missing preferBuild path');
    process.exit(1);
}

console.log('PASS portal-ui-verify - DOM ids, responsive rules, scroll lock, modules, Phase 2 entry');
console.log('  walkthrough quick steps: ~' + Math.min(3, stepCount) + ' defined in STEPS array');
