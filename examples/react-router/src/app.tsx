import { useEffect, useMemo, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router';
import {
    TourAnchor,
    TourHints,
    TourProvider,
    useTour,
} from '@shapperize/react-tour';
import { useTourStorage } from './storage';
import { useReactRouterAdapters } from './tour-adapters';
import { hints as allHints, welcomeTour } from './tours';

const tours = [welcomeTour];

export function App() {
    const storage = useTourStorage();
    const [notice, setNotice] = useState('');
    const adapters = useReactRouterAdapters({
        persist: storage.persist,
        onCompleted: () => setNotice('Tour completed.'),
        onSkipped: (_tourKey, stepIndex) =>
            setNotice(`Tour paused at step ${stepIndex + 1}.`),
    });

    const hints = useMemo(
        () =>
            allHints.filter(
                (hint) => !storage.dismissedHints.includes(hint.id),
            ),
        [storage.dismissedHints],
    );

    return (
        <TourProvider
            adapters={adapters}
            tours={tours}
            progress={storage.tours}
        >
            <Shell
                notice={notice}
                status={
                    storage.tours.find((item) => item.tourKey === 'welcome')
                        ?.status ?? 'not_started'
                }
                onReset={() => {
                    storage.reset();
                    setNotice('');
                }}
            />
            <TourHints hints={hints} onDismiss={storage.dismissHint} />
        </TourProvider>
    );
}

function Shell({
    notice,
    status,
    onReset,
}: {
    notice: string;
    status: string;
    onReset: () => void;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { registerStepPreparer } = useTour();

    // The tour layer knows nothing about this sidebar. A preparer reveals it
    // before any step that points inside it.
    useEffect(
        () =>
            registerStepPreparer((step) => {
                if (step.anchor?.startsWith('nav.')) {
                    setSidebarOpen(true);
                }
            }),
        [registerStepPreparer],
    );

    return (
        <div className="shell">
            <header className="topbar">
                <button
                    type="button"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-expanded={sidebarOpen}
                >
                    {sidebarOpen ? 'Hide menu' : 'Show menu'}
                </button>
                <span className="status" data-testid="tour-status">
                    {status}
                </span>
            </header>

            {sidebarOpen && (
                <nav className="sidebar" aria-label="Main">
                    <NavLink to="/" end>
                        Home
                    </NavLink>
                    <TourAnchor id="nav.inbox">
                        <NavLink to="/inbox">Inbox</NavLink>
                    </TourAnchor>
                    <TourAnchor id="nav.settings">
                        <NavLink to="/settings">Settings</NavLink>
                    </TourAnchor>
                </nav>
            )}

            <main className="content">
                {notice && (
                    <p className="notice" role="status">
                        {notice}
                    </p>
                )}
                <Routes>
                    <Route path="/" element={<Home onReset={onReset} />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>
        </div>
    );
}

function Home({ onReset }: { onReset: () => void }) {
    const { start, resume, spotlight, isActive } = useTour();

    return (
        <section>
            <h1>Home</h1>
            <p>
                Start the tour, then use its buttons to move across pages. Close
                it part-way and Resume picks up where you left off.
            </p>
            <div className="actions">
                <button
                    type="button"
                    className="primary"
                    disabled={isActive}
                    onClick={() => start('welcome')}
                >
                    Take the tour
                </button>
                <button type="button" onClick={() => resume('welcome')}>
                    Resume
                </button>
                <button
                    type="button"
                    onClick={() =>
                        spotlight({
                            anchor: 'home.reset',
                            title: 'A one-off spotlight',
                            description:
                                'Highlights a single anchor outside of any tour.',
                        })
                    }
                >
                    Spotlight
                </button>
                <TourAnchor id="home.reset">
                    <button type="button" onClick={onReset}>
                        Reset progress
                    </button>
                </TourAnchor>
            </div>
        </section>
    );
}

function Inbox() {
    return (
        <section>
            <h1>Inbox</h1>
            <TourAnchor id="inbox.list">
                <ul className="list">
                    <li>Request from Alex</li>
                    <li>Request from Sam</li>
                    <li>Request from Jordan</li>
                </ul>
            </TourAnchor>
        </section>
    );
}

function Settings() {
    return (
        <section>
            <h1>Settings</h1>
            <TourAnchor id="settings.notifications">
                <label className="field">
                    <input type="checkbox" defaultChecked /> Email notifications
                </label>
            </TourAnchor>
        </section>
    );
}
