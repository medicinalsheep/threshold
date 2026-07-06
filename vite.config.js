import { defineConfig, loadEnv } from 'vite';

function manualChunks(id) {
    if (!id.includes('node_modules')) {
        if (id.includes('/src/engine/')) return 'app-engine';
        if (id.includes('/src/compiler/')) return 'app-compiler';
        if (id.includes('/src/prompter/')) return 'app-prompter';
        return undefined;
    }
    if (id.includes('three/examples') || id.includes('three/addons')) return 'vendor-three-extras';
    if (id.includes('/three/')) return 'vendor-three';
    if (id.includes('cannon-es')) return 'vendor-physics';
    if (id.includes('peerjs')) return 'vendor-peer';
    if (id.includes('@supabase')) return 'vendor-supabase';
    return undefined;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const base = env.VITE_BASE_PATH || '/';

    const isPages = mode === 'pages';
    const isElectron = mode === 'electron';
    const isDistPages = isPages || isElectron;

    return {
        base,
        build: {
            outDir: isDistPages ? 'dist-pages' : mode === 'grok' ? 'dist-grok' : 'dist',
            sourcemap: false,
            chunkSizeWarningLimit: 900,
            rollupOptions: {
                onwarn(warning, warn) {
                    if (warning.code === 'EVAL') return;
                    warn(warning);
                },
                output: {
                    entryFileNames: isDistPages ? 'assets/threshold.js' : 'assets/[name].js',
                    chunkFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: (info) => {
                        if (info.name?.endsWith('.css')) return 'assets/threshold.css';
                        return 'assets/[name][extname]';
                    },
                    manualChunks,
                },
            },
        },
        server: {
            host: true,
            port: 5173,
        },
        preview: {
            host: true,
            port: 4173,
        },
    };
});