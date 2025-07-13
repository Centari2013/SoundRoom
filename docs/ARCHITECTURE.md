# Project Architecture

This document provides a high level overview of some of the core non-Vue files.
It can be helpful when adding new features or refactoring existing logic.

## src/lib

- **AudioEngine.js** – Central manager for the Web Audio API. It owns the
  `AudioContext`, master gain, and a collection of `SoundSource` instances.
  The engine exposes helpers for loading sources, controlling playback,
  connecting to the optional reverb chain and serialising state for saving a
  room.
- **SoundSource.js** – Thin wrapper around an `<audio>` element and the Web Audio
  nodes needed for spatialisation. Each source tracks its position, angle and
  scheduling information so that the visual canvas and audio stay in sync.
- **Listener.js** – Represents the user's listening position in the room. It
  synchronises its orientation with the `AudioContext` listener so rotations and
  movements are heard correctly.
- **ActionManager.js** – Provides undo and redo functionality. Actions are
  registered with handlers which are executed and stored on a stack for later
  reversal.
- **SoundScheduler.js** – Handles interval based playback for sources that have a
  schedule enabled. It keeps track of timers and supports pausing/resuming when
  the engine is stopped.
- **Room.js** – Simple container describing room dimensions and metadata with
  helper methods for clamping values and serialising to JSON.

## src/utils

- **router.js** – Sets up the application router and route guards. Routes for the
  modal based views (login, help, etc.) are nested under the root component.
- **supabase.js** – Exposes a preconfigured Supabase client based on environment
  variables.
- **resetRoomState.js** – Utility that disposes of all active audio objects and
  reinitialises the Pinia stores so a brand new room can be started.

## src/composables

- **useAuth.js** – Reactive wrapper around Supabase authentication providing
  `user`, `isAuthenticated` and `sessionLoaded` state used throughout the app.
- **useKeyboardControls.js** – Manages global keyboard shortcuts for moving the
  listener and manipulating the currently selected sound source.

