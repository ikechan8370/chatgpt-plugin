import sqlite3 from 'sqlite3'
import path from 'path'
import * as crypto from 'node:crypto'
import { visionService } from './vision.js'
import { dataDir, formatTimeToBeiJing } from './common.js'

class GroupContextCache {
  constructor () {
    this.db = null
    this.initialized = false
    this._initPromise = null
  }

  async _init () {
    if (this.initialized) return
    if (this._initPromise) return this._initPromise

    this._initPromise = new Promise((resolve, reject) => {
      const dbPath = path.join(dataDir, 'data.db')
      logger.debug(`[GroupContext] opening db at ${dbPath}`)
      this.db = new sqlite3.Database(dbPath, err => {
        if (err) return reject(err)
        this.db.run(`CREATE TABLE IF NOT EXISTS group_context_cache (
          groupId TEXT PRIMARY KEY,
          snapshot TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        )`, err => {
          if (err) return reject(err)
          this.initialized = true
          resolve()
        })
      })
    })
    return this._initPromise
  }

  /**
   * @param {string} groupId
   * @returns {Promise<Array<{id: string, text: string, images?: Array<{url: string}>}>|null>}
   */
  async getSnapshot (groupId) {
    await this._init()
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT snapshot FROM group_context_cache WHERE groupId = ?',
        [String(groupId)],
        (err, row) => {
          if (err) return reject(err)
          if (!row) {
            logger.debug(`[GroupContext] getSnapshot: no snapshot for group=${groupId}`)
            return resolve(null)
          }
          try {
            const msgs = JSON.parse(row.snapshot)
            logger.debug(`[GroupContext] getSnapshot ok: group=${groupId}, msgs=${msgs.length}`)
            resolve(msgs)
          } catch (e) {
            logger.error(`[GroupContext] getSnapshot parse error: ${e.message}`)
            resolve(null)
          }
        }
      )
    })
  }

  /**
   * @param {string} groupId
   * @param {Array<{id: string, text: string, images?: Array<{url: string}>}>} messages
   */
  async saveSnapshot (groupId, messages) {
    await this._init()
    const snapshot = JSON.stringify(messages)
    const now = Date.now()
    return new Promise(resolve => {
      this.db.run(
        'INSERT OR REPLACE INTO group_context_cache (groupId, snapshot, updatedAt) VALUES (?, ?, ?)',
        [String(groupId), snapshot, now],
        err => {
          if (err) logger.error(`[GroupContext] saveSnapshot failed: ${err.message}`)
          else logger.debug(`[GroupContext] saveSnapshot ok: group=${groupId}, msgs=${messages.length}, bytes=${snapshot.length}`)
          resolve()
        }
      )
    })
  }

  /**
   * @param {number} maxAgeMs
   */
  async cleanup (maxAgeMs = 3600000) {
    await this._init()
    const cutoff = Date.now() - maxAgeMs
    return new Promise(resolve => {
      this.db.run(
        'DELETE FROM group_context_cache WHERE updatedAt < ?',
        [cutoff],
        () => resolve()
      )
    })
  }
}

export const groupContextCache = new GroupContextCache()

function getMessageId (chat) {
  return String(chat.messageId || chat.message_id || chat.seq || chat.message_seq || '')
}

function extractMediaUrl (elem) {
  if (!elem || typeof elem !== 'object') return ''
  const data = elem.data || {}
  return elem.url ||
    elem.file_url ||
    elem.image_url ||
    elem.src ||
    data.url ||
    data.file_url ||
    data.image_url ||
    data.originUrl ||
    data.origin_url ||
    data.preview ||
    data.thumb ||
    data.bigUrl ||
    data.big_url ||
    data.src ||
    ''
}

function isImageLikeElem (elem) {
  return ['image', 'mface', 'bface', 'sface', 'marketface'].includes(elem?.type)
}

function shortHash (value) {
  if (!value) return ''
  return crypto.createHash('md5').update(String(value)).digest('hex').slice(0, 12)
}

