import { v4 as uuidv4 } from 'uuid'
import {Config, defaultChatGPTAPI, officialChatGPTAPI} from '../utils/config.js'
import _ from 'lodash'
import fetch from 'node-fetch'
let proxy
if (Config.proxy) {
  try {
    proxy = (await import('https-proxy-agent')).default
  } catch (e) {
    console.warn('未安装https-proxy-agent，请在插件目录下执行pnpm add https-proxy-agent')
  }
}
// API3
export class OfficialChatGPTClient {
  constructor (opts = {}) {
    const {
      accessToken,
      apiReverseUrl,
      timeoutMs
    } = opts
    this._accessToken = accessToken
    this._apiReverseUrl = apiReverseUrl
    this._timeoutMs = timeoutMs
    this._fetch = (url, options = {}) => {
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
  }

  async sendMessage (prompt, opts = {}) {
    let {
      timeoutMs = this._timeoutMs,
      conversationId,
      parentMessageId = uuidv4(),
      messageId = uuidv4(),
      action = 'next'
    } = opts
    let abortController = null
    if (timeoutMs) {
      abortController = new AbortController()
    }
    let url = this._apiReverseUrl || officialChatGPTAPI
    if (this._apiReverseUrl && Config.proxy && !Config.apiForceUseReverse) {
      // 如果配了proxy，而且有反代，但是没开启强制反代
      url = officialChatGPTAPI
    }
    const body = {
      action,
      messages: [
        {
          id: messageId,
          role: 'user',
          content: {
            content_type: 'text',
            parts: [prompt]
          }
        }
      ],
      model: Config.plus ? 'text-davinci-002-render-sha' : 'text-davinci-002-render-sha',
      parent_message_id: parentMessageId
    }
    if (conversationId) {
      body.conversation_id = conversationId
    }
    let option = {
      method: 'POST',
      body: JSON.stringify(body),
      signal: abortController?.signal,
      headers: {
        accept: 'text/event-stream',
        'x-openai-assistant-app-id': '',
        authorization: `Bearer ${this._accessToken}`,
        'content-type': 'application/json',
        referer: 'https://chat.openai.com/chat',
        library: 'chatgpt-plugin'
      },
      referrer: 'https://chat.openai.com/chat'
    }
    const res = await this._fetch(url, option)
    const decoder = new TextDecoder('utf-8')
    const bodyBytes = await res.arrayBuffer()
    const bodyText = decoder.decode(bodyBytes)
    const events = bodyText.split('\n\n').filter(item => !_.isEmpty(item))
    let fullResponse = events[events.length - 2]
    fullResponse = _.trimStart(fullResponse, 'data: ')
    if (Config.debug) {
      logger.mark(fullResponse)
    }
    try {
      fullResponse = JSON.parse(fullResponse)
    } catch (e) {
      throw new Error(bodyText || 'unkown error, please check log')
    }
    if (!fullResponse?.message) {
      throw new Error(bodyText || 'unkown error, please check log')
    }
    return {
      text: fullResponse.message.content.parts[0],
      conversationId: fullResponse.conversation_id,
      id: fullResponse.message.id,
      parentMessageId
    }
  }
}
