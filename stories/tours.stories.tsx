import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { TourAnchor, TourProvider, useTour } from '../src';
import type { TourDefinition } from '../src';
import { AdapterLog, Demo, useDemoHost } from './demo-host';

const meta: Meta = {
    title: 'Tours',
};

export default meta;

type Story = StoryObj;

function StartButton({ tourKey = 'demo' }: { tourKey?: string }) {
    const { start, isActive } = useTour();

    return (
        <button
            type="button"
            className="primary"
            disabled={isActive}
            onClick={() => start(tourKey)}
        >
            Take the tour
        </button>
    );
}

const basicTour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'intro',
            title: 'A step with no anchor',
            description: 'It is centered on the screen.',
        },
        {
            id: 'capture',
            anchor: 'card.capture',
            title: 'Anchored by id',
            description:
                'The step names "card.capture"; the card is wrapped in a TourAnchor with that id.',
            side: 'right',
        },
        {
            id: 'gated',
            anchor: 'card.gated',
            title: 'Never shown',
            description: 'This step is flagged enabled: false.',
            enabled: false,
        },
        {
            id: 'route',
            anchor: 'card.route',
            title: 'The page stays usable',
            description:
                'Click the button inside this card while the tour is open.',
            side: 'bottom',
        },
    ],
};

/** One page, three live steps and one that is filtered out. */
export const Basic: Story = {
    render: function Render() {
        const host = useDemoHost();
        const [clicks, setClicks] = useState(0);

        return (
            <TourProvider adapters={host.adapters} tours={[basicTour]}>
                <Demo title="Basic tour">
                    <p>
                        Steps are data. A step flagged{' '}
                        <span className="demo-code">enabled: false</span> is
                        dropped before the tour runs, so the counter reads “of
                        3”.
                    </p>
                    <div className="demo-row">
                        <StartButton />
                    </div>
                    <div className="demo-grid">
                        <TourAnchor id="card.capture">
                            <div className="demo-card">
                                <h2>Capture</h2>
                                <p>First anchor.</p>
                            </div>
                        </TourAnchor>
                        <TourAnchor id="card.route">
                            <div className="demo-card">
                                <h2>Route</h2>
                                <button
                                    type="button"
                                    onClick={() => setClicks(clicks + 1)}
                                >
                                    Clicked {clicks} times
                                </button>
                            </div>
                        </TourAnchor>
                    </div>
                    <AdapterLog lines={host.log} />
                </Demo>
            </TourProvider>
        );
    },
};

const crossPageTour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'home',
            anchor: 'home.card',
            page: 'home',
            href: 'home',
            title: 'Starts on Home',
            description: 'Next takes the tour to another page.',
            side: 'bottom',
        },
        {
            id: 'inbox',
            anchor: 'inbox.card',
            page: 'inbox',
            href: 'inbox',
            title: 'Now on Inbox',
            description:
                'The tour tore itself down, asked the host to navigate, and resumed once this card was laid out. Back works the same way.',
            side: 'bottom',
        },
        {
            id: 'settings',
            anchor: 'settings.card',
            page: 'settings',
            href: 'settings',
            title: 'And Settings',
            description: 'Done completes the tour.',
            side: 'bottom',
        },
    ],
};

/**
 * Driver.js only knows about one page. The controller parks the step, asks the
 * host to navigate, and resumes when the host reports the navigation finished.
 */
