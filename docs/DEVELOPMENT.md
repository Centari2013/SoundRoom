# Development Guide

This document collects a few notes for working on SoundRoom locally. It assumes you are familiar with Node.js and the Vue ecosystem.

## Prerequisites

- **Node 18+** – Install from [nodejs.org](https://nodejs.org/) or use a version manager such as nvm.
- **npm** – Comes bundled with Node. All commands below use npm but you can swap in `pnpm` or `yarn` if you prefer.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create an `.env` file** using `.env.example` as a template and fill in your Supabase project values.
3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Vite will start a hot‑reloading server at `http://localhost:5173` by default.

## Building for Production

To create a production build run:

```bash
npm run build
```

The compiled site will be output to the `dist/` directory.

### Sentry and Source Maps

Sentry is optional at build time. Local production builds do not include Sentry or
emit source maps unless the relevant environment variables are set.

- `VITE_SENTRY_DSN`: enables browser error reporting.
- `VITE_SENTRY_TRACES_SAMPLE_RATE`: controls sampled performance traces. Keep
  this below `1.0` in production unless you intentionally want every session.
- `SENTRY_AUTH_TOKEN`: enables hidden source map generation, uploads those maps
  to Sentry during `npm run build`, then deletes the `.map` files from `dist/`.

For Vercel, add these under Project Settings -> Environment Variables. The
Sentry org/project are already configured in `vite.config.js` as
`soundroom/javascript-vue`, so the only Sentry build secret needed there is
`SENTRY_AUTH_TOKEN`.

## Automated Testing

SoundRoom has a pre-launch test suite covering core domain logic, audio scheduling,
entitlement rules, API helper behavior, reusable UI inputs, and launch-route browser
smoke tests.

Run the full launch gate:

```bash
npm test
```

Run only the Vitest unit suite:

```bash
npm run test:unit
```

Run unit tests in watch mode while developing:

```bash
npm run test:unit:watch
```

Run the Playwright browser smoke tests:

```bash
npm run test:e2e
```

Run the coverage report:

```bash
npm run test:coverage
```

Coverage output is written to `coverage/` and Playwright artifacts are written to
`test-results/` and `playwright-report/`; these directories are generated locally
and ignored by git.

## Project Structure Overview

```
src/
  assets/      # static icons and images
  components/  # Vue components and UI widgets
  composables/ # reusable hooks
  lib/         # plain JavaScript classes powering the audio engine
  stores/      # Pinia stores wrapping core classes
  utils/       # helper modules and router setup
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for more detailed explanations of these folders.

## Tips

- Restart the dev server if you add new environment variables.
- Add tests beside the existing `test/unit` or `test/e2e` suites before changing
  launch-critical auth, billing, audio, entitlement, room persistence, or routing
  behavior.

Happy hacking!
