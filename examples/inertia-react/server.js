/**
 * A stand-in for an Inertia backend (Laravel, Rails, ...), just large enough
 * to run the example: it speaks the Inertia protocol for two pages and stores
 * tour progress in memory.
 */
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./dist', import.meta.url));
const port = Number(process.env.PORT ?? 4174);
const version = '1';

const pages = { '/': 'Home', '/inbox': 'Inbox' };

/** What a real backend would keep per user. */
const store = { tours: [], dismissedHints: [] };

const mime = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
};

function readJson(request) {
    return new Promise((resolve) => {
        let body = '';

        request.on('data', (chunk) => (body += chunk));
        request.on('end', () => {
            try {
                resolve(JSON.parse(body || '{}'));
            } catch {
                resolve({});
            }
        });
    });
}

function html(page) {
    // "<" is escaped so page data can never close the script element.
    const json = JSON.stringify(page).replace(/</g, '\\u003c');

    return `<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>react-tour · Inertia example</title>
        <link rel="stylesheet" href="/assets/app.css" />
    </head>
    <body>
        <script data-page="app" type="application/json">${json}</script>
        <div id="app"></div>
        <script type="module" src="/assets/app.js"></script>
    </body>
</html>`;
}

const server = createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'POST' && url.pathname === '/tour-progress') {
        // The shared persistence contract: { tour_key, status, step_index }.
        const body = await readJson(request);

        store.tours = [
            ...store.tours.filter((item) => item.tourKey !== body.tour_key),
            {
                tourKey: body.tour_key,
                status: body.status,
                stepIndex: body.step_index,
            },
        ];
        response.writeHead(204).end();

        return;
    }

    if (request.method === 'POST' && url.pathname === '/hints/dismiss') {
        const body = await readJson(request);

        store.dismissedHints = [
            ...new Set([...store.dismissedHints, body.hint_id]),
        ];
        response.writeHead(204).end();

        return;
    }

    if (request.method === 'POST' && url.pathname === '/reset') {
        store.tours = [];
        store.dismissedHints = [];
        response.writeHead(204).end();

        return;
    }

    if (url.pathname.startsWith('/assets/')) {
        const file = normalize(join(root, url.pathname));

        if (!file.startsWith(root)) {
            response.writeHead(403).end();

            return;
        }

        try {
            response
                .writeHead(200, {
                    'Content-Type':
                        mime[extname(file)] ?? 'application/octet-stream',
                })
                .end(await readFile(file));
        } catch {
            response.writeHead(404).end();
        }

        return;
    }

    const component = pages[url.pathname];

    if (request.method !== 'GET' || !component) {
        response.writeHead(404).end('Not found');

        return;
    }

    const page = {
        component,
        props: { onboarding: store },
        url: url.pathname,
        version,
    };

    if (request.headers['x-inertia']) {
        response
            .writeHead(200, {
                'Content-Type': 'application/json',
                'X-Inertia': 'true',
                Vary: 'X-Inertia',
            })
            .end(JSON.stringify(page));

        return;
    }

    response
        .writeHead(200, { 'Content-Type': 'text/html', Vary: 'X-Inertia' })
        .end(html(page));
});

server.listen(port, () => {
    console.log(`Inertia example on http://localhost:${port}`);
});
