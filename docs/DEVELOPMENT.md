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
- The project currently has no automated tests, but Playwright is included for future end‑to‑end testing.

Happy hacking!
