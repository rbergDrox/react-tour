import type { ReactNode } from 'react';
import { useTour } from '@shapperize/react-tour';
import { Layout } from '../layout';

export default function Home() {
    const { start, resume, isActive } = useTour();

    return (
        <section>
            <h1>Home</h1>
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
            </div>
        </section>
    );
}

Home.layout = (page: ReactNode) => <Layout>{page}</Layout>;
