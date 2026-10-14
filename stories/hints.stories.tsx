import type { Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState } from 'react';
import { TourAnchor, TourHints, TourProvider, useTour } from '../src';
import type { TourDefinition, TourHint } from '../src';
import { Demo, useDemoHost } from './demo-host';

const meta: Meta = {
    title: 'Hints',
};

export default meta;

const allHints: TourHint[] = [
    {
        id: 'export',
        anchor: 'action.export',
        title: 'Export is new',
        description: 'Download everything as a CSV.',
        side: 'bottom',
    },
    {
        id: 'filters',
        anchor: 'action.filters',
        title: 'Saved filters',
        description: 'Pin the views you use most.',
        side: 'bottom',
        beaconSide: 'bottom',
        beaconAlign: 'start',
    },
];

const tour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'only',
            anchor: 'action.export',
            title: 'A tour is running',
            description: 'Beacons are hidden until it ends.',
            side: 'bottom',
        },
    ],
};

function Toolbar() {
    const { start, isActive } = useTour();

    return (
        <div className="demo-row">
            <TourAnchor id="action.export">
                <button type="button">Export</button>
            </TourAnchor>
            <TourAnchor id="action.filters">
                <button type="button">Filters</button>
            </TourAnchor>
            <button
                type="button"
                className="primary"
                disabled={isActive}
                onClick={() => start('demo')}
            >
                Start a tour
            </button>
        </div>
    );
}

/**
 * Persistent beacons. Dismissal is reported to the host, which decides what to
 * remember; here it filters the hint out of the list it passes back in.
 */
export const Beacons: StoryObj = {
    render: function Render() {
        const host = useDemoHost();
        const [dismissed, setDismissed] = useState<string[]>([]);
        const hints = useMemo(
            () => allHints.filter((hint) => !dismissed.includes(hint.id)),
            [dismissed],
        );

        return (
            <TourProvider adapters={host.adapters} tours={[tour]}>
                <Demo title="Hints">
                    <p>
                        Click a beacon, then “Got it”. Beacons hide while a tour
                        runs so the two never compete.
                    </p>
                    <Toolbar />
                    <div className="demo-row">
                        <span>
                            Dismissed:{' '}
                            <span className="demo-code">
                                {dismissed.join(', ') || 'none'}
                            </span>
                        </span>
                        <button type="button" onClick={() => setDismissed([])}>
                            Restore
                        </button>
                    </div>
                    <TourHints
                        hints={hints}
                        onDismiss={(hintId) =>
                            setDismissed((ids) => [...ids, hintId])
                        }
                    />
                </Demo>
            </TourProvider>
        );
    },
};
