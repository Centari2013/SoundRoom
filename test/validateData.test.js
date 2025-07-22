import { describe, it, expect } from 'vitest'
import { validateEmail, validatePassword } from '../src/utils/validateData.js'

describe('validateEmail', () => {
  it('returns true for valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  it('returns false for invalid email', () => {
    expect(validateEmail('not-an-email')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('validates a complex password', () => {
    const { isValid, errors } = validatePassword('Abcdef1!')
    expect(isValid).toBe(true)
    expect(errors.tooShort).toBe(false)
    expect(errors.missingLowercase).toBe(false)
    expect(errors.missingUppercase).toBe(false)
    expect(errors.missingDigit).toBe(false)
    expect(errors.missingSymbol).toBe(false)
  })

  it('returns error flags for missing requirements', () => {
    const { isValid, errors } = validatePassword('abc')
    expect(isValid).toBe(false)
    expect(errors.tooShort).toBe(true)
    expect(errors.missingLowercase).toBe(false)
    expect(errors.missingUppercase).toBe(true)
    expect(errors.missingDigit).toBe(true)
    expect(errors.missingSymbol).toBe(true)
  })
})
