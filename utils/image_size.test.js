import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { installImageRequestGuard } from './image_request_guard.js'
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
  assert.equal(await limitOriginal(item, item.image.length), item)
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
    assert.ok(result.image.length <= 16384)
    assert.equal(result.mimeType, 'image/jpeg')
    assert.equal(result.originalMimeType, 'image/png')
    assert.equal(result.ref, 'original')
    assert.notEqual(item.image, result.image)
  }
})

browserTest('a file below 10 MiB with the reported 10986956-byte base64 is compressed', async () => {
  const png = await noisyImage('png')
  const buffer = Buffer.concat([png, Buffer.alloc(8240217 - png.length)])
  const item = { type: 'image', image: buffer.toString('base64'), mimeType: 'image/png' }
  assert.ok(buffer.length < 10485760)
  assert.equal(item.image.length, 10986956)
  const result = await limitImageContent(item, 10485760)
  assert.ok(result.image.length <= 10485760)
  assert.equal(result.mimeType, 'image/jpeg')
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

browserTest('actual Claude SDK request limits old history at messages.13.content.6 without processors', async () => {
  const { ClaudeClient, OpenAIClient, GeminiClient, ChaiteContext } = await import('chaite')
  const clients = [ClaudeClient, OpenAIClient, GeminiClient]
  const originalMethods = clients.map(Client => Client.prototype._sendMessage)
  const requests = []
  const server = createServer(async (req, res) => {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    requests.push(JSON.parse(Buffer.concat(chunks)))
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-test',
      content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 }
    }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    installImageRequestGuard(clients, () => 10485760, limitImageContent)
    const png = await noisyImage('png')
    for (const byteLength of [8240217, 10986956]) {
      const original = Buffer.concat([png, Buffer.alloc(byteLength - png.length)]).toString('base64')
      const history = Array.from({ length: 14 }, (_, i) => ({ id: `history-${i}`, role: 'user', content: [{ type: 'text', text: `history ${i}` }] }))
      history[13].content = Array.from({ length: 6 }, () => ({ type: 'text', text: 'context' }))
      history[13].content.push({ type: 'image', image: original, mimeType: 'image/png' })
      const logger = { debug () {}, info () {}, warn () {}, error () {} }
      const context = new ChaiteContext(logger)
      context.setChaite({
        getGlobalConfig: () => ({ getDebug: () => false }),
        getToolsGroupManager: () => null,
        getToolsManager: () => null,
        getOperationLogManager: () => null
      })
      const client = new ClaudeClient({
        apiKey: 'test', baseUrl: `http://127.0.0.1:${server.address().port}`, logger,
        historyManager: { getHistory: async () => [...history], saveHistory: async () => {} }
      }, context)
      const options = { model: 'claude-test', preProcessorIds: [], postProcessorIds: [], toolGroupId: [] }
      await client.sendMessage({ role: 'user', content: [{ type: 'text', text: 'continue' }] }, options)
      const source = requests.at(-1).messages[13].content[6].source
      assert.equal(source.type, 'base64')
      assert.ok(source.data.length <= 10485760)
      assert.ok(Buffer.from(source.data, 'base64').length <= 10485760)
      assert.equal(source.media_type, 'image/jpeg')
      assert.equal(history[13].content[6].image, original, 'original cached history stays untouched')
      assert.equal(client.preProcessors.length, 0)
      // This bypasses the normal preprocessor/history-loading path entirely.
      await client.sendMessageWithHistory(history, options)
      assert.ok(requests.at(-1).messages[13].content[6].source.data.length <= 10485760)
      // Chaite swallows this optional processor failure. The mandatory guard
      // must still stop the request if the browser cannot compress the history.
      client.options.preProcessors = [{ name: 'failing', process () { throw new Error('processor failed') } }]
      const requestCount = requests.length
      renderer.browser = false
      renderer.browserInit = async () => false
      try {
        await assert.rejects(client.sendMessage({ role: 'user', content: [{ type: 'text', text: 'continue' }] }, options), /发送前图片处理失败.*messages\.13\.content\.6.*Puppeteer 浏览器不可用/)
        assert.equal(requests.length, requestCount)
      } finally {
        renderer.browser = browser
        delete renderer.browserInit
      }
    }
    assert.equal(requests.length, 4)
  } finally {
    clients.forEach((Client, index) => { Client.prototype._sendMessage = originalMethods[index] })
    await new Promise(resolve => server.close(resolve))
  }
})
