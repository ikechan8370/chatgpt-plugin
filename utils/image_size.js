import { detectSupportedImageMime, getImageDimensions } from './image_mime.js'
import { createSemaphore } from './concurrency.js'
import { compressImageOnCanvas } from './image_canvas.js'

const DEFAULT_MAX_IMAGE_SIZE = 10 * 1024 * 1024
const DEFAULT_MAX_IMAGE_DIMENSION = 8000
const withCompressionPermit = createSemaphore(() => 1)

export function resolveMaxImageSize (value) {
  const size = Number(value)
  return Number.isFinite(size) && size >= 1 ? Math.floor(size) : DEFAULT_MAX_IMAGE_SIZE
}

export function resolveMaxImageDimension (value) {
  const size = Number(value)
  return Number.isFinite(size) && size >= 1 ? Math.min(Math.floor(size), DEFAULT_MAX_IMAGE_DIMENSION) : DEFAULT_MAX_IMAGE_DIMENSION
}

function fitsDimensions (buffer, maxDimension) {
  const size = getImageDimensions(buffer)
  return size && size.width <= maxDimension && size.height <= maxDimension
}

/** Keep originals in the image cache; only compress the copy sent to the model. */
export async function compressImageBuffer (buffer, maxImageSize, maxImageDimension) {
  const limit = resolveMaxImageSize(maxImageSize)
  const maxDimension = resolveMaxImageDimension(maxImageDimension)
  const mimeType = detectSupportedImageMime(buffer)
  if (buffer.length <= limit && fitsDimensions(buffer, maxDimension)) return { buffer, mimeType }

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
        page.evaluate(compressImageOnCanvas, dataUrl, limit, maxDimension),
        new Promise((resolve, reject) => {
          timeout = setTimeout(() => reject(new Error('图片压缩超时')), 30000)
        })
      ])
      const output = Buffer.from(base64, 'base64')
      if (output.length > limit) throw new Error('图片压缩失败：压缩结果超过大小上限')
      if (!fitsDimensions(output, maxDimension)) throw new Error('图片缩放失败：输出尺寸超过像素边长上限')
      globalThis.logger?.debug?.(`[Vision] 图片压缩: ${buffer.length} -> ${output.length} bytes (上限 ${limit})`)
      return { buffer: output, mimeType: 'image/jpeg' }
    } finally {
      clearTimeout(timeout)
      await page.close().catch(() => {})
    }
  })
}

/** Accept Chaite's raw base64 and data URLs; leave remote URLs to the adapter. */
export async function limitImageContent (item, maxImageSize, maxImageDimension) {
  if (item?.type !== 'image' || typeof item.image !== 'string') return item
  if (/^https?:\/\//i.test(item.image)) return item
  const data = item.image.replace(/^data:[^,]*;base64,/i, '').replace(/^base64:\/\//i, '').replace(/\s/g, '')
  const limit = resolveMaxImageSize(maxImageSize)
  const maxDimension = resolveMaxImageDimension(maxImageDimension)
  const buffer = Buffer.from(data, 'base64')
  // Gateways may count the base64 field itself (about 4/3 of the file size).
  // Bound both representations to avoid a base64-size rejection below 10 MiB.
  if (data.length <= limit && fitsDimensions(buffer, maxDimension)) {
    return data === item.image ? item : {
      ...item,
      image: data,
      mimeType: detectSupportedImageMime(buffer) || item.mimeType
    }
  }
  const binaryLimit = Math.floor(limit / 4) * 3
  if (binaryLimit < 1) throw new Error('vision.maxImageSize 过小，无法容纳 Base64 图片')
  const result = await compressImageBuffer(buffer, binaryLimit, maxDimension)
  const image = result.buffer.toString('base64')
  if (image.length > limit) throw new Error('图片压缩失败：Base64 内容超过大小上限')
  return {
    ...item,
    image,
    mimeType: result.mimeType,
    // Preserve routing rules such as forceImageRefMimes after conversion to JPEG.
    originalMimeType: item.originalMimeType || detectSupportedImageMime(buffer) || item.mimeType
  }
}
