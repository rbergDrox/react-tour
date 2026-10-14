import { Link, router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { TourAnchor, TourHints, TourProvider } from '@shapperize/react-tour';
import type {
    TourDefinition,
    TourHint,
    TourProgress,
} from '@shapperize/react-tour';
import {
    createInertiaAdapters,
    postInBackground,
} from '@shapperize/react-tour/inertia';

export type SharedProps = {
    onboarding: { tours: TourProgress[]; dismissedHints: string[] };
};

const tours: TourDefinition[] = [
    {
        key: 'welcome',
        steps: [
            {
                id: 'intro',
                title: 'A tour across Inertia pages',
                description:
                    'Step pages are Inertia component names, compared with the page currently rendered.',
            },
            {
                id: 'nav-inbox',
                anchor: 'nav.inbox',
                title: 'Anchors by id',
                description: 'This link is marked with a TourAnchor.',
                side: 'bottom',
            },
            {
                id: 'inbox-list',
                anchor: 'inbox.list',
                page: 'Inbox',
                href: '/inbox',
                title: 'After an Inertia visit',
                description:
                    'Progress was posted in the background, so the tour did not interrupt itself.',
                side: 'top',
            },
        ],
    },
];

const allHints: TourHint[] = [
    {
        id: 'home-link',
        anchor: 'nav.home',
        title: 'A hint',
        description: 'Dismissal is stored by the server.',
        side: 'bottom',
    },
];

/**
 * A persistent layout: Inertia keeps it mounted between visits, which is what
 * lets a tour survive the navigation between the pages its steps live on.
 */
export function Layout({ children }: { children: ReactNode }) {
    const { component, props } = usePage<SharedProps>();

    // Adapters must be referentially stable, so they are rebuilt only when
    // the page component changes.
    const adapters = useMemo(
        () =>
            createInertiaAdapters({
                router,
                page: { component },
                // A URL, not a router visit: see the README's persistence note.
                persist: '/tour-progress',
            }),
        [component],
    );

    const hints = useMemo(
        () =>
            allHints.filter(
                (hint) => !props.onboarding.dismissedHints.includes(hint.id),
            ),
        [props.onboarding.dismissedHints],
    );

    return (
        <TourProvider
            adapters={adapters}
            tours={tours}
            progress={props.onboarding.tours}
        >
            <nav className="nav">
                <TourAnchor id="nav.home">
                    <Link href="/">Home</Link>
                </TourAnchor>
                <TourAnchor id="nav.inbox">
                    <Link href="/inbox">Inbox</Link>
                </TourAnchor>
            </nav>
            <main className="content">{children}</main>
            <TourHints
                hints={hints}
                onDismiss={(hintId) =>
                    postInBackground('/hints/dismiss', { hint_id: hintId })
                }
            />
        </TourProvider>
    );
}
