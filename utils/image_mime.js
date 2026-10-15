export function detectSupportedImageMime (buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return ''
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'image/png'
  const head = buffer.toString('ascii', 0, Math.min(buffer.length, 12))
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif'
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp'
  return ''
}

export function requireSupportedImage (buffer) {
  const mimeType = detectSupportedImageMime(buffer)
  if (!mimeType) throw new Error('不是受支持的图片')
  return { buffer, mimeType }
}

/** Read dimensions from supported image headers without a decoder dependency. */
export function getImageDimensions (buffer) {
  const dimensions = (width, height) => width > 0 && height > 0 ? { width, height } : null
  switch (detectSupportedImageMime(buffer)) {
    case 'image/png':
      return buffer.length >= 24 && buffer.toString('ascii', 12, 16) === 'IHDR'
        ? dimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20)) : null
    case 'image/gif':
      return buffer.length >= 10 ? dimensions(buffer.readUInt16LE(6), buffer.readUInt16LE(8)) : null
    case 'image/jpeg': {
      let offset = 2
      while (offset < buffer.length) {
        if (buffer[offset++] !== 0xff) return null
        while (buffer[offset] === 0xff) offset++
        if (offset >= buffer.length) return null
        const marker = buffer[offset++]
        if (marker === 0xd9 || marker === 0xda) return null
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue
        if (offset + 2 > buffer.length) return null
        const length = buffer.readUInt16BE(offset)
        if (length < 2 || offset + length > buffer.length) return null
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
          return length >= 8 ? dimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3)) : null
        }
        offset += length
      }
      return null
    }
    case 'image/webp': {
      // VP8X carries canvas dimensions, including animated WebP. Walk chunks
      // rather than assuming the first chunk contains the actual frame.
      for (let offset = 12; offset + 8 <= buffer.length;) {
        const type = buffer.toString('ascii', offset, offset + 4)
        const length = buffer.readUInt32LE(offset + 4)
        const data = offset + 8
        if (data + length > buffer.length) return null
        if (type === 'VP8X' && length >= 10) return dimensions(buffer.readUIntLE(data + 4, 3) + 1, buffer.readUIntLE(data + 7, 3) + 1)
        if (type === 'VP8 ' && length >= 10 && buffer.toString('hex', data + 3, data + 6) === '9d012a') {
          return dimensions(buffer.readUInt16LE(data + 6) & 0x3fff, buffer.readUInt16LE(data + 8) & 0x3fff)
        }
        if (type === 'VP8L' && length >= 5 && buffer[data] === 0x2f) {
          const bits = buffer.readUInt32LE(data + 1)
          return dimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1)
        }
        offset = data + length + (length % 2)
      }
      return null
    }
    default: return null
  }
}
