import { createInertiaApp } from '@inertiajs/react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import 'driver.js/dist/driver.css';
import 'driver.js/dist/hints.css';
import '@shapperize/react-tour/styles.css';
import './app.css';

const pages = import.meta.glob<{ default: ComponentType }>('./pages/*.tsx', {
    eager: true,
});

void createInertiaApp({
    resolve: (name) => pages[`./pages/${name}.tsx`],
    setup({ el, App, props }) {
        createRoot(el!).render(<App {...props} />);
    },
});
