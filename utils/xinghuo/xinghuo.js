import fetch from 'node-fetch'
import { Config } from '../config.js'
import { createParser } from 'eventsource-parser'
import https from 'https'
import WebSocket from 'ws'
import { createHmac } from 'crypto'

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
async function getKeyv () {
  let Keyv
  try {
    Keyv = (await import('keyv')).default
  } catch (error) {
    throw new Error('keyv依赖未安装，请使用pnpm install keyv安装')
  }
  return Keyv
}
export default class XinghuoClient {
  constructor (opts) {
    this.cache = opts.cache
    this.ssoSessionId = opts.ssoSessionId
    this.headers = {
      Referer: referer,
      Cookie: 'ssoSessionId=' + this.ssoSessionId + ';',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1',
      Origin: origin
    }
  }

  apiErrorInfo (code) {
    switch (code) {
      case 10000: return '升级为ws出现错误'
      case 10001: return '通过ws读取用户的消息出错'
      case 10002: return '通过ws向用户发送消息 错'
      case 10003: return '用户的消息格式有错误'
      case 10004: return '用户数据的schema错误'
      case 10005: return '用户参数值有错误'
      case 10006: return '用户并发错误：当前用户已连接，同一用户不能多处同时连接。'
      case 10007: return '用户流量受限：服务正在处理用户当前的问题，需等待处理完成后再发送新的请求。（必须要等大模型完全回复之后，才能发送下一个问题）'
      case 10008: return '服务容量不足，联系工作人员'
      case 10009: return '和引擎建立连接失败'
      case 10010: return '接收引擎数据的错误'
      case 10011: return '发送数据给引擎的错误'
      case 10012: return '引擎内部错误'
      case 10013: return '输入内容审核不通过，涉嫌违规，请重新调整输入内容'
      case 10014: return '输出内容涉及敏感信息，审核不通过，后续结果无法展示给用户'
      case 10015: return 'appid在黑名单中'
      case 10016: return 'appid授权类的错误。比如：未开通此功能，未开通对应版本，token不足，并发超过授权 等等'
      case 10017: return '清除历史失败'
      case 10019: return '表示本次会话内容有涉及违规信息的倾向；建议开发者收到此错误码后给用户一个输入涉及违规的提示'
      case 10110: return '服务忙，请稍后再试'
      case 10163: return '请求引擎的参数异常 引擎的schema 检查不通过'
      case 10222: return '引擎网络异常'
      case 10907: return 'token数量超过上限。对话历史+问题的字数太多，需要精简输入'
      case 11200: return '授权错误：该appId没有相关功能的授权 或者 业务量超过限制'
      case 11201: return '授权错误：日流控超限。超过当日最大访问量的限制'
      case 11202: return '授权错误：秒级流控超限。秒级并发超过授权路数限制'
      case 11203: return '授权错误：并发流控超限。并发路数超过授权路数限制'
      default: return '无效错误代码'
    }
  }

  async initCache () {
    if (!this.conversationsCache) {
      const cacheOptions = this.cache || {}
      cacheOptions.namespace = cacheOptions.namespace || 'xh'
      let Keyv = await getKeyv()
      this.conversationsCache = new Keyv(cacheOptions)
    }
  }

  async getWsUrl () {
    const APISecret = Config.xhAPISecret
    const APIKey = Config.xhAPIKey
    let APILink = '/v1.1/chat'
    if (Config.xhmode === 'apiv2') {
      APILink = '/v2.1/chat'
    } else if (Config.xhmode === 'apiv3') {
      APILink = '/v3.1/chat'
    } else if (Config.xhmode === 'apiv3.5') {
      APILink = '/v3.5/chat'
    }
    const date = new Date().toGMTString()
    const algorithm = 'hmac-sha256'
    const headers = 'host date request-line'
    const signatureOrigin = `host: spark-api.xf-yun.com\ndate: ${date}\nGET ${APILink} HTTP/1.1`
    const hmac = createHmac('sha256', APISecret)
    hmac.update(signatureOrigin)
    const signature = hmac.digest('base64')
    const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`
    const authorization = Buffer.from(authorizationOrigin).toString('base64')
    const v = {
      authorization,
      date,
      host: 'spark-api.xf-yun.com'
    }
    const url = `wss://spark-api.xf-yun.com${APILink}?${Object.keys(v).map(key => `${key}=${v[key]}`).join('&')}`
    return url
  }

