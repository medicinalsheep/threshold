import { spawnTcVeh } from './tcVeh.js';
import { spawnTcChr } from './tcChr.js';
import { seedTcSfx, wireTcSfx } from './tcSfx.js';
import { wireTcTextures } from './tcTex.js';
import { playTcIntroAfterShow } from './tcIntro.js';
import { seedStarterSounds, wireStarterSounds } from './starterSfx.js';
import { buildTcUd, TC_META, TC_IDS, TC_LIC, TC_AUTH, tcSku, tcUri } from './tcMeta.js';

function spawnCp() {
    const T = window.THREE;
    if (!T || !window.Engine?.scene) return null;
    const g = new T.Group();
    const pole = new T.Mesh(
        new T.CylinderGeometry(0.08, 0.1, 1.6, 12),
        new T.MeshStandardMaterial({ color: 0x333344, roughness: 0.5 })
    );
    pole.position.y = 0.8;
    g.add(pole);
    const beacon = new T.Mesh(
        new T.SphereGeometry(0.22, 16, 16),
        new T.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.55 })
    );
    beacon.position.y = 1.65;
    g.add(beacon);

    const postMat = new T.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.55 });
    const gateMat = new T.MeshStandardMaterial({
        color: 0x39ff14,
        emissive: 0x1a8822,
        emissiveIntensity: 0.35,
        roughness: 0.35,
        metalness: 0.2,
    });
    const gateRoot = new T.Group();
    gateRoot.name = 'tc_gate';
    const leftPost = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 1.35, 10), postMat);
    leftPost.position.set(-1.15, 0.68, 0);
    const rightPost = leftPost.clone();
    rightPost.position.x = 1.15;
    const bar = new T.Mesh(new T.BoxGeometry(2.35, 0.07, 0.07), gateMat);
    bar.position.set(0, 1.32, 0);
    gateRoot.add(leftPost, rightPost, bar);
    g.add(gateRoot);

    g.position.set(0, 0, -5.5);
    g.userData = buildTcUd({ id: TC_IDS.cp, nm: 'TC Checkpoint', typ: 'prop', k: 'scene', lock: false }, TC_META.show);
    g.userData.isRotating = true;
    g.userData.tcGate = {
        bar,
        beacon,
        restRotX: 0,
        openRotX: -Math.PI / 2.15,
        openUntil: 0,
        flash: 0,
    };
    window.Engine.scene.add(g);
    window.State.objects.push(g);
    return g;
}

export async function spawnTcShow() {
    const veh = await spawnTcVeh();
    const chr = await spawnTcChr();
    const cp = spawnCp() ? 1 : 0;
    const sfx = await seedTcSfx();
    const wired = wireTcSfx();
    const tex = await wireTcTextures();
    await seedStarterSounds();
    wireStarterSounds();
    const intro = await playTcIntroAfterShow(700);
    const n = (veh.n || 0) + (chr.n || 0) + cp;
    if (n) {
        window.Engine?.setRenderMode?.(4);
        const introTag = intro.played ? ' · intro' : '';
        window.UI?.status?.(`TC show v${TC_META.show.ver}: ${n} obj · ${sfx.n} sfx · ${tex.maps || 0} tex${introTag} · EXPORT`);
    }
    return {
        n, ed: TC_META.show.ed, ver: TC_META.show.ver,
        veh: veh.n, chr: chr.n, sfx: sfx.n, wired, tex: tex.n, texMaps: tex.maps, intro,
    };
}

export function getTcShowCredits() {
    return [{
        id: TC_IDS.cp, label: 'TC Checkpoint', kind: 'scene', license: TC_LIC, author: TC_AUTH,
        source: 'TC show prop', storeSku: tcSku('scene', 'cp'), registryUri: tcUri('cp'),
    }];
}

window.TcShow = { spawnTcShow, getTcShowCredits };