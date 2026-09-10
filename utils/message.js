import { Chaite } from 'chaite'
import common from '../../../lib/common/common.js'
import fetch from 'node-fetch'
import { visionService } from './vision.js'
import { getPresetPrefixIndex } from './presetCache.js'
import { mapWithConcurrency } from './concurrency.js'
import ChatGPTConfig from '../config/config.js'

function imageRefText (ref) {
  return `[\u56fe\u7247 ref:${ref}]`
}

function escapeRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTogglePrefixRegExp (togglePrefix) {
  if (!togglePrefix) {
    return null
  }
  return new RegExp(`^#?(?:\\u56fe\\u7247)?${escapeRegExp(togglePrefix)}(?!gpt)`, 'i')
}

/**
 * 将e中的消息转换为chaite的UserMessage
 *
 * @param e
 * @param {{
 *   handleReplyText: boolean,
 *   handleReplyImage: boolean,
 *   handleReplyFile: boolean,
 *   useRawMessage: boolean,
 *   handleAtMsg: boolean,
 *   excludeAtBot: boolean,
 *   toggleMode: 'at' | 'prefix',
 *   togglePrefix: string
 * }} options
 * @returns {Promise<import('chaite').UserMessage>}
 */
export async function intoUserMessage (e, options = {}) {
  const {
    handleReplyText = false,
    handleReplyImage = true,
    handleReplyFile = true,
    useRawMessage = false,
    handleAtMsg = true,
    excludeAtBot = false,
    toggleMode = 'at',
    togglePrefix = null
  } = options
  const contents = []
  const imageRefs = []
  let text = ''
  const imageConcurrency = ChatGPTConfig.llm?.imageFetchConcurrency || 6

  // 下载并落盘一张图片，失败返回 null。多张图之间并发执行。
  const fetchImageContent = async url => {
    const res = await fetch(url)
    if (!res.ok) {
      logger.warn(`fetch image ${url} failed: ${res.status}`)
      return null
    }
    const mimeType = res.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await res.arrayBuffer())
    const { ref } = visionService.saveImageFromBuffer(buffer, mimeType, '', { url })
    return { type: 'image', image: buffer.toString('base64'), mimeType, ref }
  }
  if ((e.source || e.reply_id) && (handleReplyImage || handleReplyText || handleReplyFile)) {
    let seq = e.isGroup ? (e.source?.seq || e.reply_id) : (e.source?.time || e.source?.time)
    let reply
    if (e.getReply && typeof e.getReply === 'function') {
      reply = (await e.getReply()).message
    } else {
      reply = e.isGroup
        ? (await e.group.getChatHistory(seq, 1)).pop()?.message
        : (await e.friend.getChatHistory(seq, 1)).pop()?.message
    }
    if (reply) {
      // 图片先收集起来并发下载，文本/文件仍按原顺序处理
      const replyImageUrls = handleReplyImage
        ? reply.filter(val => val.type === 'image').map(val => val.url)
        : []
      const replyImages = await mapWithConcurrency(replyImageUrls, imageConcurrency, url =>
        fetchImageContent(url).catch(err => {
          logger.warn(`fetch image ${url} failed: ${err.message}`)
          return null
        })
      )
      for (const image of replyImages) {
        if (!image) continue
        contents.push(image)
        imageRefs.push(image.ref)
      }
      for (let val of reply) {
        if (val.type === 'text' && handleReplyText) {
          text = `本条消息对以下消息进行了引用回复：${val.text}\n\n本条消息内容：\n`
        } else if (val.type === 'file' && handleReplyFile) {
          let fileUrl = '获取失败'
          if (e.group?.getFileUrl) {
            fileUrl = await e.group.getFileUrl(val.fid)
          } else if (e.friend?.getFileUrl) {
            fileUrl = await e.friend.getFileUrl(val.fid)
          }
          text = `本条消息对一个文件进行了引用回复：该文件的下载地址为${fileUrl}\n\n本条消息内容：\n`
        }
      }
    }
  }
  if (useRawMessage) {
    text += e.raw_message
  } else {
    for (let val of e.message) {
      switch (val.type) {
        case 'at': {
          if (handleAtMsg) {
            const { qq, text: atCard } = val
            if ((toggleMode === 'at' || excludeAtBot) && qq === e.bot.uin) {
              break
            }
            text += ` @${atCard || qq} `
          }
          break
        }
        case 'text': {
          text += val.text
          break
        }
        default:
      }
    }
  }
  const messageImageUrls = (e.message || []).filter(element => element.type === 'image').map(element => element.url)
  const messageImages = await mapWithConcurrency(messageImageUrls, imageConcurrency, url =>
    fetchImageContent(url).catch(err => {
      logger.warn(`fetch image ${url} failed: ${err.message}`)
      return null
    })
  )
  for (const image of messageImages) {
    if (!image) continue
    contents.push(image)
    imageRefs.push(image.ref)
  }

  if (toggleMode === 'prefix') {
    const regex = getTogglePrefixRegExp(togglePrefix)
    if (regex) {
      text = text.replace(regex, '')
    }
  }
  if (imageRefs.length > 0) {
    text = `${text}${text ? ' ' : ''}${imageRefs.map(imageRefText).join(' ')}`
  }
  if (text) {
    contents.push({
      type: 'text',
      text
    })
  }
  return {
    role: 'user',
    content: contents
  }
}

