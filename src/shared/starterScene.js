/** Default entry — blank grid, no bundled showcase assets */

import { EXTERIOR_SPAWN } from './starterSiteLayout.js';
import { buildStarterGrid } from './starterGrid.js';

export async function bootstrapStarterScene() {
    const Engine = window.Engine;
    const State = window.State;
    if (!Engine?.scene || !State) return;

    if (State.objects.length > 1) return;

    await buildStarterGrid();

    const { scheduleTemplateSpawn } = await import('./starterTemplates.js');
    scheduleTemplateSpawn(EXTERIOR_SPAWN, {
        skipIntro: true,
        spawnDelay: 80,
        status: 'Workspace pad — walk · EDIT to build · push crate / hinge gate · AI station',
    });
}

window.bootstrapStarterScene = bootstrapStarterScene;