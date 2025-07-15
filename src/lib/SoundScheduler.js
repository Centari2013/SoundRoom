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

  }

  /**
   * Starts scheduling for all sound sources that have scheduling enabled.
   * This should be called when the room starts playing.
   */
  start() {
    this.roomStartTime = performance.now();

    for (const wrapper of this.audioEngine.soundSources.value) {
      const src = wrapper.instance;
      if (src.state.schedule?.enabled) {
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

    const playAndWait = async () => {
      return new Promise((resolve) => {
        const el = source._audioElement;

        const onEnded = () => {
          el.removeEventListener('ended', onEnded);
          resolve();
        };

        el.addEventListener('ended', onEnded);

        sched.isPlaying = true;
        source.forcePlayFromStart();
      });
    };

    const loop = async () => {
      const now = (performance.now() - this.roomStartTime) / 1000;
      if (!sched.enabled) return;

      await playAndWait();
      sched.isPlaying = false;

      if (sched.stopCurrentLoop) {
        sched.stopCurrentLoop = false;
        return;
      }

      sched.lastPlayedAt = now;
      sched.timesPlayed = (sched.timesPlayed || 0) + 1;

      if (sched.enabled) {
        const min = sched.mode == "loop" ? 0 : sched.gapMin;
        const max = sched.mode == "loop" ? 0 : sched.gapMax;
        const nextGap = randomInRange(min, max) * 1000;

        const timeoutId = setTimeout(loop, nextGap);
        this.intervals.set(scheduleId, timeoutId);

        // Save the delay in case we need to pause later
        this.pauseInfo.set(scheduleId, {
          remainingGapMs: nextGap,
          isPaused: false,
          resumeTimer: null,
          queuedLoop: loop,
        });
      }
    };

    loop(); // kickoff
  }

  pause() {
    for (const source of this.audioEngine.soundSources.value) {
      const sched = source.state.schedule;
      const { id } = sched;
      const info = this.pauseInfo.get(id);

      if (!sched.enabled || !info) continue;

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
        const elapsed = performance.now() - (sched.lastPlayedAt * 1000 + this.roomStartTime);
        info.remainingGapMs = Math.max(0, info.remainingGapMs - elapsed);
        info.isPaused = true;
        this.intervals.delete(id);
      }
    }
  }

  resume() {
    for (const source of this.audioEngine.soundSources.value) {
      const sched = source.state.schedule;
      const { id } = sched;
      const info = this.pauseInfo.get(id);

      if (!sched.enabled || !info || !info.isPaused) continue;

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
   * Stops all active scheduling loops and clears their timers.
   * This should be called when the room stops or pauses.
   */
  stop() {
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

    console.log(sched)

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
    const id = this.intervals.get(source.state.schedule?.id);
    if (id) {
      clearTimeout(id);
      this.intervals.delete(source.state.schedule?.id);
    }
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
