import { act, render, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { anchorSelector } from '../src/anchors';
import { TourHints } from '../src/tour-hints';
import { TourProvider, useTour } from '../src/tour-provider';
import type {
    TourAdapters,
    TourDefinition,
    TourDriverOptions,
    TourProgress,
} from '../src/types';

const fake = await vi.hoisted(async () => {
    const { createFakeDriverClient } = await import('./fake-driver-client');

    return createFakeDriverClient();
});

vi.mock('../src/driver-client', () => fake.module);

const state = fake.state;

/** A host with a controllable "current page" and navigation event. */
function createHost(initialPage = 'home') {
    let page = initialPage;
    const listeners = new Set<() => void>();
    const persisted: TourProgress[] = [];

    const adapters: TourAdapters = {
        navigate: vi.fn(),
        onNavigated: (callback) => {
            listeners.add(callback);

            return () => listeners.delete(callback);
        },
        currentPageKey: () => page,
        persist: vi.fn((progress: TourProgress) => {
            persisted.push(progress);
        }),
        onCompleted: vi.fn(),
        onSkipped: vi.fn(),
    };

    return {
        adapters,
        persisted,
        listenerCount: () => listeners.size,
        /** The router finished a visit; `to` is the page now rendered. */
        completeNavigation: async (to?: string) => {
            if (to) {
                page = to;
            }

            await act(async () => {
                listeners.forEach((listener) => listener());
            });
        },
    };
}

const tour: TourDefinition = {
    key: 'welcome',
    steps: [
        { id: 'intro', title: 'Intro', description: 'Start here.' },
        {
            id: 'menu',
            anchor: 'nav.inbox',
            page: 'home',
            href: '/',
            title: 'Menu',
            description: 'The menu.',
        },
        {
            id: 'inbox',
            anchor: 'inbox.list',
            page: 'inbox',
            href: '/inbox',
            title: 'Inbox',
            description: 'The inbox.',
        },
    ],
};

function setup(
    options: {
        tours?: TourDefinition[];
        progress?: TourProgress[];
        page?: string;
        driverOptions?: TourDriverOptions;
        anchorTimeout?: number;
    } = {},
) {
    const host = createHost(options.page);
    const wrapper = ({ children }: { children: ReactNode }) => (
        <TourProvider
            adapters={host.adapters}
            tours={options.tours ?? [tour]}
            progress={options.progress}
            driverOptions={options.driverOptions}
            anchorTimeout={options.anchorTimeout}
        >
            {children}
        </TourProvider>
    );
    const hook = renderHook(() => useTour(), { wrapper });

    return { host, ...hook };
}

const next = () => act(async () => state.handlers?.onNext(state.index));
const previous = () => act(async () => state.handlers?.onPrevious(state.index));
const close = () => act(async () => state.handlers?.onClose(state.index));

beforeEach(() => {
    fake.reset();
    vi.clearAllMocks();
});

describe('useTour', () => {
    it('throws outside a TourProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useTour())).toThrow(
            'useTour must be used within a TourProvider.',
        );
    });
});

