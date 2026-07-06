/** Sprint G — generalized guest starter rebuild registry */

function sceneHas(markerId) {
    return (window.State?.objects || []).some((o) => o.userData?.id === markerId);
}

function findObject(markerId) {
    return (window.State?.objects || []).find((o) => o.userData?.id === markerId);
}

const REBUILD_CHAIN = [
    { marker: 'starter_site_terrain', run: () => window.buildStarterSiteTerrain191?.() },
    {
        marker: 'starter_creek',
        run: () => {
            window.buildStarterEnv14?.();
            window.StarterEnv14?.wireAnims?.();
        },
    },
    {
        marker: 'starter_wildlife_cat',
        run: () => {
            window.buildStarterWildlife15?.();
            window.StarterWildlife15?.wireAnims?.();
        },
    },
    {
        marker: 'starter_traffic_lights',
        run: () => {
            window.buildStarterUrban16?.();
            window.StarterUrban16?.wireAnims?.();
        },
    },
    {
        marker: 'starter_interior_coffee',
        run: () => {
            window.buildStarterInterior17?.();
            window.StarterInterior17?.wireAnims?.();
        },
    },
    {
        marker: 'starter_courtyard_props',
        run: () => {
            window.buildStarterCourtyard194?.();
            window.StarterCourtyard194?.wireAnims?.();
        },
    },
    {
        marker: 'starter_tesla_exterior',
        run: () => {
            window.buildStarterTeslaExterior18?.();
            window.StarterTeslaExterior18?.wireAnims?.();
        },
    },
    {
        marker: 'starter_tesla_coil',
        run: () => {
            window.buildStarterTeslaLab18?.();
            window.StarterTeslaLab18?.wireAnims?.();
        },
    },
    {
        marker: 'starter_tesla_rotary',
        run: () => {
            window.buildStarterTeslaInteract182?.();
            window.StarterTeslaInteract182?.wireAnims?.();
        },
    },
    { marker: 'tesla_guide_npc', run: () => void window.spawnTeslaGuideNpc?.() },
    {
        marker: 'starter_tesla_skylight',
        run: () => {
            window.buildStarterTeslaWeather184?.();
            window.StarterTeslaWeather184?.wireAnims?.();
        },
    },
    {
        marker: 'starter_lighting_195',
        run: () => {
            window.applyWardenclyffeLighting195?.();
            window.StarterLighting195?.wireAnims?.();
        },
    },
];

const UPGRADE_CHAIN = [
    {
        id: 'lab_glb185',
        needs: () => sceneHas('starter_tesla_coil') && !findObject('starter_tesla_coil')?.userData?.glb185,
        run: () => void window.upgradeTeslaLabGlb185?.(),
    },
    {
        id: 'building_glb192',
        needs: () => sceneHas('starter_tesla_building_shell') && !findObject('starter_tesla_building_shell')?.userData?.glb192,
        run: () => void window.upgradeTeslaBuildingGlb192?.().then(() => window.wireBuildingGlbTextures193?.()),
    },
    {
        id: 'building_tex193',
        needs: () => {
            const shell = findObject('starter_tesla_building_shell');
            return shell?.userData?.glb192 && !shell.userData?.glbTex193;
        },
        run: () => void window.wireBuildingGlbTextures193?.(),
    },
];

export function isStarterWorldState(state) {
    const objects = state?.objects || [];
    return objects.some((o) => {
        const id = o.userData?.id || '';
        return id === 'starter_ground'
            || id === 'starter_highway'
            || id === 'starter_site_terrain'
            || id === 'template_minimal_platform';
    });
}

export async function runGuestRebuilds(state) {
    if (!isStarterWorldState(state)) {
        const empty = { rebuilt: [], upgrades: [], skipped: true };
        window.GuestRebuildTelemetry?.record?.(empty);
        return empty;
    }

    const rebuilt = [];
    const upgrades = [];

    for (const entry of REBUILD_CHAIN) {
        if (!sceneHas(entry.marker)) {
            await entry.run?.();
            rebuilt.push(entry.marker);
        }
    }

    for (const entry of UPGRADE_CHAIN) {
        if (entry.needs?.()) {
            await entry.run?.();
            upgrades.push(entry.id);
        }
    }

    window.applySurvivalWorldHooks?.();

    const result = { rebuilt, upgrades, skipped: false };
    window.GuestRebuildTelemetry?.record?.(result);
    return result;
}

window.GuestRebuild = { isStarterWorldState, runGuestRebuilds, REBUILD_CHAIN, UPGRADE_CHAIN };