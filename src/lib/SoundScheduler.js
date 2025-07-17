// SoundScheduler.js

/**
 * A standalone Scheduler class that manages timed playback of scheduled sound sources
 * from an AudioEngine instance. Each scheduled sound is played at a random interval
 * within its configured min/max gap, and only during its active playback window.
 */
export default class SoundScheduler {
  /**
   * @param {AudioEngine} audioEngine - a reference to the main AudioEngine instance
   */
  constructor(audioEngine) {
    this.audioEngine = audioEngine;

    // Map of active timeouts: key = sound's libraryId, value = timeout ID
    this.intervals = new Map();

    // Time when scheduling started, used to calculate relative play windows
    this.roomStartTime = null;

    this.pauseInfo = new Map(); // key = scheduleId, value = pause data

    // Track whether scheduling is currently paused so newly enabled schedules
    // can be started immediately when playback is active
    this.isPaused = true;

  }

  /**
   * Starts scheduling for all sound sources that have scheduling enabled.
   * This should be called when the room starts playing.
   */
  start() {
    this.roomStartTime = performance.now();
    this.isPaused = false;

    for (const wrapper of this.audioEngine.soundSources.value) {
      const src = wrapper.instance;
      if (src.state.schedule?.enabled) {
        src.state.schedule.paused = false;
        src.state.schedule.stopCurrentLoop = false;
        src.state.schedule.timesPlayed = 0; // reset play count
        this._schedule(src);
      }
    }
  }


  /**
   * Internal method: sets up a self-repeating timeout loop for a scheduled sound source.
   * Plays the sound if within the allowed time window, then re-schedules itself.
   * @param {SoundSource} source - the sound source with a scheduling config
   */
  _schedule(source) {
    const sched = source.state.schedule;
    const { id: scheduleId } = sched;

    sched.loopFn = null;
    sched.paused = false;
    sched.stopCurrentLoop = false;

    // Ensure pause info exists so pausing before the first loop works
    this.pauseInfo.set(scheduleId, {
      remainingGapMs: 0,
      isPaused: false,
      resumeTimer: null,
      queuedLoop: null,
    });

    const playAndWait = async () => {
      return new Promise((resolve) => {
        const el = source._audioElement;

        const cleanup = () => {
          el.removeEventListener('ended', onEnded);
          el.removeEventListener('pause', onPause);
        };

        const onEnded = () => {
          cleanup();
          resolve();
        };

        const onPause = () => {
          cleanup();
          resolve();
        };

        el.addEventListener('ended', onEnded);
        el.addEventListener('pause', onPause);

        sched.isPlaying = true;
        source.forcePlayFromStart();
      });
    };

      const loop = async () => {
        if (!sched.enabled) return;

        await playAndWait();
        sched.isPlaying = false;

        if (sched.stopCurrentLoop) {
          sched.stopCurrentLoop = false;
          return;
        }
        const now = (performance.now() - this.roomStartTime) / 1000;
        sched.lastPlayedAt = now;
      sched.timesPlayed = (sched.timesPlayed || 0) + 1;

      if (sched.enabled) {
        const min = sched.mode == "loop" ? 0 : sched.gapMin;
        const max = sched.mode == "loop" ? 0 : sched.gapMax;
        const nextGap = randomInRange(min, max) * 1000;

        const timeoutId = setTimeout(loop, nextGap);
        this.intervals.set(scheduleId, timeoutId);

        // Save the delay in case we need to pause later
        const info = this.pauseInfo.get(scheduleId) || {};
        info.remainingGapMs = nextGap;
        info.isPaused = false;
        info.resumeTimer = null;
        info.queuedLoop = loop;
        this.pauseInfo.set(scheduleId, info);
      }
      };

      const initInfo = this.pauseInfo.get(scheduleId);
      if (initInfo && !initInfo.queuedLoop) {
        initInfo.queuedLoop = loop;
      }

      sched.loopFn = loop;

      loop(); // kickoff
  }

  pause() {
    this.isPaused = true;
    for (const source of this.audioEngine.soundSources.value) {
      const sched = source.state.schedule;
      const { id } = sched;
      let info = this.pauseInfo.get(id);

      if (!sched.enabled) continue;
      if (!info) {
        info = { remainingGapMs: 0, isPaused: false, resumeTimer: null, queuedLoop: sched.loopFn || null };
        this.pauseInfo.set(id, info);
      }

      sched.paused = true;

      // Pause audio if it's currently playing
      if (sched.isPlaying) {
        source.instance._audioElement.pause();
        sched.isPlaying = false;
      }

      // Cancel upcoming loop timeout
      const timeoutId = this.intervals.get(id);
      if (timeoutId) {
        clearTimeout(timeoutId);

        // Save remaining delay time for resume
        const last = sched.lastPlayedAt ?? 0;
        const elapsed = performance.now() - (last * 1000 + this.roomStartTime);
        info.remainingGapMs = Math.max(0, info.remainingGapMs - elapsed);
        info.isPaused = true;
        this.intervals.delete(id);
      }
    }
  }

