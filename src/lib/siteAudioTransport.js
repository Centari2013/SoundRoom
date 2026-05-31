const SITE_MEDIA_METADATA = {
  title: 'SoundRoom',
  artist: 'Various',
  album: 'SoundRoom Noise',
  artwork: [{ src: 'SoundRoom.png', sizes: '512x512', type: 'image/png' }],
}

const audioTargets = new Set()
let handlersInstalled = false
let pausedNativeMediaElements = new Set()
let transportElement = null
let transportSourceUrl = null
let transportSyncing = false

const TRANSPORT_ATTRIBUTE = 'data-soundroom-media-transport'

function hasMediaSession() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

function setMediaMetadata() {
  if (!hasMediaSession() || typeof MediaMetadata === 'undefined') return

  try {
    navigator.mediaSession.metadata = new MediaMetadata(SITE_MEDIA_METADATA)
  } catch (err) {
    console.warn('Unable to set media session metadata:', err)
  }
}

function getNativeMediaElements() {
  if (typeof document === 'undefined') return []
  return Array.from(document.querySelectorAll('audio, video'))
    .filter(el => !isTransportMediaElement(el))
}

function isTransportMediaElement(el) {
  return el?.getAttribute?.(TRANSPORT_ATTRIBUTE) === 'true'
}

function isNativeMediaPlaying(el) {
  return !el.paused && !el.ended
}

function pauseNativeMediaElements() {
  const pausedElements = new Set()

  for (const el of getNativeMediaElements()) {
    if (!isNativeMediaPlaying(el)) continue

    pausedElements.add(el)
    try {
      el.pause()
    } catch (err) {
      console.warn('Unable to pause native media element:', err)
    }
  }

  if (pausedElements.size > 0) {
    pausedNativeMediaElements = pausedElements
  }

  return pausedElements.size > 0
}

async function resumeNativeMediaElements() {
  const elements = Array.from(pausedNativeMediaElements)
  pausedNativeMediaElements = new Set()

  let resumed = false
  for (const el of elements) {
    if (!el.isConnected) continue

    try {
      await el.play()
      resumed = true
    } catch (err) {
      console.warn('Unable to resume native media element:', err)
    }
  }

  return resumed
}

function anyRegisteredAudioPlaying() {
  for (const target of audioTargets) {
    try {
      if (typeof target.isPlaying === 'function' && target.isPlaying()) return true
    } catch (err) {
      console.warn('Unable to read registered audio target state:', err)
    }
  }

  return false
}

function anyNativeMediaPlaying() {
  return getNativeMediaElements().some(isNativeMediaPlaying)
}

function createSilentWavUrl() {
  if (typeof Blob === 'undefined' || typeof URL === 'undefined') return null

  const sampleRate = 8000
  const durationSeconds = 0.25
  const sampleCount = Math.floor(sampleRate * durationSeconds)
  const bytesPerSample = 2
  const dataSize = sampleCount * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeAscii(offset, text) {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 8 * bytesPerSample, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataSize, true)

  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

function getTransportElement() {
  if (typeof document === 'undefined' || !document.body) return null
  if (transportElement?.isConnected) return transportElement

  const el = document.createElement('audio')
  const silentUrl = transportSourceUrl ?? createSilentWavUrl()
  if (!silentUrl) return null

  transportSourceUrl = silentUrl
  transportElement = el

  el.setAttribute(TRANSPORT_ATTRIBUTE, 'true')
  el.preload = 'auto'
  el.loop = true
  el.controls = false
  el.src = silentUrl
  el.style.display = 'none'

  el.addEventListener('pause', () => {
    if (transportSyncing) return
    if (anyRegisteredAudioPlaying() || anyNativeMediaPlaying()) {
      pauseSiteAudioForMediaSession()
    }
  })

  el.addEventListener('play', () => {
    if (transportSyncing) return
    void resumeSiteAudioFromMediaSession()
  })

  document.body.appendChild(el)
  return el
}

function ensureTransportPlaying() {
  const el = getTransportElement()
  if (!el || !el.paused) return

  transportSyncing = true
  try {
    const playPromise = el.play()
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(
        () => { transportSyncing = false },
        err => {
          transportSyncing = false
          console.warn('Unable to activate media-key transport:', err)
        }
      )
    } else {
      transportSyncing = false
    }
  } catch (err) {
    transportSyncing = false
    console.warn('Unable to activate media-key transport:', err)
  }
}

