import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { TourAdapters, TourProgress } from '../src';

/**
 * A host application in miniature: a "current page" held in state, a
 * navigation event derived from it, and persistence into component state.
 * Every adapter call is logged so a story can show what the tour asked for.
 */
export function useDemoHost(initialPage = 'home') {
    const [page, setPage] = useState(initialPage);
    const [progress, setProgress] = useState<TourProgress[]>([]);
    const [log, setLog] = useState<string[]>([]);
    const pageRef = useRef(page);
    const listeners = useRef(new Set<() => void>());

    // Runs after the new page has rendered, like a router's "finished" event.
    useEffect(() => {
        if (pageRef.current === page) {
            return;
        }

        pageRef.current = page;
        listeners.current.forEach((listener) => listener());
    }, [page]);

    const adapters = useMemo((): TourAdapters => {
        const record = (line: string) =>
            setLog((lines) => [...lines, line].slice(-40));

        return {
            navigate: (href) => {
                record(`navigate(${JSON.stringify(href)})`);
                setPage(href);
            },
            onNavigated: (callback) => {
                listeners.current.add(callback);

                return () => {
                    listeners.current.delete(callback);
                };
            },
            currentPageKey: () => pageRef.current,
            persist: (next) => {
                record(`persist(${next.status}, step ${next.stepIndex})`);
                setProgress((items) => [
                    ...items.filter((item) => item.tourKey !== next.tourKey),
                    next,
                ]);
            },
            onCompleted: (tourKey) => record(`onCompleted(${tourKey})`),
            onSkipped: (tourKey, stepIndex) =>
                record(`onSkipped(${tourKey}, ${stepIndex})`),
        };
    }, []);

    return { page, setPage, progress, log, adapters };
}

export function AdapterLog({ lines }: { lines: string[] }) {
    return <pre className="demo-log">{lines.join('\n')}</pre>;
}

export function Demo({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="demo">
            <h1>{title}</h1>
            {children}
        </div>
    );
}