export const AcrossPages: Story = {
    name: 'Across pages',
    render: function Render() {
        const host = useDemoHost();
        const pages = ['home', 'inbox', 'settings'];

        return (
            <TourProvider adapters={host.adapters} tours={[crossPageTour]}>
                <Demo title="A tour that spans page navigations">
                    <p>
                        The tabs stand in for a router. Watch the adapter log:
                        the tour calls{' '}
                        <span className="demo-code">navigate()</span>, then
                        resumes when the host fires{' '}
                        <span className="demo-code">onNavigated</span>. Switch
                        tabs yourself mid-tour and it pauses instead.
                    </p>
                    <div className="demo-row">
                        <StartButton />
                    </div>
                    <div className="demo-tabs">
                        {pages.map((page) => (
                            <button
                                key={page}
                                type="button"
                                aria-current={
                                    host.page === page ? 'page' : undefined
                                }
                                onClick={() => host.setPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <TourAnchor id={`${host.page}.card`}>
                        <div className="demo-card">
                            <h2>{host.page}</h2>
                            <p>
                                Only this page’s anchor is in the DOM right now.
                            </p>
                        </div>
                    </TourAnchor>
                    <AdapterLog lines={host.log} />
                </Demo>
            </TourProvider>
        );
    },
};

const preparerTour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'intro',
            title: 'The panel below is collapsed',
            description: 'The next step points at something inside it.',
        },
        {
            id: 'inside',
            anchor: 'panel.setting',
            title: 'Revealed first',
            description:
                'A step preparer opened the panel before this was highlighted.',
            side: 'right',
        },
    ],
};

function CollapsiblePanel() {
    const [open, setOpen] = useState(false);
    const { registerStepPreparer } = useTour();

    // The tour layer does not know this panel exists. The panel registers a
    // preparer that opens it for any step anchored inside.
    useEffect(
        () =>
            registerStepPreparer((step) => {
                if (step.anchor?.startsWith('panel.')) {
                    setOpen(true);
                }
            }),
        [registerStepPreparer],
    );

    return (
        <div className="demo-card">
            <div className="demo-row" style={{ marginBottom: open ? '' : 0 }}>
                <h2 style={{ margin: 0 }}>Advanced</h2>
                <button type="button" onClick={() => setOpen(!open)}>
                    {open ? 'Collapse' : 'Expand'}
                </button>
            </div>
            {open && (
                <TourAnchor id="panel.setting">
                    <label>
                        <input type="checkbox" defaultChecked /> A setting
                        inside the panel
                    </label>
                </TourAnchor>
            )}
        </div>
    );
}

/**
 * Before a step is highlighted, registered preparers run — opening a sidebar,
 * switching a tab, expanding an accordion.
 */
export const StepPreparers: Story = {
    name: 'Step preparers',
    render: function Render() {
        const host = useDemoHost();

        return (
            <TourProvider adapters={host.adapters} tours={[preparerTour]}>
                <Demo title="Step preparers">
                    <p>
                        Collapse the panel, then start the tour. Preparers are
                        registered with{' '}
                        <span className="demo-code">
                            useTour().registerStepPreparer()
                        </span>{' '}
                        by the component that owns the hidden UI.
                    </p>
                    <div className="demo-row">
                        <StartButton />
                    </div>
                    <CollapsiblePanel />
                </Demo>
            </TourProvider>
        );
    },
};

function ResumeControls() {
    const { start, resume, stop, isActive, activeStepIndex } = useTour();

    return (
        <div className="demo-row">
            <button
                type="button"
                className="primary"
                disabled={isActive}
                onClick={() => start('demo')}
            >
                Start
            </button>
            <button type="button" onClick={() => resume('demo')}>
                Resume
            </button>
            <button type="button" disabled={!isActive} onClick={stop}>
                stop()
            </button>
            <span>
                {isActive ? `On step ${activeStepIndex + 1}` : 'Not running'}
            </span>
        </div>
    );
}

/**
 * Closing a tour reports `skipped` with the step it was on. `resume()` starts
 * again from the persisted position.
 */
export const Resume: Story = {
    render: function Render() {
        const host = useDemoHost();
        const saved = host.progress[0];

        return (
            <TourProvider
                adapters={host.adapters}
                tours={[crossPageTour]}
                progress={host.progress}
            >
                <Demo title="Persist and resume">
                    <p>
                        Start, go forward a step, close the popover, then
                        Resume. The host passes saved progress back through the{' '}
                        <span className="demo-code">progress</span> prop.
                    </p>
                    <ResumeControls />
                    <p>
                        Saved:{' '}
                        <span className="demo-code">
                            {saved
                                ? `${saved.status}, step ${saved.stepIndex}`
                                : 'nothing yet'}
                        </span>
                    </p>
                    <TourAnchor id={`${host.page}.card`}>
                        <div className="demo-card">
                            <h2>{host.page}</h2>
                            <p>Current page.</p>
                        </div>
                    </TourAnchor>
                    <AdapterLog lines={host.log} />
                </Demo>
            </TourProvider>
        );
    },
};
