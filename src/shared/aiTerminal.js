/** In-world AI / model assignment kiosk */

export function spawnAiTerminal(options = {}) {
    const T = window.THREE;
    const Engine = window.Engine;
    const State = window.State;
    if (!T || !Engine?.scene) return null;

    const pos = options.pos || { x: 2.8, y: 0, z: 1.2 };
    const rotY = options.rotY ?? -0.55;

    const deskMat = new T.MeshStandardMaterial({ color: 0x2a2e38, roughness: 0.78, metalness: 0.08 });
    const screenMat = new T.MeshStandardMaterial({
        color: 0x0a1420,
        emissive: 0x1a4466,
        emissiveIntensity: 0.22,
        roughness: 0.35,
        metalness: 0.05,
    });
    const bezelMat = new T.MeshStandardMaterial({ color: 0x111820, roughness: 0.65, metalness: 0.12 });
    const keyMat = new T.MeshStandardMaterial({ color: 0x1c222c, roughness: 0.82, metalness: 0.04 });

    const g = new T.Group();
    g.name = 'ai_terminal';

    const base = new T.Mesh(new T.BoxGeometry(1.1, 0.72, 0.62), deskMat);
    base.position.y = 0.36;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    const stand = new T.Mesh(new T.BoxGeometry(0.14, 0.5, 0.12), deskMat);
    stand.position.set(0, 0.86, -0.18);
    g.add(stand);

    const bezel = new T.Mesh(new T.BoxGeometry(0.82, 0.52, 0.06), bezelMat);
    bezel.position.set(0, 1.12, -0.1);
    g.add(bezel);

    const screen = new T.Mesh(new T.BoxGeometry(0.72, 0.42, 0.02), screenMat);
    screen.position.set(0, 1.12, -0.07);
    g.add(screen);

    const keyboard = new T.Mesh(new T.BoxGeometry(0.7, 0.04, 0.22), keyMat);
    keyboard.position.set(0, 0.76, 0.12);
    g.add(keyboard);

    const glow = new T.PointLight(0x3a88aa, 0.35, 3.5);
    glow.position.set(0, 1.15, 0.15);
    g.add(glow);

    g.position.set(pos.x, pos.y, pos.z);
    g.rotation.y = rotY;

    g.userData = {
        id: options.id || 'ai_terminal',
        name: options.name || 'AI Build Station',
        type: 'prop',
        locked: true,
        isAiTerminal: true,
        interactAction: options.interactAction || 'agents',
        interactLabel: options.interactLabel || 'AI Build Station',
        interactHint: options.interactHint || 'AI Build — Grok · agents · models',
        interactRadius: options.interactRadius ?? 2.5,
        thirdEyeTarget: true,
        soundTrigger: 'interact',
        soundFreq: 520,
        soundType: 'sine',
    };

    Engine.scene.add(g);
    State.objects.push(g);
    return g;
}

window.AiTerminal = { spawnAiTerminal };