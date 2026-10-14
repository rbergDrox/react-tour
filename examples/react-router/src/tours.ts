import type { TourDefinition, TourHint } from '@shapperize/react-tour';

/** Tour content is plain data: anchor ids, pages and copy. */
export const welcomeTour: TourDefinition = {
    key: 'welcome',
    steps: [
        {
            id: 'intro',
            title: 'A tour across three pages',
            description:
                'No element is highlighted here: a step without an anchor is centered on the screen.',
        },
        {
            id: 'nav-inbox',
            anchor: 'nav.inbox',
            title: 'The sidebar opens itself',
            description:
                'A step preparer reveals the sidebar before this link is highlighted, even if you collapsed it.',
            side: 'right',
        },
        {
            id: 'inbox-list',
            anchor: 'inbox.list',
            page: '/inbox',
            href: '/inbox',
            title: 'Now on another page',
            description:
                'The tour navigated here, waited for this list to be laid out, then carried on.',
            side: 'top',
        },
        {
            id: 'settings-notifications',
            anchor: 'settings.notifications',
            page: '/settings',
            href: '/settings',
            title: 'And another',
            description:
                'Use Back to cross the page boundary in the other direction.',
            side: 'bottom',
        },
        {
            id: 'outro',
            page: '/',
            href: '/',
            title: 'Back where you started',
            description: 'Done marks the tour as completed.',
        },
    ],
};

export const hints: TourHint[] = [
    {
        id: 'settings-hint',
        anchor: 'nav.settings',
        title: 'A hint',
        description:
            'Hints are beacons that stay until dismissed. They hide while a tour runs.',
        side: 'right',
    },
];
