import * as THREE from 'three';

export const IS_TOUCH_DEVICE = window.matchMedia('(pointer: coarse)').matches;

export const State = {
    selectedObject: null,
    audioEnabled: false,
    darkMode: true,
    gridVisible: true,
    renderMode: 4,
    graphicsTier: 'realistic',
    graphicsDetectedTier: null,
    objects: [],
    physicsObjects: [],
    keys: {},
    clipboardAllowed: false,
    ctxTargetPos: new THREE.Vector3(),
    isRecording: false,
    isPaused: true,
    aiFrozen: false,
    cutscenePlaying: false,
    cinematicCatalog: [],
    controlMode: 'fly',
    viewMode: 'tps',
    playerRef: null,
    hostCamera: null,
    syncPlayerPositions: {},
    env: {
        timeOfDay: 14,
        fogDensity: 0.015,
        waterEnabled: false,
        atmosphereEnabled: true,
    },
};

export const OBJECT_TYPES = ['cube', 'sphere', 'cone', 'torus'];

export const Modes = [
    { name: 'RETRO: THRESHOLD', desc: 'Optional 5-band grayscale' },
    { name: 'RETRO: 1-BIT', desc: 'Optional B&W' },
    { name: 'RETRO: TERMINAL', desc: 'Optional phosphor green' },
    { name: 'RETRO: SMPTE', desc: 'Optional 8-bit color' },
    { name: 'REALISTIC (PBR)', desc: 'Default — full lighting & textures' },
];