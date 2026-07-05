import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const base = env.VITE_BASE_PATH || '/';

    return {
        base,
        build: {
            outDir: mode === 'pages' ? 'dist-pages' : mode === 'grok' ? 'dist-grok' : 'dist',
            sourcemap: false,
            chunkSizeWarningLimit: 1200
        },
        server: {
            host: true,
            port: 5173
        },
        preview: {
            host: true,
            port: 4173
        }
    };
});