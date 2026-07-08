import { State } from './state.js';
import { World } from './world.js';
import { TextureBridge } from '../shared/textureBridge.js';
import { GltfImport } from '../shared/gltfImport.js';
import { UI } from './ui.js';

export const IO = {
    exportScene: function () {
        const data = State.objects.map(o => ({
            type: o.userData.type, name: o.userData.name,
            pos: o.position, rot: o.rotation, scl: o.scale,
            userData: o.userData, color: o.material?.color?.getHex?.() ?? 0xffffff,
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `threshold_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url);
        UI.status("Scene Exported");
    },
    importScene: function () { document.getElementById('file-input').click(); },
    handleFileSelect: function (e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                World.clearWorld();
                const gltfSnapshots = [];
                data.forEach(d => {
                    if (d.type === 'gltf' || d.userData?.type === 'gltf') {
                        gltfSnapshots.push({
                            type: 'gltf',
                            name: d.name,
                            pos: d.pos,
                            rot: d.rot,
                            scl: d.scl,
                            userData: d.userData,
                        });
                        return;
                    }
                    const m = World.createObject(d.type, d.name, d.color, false);
                    if (m) {
                        m.position.copy(d.pos); m.rotation.set(d.rot._x, d.rot._y, d.rot._z);
                        m.scale.copy(d.scl); m.userData = d.userData;
                    }
                });
                TextureBridge.rehydrateScene();
                if (gltfSnapshots.length) GltfImport.spawnSnapshots(gltfSnapshots);
                UI.status("Scene Loaded");
            } catch (err) { UI.status("Error Loading"); }
        };
        reader.readAsText(file);
    }
};
