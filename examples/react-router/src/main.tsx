import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import 'driver.js/dist/driver.css';
import 'driver.js/dist/hints.css';
import '@shapperize/react-tour/styles.css';
import './app.css';
import { App } from './app';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);
