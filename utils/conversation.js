import fetch from 'node-fetch'
import { Config } from '../utils/config.js'

export async function getConversations (qq = '') {
  let accessToken = await redis.get('CHATGPT:TOKEN')
  if (!accessToken) {
    throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
  }
  let option01 = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken
    }
  }
  if (Config.proxy) {
    option01.agent = new HttpsProxyAgent(Config.proxy)
  }
  let response = await fetch(`${Config.apiBaseUrl}/conversations?offset=0&limit=20`, option01)
  let json = await response.text()
  if (Config.debug) {
    logger.mark(json)
  }
  let conversations
  try {
    conversations = JSON.parse(json)
  } catch (e) {
    throw new Error(json)
  }
  let result = conversations.items?.sort((a, b) => b.create_time - a.create_time)
  let map = {}
  for (let i = 0; i < conversations.items.length; i++) {
    // 老用户初次更新该功能，这里频繁请求可能会429。由并行改为串行以尽量降低频率。必要时可可能还要等待。
    let item = conversations.items[i]
    let cachedConversationLastMessage = await redis.get(`CHATGPT:CONVERSATION_LAST_MESSAGE_PROMPT:${item.id}`)
    if (cachedConversationLastMessage) {
      map[item.id] = cachedConversationLastMessage
    } else {
      let option02 = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + accessToken
        }
      }
      if (Config.proxy) {
        option02.agent = new HttpsProxyAgent(Config.proxy)
      }
      // 缓存中没有，就去查官方api
      let conversationDetailResponse = await fetch(`${Config.apiBaseUrl}/api/conversation/${item.id}`, option02)
      let conversationDetail = await conversationDetailResponse.text()
      if (Config.debug) {
        logger.mark('conversation detail for conversation ' + item.id, conversationDetail)
      }
      conversationDetail = JSON.parse(conversationDetail)
      let messages = Object.values(conversationDetail.mapping || {})

      messages = messages
        .filter(message => message.message)
        .map(messages => messages.message)

      let messagesAssistant = messages.filter(messages => messages.role === 'assistant')
        .sort((a, b) => b.create_time - a.create_time)
      let messagesUser = messages.filter(messages => messages.role === 'user')
        .sort((a, b) => b.create_time - a.create_time)
      await redis.set(`CHATGPT:CONVERSATION_LENGTH:${item.id}`, messagesUser?.length || 0)
      let lastMessage = null
      if (messagesUser.length > 0) {
        lastMessage = messagesUser[0].content.parts[0]
        await redis.set(`CHATGPT:CONVERSATION_LAST_MESSAGE_PROMPT:${item.id}`, lastMessage)
        map[item.id] = lastMessage
      }
      if (messagesAssistant.length > 0) {
        await redis.set(`CHATGPT:CONVERSATION_LAST_MESSAGE_ID:${item.id}`, messagesAssistant[0].id)
      }
      await redis.set(`CHATGPT:CONVERSATION_CREATE_TIME:${item.id}`, new Date(conversationDetail.create_time * 1000).toLocaleString())
    }
  }
  let res = []
  let usingConversationId
  if (qq) {
    usingConversationId = await redis.get(`CHATGPT:QQ_CONVERSATION:${qq}`)
  }
  let promisesPostProcess = result
    .filter(conversation => map[conversation.id])
    .map(async conversation => {
      conversation.lastPrompt = map[conversation.id]
      conversation.create_time = new Date(conversation.create_time).toLocaleString()
      // 这里的时间格式还可以。不用管了。conversation.create_time =
      // title 全是 New chat，不要了
      delete conversation.title
      conversation.creater = await redis.get(`CHATGPT:CONVERSATION_CREATER_NICK_NAME:${conversation.id}`)
      if (qq && conversation.id === usingConversationId) {
        conversation.status = 'using'
      } else {
        conversation.status = 'normal'
      }
      if (conversation.lastPrompt?.length > 80) {
        conversation.lastPrompt = conversation.lastPrompt.slice(0, 80) + '......'
      }
      res.push(conversation)
    })
  await Promise.all(promisesPostProcess)
  return res
}

export async function getLatestMessageIdByConversationId (conversationId) {
  let accessToken = await redis.get('CHATGPT:TOKEN')
  if (!accessToken) {
    throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
  }
  let option03 = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken
    }
  }
  if (Config.proxy) {
    option03.agent = new HttpsProxyAgent(Config.proxy)
  }
  let conversationDetailResponse = await fetch(`${Config.apiBaseUrl}/api/conversation/${conversationId}`, option03)
  let conversationDetail = await conversationDetailResponse.text()
  if (Config.debug) {
    logger.mark('conversation detail for conversation ' + conversationId, conversationDetail)
  }
  conversationDetail = JSON.parse(conversationDetail)
  let messages = Object.values(conversationDetail.mapping)
  messages = messages
    .filter(message => message.message)
    .map(messages => messages.message)
    .filter(messages => messages.role === 'assistant')
    .sort((a, b) => b.create_time - a.create_time)
  await redis.set(`CHATGPT:CONVERSATION_LAST_MESSAGE_ID:${conversationId}`, messages[0].id)
  return messages[0].id
}

// 调用chat.open.com删除某一个对话。该操作不可逆。
export async function deleteConversation (conversationId) {
  let accessToken = await redis.get('CHATGPT:TOKEN')
  if (!accessToken) {
    throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
  }
  let option04 = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + accessToken
    },
    body: JSON.stringify({ is_visible: false })
  }
  if (Config.proxy) {
    option04.agent = new HttpsProxyAgent(Config.proxy)
  }
  let response = await fetch(`${Config.apiBaseUrl}/api/conversation/${conversationId}`, option04)
  let responseText = await response.text()
  return JSON.parse(responseText)
}
