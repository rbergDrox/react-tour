import { forwardRef, isValidElement, useEffect } from 'react';
import type { HTMLAttributes, ReactNode, Ref } from 'react';
import { anchorSelector, TOUR_ANCHOR_ATTRIBUTE } from './anchors';
import { Slot } from './slot';

export type TourAnchorProps = {
    id: string;
    asChild?: boolean;
    children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'id'>;

const isDevelopment =
    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * Marks an element as addressable by a tour step or hint.
 *
 * Defaults to merging the attribute onto its child so nothing extra lands in
 * the DOM. That only works if the child forwards unknown props to a real
 * element — plain components that destructure a fixed set of props will drop
 * the attribute silently, so pass `asChild={false}` for those and accept the
 * wrapper element.
 */
export const TourAnchor = forwardRef<HTMLElement, TourAnchorProps>(
    function TourAnchor(
        { id, asChild = true, className, children, ...props },
        ref,
    ) {
        // A dropped attribute is invisible until a tour step mysteriously skips
        // itself, so say so loudly while developing.
        useEffect(() => {
            if (!isDevelopment) {
                return;
            }

            if (document.querySelector(anchorSelector(id)) === null) {
                console.warn(
                    `[tour] Anchor "${id}" did not reach the DOM. Its child probably does not forward props — try asChild={false}.`,
                );
            }
        }, [id]);

        const anchorProps = {
            ...props,
            [TOUR_ANCHOR_ATTRIBUTE]: id,
            className,
        };

        // Text, fragments of several nodes and the like have nothing to merge
        // onto, so they get the wrapper regardless.
        if (asChild && isValidElement(children)) {
            return (
                <Slot ref={ref} {...anchorProps}>
                    {children}
                </Slot>
            );
        }

        return (
            <div ref={ref as Ref<HTMLDivElement>} {...anchorProps}>
                {children}
            </div>
        );
    },
);
