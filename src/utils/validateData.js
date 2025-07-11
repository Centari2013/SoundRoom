/**
 * Validate that a string resembles an email address.
 *
 * @param {string} email - email address to check
 * @returns {boolean} `true` if the email is valid
 */
export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Validate password complexity requirements.
 *
 * @param {string} password - password string to verify
 * @returns {{isValid:boolean, errors:Object}} validation result and error flags
 */
export function validatePassword(password) {
  const minLength = 8
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)

  const isValid =
    password.length >= minLength &&
    hasLowercase &&
    hasUppercase &&
    hasDigit &&
    hasSymbol

  return {
    isValid,
    errors: {
      tooShort: password.length < minLength,
      missingLowercase: !hasLowercase,
      missingUppercase: !hasUppercase,
      missingDigit: !hasDigit,
      missingSymbol: !hasSymbol,
    },
  }
}