  async uploadImage (url) {
    // 获取图片
    let response = await fetch(url, {
      method: 'GET'
    })
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    // 上传oss
    const formData = new FormData()
    formData.append('file', buffer, 'image.png')
    const respOss = await fetch('https://xinghuo.xfyun.cn/iflygpt/oss/sign', {
      method: 'POST',
      headers: {
        Cookie: 'ssoSessionId=' + this.ssoSessionId + ';'
      },
      body: formData
    })
    if (respOss.ok) {
      const ossData = await respOss.json()
      // 上传接口
      const sparkdeskUrl = `${ossData.data.url}&authorization=${Buffer.from(ossData.data.authorization).toString('base64')}&date=${ossData.data.date}&host=${ossData.data.host}`
      const respSparkdes = await fetch(sparkdeskUrl, {
        method: 'POST',
        headers: {
          Cookie: 'ssoSessionId=' + this.ssoSessionId + ';',
          authorization: Buffer.from(ossData.data.authorization).toString('base64')
        },
        body: buffer
      })
      if (respSparkdes.ok) {
        const sparkdesData = await respSparkdes.json()
        return {
          url: sparkdesData.data.link,
          file: buffer
        }
      } else {
        try {
          const sparkdesData = await respSparkdes.json()
          logger.error('星火图片Sparkdes：发送失败' + sparkdesData.desc)
        } catch (error) {
          logger.error('星火图片Sparkdes：发送失败')
        }
        return false
      }
    } else {
      try {
        const ossData = await respOss.json()
        logger.error('星火图片OSS：上传失败' + ossData.desc)
      } catch (error) {
        logger.error('星火图片OSS：上传失败')
      }
      return false
    }
  }

