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
  }

  /**
   * Starts scheduling for all sound sources that have scheduling enabled.
   * This should be called when the room starts playing.
   */
  start() {
    this.roomStartTime = performance.now();

    for (const source of this.audioEngine.soundSources) {
      if (source.state.schedule?.enabled) {
        source.state.schedule.timesPlayed = 0; // reset play count
        this._schedule(source);
      }
    }
  }


  /**
   * Internal method: sets up a self-repeating timeout loop for a scheduled sound source.
   * Plays the sound if within the allowed time window, then re-schedules itself.
   * @param {SoundSource} source - the sound source with a scheduling config
   */
  _schedule(source) {
    const loop = () => {
      const now = (performance.now() - this.roomStartTime) / 1000;
      const sched = source.state.schedule;
      const { activeStart, activeEnd, gapMin, gapMax, count, mode, id: scheduleId } = sched;

      const withinWindow = now >= activeStart && now <= activeEnd;
      const canStillPlay = count == null || sched.timesPlayed < count;

      if (sched.enabled && withinWindow && canStillPlay) {
        this.audioEngine.playSound(source);
        sched.lastPlayedAt = now;
        sched.timesPlayed = (sched.timesPlayed || 0) + 1;
      }

      if (sched.enabled && canStillPlay) {
        const nextGap = mode === "loop" ? 0 : randomInRange(gapMin, gapMax) * 1000;
        const id = setTimeout(loop, nextGap);
        this.intervals.set(scheduleId, id);
      }
    };

    loop();
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
    this.cancelSchedule(source); // stop current schedule if any
    if (source.schedule?.enabled) {
      this._schedule(source); // restart with new config
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
