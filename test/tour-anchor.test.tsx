import { render } from '@testing-library/react';
import { createRef, forwardRef } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { anchorSelector, TOUR_ANCHOR_ATTRIBUTE } from '../src/anchors';
import { TourAnchor } from '../src/tour-anchor';

describe('anchors', () => {
    it('builds an attribute selector', () => {
        expect(TOUR_ANCHOR_ATTRIBUTE).toBe('data-tour');
        expect(anchorSelector('nav.inbox')).toBe('[data-tour="nav.inbox"]');
    });
});

describe('TourAnchor', () => {
    it('merges the attribute onto its child without a wrapper', () => {
        const { container } = render(
            <TourAnchor id="save">
                <button className="primary">Save</button>
            </TourAnchor>,
        );

        const button = container.querySelector('button')!;

        expect(container.children).toHaveLength(1);
        expect(container.firstElementChild).toBe(button);
        expect(button.getAttribute('data-tour')).toBe('save');
    });

    it('merges className, style and other props with the child', () => {
        const { container } = render(
            <TourAnchor
                id="save"
                className="from-anchor"
                style={{ color: 'red', margin: 1 }}
                aria-label="Save changes"
            >
                <button className="from-child" style={{ color: 'blue' }}>
                    Save
                </button>
            </TourAnchor>,
        );

        const button = container.querySelector('button')!;

        expect(button.className).toBe('from-anchor from-child');
        // The child's own value wins a direct conflict.
        expect(button.style.color).toBe('blue');
        expect(button.style.margin).toBe('1px');
        expect(button.getAttribute('aria-label')).toBe('Save changes');
    });

    it('runs both event handlers', () => {
        const fromAnchor = vi.fn();
        const fromChild = vi.fn();
        const { container } = render(
            <TourAnchor id="save" onClick={fromAnchor}>
                <button onClick={fromChild}>Save</button>
            </TourAnchor>,
        );

        container.querySelector('button')!.click();

        expect(fromChild).toHaveBeenCalledTimes(1);
        expect(fromAnchor).toHaveBeenCalledTimes(1);
    });

    it('sets both the forwarded ref and the child ref', () => {
        const anchorRef = createRef<HTMLElement>();
        const childRef = createRef<HTMLButtonElement>();
        const { container, unmount } = render(
            <TourAnchor id="save" ref={anchorRef}>
                <button ref={childRef}>Save</button>
            </TourAnchor>,
        );

        const button = container.querySelector('button');

        expect(anchorRef.current).toBe(button);
        expect(childRef.current).toBe(button);

        unmount();

        expect(anchorRef.current).toBeNull();
        expect(childRef.current).toBeNull();
    });

    it('reaches the DOM through a component that forwards props', () => {
        const Forwarding = forwardRef<
            HTMLAnchorElement,
            { children: ReactNode }
        >(function Forwarding({ children, ...props }, ref) {
            return (
                <a ref={ref} {...props}>
                    {children}
                </a>
            );
        });
        const ref = createRef<HTMLElement>();
        const { container } = render(
            <TourAnchor id="link" ref={ref}>
                <Forwarding>Inbox</Forwarding>
            </TourAnchor>,
        );

        expect(container.querySelector('a[data-tour="link"]')).not.toBeNull();
        expect(ref.current?.tagName).toBe('A');
    });

    it('wraps in a div when asChild is false', () => {
        const ref = createRef<HTMLElement>();
        const { container } = render(
            <TourAnchor id="header" asChild={false} className="wrap" ref={ref}>
                <h1>Title</h1>
            </TourAnchor>,
        );

        const wrapper = container.firstElementChild!;

        expect(wrapper.tagName).toBe('DIV');
        expect(wrapper.getAttribute('data-tour')).toBe('header');
        expect(wrapper.className).toBe('wrap');
        expect(wrapper.querySelector('h1')?.hasAttribute('data-tour')).toBe(
            false,
        );
        expect(ref.current).toBe(wrapper);
    });

    it('falls back to the wrapper for children it cannot merge onto', () => {
        const { container } = render(
            <TourAnchor id="text">Just text</TourAnchor>,
        );

        expect(container.firstElementChild?.tagName).toBe('DIV');
        expect(container.firstElementChild?.getAttribute('data-tour')).toBe(
            'text',
        );
    });

    it('warns in development when the attribute never reaches the DOM', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Destructures a fixed set of props, so the attribute is dropped.
        function Dropping({ label }: { label: string }) {
            return <span>{label}</span>;
        }

        render(
            <TourAnchor id="lost">
                <Dropping label="Lost" />
            </TourAnchor>,
        );

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('Anchor "lost"');
    });

    it('stays quiet when the attribute lands', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        render(
            <TourAnchor id="found">
                <span>Found</span>
            </TourAnchor>,
        );

        expect(warn).not.toHaveBeenCalled();
    });
});

describe('TourAnchor outside a bundler', () => {
    it('stays quiet when there is no process to read', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        vi.stubGlobal('process', undefined);

        try {
            render(
                <TourAnchor id="no-process">
                    <span>Text</span>
                </TourAnchor>,
            );
        } finally {
            vi.unstubAllGlobals();
        }

        expect(warn).not.toHaveBeenCalled();
    });

    it('stays quiet in production', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        vi.stubEnv('NODE_ENV', 'production');

        function Dropping({ label }: { label: string }) {
            return <span>{label}</span>;
        }

        try {
            render(
                <TourAnchor id="lost-in-production">
                    <Dropping label="Lost" />
                </TourAnchor>,
            );
        } finally {
            vi.unstubAllEnvs();
        }

        expect(warn).not.toHaveBeenCalled();
    });
});
