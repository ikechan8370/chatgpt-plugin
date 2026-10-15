import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { readFileSync } from 'node:fs'
import { compressImageBuffer as compressOriginal, limitImageContent as limitOriginal, resolveMaxImageSize } from './image_size.js'
import { detectSupportedImageMime } from './image_mime.js'

// Real Chromium tests use the host's Puppeteer, or a temporary puppeteer-core
// installation when IMAGE_COMPRESSION_TEST_CHROME_PATH is provided.
let puppeteer
try {
  puppeteer = (await import('puppeteer')).default
} catch {
  try { puppeteer = (await import('puppeteer-core')).default } catch {}
}
const browserTest = puppeteer ? test : test.skip
let browser
let renderer
let compressImageBuffer
let limitImageContent
let fixturePage

before(async () => {
  if (!puppeteer) return
  browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.IMAGE_COMPRESSION_TEST_CHROME_PATH || undefined,
    args: ['--no-sandbox']
  })
  fixturePage = await browser.newPage()
  renderer = { browser }
  globalThis[Symbol.for('chatgpt.image-compression.test.renderer')] = renderer
  // Only substitute the host browser import; test the actual compression and
  // page lifecycle code without requiring a complete Yunzai checkout.
  let code = readFileSync(new URL('./image_size.js', import.meta.url), 'utf8')
  const hostModule = "data:text/javascript,export default globalThis[Symbol.for('chatgpt.image-compression.test.renderer')]"
  code = code.replace("import('../../../lib/puppeteer/puppeteer.js')", `import(${JSON.stringify(hostModule)})`)
  for (const name of ['image_mime', 'concurrency', 'image_canvas']) {
    code = code.replace(`from './${name}.js'`, `from '${new URL(`./${name}.js`, import.meta.url).href}'`)
  }
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  compressImageBuffer = module.compressImageBuffer
  limitImageContent = module.limitImageContent
})

after(async () => {
  await browser?.close()
  delete globalThis[Symbol.for('chatgpt.image-compression.test.renderer')]
})

const animatedGif = Buffer.from('R0lGODlhAgABAIAAAExpcf8AACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFCgAAACwAAAAAAgABAAACAkwKACH5BAUUAAAALAAAAAACAAEAgExpcQD/AAICTAoAOw==', 'base64')

async function noisyImage (format = 'png', size = 512) {
  if (format === 'gif') return Buffer.concat([animatedGif, Buffer.alloc(32768)])
  const data = await fixturePage.evaluate(({ format, size }) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const bitmap = ctx.createImageData(size, size)
    // Seeded RGB noise makes the fixture hard to compress, with opaque alpha.
    let seed = 123456789
    for (let i = 0; i < bitmap.data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        bitmap.data[i + c] = seed >>> 24
      }
      bitmap.data[i + 3] = 255
    }
    ctx.putImageData(bitmap, 0, 0)
    return canvas.toDataURL(`image/${format}`, 1).split(',')[1]
  }, { format, size })
  return Buffer.from(data, 'base64')
}

async function dimensions (buffer) {
  return fixturePage.evaluate(async data => {
    const image = await createImageBitmap(await (await fetch(data)).blob())
    const dimensions = { width: image.width, height: image.height }
    image.close()
    return dimensions
  }, `data:${detectSupportedImageMime(buffer)};base64,${buffer.toString('base64')}`)
}

test('invalid limits use 10 MiB; numeric configuration strings work', () => {
  for (const value of [undefined, null, 0, -1, Infinity, 'invalid']) assert.equal(resolveMaxImageSize(value), 10485760)
  assert.equal(resolveMaxImageSize('2048'), 2048)
})

test('images at or below the limit pass through without loading the host browser', async () => {
  const result = await compressOriginal(animatedGif, animatedGif.length)
  assert.equal(result.buffer, animatedGif)
  const item = { type: 'image', image: animatedGif.toString('base64'), mimeType: 'image/gif', ref: 'original' }
  assert.equal(await limitOriginal(item, animatedGif.length), item)
})

test('text and URL content pass through without loading the host browser', async () => {
  for (const item of [{ type: 'text', text: 'hello' }, { type: 'image', image: 'https://example.com/image.png' }]) {
    assert.equal(await limitOriginal(item, 100), item)
  }
})

browserTest('a real image above 10 MiB fits the default limit after compression', async () => {
  const buffer = await noisyImage('png', 1920)
  assert.ok(buffer.length > 10485760)
  const result = await compressImageBuffer(buffer)
  assert.ok(result.buffer.length <= 10485760)
  assert.deepEqual(await dimensions(result.buffer), { width: 1920, height: 1920 })
})

for (const format of ['png', 'jpeg', 'webp', 'gif']) {
  browserTest(`oversized ${format} becomes a decodable JPEG under the configured limit`, async () => {
    const buffer = await noisyImage(format)
    const original = Buffer.from(buffer)
    const result = await compressImageBuffer(buffer, 8192)
    assert.ok(buffer.length > 8192)
    assert.ok(result.buffer.length <= 8192)
    assert.equal(result.mimeType, 'image/jpeg')
    assert.equal(detectSupportedImageMime(result.buffer), 'image/jpeg')
    const size = await dimensions(result.buffer)
    assert.ok(size.width > 0 && size.width <= 512)
    assert.ok(size.height > 0 && size.height <= 512)
    assert.deepEqual(buffer, original)
  })
}

