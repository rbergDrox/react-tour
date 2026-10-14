import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Only matters while the package is linked from this repository: a
        // symlinked dependency must not bring a second copy of React with it.
        dedupe: ['react', 'react-dom', 'driver.js'],
    },
});
