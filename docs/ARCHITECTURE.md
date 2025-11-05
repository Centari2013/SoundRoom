# Project Architecture

This document explains how the main SoundRoom subsystems fit together so new contributors can quickly reason about feature work. The focus is on **runtime flow**, **state boundaries**, and **key integration points** between audio, canvas rendering, and Supabase.

## High-level runtime

1. **Bootstrap** – `main.js` mounts the Vue app, registers the router, and wires global styles. The initial route loads `App.vue`, which renders layout chrome and the `SoundRoom` view.
2. **Store initialisation** – Pinia stores eagerly construct the long-lived singletons (`AudioEngine`, `ActionManager`, `Listener`). They expose actions for loading sounds, mutating spatial data, and serialising the room.
3. **Canvas + UI rendering** – Konva canvases render the spatial grid and directional cones while Tailwind-powered components handle panels, forms, and modals.
4. **User interaction loop** – Keyboard shortcuts (`useKeyboardControls`) and pointer events dispatch store actions. Changes propagate to both the audio engine and canvas layer.
5. **Persistence / external APIs** – Supabase provides the sound library and (future) scene persistence. Stripe environment variables are present for future monetisation flows.

The diagram below summarises the major flows:

```
User Input → Pinia Actions → Audio Engine + Canvas → UI Updates
                     ↘ Supabase fetches / uploads ↙
```

## Core libraries (`src/lib`)

| Module | Responsibility | Key Consumers |
| --- | --- | --- |
| **AudioEngine.js** | Manages the `AudioContext`, master gain, and the list of `SoundSource` instances. Provides lifecycle hooks (`start`, `stop`), scene serialisation, and impulse response wiring. | `useAudioEngineStore`, undo actions, scheduler |
| **SoundSource.js** | Wraps `<audio>` elements with Panner/ Gain nodes. Stores spatial data (position, orientation, cone angles) and exposes mutations that synchronise visual + audio state. | Audio engine, canvas interactions |
| **Listener.js** | Represents the listener transform. Keeps the `AudioContext.listener` node in sync with keyboard-driven movement/rotation. | `useListenerStore`, keyboard controls |
| **ActionManager.js** | Command-pattern undo/redo stack. Stores closures for `do`/`undo` and broadcasts changes to interested components. | `useActionManagerStore`, toolbar/keyboard shortcuts |
| **SoundScheduler.js** | Timer based playback for ambient loops. Handles pause/resume when the engine stops and recalculates offsets after seeking. | `useAudioEngineStore`, future automation UIs |
| **Room.js** | Data container describing room size, background, and metadata. Includes helper guards to keep values within expected limits. | `useRoomStore`, save/load routines |

These classes are intentionally framework-agnostic, enabling easier unit testing and potential reuse outside Vue.

## State management (`src/stores`)

SoundRoom relies on [Pinia](https://pinia.vuejs.org/) stores as the source of truth. Each store wraps a lib module and exposes a compact API surface to the rest of the app.

- **useAudioEngineStore.js** – Instantiates the `AudioEngine`, fetches sound metadata, and orchestrates adding/removing `SoundSource`s. Also coordinates impulse response downloads.
- **useListenerStore.js** – Wraps `Listener` and provides derived state (e.g., heading angles) consumed by UI panels.
- **useActionManagerStore.js** – Singleton undo/redo stack. UI components push actions for keyboard or toolbar operations.
- **useAudioCacheStore.js** – Keeps a cache of downloaded buffers and Supabase metadata to avoid refetching.
- **useCanvasStore.js** – Tracks zoom level, canvas dimensions, and the currently selected sound source so Konva layers stay in sync.
- **useRoomStore.js** – Owns the `Room` model plus session metadata (title, description). Serialises/deserialises room payloads for Supabase storage.

Each store only mutates its local domain but can **listen to other stores** through actions. For example, when `useAudioEngineStore` removes a sound, it notifies `useCanvasStore` to clear selection.

## Composables & utilities

- **`src/composables/useAuth.js`** – Wraps Supabase auth state. Sets `sessionLoaded` once the client bootstraps to prevent UI flicker.
- **`src/composables/useKeyboardControls.js`** – Registers global keyboard handlers. Delegates to `useListenerStore`, `useAudioEngineStore`, and `useActionManagerStore` for actual mutations.
- **`src/utils/router.js`** – Configures routes for the root layout, SoundRoom editor, and modal overlays. Navigation guards ensure certain flows wait for Supabase auth.
- **`src/utils/supabase.js`** – Creates the Supabase client using Vite env variables; shared by stores and composables that fetch audio libraries.
- **`src/utils/resetRoomState.js`** – Centralised teardown that disposes audio nodes, clears timers, and resets Pinia stores. Used when loading a saved scene or signing out.

## UI composition (`src/components`)

The UI is divided into two layers:

1. **Feature views (`src/components/SoundRoom/`)** – Canvas, inspector panels, transport controls, and dialogs responsible for editing a room. They subscribe to Pinia stores and trigger undoable actions.
2. **Primitive UI elements (`src/components/ui/`)** – Tailwind-based buttons, toggles, sliders, and dialog shells. These components are stateless and reusable across future features like onboarding or authentication flows.

`SoundRoomCanvas.vue` sits at the centre of the feature layer. It binds Konva stages to store state, reflects selection outlines, and emits events when the user drags/rotates sources.

## External integrations

- **Supabase Storage** – Hosts the curated library of ambient sound files. Fetches happen through the audio engine store, which caches responses and passes object URLs to `SoundSource` instances.
- **Stripe (planned)** – Environment variables are wired in but there is no live checkout flow. Keeping the config centralised makes it easier to turn on monetisation without touching core audio logic.
- **GitHub Pages / Vercel** – Static output built by Vite. The configuration lives in `vercel.json` while GitHub Pages is used for the public demo.

## Adding new features

When introducing a feature, prefer the following workflow:

1. **Identify the domain** – Does the change affect audio playback, canvas interactions, or metadata/persistence? Choose the corresponding Pinia store or create a new one wrapping a lib module.
2. **Keep lib modules UI-agnostic** – Add pure functions or class methods inside `src/lib` first, then expose them through store actions.
3. **Surface state via stores** – Components should only depend on store getters/actions. This keeps undo/redo integration straightforward.
4. **Leverage ActionManager** – Any destructive or reversible operation should register a command with `useActionManagerStore` so keyboard shortcuts stay consistent.
5. **Reset gracefully** – If the feature changes scene data, hook into `resetRoomState` to ensure switching sessions clears derived state and audio nodes.

Adhering to this structure keeps the codebase modular and helps maintain parity between the visual canvas and audio experience.
