# @shapperize/react-tour

A headless React layer over [Driver.js](https://driverjs.com) for product tours that have to work inside a real application.

- **Anchors by id, not CSS selectors.** `<TourAnchor id="nav.inbox">` marks an element. Tour content refers to anchor ids, so it survives markup refactors.
- **Tours that span page navigations.** Driver.js knows about one page. This package tears the tour down, asks your router to navigate, waits for the new page, and resumes on the right step — forwards and backwards.
- **Step preparers.** Before a step is highlighted, your app can reveal its anchor: open a sidebar, switch a tab, expand an accordion.
- **Hints.** Persistent beacons, with dismissal reported back to you.
- **Nothing host-specific inside.** Routing, persistence, translation and notifications arrive through one `TourAdapters` object.

No runtime dependencies beyond its peers: `react >=18` and `driver.js ^1.8.0`.

## Install

```sh
npm install @shapperize/react-tour driver.js
```

```ts
import 'driver.js/dist/driver.css';
import 'driver.js/dist/hints.css'; // only if you use hints
import '@shapperize/react-tour/styles.css'; // optional theme
```

## Quick start

```tsx
import { TourAnchor, TourProvider, useTour } from '@shapperize/react-tour';
import type { TourAdapters, TourDefinition } from '@shapperize/react-tour';

const tours: TourDefinition[] = [
  {
    key: 'welcome',
    steps: [
      { id: 'intro', title: 'Welcome', description: 'A quick look around.' },
      {
        id: 'inbox',
        anchor: 'nav.inbox',
        title: 'Your inbox',
        description: 'New requests land here.',
      },
    ],
  },
];

// A single-page host: nothing to navigate to, nothing to persist.
const adapters: TourAdapters = {
  navigate: () => {},
  onNavigated: () => () => {},
  currentPageKey: () => 'app',
};

function StartButton() {
  const { start } = useTour();

  return <button onClick={() => start('welcome')}>Take the tour</button>;
}

export function App() {
  return (
    <TourProvider adapters={adapters} tours={tours}>
      <TourAnchor id="nav.inbox">
        <a href="/inbox">Inbox</a>
      </TourAnchor>
      <StartButton />
    </TourProvider>
  );
}
```

`adapters` must keep the same identity between renders. Define it outside the component or memoize it.

## Adapters

`TourAdapters` is the only contract between the tour layer and your app.

| Member                          | Required | Purpose                                                                           |
| ------------------------------- | -------- | --------------------------------------------------------------------------------- |
| `navigate(href)`                | yes      | Go to a URL. Called with a step's `href` when the step lives on another page.     |
| `onNavigated(callback)`         | yes      | Subscribe to _completed_ navigations. Must return an unsubscribe function.        |
| `currentPageKey()`              | yes      | Identify the page on screen. Compared with a step's `page`.                       |
| `persist(progress)`             | no       | Store `{ tourKey, status, stepIndex }` so a tour can be resumed later.            |
| `onCompleted(tourKey)`          | no       | The last step's Done was clicked.                                                 |
| `onSkipped(tourKey, stepIndex)` | no       | The user closed the tour part-way.                                                |
| `dismissHint(hintId)`           | no       | Carried for your own use; `TourHints` reports dismissals through its `onDismiss`. |
| `labels`                        | no       | Button and progress text. Defaults to English.                                    |

A page key is whatever uniquely names a page in your app: a pathname, a route id, a component name.

### React Router

React Router has no "navigation finished" event, so derive one from an effect on the pathname. It runs after the new route has rendered, which is when a waiting step can resume. The complete version is in [`examples/react-router/src/tour-adapters.ts`](examples/react-router/src/tour-adapters.ts).

```tsx
function useReactRouterAdapters(): TourAdapters {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const listeners = useRef(new Set<() => void>());
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathnameRef.current === pathname) return;
    pathnameRef.current = pathname;
    listeners.current.forEach((listener) => listener());
  }, [pathname]);

  return useMemo(
    () => ({
      navigate: (href) => void navigate(href),
      onNavigated: (callback) => {
        listeners.current.add(callback);
        return () => listeners.current.delete(callback);
      },
      currentPageKey: () => pathnameRef.current,
    }),
    [navigate],
  );
}
```

### Inertia

```tsx
import { router, usePage } from '@inertiajs/react';
import { createInertiaAdapters } from '@shapperize/react-tour/inertia';

function TourHost({ children }: { children: ReactNode }) {
  const { component } = usePage();

  const adapters = useMemo(
    () =>
      createInertiaAdapters({
        router,
        page: { component },
        persist: '/tour-progress',
      }),
    [component],
  );

  return (
    <TourProvider adapters={adapters} tours={tours}>
      {children}
    </TourProvider>
  );
}
```

Step `page` values are Inertia component names. Mount the provider in a **persistent layout** so it stays mounted between visits.

`@shapperize/react-tour/inertia` does not import Inertia; it accepts the router and page you pass in.

> **Do not persist through the Inertia router.** `router.post` is a visit, and a visit emits the navigation event the tour listens to. The tour reads it as "the user went somewhere else" and stops itself in the middle of a step. Pass `persist` a URL (posted with `fetch`, including the `XSRF-TOKEN` cookie as a header) or a function that uses `fetch`, `sendBeacon` or your HTTP client. The same applies to recording hint dismissals; `postInBackground(url, payload)` is exported for that.

## How a tour crosses a page

```
 user clicks Next
        │
        ▼
 next step has `page` ≠ currentPageKey()
        │
        ├─ park the step index and direction
        ├─ persist({ status: 'in_progress', stepIndex })
        ├─ destroy the Driver.js overlay
        └─ adapters.navigate(step.href)
                 │
                 ▼
        host router renders the new page
                 │
                 ▼
        adapters.onNavigated fires
                 │
                 ├─ run step preparers
                 ├─ wait until the anchor exists and has a width
                 └─ highlight the parked step
```

Two details make this reliable:

- **The anchor is waited for, not assumed.** Routers commonly announce a finished navigation before React has painted the new tree. The controller polls on animation frames until the anchor is in the DOM and laid out, up to `anchorTimeout` (2000 ms by default).
- **An anchor that never appears is skipped**, in the direction of travel, instead of leaving the user stuck. See [Silent failures](#silent-failures) for what that means while developing.

If the user navigates away on their own while a tour is showing, the tour pauses. Progress is already persisted, so `resume()` picks it up.

## Tours

```ts
type TourStep = {
  id: string;
  anchor?: string; // a TourAnchor id; omit for a centered step
  page?: string; // compared with adapters.currentPageKey()
  href?: string; // where to navigate when `page` differs
  title: string;
  description: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  enabled?: boolean; // false removes the step before the tour runs
};
```

Use `enabled: false` for steps the current user cannot reach (permissions, plan gates). It is more reliable than probing the DOM for an element on a page that has not been visited yet.

`useTour()` returns:

| Member                           | Purpose                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `start(tourKey, atIndex?)`       | Start from the beginning, or from a step index.                  |
| `resume(tourKey)`                | Start from the persisted step (from the `progress` prop).        |
| `stop()`                         | End the tour without reporting it as skipped.                    |
| `spotlight(step)`                | Highlight one anchor outside of any tour. Nothing is persisted.  |
| `registerStepPreparer(preparer)` | Run a function before each step. Returns an unregister function. |
| `isActive`                       | A tour or spotlight is on screen.                                |
| `activeTourKey`                  | The running tour, or `null`.                                     |
| `activeStepIndex`                | Index within the enabled steps.                                  |

`TourProvider` props:

| Prop            | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| `adapters`      | See above. Must be referentially stable.                                       |
| `tours`         | `TourDefinition[]`.                                                            |
| `progress`      | `TourProgress[]` loaded from wherever `persist` stored it. Used by `resume()`. |
| `driverOptions` | Passed to Driver.js when the driver is created. See [Theming](#theming).       |
| `anchorTimeout` | Milliseconds to wait for a step's anchor. Default `2000`.                      |

## Anchors

```tsx
<TourAnchor id="nav.inbox">
  <a href="/inbox">Inbox</a>
</TourAnchor>
```

By default `TourAnchor` merges `data-tour="nav.inbox"` onto its child, so nothing extra lands in the DOM. `className`, `style`, event handlers and refs are merged with the child's own.

That only works when the child passes unknown props through to a real element. For a component that destructures a fixed set of props, wrap instead:

```tsx
<TourAnchor id="page.header" asChild={false}>
  <PageHeader title="Inbox" />
</TourAnchor>
```

Code that only needs to _mark_ elements can avoid loading Driver.js:

```ts
import {
  anchorSelector,
  TOUR_ANCHOR_ATTRIBUTE,
} from '@shapperize/react-tour/anchors';
```

Use ids that are stable and not derived from translated text, such as `nav.inbox` or `settings.notifications`.

## Step preparers

A preparer runs before every step and may be async. Register it from the component that owns the hidden UI, so the tour layer never needs to know that UI exists:

```tsx
function Sidebar() {
  const [open, setOpen] = useState(true);
  const { registerStepPreparer } = useTour();

  useEffect(
    () =>
      registerStepPreparer((step) => {
        if (step.anchor?.startsWith('nav.')) {
          setOpen(true);
        }
      }),
    [registerStepPreparer],
  );

  return open ? <nav>…</nav> : null;
}
```

The preparer only has to trigger the change. The controller then waits for the anchor to be laid out before highlighting it.

## Hints

```tsx
<TourHints
  hints={[
    {
      id: 'export',
      anchor: 'action.export',
      title: 'Export is new',
      description: 'Download everything as a CSV.',
    },
  ]}
  onDismiss={(hintId) => rememberDismissal(hintId)}
  dismissLabel="Got it"
/>
```

Render `TourHints` inside `TourProvider`. Beacons hide while a tour is running and return afterwards. The package does not remember dismissals: `onDismiss` tells you, and you stop passing that hint.

`options` is forwarded to Driver.js's hint layer when it is created. Its `popoverClass` defaults to the provider's, so hints and tours share a theme.

## Theming

`styles.css` themes `.driver-popover.react-tour` through custom properties. Set them on `:root`; popovers are appended to `<body>`, so variables on a wrapper element inside your app will not reach them.

```css
:root {
  --tour-popover-bg: #18181b;
  --tour-popover-fg: #fafafa;
  --tour-muted-fg: #a1a1aa;
  --tour-border: #3f3f46;
  --tour-primary-bg: #22d3ee;
  --tour-primary-fg: #083344;
  --tour-radius: 0.75rem;
}
```

Also available: `--tour-shadow`, `--tour-font`, `--tour-title-font`, `--tour-max-width`, `--tour-button-bg`, `--tour-button-fg`, `--tour-hint-color`.

Overlay and stage settings are Driver.js options:

```tsx
<TourProvider
  adapters={adapters}
  tours={tours}
  driverOptions={{
    overlayColor: 'black',
    overlayOpacity: 0.6,
    stagePadding: 8,
    stageRadius: 10,
    popoverClass: 'my-tour',
  }}
>
```

Setting `popoverClass` replaces `react-tour`, so `styles.css` no longer applies and you style `.driver-popover.my-tour` yourself.

`driverOptions` accepts any Driver.js option except `steps`, `onNextClick`, `onPrevClick`, `onDoneClick` and `onDestroyStarted`. Those hooks are how a step continues across a navigation; the type excludes them and they are applied last at runtime. Options are read when the driver is first created, so later changes need a remount (for example a `key` on the provider).

## Persistence contract

Version 1. Any backend that stores this shape works.

```ts
type TourProgress = {
  tourKey: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  stepIndex: number;
};

// What the host loads and passes in:
//   <TourProvider progress={tours} />, and hints filtered by dismissedHints
type HostPayload = { tours: TourProgress[]; dismissedHints: string[] };

// What createInertiaAdapters posts when `persist` is a URL:
type PersistRequest = { tour_key: string; status: string; step_index: number };
```

`persist` is called on every step shown (`in_progress`), when a step is parked for a navigation (`in_progress`), on close (`skipped`, with the step that was open) and on completion (`completed`). It is called often; make it cheap and tolerant of a lost request.

## Silent failures

These do not throw, by design, so they are worth knowing:

- **A `TourAnchor` whose child drops the attribute.** The step waits `anchorTimeout`, then skips itself. In development `TourAnchor` logs a console warning when its attribute did not reach the DOM. Fix with `asChild={false}`.
- **A renamed or removed anchor, or a step `page`/`href` that no longer matches a route.** Same symptom: the step is skipped. Treat anchor ids as an API between your markup and your tour content.
- **Adapters recreated on every render.** The navigation subscription is torn down and rebuilt each time. Memoize the object.
- **Persisting through a router that emits navigation events.** The tour stops itself. See the Inertia note above.
- **Calling Driver.js's `destroy()` yourself.** Its public `destroy()` does not fire the destroy hook; only a user-initiated close does. Use `useTour().stop()`.

## Demos and examples

- **Storybook** — `npm run storybook`. One story per capability: basic tours, tours across pages, step preparers, resume, hints, spotlight, anchors and a theming playground.
- [`examples/react-router`](examples/react-router) — a three-page app.
- [`examples/inertia-react`](examples/inertia-react) — Inertia pages with server-side persistence.

## Development

```sh
npm install
npm run build        # tsup → dist (ESM, CJS, types)
npm test             # Vitest; Driver.js is stubbed at src/driver-client.ts
npm run examples:install   # once; the examples have their own installs
npm run test:e2e     # Playwright against both examples, real Driver.js
npm run typecheck
npm run lint
npm run storybook
```

`src/driver-client.ts` is the only module that imports Driver.js. Keep it that way: it is what lets the controller be tested without a browser, and what would make replacing the underlying library a one-file change.

## License

MIT
