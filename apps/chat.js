import Config from '../config/config.js'
import { Chaite, SendMessageOption } from 'chaite'
import { getPreset, intoUserMessage, toYunzai } from '../utils/message.js'
import { YunzaiUserState } from '../models/chaite/storage/lowdb/user_state_storage.js'
import { getGroupContextPrompt, buildGroupContextMessages, getGroupHistory } from '../utils/group.js'
import { buildMemoryPrompt } from '../models/memory/prompt.js'
import { extractTextFromUserMessage, processUserMemory } from '../models/memory/userMemoryManager.js'
import { parseBooleanFlag } from '../utils/common.js'
import { isVisualModelForSendOptions, visionService } from '../utils/vision.js'
import * as crypto from 'node:crypto'
import fetch from 'node-fetch'

function getEventUserId (e) {
  const userId = e?.user_id ?? e?.sender?.user_id
  if (userId === null || userId === undefined) {
    return ''
  }
  return String(userId).trim()
}

export class Chat extends plugin {
  constructor () {
    super({
      name: 'ChatGPT-Plugin对话',
      dsc: 'ChatGPT-Plugin对话',
      event: 'message',
      // 应🥑要求降低优先级
      priority: 555500,
      rule: [
        {
          reg: '^[^#][sS]*',
          fnc: 'chat',
          log: false
        }
      ]
    })
  }

