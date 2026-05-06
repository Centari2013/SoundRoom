import { describe, expect, it, vi } from 'vitest'
import { ALLOWED_AUDIO_TYPES, getFileDuration, stripExtension } from '@/utils/audioFileUtils'

describe('audioFileUtils', () => {
  it.each([
    ['rain.wav', 'rain'],
    ['field.recording.v1.mp3', 'field.recording.v1'],
    ['no-extension', 'no-extension'],
    ['archive.tar.gz', 'archive.tar'],
  ])('strips only the final extension from %s', (input, expected) => {
    expect(stripExtension(input)).toBe(expected)
  })

  it('declares the audio MIME types the upload flow accepts', () => {
    expect(ALLOWED_AUDIO_TYPES).toEqual(expect.arrayContaining([
      'audio/wav',
      'audio/mpeg',
      'audio/ogg',
      'audio/webm',
    ]))
  })

  it('decodes a file through AudioContext and closes the context', async () => {
    const close = vi.fn()
    const decodeAudioData = vi.fn(async () => ({ duration: 12.5 }))
    global.AudioContext = vi.fn(() => ({ decodeAudioData, close }))
    const file = new Blob(['audio'])
    const duration = await getFileDuration(file)

    expect(duration).toBe(12.5)
    expect(decodeAudioData).toHaveBeenCalledWith(expect.any(ArrayBuffer))
    expect(close).toHaveBeenCalledOnce()
  })
})
