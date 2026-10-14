import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const driverJs = vi.hoisted(() => ({
    configs: [] as Array<Record<string, unknown>>,
    hintConfigs: [] as Array<Record<string, unknown>>,
    calls: [] as string[],
    active: false,
    activeIndex: 1 as number | undefined,
    hints: [] as Array<Record<string, unknown>>,
}));

vi.mock('driver.js', () => ({
    driver: (config: Record<string, unknown>) => {
        driverJs.configs.push(config);

        return {
            isActive: () => driverJs.active,
            getActiveIndex: () => driverJs.activeIndex,
            setSteps: (steps: unknown[]) => {
                driverJs.calls.push(`setSteps:${steps.length}`);
            },
            drive: (index: number) => {
                driverJs.calls.push(`drive:${index}`);
                driverJs.active = true;
            },
            highlight: () => {
                driverJs.calls.push('highlight');
            },
            refresh: () => {},
            destroy: () => {
                driverJs.calls.push('destroy');
                driverJs.active = false;
            },
        };
    },
}));

vi.mock('driver.js/hints', () => ({
    hints: (config: Record<string, unknown>) => {
        driverJs.hintConfigs.push(config);

        return {
            setHints: (hints: Array<Record<string, unknown>>) => {
                driverJs.hints = hints;
            },
            show: () => {},
            hide: () => {},
            refresh: () => {},
        };
    },
}));

const { createHintLayer, createTourDriver, waitForAnchor } =
    await import('../src/driver-client');

const labels = {
    next: 'Next',
    previous: 'Back',
    done: 'Done',
    progress: '{{current}} of {{total}}',
    dismissHint: 'Got it',
};

const steps = [
    { id: 'a', anchor: 'one', title: 'A', description: 'a' },
    { id: 'b', title: 'B', description: 'b' },
];

beforeEach(() => {
    driverJs.configs = [];
    driverJs.hintConfigs = [];
    driverJs.calls = [];
    driverJs.active = false;
    driverJs.activeIndex = 1;
    driverJs.hints = [];
});

describe('createTourDriver', () => {
    const handlers = () => ({
        onNext: vi.fn(),
        onPrevious: vi.fn(),
        onClose: vi.fn(),
    });

    it('applies neutral defaults', () => {
        createTourDriver(handlers());

        expect(driverJs.configs[0]).toMatchObject({
            popoverClass: 'react-tour',
            disableActiveInteraction: false,
            allowClose: true,
        });
    });

    it('lets host options override defaults but never the controller hooks', () => {
        const own = handlers();
        const hostHook = vi.fn();

        createTourDriver(own, {
            popoverClass: 'brand',
            overlayOpacity: 0.6,
            // Not allowed by the type; a host bypassing it must still lose.
            ...({
                onNextClick: hostHook,
                onPrevClick: hostHook,
                onDoneClick: hostHook,
                onDestroyStarted: hostHook,
            } as object),
        });

        const config = driverJs.configs[0] as Record<string, () => void>;

        expect(config.popoverClass).toBe('brand');
        expect(config.overlayOpacity).toBe(0.6);

        config.onNextClick();
        config.onDoneClick();
        config.onPrevClick();
        config.onDestroyStarted();

        expect(hostHook).not.toHaveBeenCalled();
        expect(own.onNext).toHaveBeenCalledTimes(2);
        expect(own.onNext).toHaveBeenCalledWith(1);
        expect(own.onPrevious).toHaveBeenCalledWith(1);
        expect(own.onClose).toHaveBeenCalledWith(1);
    });

    it('reports index 0 when driver.js has no active index', () => {
        const own = handlers();
        const handle = createTourDriver(own);

        driverJs.activeIndex = undefined;
        (driverJs.configs[0] as Record<string, () => void>).onNextClick();

        expect(own.onNext).toHaveBeenCalledWith(0);
        expect(handle.getActiveIndex()).toBe(0);
    });

    it('tears down an active run before setSteps resets driver.js', () => {
        const handle = createTourDriver(handlers());

        handle.setSteps(steps, labels);
        handle.drive(0);
        handle.setSteps(steps, labels);

        // Without the destroy, the first run's overlay is orphaned in the DOM.
        expect(driverJs.calls).toEqual([
            'setSteps:2',
            'drive:0',
            'destroy',
            'setSteps:2',
        ]);
    });

    it('does not destroy an idle driver on setSteps', () => {
        createTourDriver(handlers()).setSteps(steps, labels);

        expect(driverJs.calls).toEqual(['setSteps:2']);
    });
});

