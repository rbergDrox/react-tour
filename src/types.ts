/**
 * Public types.
 *
 * This module has no runtime dependency, including on driver.js itself — the
 * imports below are type-only. Everything host-application specific (routing,
 * persistence, translation) arrives through `TourAdapters`, so the same tour
 * components work in any project that supplies an adapter object.
 */
import type { Config } from 'driver.js';
import type { HintsConfig } from 'driver.js/hints';

export type TourSide = 'top' | 'right' | 'bottom' | 'left';

export type TourAlign = 'start' | 'center' | 'end';

export type TourStatus =
    'not_started' | 'in_progress' | 'completed' | 'skipped';

export type TourStep = {
    /** Stable identity, used for analytics and for resuming by name. */
    id: string;
    /**
     * Matches a `<TourAnchor id>` elsewhere in the tree. Omit to render a
     * centered step with no highlighted element.
     */
    anchor?: string;
    /**
     * Page this step lives on, compared against `adapters.currentPageKey()`.
     * When it differs, the controller navigates to `href` before highlighting.
     */
    page?: string;
    href?: string;
    title: string;
    description: string;
    side?: TourSide;
    align?: TourAlign;
    /**
     * Steps flagged `false` are filtered out before the tour runs. Hosts use
     * this for steps the current user cannot reach (permissions, plan gates),
     * which is more reliable than probing the DOM for an element that lives on
     * a page we have not navigated to yet.
     */
    enabled?: boolean;
};

export type TourDefinition = {
    key: string;
    steps: TourStep[];
};

export type TourProgress = {
    tourKey: string;
    status: TourStatus;
    stepIndex: number;
};

export type TourHint = {
    id: string;
    anchor: string;
    title: string;
    description: string;
    side?: TourSide;
    align?: TourAlign;
    beaconSide?: TourSide;
    beaconAlign?: TourAlign;
};

export type TourLabels = {
    next: string;
    previous: string;
    done: string;
    /** Supports the `{{current}}` and `{{total}}` placeholders. */
    progress: string;
    dismissHint: string;
};

/**
 * Runs before a step is highlighted, giving the host a chance to reveal the
 * anchor first — opening a collapsed sidebar, switching a tab, expanding an
 * accordion. Registered via `useTour().registerStepPreparer()` so the tour
 * module never needs to know what any of those things are.
 */
export type TourStepPreparer = (step: TourStep) => void | Promise<void>;

export type TourAdapters = {
    /** Navigate to a URL within the host application. */
    navigate: (href: string) => void;
    /** Subscribe to completed navigations. Must return an unsubscribe function. */
    onNavigated: (callback: () => void) => () => void;
    /** Identifies the page currently rendered, compared against `TourStep.page`. */
    currentPageKey: () => string;
    /** Persist progress so a tour can be resumed in a later session. */
    persist?: (progress: TourProgress) => void;
    /** Called when a hint's dismiss button is used. */
    dismissHint?: (hintId: string) => void;
    onCompleted?: (tourKey: string) => void;
    onSkipped?: (tourKey: string, stepIndex: number) => void;
    labels?: Partial<TourLabels>;
};

/**
 * Options forwarded to driver.js. The click and destroy hooks are owned by the
 * controller — they are what let a step continue across a navigation — and
 * steps come from `TourDefinition`, so none of those can be set here.
 */
export type TourDriverOptions = Omit<
    Config,
    'steps' | 'onNextClick' | 'onPrevClick' | 'onDoneClick' | 'onDestroyStarted'
>;

/** Options forwarded to driver.js's hint layer. */
export type TourHintOptions = Omit<HintsConfig, 'hints' | 'onDismiss'>;

export type TourContextValue = {
    /** Start a tour from the beginning, or from `atIndex` when supplied. */
    start: (tourKey: string, atIndex?: number) => void;
    /** Resume a tour from its last persisted step. */
    resume: (tourKey: string) => void;
    stop: () => void;
    /** One-off spotlight on a single anchor, outside of any tour. */
    spotlight: (step: Omit<TourStep, 'id'>) => void;
    isActive: boolean;
    activeTourKey: string | null;
    activeStepIndex: number;
    registerStepPreparer: (preparer: TourStepPreparer) => () => void;
};
