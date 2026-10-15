/** Runs inside Chromium via page.evaluate; must not reference Node globals. */
export async function compressImageOnCanvas (dataUrl, limit) {
  const response = await fetch(dataUrl)
  // ImageBitmap decodes a static frame, including for animated GIF/WebP inputs.
  const image = await createImageBitmap(await response.blob())
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    // Stay within browser canvas limits and avoid huge intermediate canvases.
    const initialScale = Math.min(1, 8192 / image.width, 8192 / image.height,
      Math.sqrt(16 * 1024 * 1024 / (image.width * image.height)))
    let width = Math.max(1, Math.floor(image.width * initialScale))
    let height = Math.max(1, Math.floor(image.height * initialScale))
    for (;;) {
      canvas.width = width
      canvas.height = height
      // JPEG has no alpha channel; use white rather than black for transparency.
      context.fillStyle = '#fff'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      let size
      for (const quality of [0.85, 0.65, 0.45]) {
        const encoded = canvas.toDataURL('image/jpeg', quality)
        if (!encoded.startsWith('data:image/jpeg;base64,')) throw new Error('浏览器无法编码 JPEG 图片')
        const base64 = encoded.slice(encoded.indexOf(',') + 1)
        size = base64.length * 3 / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0)
        if (size <= limit) return base64
      }
      if (width === 1 && height === 1) {
        throw new Error(`图片压缩后仍超过 vision.maxImageSize (${limit} bytes)，请调大图片大小上限`)
      }
      const scale = Math.min(0.8, Math.sqrt(limit / size) * 0.9)
      width = Math.max(1, Math.floor(width * scale))
      height = Math.max(1, Math.floor(height * scale))
    }
  } finally {
    image.close()
  }
}
