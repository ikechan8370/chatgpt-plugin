import assert from 'node:assert/strict'
import test from 'node:test'
import { getImageDimensions } from './image_mime.js'

test('JPEG dimensions survive metadata segments and baseline/progressive SOF markers', () => {
  for (const marker of [0xc0, 0xc2]) {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 6, 1, 2, 3, 4, 0xff, marker, 0, 11, 8, 0x23, 0x28, 0, 40, 1, 1, 0x11, 0])
    assert.deepEqual(getImageDimensions(jpeg), { width: 40, height: 9000 })
    for (let length = 0; length < jpeg.length; length++) assert.doesNotThrow(() => getImageDimensions(jpeg.subarray(0, length)))
    const invalid = Buffer.from(jpeg)
    invalid.writeUInt16BE(65535, 4)
    assert.equal(getImageDimensions(invalid), null)
  }
})

function webp (type, data) {
  const chunk = Buffer.alloc(8 + data.length + data.length % 2)
  chunk.write(type)
  chunk.writeUInt32LE(data.length, 4)
  data.copy(chunk, 8)
  const header = Buffer.alloc(12)
  header.write('RIFF')
  header.writeUInt32LE(chunk.length + 4, 4)
  header.write('WEBP', 8)
  return Buffer.concat([header, chunk])
}

test('WebP lossy, lossless, and extended canvas dimensions are recognized', () => {
  const extended = Buffer.alloc(10)
  extended[0] = 2 // animation flag; canvas can be larger than its frames
  extended.writeUIntLE(8999, 4, 3)
  extended.writeUIntLE(19, 7, 3)
  const lossy = Buffer.from([0, 0, 0, 0x9d, 1, 0x2a, 0x28, 0x23, 20, 0])
  const lossless = Buffer.alloc(5)
  lossless[0] = 0x2f
  lossless.writeUInt32LE((8999 | (19 << 14)) >>> 0, 1)
  for (const buffer of [webp('VP8X', extended), webp('VP8 ', lossy), webp('VP8L', lossless)]) {
    assert.deepEqual(getImageDimensions(buffer), { width: 9000, height: 20 })
    for (let length = 0; length < buffer.length; length++) assert.doesNotThrow(() => getImageDimensions(buffer.subarray(0, length)))
  }
})

test('unrecognized, truncated, and zero-dimension headers return null', () => {
  for (const buffer of [Buffer.alloc(0), Buffer.from('not an image'), Buffer.from('GIF89a'), Buffer.from('GIF89a\0\0\0\0')]) {
    assert.equal(getImageDimensions(buffer), null)
  }
})
