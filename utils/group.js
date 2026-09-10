import { getBotFramework } from './bot.js'
import ChatGPTConfig from '../config/config.js'
import { formatTimeToBeiJing } from './common.js'
import { groupHeaderTemplateValues, groupMessageTemplateValues, renderTemplate } from './template.js'
export { buildGroupContextMessages } from './groupContextCache.js'

export class GroupContextCollector {
  /**
   * 获取群组上下文
   * @param {*} bot bot实例
   * @param {string} groupId 群号
   * @param {number} start 起始seq
   * @param {number} length 往前数几条
   * @returns {Promise<Array<*>>}
   */
  async collect (bot = Bot, groupId, start = 0, length = 20) {
    throw new Error('Method not implemented.')
  }
}

export class ICQQGroupContextCollector extends GroupContextCollector {
  /**
   * 获取群组上下文
   * @param {*} bot
   * @param {string} groupId
   * @param {number} start
   * @param {number} length
   * @returns {Promise<Array<*>>}
   */
  async collect (bot = Bot, groupId, start = 0, length = 20) {
    const group = bot.pickGroup(groupId)
    let latestChats = await group.getChatHistory(start, 1)
    if (latestChats.length > 0) {
      let latestChat = latestChats[0]
      if (latestChat) {
        let seq = latestChat.seq || latestChat.message_id
        let chats = []
        while (chats.length < length) {
          let chatHistory = await group.getChatHistory(seq, 20)
          if (!chatHistory || chatHistory.length === 0) {
            break
          }
          chats.push(...chatHistory.reverse())
          if (seq === chatHistory[chatHistory.length - 1].seq || seq === chatHistory[chatHistory.length - 1].message_id) {
            break
          }
          seq = chatHistory[chatHistory.length - 1].seq || chatHistory[chatHistory.length - 1].message_id
        }
        chats = chats.slice(0, length).reverse()
        try {
          let mm = bot.gml
          for (const chat of chats) {
            let sender = mm.get(chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
          }
        } catch (err) {
          logger.warn(err)
        }
        // console.log(chats)
        return chats
      }
    }
    // }
    return []
  }
}

export class TRSSGroupContextCollector extends GroupContextCollector {
  /**
   * 获取群组上下文
   * @param {*} bot
   * @param {string} groupId
   * @param {number} start
   * @param {number} length
   * @returns {Promise<Array<*>>}
   */
  async collect (bot = Bot, groupId, start = 0, length = 20) {
    if (!bot) {
      return []
    }
    const group = bot.pickGroup(groupId)
    let chats = await group.getChatHistory(start, length)
    try {
      let mm = bot.gml
      for (const chat of chats) {
        let sender = mm.get(chat.sender.user_id)
        if (sender) {
          chat.sender = sender
        }
      }
    } catch (err) {
      logger.warn(err)
    }
    // 反转为 oldest-first，与 ICQQ 顺序一致，groupContextCache 快照对齐依赖此顺序
    return chats.reverse()
  }
}

/**
 * 获取群组上下文
 * @param e
 * @param length
 * @returns {Promise<Array<*>>}
 */
export async function getGroupHistory (e, length = 20) {
  if (getBotFramework() === 'trss') {
    const collector = new TRSSGroupContextCollector()
    return await collector.collect(e.bot, e.group_id, 0, length)
  }
  return await new ICQQGroupContextCollector().collect(e.bot, e.group_id, 0, length)
}

/**
 * 获取构建群聊聊天记录的prompt
 * @param e event
 * @param {number} length 长度
 * @returns {Promise<string>}
 */
export async function getGroupContextPrompt (e, length) {
  const {
    groupContextTemplatePrefix = '',
    groupContextTemplateMessage = '',
    groupContextTemplateSuffix = ''
  } = ChatGPTConfig.llm
  const chats = await getGroupHistory(e, length)
  const rows = chats
    .filter(chat => chat)
    .map(chat => renderTemplate(
      groupContextTemplateMessage,
      groupMessageTemplateValues(chat, {
        messageId: chat.messageId,
        rawMessage: chat.raw_message,
        time: chat.time ? formatTimeToBeiJing(chat.time) : '-'
      })
    )).join('\n')
  return [
    renderTemplate(
      groupContextTemplatePrefix,
      groupHeaderTemplateValues(
        e.group?.group_id || e.group_id || 'unknown',
        e.group?.name || e.group_name || 'unknown'
      )
    ),
    rows,
    groupContextTemplateSuffix
  ].join('\n')
}