describe('running a tour', () => {
    it('persists each step, then reports completion', async () => {
        const single: TourDefinition = {
            key: 'welcome',
            steps: tour.steps.slice(0, 2),
        };
        const { host, result } = setup({ tours: [single] });

        await act(async () => result.current.start('welcome'));

        expect(result.current.isActive).toBe(true);
        expect(result.current.activeTourKey).toBe('welcome');
        expect(result.current.activeStepIndex).toBe(0);
        // setSteps() resets driver.js, so it has to come before drive().
        expect(state.log).toEqual(['setSteps:2', 'drive:0']);

        await next();

        expect(result.current.activeStepIndex).toBe(1);

        await next();

        expect(host.persisted).toEqual([
            { tourKey: 'welcome', status: 'in_progress', stepIndex: 0 },
            { tourKey: 'welcome', status: 'in_progress', stepIndex: 1 },
            { tourKey: 'welcome', status: 'completed', stepIndex: 1 },
        ]);
        expect(host.adapters.onCompleted).toHaveBeenCalledWith('welcome');
        expect(host.adapters.onSkipped).not.toHaveBeenCalled();
        expect(result.current.isActive).toBe(false);
        expect(result.current.activeTourKey).toBeNull();
        expect(state.active).toBe(false);

        const persistOrder = vi.mocked(host.adapters.persist!).mock
            .invocationCallOrder;
        const completedOrder = vi.mocked(host.adapters.onCompleted!).mock
            .invocationCallOrder;

        expect(persistOrder.at(-1)!).toBeLessThan(completedOrder[0]);
    });

    it('reports a close mid-tour as skipped at the current step', async () => {
        const { host, result } = setup();

        await act(async () => result.current.start('welcome'));
        await next();
        await close();

        expect(host.persisted.at(-1)).toEqual({
            tourKey: 'welcome',
            status: 'skipped',
            stepIndex: 1,
        });
        expect(host.adapters.onSkipped).toHaveBeenCalledWith('welcome', 1);
        expect(host.adapters.onCompleted).not.toHaveBeenCalled();
        expect(result.current.isActive).toBe(false);
        expect(result.current.activeTourKey).toBeNull();
    });

    it('filters out disabled steps before the run', async () => {
        const gated: TourDefinition = {
            key: 'welcome',
            steps: [
                tour.steps[0],
                { ...tour.steps[1], enabled: false },
                { id: 'end', title: 'End', description: 'Done.' },
            ],
        };
        const { result } = setup({ tours: [gated] });

        await act(async () => result.current.start('welcome'));

        expect(state.steps.map((step) => step.id)).toEqual(['intro', 'end']);
    });

    it('ignores unknown tours and tours with no enabled steps', async () => {
        const empty: TourDefinition = {
            key: 'empty',
            steps: [{ ...tour.steps[0], enabled: false }],
        };
        const { host, result } = setup({ tours: [empty] });

        await act(async () => result.current.start('missing'));
        await act(async () => result.current.start('empty'));

        expect(state.driversCreated).toBe(0);
        expect(host.persisted).toEqual([]);
        expect(result.current.activeTourKey).toBeNull();
    });

    it('does not restart a tour that is already showing', async () => {
        const { result } = setup();

        await act(async () => result.current.start('welcome'));
        await act(async () => result.current.start('welcome'));
        await act(async () => result.current.start('welcome'));

        expect(state.log).toEqual(['setSteps:3', 'drive:0']);
    });

    it('resumes from the persisted step', async () => {
        const { result } = setup({
            progress: [
                { tourKey: 'welcome', status: 'in_progress', stepIndex: 1 },
            ],
        });

        await act(async () => result.current.resume('welcome'));

        expect(state.log).toContain('drive:1');
        expect(result.current.activeStepIndex).toBe(1);
    });

    it('resumes a completed tour from the beginning', async () => {
        const { result } = setup({
            progress: [
                { tourKey: 'welcome', status: 'completed', stepIndex: 2 },
            ],
        });

        await act(async () => result.current.resume('welcome'));

        expect(state.log).toContain('drive:0');
    });

    it('stop() keeps the position as in progress without skipping', async () => {
        const { host, result } = setup();

        await act(async () => result.current.start('welcome'));
        await next();
        await act(async () => result.current.stop());

        expect(host.persisted.at(-1)).toEqual({
            tourKey: 'welcome',
            status: 'in_progress',
            stepIndex: 1,
        });
        expect(host.adapters.onSkipped).not.toHaveBeenCalled();
        expect(result.current.isActive).toBe(false);
        expect(result.current.activeTourKey).toBeNull();
    });

    it('skips a step whose anchor never appears, in the travel direction', async () => {
        const { result } = setup({ page: 'inbox' });

        state.missingAnchors.add(anchorSelector('inbox.list'));

        // Forwards from the last reachable step: runs off the end.
        await act(async () => result.current.start('welcome', 2));

        expect(state.log).not.toContain('drive:2');
        expect(result.current.activeTourKey).toBeNull();
    });

    it('skips backwards over an unreachable anchor', async () => {
        const local: TourDefinition = {
            key: 'welcome',
            steps: [
                { id: 'a', title: 'A', description: 'A' },
                { id: 'b', anchor: 'gone', title: 'B', description: 'B' },
                { id: 'c', title: 'C', description: 'C' },
            ],
        };
        const { result } = setup({ tours: [local] });

        state.missingAnchors.add(anchorSelector('gone'));

        await act(async () => result.current.start('welcome', 2));
        await previous();

        expect(state.log.at(-1)).toBe('drive:0');
        expect(result.current.activeStepIndex).toBe(0);
    });
});

