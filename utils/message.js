import { v4 as uuidv4 } from 'uuid'
import { Config, officialChatGPTAPI } from './config.js'
import fetch from 'node-fetch'
import delay from 'delay'
import _ from 'lodash'
// import { createParser } from 'eventsource-parser'
let createParser
try {
  createParser = (await import('eventsource-parser')).createParser
} catch (e) {
  console.warn('未安装eventsource-parser，请在插件目录下执行pnpm i')
}

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
      model: Config.useGPT4 ? 'gpt-4' : 'text-davinci-002-render-sha',
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
    if (res.status === 403) {
      await delay(500)
      return await this.sendMessage(prompt, opts)
    }
    if (res.status !== 200) {
      let body = await res.text()
      if (body.indexOf('Conversation not found') > -1) {
        throw new Error('对话不存在，请使用指令”#结束对话“结束当前对话后重新开始对话。')
      } else {
        throw new Error(body)
      }
    }
    if (createParser) {
      let conversationResponse
      const responseP = new Promise(
        // eslint-disable-next-line no-async-promise-executor
        async (resolve, reject) => {
          let response
          function onMessage (data) {
            if (data === '[DONE]') {
              return resolve({
                error: null,
                response,
                conversationId,
                messageId,
                conversationResponse
              })
            }
            try {
              const _checkJson = JSON.parse(data)
            } catch (error) {
              // console.log('warning: parse error.')
              return
            }
            try {
              const convoResponseEvent = JSON.parse(data)
              conversationResponse = convoResponseEvent
              if (convoResponseEvent.conversation_id) {
                conversationId = convoResponseEvent.conversation_id
              }

              if (convoResponseEvent.message?.id) {
                messageId = convoResponseEvent.message.id
              }

              const partialResponse =
                    convoResponseEvent.message?.content?.parts?.[0]
              if (partialResponse) {
                if (Config.debug) {
                  logger.info(JSON.stringify(convoResponseEvent))
                }
                response = partialResponse
              }
            } catch (err) {
              console.warn('fetchSSE onMessage unexpected error', err)
              reject(err)
            }
          }

          const parser = createParser((event) => {
            if (event.type === 'event') {
              onMessage(event.data)
            }
          })
          res.body.on('readable', async () => {
            logger.mark('成功连接到chat.openai.com，准备读取数据流')
            let chunk
            while ((chunk = res.body.read()) !== null) {
              let str = chunk.toString()
              parser.feed(str)
            }
          })
        }
      )
      let response = await responseP
      return {
        text: response.response,
        conversationId: response.conversationId,
        id: response.messageId,
        parentMessageId
      }
    } else {
      logger.warn('未安装eventsource-parser，强烈建议安装以提高API3响应性能，在插件目录下执行pnpm i或pnpm add -w eventsource-parser')
      const decoder = new TextDecoder('utf-8')
      const bodyBytes = await res.arrayBuffer()
      const bodyText = decoder.decode(bodyBytes)
      const events = bodyText.split('\n\n').filter(item => !_.isEmpty(item))
      let fullResponse
      for (let i = 0; i < events.length; i++) {
        let event = events[i]
        event = _.trimStart(event, 'data: ')
        try {
          let tmp = JSON.parse(event)
          if (tmp.message) {
            fullResponse = tmp
          }
        } catch (err) {
          // console.log(event)
        }
      }
      if (Config.debug) {
        logger.mark(JSON.stringify(fullResponse))
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
}
