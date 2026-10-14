# Inertia example

Two Inertia pages, a tour that crosses them, and progress recorded by the
server through `@shapperize/react-tour/inertia`.

```sh
# from the repository root: build the package the example links to
npm install
npm run build

# then in this directory
npm install
npm run dev   # http://localhost:4174
```

`server.js` is a stand-in for a real Inertia backend: about a hundred lines of
Node that speak the protocol for two routes and keep progress in memory. In a
Laravel or Rails app, replace it with your own controllers.

Worth reading:

- `src/layout.tsx` — a **persistent layout** holds `TourProvider`, so the tour
  stays mounted across visits. Adapters come from `createInertiaAdapters` and
  are memoized on the page component.
- `persist: '/tour-progress'` — a URL, posted to with `fetch`. Recording
  progress through `router.post` would emit a navigation event and the tour
  would stop itself.