function imageRefText (image) {
  return `[\u56fe\u7247 ref:${image.ref}${image.imageId ? ` imageId:${image.imageId}` : ''}]`
}

function hasImageRefText (message) {
  return typeof message?.text === 'string' && message.text.includes('[\u56fe\u7247 ref:')
}

function chatHasImageLikeElem (chat) {
  return Array.isArray(chat.message) && chat.message.some(isImageLikeElem)
}

function stableImageRef (chat, elem, index) {
  const id = getMessageId(chat) ||
    `${chat.group_id || ''}:${chat.time || ''}:${chat.sender?.user_id || ''}:${chat.raw_message || ''}`
  const key = [
    'group-context-image',
    id,
    index,
    elem?.type || ''
  ].join(':')
  return crypto.createHash('md5').update(key).digest('hex')
}

function extractImageFingerprint (elem, url) {
  if (!elem || typeof elem !== 'object') return shortHash(url)
  const data = elem.data || {}
  const candidates = [
    elem.md5,
    elem.hash,
    elem.fileMd5,
    elem.file_md5,
    elem.file,
    elem.file_id,
    elem.fileId,
    elem.fid,
    elem.uuid,
    data.md5,
    data.hash,
    data.fileMd5,
    data.file_md5,
    data.file,
    data.file_id,
    data.fileId,
    data.fid,
    data.uuid,
    url
  ].filter(Boolean)
  return shortHash(candidates[0])
}

async function buildImageInfos (chat, options = {}) {
  const images = []
  if (!Array.isArray(chat.message)) {
    if (chat.raw_message?.includes('[\u56fe\u7247]') || chat.raw_message?.includes('[\u52a8\u753b\u8868\u60c5]')) {
      logger.debug(`[GroupContext] raw_message contains image marker but chat.message is not iterable: ${typeof chat.message}, isArray: ${Array.isArray(chat.message)}`)
    }
    return images
  }

  for (let i = 0; i < chat.message.length; i++) {
    const elem = chat.message[i]
    if (!isImageLikeElem(elem)) continue
    const url = extractMediaUrl(elem)
    if (!url) {
      logger.debug(`[GroupContext] found image-like message but cannot extract URL: type=${elem.type}, keys=${JSON.stringify(Object.keys(elem))}, dataKeys=${elem.data ? JSON.stringify(Object.keys(elem.data)) : 'no data'}`)
      continue
    }

    const ref = stableImageRef(chat, elem, i)
    let imageId = extractImageFingerprint(elem, url)
    try {
      const cachedImageId = visionService.getImageContentId(ref)
      if (cachedImageId) {
        imageId = cachedImageId
      } else if (options.cacheImage) {
        const saved = await visionService.saveImage(url, 'image/jpeg', ref)
        imageId = saved.imageId || imageId
      }
      visionService.rememberImageSource(ref, { url, imageId })
      images.push({ ref, url, imageId })
    } catch (err) {
      logger.warn(`[GroupContext] failed to save history image ref from ${url}: ${err.message}`)
    }
  }
  return images
}

/**
 * Format one group chat message. Images always get stable text refs; visual
 * models can additionally receive image content in the main conversation.
 *
 * @param {*} chat
 * @param {{groupContextTemplateMessage: string}} templates
 * @param {{includeImages?: boolean}} options
 * @returns {Promise<{id: string, text: string, images: Array<{url: string}>}>}
 */
export async function formatChatMessage (chat, templates, options = {}) {
  const sender = chat.sender || {}
  const id = getMessageId(chat)
  let rawMessage = chat.raw_message || '-'
  const images = await buildImageInfos(chat, { cacheImage: !options.includeImages })
  if (images.length > 0) {
    rawMessage = `${rawMessage} ${images.map(imageRefText).join(' ')}`
  }

  const text = templates.groupContextTemplateMessage
    .replace('${message.sender.card}', sender.card || '-')
    .replace('${message.sender.nickname}', sender.nickname || '-')
    .replace('${message.sender.user_id}', sender.user_id || '-')
    .replace('${message.sender.role}', sender.role || '-')
    .replace('${message.sender.title}', sender.title || '-')
    .replace('${message.time}', chat.time ? formatTimeToBeiJing(chat.time) : '-')
    .replace('${message.messageId}', id || '-')
    .replace('${message.raw_message}', rawMessage)

  return { id, text, images }
}

