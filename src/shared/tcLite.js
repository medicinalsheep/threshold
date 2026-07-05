/** TC lite — procedural fallback */
import { buildTcUd, TC_META, TC_IDS, TC_LIC, TC_AUTH, tcSku, tcUri } from './tcMeta.js';

function stdMat(c, o = {}) {
    const m = new window.THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.45, metalness: o.m ?? 0.35 });
    if (o.e != null) { m.emissive.setHex(o.e); m.emissiveIntensity = o.ei ?? 0.25; }
    return m;
}

function addPart(g, geo, ma, p) {
    const m = new window.THREE.Mesh(geo, ma);
    if (p) m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
    g.add(m);
}

function attachPhys(mesh, stat = false) {
    const P = window.Physics;
    const S = window.State;
    if (!P || !S) return;
    const mass = stat ? 0 : (mesh.userData.mass ?? 1);
    const body = P.addBodyFromObject(mesh, mass);
    if (!stat && body) { body.mass = mass; body.updateMassProperties?.(); }
    S.physicsObjects.push({ mesh, body });
    mesh.userData.hasPhysics = true;
}

function toScene(mesh) {
    window.Engine?.scene?.add(mesh);
    window.State?.objects?.push(mesh);
    return mesh;
}

export function spawnTcSpan(pos) {
    const T = window.THREE;
    if (!T) return null;
    const g = new T.Group();
    addPart(g, new T.BoxGeometry(10, 0.14, 2.6), stdMat(0x222233), { y: 0.07 });
    [-1.15, 1.15].forEach((x) => addPart(g, new T.BoxGeometry(0.14, 0.28, 10), stdMat(0x333344), { x, y: 0.22 }));
    g.position.set(pos.x, pos.y, pos.z);
    g.userData = buildTcUd({ id: TC_IDS.span, nm: 'TC Span', typ: 'scene', k: 'scene', phys: true, mass: 0, lock: true }, TC_META.lite);
    attachPhys(g, true);
    return toScene(g);
}

export function spawnTcLite() {
    let n = 0;
    if (spawnTcSpan({ x: 0, y: 0, z: -8 })) n += 1;
    if (n) window.UI?.status?.(`TC lite: ${n} procedural`);
    return { n, ed: TC_META.lite.ed, ver: TC_META.lite.ver };
}

export function getTcLiteCredits() {
    return [{
        id: TC_IDS.span, label: 'TC Span', kind: 'scene', license: TC_LIC, author: TC_AUTH,
        source: 'TC procedural', storeSku: tcSku('scene', 'span'), registryUri: tcUri('span'),
    }];
}

window.TcLite = { spawnTcLite, spawnTcSpan, getTcLiteCredits };