browserTest('base64/data URLs preserve refs, actual MIME, and original format for routing', async () => {
  const buffer = await noisyImage('png')
  for (const prefix of ['', 'data:image/png;base64,', 'base64://']) {
    const item = { type: 'image', image: prefix + buffer.toString('base64'), mimeType: 'image/jpeg', ref: 'original' }
    const result = await limitImageContent(item, '16384')
    assert.ok(Buffer.from(result.image, 'base64').length <= 16384)
    assert.equal(result.mimeType, 'image/jpeg')
    assert.equal(result.originalMimeType, 'image/png')
    assert.equal(result.ref, 'original')
    assert.notEqual(item.image, result.image)
  }
})

browserTest('impossible limits and invalid images release their browser pages', async () => {
  const pageCount = (await browser.pages()).length
  await assert.rejects(compressImageBuffer(await noisyImage('png'), 1), /vision.maxImageSize/)
  await assert.rejects(compressImageBuffer(Buffer.from('not an image'), 1))
  assert.equal((await browser.pages()).length, pageCount)
})

browserTest('transparent images use a white background', async () => {
  const data = await fixturePage.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 32
    return canvas.toDataURL().split(',')[1]
  })
  const buffer = Buffer.concat([Buffer.from(data, 'base64'), Buffer.alloc(4096)])
  const result = await compressImageBuffer(buffer, 2048)
  const pixel = await fixturePage.evaluate(async data => {
    const image = await createImageBitmap(await (await fetch(data)).blob())
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, 1, 1)
    image.close()
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, `data:image/jpeg;base64,${result.buffer.toString('base64')}`)
  assert.deepEqual(pixel, [255, 255, 255, 255])
})

browserTest('browser startup uses the host renderer; unavailable browser fails clearly', async () => {
  const buffer = await noisyImage('png')
  renderer.browser = false
  renderer.browserInit = async () => browser
  try {
    assert.ok((await compressImageBuffer(buffer, 8192)).buffer.length <= 8192)
    renderer.browserInit = async () => false
    await assert.rejects(compressImageBuffer(buffer, 8192), /Puppeteer 浏览器不可用/)
  } finally {
    renderer.browser = browser
    delete renderer.browserInit
  }
})

browserTest('renderer loader selects Puppeteer and concurrent compression leaves no pages open', async () => {
  const buffer = await noisyImage('png')
  const pageCount = (await browser.pages()).length
  renderer.browser = false
  renderer.renderers = new Map([['puppeteer', { browser }]])
  try {
    const results = await Promise.all([compressImageBuffer(buffer, 8192), compressImageBuffer(buffer, 8192)])
    assert.ok(results.every(result => result.buffer.length <= 8192))
    assert.equal((await browser.pages()).length, pageCount)
  } finally {
    renderer.browser = browser
    delete renderer.renderers
  }
})

browserTest('bundled processor handles history and keeps GIF ref routing after conversion', async () => {
  const { asyncLocalStorage } = await import('chaite')
  const { default: config } = await import('../config/config.js')
  let code = Buffer.from(readFileSync(new URL('../resources/embedded/ImageRefPreProcessor', import.meta.url), 'utf8').trim(), 'base64').toString()
  code = code.replace("from 'chaite'", `from '${import.meta.resolve('chaite')}'`)
  code = code.replace("from '../vision.js'", "from 'data:text/javascript,export const visionService = { hasImage: () => true }'")
  // Use the same host-browser substitution as the direct compression tests.
  globalThis[Symbol.for('chatgpt.image-compression.test.limit')] = limitImageContent
  code = code.replace("from '../image_size.js'", "from 'data:text/javascript,export const limitImageContent = globalThis[Symbol.for(%22chatgpt.image-compression.test.limit%22)]'")
  for (const name of ['image_context', 'image_mime']) code = code.replace(`from '../${name}.js'`, `from '${new URL(`./${name}.js`, import.meta.url).href}'`)
  code = code.replace("from '../../config/config.js'", `from '${new URL('../config/config.js', import.meta.url).href}'`)
  const { default: processor } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const item = { type: 'image', image: (await noisyImage('png')).toString('base64'), mimeType: 'image/png', ref: 'original' }
  const current = { role: 'user', content: [{ ...item }, { type: 'text', text: '[图片 ref:original]' }] }
  const history = [{ role: 'user', content: [{ ...item }] }]
  const oldLimit = config.vision.maxImageSize
  config.vision.maxImageSize = 16384
  try {
    const store = { getClient: () => ({ features: ['visual'] }), getHistoryMessages: () => history }
    await asyncLocalStorage.run(store, () => processor.process(current))
    for (const message of [current, ...history]) {
      assert.ok(Buffer.from(message.content[0].image, 'base64').length <= 16384)
      assert.equal(message.content[0].ref, 'original')
    }
    assert.equal(current.content[1].text, '[图片]')
    const gif = await limitImageContent({ type: 'image', image: (await noisyImage('gif')).toString('base64'), mimeType: 'image/gif', ref: 'animated' }, 16384)
    assert.equal(gif.mimeType, 'image/jpeg')
    const message = { role: 'user', content: [gif] }
    await asyncLocalStorage.run(store, () => processor.process(message))
    assert.equal(message.content[0].type, 'text')
    assert.match(message.content[0].text, /图片 ref:animated/)
  } finally {
    config.vision.maxImageSize = oldLimit
    delete globalThis[Symbol.for('chatgpt.image-compression.test.limit')]
  }
})