describe('steps on another page', () => {
    it('navigates, then resumes on the pending step', async () => {
        const { host, result } = setup();

        await act(async () => result.current.start('welcome', 1));
        await next();

        // Torn down while the host navigates.
        expect(host.adapters.navigate).toHaveBeenCalledWith('/inbox');
        expect(state.active).toBe(false);
        expect(result.current.isActive).toBe(false);
        expect(result.current.activeTourKey).toBe('welcome');
        expect(result.current.activeStepIndex).toBe(2);
        expect(host.persisted.at(-1)).toEqual({
            tourKey: 'welcome',
            status: 'in_progress',
            stepIndex: 2,
        });
        expect(state.log).not.toContain('drive:2');

        await host.completeNavigation('inbox');

        expect(state.log.at(-1)).toBe('drive:2');
        expect(result.current.isActive).toBe(true);
        expect(host.adapters.navigate).toHaveBeenCalledTimes(1);
    });

    it('resumes even when the page key still reports the old page', async () => {
        const { host, result } = setup();

        await act(async () => result.current.start('welcome', 1));
        await next();
        // The router announces the visit before React renders the new page.
        await host.completeNavigation();

        expect(state.log.at(-1)).toBe('drive:2');
        expect(host.adapters.navigate).toHaveBeenCalledTimes(1);
    });

    it('goes backwards across a page the same way', async () => {
        const { host, result } = setup({ page: 'inbox' });

        await act(async () => result.current.start('welcome', 2));
        await previous();

        expect(host.adapters.navigate).toHaveBeenCalledWith('/');
        expect(result.current.activeStepIndex).toBe(1);

        await host.completeNavigation('home');

        expect(state.log.at(-1)).toBe('drive:1');
    });

    it('keeps travelling backwards when the resumed anchor is missing', async () => {
        const { host, result } = setup({ page: 'inbox' });

        state.missingAnchors.add(anchorSelector('nav.inbox'));

        await act(async () => result.current.start('welcome', 2));
        await previous();
        await host.completeNavigation('home');

        expect(state.log.at(-1)).toBe('drive:0');
    });

    it('pauses when the user navigates away on their own', async () => {
        const { host, result } = setup();

        await act(async () => result.current.start('welcome'));
        await host.completeNavigation('elsewhere');

        expect(state.active).toBe(false);
        expect(result.current.isActive).toBe(false);
        expect(host.adapters.onSkipped).not.toHaveBeenCalled();
        expect(host.persisted.at(-1)?.status).toBe('in_progress');
    });

    it('unsubscribes from navigation on unmount', () => {
        const { host, unmount } = setup();

        expect(host.listenerCount()).toBe(1);

        unmount();

        expect(host.listenerCount()).toBe(0);
    });
});

describe('step preparers', () => {
    it('are awaited before the step is highlighted', async () => {
        const { result } = setup();
        let release: () => void = () => {};
        const prepared: string[] = [];

        act(() => {
            result.current.registerStepPreparer(async (step) => {
                prepared.push(step.id);
                await new Promise<void>((resolve) => {
                    release = resolve;
                });
            });
        });

        await act(async () => result.current.start('welcome'));

        expect(prepared).toEqual(['intro']);
        expect(state.log).toEqual([]);

        await act(async () => release());

        expect(state.log).toEqual(['setSteps:3', 'drive:0']);
    });

    it('stop running once unregistered', async () => {
        const { result } = setup();
        const preparer = vi.fn();
        let unregister: () => void = () => {};

        act(() => {
            unregister = result.current.registerStepPreparer(preparer);
        });

        await act(async () => result.current.start('welcome'));

        expect(preparer).toHaveBeenCalledTimes(1);

        act(() => unregister());
        await next();

        expect(preparer).toHaveBeenCalledTimes(1);
    });
});

