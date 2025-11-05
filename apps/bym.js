import ChatGPTConfig from '../config/config.js'
import { Chaite } from 'chaite'
import { intoUserMessage, toYunzai } from '../utils/message.js'
import common from '../../../lib/common/common.js'
import { getGroupContextPrompt } from '../utils/group.js'
import { formatTimeToBeiJing } from '../utils/common.js'
import { extractTextFromUserMessage, processUserMemory } from '../models/memory/userMemoryManager.js'
import { buildMemoryPrompt } from '../models/memory/prompt.js'

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
    sendMessageOption.systemOverride = `Current Time: ${formatTimeToBeiJing(new Date().getTime())}\n` + sendMessageOption.systemOverride
    if (ChatGPTConfig.bym.temperature >= 0) {
      sendMessageOption.temperature = ChatGPTConfig.bym.temperature
    }
    if (ChatGPTConfig.bym.maxTokens > 0) {
      sendMessageOption.maxToken = ChatGPTConfig.bym.maxTokens
    }
    const userMessage = await intoUserMessage(e, {
      handleReplyText: true,
      handleReplyImage: true,
      useRawMessage: true,
      handleAtMsg: true,
      excludeAtBot: false,
      toggleMode: ChatGPTConfig.basic.toggleMode,
      togglePrefix: ChatGPTConfig.basic.togglePrefix
    })
    const userText = extractTextFromUserMessage(userMessage) || e.msg || ''
    // 伪人不记录历史
    // sendMessageOption.disableHistoryRead = true
    // sendMessageOption.disableHistorySave = true
    sendMessageOption.conversationId = 'bym' + e.user_id + Date.now()
    sendMessageOption.parentMessageId = undefined
    // 设置多轮调用回掉
    sendMessageOption.onMessageWithToolCall = async content => {
      const { msgs, forward } = await toYunzai(e, [content])
      if (msgs.length > 0) {
        await e.reply(msgs)
      }
      for (let forwardElement of forward) {
        this.reply(forwardElement)
      }
    }
    const systemSegments = []
    if (sendMessageOption.systemOverride) {
      systemSegments.push(sendMessageOption.systemOverride)
    }
    if (userText) {
      const memoryPrompt = await buildMemoryPrompt({
        userId: e.sender.user_id + '',
        groupId: e.isGroup ? e.group_id + '' : null,
        queryText: userText
      })
      if (memoryPrompt) {
        systemSegments.push(memoryPrompt)
        logger.debug(`[Memory] bym memory prompt: ${memoryPrompt}`)
      }
    }
    if (ChatGPTConfig.llm.enableGroupContext && e.isGroup) {
      const contextPrompt = await getGroupContextPrompt(e, ChatGPTConfig.llm.groupContextLength)
      if (contextPrompt) {
        systemSegments.push(contextPrompt)
      }
    }
    if (systemSegments.length > 0) {
      sendMessageOption.systemOverride = systemSegments.join('\n\n')
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
    if (ChatGPTConfig.bym.sendReasoning) {
      for (let forwardElement of forward) {
        await e.reply(forwardElement, false, { recallMsg: recall ? 10 : 0 })
      }
    }
    await processUserMemory({
      event: e,
      userMessage,
      userText,
      conversationId: sendMessageOption.conversationId,
      assistantContents: response.contents,
      assistantMessageId: response.id
    })
  }
}
