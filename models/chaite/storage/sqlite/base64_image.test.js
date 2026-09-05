import test from 'node:test'
import assert from 'node:assert/strict'
import { isBase64Image } from './base64_image.js'

test('recognizes data URLs and raw Base64 with compatible padding rules', () => {
  assert.equal(isBase64Image('data:image/png;base64,AAAA'), true)
  assert.equal(isBase64Image('YWJjZA=='), true)
  assert.equal(isBase64Image('YWJjZA='), true)
  assert.equal(isBase64Image('YWJjZA'), true)
  assert.equal(isBase64Image('https://example.com/image.png'), false)
  assert.equal(isBase64Image('YWJj=ZA'), false)
  assert.equal(isBase64Image('==='), false)
})

test('handles multi-megabyte image strings without overflowing the call stack', () => {
  const largeBase64 = 'A'.repeat(8 * 1024 * 1024)
  assert.equal(isBase64Image(largeBase64), true)
  assert.equal(isBase64Image(`${largeBase64}!`), false)
})
