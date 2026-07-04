import fs from 'node:fs'
import path from 'node:path'
import fetch from 'node-fetch'
import https from 'node:https'
import { fileTypeFromBuffer } from 'file-type'
import { Chaite, SendMessageOption } from 'chaite'
import { getMeiliClient, isMeiliConfigured } from './client.js'
import ChatGPTConfig from '../../config/config.js'
import { dataDir } from '../../utils/common.js'

const RECEIVED_DIR = path.join(dataDir, 'received')

function ensureDir (dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * 下载文件
 */
async function downloadFile (url, destPath) {
  ensureDir(path.dirname(destPath))
  const resp = await fetch(url, {
    agent: url.startsWith('https') ? new https.Agent({ rejectUnauthorized: false }) : undefined
  })
  if (!resp.ok) throw new Error(`download failed: ${resp.status}`)
  const fileStream = fs.createWriteStream(destPath)
  await new Promise((resolve, reject) => {
    resp.body.pipe(fileStream)
    resp.body.on('error', reject)
    fileStream.on('finish', resolve)
  })
  return destPath
}

/**
 * AI 图片描述 - 通过 chaite 渠道/预设调用
 */
async function describeImage (imageBase64, mime) {
  const presetId = ChatGPTConfig.meili?.aiPresetId
  if (!presetId) {
    logger.warn('[MeiliIndexer] 未配置 meili.aiPresetId，跳过图片描述')
    return null
  }

  const chaite = Chaite.getInstance()
  if (!chaite) return null

  const presetManager = chaite.getChatPresetManager()
  const preset = await presetManager.getInstance(presetId)
  if (!preset) {
    logger.warn(`[MeiliIndexer] 预设 ${presetId} 不存在`)
    return null
  }

  const prompt = `描述一下这个图片，返回描述文本和对应的tags。tags和文本不宜过多。tags一般不超过5个。描述不超过50字，除非图片中有文字需要复述。描述文本和tags都应该有助于通过关键词检索到该张图片。如果图片中有文字，应该将文字包含在描述中，如果文字较多可以只包含概述。要求返回json格式，包含两个字段 \`tags\` (list[str])和 \`description\` (str).优先使用简体中文进行描述。返回内容必须是完整json字符串且不包含任何其他字符。`

  const sendOptions = new SendMessageOption({
    disableHistoryRead: true,
    disableHistorySave: true,
    stream: false
  })

  try {
    const resp = await chaite.sendMessage({
      role: 'user',
      content: [
        { type: 'image', image: imageBase64, mimeType: mime },
        { type: 'text', text: prompt }
      ]
    }, null, {
      ...sendOptions,
      chatPreset: preset
    })

    const text = (resp.contents || [])
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join(' ')
      .replace(/```json/g, '').replace(/```/g, '').trim()

    try {
      return JSON.parse(text)
    } catch {
      logger.warn('[MeiliIndexer] AI 返回非 JSON:', text.slice(0, 200))
      return null
    }
  } catch (err) {
    logger.warn('[MeiliIndexer] 图片描述失败:', err.message)
    return null
  }
}

/**
 * 提取消息中的纯文本
 */
function extractMessageText (e) {
  return e.message
    .filter(item => item.type === 'text')
    .map(item => item.text)
    .join(' ')
    .trim()
}

/**
 * 格式化消息用于 MeiliSearch 索引
 */
function formatMessageForIndex (e) {
  const items = e.message.map(item => {
    switch (item.type) {
      case 'text':
        return { type: 'text', text: item.text }
      case 'at': {
        // 尝试解析 @ 对象的群名片
        let name = String(item.qq)
        try {
          const member = e.bot?.gml?.get(e.group_id)?.get(item.qq)
          if (member) name = member.card || member.nickname || name
        } catch { /* ignore */ }
        return { type: 'at', qq: String(item.qq), text: name }
      }
      case 'image':
        return {
          type: 'image',
          file: item.file || '',
          url: item.url || '',
          md5: item.md5 || '',
          size: item.size || 0,
          asface: item.asface || false
        }
      case 'face':
        return { type: 'face', id: item.id }
      case 'file':
        return {
          type: 'file',
          fid: item.fid || '',
          name: item.name || '',
          md5: item.md5 || '',
          size: item.size || 0,
          url: item.url || ''
        }
      case 'json':
        return { type: 'json', data: item.data || '' }
      default:
        return { type: item.type, data: JSON.stringify(item) }
    }
  })

  return {
    id: `${e.time}_${e.user_id}_${e.message_id || Date.now()}`,
    message: items,
    sender: {
      user_id: String(e.user_id),
      card: e.sender?.card || '',
      nickname: e.sender?.nickname || ''
    },
    group: {
      isGroup: !!(e.isGroup || e.group_id),
      group_id: e.group_id ? String(e.group_id) : '',
      group_name: e.group_name || e.group?.name || ''
    },
    quotable: {
      user_id: String(e.user_id),
      time: e.time,
      seq: e.seq || 0,
      rand: e.rand || 0
    }
  }
}

/**
 * 检查是否是群表情（asface）
 */
function isAsface (imageItem) {
  // icqq 的 asface 属性标识表情包
  return imageItem.asface === true
}

// ==================== 主索引器 ====================

let _initialized = false

export async function initIndexer () {
  if (_initialized) return
  if (!isMeiliConfigured()) {
    logger.debug('[MeiliIndexer] MeiliSearch 未配置，跳过索引器初始化')
    return
  }

  const config = ChatGPTConfig.meili
  if (!config.indexText && !config.indexImage && !config.indexFile) {
    logger.debug('[MeiliIndexer] 所有索引开关关闭，跳过')
    return
  }

  ensureDir(RECEIVED_DIR)
  _initialized = true

  let indexCount = 0

  Bot.on('message', async (e) => {
    // 跳过自己发送的消息
    if (e.user_id === Bot.uin?.toString()) return

    try {
      const client = getMeiliClient()
      if (!client) return

      const doc = formatMessageForIndex(e)

      // 处理图片：下载 + AI 描述
      if (config.indexImage && config.describeImage) {
        for (const item of doc.message) {
          if (item.type !== 'image' || !item.url) continue
          try {
            const file = item.file || `${item.md5 || Date.now()}.jpg`
            const dest = path.join(RECEIVED_DIR, file)

            // 检查是否已存在且有描述
            let existingDesc = null
            if (fs.existsSync(dest)) {
              try {
                const searchRes = await client.index(config.indexName).search('', {
                  filter: `message.file = "${file}"`,
                  limit: 1
                })
                const hit = searchRes.hits?.[0]
                if (hit) {
                  const img = hit.message?.find(i => i.file === file && i.description)
                  if (img) existingDesc = { tags: img.tags, description: img.description }
                }
              } catch { /* ignore */ }
            }

            if (existingDesc) {
              item.tags = existingDesc.tags
              item.description = existingDesc.description
              item.asface = item.asface || isAsface(e.message.find(m => m.type === 'image'))
              continue
            }

            // 下载图片
            await downloadFile(item.url, dest)

            // AI 描述
            const buffer = fs.readFileSync(dest)
            const base64 = buffer.toString('base64')
            const type = await fileTypeFromBuffer(buffer)
            const mime = type?.mime || 'image/jpeg'

            const desc = await describeImage(base64, mime)
            if (desc) {
              item.tags = desc.tags || []
              item.description = desc.description || ''
            }
            item.asface = item.asface || isAsface(e.message.find(m => m.type === 'image'))
            logger.debug(`[MeiliIndexer] 图片描述完成: ${file}`, desc)
          } catch (err) {
            logger.warn(`[MeiliIndexer] 图片处理失败:`, err.message)
          }
        }
      }

      // 下载群文件
      if (config.indexFile) {
        for (const item of doc.message) {
          if (item.type !== 'file') continue
          try {
            const fileUrl = item.url || (e.isGroup ? await e.group?.getFileUrl?.(item.fid) : null)
            if (fileUrl) {
              const dest = path.join(RECEIVED_DIR, item.name)
              if (!fs.existsSync(dest)) {
                await downloadFile(fileUrl, dest)
                logger.debug(`[MeiliIndexer] 文件下载完成: ${item.name}`)
              }
            }
          } catch (err) {
            logger.warn(`[MeiliIndexer] 文件下载失败:`, err.message)
          }
        }
      }

      // 索引到 MeiliSearch
      await client.index(config.indexName).addDocuments([doc])
      indexCount++
      if (indexCount % 50 === 0) {
        logger.debug(`[MeiliIndexer] 已索引 ${indexCount} 条消息`)
      }
    } catch (err) {
      logger.warn(`[MeiliIndexer] 索引消息失败:`, err.message)
    }
  })

  logger.info('[MeiliIndexer] 消息索引器已就绪')
}
