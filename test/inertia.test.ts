import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInertiaAdapters, postInBackground } from '../src/inertia';

function createRouter() {
    const listeners = new Set<() => void>();

    return {
        visit: vi.fn(),
        post: vi.fn(),
        on: vi.fn((_event: 'success', callback: () => void) => {
            listeners.add(callback);

            return () => {
                listeners.delete(callback);
            };
        }),
        emit: () => listeners.forEach((listener) => listener()),
        listenerCount: () => listeners.size,
    };
}

describe('createInertiaAdapters', () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));

    beforeEach(() => {
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    });

    it('maps navigation onto the router and the page component', () => {
        const router = createRouter();
        const adapters = createInertiaAdapters({
            router,
            page: { component: 'inbox/index' },
        });
        const onNavigated = vi.fn();

        adapters.navigate('/inbox');

        const unsubscribe = adapters.onNavigated(onNavigated);

        router.emit();

        expect(router.visit).toHaveBeenCalledWith('/inbox');
        expect(router.on).toHaveBeenCalledWith('success', expect.any(Function));
        expect(onNavigated).toHaveBeenCalledTimes(1);
        // The success event carries a payload the tour callback must not see.
        expect(onNavigated).toHaveBeenCalledWith();
        expect(adapters.currentPageKey()).toBe('inbox/index');

        unsubscribe();

        expect(router.listenerCount()).toBe(0);
    });

    it('persists to a URL with fetch, never through the router', () => {
        const router = createRouter();

        document.cookie = 'XSRF-TOKEN=abc%3D123';

        const adapters = createInertiaAdapters({
            router,
            page: { component: 'home' },
            persist: '/tour-progress',
        });

        adapters.persist?.({
            tourKey: 'welcome',
            status: 'in_progress',
            stepIndex: 2,
        });

        expect(router.visit).not.toHaveBeenCalled();
        expect(router.post).not.toHaveBeenCalled();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        const [url, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];

        expect(url).toBe('/tour-progress');
        expect(init.method).toBe('POST');
        expect(init.keepalive).toBe(true);
        expect(JSON.parse(String(init.body))).toEqual({
            tour_key: 'welcome',
            status: 'in_progress',
            step_index: 2,
        });
        expect(init.headers).toMatchObject({ 'X-XSRF-TOKEN': 'abc=123' });
    });

    it('passes a persist function and the other callbacks through', () => {
        const persist = vi.fn();
        const onCompleted = vi.fn();
        const labels = { next: 'Suivant' };
        const adapters = createInertiaAdapters({
            router: createRouter(),
            page: { component: 'home' },
            persist,
            onCompleted,
            labels,
        });

        expect(adapters.persist).toBe(persist);
        expect(adapters.onCompleted).toBe(onCompleted);
        expect(adapters.labels).toBe(labels);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('leaves persist undefined when none is given', () => {
        const adapters = createInertiaAdapters({
            router: createRouter(),
            page: { component: 'home' },
        });

        expect(adapters.persist).toBeUndefined();
    });
});

describe('postInBackground', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('swallows network failures and omits the token when there is none', async () => {
        const fetchMock = vi.fn(async () => {
            throw new Error('offline');
        });

        vi.stubGlobal('fetch', fetchMock);

        expect(() => postInBackground('/x', { a: 1 })).not.toThrow();
        await Promise.resolve();

        const [, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];

        expect(init.headers).not.toHaveProperty('X-XSRF-TOKEN');
    });
});
