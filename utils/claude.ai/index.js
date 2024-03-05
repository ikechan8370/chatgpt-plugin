import { File, FormData, Headers } from 'node-fetch'
import fs from 'fs'
import crypto from 'crypto'
import { Config } from '../config.js'
// import initCycleTLS from 'cycletls'
let initCycleTLS
try {
  initCycleTLS = (await import('cycletls')).default
} catch (err) {
  console.warn('未安装cycletls，无法使用claude2功能。')
}
export class ClaudeAIClient {
  constructor (opts) {
    if (!initCycleTLS) {
      throw new Error('CycleTLS is not installed')
    }
    const { organizationId, sessionKey, proxy, debug = false } = opts
    this.organizationId = organizationId
    this.sessionKey = sessionKey
    this.debug = debug
    let headers = new Headers()
    headers.append('Cookie', `sessionKey=${sessionKey}`)
    headers.append('referrer', 'https://claude.ai/chat')
    headers.append('origin', 'https://claude.ai')
    headers.append('Content-Type', 'application/json')
    headers.append('User-Agent', Config.claudeAIUA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36')
    // headers.append('sec-ch-ua', '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"')
    // headers.append('Sec-Ch-Ua-Mobile', '?0')
    // headers.append('Sec-Ch-Ua-Platform', '"Windows"')
    headers.append('Sec-Fetch-Dest', 'empty')
    headers.append('Sec-Fetch-Mode', 'cors')
    headers.append('Sec-Fetch-Site', 'same-origin')
    headers.append('Connection', 'keep-alive')
    headers.append('TE', 'trailers')
    headers.append('Accept-Encoding', 'gzip, deflate, br')
    headers.append('Accept-Language', 'en-US,en;q=0.5')
    headers.append('Dnt', '1')
    headers.append('Accept', '*/*')
    // headers.append('sentry-trace', 'd1c13c8e760c4e9e969a5e1aed6a38cf-a854f94e3d1a4bc7-0')
    // headers.append('anthropic-client-sha', 'cab849b55d41c73804c1b2b87a7a7fdb84263dc9')
    // headers.append('anthropic-client-version', '1')
    // headers.append('baggage', 'sentry-environment=production,sentry-release=cab849b55d41c73804c1b2b87a7a7fdb84263dc9,sentry-public_key=58e9b9d0fc244061a1b54fe288b0e483,sentry-trace_id=d1c13c8e760c4e9e969a5e1aed6a38cf')
    this.JA3 = Config.claudeAIJA3 || '772,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,27-5-65281-13-35-0-51-18-16-43-10-45-11-17513-23,29-23-24,0'

    this.headers = headers
    this.rawHeaders = {}
    Array.from(this.headers.keys()).forEach(key => {
      this.rawHeaders[key] = this.headers.get(key)
    })
    this.proxy = proxy
  }

  /**
   * 抽取文件文本内容，https://claude.ai/api/convert_document
   * @param filePath 文件路径
   * @param filename
   * @returns {Promise<void>}
   */
  async convertDocument (filePath, filename = 'file.pdf') {
    let formData = new FormData()
    formData.append('orgUuid', this.organizationId)
    let buffer = fs.readFileSync(filePath)
    formData.append('file', new File([buffer], filename))
    // let result = await this.fetch('https://claude.ai/api/convert_document', {
    //   body: formData,
    //   headers: this.headers,
    //   method: 'POST',
    //   redirect: 'manual',
    //   referrer: 'https://claude.ai/chat/bba5a67d-ee59-4196-a371-ece8a35db1f2'
    // })
    // if (result.statusCode === 307) {
    //   throw new Error('claude.ai目前不支持你所在的地区')
    // }
    // if (result.statusCode !== 200) {
    //   console.warn('failed to parse document convert result: ' + result.statusCode + ' ' + result.statusText)
    //   return null
    // }
    // let raw = await result.text()
    // try {
    //   return JSON.parse(raw)
    // } catch (e) {
    //   console.warn('failed to parse document convert result: ' + raw)
    //   return null
    // }
  }

  /**
   * 创建新的对话
   * @param uuid
   * @param name
   * @returns {Promise<unknown>}
   */
  async createConversation (uuid = crypto.randomUUID(), name = '') {
    let body = {
      name,
      uuid
    }
    body = JSON.stringify(body)
    // let result = await this.fetch(`https://claude.ai/api/organizations/${this.organizationId}/chat_conversations`, {
    //   body,
    //   headers: this.headers,
    //   method: 'POST',
    //   redirect: 'manual'
    //   // referrer: 'https://claude.ai/chat/bba5a67d-ee59-4196-a371-ece8a35db1f2'
    // })
    let host = Config.claudeAIReverseProxy || 'https://claude.ai'
    const cycleTLS = await initCycleTLS()
    let result = await cycleTLS(`${host}/api/organizations/${this.organizationId}/chat_conversations`, {
      ja3: this.JA3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      proxy: this.proxy,
      body,
      headers: this.rawHeaders,
      disableRedirect: true
    }, 'post')
    if (result.status === 307) {
      throw new Error('claude.ai目前不支持你所在的地区')
    }
    let jsonRes = result.body
    if (this.debug) {
      console.log(jsonRes)
    }
    if (!jsonRes?.uuid) {
      console.error(jsonRes)
      // console.log(result.headers)
      throw new Error('conversation create error')
    }
    return jsonRes
  }

  async sendMessage (text, conversationId, attachments = []) {
    let body = {
      attachments,
      files: [],
      // 官方更新后这里没有传值了
      // model: 'claude-2.1',
      prompt: text,
      timezone: 'Asia/Hong_Kong'
    }
    let host = Config.claudeAIReverseProxy || 'https://claude.ai'
    let url = host + `/api/organizations/${this.organizationId}/chat_conversations/${conversationId}/completion`
    const cycleTLS = await initCycleTLS()
    let streamDataRes = await cycleTLS(url, {
      ja3: this.JA3,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      proxy: this.proxy,
      body: JSON.stringify(body),
      headers: this.rawHeaders,
      disableRedirect: true,
      timeout: Config.claudeAITimeout || 120
    }, 'post')
    if (streamDataRes.status === 307) {
      throw new Error('claude.ai目前不支持你所在的地区')
    }
    if (streamDataRes.status === 200) {
      let streamData = streamDataRes.body
      // console.log(streamData)
      let responseText = ''
      let streams = streamData.split('\n').filter(s => s?.includes('data: '))
      for (let s of streams) {
        let jsonStr = s.replace('data: ', '').trim()
        try {
          let jsonObj = JSON.parse(jsonStr)
          if (jsonObj && jsonObj.completion) {
            responseText += jsonObj.completion
          }
          if (this.debug) {
            console.log(jsonObj)
          }
          // console.log(responseText)
        } catch (err) {
          // ignore error
          if (this.debug) {
            console.log(jsonStr)
          }
        }
      }
      return {
        text: responseText.trim(),
        conversationId
      }
    } else if (streamDataRes.status === 408) {
      throw new Error('claude.ai响应超时，可能是回复文本太多，请调高超时时间重试')
    } else {
      logger.error(streamDataRes.status, streamDataRes.body)
      throw new Error('unknown error')
    }
  }
}

async function testClaudeAI () {
  let client = new ClaudeAIClient({
    organizationId: '',
    sessionKey: '',
    debug: true,
    proxy: 'http://127.0.0.1:7890'
  })
  let conv = await client.createConversation()
  let result = await client.sendMessage('hello, who are you', conv.uuid)
  console.log(result.text)
  return result
}

// testClaudeAI()
