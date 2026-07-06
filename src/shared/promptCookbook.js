/** Sprint C — tested PromptGen starters (LEGO FIT: extend scene, no clearWorld) */

export const PROMPT_COOKBOOK = [
    {
        id: 'wood_crate_row',
        title: 'Wood crate row',
        task: 'extend',
        idea: 'Add a row of three wooden crates along the west edge of the courtyard with physics (mass 12, friction 0.5). Use World.createObject and court() offsets from the live scene.',
        hint: 'Reliable prop stack — good first PromptGen win.',
    },
    {
        id: 'gas_lamp_pair',
        title: 'Gas lamp pair',
        task: 'extend',
        idea: 'Place two period gas lamps flanking the south approach path with emissive bulbs and soft point lights. Match Wardenclyffe wood/pole materials.',
        hint: 'Emissive + PointLight pattern.',
    },
    {
        id: 'gravel_path_fork',
        title: 'Gravel path fork',
        task: 'extend',
        idea: 'Extend the gravel courtyard with a Y-shaped footpath using thin box meshes, surfaceType gravel, and Physics static colliders.',
        hint: 'Terrain extension without clearing the world.',
    },
    {
        id: 'npc_patrol',
        title: 'Patrol NPC',
        task: 'player',
        idea: 'Spawn a procedural human NPC with lab-coat colors who patrols between two courtyard waypoints using NpcPatrol.register.',
        hint: 'Uses existing avatar + patrol APIs.',
    },
    {
        id: 'coil_spark_zone',
        title: 'Coil spark zone',
        task: 'extend',
        idea: 'Add an interactable brass switch near the Tesla coil that plays starter_tesla_spark on [F] and briefly boosts coil arc emissive.',
        hint: 'Interact + SFX wiring from lab annex.',
    },
    {
        id: 'surreal_float',
        title: 'Surreal float island',
        task: 'extend',
        idea: 'Add a small floating island 4m above the courtyard with a glowing torus portal, low gravity feel (visual only), and one glass pane with transmission 0.85.',
        hint: 'Best on Surreal Seed template.',
    },
    {
        id: 'tc_checkpoint_sign',
        title: 'TC checkpoint sign',
        task: 'extend',
        idea: 'Add a billboard plane near tc_cp that says LAP TIMER with emissive text material; do not move the checkpoint gate.',
        hint: 'Pairs with TC Circuit template.',
    },
    {
        id: 'weather_marquee',
        title: 'Rain-ready marquee',
        task: 'extend',
        idea: 'Add a double-sided marquee plane south of the lab with weatherMarquee userData so rain dampens emissive slightly.',
        hint: 'Hooks WeatherSystem wet-glass / marquee anim.',
    },
    {
        id: 'shooting_lane',
        title: 'Shooting lane prop',
        task: 'world',
        idea: 'Add a metal target on the east courtyard edge with gun_target id pattern and surfaceType metal for footstep/physics demos.',
        hint: 'Jordan range-officer zone compatible.',
    },
    {
        id: 'audit_scene',
        title: 'Audit EDIT vs PLAY',
        task: 'audit',
        idea: 'List which objects in the current scene are editable in EDIT mode vs locked in PLAY, and which panels (Texture, Collision, Audio) apply.',
        hint: 'Non-destructive — great for teaching modes.',
    },
    {
        id: 'survival_food_prop',
        title: 'Survival food prop',
        task: 'extend',
        idea: 'Add a small crate or counter mesh near the visitor path with userData.interactAction survival, survivalKind food, interactHint Grab rations, and interactRadius 2.2. Call applySurvivalWorldHooks() after spawn.',
        hint: 'Clone showcase coffee/snack pattern — PLAY + F interact.',
    },
    {
        id: 'ambient_rest_zone',
        title: 'Ambient rest zone',
        task: 'extend',
        idea: 'Place an invisible or low-profile marker mesh with userData.ambientZone interior, zoneRadius 6, zoneRest 0.4, zoneCalm 0.35, zoneSheltered true. SurvivalZones reads it for passive recovery in PLAY.',
        hint: 'Shelter + calm without wiping the world.',
    },
];

export function getCookbookEntry(id) {
    return PROMPT_COOKBOOK.find((e) => e.id === id) || null;
}

window.PromptCookbook = { PROMPT_COOKBOOK, getCookbookEntry };