describe('createHintLayer', () => {
    it('maps hints onto anchors and applies the popover class', () => {
        const layer = createHintLayer(vi.fn(), { popoverClass: 'brand' });

        layer.setHints(
            [{ id: 'h', anchor: 'nav.inbox', title: 'T', description: 'D' }],
            labels,
        );

        expect(driverJs.hintConfigs[0].popoverClass).toBe('brand');
        expect(driverJs.hints[0]).toMatchObject({
            id: 'h',
            element: '[data-tour="nav.inbox"]',
            beacon: { side: 'top', align: 'end' },
            popover: { buttonText: 'Got it', popoverClass: 'brand' },
        });
    });

    it('defaults the popover class and reports dismissals by id', () => {
        const onDismiss = vi.fn();

        createHintLayer(onDismiss);

        const config = driverJs.hintConfigs[0] as {
            popoverClass: string;
            onDismiss: (element: Element, hint: { id?: string }) => void;
        };

        config.onDismiss(document.body, { id: 'h' });
        config.onDismiss(document.body, {});

        expect(config.popoverClass).toBe('react-tour');
        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledWith('h');
    });
});

describe('waitForAnchor', () => {
    let now = 0;
    let frames: FrameRequestCallback[] = [];

    /** Advances the clock, then runs the frame callbacks queued so far. */
    const frame = (elapsed: number): void => {
        now += elapsed;

        const queued = frames;

        frames = [];
        queued.forEach((callback) => callback(now));
    };

    const laidOut = (element: Element, width: number): void => {
        element.getBoundingClientRect = () => ({ width }) as DOMRect;
    };

    beforeEach(() => {
        now = 0;
        frames = [];
        vi.spyOn(performance, 'now').mockImplementation(() => now);
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            frames.push(cb);

            return frames.length;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resolves immediately for an element that is laid out', async () => {
        const element = document.createElement('div');

        element.setAttribute('data-tour', 'ready');
        laidOut(element, 120);
        document.body.append(element);

        await expect(waitForAnchor('[data-tour="ready"]')).resolves.toBe(
            element,
        );
        expect(frames).toHaveLength(0);
    });

    it('waits until the element exists and has a width', async () => {
        const resolved = vi.fn();

        void waitForAnchor('[data-tour="late"]').then(resolved);

        frame(16);
        await Promise.resolve();
        expect(resolved).not.toHaveBeenCalled();

        // Present, but not laid out yet.
        const element = document.createElement('div');

        element.setAttribute('data-tour', 'late');
        laidOut(element, 0);
        document.body.append(element);

        frame(16);
        await Promise.resolve();
        expect(resolved).not.toHaveBeenCalled();

        laidOut(element, 80);
        frame(16);
        await Promise.resolve();

        expect(resolved).toHaveBeenCalledWith(element);
    });

    it('resolves null once the timeout passes', async () => {
        const resolved = vi.fn();

        void waitForAnchor('[data-tour="never"]', 100).then(resolved);

        frame(99);
        await Promise.resolve();
        expect(resolved).not.toHaveBeenCalled();

        frame(1);
        await Promise.resolve();

        expect(resolved).toHaveBeenCalledWith(null);
        expect(frames).toHaveLength(0);
    });
});
