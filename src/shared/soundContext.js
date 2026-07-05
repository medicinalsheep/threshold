import { SoundLibrary } from './soundLibrary.js';

const TRIGGER_LABELS = {
    collision: 'collision',
    interact: 'interact',
    emote: 'emote/walk',
    ambient: 'ambient',
};

export function getSoundAssignments() {
    const State = window.State;
    if (!State?.objects) return [];

    return State.objects
        .filter((o) => o.userData?.soundClipId || o.userData?.soundMode === 'clip')
        .map((o) => ({
            objectName: o.userData?.name || 'object',
            objectId: o.userData?.id,
            clipId: o.userData?.soundClipId,
            trigger: o.userData?.soundTrigger || 'collision',
            isPlayer: !!o.userData?.isPlayer,
            isHuman: !!(o.userData?.isHuman || o.userData?.isCharacter),
        }));
}

export function getSoundContext(selectedIds = null) {
    const clips = SoundLibrary.list();
    if (!clips.length) {
        return 'SOUND LIBRARY: (empty — user can record in ENGINE → SCENE dock → SFX tab)';
    }

    const filtered = selectedIds?.length
        ? clips.filter((c) => selectedIds.includes(c.id))
        : clips;

    const assignmentLines = getSoundAssignments()
        .map((a) => `  - ${a.objectName}: clip "${a.clipId}" on ${TRIGGER_LABELS[a.trigger] || a.trigger}`)
        .join('\n');

    const clipLines = filtered.map((c) => {
        const ctx = c.context ? ` — ${c.context}` : '';
        return `  - id: "${c.id}" | name: "${c.name}"${ctx}`;
    }).join('\n');

    return `
USER SOUND LIBRARY (${filtered.length} clip${filtered.length === 1 ? '' : 's'}):
${clipLines}

OBJECTS WITH SOUNDS ASSIGNED:
${assignmentLines || '  (none yet — assign in EDIT → Audio or SFX tab)'}

SOUND API FOR GENERATED CODE:
- userData.soundMode = 'clip' | 'tone'
- userData.soundClipId = '<id from library above>'
- userData.soundTrigger = 'collision' | 'interact' | 'emote' | 'ambient'
- userData.soundFreq / soundType for synth fallback
- After creating objects, user can record sounds in SFX tab and link via inspector
- Prefer referencing existing clip IDs when they fit the feature (footsteps, impacts, ambience)
`.trim();
}

window.getSoundContext = getSoundContext;