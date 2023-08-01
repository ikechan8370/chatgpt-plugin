import fetch, { FormData, File, Headers } from 'node-fetch'
import fs from 'fs'
import crypto from 'crypto'
import https from 'https'
import { createParser } from 'eventsource-parser'
import http from 'http'
import HttpsProxyAgent from 'https-proxy-agent'
export class ClaudeAIClient {
  constructor (opts) {
    const { organizationId, sessionKey, proxy, debug = false } = opts
    this.organizationId = organizationId
    this.sessionKey = sessionKey
    this.debug = debug
    let headers = new Headers()
    headers.append('Cookie', `sessionKey=${sessionKey}`)
    headers.append('referrer', 'https://claude.ai/chat/360f8c2c-56e8-4193-99c6-8d52fad3ecc8')
    headers.append('origin', 'https://claude.ai')
    headers.append('Content-Type', 'application/json')
    this.headers = headers
    this.proxy = proxy
    this.fetch = (url, options = {}) => {
      const defaultOptions = proxy
        ? {
            agent: HttpsProxyAgent(proxy)
          }
        : {}
      const mergedOptions = {
        ...defaultOptions,
        ...options
      }

      return fetch(url, mergedOptions)
    }
  }

  /**
     * 抽取文件文本内容，https://claude.ai/api/convert_document
     * @param filePath 文件路径
     * @returns {Promise<void>}
     */
  async convertDocument (filePath) {
    let formData = new FormData()
    formData.append('orgUuid', this.organizationId)
    let buffer = fs.readFileSync(filePath)
    formData.append('file', new File([buffer]))
    let result = await this.fetch('https://claude.ai/api/convert_document', {
      body: formData,
      headers: this.headers,
      method: 'POST',
      redirect: 'manual'
    })
    if (result.statusCode === 307) {
      throw new Error('claude.ai目前不支持你所在的地区')
    }
    let fileDetail = await result.json()
    return fileDetail
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
    let result = await this.fetch(`https://claude.ai/api/organizations/${this.organizationId}/chat_conversations`, {
      body,
      headers: this.headers,
      method: 'POST',
      redirect: 'manual'
    })
    if (result.statusCode === 307) {
      throw new Error('claude.ai目前不支持你所在的地区')
    }
    let jsonRes = await result.json()
    if (this.debug) {
      console.log(jsonRes)
    }
    if (!jsonRes?.uuid) {
      console.error(jsonRes)
      throw new Error('conversation create error')
    }
    return jsonRes
  }

  async sendMessage (text, conversationId, attachments = []) {
    let body = {
      conversation_uuid: conversationId,
      organization_uuid: this.organizationId,
      text,
      attachments,
      completion: {
        incremental: true,
        model: 'claude-2',
        prompt: text,
        timezone: 'Asia/Hong_Kong'
      }
    }
    let url = 'https://claude.ai/api/append_message'
    let streamDataRes = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: this.headers,
      redirect: 'manual'
    })
    if (streamDataRes.statusCode === 307) {
      throw new Error('claude.ai目前不支持你所在的地区')
    }
    let streamData = await streamDataRes.text()
    let responseText = ''
    let streams = streamData.split('\n\n')
    streams.forEach(s => {
      let jsonStr = s.replace('data: ', '').trim()
      try {
        let jsonObj = JSON.parse(jsonStr)
        if (jsonObj && jsonObj.completion) {
          responseText += jsonObj.completion
        }
      } catch (err) {
        // ignore error
        if (this.debug) {
          console.log(jsonStr)
        }
      }
    })
    let response = {
      text: responseText.trim(),
      conversationId
    }
    return response
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
  console.log(result.response)
}

// testClaudeAI()
