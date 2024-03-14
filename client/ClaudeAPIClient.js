import crypto from 'crypto'
import { newFetch } from '../utils/proxy.js'
import _ from 'lodash'
import { getMessageById, upsertMessage } from '../utils/history.js'
import { BaseClient } from './BaseClient.js'

const BASEURL = 'https://api.anthropic.com'

/**
 * @typedef {Object} Content
 * @property {string} model
 * @property {string} system
 * @property {number} max_tokens
 * @property {boolean} stream
 * @property {Array<{
 *   role: 'user'|'assistant',
 *   content: string|Array<{
 *     type: 'text'|'image',
 *     text?: string,
 *     source?: {
 *       type: 'base64',
 *       media_type: 'image/jpeg'|'image/png'|'image/gif'|'image/webp',
 *       data: string
 *     }
 *   }>
 * }>} messages
 *
 * Claude消息的基本格式
 */

/**
 * @typedef {Object} ClaudeResponse
 * @property {string} id
 * @property {string} type
 * @property {number} role
 * @property {number} model
 * @property {number} stop_reason
 * @property {number} stop_sequence
 * @property {number} role
 * @property {boolean} stream
 * @property {Array<{
 *   type: string,
 *   text: string
 * }>} content
 * @property {Array<{
 *   input_tokens: number,
 *   output_tokens: number,
 * }>} usage
 * @property {{
 *   type: string,
 *   message: string,
 * }} error
 * Claude响应的基本格式
 */

export class ClaudeAPIClient extends BaseClient {
  constructor (props) {
    if (!props.upsertMessage) {
      props.upsertMessage = async function umGemini (message) {
        return await upsertMessage(message, 'Claude')
      }
    }
    if (!props.getMessageById) {
      props.getMessageById = async function umGemini (message) {
        return await getMessageById(message, 'Claude')
      }
    }
    super(props)
    this.model = props.model
    this.key = props.key
    if (!this.key) {
      throw new Error('no claude API key')
    }
    this.baseUrl = props.baseUrl || BASEURL
    this.supportFunction = false
    this.debug = props.debug
  }

  async getHistory (parentMessageId, userId = this.userId, opt = {}) {
    const history = []
    let cursor = parentMessageId
    if (!cursor) {
      return history
    }
    do {
      let parentMessage = await this.getMessageById(cursor)
      if (!parentMessage) {
        break
      } else {
        history.push(parentMessage)
        cursor = parentMessage.parentMessageId
        if (!cursor) {
          break
        }
      }
    } while (true)
    return history.reverse()
  }

  /**
   *
   * @param text
   * @param {{conversationId: string?, parentMessageId: string?, stream: boolean?, onProgress: function?, functionResponse: FunctionResponse?, system: string?, image: string?, model: string?}} opt
   * @returns {Promise<{conversationId: string?, parentMessageId: string, text: string, id: string}>}
   */
  async sendMessage (text, opt = {}) {
    let history = await this.getHistory(opt.parentMessageId)
    /**
     * 发送的body
     * @type {Content}
     * @see https://docs.anthropic.com/claude/reference/messages_post
     */
    let body = {}
    if (opt.system) {
      body.system = opt.system
    }
    const idThis = crypto.randomUUID()
    const idModel = crypto.randomUUID()
    /**
     * @type {Array<{
     *   role: 'user'|'assistant',
     *   content: string|Array<{
     *     type: 'text'|'image',
     *     text?: string,
     *     source?: {
     *       type: 'base64',
     *       media_type: 'image/jpeg'|'image/png'|'image/gif'|'image/webp',
     *       data: string
     *     }
     *   }>
     * }>}
     */
    let thisContent = [{ type: 'text', text }]
    if (opt.image) {
      thisContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: opt.image
        }
      })
    }
    const thisMessage = {
      role: 'user',
      content: thisContent,
      id: idThis,
      parentMessageId: opt.parentMessageId || undefined
    }
    history.push(_.cloneDeep(thisMessage))
    let messages = history.map(h => { return { role: h.role, content: h.content } })
    body = Object.assign(body, {
      model: opt.model || this.model || 'claude-3-opus-20240229',
      max_tokens: opt.max_tokens || 1024,
      messages,
      stream: false
    })
    let url = `${this.baseUrl}/v1/messages`
    let result = await newFetch(url, {
      headers: {
        'anthropic-version': '2023-06-01',
        'x-api-key': this.key,
        'content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(body)
    })
    if (result.status !== 200) {
      throw new Error(await result.text())
    }
    /**
     * @type {ClaudeResponse}
     */
    let response = await result.json()
    if (this.debug) {
      console.log(JSON.stringify(response))
    }
    if (response.type === 'error') {
      logger.error(response.error.message)
      throw new Error(response.error.type)
    }
    await this.upsertMessage(thisMessage)
    const respMessage = Object.assign(response, {
      id: idModel,
      parentMessageId: idThis
    })
    await this.upsertMessage(respMessage)
    return {
      text: response.content[0].text,
      conversationId: '',
      parentMessageId: idThis,
      id: idModel
    }
  }
}
