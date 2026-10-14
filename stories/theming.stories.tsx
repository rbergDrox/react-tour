import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';
import { TourAnchor, TourHints, TourProvider, useTour } from '../src';
import type { TourDefinition, TourHint } from '../src';
import { Demo, useDemoHost } from './demo-host';

type ThemeArgs = {
    popoverBackground: string;
    popoverForeground: string;
    mutedForeground: string;
    border: string;
    primaryBackground: string;
    primaryForeground: string;
    radius: number;
    overlayColor: string;
    overlayOpacity: number;
    stagePadding: number;
    stageRadius: number;
    animate: boolean;
};

const meta: Meta<ThemeArgs> = {
    title: 'Theming',
    argTypes: {
        popoverBackground: { control: 'color', table: { category: 'CSS' } },
        popoverForeground: { control: 'color', table: { category: 'CSS' } },
        mutedForeground: { control: 'color', table: { category: 'CSS' } },
        border: { control: 'color', table: { category: 'CSS' } },
        primaryBackground: { control: 'color', table: { category: 'CSS' } },
        primaryForeground: { control: 'color', table: { category: 'CSS' } },
        radius: {
            control: { type: 'range', min: 0, max: 24, step: 1 },
            table: { category: 'CSS' },
        },
        overlayColor: {
            control: 'color',
            table: { category: 'driverOptions' },
        },
        overlayOpacity: {
            control: { type: 'range', min: 0, max: 1, step: 0.05 },
            table: { category: 'driverOptions' },
        },
        stagePadding: {
            control: { type: 'range', min: 0, max: 24, step: 1 },
            table: { category: 'driverOptions' },
        },
        stageRadius: {
            control: { type: 'range', min: 0, max: 24, step: 1 },
            table: { category: 'driverOptions' },
        },
        animate: { control: 'boolean', table: { category: 'driverOptions' } },
    },
};

export default meta;

const tour: TourDefinition = {
    key: 'demo',
    steps: [
        {
            id: 'one',
            anchor: 'theme.card',
            title: 'Themed popover',
            description: 'Colours and radius come from CSS custom properties.',
            side: 'right',
        },
        {
            id: 'two',
            title: 'Overlay and stage',
            description: 'Those come from driverOptions on TourProvider.',
        },
    ],
};

const hints: TourHint[] = [
    {
        id: 'hint',
        anchor: 'theme.hint',
        title: 'Hints share the theme',
        description: 'The beacon uses the primary colour.',
        side: 'bottom',
    },
];

const cssVariables = (args: ThemeArgs): Record<string, string> => ({
    '--tour-popover-bg': args.popoverBackground,
    '--tour-popover-fg': args.popoverForeground,
    '--tour-muted-fg': args.mutedForeground,
    '--tour-border': args.border,
    '--tour-primary-bg': args.primaryBackground,
    '--tour-primary-fg': args.primaryForeground,
    '--tour-radius': `${args.radius}px`,
});

function Start() {
    const { start, isActive } = useTour();

    return (
        <button
            type="button"
            className="primary"
            disabled={isActive}
            onClick={() => start('demo')}
        >
            Take the tour
        </button>
    );
}

function Themed(args: ThemeArgs) {
    const host = useDemoHost();
    const variables = cssVariables(args);

    // Popovers are appended to <body>, so the variables live on the root
    // element rather than on a wrapper inside the story.
    useEffect(() => {
        const root = document.documentElement;

        Object.entries(variables).forEach(([name, value]) =>
            root.style.setProperty(name, value),
        );

        return () => {
            Object.keys(variables).forEach((name) =>
                root.style.removeProperty(name),
            );
        };
    });

    const driverOptions = {
        overlayColor: args.overlayColor,
        overlayOpacity: args.overlayOpacity,
        stagePadding: args.stagePadding,
        stageRadius: args.stageRadius,
        animate: args.animate,
    };

    return (
        // driver.js takes its options when the driver is created, so the
        // provider is remounted when a control changes them.
        <TourProvider
            key={JSON.stringify(driverOptions)}
            adapters={host.adapters}
            tours={[tour]}
            driverOptions={driverOptions}
        >
            <Demo title="Theming">
                <p>
                    Use the Controls panel. The optional{' '}
                    <span className="demo-code">styles.css</span> reads{' '}
                    <span className="demo-code">--tour-*</span> variables;
                    overlay and stage settings go through{' '}
                    <span className="demo-code">driverOptions</span>.
                </p>
                <div className="demo-row">
                    <Start />
                    <TourAnchor id="theme.hint">
                        <button type="button">A hinted control</button>
                    </TourAnchor>
                </div>
                <TourAnchor id="theme.card">
                    <div className="demo-card">
                        <h2>Highlighted card</h2>
                        <p>The stage padding and radius apply around this.</p>
                    </div>
                </TourAnchor>
                <pre className="demo-log">
                    {`:root {\n${Object.entries(variables)
                        .map(([name, value]) => `  ${name}: ${value};`)
                        .join('\n')}\n}`}
                </pre>
                <TourHints hints={hints} />
            </Demo>
        </TourProvider>
    );
}

const render = (args: ThemeArgs) => <Themed {...args} />;

export const Light: StoryObj<ThemeArgs> = {
    render,
    args: {
        popoverBackground: '#ffffff',
        popoverForeground: '#18181b',
        mutedForeground: '#71717a',
        border: '#e4e4e7',
        primaryBackground: '#4f46e5',
        primaryForeground: '#ffffff',
        radius: 10,
        overlayColor: '#000000',
        overlayOpacity: 0.6,
        stagePadding: 8,
        stageRadius: 8,
        animate: true,
    },
};

export const Dark: StoryObj<ThemeArgs> = {
    render,
    args: {
        ...Light.args,
        popoverBackground: '#18181b',
        popoverForeground: '#fafafa',
        mutedForeground: '#a1a1aa',
        border: '#3f3f46',
        primaryBackground: '#22d3ee',
        primaryForeground: '#083344',
        overlayOpacity: 0.75,
    },
};
