import { useCallback, useState } from 'react';
import type { TourProgress } from '@shapperize/react-tour';

const STORAGE_KEY = 'react-tour-example';

/**
 * The shape a backend would return. Here it lives in localStorage; in a real
 * app `persist` would POST it instead.
 */
type Stored = { tours: TourProgress[]; dismissedHints: string[] };

function read(): Stored {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        return raw
            ? (JSON.parse(raw) as Stored)
            : { tours: [], dismissedHints: [] };
    } catch {
        return { tours: [], dismissedHints: [] };
    }
}

export function useTourStorage() {
    const [stored, setStored] = useState(read);

    const update = useCallback((change: (current: Stored) => Stored) => {
        setStored((current) => {
            const next = change(current);

            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

            return next;
        });
    }, []);

    const persist = useCallback(
        (progress: TourProgress) =>
            update((current) => ({
                ...current,
                tours: [
                    ...current.tours.filter(
                        (item) => item.tourKey !== progress.tourKey,
                    ),
                    progress,
                ],
            })),
        [update],
    );

    const dismissHint = useCallback(
        (hintId: string) =>
            update((current) => ({
                ...current,
                dismissedHints: [...current.dismissedHints, hintId],
            })),
        [update],
    );

    const reset = useCallback(
        () => update(() => ({ tours: [], dismissedHints: [] })),
        [update],
    );

    return { ...stored, persist, dismissHint, reset };
}
