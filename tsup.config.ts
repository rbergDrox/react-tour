import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        // Separate entries so code that only marks elements, or only builds
        // adapters, never pulls driver.js into its bundle.
        anchors: 'src/anchors.ts',
        inertia: 'src/inertia.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'es2020',
    external: ['react', 'react/jsx-runtime', 'driver.js', 'driver.js/hints'],
    onSuccess: async () => {
        await copyFile('src/styles.css', 'dist/styles.css');
    },
});
