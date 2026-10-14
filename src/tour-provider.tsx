import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import type {
    TourAdapters,
    TourContextValue,
    TourDefinition,
    TourDriverOptions,
    TourProgress,
} from './types';
import { useTourController } from './use-tour-controller';

const TourContext = createContext<TourContextValue | null>(null);

/**
 * Carries the provider's driver options to `TourHints`, which owns a separate
 * driver.js layer. Kept off the public context so `useTour()` stays about
 * controlling tours.
 */
export const TourOptionsContext = createContext<TourDriverOptions | undefined>(
    undefined,
);

export type TourProviderProps = {
    /** Must be referentially stable — memoize it in the host application. */
    adapters: TourAdapters;
    tours: TourDefinition[];
    progress?: TourProgress[];
    /**
     * Passed to driver.js. The hooks the controller relies on to carry a step
     * across a navigation are excluded from the type and cannot be replaced.
     */
    driverOptions?: TourDriverOptions;
    /** How long to wait for a step's anchor to be laid out, in milliseconds. */
    anchorTimeout?: number;
    children: ReactNode;
};

export function TourProvider({
    adapters,
    tours,
    progress,
    driverOptions,
    anchorTimeout,
    children,
}: TourProviderProps) {
    const value = useTourController(tours, adapters, progress, {
        driverOptions,
        anchorTimeout,
    });

    return (
        <TourContext.Provider value={value}>
            <TourOptionsContext.Provider value={driverOptions}>
                {children}
            </TourOptionsContext.Provider>
        </TourContext.Provider>
    );
}

export function useTour(): TourContextValue {
    const context = useContext(TourContext);

    if (context === null) {
        throw new Error('useTour must be used within a TourProvider.');
    }

    return context;
}
