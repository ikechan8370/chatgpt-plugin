/**
 * Detect image data without running a regular expression over a potentially
 * multi-megabyte Base64 payload. V8's regexp engine can overflow its own stack
 * on very long strings, especially when an invalid character occurs near the
 * end of the input.
 *
 * This intentionally preserves the previous permissive behaviour for raw
 * Base64 strings: one or more alphabet characters followed by at most two
 * padding characters.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isBase64Image (value) {
  if (!value || typeof value !== 'string') return false
  if (value.startsWith('data:image/')) return true

  let contentEnd = value.length
  if (value.charCodeAt(contentEnd - 1) === 61) contentEnd-- // =
  if (contentEnd > 0 && value.charCodeAt(contentEnd - 1) === 61) contentEnd--
  if (contentEnd === 0) return false

  for (let index = 0; index < contentEnd; index++) {
    const code = value.charCodeAt(index)
    const isBase64Character =
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      (code >= 48 && code <= 57) ||
      code === 43 ||
      code === 47
    if (!isBase64Character) return false
  }

  for (let index = contentEnd; index < value.length; index++) {
    if (value.charCodeAt(index) !== 61) return false
  }
  return true
}
