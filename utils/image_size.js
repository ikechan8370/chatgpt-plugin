import { detectSupportedImageMime } from './image_mime.js'
import { createSemaphore } from './concurrency.js'
import { compressImageOnCanvas } from './image_canvas.js'

const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024
const withCompressionPermit = createSemaphore(() => 1)

export function resolveMaxImageSize (value) {
  const size = Number(value)
  return Number.isFinite(size) && size >= 1 ? Math.floor(size) : DEFAULT_MAX_IMAGE_SIZE
}

/** Keep originals in the image cache; only compress the copy sent to the model. */
export async function compressImageBuffer (buffer, maxImageSize) {
  const limit = resolveMaxImageSize(maxImageSize)
  const mimeType = detectSupportedImageMime(buffer)
  if (buffer.length <= limit) return { buffer, mimeType }

  return withCompressionPermit(async () => {
    // Reuse Yunzai's configured browser, including its executable/remote settings.
    // Import lazily so ordinary messages do not initialise the renderer.
    const { default: hostRenderer } = await import('../../../lib/puppeteer/puppeteer.js')
    // Newer Miao-Yunzai can export the renderer loader or another default backend.
    let renderer = hostRenderer?.renderers?.get('puppeteer') || hostRenderer
    if (!renderer?.browser && typeof renderer?.browserInit !== 'function') {
      const { default: loader } = await import('../../../lib/renderer/loader.js')
      renderer = loader.getRenderer('puppeteer')
    }
    // A concurrent screenshot may already be starting the shared browser.
    for (let i = 0; renderer.lock && !renderer.browser && i < 300; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    const browser = renderer.browser || await renderer.browserInit?.()
    if (!browser?.newPage) throw new Error('图片压缩失败：云崽 Puppeteer 浏览器不可用，请检查截图功能')
    const page = await browser.newPage()
    let timeout
    try {
      const dataUrl = `data:${mimeType || 'application/octet-stream'};base64,${buffer.toString('base64')}`
      const base64 = await Promise.race([
        page.evaluate(compressImageOnCanvas, dataUrl, limit),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('图片压缩超时')), 30000)
        })
      ])
      const output = Buffer.from(base64, 'base64')
      if (output.length > limit) throw new Error('图片压缩失败：压缩结果超过大小上限')
      globalThis.logger?.debug?.(`[Vision] 图片压缩: ${buffer.length} -> ${output.length} bytes (上限 ${limit})`)
      return { buffer: output, mimeType: 'image/jpeg' }
    } finally {
      clearTimeout(timeout)
      await page.close().catch(() => {})
    }
  })
}

/** Accept Chaite's raw base64 and data URLs; leave remote URLs to the adapter. */
export async function limitImageContent (item, maxImageSize) {
  if (item?.type !== 'image' || typeof item.image !== 'string') return item
  if (/^https?:\/\//i.test(item.image)) return item
  const data = item.image.replace(/^data:[^,]*;base64,/i, '').replace(/^base64:\/\//i, '')
  if (Buffer.byteLength(data, 'base64') <= resolveMaxImageSize(maxImageSize)) return item
  const result = await compressImageBuffer(Buffer.from(data, 'base64'), maxImageSize)
  return {
    ...item,
    image: result.buffer.toString('base64'),
    mimeType: result.mimeType,
    // Preserve routing rules such as forceImageRefMimes after conversion to JPEG.
    originalMimeType: item.originalMimeType || detectSupportedImageMime(Buffer.from(data.slice(0, 32), 'base64')) || item.mimeType
  }
}
