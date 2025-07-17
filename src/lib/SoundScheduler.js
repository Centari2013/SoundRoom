// SoundScheduler.js

/**
 * Scheduler for interval-based sound playback.
 * Handles play/pause/resume for multiple SoundSource instances.
 */
export default class SoundScheduler {
  /**
   * @param {import('./AudioEngine').default} audioEngine
   */
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.timers = new Map();
    this.pauseInfo = new Map(); // scheduleId -> {remainingMs, expectedTime, loop, isPaused}
    this.roomStartTime = null;
    this.isPaused = true;
    this._stopped = true;
  }

  /** Start scheduling for all enabled sources */
  start() {
    this.roomStartTime = performance.now();
    this.isPaused = false;
    this._stopped = false;
    for (const wrapper of this.audioEngine.soundSources.value) {
      const src = wrapper.instance;
      if (src.state.schedule?.enabled) {
        const sched = src.state.schedule;
        sched.timesPlayed = 0;
        sched.paused = false;
        this._schedule(src, 0);
      }
    }
  }

  /** Internal helper to schedule a single source */
  _schedule(source, delayMs = 0) {
    if (this._stopped) return;
    const sched = source.state.schedule;
    const scheduleId = sched.id;

    const run = async () => {
      if (this._stopped || !sched.enabled) return;
      const nowSec = (performance.now() - this.roomStartTime) / 1000;
      const within = (sched.activeStart === null && sched.activeEnd === null) || (nowSec >= sched.activeStart && nowSec <= sched.activeEnd);
      const countOk = sched.count == null || sched.timesPlayed < sched.count;

      if (within && countOk) {
        await this._playAndWait(source);
        if (this._stopped) return;
        sched.timesPlayed++;
        sched.lastPlayedAt = nowSec;
      }

      if (this._stopped || !sched.enabled) return;
      if (countOk && (sched.activeEnd === null || nowSec <= sched.activeEnd)) {
        const nextGap = sched.mode === 'loop' ? 0 : randomInRange(sched.gapMin, sched.gapMax) * 1000;
        this._schedule(source, nextGap);
      }
    };

    const timeoutId = setTimeout(run, delayMs);
    this.timers.set(scheduleId, timeoutId);
    this.pauseInfo.set(scheduleId, {
      remainingMs: delayMs,
      expectedTime: performance.now() + delayMs,
      loop: run,
      isPaused: false,
    });
  }

  /** Play audio and wait for it to finish */
  async _playAndWait(source) {
    return new Promise((resolve) => {
      const el = source._audioElement;
      const cleanup = () => {
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('pause', onPause);
        resolve();
      };
      const onEnded = () => cleanup();
      const onPause = () => cleanup();
      el.addEventListener('ended', onEnded);
      el.addEventListener('pause', onPause);
      source.forcePlayFromStart();
    });
  }

  /** Pause all scheduled sounds */
  pause() {
    if (this.isPaused) return;
    this.isPaused = true;
    for (const wrapper of this.audioEngine.soundSources.value) {
      this.pauseSource(wrapper.instance);
    }
  }

  /** Resume all scheduled sounds */
  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    for (const wrapper of this.audioEngine.soundSources.value) {
      this.resumeSource(wrapper.instance);
    }
  }

  /** Pause a single source */
  pauseSource(source) {
    const sched = source.state.schedule;
    if (!sched.enabled) return;
    const id = sched.id;
    const timer = this.timers.get(id);
    let info = this.pauseInfo.get(id);
    if (!info) {
      info = { remainingMs: 0, expectedTime: performance.now(), loop: null, isPaused: false };
    }
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      info.remainingMs = Math.max(0, info.expectedTime - performance.now());
    }
    info.isPaused = true;
    this.pauseInfo.set(id, info);
    if (sched.isPlaying) {
      source._audioElement.pause();
      sched.isPlaying = false;
    }
    sched.paused = true;
  }

  /** Resume a single paused source */
  resumeSource(source) {
    const sched = source.state.schedule;
    if (!sched.enabled) return;
    const id = sched.id;
    const info = this.pauseInfo.get(id);
    if (!info) {
      this._schedule(source, 0);
      return;
    }
    if (!info.isPaused) return;
    const timeoutId = setTimeout(info.loop || (() => this._schedule(source, 0)), info.remainingMs);
    info.expectedTime = performance.now() + info.remainingMs;
    info.isPaused = false;
    this.timers.set(id, timeoutId);
    this.pauseInfo.set(id, info);
    sched.paused = false;
  }

  /** Completely stop scheduling */
  stop() {
    this.isPaused = true;
    this._stopped = true;
    for (const id of this.timers.values()) {
      clearTimeout(id);
    }
    this.timers.clear();
    this.pauseInfo.clear();
  }

  /** Update schedule settings for a sound */
  updateSchedule(source) {
    this.cancelSchedule(source);
    if (source.state.schedule?.enabled && !this._stopped) {
      this._schedule(source, 0);
    }
  }

  /** Cancel scheduling for a sound */
  cancelSchedule(source) {
    const sched = source.state.schedule;
    const id = sched.id;
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.pauseInfo.delete(id);
    sched.paused = false;
    sched.isPlaying = false;
  }
}

function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}
