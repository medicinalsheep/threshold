import profilesConfig from '../../config/graphics-export-profiles.json';

export const GRAPHICS_EXPORT_PROFILES = profilesConfig.profiles;

export function getExportProfile(profileId) {
    const profile = GRAPHICS_EXPORT_PROFILES[profileId];
    if (!profile) return null;
    return { id: profileId, ...profile };
}

export function listExportProfiles() {
    return Object.entries(GRAPHICS_EXPORT_PROFILES).map(([id, p]) => ({ id, ...p }));
}

export function getGraphicsExportBlock(activeProfile = null) {
    return {
        profiles: GRAPHICS_EXPORT_PROFILES,
        hilodSuffixes: profilesConfig.hilodSuffixes || ['_512', '_1k', '_2k', '_4k'],
        textureMaxPreference: profilesConfig.textureMaxPreference || {},
        activeProfile: activeProfile,
        exportCli: 'npm run export:graphics -- --profile <web|android|ios|windows|steam>',
        note: 'Prunes textures by HILOD suffix (_512/_1k/_2k) per platform textureMax; writes dist-export/<profile>/',
    };
}

window.GraphicsExportProfiles = {
    GRAPHICS_EXPORT_PROFILES,
    getExportProfile,
    listExportProfiles,
    getGraphicsExportBlock,
};