import fetch from 'node-fetch'
import { Config } from '../config.js'
import { createParser } from 'eventsource-parser'
import https from 'https'
import WebSocket from 'ws'

const referer = atob('aHR0cHM6Ly94aW5naHVvLnhmeXVuLmNuL2NoYXQ/aWQ9')
const origin = atob('aHR0cHM6Ly94aW5naHVvLnhmeXVuLmNu')
const createChatUrl = atob('aHR0cHM6Ly94aW5naHVvLnhmeXVuLmNuL2lmbHlncHQvdS9jaGF0LWxpc3QvdjEvY3JlYXRlLWNoYXQtbGlzdA==')
const chatUrl = atob('aHR0cHM6Ly94aW5naHVvLnhmeXVuLmNuL2lmbHlncHQtY2hhdC91L2NoYXRfbWVzc2FnZS9jaGF0')
let FormData
try {
  FormData = (await import('form-data')).default
} catch (err) {
  logger.warn('未安装form-data，无法使用星火模式')
}
let crypto
try {
  crypto = (await import('crypto')).default
} catch (err) {
  logger.warn('未安装crypto，无法使用星火api模式')
}
export default class XinghuoClient {
  constructor(opts) {
    this.ssoSessionId = opts.ssoSessionId
    this.headers = {
      Referer: referer,
      Cookie: 'ssoSessionId=' + this.ssoSessionId + ';',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1',
      Origin: origin
    }
  }

  async getWsUrl() {
    if (!crypto) return false
    const APISecret = Config.xhAPISecret
    const APIKey = Config.xhAPIKey
    const date = new Date().toGMTString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET /v1.1/chat HTTP/1.1`
    const hmac = crypto.createHmac('sha256', APISecret)
    hmac.update(signatureOrigin)
    const signature = hmac.digest('base64')
    const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    const v = {
      authorization: authorization,
      date: date,
      host: "spark-api.xf-yun.com"
    }
    const url = "wss://spark-api.xf-yun.com/v1.1/chat?" + Object.keys(v).map(key => `${key}=${v[key]}`).join('&')
    return url
  }

  async sendMessage(prompt, chatId) {
    if (!FormData) {
      throw new Error('缺少依赖：form-data。请安装依赖后重试')
    }
    if (Config.xhmode == 'api') {
      if (!chatId) chatId = (Math.floor(Math.random() * 1000000) + 100000).toString()
      if (!Config.xhAppId || !Config.xhAPISecret || !Config.xhAPIKey) throw new Error('未配置api')
      const wsUrl = await this.getWsUrl()
      if (!wsUrl) throw new Error('缺少依赖：crypto。请安装依赖后重试')
      const wsSendData = {
        header: {
          app_id: Config.xhAppId,
          uid: chatId
        },
        parameter: {
          chat: {
            domain: "general",
            temperature: 0.5, // 核采样阈值
            max_tokens: 1024 // tokens最大长度
          }
        },
        payload: {
          message: {
            "text": [
              // { "role": "user", "content": "你是谁" },
              // { "role": "assistant", "content": "我是星火" },
              { "role": "user", "content": prompt }
            ]
          }
        }
      }
      let requestP = new Promise((resolve, reject) => {
        const socket = new WebSocket(wsUrl)
        socket.on('open', () => {
          socket.send(JSON.stringify(wsSendData))
        })
        socket.on('message', (message) => {
          try {
            const messageData = JSON.parse(message)
            if (messageData.header.code != 0) {
              reject(`接口发生错误：${messageData.header.message}`)
            }
            if (messageData.header.status == 2) {
              resolve(
                {
                  error: null,
                  response: messageData.payload.choices.text[0].content
                }
              )
            }
          } catch (error) {
            reject(new Error(error))
          }
        })
        socket.on('error', (error) => {
          reject(error)
        })
      })
      const { response } = await requestP
      return {
        conversationId: chatId, // chatId
        text: response
      }
    } else {
      if (!chatId) {
        chatId = (await this.createChatList()).chatListId
      }
      let requestP = new Promise((resolve, reject) => {
        let formData = new FormData()
        formData.setBoundary('----WebKitFormBoundarycATE2QFHDn9ffeWF')
        formData.append('clientType', '2')
        formData.append('chatId', chatId)
        formData.append('text', prompt)
        let randomNumber = Math.floor(Math.random() * 1000)
        let fd = '439' + randomNumber.toString().padStart(3, '0')
        formData.append('fd', fd)
        this.headers.Referer = referer + chatId
        let option = {
          method: 'POST',
          headers: Object.assign(this.headers, {
            Accept: 'text/event-stream',
            'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundarycATE2QFHDn9ffeWF'
          }),
          // body: formData,
          referrer: this.headers.Referer
        }
        let statusCode
        const req = https.request(chatUrl, option, (res) => {
          statusCode = res.statusCode
          if (statusCode !== 200) {
            logger.error('星火statusCode：' + statusCode)
          }
          let response = ''
          function onMessage(data) {
            // console.log(data)
            if (data === '<end>') {
              return resolve({
                error: null,
                response
              })
            }
            try {
              if (data) {
                response += atob(data.trim())
                if (Config.debug) {
                  logger.info(response)
                }
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
            // logger.info({ resString })
            reject(resString)
          })
        })
        formData.pipe(req)
        req.on('error', (err) => {
          logger.error(err)
          reject(err)
        })
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Request time out'))
        })
        // req.write(formData.stringify())
        req.end()
      })
      const { response } = await requestP
      // logger.info(response)
      // let responseText = atob(response)
      return {
        conversationId: chatId,
        text: response
      }
    }
  }

  async createChatList() {
    let createChatListRes = await fetch(createChatUrl, {
      method: 'POST',
      headers: Object.assign(this.headers, {
        'Content-Type': 'application/json'
      }),
      body: '{}'
    })
    if (createChatListRes.status !== 200) {
      let errorRes = await createChatListRes.text()
      let errorText = '星火对话创建失败：' + errorRes
      logger.error(errorText)
      throw new Error(errorText)
    }
    createChatListRes = await createChatListRes.json()
    if (createChatListRes.data?.id) {
      logger.info('星火对话创建成功：' + createChatListRes.data.id)
    } else {
      logger.error('星火对话创建成功: ' + JSON.stringify(createChatListRes))
      throw new Error('星火对话创建成功:' + JSON.stringify(createChatListRes))
    }
    return {
      chatListId: createChatListRes.data?.id,
      title: createChatListRes.data?.title
    }
  }
}

function atob(s) {
  return Buffer.from(s, 'base64').toString()
}
