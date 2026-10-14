/**
 * Anchor addressing, kept dependency-free so components that only need to mark
 * an element do not pull driver.js into their bundle.
 */
export const TOUR_ANCHOR_ATTRIBUTE = 'data-tour';

export function anchorSelector(anchorId: string): string {
    return `[${TOUR_ANCHOR_ATTRIBUTE}="${anchorId}"]`;
}
