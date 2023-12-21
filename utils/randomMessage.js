import { Config } from './config.js'
import { ChatGPTAPI } from './openai/chatgpt-api.js'
import fetch from 'node-fetch'
import { getProxy } from './proxy.js'
let proxy = getProxy()
const newFetch = (url, options = {}) => {
  const defaultOptions = Config.proxy
    ? {
        agent: proxy(Config.proxy)
      }
    : {}

  const mergedOptions = {
    ...defaultOptions,
    ...options
  }

  return fetch(url, mergedOptions)
}

export async function generateHello () {
  let question = Config.helloPrompt || '写一段话让大家来找我聊天。类似于“有人找我聊天吗？"这种风格，轻松随意一点控制在20个字以内'
  let api = new ChatGPTAPI({
    apiBaseUrl: Config.openAiBaseUrl,
    apiKey: Config.apiKey,
    fetch: newFetch
  })
  const res = await api.sendMessage(question)
  return res.text
}
