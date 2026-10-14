import type { Meta, StoryObj } from '@storybook/react-vite';
import { TourAnchor, TourProvider, useTour } from '../src';
import { Demo, useDemoHost } from './demo-host';

const meta: Meta = {
    title: 'Spotlight',
};

export default meta;

function Buttons() {
    const { spotlight } = useTour();

    return (
        <div className="demo-row">
            <button
                type="button"
                className="primary"
                onClick={() =>
                    spotlight({
                        anchor: 'billing.card',
                        title: 'Here it is',
                        description:
                            'A one-off highlight, with nothing persisted.',
                        side: 'right',
                    })
                }
            >
                Where is billing?
            </button>
        </div>
    );
}

/** `useTour().spotlight()` highlights a single anchor outside of any tour. */
export const OneOff: StoryObj = {
    name: 'One-off spotlight',
    render: function Render() {
        const host = useDemoHost();

        return (
            <TourProvider adapters={host.adapters} tours={[]}>
                <Demo title="Spotlight">
                    <p>
                        Useful for “show me where that is” links in help text or
                        empty states.
                    </p>
                    <Buttons />
                    <div className="demo-grid">
                        <div className="demo-card">
                            <h2>Profile</h2>
                            <p>Not this one.</p>
                        </div>
                        <TourAnchor id="billing.card">
                            <div className="demo-card">
                                <h2>Billing</h2>
                                <p>This one.</p>
                            </div>
                        </TourAnchor>
                    </div>
                </Demo>
            </TourProvider>
        );
    },
};
