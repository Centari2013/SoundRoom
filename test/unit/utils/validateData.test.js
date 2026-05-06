import { describe, expect, it } from 'vitest'
import { validateEmail, validatePassword } from '@/utils/validateData'

describe('validateData', () => {
  describe('validateEmail', () => {
    it.each([
      'person@example.com',
      'first.last+tag@soundroom.live',
      'UPPER@EXAMPLE.IO',
    ])('accepts valid email %s', (email) => {
      expect(validateEmail(email)).toBe(true)
    })

    it.each([
      '',
      'missing-at.example.com',
      'missing-domain@',
      '@missing-local.com',
      'has space@example.com',
      'person@example',
    ])('rejects invalid email %s', (email) => {
      expect(validateEmail(email)).toBe(false)
    })
  })

  describe('validatePassword', () => {
    it('accepts passwords meeting every complexity rule', () => {
      expect(validatePassword('SoundRoom1!')).toEqual({
        isValid: true,
        errors: {
          tooShort: false,
          missingLowercase: false,
          missingUppercase: false,
          missingDigit: false,
          missingSymbol: false,
        },
      })
    })

    it('reports all missing password requirements independently', () => {
      expect(validatePassword('short')).toEqual({
        isValid: false,
        errors: {
          tooShort: true,
          missingLowercase: false,
          missingUppercase: true,
          missingDigit: true,
          missingSymbol: true,
        },
      })
    })
  })
})
