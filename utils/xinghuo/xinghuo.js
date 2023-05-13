import fetch from 'node-fetch'
import { Config } from '../config.js'
import { createParser } from 'eventsource-parser'
import https from 'https'

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
export default class XinghuoClient {
  constructor (opts) {
    this.ssoSessionId = opts.ssoSessionId
    this.headers = {
      Referer: referer,
      Cookie: 'ssoSessionId=' + this.ssoSessionId + ';',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1',
      Origin: origin
    }
  }

  async sendMessage (prompt, chatId) {
    if (!FormData) {
      throw new Error('缺少依赖：form-data。请安装依赖后重试')
    }
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
        function onMessage (data) {
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

  async createChatList () {
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
      throw new Error('星火对话创建成功:'  + JSON.stringify(createChatListRes))
    }
    return {
      chatListId: createChatListRes.data?.id,
      title: createChatListRes.data?.title
    }
  }
}

function atob (s) {
  return Buffer.from(s, 'base64').toString()
}
