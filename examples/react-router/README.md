# React Router example

A three-page app with a tour that crosses pages, a sidebar revealed by a step
preparer, a hint, a spotlight, and progress kept in `localStorage`.

```sh
# from the repository root: build the package the example links to
npm install
npm run build

# then in this directory
npm install
npm run dev
```

Worth reading:

- `src/tour-adapters.ts` — the whole React Router binding. React Router has no
  "navigation finished" event, so it derives one from an effect on the
  pathname.
- `src/tours.ts` — tour and hint content as data.
- `src/app.tsx` — where the provider is mounted and the preparer registered.

The Playwright suite in `e2e/tour.spec.ts` runs against this app.
