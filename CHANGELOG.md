# @shapperize/react-tour

## 0.1.1

### Patch Changes

- Fix the `TourAnchor` development warning never appearing in browser builds. A `typeof process` guard survived the bundler's `process.env.NODE_ENV` replacement and was always false in the browser.

## 0.1.0

Initial release.

- `TourProvider`, `useTour`, `TourAnchor` and `TourHints`.
- Tours that span page navigations, step preparers, one-off spotlights and
  persisted resume.
- `driverOptions` and `anchorTimeout` on `TourProvider`.
- `@shapperize/react-tour/anchors`, a dependency-free entry point.
- `@shapperize/react-tour/inertia`, adapters for Inertia.js.
- `@shapperize/react-tour/styles.css`, an optional theme driven by CSS custom
  properties.
