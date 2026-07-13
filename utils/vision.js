import fs from 'node:fs'
import path from 'node:path'
import * as crypto from 'node:crypto'
import fetch from 'node-fetch'
import { Chaite, ChaiteContext, createClient } from 'chaite'
import ChatGPTConfig from '../config/config.js'
import { dataDir } from './common.js'

const IMAGES_DIR = path.join(dataDir, 'images')
const IMAGE_REFS_PATH = path.join(IMAGES_DIR, 'refs.json')

class VisionService {
  constructor () {
    if (!fs.existsSync(IMAGES_DIR)) {
      fs.mkdirSync(IMAGES_DIR, { recursive: true })
    }
    this.refs = this._loadRefs()
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

  _saveRefs () {
    try {
      fs.writeFileSync(IMAGE_REFS_PATH, JSON.stringify(this.refs, null, 2))
    } catch (err) {
      logger.warn(`[Vision] failed to save image refs: ${err.message}`)
    }
  }

  rememberImageSource (ref, source = {}) {
    if (!ref) return
    const current = this.refs[ref] || {}
    const cleanSource = Object.fromEntries(
      Object.entries(source).filter(([key, value]) => value !== undefined && value !== null && !(key === 'url' && value === ''))
    )
    this.refs[ref] = {
      ...current,
      ...cleanSource,
      ref,
      updatedAt: Date.now()
    }
    this._saveRefs()
  }

  /**
   * Save image from buffer to disk, return ref (MD5)
   * @param {Buffer} buffer
   * @param {string} mimeType
   * @returns {{ref: string, mimeType: string, ext: string, filePath: string}}
   */
  saveImageFromBuffer (buffer, mimeType = 'image/jpeg', refOverride = '', source = {}) {
    const md5 = crypto.createHash('md5').update(buffer).digest('hex')
    const ref = refOverride || md5
    const normalizedMimeType = String(mimeType || 'image/jpeg').split(';')[0].trim()
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
   * @returns {Promise<{ref: string, mimeType: string, ext: string, filePath: string}>}
   */
  async saveImage (source, mimeType = 'image/jpeg', refOverride = '') {
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

    return this.saveImageFromBuffer(buffer, mimeType, refOverride, { url: sourceUrl })
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
