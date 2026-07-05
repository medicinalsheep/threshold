import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const base = env.VITE_BASE_PATH || '/';

    const isPages = mode === 'pages';

    return {
        base,
        build: {
            outDir: isPages ? 'dist-pages' : mode === 'grok' ? 'dist-grok' : 'dist',
            sourcemap: false,
            chunkSizeWarningLimit: 1200,
            rollupOptions: isPages ? {
                output: {
                    entryFileNames: 'assets/threshold.js',
                    chunkFileNames: 'assets/[name].js',
                    assetFileNames: (info) => {
                        if (info.name?.endsWith('.css')) return 'assets/threshold.css';
                        return 'assets/[name][extname]';
                    }
                }
            } : undefined
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