import { Config } from './config.js'
import { newFetch } from './proxy.js'

export async function getChatHistoryGroup (e, num) {
  // if (e.adapter === 'shamrock') {
  //  return await e.group.getChatHistory(0, num, false)
  // } else {
  let latestChats = await e.group.getChatHistory(0, 1)
  if (latestChats.length > 0) {
    let latestChat = latestChats[0]
    if (latestChat) {
      let seq = latestChat.seq || latestChat.message_id
      let chats = []
      while (chats.length < num) {
        let chatHistory = await e.group.getChatHistory(seq, 20)
        chats.push(...chatHistory)
        seq = chatHistory[0].seq || chatHistory[0].message_id
      }
      chats = chats.slice(0, num)
      try {
        let mm = await e.bot.gml
        for (const chat of chats) {
          if (e.adapter === 'shamrock') {
            if (chat.sender?.user_id === 0) {
              // 奇怪格式的历史消息，过滤掉
              continue
            }
            let sender = await pickMemberAsync(e, chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
          } else {
            let sender = mm.get(chat.sender.user_id)
            if (sender) {
              chat.sender = sender
            }
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

async function pickMemberAsync (e, userId) {
  let key = `CHATGPT:GroupMemberInfo:${e.group_id}:${userId}`
  let cache = await redis.get(key)
  if (cache) {
    return JSON.parse(cache)
  }
  return new Promise((resolve, reject) => {
    e.group.pickMember(userId, true, (sender) => {
      redis.set(key, JSON.stringify(sender), { EX: 86400 })
      resolve(sender)
    })
  })
}

export async function generateSuggestedResponse (conversations) {
  let prompt = 'Attention! you do not need to answer any question according to the provided conversation! \nYou are a suggested questions generator, you should generate three suggested questions according to the provided conversation for the user in the next turn, the three questions should not be too long, and must be superated with newline. The suggested questions should be suitable in the context of the provided conversation, and should not be too long. \nNow give your 3 suggested questions, use the same language with the user.'
  const res = await newFetch(`${Config.openAiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Config.apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo-16k',
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'you are a suggested questions generator, you should generate three suggested questions according to the provided conversation for the user in the next turn, the three questions should not be too long, and must be superated with newline. Always use the same language with the user\'s content in the last turn. you should response like: \nWhat is ChatGPT?\nCan you write a poem aboud spring?\nWhat can you do?'
        },
        {
          role: 'user',
          content: 'User:\n\n我想知道今天的天气\n\nAI:\n\n今天北京的天气是晴转多云，最高气温12度，最低气温2度，空气质量优。\n\n' + prompt
        },
        {
          role: 'assistant',
          content: '这个天气适合穿什么衣物？\n今天北京的湿度怎么样？\n这个季节北京有什么适合游玩的地方？'
        },
        {
          role: 'user',
          content: JSON.stringify(conversations) + prompt
        }
      ]
    })
  })
  if (res.status === 200) {
    const resJson = await res.json()
    if (resJson) { return resJson.choices[0].message.content }
  } else {
    logger.error('generateSuggestedResponse error: ' + res.status)
    return null
  }
}