/**
 * Build aligned group context messages for better prompt-cache reuse.
 *
 * @param {*} e event
 * @param {number} length
 * @param {{groupContextTemplatePrefix: string, groupContextTemplateMessage: string, groupContextTemplateSuffix: string}} templates
 * @param {function} getHistoryFn
 * @param {{includeImages?: boolean}} options
 * @returns {Promise<{header: string, messages: Array<{id: string, text: string, images?: Array<{url: string}>}>}>}
 */
export async function buildGroupContextMessages (e, length, templates, getHistoryFn, options = {}) {
  const { groupContextTemplatePrefix = '' } = templates
  const includeImages = !!options.includeImages
  const chats = await getHistoryFn(e, length)
  const groupId = String(e.group_id || e.group?.group_id || 'unknown')

  const snapshot = await groupContextCache.getSnapshot(groupId)
  const snapshotById = new Map((snapshot || []).map(m => [m.id, m]))

  const newMessages = []
  for (const chat of chats.filter(chat => chat)) {
    const id = getMessageId(chat)
    const cached = snapshotById.get(id)
    const hasImage = chatHasImageLikeElem(chat)
    const shouldAttachImages = includeImages && hasImage
    const shouldUpgradeRefs = !includeImages && hasImage && !hasImageRefText(cached)
    if (cached && !shouldAttachImages && !shouldUpgradeRefs) {
      newMessages.push({ ...cached, images: [] })
      continue
    }

    const formatted = await formatChatMessage(chat, templates, { includeImages })
    if (formatted.id) newMessages.push(formatted)
  }

  if (newMessages.length === 0) {
    logger.debug(`[GroupContext] received ${chats?.length || 0} chats but no formatted messages; check messageId/seq compatibility`)
    return { header: '', messages: [] }
  }

  const header = groupContextTemplatePrefix
    .replace('${group.group_id}', groupId)
    .replace('${group.name}', e.group?.name || e.group_name || 'unknown')

  let allMessages
  if (!snapshot || snapshot.length === 0) {
    allMessages = newMessages
  } else {
    const snapshotIdMap = new Map(snapshot.map((m, i) => [m.id, i]))
    let overlapStartInSnapshot = -1
    let overlapStartInNew = -1

    for (let i = 0; i < newMessages.length; i++) {
      const idx = snapshotIdMap.get(newMessages[i].id)
      if (idx !== undefined) {
        overlapStartInSnapshot = idx
        overlapStartInNew = i
        break
      }
    }

    if (overlapStartInSnapshot < 0) {
      allMessages = newMessages
    } else {
      const prefixFromSnapshot = snapshot
        .slice(0, overlapStartInSnapshot)
        .map(m => ({ ...m, images: [] }))
      allMessages = [...prefixFromSnapshot, ...newMessages]
      logger.debug(
        `[GroupContext] cache alignment: snapshot=${snapshot.length}, new=${newMessages.length}, ` +
        `prepend=${prefixFromSnapshot.length}, total=${allMessages.length}, ` +
        `cached_ratio=${Math.round((allMessages.length - (newMessages.length - overlapStartInNew)) / allMessages.length * 100)}%`
      )
    }
  }

  // Keep the cached prefix stable for many turns. Once the high-water mark is
  // reached, shrink back to the configured history length in one step instead
  // of sliding by a few rows every turn.
  const maxSnapshotMsgs = Math.min(Math.max(length * 10, 200), 500)
  if (allMessages.length > maxSnapshotMsgs) {
    allMessages = allMessages.slice(-length)
  }

  await groupContextCache.saveSnapshot(groupId, allMessages.map(m => ({ ...m, images: [] })))

  return { header, messages: allMessages }
}