/**
 * 找到本次对话使用的预设
 * @param e
 * @param {string} presetId
 * @param {'at' | 'prefix'} toggleMode
 * @param {string} togglePrefix
 * @returns {Promise<import('chaite').ChatPreset | null>}
 */
export async function getPreset (e, presetId, toggleMode, togglePrefix) {
  const isValidChat = checkChatMsg(e, toggleMode, togglePrefix)
  const manager = Chaite.getInstance().getChatPresetManager()

  // 命中 at / 通用前缀时直接走用户默认预设，前缀匹配的结果根本用不上，
  // 没必要为此把整张预设表读出来反序列化一遍。
  if (isValidChat) {
    return await manager.getInstance(presetId)
  }

  // 不是发给机器人的消息也会走到这里（每条群消息都会），所以只查前缀索引，
  // 命中之后再按 id 取那一条预设。
  const prefixIndex = await getPresetPrefixIndex(manager)
  const prefixHits = prefixIndex.filter(entry => e.msg?.startsWith(entry.prefix))
  if (prefixHits.length === 0) {
    return null
  }
  // 找到其中prefix最长的
  const hit = prefixHits.length > 1
    ? prefixHits.sort((a, b) => b.prefix.length - a.prefix.length)[0]
    : prefixHits[0]

  // 如果没找到再查一次
  return await manager.getInstance(hit.id) || await manager.getInstance(presetId)
}

/**
 *
 * @param e
 * @param {'at' | 'prefix'} toggleMode
 * @param {string} togglePrefix
 * @returns {boolean}
 */
export function checkChatMsg (e, toggleMode, togglePrefix) {
  if (toggleMode === 'at' && (e.atBot || e.isPrivate)) {
    return true
  }
  const prefixReg = getTogglePrefixRegExp(togglePrefix)
  if (toggleMode === 'prefix' && prefixReg?.test(e.msg || '')) {
    return true
  }
  return false
}

/**
 * 模型响应转为机器人格式
 * @param e
 * @param {import('chaite').MessageContent[]} contents
 * @returns {Promise<{ msgs: (import('icqq').TextElem | import('icqq').ImageElem | import('icqq').AtElem | import('icqq').PttElem | string)[], forward: *[]}>}
 */
export async function toYunzai (e, contents) {
  /**
   * 要发送的消息
   * @type {(import('icqq').TextElem | import('icqq').ImageElem | import('icqq').AtElem | import('icqq').PttElem | string)[]}
   */
  const msgs = []
  /**
   * 要转发的
   * @type {*[]}
   */
  const forward = []
  for (let content of contents) {
    switch (content.type) {
      case 'text': {
        msgs.push((/** @type {import('chaite').TextContent} **/ content).text?.trim() || '')
        break
      }
      case 'image': {
        const imageContent = (/** @type {import('chaite').ImageContent} **/ content).image
        if (imageContent.startsWith('http')) {
          msgs.push(segment.image(imageContent))
        } else if (imageContent.startsWith('base64')) {
          msgs.push(segment.image(imageContent))
        } else {
          msgs.push(segment.image(`base64://${imageContent}`))
        }
        break
      }
      case 'audio': {
        msgs.push(segment.record((/** @type {import('chaite').AudioContent} **/ content).data))
        break
      }
      case 'reasoning': {
        const reasoning = await common.makeForwardMsg(e, [(/** @type {import('chaite').ReasoningContent} **/ content).text], '思考过程')
        forward.push(reasoning)
        break
      }
      default: {
        logger.warn(`不支持的类型 ${content.type}`)
      }
    }
  }
  if (forward.length > 1) {
    const newForward = [await common.makeForwardMsg(e, forward, '多次思考过程')]
    return {
      msgs: msgs.filter(i => !!i), newForward
    }
  }
  return {
    msgs: msgs.filter(i => !!i), forward
  }
}
