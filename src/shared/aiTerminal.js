/** In-world AI / model assignment kiosk — quality PBR when textures are wired */

export function spawnAiTerminal(options = {}) {
    const T = window.THREE;
    const Engine = window.Engine;
    const State = window.State;
    if (!T || !Engine?.scene) return null;

    const pos = options.pos || { x: 2.8, y: 0, z: 1.2 };
    const rotY = options.rotY ?? -0.55;
    const showcase = options.showcase === true;

    const SM = window.StarterMaterials;
    const mats = showcase ? SM?.createStarterMaterials?.(T) : null;
    const deskMat = mats?.metal?.clone?.() || new T.MeshStandardMaterial({
        color: 0x2a2e38, roughness: 0.72, metalness: 0.18, envMapIntensity: 0.35,
    });
    deskMat.userData = { name: options.name || 'AI Build Station' };
    const woodTop = mats?.wood?.clone?.() || new T.MeshStandardMaterial({
        color: 0x4a4038, roughness: 0.82, metalness: 0.04,
    });
    const copperTrim = mats?.copper?.clone?.() || new T.MeshStandardMaterial({
        color: 0xb87848, roughness: 0.4, metalness: 0.68, envMapIntensity: 0.42,
    });
    const screenMat = new T.MeshStandardMaterial({
        color: 0x0a1420,
        emissive: 0x1a4466,
        emissiveIntensity: showcase ? 0.32 : 0.22,
        roughness: 0.35,
        metalness: 0.05,
    });
    const bezelMat = new T.MeshStandardMaterial({
        color: 0x111820, roughness: 0.58, metalness: 0.22, envMapIntensity: 0.38,
    });
    const keyMat = new T.MeshStandardMaterial({
        color: 0x1c222c, roughness: 0.82, metalness: 0.04,
    });

    const g = new T.Group();
    g.name = options.id || 'ai_terminal';

    const seg = showcase ? 16 : 8;
    const base = new T.Mesh(new T.BoxGeometry(1.15, 0.76, 0.66), deskMat);
    base.position.y = 0.38;
    base.castShadow = true;
    base.receiveShadow = true;
    g.add(base);

    if (showcase) {
        const top = new T.Mesh(new T.BoxGeometry(1.18, 0.05, 0.68), woodTop);
        top.position.y = 0.78;
        top.castShadow = true;
        top.userData = { name: options.name || 'AI Build Station' };
        const trim = new T.Mesh(new T.BoxGeometry(1.2, 0.04, 0.04), copperTrim);
        trim.position.set(0, 0.74, 0.34);
        g.add(top, trim);
    }

    const stand = new T.Mesh(new T.BoxGeometry(0.12, 0.52, 0.1), deskMat);
    stand.position.set(0, 0.9, -0.18);
    g.add(stand);

    const bezel = new T.Mesh(new T.BoxGeometry(0.84, 0.54, 0.06), bezelMat);
    bezel.position.set(0, 1.16, -0.1);
    g.add(bezel);

    const screen = new T.Mesh(new T.BoxGeometry(0.74, 0.44, 0.02), screenMat);
    screen.position.set(0, 1.16, -0.07);
    g.add(screen);

    const keyboard = new T.Mesh(new T.BoxGeometry(0.72, 0.04, 0.24), keyMat);
    keyboard.position.set(0, 0.8, 0.12);
    g.add(keyboard);

    if (showcase) {
        const pedestal = new T.Mesh(new T.CylinderGeometry(0.42, 0.48, 0.08, seg), deskMat);
        pedestal.position.y = 0.04;
        pedestal.receiveShadow = true;
        g.add(pedestal);
    }

    const glow = new T.PointLight(0x3a88aa, showcase ? 0.42 : 0.35, 4.2);
    glow.position.set(0, 1.18, 0.15);
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
        showcaseKiosk: showcase,
    };

    Engine.scene.add(g);
    State.objects.push(g);
    return g;
}

window.AiTerminal = { spawnAiTerminal };