import ChatGPTConfig from '../config/config.js'
import { Chaite } from 'chaite'
import { intoUserMessage, toYunzai } from '../utils/message.js'
import common from '../../../lib/common/common.js'
import { getGroupContextPrompt, buildGroupContextMessages, getGroupHistory } from '../utils/group.js'
import { formatTimeToBeiJing, parseBooleanFlag } from '../utils/common.js'
import { extractTextFromUserMessage, processUserMemory } from '../models/memory/userMemoryManager.js'
import { buildMemoryPrompt } from '../models/memory/prompt.js'
import { isVisualModelForSendOptions, visionService } from '../utils/vision.js'
import * as crypto from 'node:crypto'
import fetch from 'node-fetch'

const DEFAULT_CONTEXTUAL_PROMPT = '你现在不是在回复某一条特定消息，而是作为这个群里的一名普通群友自然参与当前聊天。请阅读前面的群聊上下文，选择一个自然的切入点发言，可以接续话题、补充信息、吐槽、提问或表达态度。不要解释任务，不要提及“上下文”“指令”“AI”或“机器人”，不要强行引用、@或逐句回答触发你的那条消息。直接输出一段适合发到群里的自然发言。'

function getEventUserId (e) {
  const userId = e?.user_id ?? e?.sender?.user_id
  if (userId === null || userId === undefined) {
    return ''
  }
  return String(userId).trim()
}

export class bym extends plugin {
  constructor () {
    super({
      name: 'ChatGPT-Plugin伪人模式',
      dsc: 'ChatGPT-Plugin伪人模式',
      event: 'message',
      priority: 6000,
      rule: [
        {
          reg: '^[^#][sS]*',
          fnc: 'bym',
          log: false
        }
      ]
    })
  }

