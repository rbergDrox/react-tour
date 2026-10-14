import { vi } from 'vitest';
import type {
    HintLayerHandle,
    TourDriverHandle,
    TourDriverHandlers,
} from '../src/driver-client';
import type {
    TourDriverOptions,
    TourHint,
    TourHintOptions,
    TourStep,
} from '../src/types';

/**
 * Stand-in for `driver-client`, the seam the tour layer was designed around.
 * It keeps just enough state to behave like driver.js from the controller's
 * point of view and records everything it is asked to do.
 */
export function createFakeDriverClient() {
    const state = {
        log: [] as string[],
        active: false,
        index: 0,
        steps: [] as TourStep[],
        handlers: null as TourDriverHandlers | null,
        driverOptions: undefined as TourDriverOptions | undefined,
        driversCreated: 0,
        spotlighted: null as TourStep | null,
        missingAnchors: new Set<string>(),
        anchorTimeouts: [] as Array<number | undefined>,
        hints: [] as TourHint[],
        hintOptions: undefined as TourHintOptions | undefined,
        hintsVisible: false,
        dismissHint: null as ((hintId: string) => void) | null,
    };

    const reset = (): void => {
        state.log = [];
        state.active = false;
        state.index = 0;
        state.steps = [];
        state.handlers = null;
        state.driverOptions = undefined;
        state.driversCreated = 0;
        state.spotlighted = null;
        state.missingAnchors = new Set();
        state.anchorTimeouts = [];
        state.hints = [];
        state.hintOptions = undefined;
        state.hintsVisible = false;
        state.dismissHint = null;
    };

    const module = {
        DEFAULT_POPOVER_CLASS: 'react-tour',
        DEFAULT_ANCHOR_TIMEOUT: 2000,
        waitForAnchor: vi.fn(async (selector: string, timeout?: number) => {
            state.anchorTimeouts.push(timeout);

            return state.missingAnchors.has(selector)
                ? null
                : document.createElement('div');
        }),
        createTourDriver: vi.fn(
            (
                handlers: TourDriverHandlers,
                options?: TourDriverOptions,
            ): TourDriverHandle => {
                state.handlers = handlers;
                state.driverOptions = options;
                state.driversCreated += 1;

                return {
                    setSteps: (steps) => {
                        state.log.push(`setSteps:${steps.length}`);
                        state.steps = steps;
                        state.active = false;
                    },
                    drive: (index) => {
                        state.log.push(`drive:${index}`);
                        state.index = index;
                        state.active = true;
                    },
                    spotlight: (step) => {
                        state.log.push('spotlight');
                        state.spotlighted = step;
                        state.active = true;
                    },
                    getActiveIndex: () => state.index,
                    isActive: () => state.active,
                    refresh: () => {},
                    destroy: () => {
                        state.log.push('destroy');
                        state.active = false;
                    },
                };
            },
        ),
        createHintLayer: vi.fn(
            (
                onDismiss: (hintId: string) => void,
                options?: TourHintOptions,
            ): HintLayerHandle => {
                state.dismissHint = onDismiss;
                state.hintOptions = options;

                return {
                    setHints: (hints) => {
                        state.hints = hints;
                    },
                    show: () => {
                        state.hintsVisible = true;
                    },
                    hide: () => {
                        state.hintsVisible = false;
                    },
                    refresh: () => {},
                };
            },
        ),
    };

    return { state, reset, module };
}
