import fs from 'node:fs'
import path from 'node:path'
import * as crypto from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import fetch from 'node-fetch'
import { Chaite, ChaiteContext, createClient } from 'chaite'
import ChatGPTConfig from '../config/config.js'
import { dataDir } from './common.js'
import { detectSupportedImageMime } from './image_mime.js'
import { cleanupExpiredImageCache, resolveImageRetentionMs } from './imageCacheCleanup.js'

const IMAGES_DIR = path.join(dataDir, 'images')
const IMAGE_REFS_PATH = path.join(IMAGES_DIR, 'refs.json')
const TOOL_ASSET_MANIFEST = path.join(dataDir, 'tool-image-assets.json')
const DEFAULT_TOOL_ASSET_TTL = 7 * 24 * 60 * 60 * 1000
// refs 只在对应缓存文件被清理时才会被删除，而群聊上下文里没落盘的图片（视觉模型
// 走的分支）压根没有文件，永远不会被回收。加一个硬上限兜底，避免 refs.json 无限
// 增长——默认保留策略是 forever，否则这个表会一直涨下去。
const MAX_REF_ENTRIES = 50000
const REF_PRUNE_TARGET = Math.floor(MAX_REF_ENTRIES * 0.9)
const REFS_SAVE_DEBOUNCE_MS = 1000
let assetManifestLock = Promise.resolve()

function withAssetManifestLock (fn) {
  const next = assetManifestLock.then(fn, fn)
  assetManifestLock = next.catch(() => {})
  return next
}

