import { useContext, useEffect, useMemo, useRef } from 'react';
import { createHintLayer } from './driver-client';
import type { HintLayerHandle } from './driver-client';
import { TourOptionsContext, useTour } from './tour-provider';
import type { TourHint, TourHintOptions, TourLabels } from './types';

export type TourHintsProps = {
    hints: TourHint[];
    onDismiss?: (hintId: string) => void;
    dismissLabel?: string;
    /**
     * Passed to driver.js's hint layer when it is created; later changes are
     * ignored. `popoverClass` falls back to the provider's, so hints and tours
     * share one theme by default.
     */
    options?: TourHintOptions;
};

/**
 * Renders driver.js hint beacons for the anchors currently on screen.
 *
 * Beacons are suppressed while a tour is running so the two do not compete for
 * attention, and restored once it ends.
 */
export function TourHints({
    hints,
    onDismiss,
    dismissLabel = 'Got it',
    options,
}: TourHintsProps) {
    const { isActive } = useTour();
    const driverOptions = useContext(TourOptionsContext);
    const layerRef = useRef<HintLayerHandle | null>(null);
    const onDismissRef = useRef(onDismiss);
    const optionsRef = useRef<TourHintOptions>({
        popoverClass: driverOptions?.popoverClass,
        ...options,
    });

    useEffect(() => {
        onDismissRef.current = onDismiss;
    }, [onDismiss]);

    const labels = useMemo(
        (): TourLabels => ({
            next: '',
            previous: '',
            done: '',
            progress: '',
            dismissHint: dismissLabel,
        }),
        [dismissLabel],
    );

    useEffect(() => {
        layerRef.current = createHintLayer((hintId) => {
            onDismissRef.current?.(hintId);
        }, optionsRef.current);

        return () => {
            layerRef.current?.hide();
            layerRef.current = null;
        };
    }, []);

    useEffect(() => {
        const layer = layerRef.current;

        if (!layer) {
            return;
        }

        if (isActive || hints.length === 0) {
            layer.hide();

            return;
        }

        layer.setHints(hints, labels);
        layer.show();
    }, [hints, isActive, labels]);

    return null;
}
