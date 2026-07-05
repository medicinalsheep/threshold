import { SoundLibrary } from './soundLibrary.js';

let activeTarget = null;
let recording = false;

function el(id) {
    return document.getElementById(id);
}

function setModalVisible(on) {
    const modal = el('sound-prompt-modal');
    if (!modal) return;
    modal.classList.toggle('open', on);
}

function updateRecordUi() {
    const btn = el('sound-prompt-record');
    const status = el('sound-prompt-status');
    if (!btn || !status) return;
    if (recording) {
        btn.textContent = '■ STOP';
        status.textContent = 'Recording… tap STOP when done';
    } else {
        btn.textContent = '● RECORD';
        status.textContent = 'Record a sound for this feature, or add later';
    }
}

function populateClipSelect(select, selectedId = '') {
    if (!select) return;
    const clips = SoundLibrary.list();
    select.innerHTML = '<option value="">— pick saved sound —</option>'
        + clips.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    if (selectedId) select.value = selectedId;
}

async function assignClip(clipId) {
    if (!clipId || !activeTarget) return;
    const { type, object, trigger } = activeTarget;
    if (type === 'object' && object) {
        await SoundLibrary.assignToObject(object, clipId, trigger);
        window.UI?.applyInspectorFromUi?.();
        window.UI?.loadInspectorFromObject?.(object);
        window.UI?.status?.('Sound linked to object');
    } else {
        window.State = window.State || {};
        window.State.worldSoundClipId = clipId;
        window.UI?.status?.('World ambience sound saved — assign per-object in EDIT tab');
    }
    setModalVisible(false);
    activeTarget = null;
}

export const SoundPrompt = {
    init() {
        el('sound-prompt-close')?.addEventListener('click', () => {
            SoundLibrary.cancelRecording();
            recording = false;
            setModalVisible(false);
            activeTarget = null;
        });

        el('sound-prompt-later')?.addEventListener('click', () => {
            SoundLibrary.cancelRecording();
            recording = false;
            setModalVisible(false);
            window.UI?.status?.('Sound can be added anytime in SFX tab or object Audio panel');
            activeTarget = null;
        });

        el('sound-prompt-record')?.addEventListener('click', async () => {
            try {
                if (!recording) {
                    window.AudioSys?.ensureContext?.();
                    await SoundLibrary.startRecording();
                    recording = true;
                } else {
                    const blob = await SoundLibrary.stopRecording();
                    recording = false;
                    if (!blob?.size) {
                        window.UI?.status?.('Recording empty — try again');
                        updateRecordUi();
                        return;
                    }
                    const name = el('sound-prompt-name')?.value?.trim()
                        || `${activeTarget?.label || 'Sound'} ${new Date().toLocaleTimeString()}`;
                    const clip = await SoundLibrary.saveClip(name, blob, {
                        context: activeTarget?.label,
                        targetType: activeTarget?.type,
                        targetId: activeTarget?.object?.userData?.id,
                    });
                    populateClipSelect(el('sound-prompt-pick'), clip.id);
                    await assignClip(clip.id);
                }
                updateRecordUi();
            } catch (e) {
                recording = false;
                SoundLibrary.cancelRecording();
                updateRecordUi();
                window.UI?.status?.(e.message || 'Mic access denied');
            }
        });

        el('sound-prompt-assign')?.addEventListener('click', async () => {
            const id = el('sound-prompt-pick')?.value;
            if (!id) {
                window.UI?.status?.('Pick a sound or record one first');
                return;
            }
            await assignClip(id);
        });

        el('sound-prompt-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'sound-prompt-modal') {
                SoundLibrary.cancelRecording();
                recording = false;
                setModalVisible(false);
                activeTarget = null;
            }
        });
    },

    offer(opts = {}) {
        const {
            label = 'New feature',
            hint = 'Add a custom sound now or later.',
            type = 'world',
            object = null,
            trigger = 'collision',
        } = opts;

        activeTarget = { label, type, object, trigger };
        recording = false;
        SoundLibrary.cancelRecording();

        if (el('sound-prompt-title')) el('sound-prompt-title').textContent = label;
        if (el('sound-prompt-hint')) el('sound-prompt-hint').textContent = hint;
        if (el('sound-prompt-name')) {
            el('sound-prompt-name').value = `${label} sound`;
        }
        populateClipSelect(el('sound-prompt-pick'), object?.userData?.soundClipId || '');
        updateRecordUi();
        setModalVisible(true);
    },

    offerForObject(object, label, trigger = 'collision') {
        if (!object) return;
        this.offer({
            label,
            hint: `Record or pick a sound for "${object.userData?.name || label}". Assign triggers in the Audio tab.`,
            type: 'object',
            object,
            trigger,
        });
    },

    offerForWorld(label) {
        this.offer({
            label,
            hint: 'Record ambience or a world reaction sound. Link to objects later in EDIT → Audio.',
            type: 'world',
        });
    },
};

window.SoundPrompt = SoundPrompt;