function ensureTransportPaused() {
  const el = transportElement
  if (!el || el.paused) return

  transportSyncing = true
  try {
    el.pause()
  } catch (err) {
    console.warn('Unable to pause media-key transport:', err)
  } finally {
    globalThis.setTimeout(() => {
      transportSyncing = false
    }, 0)
  }
}

function syncTransportWithPlaybackState(isPlaying) {
  if (isPlaying) {
    ensureTransportPlaying()
  } else {
    ensureTransportPaused()
  }
}

function setMediaActionHandler(action, handler) {
  try {
    navigator.mediaSession.setActionHandler(action, handler)
  } catch (err) {
    console.warn(`Unable to set media session ${action} handler:`, err)
  }
}

export function updateSiteAudioPlaybackState() {
  const isPlaying = anyRegisteredAudioPlaying() || anyNativeMediaPlaying()
  syncTransportWithPlaybackState(isPlaying)

  if (!hasMediaSession()) return

  navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
}

export function pauseSiteAudioForMediaSession() {
  let pausedAny = false

  for (const target of audioTargets) {
    if (typeof target.pauseForMediaSession !== 'function') continue

    try {
      pausedAny = target.pauseForMediaSession() || pausedAny
    } catch (err) {
      console.warn('Unable to pause registered audio target:', err)
    }
  }

  pausedAny = pauseNativeMediaElements() || pausedAny
  updateSiteAudioPlaybackState()
  return pausedAny
}

export async function resumeSiteAudioFromMediaSession() {
  let resumedAny = false

  for (const target of audioTargets) {
    if (typeof target.resumeFromMediaSession !== 'function') continue

    try {
      resumedAny = await target.resumeFromMediaSession() || resumedAny
    } catch (err) {
      console.warn('Unable to resume registered audio target:', err)
    }
  }

  resumedAny = await resumeNativeMediaElements() || resumedAny
  updateSiteAudioPlaybackState()
  return resumedAny
}

export function installSiteMediaSessionHandlers() {
  if (handlersInstalled) return

  handlersInstalled = true

  if (hasMediaSession() && typeof navigator.mediaSession.setActionHandler === 'function') {
    setMediaMetadata()

    setMediaActionHandler('play', () => {
      void resumeSiteAudioFromMediaSession()
    })

    setMediaActionHandler('pause', () => {
      pauseSiteAudioForMediaSession()
    })

    setMediaActionHandler('stop', () => {
      pauseSiteAudioForMediaSession()
    })
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('play', updateSiteAudioPlaybackState, true)
    document.addEventListener('pause', updateSiteAudioPlaybackState, true)
    document.addEventListener('ended', updateSiteAudioPlaybackState, true)

    // iOS suspends the AudioContext when the tab/app goes to background.
    // On return, kick the silent transport audio and every registered target
    // so the AudioContext resumes without requiring another user gesture.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return

      // Re-kick the silent looping element — this is the iOS trick that
      // keeps the audio session alive across app switches.
      const transport = getTransportElement()
      if (transport && transport.paused && anyRegisteredAudioPlaying()) {
        transport.play().catch(() => {})
      }

      // Resume any suspended AudioContexts for each registered target.
      for (const target of audioTargets) {
        try {
          const ctx = typeof target.getAudioContext === 'function'
            ? target.getAudioContext()
            : null
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {})
          }
        } catch (_) {}
      }
    })
  }
}

export function registerSiteAudioTarget(target) {
  audioTargets.add(target)
  installSiteMediaSessionHandlers()
  updateSiteAudioPlaybackState()

  return () => {
    audioTargets.delete(target)
    updateSiteAudioPlaybackState()
  }
}
