import { v4 as uuidv4 } from 'uuid'
import { Config, officialChatGPTAPI } from './config.js'
import https from 'https'
import http from 'http'
import { createParser } from 'eventsource-parser'

// API3
export class OfficialChatGPTClient {
  constructor (opts = {}) {
    const {
      accessToken,
      apiReverseUrl
    } = opts
    this._accessToken = accessToken
    this._apiReverseUrl = apiReverseUrl
  }

  async sendMessage (prompt, opts = {}) {
    let {
      conversationId,
      parentMessageId = uuidv4(),
      messageId = uuidv4(),
      action = 'next'
    } = opts
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
          },
          metadata: {}
        }
      ],
      model: Config.useGPT4 ? 'gpt-4' : 'text-davinci-002-render-sha',
      parent_message_id: parentMessageId,
      timezone_offset_min: -480,
      history_and_training_disabled: false
    }
    if (conversationId) {
      body.conversation_id = conversationId
    }
    let conversationResponse
    let statusCode
    let requestP = new Promise((resolve, reject) => {
      let option = {
        method: 'POST',
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
      logger.info('using api3 reverse proxy: ' + url)
      let requestLib = url.startsWith('https') ? https : http
      const req = requestLib.request(url, option, (res) => {
        statusCode = res.statusCode
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
        const errBody = []
        res.on('data', (chunk) => {
          // logger.mark('成功连接到chat.openai.com，准备读取数据流')
          if (statusCode === 200) {
            let str = chunk.toString()
            parser.feed(str)
          }
          errBody.push(chunk)
        })

        // const body = []
        // res.on('data', (chunk) => body.push(chunk))
        res.on('end', () => {
          const resString = Buffer.concat(errBody).toString()
          reject(resString)
        })
      })
      req.on('error', (err) => {
        reject(err)
      })

      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request time out'))
      })

      req.write(JSON.stringify(body))
      req.end()
    })
    const response = await requestP
    if (statusCode === 200) {
      return {
        text: response.response,
        conversationId: response.conversationId,
        id: response.messageId,
        parentMessageId
      }
    } else {
      console.log(response)
      throw new Error(response)
    }
  }
}
