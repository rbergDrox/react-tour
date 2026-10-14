import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Only matters while the package is linked from this repository: a
        // symlinked dependency must not bring a second copy of React with it.
        dedupe: ['react', 'react-dom', 'driver.js'],
    },
    build: {
        // Fixed names so the tiny server can reference them without reading
        // a manifest. A real app would use its framework's Vite integration.
        rollupOptions: {
            input: 'src/app.tsx',
            output: {
                entryFileNames: 'assets/app.js',
                chunkFileNames: 'assets/[name].js',
                assetFileNames: 'assets/[name][extname]',
            },
        },
    },
});
