import { State } from './state.js';

export const Recorder = {
    mediaRecorder: null,
    chunks: [],
    blob: null,
    stream: null,

    toggle: function () { if (State.isRecording) this.stop(); else this.start(); },

    start: function () {
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            window.UI?.status("No canvas found for recording.");
            return;
        }
        // Capture at 0 FPS (manual requests for variable Three.js timing)
        this.stream = canvas.captureStream(0);
        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: 'video/webm' });
        this.chunks = [];
        this.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
        this.mediaRecorder.onstop = () => {
            this.blob = new Blob(this.chunks, { type: 'video/webm' });
            this.chunks = [];
            this.stream = null;
            State.isRecording = false;
            document.getElementById('btn-rec-start').style.display = 'inline-block';
            document.getElementById('btn-rec-stop').style.display = 'none';
            document.getElementById('btn-rec-save').style.display = 'inline-block';
            document.getElementById('rec-indicator').style.display = 'none';
            window.UI?.status("Recording Ready");
        };
        this.mediaRecorder.start();
        State.isRecording = true;
        document.getElementById('btn-rec-start').style.display = 'none';
        document.getElementById('btn-rec-stop').style.display = 'inline-block';
        document.getElementById('rec-indicator').style.display = 'inline-block';
        window.UI?.status("Recording...");
    },

    stop: function () {
        if (!State.isRecording || !this.mediaRecorder) return;
        this.mediaRecorder.stop();
    },

    save: function () {
        if (!this.blob) {
            window.UI?.status("No recording to save.");
            return;
        }
        const url = URL.createObjectURL(this.blob);
        const a = document.createElement('a');
        a.href = url; a.download = `threshold_${Date.now()}.webm`; a.click();
        // Cleanup
        URL.revokeObjectURL(url);
        this.blob = null;
        document.getElementById('btn-rec-save').style.display = 'none';
        window.UI?.status("Video saved.");
    }
};
