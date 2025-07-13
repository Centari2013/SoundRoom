# Project Architecture

This document provides a high level overview of the major files and modules that power SoundRoom. It can be helpful when adding new features or refactoring existing logic.

## src/lib

- **AudioEngine.js** – Central manager for the Web Audio API. It owns the `AudioContext`, master gain, and a collection of `SoundSource` instances. The engine exposes helpers for loading sources, controlling playback, connecting to the optional reverb chain and serialising state for saving a room.
- **SoundSource.js** – Thin wrapper around an `<audio>` element and the Web Audio nodes needed for spatialisation. Each source tracks its position, angle and scheduling information so that the visual canvas and audio stay in sync.
- **Listener.js** – Represents the user's listening position in the room. It synchronises its orientation with the `AudioContext` listener so rotations and movements are heard correctly.
- **ActionManager.js** – Provides undo and redo functionality. Actions are registered with handlers which are executed and stored on a stack for later reversal.
- **SoundScheduler.js** – Handles interval based playback for sources that have a schedule enabled. It keeps track of timers and supports pausing/resuming when the engine is stopped.
- **Room.js** – Central class that stores room dimensions and owns the `AudioEngine`, `Listener` and `SoundSource` instances. Provides helpers for clamping values, adding sources and serialising basic metadata.

## src/utils

- **router.js** – Sets up the application router and route guards. Routes for the modal based views (login, help, etc.) are nested under the root component.
- **supabase.js** – Exposes a preconfigured Supabase client based on environment variables.
- **resetRoomState.js** – Utility that disposes of all active audio objects and reinitialises the Pinia stores so a brand new room can be started.

## src/composables

- **useAuth.js** – Reactive wrapper around Supabase authentication providing `user`, `isAuthenticated` and `sessionLoaded` state used throughout the app.
- **useKeyboardControls.js** – Manages global keyboard shortcuts for moving the listener and manipulating the currently selected sound source.

## src/stores

The application state is organised with [Pinia](https://pinia.vuejs.org/). Each store wraps a key class or concern from `src/lib`:

- **useAudioEngineStore.js** – Holds the singleton `AudioEngine` instance and exposes helpers for loading data, connecting the Web Audio context and managing impulse responses.
- **useListenerStore.js** – Wraps the `Listener` class and provides serialisation helpers.
- **useActionManagerStore.js** – Provides a single `ActionManager` used for undo and redo across the app.
- **useAudioCacheStore.js** – Tracks loaded audio buffers and sound library metadata.
- **useCanvasStore.js** – Coordinates canvas scale and selected source state.
- **useRoomStore.js** – Manages room metadata and serialises the entire session for saving to Supabase.

## src/components

The UI is split between high level SoundRoom views and reusable UI primitives under `src/components/ui`.

- **SoundRoom/** – Contains the main canvas and sidebars used when editing a room.
- **ui/** – Buttons, inputs, modals and overlay components shared throughout the application.

Referencing these modules when adding features will help keep new code consistent with the existing structure.