  async chat (e) {
    if (!Chaite.getInstance()) {
      return false
    }
    const userId = getEventUserId(e)
    let state = await Chaite.getInstance().getUserStateStorage().getItem(e.sender.user_id + '')
    if (!state) {
      state = new YunzaiUserState(e.sender.user_id, e.sender.nickname, e.sender.card)
      // await Chaite.getInstance().getUserStateStorage().setItem(e.sender.user_id + '', state)
    }
    if (!state.current.conversationId) {
      state.current.conversationId = crypto.randomUUID()
    }
    if (!state.current.messageId) {
      state.current.messageId = crypto.randomUUID()
    }
    const preset = await getPreset(e, state?.settings.preset || Config.llm.defaultChatPresetId, Config.basic.toggleMode, Config.basic.togglePrefix)
    if (!preset) {
      logger.debug('不满足对话触发条件或未找到预设，不进入对话')
      return false
    } else {
      logger.info('进入对话, prompt: ' + e.msg)
    }
    const sendMessageOptions = SendMessageOption.create(state?.settings)
    sendMessageOptions.onMessageWithToolCall = async content => {
      const { msgs, forward } = await toYunzai(e, [content])
      if (msgs.length > 0) {
        await e.reply(msgs)
      }
      if (parseBooleanFlag(Config.basic.sendReasoning, true)) {
        for (let forwardElement of forward) {
          this.reply(forwardElement)
        }
      }
    }
    const userMessage = await intoUserMessage(e, {
      handleReplyText: false,
      handleReplyImage: true,
      useRawMessage: false,
      handleAtMsg: true,
      excludeAtBot: false,
      toggleMode: Config.basic.toggleMode,
      togglePrefix: Config.basic.togglePrefix
    })
    const userText = extractTextFromUserMessage(userMessage) || e.msg || ''
    sendMessageOptions.conversationId = state?.current?.conversationId
    sendMessageOptions.parentMessageId = state?.current?.messageId || state?.conversations.find(c => c.id === sendMessageOptions.conversationId)?.lastMessageId
    const retainDynamicContextHistory = preset.dynamicContextHistory === 'retain' ||
      (preset.dynamicContextHistory !== 'discard' && Config.llm.retainDynamicContextHistory === true)
    if (!retainDynamicContextHistory && sendMessageOptions.parentMessageId) {
      const historyManager = Chaite.getInstance().getHistoryManager()
      if (typeof historyManager.removeHistory === 'function') {
        const previousHistory = await historyManager.getHistory(
          sendMessageOptions.parentMessageId,
          sendMessageOptions.conversationId
        )
        const staleDynamicContexts = previousHistory.filter(message => message._chatgptDynamicContext === true)
        for (const message of staleDynamicContexts) {
          await historyManager.removeHistory(message.id, sendMessageOptions.conversationId)
        }
        if (staleDynamicContexts.length > 0) {
          logger.debug(`[Chat] removed ${staleDynamicContexts.length} stale dynamic context message(s) from history`)
        }
      } else {
        logger.warn('[Chat] current history storage does not support removing stale dynamic context messages')
      }
    }
    // systemOverride 保持静态（仅 baseSystem），动态内容移到独立 user message 中
    const baseSystem = sendMessageOptions.systemOverride || preset.sendMessageOption?.systemOverride || ''
    if (baseSystem) {
      sendMessageOptions.systemOverride = baseSystem
    }
    // 思维模型开启思考转发时禁用 streaming（与 bym 模式相同原因）
    if (Config.bym.sendReasoning && (preset.sendMessageOption?.isThinkingModel || preset.sendMessageOption?.enableReasoning)) {
      sendMessageOptions.stream = false
    }
    // 构建动态上下文（记忆、群聊上下文），拼接到用户消息前面
    // 将其从 system prompt 中分离，保持 system prompt 静态以利用 LLM prompt cache
    const contextSegments = []
    if (userText) {
      const memoryPrompt = await buildMemoryPrompt({
        userId,
        groupId: e.isGroup ? e.group_id + '' : null,
        queryText: userText
      })
      if (memoryPrompt) {
        contextSegments.push(memoryPrompt)
        logger.debug(`[Memory] memory prompt: ${memoryPrompt}`)
      }
    }
    // 群聊上下文：收集图片，文本拼入 contextSegments
    const enableGroupContext = (preset.groupContext === 'use_system' || !preset.groupContext) ? Config.llm.enableGroupContext : (preset.groupContext === 'enabled')
    const contextImages = []
    const includeGroupContextImages = Config.vision?.enableGroupContextImages !== false &&
      await isVisualModelForSendOptions(sendMessageOptions, preset)
    if (enableGroupContext && e.isGroup) {
      const groupContext = await buildGroupContextMessages(
        e,
        Config.llm.groupContextLength,
        {
          groupContextTemplatePrefix: Config.llm.groupContextTemplatePrefix,
          groupContextTemplateMessage: Config.llm.groupContextTemplateMessage,
          groupContextTemplateSuffix: Config.llm.groupContextTemplateSuffix
        },
        getGroupHistory,
        { includeImages: includeGroupContextImages }
      )
      if (groupContext?.messages.length) {
        if (groupContext.header) {
          contextSegments.push(groupContext.header)
        }
        const lines = []
        for (const m of groupContext.messages) {
          lines.push(m.text)
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
                contextImages.push({ type: 'image', image: cached.base64, mimeType: cached.mimeType, ref: img.ref })
              } catch (err) {
                logger.warn(`[GroupContext] 获取图片异常 ${img.url}: ${err.message}`)
              }
            }
          }
        }
        contextSegments.push(lines.join('\n'))
      }
    }

    // 上下文（记忆 + 群聊 header + 群聊消息 + 图片）作为一条独立 user 消息，
    // 插入到已有对话历史和本轮用户消息之间
    if (contextSegments.length > 0 || contextImages.length > 0) {
      const contextText = contextSegments.join('\n\n')
      const contextContent = []
      if (contextText) contextContent.push({ type: 'text', text: contextText })
      contextContent.push(...contextImages)
      const contextMsg = {
        id: crypto.randomUUID(),
        parentId: sendMessageOptions.parentMessageId,
        role: 'user',
        content: contextContent,
        // Internal marker: allows a future turn to discard this transient
        // group/time/memory context without removing actual conversation turns.
        _chatgptDynamicContext: true
      }
      await Chaite.getInstance().getHistoryManager().saveHistory(contextMsg, sendMessageOptions.conversationId)
      sendMessageOptions.parentMessageId = contextMsg.id
    }
    const response = await Chaite.getInstance().sendMessage(userMessage, e, {
      ...sendMessageOptions,
      chatPreset: preset
    })
    // 更新当前聊天进度
    state.current.messageId = response.id
    const conversations = state.conversations
    if (conversations.find(c => c.id === sendMessageOptions.conversationId)) {
      conversations.find(c => c.id === sendMessageOptions.conversationId).lastMessageId = response.id
    } else {
      conversations.push({
        id: sendMessageOptions.conversationId,
        lastMessageId: response.id,
        // todo
        name: 'New Conversation'
      })
    }
    await Chaite.getInstance().getUserStateStorage().setItem(e.sender.user_id + '', state)
    const { msgs, forward } = await toYunzai(e, response.contents)
    if (msgs.length > 0) {
      await e.reply(msgs, true)
    }
    if (parseBooleanFlag(Config.bym.sendReasoning, true)) {
      for (let forwardElement of forward) {
        this.reply(forwardElement)
      }
    }
    // 异步提取记忆，不阻塞消息回复
    processUserMemory({
      event: e,
      userMessage,
      userText,
      conversationId: sendMessageOptions.conversationId,
      assistantContents: response.contents,
      assistantMessageId: response.id
    }).catch(err => logger.warn('[Memory] user memory extraction failed:', err.message))
  }
}