describe('spotlight', () => {
    it('highlights a single anchor outside of any tour', async () => {
        const { host, result } = setup();

        await act(async () =>
            result.current.spotlight({
                anchor: 'nav.inbox',
                title: 'Here',
                description: 'Look.',
            }),
        );

        expect(state.spotlighted).toMatchObject({
            id: 'spotlight',
            anchor: 'nav.inbox',
        });
        expect(result.current.isActive).toBe(true);
        expect(result.current.activeTourKey).toBeNull();

        // Closing it records nothing: there is no tour to report on.
        await close();

        expect(host.persisted).toEqual([]);
        expect(host.adapters.onSkipped).not.toHaveBeenCalled();
        expect(result.current.isActive).toBe(false);
    });

    it('does nothing when the anchor is missing', async () => {
        const { result } = setup();

        state.missingAnchors.add(anchorSelector('nowhere'));

        await act(async () =>
            result.current.spotlight({
                anchor: 'nowhere',
                title: 'Here',
                description: 'Look.',
            }),
        );

        expect(state.spotlighted).toBeNull();
        expect(result.current.isActive).toBe(false);
    });

    it('does not interrupt a running tour', async () => {
        const { result } = setup();

        await act(async () => result.current.start('welcome'));
        await act(async () =>
            result.current.spotlight({ title: 'Here', description: 'Look.' }),
        );

        expect(state.spotlighted).toBeNull();
    });
});

describe('options', () => {
    it('passes driverOptions to the driver and anchorTimeout to the anchor wait', async () => {
        const driverOptions = { popoverClass: 'brand', stageRadius: 10 };
        const { result } = setup({ driverOptions, anchorTimeout: 150 });

        await act(async () => result.current.start('welcome', 1));

        expect(state.driverOptions).toBe(driverOptions);
        expect(state.anchorTimeouts).toEqual([150]);
    });

    it('falls back to the default anchor timeout', async () => {
        const { result } = setup();

        await act(async () => result.current.start('welcome', 1));

        expect(state.anchorTimeouts).toEqual([2000]);
    });
});

describe('TourHints', () => {
    const hints = [
        { id: 'inbox', anchor: 'nav.inbox', title: 'Inbox', description: '' },
    ];

    function renderHints(props: Partial<Parameters<typeof TourHints>[0]> = {}) {
        const host = createHost();
        let tourApi: ReturnType<typeof useTour> | null = null;

        function Capture() {
            tourApi = useTour();

            return null;
        }

        render(
            <TourProvider
                adapters={host.adapters}
                tours={[tour]}
                driverOptions={{ popoverClass: 'brand' }}
            >
                <Capture />
                <TourHints hints={hints} {...props} />
            </TourProvider>,
        );

        return { host, tour: () => tourApi! };
    }

    it('shows hints and inherits the provider popover class', () => {
        renderHints();

        expect(state.hints).toEqual(hints);
        expect(state.hintsVisible).toBe(true);
        expect(state.hintOptions).toEqual({ popoverClass: 'brand' });
    });

    it('lets its own options win over the provider', () => {
        renderHints({ options: { popoverClass: 'hint', popoverOffset: 4 } });

        expect(state.hintOptions).toEqual({
            popoverClass: 'hint',
            popoverOffset: 4,
        });
    });

    it('hides while a tour runs and returns afterwards', async () => {
        const { tour: api } = renderHints();

        await act(async () => api().start('welcome'));

        expect(state.hintsVisible).toBe(false);

        await close();

        expect(state.hintsVisible).toBe(true);
    });

    it('reports dismissals to the latest callback', () => {
        const onDismiss = vi.fn();

        renderHints({ onDismiss });
        state.dismissHint?.('inbox');

        expect(onDismiss).toHaveBeenCalledWith('inbox');
    });

    it('stays hidden with no hints', () => {
        renderHints({ hints: [] });

        expect(state.hintsVisible).toBe(false);
    });
});