async function readAssetManifest () {
  try {
    const data = JSON.parse(await readFile(TOOL_ASSET_MANIFEST, 'utf8'))
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function writeAssetManifest (entries) {
  await mkdir(path.dirname(TOOL_ASSET_MANIFEST), { recursive: true })
  const tempPath = `${TOOL_ASSET_MANIFEST}.tmp`
  await writeFile(tempPath, JSON.stringify(entries, null, 2), 'utf8')
  await rename(tempPath, TOOL_ASSET_MANIFEST)
}

class VisionService {
  constructor () {
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true })
    }
    this.refs = this._loadRefs()
    this._refCount = Object.keys(this.refs).length
    this.cleanupTimer = null
    this._refsDirty = false
    this._refsSaveTimer = null
    // 进程退出前把还没落盘的 refs 写掉，避免丢失最近的图片来源信息。
    process.once('exit', () => this._flushRefs())
  }

  cleanupExpiredImages () {
    const retentionMs = resolveImageRetentionMs(ChatGPTConfig.vision)
    if (retentionMs <= 0) return { deleted: 0, bytesFreed: 0, refsRemoved: 0 }

    // 清理逻辑是直接读写 refs.json 的，先把内存里挂起的改动落盘再交给它，
    // 否则接下来的 _loadRefs() 会把这些改动丢掉。
    this._flushRefs()

    const result = cleanupExpiredImageCache({
      imagesDir: IMAGES_DIR,
      refsPath: IMAGE_REFS_PATH,
      retentionMs
    })
    if (result.refsRemoved > 0) {
      this.refs = this._loadRefs()
      this._refCount = Object.keys(this.refs).length
    }
    if (result.deleted > 0) {
      logger.info(`[Vision] cleaned ${result.deleted} expired image(s), freed ${(result.bytesFreed / 1024 / 1024).toFixed(2)} MiB`)
    }
    return result
  }

  startCleanupScheduler () {
    if (this.cleanupTimer) return

    try {
      this.cleanupExpiredImages()
    } catch (err) {
      logger.warn(`[Vision] image cache cleanup failed: ${err.message}`)
    }

    this.cleanupTimer = setInterval(() => {
      try {
        this.cleanupExpiredImages()
      } catch (err) {
        logger.warn(`[Vision] image cache cleanup failed: ${err.message}`)
      }
    }, 60 * 60 * 1000)
    this.cleanupTimer.unref?.()
  }

  _loadRefs () {
    try {
      if (!fs.existsSync(IMAGE_REFS_PATH)) return {}
      return JSON.parse(fs.readFileSync(IMAGE_REFS_PATH, 'utf-8'))
    } catch (err) {
      logger.warn(`[Vision] failed to load image refs: ${err.message}`)
      return {}
    }
  }

  /**
   * 立即把 refs 写盘。写临时文件再 rename，避免进程中途挂掉留下半个 JSON。
   */
  _flushRefs () {
    if (this._refsSaveTimer) {
      clearTimeout(this._refsSaveTimer)
      this._refsSaveTimer = null
    }
    if (!this._refsDirty) return
    this._refsDirty = false
    try {
      const tempPath = `${IMAGE_REFS_PATH}.tmp`
      fs.writeFileSync(tempPath, JSON.stringify(this.refs, null, 2))
      fs.renameSync(tempPath, IMAGE_REFS_PATH)
    } catch (err) {
      logger.warn(`[Vision] failed to save image refs: ${err.message}`)
    }
  }

  /**
   * 合并写盘。rememberImageSource 在群聊上下文里是每条消息每张图都要调一次的，
   * 以前每次都同步全量重写 refs.json，文件越大越卡，而且是卡在事件循环上。
   */
  _saveRefs () {
    this._refsDirty = true
    if (this._refsSaveTimer) return
    this._refsSaveTimer = setTimeout(() => {
      this._refsSaveTimer = null
      this._flushRefs()
    }, REFS_SAVE_DEBOUNCE_MS)
    this._refsSaveTimer.unref?.()
  }

  /**
   * refs 超过上限时按 updatedAt 淘汰最旧的。被淘汰的条目如果磁盘上还有缓存文件，
   * loadImage / resolveImageRef 仍然能通过文件名找回图片，只是少了 url 元信息。
   */
  _pruneRefs () {
    // 维护一个计数，避免每次调用都 Object.keys() 全量拍一份 key 数组出来——
    // rememberImageSource 是每张图都要调的，那样等于又把 O(n) 加回热路径。
    if (this._refCount === undefined) this._refCount = Object.keys(this.refs).length
    if (this._refCount <= MAX_REF_ENTRIES) return 0

    const keys = Object.keys(this.refs)
    keys.sort((a, b) => (Number(this.refs[a]?.updatedAt) || 0) - (Number(this.refs[b]?.updatedAt) || 0))
    const excess = keys.length - REF_PRUNE_TARGET
    for (let i = 0; i < excess; i++) {
      delete this.refs[keys[i]]
    }
    this._refCount = keys.length - excess
    logger.info(`[Vision] pruned ${excess} least recently used image ref(s), kept ${this._refCount}`)
    return excess
  }

  rememberImageSource (ref, source = {}) {
    if (!ref) return
    const current = this.refs[ref]
    const isNew = current === undefined
    if (isNew) {
      if (this._refCount === undefined) this._refCount = Object.keys(this.refs).length
      this._refCount++
    }
    const cleanSource = Object.fromEntries(
      Object.entries(source).filter(([key, value]) => value !== undefined && value !== null && !(key === 'url' && value === ''))
    )
    this.refs[ref] = {
      ...current,
      ...cleanSource,
      ref,
      updatedAt: Date.now()
    }
    this._pruneRefs()
    this._saveRefs()
  }

  /**
   * Save image from buffer to disk, return ref (MD5)
   * Tool-produced images (source.origin === 'tool') get a `t_` ref prefix so
   * models and tools can tell them apart from conversation images; context
   * images keep bare refs for compatibility with existing history markers.
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @returns {{ref: string, mimeType: string, ext: string, filePath: string}}
   */
  saveImageFromBuffer (buffer, mimeType = 'image/jpeg', refOverride = '', source = {}) {
    const detectedMimeType = detectSupportedImageMime(buffer)
    if (!detectedMimeType) throw new Error('不是受支持的图片')
    const md5 = crypto.createHash('md5').update(buffer).digest('hex')
    let ref = refOverride || md5
    if (source.origin === 'tool' && !ref.startsWith('t_')) {
      ref = `t_${ref}`
    }
    const normalizedMimeType = detectedMimeType
    const extMap = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp'
    }
    const ext = extMap[normalizedMimeType] || '.png'
    const filePath = path.join(IMAGES_DIR, `${ref}${ext}`)

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buffer)
    }

    this.rememberImageSource(ref, {
      ...source,
      imageId: md5,
      mimeType: normalizedMimeType,
      filePath
    })

    return { ref, imageId: md5, mimeType: normalizedMimeType, ext, filePath }
  }

  /**
   * Save image from base64 string (with or without data: prefix) or URL
   * @param {string} source - base64 string or URL
   * @param {string} mimeType
   * @param {string} [refOverride]
   * @param {'tool' | ''} [origin] - 'tool' marks the image as tool-produced (ref gets a t_ prefix)
   * @returns {Promise<{ref: string, mimeType: string, ext: string, filePath: string}>}
   */
  async saveImage (source, mimeType = 'image/jpeg', refOverride = '', origin = '') {
    let buffer
    let sourceUrl = ''

    if (source.startsWith('http://') || source.startsWith('https://')) {
      sourceUrl = source
      const res = await fetch(source)
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
      buffer = Buffer.from(await res.arrayBuffer())
      mimeType = res.headers.get('content-type') || mimeType
    } else if (source.startsWith('data:')) {
      const [, data] = source.split(',')
      buffer = Buffer.from(data, 'base64')
      const match = source.match(/data:(image\/[^;]+)/)
      if (match) mimeType = match[1]
    } else {
      // Pure base64
      buffer = Buffer.from(source, 'base64')
    }

    return this.saveImageFromBuffer(buffer, mimeType, refOverride, origin ? { url: sourceUrl, origin } : { url: sourceUrl })
  }

  /**
   * Load image from disk by ref, return base64 and mimeType
   * @param {string} ref - image MD5 ref
   * @returns {{base64: string, mimeType: string, filePath: string}|null}
   */
  loadImage (ref) {
    for (const ext of ['.jpg', '.png', '.gif', '.webp']) {
      const filePath = path.join(IMAGES_DIR, `${ref}${ext}`)
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath)
        const mimeMap = {
          '.jpg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp'
        }
        return {
          base64: buffer.toString('base64'),
          mimeType: mimeMap[ext] || 'image/jpeg',
          filePath
        }
      }
    }
    return null
  }

  /**
   * Ask a vision model about an image identified by ref
   * @param {string} ref - image MD5 ref
   * @param {string} [question] - specific question about the image
   * @returns {Promise<string>} - text response from vision model
   */
  async askAboutImage (ref, question) {
    const image = this.loadImage(ref)
    if (!image) {
      throw new Error(`Image ${ref} not found; it may have been cleaned up or was never cached`)
    }

    const config = ChatGPTConfig.vision || {}
    const channelsManager = Chaite.getInstance().getChannelsManager()
    const allChannels = await channelsManager.getAllChannels()

    const isVisualModel = model => model?.features?.includes('visual')
    const getVisualModel = channel => channel.models?.find(isVisualModel)

    // Find a vision-capable channel. Features are stored per model in newer Chaite.
    let visionChannel
    if (config.visionChannelId) {
      visionChannel = allChannels.find(c => c.id === config.visionChannelId)
      if (!visionChannel) throw new Error(`Configured vision channel ${config.visionChannelId} was not found`)
      if (visionChannel.status !== 'enabled') throw new Error(`Configured vision channel ${visionChannel.name} is disabled`)
      if (!getVisualModel(visionChannel)) throw new Error(`Configured vision channel ${visionChannel.name} has no model with visual capability`)
    } else {
      visionChannel = allChannels.find(
        c => c.status === 'enabled' && getVisualModel(c)
      )
    }
    if (!visionChannel) {
      throw new Error('No available vision-capable channel. Set vision.visionChannelId or enable a model with visual feature.')
    }

    await visionChannel.ready()

    const configuredModel = config.imageDescriptionModel
    const visualModel = configuredModel
      ? visionChannel.models?.find(item => item.name === configuredModel && isVisualModel(item))
      : getVisualModel(visionChannel)
    if (!visualModel) {
      throw new Error(configuredModel
        ? `Configured vision model ${configuredModel} is unavailable or does not support visual on channel ${visionChannel.name}`
        : `No visual model is available on channel ${visionChannel.name}`)
    }
    const model = visualModel.name
    const systemPrompt = config.imageDescriptionSystemPrompt ||
      'You are an image analysis assistant. Answer questions about images accurately and thoroughly.'

    const chaite = Chaite.getInstance()
    const context = new ChaiteContext(chaite.getLogger?.())
    context.setChaite(chaite)

    const client = createClient(visionChannel.adapterType, visionChannel.getOptionsForModel(model), context)

    const response = await client.sendMessage({
      role: 'user',
      content: [
        { type: 'image', image: image.base64, mimeType: image.mimeType },
        { type: 'text', text: question || config.defaultQuestion || 'Describe this image in detail.' }
      ]
    }, {
      model,
      systemOverride: systemPrompt,
      disableHistoryRead: true,
      disableHistorySave: true,
      preProcessorIds: [],
      postProcessorIds: [],
      toolGroupId: [],
      toolChoice: { type: 'none' }
    })

    const text = response.contents
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('\n')

    if (!text) {
      return '(No text description was returned from the image model.)'
    }

    return text
  }

  /**
   * Check if an image exists in cache by ref
   * @param {string} ref
   * @returns {boolean}
   */
  hasImage (ref) {
    for (const ext of ['.jpg', '.png', '.gif', '.webp']) {
      if (fs.existsSync(path.join(IMAGES_DIR, `${ref}${ext}`))) {
        return true
      }
    }
    return false
  }

  getImageContentId (ref) {
    for (const ext of ['.jpg', '.png', '.gif', '.webp']) {
      const filePath = path.join(IMAGES_DIR, `${ref}${ext}`)
      if (fs.existsSync(filePath)) {
        // 文件内容是不可变的（文件名就是内容的 md5），已经算过就别再整个读一遍。
        // 但只认 32 位十六进制：buildImageInfos 在视觉模型分支下会把
        // extractImageFingerprint() 的 12 位短哈希也写进 imageId，那个不是内容
        // 哈希，直接返回会让群聊快照里的 imageId 标记前后不一致、破坏前缀缓存。
        const cached = this.refs[ref]?.imageId
        if (typeof cached === 'string' && /^[a-f0-9]{32}$/i.test(cached)) return cached
        return crypto.createHash('md5').update(fs.readFileSync(filePath)).digest('hex')
      }
    }
    return ''
  }

  resolveImageRef (ref) {
    if (!ref) return null
    const cached = this.refs[ref] || {}
    const image = this.loadImage(ref)
    if (!cached.url && !image) return null
    return {
      ref,
      url: cached.url || '',
      imageId: cached.imageId || '',
      mimeType: cached.mimeType || image?.mimeType || '',
      filePath: cached.filePath || image?.filePath || ''
    }
  }

  /**
   * Remove an image ref and optionally its cached file.
   * History images remain persistent unless a caller explicitly registers them
   * as temporary tool assets.
   * @param {string} ref
   * @param {string} [filePath]
   * @returns {Promise<void>}
   */
  async forgetImage (ref, filePath = '') {
    if (filePath) await rm(filePath, { force: true }).catch(() => {})
    if (ref && this.refs[ref]) {
      delete this.refs[ref]
      this._refCount = undefined
      this._saveRefs()
    }
  }

  /**
   * Delete expired temporary images created by tools.
   * @param {number} [now]
   * @param {string[]} [protectedRefs]
   * @returns {Promise<number>}
   */
  async cleanupTemporaryImages (now = Date.now(), protectedRefs = []) {
    return withAssetManifestLock(async () => {
      const entries = await readAssetManifest()
      const active = []
      const protectedSet = new Set(protectedRefs)
      let refsChanged = false

      for (const entry of entries) {
        if (!entry?.expiresAt || entry.expiresAt > now || protectedSet.has(entry.ref)) {
          active.push(entry)
          continue
        }
        if (entry.filePath) await rm(entry.filePath, { force: true }).catch(() => {})
        if (entry.ref && this.refs[entry.ref]) {
          delete this.refs[entry.ref]
          this._refCount = undefined
          refsChanged = true
        }
      }

      await writeAssetManifest(active)
      if (refsChanged) this._saveRefs()
      return entries.length - active.length
    })
  }

  /**
   * Register an image created by a tool for automatic expiration.
   * @param {{ref: string, filePath: string}} record
   * @param {{source?: string, ttlMs?: number}} [options]
   * @returns {Promise<object>}
   */
  async registerTemporaryImage (record, options = {}) {
    if (!record?.ref || !record?.filePath) return record
    if (!globalThis.__chaiteToolAssetCleanupTimer) {
      const timer = setInterval(() => {
        this.cleanupTemporaryImages().catch(() => {})
      }, 6 * 60 * 60 * 1000)
      timer.unref?.()
      globalThis.__chaiteToolAssetCleanupTimer = timer
    }

    const ttlMs = Math.max(60_000, Number(options.ttlMs) || DEFAULT_TOOL_ASSET_TTL)
    await this.cleanupTemporaryImages(Date.now(), [record.ref])
    return withAssetManifestLock(async () => {
      const entries = await readAssetManifest()
      const next = entries.filter(entry => entry?.ref !== record.ref)
      next.push({
        ref: record.ref,
        filePath: record.filePath,
        source: options.source || 'tool',
        createdAt: Date.now(),
        expiresAt: Date.now() + ttlMs
      })
      await writeAssetManifest(next)
      return record
    })
  }
}

export const visionService = new VisionService()

export function resolveImageRef (ref) {
  return visionService.resolveImageRef(ref)
}

export async function isVisualModelForSendOptions (sendMessageOption = {}, preset = null) {
  const modelName = sendMessageOption?.model || preset?.sendMessageOption?.model || ''
  if (!modelName) return false

  const chaite = Chaite.getInstance()
  const channelsManager = chaite?.getChannelsManager?.()
  if (!channelsManager?.getChannelByModel) return false

  try {
    const channels = await channelsManager.getChannelByModel(modelName)
    const channel = channels?.find(c => c.status === 'enabled') || channels?.[0]
    if (!channel) return false

    const features = channel.getOptionsForModel?.(modelName)?.features ||
      channel.models?.find(model => model.name === modelName)?.features ||
      []
    return features.includes('visual')
  } catch (err) {
    logger.warn(`[Vision] failed to detect visual feature for model ${modelName}: ${err.message}`)
    return false
  }
}
