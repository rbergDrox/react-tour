import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { anchorSelector } from './anchors';
import {
    createTourDriver,
    DEFAULT_ANCHOR_TIMEOUT,
    waitForAnchor,
} from './driver-client';
import type { TourDriverHandle } from './driver-client';
import type {
    TourAdapters,
    TourContextValue,
    TourDefinition,
    TourDriverOptions,
    TourLabels,
    TourProgress,
    TourStep,
    TourStepPreparer,
} from './types';

const DEFAULT_LABELS: TourLabels = {
    next: 'Next',
    previous: 'Back',
    done: 'Done',
    progress: '{{current}} of {{total}}',
    dismissHint: 'Got it',
};

export type TourControllerOptions = {
    driverOptions?: TourDriverOptions;
    anchorTimeout?: number;
};

/**
 * Owns the driver.js instance and every transition between steps.
 *
 * driver.js only ever knows about one page at a time, so a step that lives
 * elsewhere is handled here: the tour tears down, the host navigates, and the
 * pending index is picked up again once the new page reports back.
 */
export function useTourController(
    tours: TourDefinition[],
    adapters: TourAdapters,
    progress: TourProgress[] = [],
    options: TourControllerOptions = {},
): TourContextValue {
    const [activeTourKey, setActiveTourKey] = useState<string | null>(null);
    const [activeStepIndex, setActiveStepIndex] = useState(0);
    const [isActive, setIsActive] = useState(false);

    const driverRef = useRef<TourDriverHandle | null>(null);
    const stepsRef = useRef<TourStep[]>([]);
    const tourKeyRef = useRef<string | null>(null);
    const pendingRef = useRef<{ index: number; direction: 1 | -1 } | null>(
        null,
    );
    const preparersRef = useRef<Set<TourStepPreparer>>(new Set());

    // driver.js hooks fire long after the render that created them, so they
    // read the latest implementation through refs rather than closing over it.
    const goToRef = useRef<
        (index: number, direction: 1 | -1, justNavigated?: boolean) => void
    >(() => {});
    const closeRef = useRef<(index: number) => void>(() => {});

    const labels = useMemo(
        (): TourLabels => ({ ...DEFAULT_LABELS, ...adapters.labels }),
        [adapters.labels],
    );

    const adaptersRef = useRef(adapters);
    const toursRef = useRef(tours);
    const progressRef = useRef(progress);
    const labelsRef = useRef(labels);
    const anchorTimeoutRef = useRef(
        options.anchorTimeout ?? DEFAULT_ANCHOR_TIMEOUT,
    );
    // Read once, when the driver is first created: driver.js takes its
    // configuration at construction.
    const driverOptionsRef = useRef(options.driverOptions);

    useEffect(() => {
        adaptersRef.current = adapters;
        toursRef.current = tours;
        progressRef.current = progress;
        labelsRef.current = labels;
        anchorTimeoutRef.current =
            options.anchorTimeout ?? DEFAULT_ANCHOR_TIMEOUT;
        driverOptionsRef.current = options.driverOptions;
    }, [
        adapters,
        tours,
        progress,
        labels,
        options.anchorTimeout,
        options.driverOptions,
    ]);

    const getDriver = useCallback((): TourDriverHandle => {
        driverRef.current ??= createTourDriver(
            {
                onNext: (index) => goToRef.current(index + 1, 1),
                onPrevious: (index) => goToRef.current(index - 1, -1),
                onClose: (index) => closeRef.current(index),
            },
            driverOptionsRef.current,
        );

        return driverRef.current;
    }, []);

    const clear = useCallback(() => {
        tourKeyRef.current = null;
        stepsRef.current = [];
        pendingRef.current = null;
        setActiveTourKey(null);
        setIsActive(false);
    }, []);

    const goTo = useCallback(
        async (
            index: number,
            direction: 1 | -1,
            justNavigated = false,
        ): Promise<void> => {
            const tourKey = tourKeyRef.current;
            const steps = stepsRef.current;

            if (tourKey === null || index < 0) {
                return;
            }

            if (index >= steps.length) {
                driverRef.current?.destroy();
                adaptersRef.current.persist?.({
                    tourKey,
                    status: 'completed',
                    stepIndex: steps.length - 1,
                });
                adaptersRef.current.onCompleted?.(tourKey);
                clear();

                return;
            }

            const step = steps[index];

            // The step lives on another page: park the index, let the host
            // navigate, and resume from the navigation callback below.
            //
            // `justNavigated` suppresses this check when we are the ones who
            // just navigated. Routers commonly announce a completed visit
            // before React has rendered the new page, so the host's page key
            // would still report the old page here and send us round again.
            if (
                !justNavigated &&
                step.page &&
                step.page !== adaptersRef.current.currentPageKey()
            ) {
                pendingRef.current = { index, direction };
                setActiveStepIndex(index);
                adaptersRef.current.persist?.({
                    tourKey,
                    status: 'in_progress',
                    stepIndex: index,
                });
                driverRef.current?.destroy();
                setIsActive(false);

                if (step.href) {
                    adaptersRef.current.navigate(step.href);
                }

                return;
            }

            for (const prepare of preparersRef.current) {
                await prepare(step);
            }

            if (step.anchor) {
                const element = await waitForAnchor(
                    anchorSelector(step.anchor),
                    anchorTimeoutRef.current,
                );

                // Unreachable anchor (hidden by a permission or plan gate that
                // the step data did not predict): keep going the same way.
                // Routed through the ref so this never captures a stale self.
                if (element === null) {
                    goToRef.current(index + direction, direction);

                    return;
                }
            }

            const instance = getDriver();

            // setSteps() resets driver.js internal state, so it has to come
            // before drive() or the active index is wiped.
            instance.setSteps(steps, labelsRef.current);
            instance.drive(index);

            setActiveStepIndex(index);
            setIsActive(true);
            adaptersRef.current.persist?.({
                tourKey,
                status: 'in_progress',
                stepIndex: index,
            });
        },
        [clear, getDriver],
    );

    const closeTour = useCallback(
        (index: number) => {
            const tourKey = tourKeyRef.current;

            driverRef.current?.destroy();
            setIsActive(false);

            // A spotlight outside of any tour has nothing to record.
            if (tourKey === null) {
                return;
            }

            adaptersRef.current.persist?.({
                tourKey,
                status: 'skipped',
                stepIndex: index,
            });
            adaptersRef.current.onSkipped?.(tourKey, index);
            clear();
        },
        [clear],
    );

    useEffect(() => {
        goToRef.current = (index, direction, justNavigated) => {
            void goTo(index, direction, justNavigated);
        };
        closeRef.current = closeTour;
    }, [goTo, closeTour]);

    const start = useCallback(
        (tourKey: string, atIndex = 0) => {
            if (driverRef.current?.isActive()) {
                return;
            }

            const definition = toursRef.current.find(
                (tour) => tour.key === tourKey,
            );

            if (!definition) {
                return;
            }

            const steps = definition.steps.filter(
                (step) => step.enabled !== false,
            );

            if (steps.length === 0) {
                return;
            }

            stepsRef.current = steps;
            tourKeyRef.current = tourKey;
            setActiveTourKey(tourKey);

            void goTo(Math.min(Math.max(atIndex, 0), steps.length - 1), 1);
        },
        [goTo],
    );

    const resume = useCallback(
        (tourKey: string) => {
            const saved = progressRef.current.find(
                (item) => item.tourKey === tourKey,
            );

            start(
                tourKey,
                saved && saved.status !== 'completed' ? saved.stepIndex : 0,
            );
        },
        [start],
    );

    const stop = useCallback(() => {
        const tourKey = tourKeyRef.current;

        driverRef.current?.destroy();

        if (tourKey !== null) {
            adaptersRef.current.persist?.({
                tourKey,
                status: 'in_progress',
                stepIndex: activeStepIndex,
            });
        }

        clear();
    }, [activeStepIndex, clear]);

    const spotlight = useCallback(
        (step: Omit<TourStep, 'id'>) => {
            // A running tour owns the driver instance; do not fight it.
            if (tourKeyRef.current !== null) {
                return;
            }

            void (async () => {
                if (step.anchor) {
                    const element = await waitForAnchor(
                        anchorSelector(step.anchor),
                        anchorTimeoutRef.current,
                    );

                    if (element === null) {
                        return;
                    }
                }

                getDriver().spotlight(
                    { id: 'spotlight', ...step },
                    labelsRef.current,
                );
                setIsActive(true);
            })();
        },
        [getDriver],
    );

    const registerStepPreparer = useCallback(
        (preparer: TourStepPreparer): (() => void) => {
            preparersRef.current.add(preparer);

            return () => {
                preparersRef.current.delete(preparer);
            };
        },
        [],
    );

    useEffect(() => {
        const unsubscribe = adapters.onNavigated(() => {
            const pending = pendingRef.current;

            if (pending) {
                pendingRef.current = null;
                void goTo(pending.index, pending.direction, true);

                return;
            }

            // Navigated away mid-tour without using the tour's own buttons.
            // Pause rather than fight the user; progress is already persisted.
            if (tourKeyRef.current !== null && driverRef.current?.isActive()) {
                driverRef.current.destroy();
                setIsActive(false);
            }
        });

        return unsubscribe;
    }, [adapters, goTo]);

    useEffect(
        () => () => {
            driverRef.current?.destroy();
            driverRef.current = null;
        },
        [],
    );

    return {
        start,
        resume,
        stop,
        spotlight,
        isActive,
        activeTourKey,
        activeStepIndex,
        registerStepPreparer,
    };
}
