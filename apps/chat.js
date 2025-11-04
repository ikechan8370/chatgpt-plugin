import Config from '../config/config.js'
import { Chaite, SendMessageOption } from 'chaite'
import { getPreset, intoUserMessage, toYunzai } from '../utils/message.js'
import { YunzaiUserState } from '../models/chaite/storage/lowdb/user_state_storage.js'
import { getGroupContextPrompt } from '../utils/group.js'
import { buildMemoryPrompt } from '../models/memory/prompt.js'
import { extractTextFromUserMessage, processUserMemory } from '../models/memory/userMemoryManager.js'
import * as crypto from 'node:crypto'

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
      for (let forwardElement of forward) {
        this.reply(forwardElement)
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
    const systemSegments = []
    const baseSystem = sendMessageOptions.systemOverride || preset.sendMessageOption?.systemOverride || ''
    if (baseSystem) {
      systemSegments.push(baseSystem)
    }
    if (userText) {
      const memoryPrompt = await buildMemoryPrompt({
        userId: e.sender.user_id + '',
        groupId: e.isGroup ? e.group_id + '' : null,
        queryText: userText
      })
      if (memoryPrompt) {
        systemSegments.push(memoryPrompt)
        logger.debug(`[Memory] memory prompt: ${memoryPrompt}`)
      }
    }
    const enableGroupContext = (preset.groupContext === 'use_system' || !preset.groupContext) ? Config.llm.enableGroupContext : (preset.groupContext === 'enabled')
    if (enableGroupContext && e.isGroup) {
      const contextPrompt = await getGroupContextPrompt(e, Config.llm.groupContextLength)
      if (contextPrompt) {
        systemSegments.push(contextPrompt)
      }
    }
    if (systemSegments.length > 0) {
      sendMessageOptions.systemOverride = systemSegments.join('\n\n')
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
    for (let forwardElement of forward) {
      this.reply(forwardElement)
    }
    await processUserMemory({
      event: e,
      userMessage,
      userText,
      conversationId: sendMessageOptions.conversationId,
      assistantContents: response.contents,
      assistantMessageId: response.id
    })
  }
}
