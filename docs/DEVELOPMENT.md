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

## Testing

SoundRoom ships with configured test runners, although only a small number of
assertions are in place today. You can run:

```bash
npm test        # run unit + end-to-end suites
npm run test:unit
npm run test:e2e
```

Playwright requires Chromium (installed automatically on first run) and will
look for the dev server at `http://127.0.0.1:4173` when executing the production
build tests.

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
- Playwright downloads browsers the first time you execute `npm run test:e2e`.

Happy hacking!
