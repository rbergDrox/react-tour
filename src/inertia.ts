/**
 * Adapters for Inertia.js hosts.
 *
 * Nothing here imports `@inertiajs/react`: the router and page are passed in
 * and typed structurally, so this entry point adds no dependency and the core
 * stays unaware that Inertia exists.
 */
import type { TourAdapters, TourLabels, TourProgress } from './types';

/** The part of Inertia's `router` the adapters use. */
export type InertiaRouterLike = {
    visit: (href: string) => unknown;
    on: (event: 'success', callback: () => void) => () => void;
};

/** The part of `usePage()` the adapters use. */
export type InertiaPageLike = {
    component: string;
};

export type InertiaAdapterOptions = {
    router: InertiaRouterLike;
    page: InertiaPageLike;
    /**
     * Where progress is recorded. A URL is posted to in the background as
     * `{ tour_key, status, step_index }`; a function receives the progress and
     * does whatever it likes — except visit through the Inertia router.
     */
    persist?: string | ((progress: TourProgress) => void);
    dismissHint?: (hintId: string) => void;
    onCompleted?: (tourKey: string) => void;
    onSkipped?: (tourKey: string, stepIndex: number) => void;
    labels?: Partial<TourLabels>;
};

function xsrfToken(): string | undefined {
    const token = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

    return token ? decodeURIComponent(token) : undefined;
}

/**
 * Fire-and-forget POST for bookkeeping writes.
 *
 * Deliberately not `router.post`: an Inertia visit emits navigation events,
 * and the tour listens for navigation to know when the user has moved on —
 * persisting through the router would make the tour interrupt itself.
 */
export function postInBackground(
    url: string,
    payload: Record<string, unknown>,
): void {
    const token = xsrfToken();

    void fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-XSRF-TOKEN': token } : {}),
        },
        body: JSON.stringify(payload),
    }).catch(() => {
        // Losing a progress ping is not worth surfacing to the user; the next
        // step transition records the position again.
    });
}

/**
 * Builds a `TourAdapters` object for an Inertia app.
 *
 * `TourProvider` needs its adapters to be referentially stable, so memoize
 * the result on `page.component` (and anything else your options close over):
 *
 *     const page = usePage();
 *     const adapters = useMemo(
 *         () => createInertiaAdapters({ router, page, persist: '/tours' }),
 *         [page.component],
 *     );
 */
export function createInertiaAdapters({
    router,
    page,
    persist,
    dismissHint,
    onCompleted,
    onSkipped,
    labels,
}: InertiaAdapterOptions): TourAdapters {
    const component = page.component;

    return {
        navigate: (href) => {
            router.visit(href);
        },
        onNavigated: (callback) => router.on('success', () => callback()),
        currentPageKey: () => component,
        persist:
            typeof persist === 'string'
                ? (progress) =>
                      postInBackground(persist, {
                          tour_key: progress.tourKey,
                          status: progress.status,
                          step_index: progress.stepIndex,
                      })
                : persist,
        dismissHint,
        onCompleted,
        onSkipped,
        labels,
    };
}