  resume() {
    this.isPaused = false;
    for (const source of this.audioEngine.soundSources.value) {
      const sched = source.state.schedule;
      const { id } = sched;
      const info = this.pauseInfo.get(id);

      if (!sched.enabled) continue;
      if (!info) {
        this._schedule(source);
        continue;
      }
      if (!info.isPaused) continue;

      sched.paused = false;
      sched.stopCurrentLoop = false;

      info.isPaused = false;

      // Resume loop after the remaining delay
      const resumeTimer = setTimeout(() => {
        info.queuedLoop();
      }, info.remainingGapMs);

      info.resumeTimer = resumeTimer;
      this.intervals.set(id, resumeTimer);
    }
  }

  /**
   * Pause scheduling for a single sound source.
   * Stores remaining delay and stops any pending loop.
   * @param {SoundSource} source
   */
  pauseSource(source) {
    const sched = source.state.schedule;
    const { id } = sched;
    let info = this.pauseInfo.get(id);

    if (!sched.enabled) return;
    if (!info) {
      info = { remainingGapMs: 0, isPaused: false, resumeTimer: null, queuedLoop: sched.loopFn || null };
      this.pauseInfo.set(id, info);
    }

    if (sched.isPlaying) {
      source._audioElement.pause();
      sched.isPlaying = false;
    }

    const timeoutId = this.intervals.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);

      const last = sched.lastPlayedAt ?? 0;
      const elapsed = performance.now() - (last * 1000 + this.roomStartTime);
      info.remainingGapMs = Math.max(0, info.remainingGapMs - elapsed);
      info.isPaused = true;
      this.intervals.delete(id);
    }

    sched.stopCurrentLoop = true;
    sched.paused = true;
  }

  /**
   * Resume scheduling for a single sound source that was paused.
   * @param {SoundSource} source
   */
  resumeSource(source) {
    const sched = source.state.schedule;
    const { id } = sched;
    const info = this.pauseInfo.get(id);

    if (!sched.enabled) return;

    if (!info) {
      this._schedule(source);
      return;
    }

    if (!info.isPaused) return;

    info.isPaused = false;
    sched.stopCurrentLoop = false;
    sched.paused = false;

    const resumeTimer = setTimeout(() => {
      if (info.queuedLoop) {
        info.queuedLoop();
      } else {
        this._schedule(source);
      }
    }, info.remainingGapMs);

    info.resumeTimer = resumeTimer;
    this.intervals.set(id, resumeTimer);
  }



  /**
   * Stops all active scheduling loops and clears their timers.
   * This should be called when the room stops or pauses.
   */
  stop() {
    this.isPaused = true;
    for (const id of this.intervals.values()) {
      clearTimeout(id);
    }
    this.intervals.clear();
  }

  /**
   * Updates the schedule for a given source (e.g., after the user changes settings).
   * Clears the old timeout and starts a fresh one with new settings.
   * @param {SoundSource} source - the updated sound source
   */
  updateSchedule(source) {
    const sched = source.state.schedule;
    const forceRestart = sched.restart;


    this.cancelSchedule(source); // stop any pending timers

    if (!forceRestart && sched.isPlaying) {
      // Defer restart until current audio finishes
      if (!sched.pendingUpdate) {
        sched.stopCurrentLoop = true;
        sched.pendingUpdate = true;

        const el = source._audioElement;
        const onEnded = () => {
          el.removeEventListener('ended', onEnded);
          sched.pendingUpdate = false;
          if (sched.enabled) {
            this._schedule(source);
          }
        };

        el.addEventListener('ended', onEnded);
      }
    } else if (sched.enabled) {
      this._schedule(source); // restart or start with new config
    }
  }

  /**
   * Cancels a specific sound's scheduling loop, if it exists.
   * @param {SoundSource} source - the sound source to cancel
   */
  cancelSchedule(source) {
    const sched = source.state.schedule;
    const id = this.intervals.get(sched?.id);
    if (id) {
      clearTimeout(id);
      this.intervals.delete(sched?.id);
    }

    const info = this.pauseInfo.get(sched?.id);
    if (info?.resumeTimer) {
      clearTimeout(info.resumeTimer);
    }
    // Reset any scheduling state so the sound can loop manually
    sched.stopCurrentLoop = true;
    sched.paused = false;
    sched.isPlaying = false;
    sched.loopFn = null;
    this.pauseInfo.delete(sched?.id);
  }
}

/**
 * Utility function: returns a random number between min and max (inclusive)
 * @param {number} min - minimum value
 * @param {number} max - maximum value
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}
