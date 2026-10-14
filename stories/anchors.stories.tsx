import type { Meta, StoryObj } from '@storybook/react-vite';
import { TourAnchor, TourProvider, useTour } from '../src';
import type { TourDefinition } from '../src';
import { Demo, useDemoHost } from './demo-host';

const meta: Meta = {
    title: 'Anchors',
};

export default meta;

/** Destructures a fixed set of props, so anything extra is dropped. */
function ClosedComponent({ label }: { label: string }) {
    return (
        <div className="demo-card">
            <h2>{label}</h2>
            <p>Does not forward unknown props.</p>
        </div>
    );
}

const tour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'merged',
            anchor: 'anchor.merged',
            title: 'Merged onto the child',
            description: 'No extra element: data-tour sits on the card itself.',
            side: 'bottom',
        },
        {
            id: 'wrapped',
            anchor: 'anchor.wrapped',
            title: 'Wrapped',
            description:
                'asChild={false} adds a div, for components that would drop the attribute.',
            side: 'bottom',
        },
    ],
};

function Start() {
    const { start, isActive } = useTour();

    return (
        <div className="demo-row">
            <button
                type="button"
                className="primary"
                disabled={isActive}
                onClick={() => start('demo')}
            >
                Take the tour
            </button>
        </div>
    );
}

/**
 * `TourAnchor` merges `data-tour` onto its child by default. Components that
 * do not forward unknown props need `asChild={false}` — inspect the DOM to see
 * the difference.
 */
export const AsChild: StoryObj = {
    name: 'asChild and the wrapper',
    render: function Render() {
        const host = useDemoHost();

        return (
            <TourProvider adapters={host.adapters} tours={[tour]}>
                <Demo title="Anchors">
                    <p>
                        An anchor whose attribute never reaches the DOM makes
                        its step skip silently, so{' '}
                        <span className="demo-code">TourAnchor</span> warns in
                        the console during development when that happens.
                    </p>
                    <Start />
                    <div className="demo-grid">
                        <TourAnchor id="anchor.merged">
                            <div className="demo-card">
                                <h2>Plain element</h2>
                                <p>Attribute merged directly.</p>
                            </div>
                        </TourAnchor>
                        <TourAnchor id="anchor.wrapped" asChild={false}>
                            <ClosedComponent label="Closed component" />
                        </TourAnchor>
                    </div>
                </Demo>
            </TourProvider>
        );
    },
};