  async apiMessage (prompt, chatId, ePrompt = []) {
    if (!chatId) chatId = (Math.floor(Math.random() * 1000000) + 100000).toString()

    //  初始化缓存
    await this.initCache()
    const conversationKey = `ChatXH_${chatId}`
    const conversation = (await this.conversationsCache.get(conversationKey)) || {
      messages: [],
      createdAt: Date.now()
    }

    // 获取ws链接
    const wsUrl = Config.xhmode == 'assistants' ? Config.xhAssistants : await this.getWsUrl()
    if (!wsUrl) throw new Error('获取ws链接失败')
    let domain = 'general'
    if (Config.xhmode == 'apiv2') {
      domain = 'generalv2'
    } else if (Config.xhmode == 'apiv3') {
      domain = 'generalv3'
    } else if (Config.xhmode == 'apiv3.5') {
      domain = 'generalv3.5'
    }
    // 编写消息内容
    const wsSendData = {
      header: {
        app_id: Config.xhAppId,
        uid: chatId
      },
      parameter: {
        chat: {
          domain,
          temperature: Config.xhTemperature, // 核采样阈值
          max_tokens: Config.xhMaxTokens, // tokens最大长度
          chat_id: chatId,
          top_k: Math.floor(Math.random() * 6) + 1 // 随机候选，避免重复回复
        }
      },
      payload: {
        message: {
          text: [
            ...ePrompt,
            ...conversation.messages,
            { role: 'user', content: prompt }
          ]
        }
      }
    }
    if (Config.debug) {
      logger.info(wsSendData.payload.message.text)
    }

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl)
      let resMessage = ''
      socket.on('open', () => {
        socket.send(JSON.stringify(wsSendData))
      })
      socket.on('message', async (message) => {
        try {
          const messageData = JSON.parse(message)
          if (messageData.header.code != 0) {
            if (messageData.header.code == 10907) {
              const half = Math.floor(conversation.messages.length / 2)
              conversation.messages.splice(0, half)
              await this.conversationsCache.set(conversationKey, conversation)
              resolve({
                id: (Math.floor(Math.random() * 1000000) + 100000).toString(),
                response: '对话以达到上限，已自动清理对话，请重试'
              })
            } else {
              reject(`接口发生错误：Error Code ${messageData.header.code} ,${this.apiErrorInfo(messageData.header.code)}`)
            }
          }
          if (messageData.header.status == 0 || messageData.header.status == 1) {
            resMessage += messageData.payload.choices.text[0].content
          }
          if (messageData.header.status == 2) {
            resMessage += messageData.payload.choices.text[0].content
            conversation.messages.push({
              role: 'user',
              content: prompt
            })
            conversation.messages.push({
              role: 'assistant',
              content: resMessage
            })
            // 超过规定token去除一半曾经的对话记录
            if (messageData.payload.usage.text.total_tokens >= Config.xhMaxTokens) {
              const half = Math.floor(conversation.messages.length / 2)
              conversation.messages.splice(0, half)
            }
            await this.conversationsCache.set(conversationKey, conversation)
            resolve({
              id: chatId,
              response: resMessage
            })
          }
        } catch (error) {
          reject(new Error(error))
        }
      })
      socket.on('error', (error) => {
        reject(error)
      })
    })
  }

  async webMessage (prompt, chatId, botId) {
    if (!FormData) {
      throw new Error('缺少依赖：form-data。请安装依赖后重试')
    }
    return new Promise(async (resolve, reject) => {
      let formData = new FormData()
      formData.setBoundary('----WebKitFormBoundarycATE2QFHDn9ffeWF')
      formData.append('clientType', '2')
      formData.append('chatId', chatId)
      if (prompt.image) {
        prompt.text = prompt.text.replace('[图片]', '') // 清理消息中中首个被使用的图片
        const imgdata = await this.uploadImage(prompt.image)
        if (imgdata) {
          formData.append('fileUrl', imgdata.url)
          formData.append('file', imgdata.file, 'image.png')
        }
      }
      formData.append('text', prompt.text)
      if (botId) {
        formData.append('isBot', '1')
        formData.append('botId', botId)
      }
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
          if (data.charAt(0) === '{') {
            try {
              response = JSON.parse(data).value
              if (Config.debug) {
                logger.info(response)
              }
            } catch (err) {
              reject(err)
            }
          }
          try {
            if (data && data !== '[error]') {
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
  }

  async sendMessage (prompt, option) {
    let chatId = option?.chatId
    let image = option?.image

    if (Config.xhmode == 'api' || Config.xhmode == 'apiv2' || Config.xhmode == 'apiv3' || Config.xhmode == 'apiv3.5' || Config.xhmode == 'assistants') {
      if (!Config.xhAppId || !Config.xhAPISecret || !Config.xhAPIKey) throw new Error('未配置api')
      let Prompt = []
      // 设定
      if (Config.xhPromptSerialize) {
        try {
          Prompt = JSON.parse(Config.xhPrompt)
        } catch (error) {
          Prompt = []
          logger.warn('星火设定序列化失败,本次对话不附带设定')
        }
      } else {
        Prompt = option.system ? [{ role: 'system', content: option.system }] : []
      }
      if (Config.enableChatSuno) {
        Prompt.unshift(
          { role: 'system', content: '如果我要求你生成音乐或写歌，你需要回复适合Suno生成音乐的信息。请使用Verse、Chorus、Bridge、Outro和End等关键字对歌词进行分段，如[Verse 1]。返回的消息需要使用markdown包裹的JSON格式，结构为```json{"option": "Suno", "tags": "style", "title": "title of the song", "lyrics": "lyrics"}```。' }
        )
      }
      if (Config.xhPromptEval) {
        Prompt.forEach(obj => {
          try {
            obj.content = obj.content.replace(/{{(.*?)}}/g, (match, variable) => {
              return Function(`"use strict";return ((e)=>{return ${variable} })`)()(option.e)
            })
          } catch (error) {
            logger.error(error)
          }
        })
      }

      let { response, id } = await this.apiMessage(prompt, chatId, Prompt)
      if (Config.xhRetRegExp) {
        response = response.replace(new RegExp(Config.xhRetRegExp, 'g'), Config.xhRetReplace)
      }
      return {
        conversationId: id,
        text: response
      }
    } else if (Config.xhmode == 'web') {
      let botId = false
      if (chatId && typeof chatId === 'object') {
        chatId = chatId.chatid
        botId = chatId.botid
      }
      if (!chatId) {
        chatId = (await this.createChatList()).chatListId
      }
      let { response } = await this.webMessage({ text: prompt, image }, chatId, botId)
      // logger.info(response)
      // let responseText = atob(response)
      // 处理图片
      let images
      if (response.includes('multi_image_url')) {
        images = [{
          tag: '',
          url: JSON.parse(/{([^}]*)}/g.exec(response)[0]).url
        }]
        response = '我已经完成作品，欢迎您提出宝贵的意见和建议，帮助我快速进步~~'
      }
      if (botId) {
        chatId = {
          chatid: chatId,
          botid: botId
        }
      }
      if (Config.xhRetRegExp) {
        response = response.replace(new RegExp(Config.xhRetRegExp, 'g'), Config.xhRetReplace)
      }
      return {
        conversationId: chatId,
        text: response,
        images
      }
    } else {
      throw new Error('星火模式错误')
    }
  }

  async createChatList (bot = false) {
    let createChatListRes = await fetch(createChatUrl, {
      method: 'POST',
      headers: Object.assign(this.headers, {
        'Content-Type': 'application/json',
        Botweb: bot ? 1 : 0
      }),
      body: bot ? `{"BotWeb": 1, "botId": "${bot}"}` : '{}'
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
      logger.error('星火对话创建失败: ' + JSON.stringify(createChatListRes))
      throw new Error('星火对话创建失败:' + JSON.stringify(createChatListRes))
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