  async bym (e) {
    if (!Chaite.getInstance()) {
      return false
    }
    const userId = getEventUserId(e)
    if (!ChatGPTConfig.bym.enable) {
      return false
    }
    let prob = ChatGPTConfig.bym.probability
    if (ChatGPTConfig.bym.hit.find(keyword => e.msg?.includes(keyword))) {
      prob = 1
    }
    if (Math.random() > prob) {
      return false
    }
    logger.info('伪人模式触发')
    let recall = false
    let presetId = ChatGPTConfig.bym.defaultPreset
    if (ChatGPTConfig.bym.presetMap && ChatGPTConfig.bym.presetMap.length > 0) {
      const option = ChatGPTConfig.bym.presetMap.sort((a, b) => b.priority - a.priority)
        .find(item => item.keywords.find(keyword => e.msg?.includes(keyword)))
      if (option) {
        presetId = option.presetId
        recall = !!option.recall
      }
    }

    const presetManager = Chaite.getInstance().getChatPresetManager()
    let preset = await presetManager.getInstance(presetId)
    if (!preset) {
      preset = await presetManager.getInstance(ChatGPTConfig.bym.defaultPreset)
    }
    if (!preset) {
      logger.debug('未找到预设，请检查配置文件')
      return false
    }
    /**
     * @type {import('chaite').SendMessageOption}
     */
    const sendMessageOption = JSON.parse(JSON.stringify(preset.sendMessageOption))
    if (ChatGPTConfig.bym.presetPrefix) {
      if (!sendMessageOption.systemOverride) {
        sendMessageOption.systemOverride = ''
      }
      sendMessageOption.systemOverride = ChatGPTConfig.bym.presetPrefix + sendMessageOption.systemOverride
    }
    // 思维模型开启思考转发时禁用 streaming
    // chaite 绑定的 OpenAI SDK 版本过旧，streaming 路径无法聚合 reasoning_content，
    // 导致思考内容丢失（只残留一两个 token）。改用 non-streaming 路径获取完整 reasoning。
    if (ChatGPTConfig.bym.sendReasoning && sendMessageOption.isThinkingModel) {
      sendMessageOption.stream = false
    }
    // 不再将时间戳写入 systemOverride，保持 system prompt 静态以利用 LLM prompt cache
    if (ChatGPTConfig.bym.temperature >= 0) {
      sendMessageOption.temperature = ChatGPTConfig.bym.temperature
    }
    if (ChatGPTConfig.bym.maxTokens > 0) {
      sendMessageOption.maxToken = ChatGPTConfig.bym.maxTokens
    }
    const triggerUserMessage = await intoUserMessage(e, {
      handleReplyText: true,
      handleReplyImage: true,
      useRawMessage: true,
      handleAtMsg: true,
      excludeAtBot: false,
      toggleMode: ChatGPTConfig.basic.toggleMode,
      togglePrefix: ChatGPTConfig.basic.togglePrefix
    })
    const userText = extractTextFromUserMessage(triggerUserMessage) || e.msg || ''
    const contextualModeActive = ChatGPTConfig.bym.speakingMode === 'contextual' &&
      ChatGPTConfig.llm.enableGroupContext && e.isGroup
    const userMessage = contextualModeActive
      ? {
          role: 'user',
          content: [{
            type: 'text',
            text: ChatGPTConfig.bym.contextualPrompt?.trim() || DEFAULT_CONTEXTUAL_PROMPT
          }]
        }
      : triggerUserMessage
    if (ChatGPTConfig.bym.speakingMode === 'contextual' && !contextualModeActive) {
      logger.debug('[BYM] 自主融入群聊模式未满足群聊上下文条件，回退为回复触发消息')
    }
    // 伪人不记录历史
    // sendMessageOption.disableHistoryRead = true
    // sendMessageOption.disableHistorySave = true
    sendMessageOption.conversationId = 'bym' + userId + Date.now()
    sendMessageOption.parentMessageId = undefined
    // 设置多轮调用回掉
    sendMessageOption.onMessageWithToolCall = async content => {
      const { msgs, forward } = await toYunzai(e, [content])
      if (msgs.length > 0) {
        await e.reply(msgs)
      }
      if (parseBooleanFlag(ChatGPTConfig.bym.sendReasoning, false)) {
        for (let forwardElement of forward) {
          this.reply(forwardElement)
        }
      }
    }
    // === 缓存友好的消息顺序：稳定内容在前，动态内容在后 ===
    // 1. 群聊上下文 header + 对齐后的群消息（逐条，含图片）—— 前缀缓存命中
    // 2. Current Time + Memory —— 动态变化，但在缓存前缀之后
    // 3. 当前用户消息

    // 步骤1: 先保存群聊上下文（稳定前缀）
    const includeGroupContextImages = ChatGPTConfig.vision?.enableGroupContextImages !== false &&
      await isVisualModelForSendOptions(sendMessageOption, preset)
    if (ChatGPTConfig.llm.enableGroupContext && e.isGroup) {
      const groupContext = await buildGroupContextMessages(
        e,
        ChatGPTConfig.llm.groupContextLength,
        {
          groupContextTemplatePrefix: ChatGPTConfig.llm.groupContextTemplatePrefix,
          groupContextTemplateMessage: ChatGPTConfig.llm.groupContextTemplateMessage,
          groupContextTemplateSuffix: ChatGPTConfig.llm.groupContextTemplateSuffix
        },
        getGroupHistory,
        { includeImages: includeGroupContextImages }
      )
      if (groupContext?.messages.length) {
        const pendingHistoryMessages = []
        // 群聊 header 作为第一条
        if (groupContext.header) {
          const headerMsg = {
            id: crypto.randomUUID(),
            parentId: sendMessageOption.parentMessageId,
            role: 'user',
            content: [{ type: 'text', text: groupContext.header }]
          }
          pendingHistoryMessages.push(headerMsg)
          sendMessageOption.parentMessageId = headerMsg.id
        }
        // 每条群消息独立保存，附带各自图片
        for (const m of groupContext.messages) {
          const contents = [{ type: 'text', text: m.text }]
          if (m.images && m.images.length > 0 && includeGroupContextImages) {
            for (const img of m.images) {
              try {
                let cached = visionService.loadImage(img.ref)
                if (!cached) {
                  const res = await fetch(img.url)
                  if (!res.ok) {
                    logger.warn(`[GroupContext] 获取图片失败 ${img.url}: ${res.status}`)
                    continue
                  }
                  const mimeType = res.headers.get('content-type') || 'image/jpeg'
                  const buffer = Buffer.from(await res.arrayBuffer())
                  const saved = visionService.saveImageFromBuffer(buffer, mimeType, img.ref, { url: img.url })
                  cached = { base64: buffer.toString('base64'), mimeType: saved.mimeType }
                }
                contents.push({ type: 'image', image: cached.base64, mimeType: cached.mimeType, ref: img.ref })
              } catch (err) {
                logger.warn(`[GroupContext] 获取图片异常 ${img.url}: ${err.message}`)
              }
            }
          }
          const msg = {
            id: crypto.randomUUID(),
            parentId: sendMessageOption.parentMessageId,
            role: 'user',
            content: contents
          }
          pendingHistoryMessages.push(msg)
          sendMessageOption.parentMessageId = msg.id
        }
        const historyManager = Chaite.getInstance().getHistoryManager()
        if (typeof historyManager.saveHistories === 'function') {
          await historyManager.saveHistories(pendingHistoryMessages, sendMessageOption.conversationId)
        } else {
          for (const pendingHistoryMessage of pendingHistoryMessages) {
            await historyManager.saveHistory(pendingHistoryMessage, sendMessageOption.conversationId)
          }
        }
      }
    }

    // 步骤2: 动态上下文（Current Time + Memory）—— 在群聊上下文之后
    const dynamicSegments = []
    dynamicSegments.push(`Current Time: ${formatTimeToBeiJing(new Date().getTime())}`)
    if (userText) {
      const memoryPrompt = await buildMemoryPrompt({
        userId,
        groupId: e.isGroup ? e.group_id + '' : null,
        queryText: userText
      })
      if (memoryPrompt) {
        dynamicSegments.push(memoryPrompt)
        logger.debug(`[Memory] bym memory prompt: ${memoryPrompt}`)
      }
    }
    if (dynamicSegments.length > 0) {
      const dynamicText = dynamicSegments.join('\n\n')
      const dynamicMsg = {
        id: crypto.randomUUID(),
        parentId: sendMessageOption.parentMessageId,
        role: 'user',
        content: [{ type: 'text', text: dynamicText }]
      }
      await Chaite.getInstance().getHistoryManager().saveHistory(dynamicMsg, sendMessageOption.conversationId)
      sendMessageOption.parentMessageId = dynamicMsg.id
    }
    // 发送
    const response = await Chaite.getInstance().sendMessage(userMessage, e, {
      ...sendMessageOption,
      chatPreset: preset
    })
    const { msgs, forward } = await toYunzai(e, response.contents)
    if (msgs.length > 0) {
      // await e.reply(msgs, false, { recallMsg: recall })
      for (let msg of msgs) {
        await e.reply(msg, false, { recallMsg: recall ? 10 : 0 })
        await common.sleep(Math.floor(Math.random() * 2000) + 1000)
      }
    }
    if (parseBooleanFlag(ChatGPTConfig.bym.sendReasoning, false)) {
      for (let forwardElement of forward) {
        await e.reply(forwardElement, false, { recallMsg: recall ? 10 : 0 })
      }
    }
    // 异步提取记忆，不阻塞消息回复
    processUserMemory({
      event: e,
      userMessage: triggerUserMessage,
      userText,
      conversationId: sendMessageOption.conversationId,
      assistantContents: response.contents,
      assistantMessageId: response.id
    }).catch(err => logger.warn('[Memory] user memory extraction failed:', err.message))
  }
}
