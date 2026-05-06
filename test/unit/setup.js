import { vi } from 'vitest'

// Stub URL methods not available in happy-dom
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url-' + Math.random())
global.URL.revokeObjectURL = vi.fn()

function audioParam(value = 0) {
  return {
    value,
    setValueAtTime: vi.fn(function setValueAtTime(nextValue) {
      this.value = nextValue
      return this
    }),
    setTargetAtTime: vi.fn(function setTargetAtTime(nextValue) {
      this.value = nextValue
      return this
    }),
  }
}

function audioNode(extra = {}) {
  const node = {
    connect: vi.fn((target) => target ?? node),
    disconnect: vi.fn(),
    ...extra,
  }
  return node
}

// Stub Web Audio API; tests that need specific behavior can override locally.
global.AudioContext = vi.fn(() => ({
  createGain: vi.fn(() => audioNode({ gain: audioParam(1) })),
  createDelay: vi.fn(() => audioNode({ delayTime: audioParam(0) })),
  createStereoPanner: vi.fn(() => audioNode({ pan: audioParam(0) })),
  createPanner: vi.fn(() => audioNode({
    positionX: audioParam(0),
    positionY: audioParam(0),
    positionZ: audioParam(0),
    orientationX: audioParam(1),
    orientationY: audioParam(0),
    orientationZ: audioParam(0),
    setPosition: vi.fn(),
  })),
  createConvolver: vi.fn(() => audioNode()),
  createBiquadFilter: vi.fn(() => audioNode({
    frequency: audioParam(0),
    type: 'lowpass',
  })),
  createDynamicsCompressor: vi.fn(() => audioNode({
    threshold: audioParam(0),
    knee: audioParam(0),
    ratio: audioParam(0),
    attack: audioParam(0),
    release: audioParam(0),
  })),
  createBufferSource: vi.fn(() => audioNode({
    buffer: null,
    onended: null,
    start: vi.fn(),
    stop: vi.fn(),
  })),
  decodeAudioData: vi.fn(async () => ({ duration: 1 })),
  close: vi.fn(),
  resume: vi.fn(),
  listener: {
    setPosition: vi.fn(),
    setOrientation: vi.fn(),
  },
  destination: {},
  state: 'suspended',
  currentTime: 0,
}))

// Stub navigator.storage.estimate
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({ usage: 1024 * 1024, quota: 1024 * 1024 * 100 }),
  },
  configurable: true,
})

// Stub performance.now if not available
if (typeof performance === 'undefined') {
  global.performance = { now: vi.fn(() => Date.now()) }
}
