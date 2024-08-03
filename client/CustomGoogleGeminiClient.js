import crypto from 'crypto'
import { GoogleGeminiClient } from './GoogleGeminiClient.js'
import { newFetch } from '../utils/proxy.js'
import _ from 'lodash'

const BASEURL = 'https://generativelanguage.googleapis.com'

export const HarmCategory = {
  HARM_CATEGORY_UNSPECIFIED: 'HARM_CATEGORY_UNSPECIFIED',
  HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
  HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
  HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT'
}

export const HarmBlockThreshold = {
  HARM_BLOCK_THRESHOLD_UNSPECIFIED: 'HARM_BLOCK_THRESHOLD_UNSPECIFIED',
  BLOCK_LOW_AND_ABOVE: 'BLOCK_LOW_AND_ABOVE',
  BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
  BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  BLOCK_NONE: 'BLOCK_NONE'
}

/**
 * @typedef {{
 *   role: string,
 *   parts: Array<{
 *     text?: string,
 *     functionCall?: FunctionCall,
 *     functionResponse?: FunctionResponse
 *   }>
 * }} Content
 *
 * Gemini消息的基本格式
 */

/**
 * @typedef {{
 *    name: string,
 *    args: {}
 * }} FunctionCall
 *
 * Gemini的FunctionCall
 */

/**
 * @typedef {{
 *   name: string,
 *   response: {
 *     name: string,
 *     content: {}
 *   }
 * }} FunctionResponse
 *
 * Gemini的Function执行结果包裹
 * 其中response可以为任意，本项目根据官方示例封装为name和content两个字段
 */

export class CustomGoogleGeminiClient extends GoogleGeminiClient {
  constructor (props) {
    super(props)
    this.model = props.model
    this.baseUrl = props.baseUrl || BASEURL
    this.supportFunction = true
    this.debug = props.debug
  }

  /**
   *
   * @param text
   * @param {{
   *     conversationId: string?,
   *     parentMessageId: string?,
   *     stream: boolean?,
   *     onProgress: function?,
   *     functionResponse: FunctionResponse?,
   *     system: string?,
   *     image: string?,
   *     maxOutputTokens: number?,
   *     temperature: number?,
   *     topP: number?,
   *     tokK: number?,
   *     replyPureTextCallback: Function
   * }} opt
   * @returns {Promise<{conversationId: string?, parentMessageId: string, text: string, id: string}>}
   */
  async sendMessage (text, opt = {}) {
    let history = await this.getHistory(opt.parentMessageId)
    let systemMessage = opt.system
    if (systemMessage) {
      history = history.reverse()
      history.push({
        role: 'model',
        parts: [
          {
            text: 'ok'
          }
        ]
      })
      history.push({
        role: 'user',
        parts: [
          {
            text: systemMessage
          }
        ]
      })
      history = history.reverse()
    }
    const idThis = crypto.randomUUID()
    const idModel = crypto.randomUUID()
    const thisMessage = opt.functionResponse
      ? {
          role: 'user',
          parts: [{
            functionResponse: opt.functionResponse
          }],
          id: idThis,
          parentMessageId: opt.parentMessageId || undefined
        }
      : {
          role: 'user',
          parts: [{ text }],
          id: idThis,
          parentMessageId: opt.parentMessageId || undefined
        }
    if (opt.image) {
      thisMessage.parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: opt.image
        }
      })
    }
    history.push(_.cloneDeep(thisMessage))
    let url = `${this.baseUrl}/v1beta/models/${this.model}:generateContent`
    let body = {
      // 不去兼容官方的简单格式了，直接用，免得function还要转换
      /**
       * @type Array<Content>
       */
      contents: history,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE
        }
      ],
      generationConfig: {
        maxOutputTokens: opt.maxOutputTokens || 1000,
        temperature: opt.temperature || 0.9,
        topP: opt.topP || 0.95,
        topK: opt.tokK || 16
      },
      tools: [
        {
          functionDeclarations: this.tools.map(tool => tool.function())
          // codeExecution: {}
        }
      ]
    }
    if (opt.image) {
      delete body.tools
    }
    body.contents.forEach(content => {
      delete content.id
      delete content.parentMessageId
      delete content.conversationId
    })
    let result = await newFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'x-goog-api-key': this._key
      }
    })
    if (result.status !== 200) {
      throw new Error(await result.text())
    }
    /**
     * @type {Content | undefined}
     */
    let responseContent
    /**
     * @type {{candidates: Array<{content: Content}>}}
     */
    let response = await result.json()
    if (this.debug) {
      console.log(JSON.stringify(response))
    }
    responseContent = response.candidates[0].content
    if (responseContent.parts.find(i => i.functionCall)) {
      // functionCall
      const functionCall = responseContent.parts.find(i => i.functionCall).functionCall
      const text = responseContent.parts.find(i => i.text)?.text
      if (text) {
        // send reply first
        opt.replyPureTextCallback && await opt.replyPureTextCallback(text)
      }
      // Gemini有时候只回复一个空的functionCall,无语死了
      if (functionCall.name) {
        logger.info(JSON.stringify(functionCall))
        const funcName = functionCall.name
        let chosenTool = this.tools.find(t => t.name === funcName)
        /**
         * @type {FunctionResponse}
         */
        let functionResponse = {
          name: funcName,
          response: {
            name: funcName,
            content: null
          }
        }
        if (!chosenTool) {
          // 根本没有这个工具！
          functionResponse.response.content = {
            error: `Function ${funcName} doesn't exist`
          }
        } else {
          // execute function
          try {
            let isAdmin = ['admin', 'owner'].includes(this.e.sender.role) || (this.e.group?.is_admin && this.e.isMaster)
            let isOwner = ['owner'].includes(this.e.sender.role) || (this.e.group?.is_owner && this.e.isMaster)
            let args = Object.assign(functionCall.args, {
              isAdmin,
              isOwner,
              sender: this.e.sender,
              mode: 'gemini'
            })
            functionResponse.response.content = await chosenTool.func(args, this.e)
            if (this.debug) {
              logger.info(JSON.stringify(functionResponse.response.content))
            }
          } catch (err) {
            logger.error(err)
            functionResponse.response.content = {
              error: `Function execute error: ${err.message}`
            }
          }
        }
        let responseOpt = _.cloneDeep(opt)
        responseOpt.parentMessageId = idModel
        responseOpt.functionResponse = functionResponse
        // 递归直到返回text
        // 先把这轮的消息存下来
        await this.upsertMessage(thisMessage)
        const respMessage = Object.assign(responseContent, {
          id: idModel,
          parentMessageId: idThis
        })
        await this.upsertMessage(respMessage)
        return await this.sendMessage('', responseOpt)
      } else {
        // 谷歌抽风了，瞎调函数，不保存这轮，直接返回
        return {
          text: '',
          conversationId: '',
          parentMessageId: opt.parentMessageId,
          id: '',
          error: true
        }
      }
    }
    if (responseContent) {
      await this.upsertMessage(thisMessage)
      const respMessage = Object.assign(responseContent, {
        id: idModel,
        parentMessageId: idThis
      })
      await this.upsertMessage(respMessage)
    }
    return {
      text: responseContent.parts[0].text.trim(),
      conversationId: '',
      parentMessageId: idThis,
      id: idModel
    }
  }
}
