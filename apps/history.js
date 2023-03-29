import plugin from '../../../lib/plugins/plugin.js'
import { render } from '../utils/common.js'
import { Config } from '../utils/config.js'
import { KeyvFile } from 'keyv-file'

async function getKeyv () {
  let Keyv
  try {
    Keyv = (await import('keyv')).default
  } catch (error) {
    throw new Error('keyv依赖未安装，请使用pnpm install keyv安装')
  }
  return Keyv
}
export class history extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin聊天记录',
      dsc: 'ChatGPT-Plugin聊天记录提取',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#(chatgpt|ChatGPT)(导出)?聊天记录',
          fnc: 'history'
        }
      ]
    })
  }

  async history (e) {
    let use = await redis.get('CHATGPT:USE') || 'api'
    let chat = []
    let filtered = e.message.filter(m => m.type === 'at').filter(m => m.qq !== Bot.uin)
    let queryUser = e.sender.user_id
    if (filtered.length > 0) {
      queryUser = filtered[0].qq
    }
    switch (use) {
      case 'api': {
        await e.reply('还不支持API模式呢')
        return true
      }
      case 'api3': {
        await e.reply('还不支持API3模式呢')
        return true
      }
      case 'bing': {
        if (Config.toneStyle === 'Sydney' || Config.toneStyle === 'Custom') {
          const cacheOptions = {
            namespace: Config.toneStyle,
            store: new KeyvFile({ filename: 'cache.json' })
          }
          let Keyv = await getKeyv()
          let conversationsCache = new Keyv(cacheOptions)
          const conversation = (await conversationsCache.get(`SydneyUser_${queryUser}`)) || {
            messages: [],
            createdAt: Date.now()
          }
          let key = `CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`
          let previousConversation = await redis.get(key) || JSON.stringify({})
          previousConversation = JSON.parse(previousConversation)
          let parentMessageId = previousConversation.parentMessageId
          let tmp = {}
          const previousCachedMessages = getMessagesForConversation(conversation.messages, parentMessageId)
            .map((message) => {
              return {
                text: message.message,
                author: message.role === 'User' ? 'user' : 'bot'
              }
            })
          previousCachedMessages.forEach(m => {
            if (m.author === 'user') {
              tmp.prompt = m.text
            } else {
              tmp.response = m.text
              chat.push(tmp)
              tmp = {}
            }
          })
        } else {
          await e.reply('还不支持BING模式呢')
          return true
        }
        break
      }
    }
    if (chat.length === 0) {
      await e.reply('无聊天记录', e.isGroup)
      return true
    }
    await e.reply(await render(e, 'chatgpt-plugin', 'content/History/index', {
      version: Config.version,
      user: {
        qq: e.sender.user_id,
        name: e.sender.card || e.sender.nickname || e.sender.user_id
      },
      bot: {
        qq: Bot.uin,
        name: Bot.nickname
      },
      chat
    }, {}))
  }
}

function getMessagesForConversation (messages, parentMessageId) {
  const orderedMessages = []
  let currentMessageId = parentMessageId
  while (currentMessageId) {
    const message = messages.find((m) => m.id === currentMessageId)
    if (!message) {
      break
    }
    orderedMessages.unshift(message)
    currentMessageId = message.parentMessageId
  }

  return orderedMessages
}
