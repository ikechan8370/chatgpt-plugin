import { BaseClient } from './BaseClient.js'
import https from 'https'
import { Config } from '../utils/config.js'
import { createParser } from 'eventsource-parser'

const BASEURL = 'https://chatglm.cn/chatglm/backend-api/assistant/stream'

export class ChatGLM4Client extends BaseClient {
  constructor (props) {
    super(props)
    this.baseUrl = props.baseUrl || BASEURL
    this.supportFunction = false
    this.debug = props.debug
    this._refreshToken = props.refreshToken
  }

  async getAccessToken (refreshToken = this._refreshToken) {
    if (redis) {
      let lastToken = await redis.get('CHATGPT:CHATGLM4_ACCESS_TOKEN')
      if (lastToken) {
        this._accessToken = lastToken
        // todo check token through user info endpoint
        return
      }
    }
    let res = await fetch('https://chatglm.cn/chatglm/backend-api/v1/user/refresh', {
      method: 'POST',
      body: '{}',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Origin: 'https://www.chatglm.cn',
        Referer: 'https://www.chatglm.cn/main/detail',
        Authorization: `Bearer ${refreshToken}`
      }
    })
    let tokenRsp = await res.json()
    let token = tokenRsp?.result?.accessToken
    if (token) {
      this._accessToken = token
      redis && await redis.set('CHATGPT:CHATGLM4_ACCESS_TOKEN', token, { EX: 7000 })
      // accessToken will expire in 2 hours
    }
  }

  // todo https://chatglm.cn/chatglm/backend-api/v3/user/info query remain times
  /**
   *
   * @param text
   * @param {{conversationId: string?, stream: boolean?, onProgress: function?, image: string?}} opt
   * @returns {Promise<{conversationId: string?, parentMessageId: string?, text: string, id: string, image: string?}>}
   */
  async sendMessage (text, opt = {}) {
    await this.getAccessToken()
    if (!this._accessToken) {
      throw new Error('accessToken for www.chatglm.cn not set')
    }
    let { conversationId, onProgress } = opt
    const body = {
      assistant_id: '65940acff94777010aa6b796', // chatglm4
      conversation_id: conversationId || '',
      meta_data: {
        is_test: false,
        input_question_type: 'xxxx',
        channel: ''
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text
            }
          ]
        }
      ]
    }
    let conversationResponse
    let statusCode
    let messageId
    let image
    let requestP = new Promise((resolve, reject) => {
      let option = {
        method: 'POST',
        headers: {
          accept: 'text/event-stream',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          authorization: `Bearer ${this._accessToken}`,
          'content-type': 'application/json',
          referer: 'https://www.chatglm.cn/main/alltoolsdetail',
          origin: 'https://www.chatglm.cn'
        },
        referrer: 'https://www.chatglm.cn/main/alltoolsdetail',
        timeout: 60000
      }
      const req = https.request(BASEURL, option, (res) => {
        statusCode = res.statusCode
        let response

        function onMessage (data) {
          try {
            const convoResponseEvent = JSON.parse(data)
            conversationResponse = convoResponseEvent
            if (convoResponseEvent.conversation_id) {
              conversationId = convoResponseEvent.conversation_id
            }

            if (convoResponseEvent.id) {
              messageId = convoResponseEvent.id
            }

            const partialResponse =
              convoResponseEvent?.parts?.[0]
            if (partialResponse) {
              if (Config.debug) {
                logger.info(JSON.stringify(convoResponseEvent))
              }
              response = partialResponse
              if (onProgress && typeof onProgress === 'function') {
                onProgress(partialResponse)
              }
            }
            let content = partialResponse?.content[0]
            if (content?.type === 'image' && content?.status === 'finish') {
              image = content.image[0].image_url
            }
            if (convoResponseEvent.status === 'finish') {
              resolve({
                error: null,
                response,
                conversationId,
                messageId,
                conversationResponse,
                image
              })
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
    const res = await requestP
    return {
      text: res?.response?.content[0]?.text,
      conversationId: res.conversationId,
      id: res.messageId,
      image,
      raw: res?.response
    }
  }
}
