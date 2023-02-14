import { v4 as uuidv4 } from 'uuid'
import { Config } from '../config/index.js'
import HttpsProxyAgent from 'https-proxy-agent'
import _ from 'lodash'
import fetch from 'node-fetch'
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
    const url = this._apiReverseUrl || 'https://chat.openai.com/backend-api/conversation'
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
        referer: 'https://chat.openai.com/chat'
      },
      referrer: 'https://chat.openai.com/chat'
    }
    if (Config.proxy) {
      option.agent = new HttpsProxyAgent(Config.proxy)
    }
    const res = await fetch(url, option)
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
