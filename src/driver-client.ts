/**
 * The only module that imports driver.js.
 *
 * Everything else in the tour layer talks to these helpers, so swapping the
 * underlying library — or stubbing it in tests — is a single-file change.
 */
import { driver } from 'driver.js';
import type { Config, Driver, DriveStep } from 'driver.js';
import { hints as createHints } from 'driver.js/hints';
import type { DriverHint, Hints } from 'driver.js/hints';
import { anchorSelector } from './anchors';
import type {
    TourDriverOptions,
    TourHint,
    TourHintOptions,
    TourLabels,
    TourStep,
} from './types';

export const DEFAULT_POPOVER_CLASS = 'react-tour';

export const DEFAULT_ANCHOR_TIMEOUT = 2000;

const DEFAULT_DRIVER_OPTIONS: Config = {
    animate: true,
    smoothScroll: true,
    allowClose: true,
    allowKeyboardControl: true,
    // The page stays usable during a tour; steps ask people to actually do
    // the thing rather than watch a slideshow.
    disableActiveInteraction: false,
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: DEFAULT_POPOVER_CLASS,
};

/**
 * Resolves an anchor once it is both present and laid out. Client-side routers
 * commonly announce a completed navigation before React has painted the new
 * tree, so a step arriving from another page routinely queries a beat too
 * early.
 */
export function waitForAnchor(
    selector: string,
    timeout = DEFAULT_ANCHOR_TIMEOUT,
): Promise<Element | null> {
    return new Promise((resolve) => {
        const deadline = performance.now() + timeout;

        const poll = (): void => {
            const element = document.querySelector(selector);

            if (element && element.getBoundingClientRect().width > 0) {
                resolve(element);

                return;
            }

            if (performance.now() >= deadline) {
                resolve(null);

                return;
            }

            requestAnimationFrame(poll);
        };

        poll();
    });
}

function toDriveStep(
    step: TourStep,
    labels: TourLabels,
    isLast: boolean,
): DriveStep {
    return {
        element: step.anchor ? anchorSelector(step.anchor) : undefined,
        popover: {
            title: step.title,
            description: step.description,
            side: step.side,
            align: step.align,
            showProgress: true,
            progressText: labels.progress,
            nextBtnText: isLast ? labels.done : labels.next,
            prevBtnText: labels.previous,
            doneBtnText: labels.done,
        },
    };
}

export type TourDriverHandlers = {
    onNext: (index: number) => void;
    onPrevious: (index: number) => void;
    onClose: (index: number) => void;
};

export type TourDriverHandle = {
    setSteps: (steps: TourStep[], labels: TourLabels) => void;
    drive: (index: number) => void;
    spotlight: (step: TourStep, labels: TourLabels) => void;
    getActiveIndex: () => number;
    isActive: () => boolean;
    refresh: () => void;
    destroy: () => void;
};

export function createTourDriver(
    handlers: TourDriverHandlers,
    options: TourDriverOptions = {},
): TourDriverHandle {
    // Defining these hooks suppresses driver.js's own advance/teardown, which
    // is what lets the controller take a step across a page navigation. They
    // are applied last so host options can never replace them.
    const instance: Driver = driver({
        ...DEFAULT_DRIVER_OPTIONS,
        ...options,
        onNextClick: () => handlers.onNext(instance.getActiveIndex() ?? 0),
        onDoneClick: () => handlers.onNext(instance.getActiveIndex() ?? 0),
        onPrevClick: () => handlers.onPrevious(instance.getActiveIndex() ?? 0),
        onDestroyStarted: () =>
            handlers.onClose(instance.getActiveIndex() ?? 0),
    });

    return {
        setSteps: (steps, labels) => {
            // Driver.js resets its internal state in setSteps(). Tear down an
            // active run first so its overlay and popover are still reachable
            // and can be removed rather than being orphaned in the DOM.
            if (instance.isActive()) {
                instance.destroy();
            }

            instance.setSteps(
                steps.map((step, index) =>
                    toDriveStep(step, labels, index === steps.length - 1),
                ),
            );
        },
        drive: (index) => instance.drive(index),
        spotlight: (step, labels) => {
            instance.highlight(toDriveStep(step, labels, true));
        },
        getActiveIndex: () => instance.getActiveIndex() ?? 0,
        isActive: () => instance.isActive(),
        refresh: () => instance.refresh(),
        destroy: () => instance.destroy(),
    };
}

export type HintLayerHandle = {
    setHints: (hints: TourHint[], labels: TourLabels) => void;
    show: () => void;
    hide: () => void;
    refresh: () => void;
};

export function createHintLayer(
    onDismiss: (hintId: string) => void,
    options: TourHintOptions = {},
): HintLayerHandle {
    const popoverClass = options.popoverClass ?? DEFAULT_POPOVER_CLASS;

    const layer: Hints = createHints({
        ...options,
        popoverClass,
        hints: [],
        onDismiss: (_element, hint) => {
            if (hint.id) {
                onDismiss(String(hint.id));
            }
        },
    });

    return {
        setHints: (hints, labels) => {
            layer.setHints(
                hints.map((hint): DriverHint => ({
                    id: hint.id,
                    element: anchorSelector(hint.anchor),
                    beacon: {
                        side: hint.beaconSide ?? 'top',
                        align: hint.beaconAlign ?? 'end',
                    },
                    popover: {
                        title: hint.title,
                        description: hint.description,
                        side: hint.side,
                        align: hint.align,
                        showButton: true,
                        buttonText: labels.dismissHint,
                        popoverClass,
                    },
                })),
            );
        },
        show: () => layer.show(),
        hide: () => layer.hide(),
        refresh: () => layer.refresh(),
    };
}
