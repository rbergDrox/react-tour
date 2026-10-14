import type { ReactNode } from 'react';
import { TourAnchor } from '@shapperize/react-tour';
import { Layout } from '../layout';

export default function Inbox() {
    return (
        <section>
            <h1>Inbox</h1>
            <TourAnchor id="inbox.list">
                <ul className="list">
                    <li>Request from Alex</li>
                    <li>Request from Sam</li>
                </ul>
            </TourAnchor>
        </section>
    );
}

Inbox.layout = (page: ReactNode) => <Layout>{page}</Layout>;
