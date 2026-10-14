import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { TourAdapters, TourProgress } from '@shapperize/react-tour';

/**
 * Binds the tour layer to React Router.
 *
 * React Router has no "navigation finished" event, so this derives one: an
 * effect keyed on the pathname runs after the new route has rendered, which is
 * exactly when a tour step waiting on that page can resume.
 */
export function useReactRouterAdapters(options: {
    persist: (progress: TourProgress) => void;
    onCompleted?: (tourKey: string) => void;
    onSkipped?: (tourKey: string, stepIndex: number) => void;
}): TourAdapters {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const listeners = useRef(new Set<() => void>());
    const pathnameRef = useRef(pathname);
    const optionsRef = useRef(options);

    useEffect(() => {
        optionsRef.current = options;
    }, [options]);

    useEffect(() => {
        if (pathnameRef.current === pathname) {
            return;
        }

        pathnameRef.current = pathname;
        listeners.current.forEach((listener) => listener());
    }, [pathname]);

    // Everything is read through refs, so the object keeps one identity for
    // the life of the app — which is what TourProvider asks for.
    return useMemo(
        (): TourAdapters => ({
            navigate: (href) => {
                void navigate(href);
            },
            onNavigated: (callback) => {
                listeners.current.add(callback);

                return () => {
                    listeners.current.delete(callback);
                };
            },
            currentPageKey: () => pathnameRef.current,
            persist: (progress) => optionsRef.current.persist(progress),
            onCompleted: (tourKey) => optionsRef.current.onCompleted?.(tourKey),
            onSkipped: (tourKey, stepIndex) =>
                optionsRef.current.onSkipped?.(tourKey, stepIndex),
        }),
        [navigate],
    );
}
