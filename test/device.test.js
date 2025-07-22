import { describe, it, expect, beforeEach } from 'vitest'
import { isMobileBrowser } from '../src/utils/device.js'

beforeEach(() => {
  global.navigator = {
    userAgent: '',
    vendor: ''
  }
})

describe('isMobileBrowser', () => {
  it('detects a mobile user agent', () => {
    navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1'
    expect(isMobileBrowser()).toBe(true)
  })

  it('returns false for desktop user agents', () => {
    navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    expect(isMobileBrowser()).toBe(false)
  })
})
