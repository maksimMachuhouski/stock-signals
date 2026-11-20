# stock-signals

A personal app that tracks a few stocks, each with one or two business
indicators the company publishes ahead of its financial reports, and
flags a stock when an indicator's year-over-year growth is ahead of the
price's change.

A static web app: React, TypeScript, and Vite, with no server. Data is
kept in the browser.

## Development

Needs Node.js 22.

```bash
npm install
npm run dev        # http://localhost:5175
npm run typecheck
npm test
npm run build      # outputs to dist/
```

## Checks and deployment

- Every pull request runs the type check, the tests, and the build
  (`.github/workflows/ci.yml`).
- Every push to `main` runs the tests, builds, and publishes the app to
  GitHub Pages (`.github/workflows/deploy.yml`):
  <https://maksimmachuhouski.github.io/stock-signals/>
