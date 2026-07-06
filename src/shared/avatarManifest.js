/** Avatar manifest resolver — bodies, hair, roles (R8.2) */

import manifest from '../../config/avatar-manifest.json';

export const AvatarManifest = {
    raw: manifest,

    bodies() {
        return manifest.bodies || {};
    },

    hairStyles() {
        return manifest.hair || {};
    },

    role(roleId) {
        return manifest.roles?.[roleId] || null;
    },

    body(bodyId) {
        return manifest.bodies?.[bodyId] || null;
    },

    hair(hairId) {
        return manifest.hair?.[hairId] || null;
    },

    resolveBodyGlb(profile, roleId = null) {
        const p = profile || {};
        if (p.customBodyGlb) return { file: p.customBodyGlb, heightM: manifest.defaultHeightM };
        const role = roleId ? this.role(roleId) : null;
        if (role?.glb) return { file: role.glb, heightM: role.heightM ?? manifest.defaultHeightM };
        const body = this.body(p.bodyId || 'male_default');
        if (!body) return { file: 'starter_avatar.glb', heightM: 1.75 };
        return { file: body.glb, heightM: body.heightM ?? manifest.defaultHeightM };
    },

    resolveHairGlb(profile) {
        const p = profile || {};
        if (p.customHairGlb) return { file: p.customHairGlb, spec: { fpsHide: true } };
        const hairId = p.hairId || 'none';
        const spec = this.hair(hairId);
        if (!spec || spec.procedural) return null;
        return { file: spec.glb, spec };
    },

    resolveProfileForRole(roleId, overrides = {}) {
        const role = this.role(roleId) || {};
        const base = {
            bodyId: role.bodyId || 'male_default',
            hairId: role.hairId || 'hair_short_m',
        };
        if (role.glb) {
            base.customBodyGlb = role.glb;
        }
        return { ...base, ...overrides };
    },

    attachPointNames(kind = 'hair') {
        return manifest.attachPoints?.[kind] || manifest.namedParts || ['head'];
    },

    fpsHideParts() {
        return manifest.fpsHideParts || ['head', 'hairCap', 'neck'];
    },
};

window.AvatarManifest = AvatarManifest;