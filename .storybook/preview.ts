import type { Preview } from '@storybook/react-vite';
import 'driver.js/dist/driver.css';
import 'driver.js/dist/hints.css';
import '../src/styles.css';
import '../stories/demo.css';

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        controls: { expanded: true },
        options: {
            storySort: {
                order: [
                    'Tours',
                    ['Basic', 'Across pages', 'Step preparers', 'Resume'],
                    'Hints',
                    'Spotlight',
                    'Anchors',
                    'Theming',
                ],
            },
        },
    },
};

export default preview;
