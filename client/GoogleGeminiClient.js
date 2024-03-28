import { BaseClient } from './BaseClient.js'

import { getMessageById, upsertMessage } from '../utils/history.js'
import crypto from 'crypto'
let GoogleGenerativeAI, HarmBlockThreshold, HarmCategory
try {
  const GenerativeAI = await import('@google/generative-ai')
  GoogleGenerativeAI = GenerativeAI.GoogleGenerativeAI
  HarmBlockThreshold = GenerativeAI.HarmBlockThreshold
  HarmCategory = GenerativeAI.HarmCategory
} catch (err) {
  console.warn('未安装@google/generative-ai，无法使用Gemini，请在chatgpt-plugin目录下执行pnpm i安装新依赖')
}
export class GoogleGeminiClient extends BaseClient {
  constructor (props) {
    if (!GoogleGenerativeAI) {
      throw new Error('未安装@google/generative-ai，无法使用Gemini，请在chatgpt-plugin目录下执行pnpm i安装新依赖')
    }
    if (!props.upsertMessage) {
      props.upsertMessage = async function umGemini (message) {
        return await upsertMessage(message, 'Gemini')
      }
    }
    if (!props.getMessageById) {
      props.getMessageById = async function umGemini (message) {
        return await getMessageById(message, 'Gemini')
      }
    }
    super(props)
    this._key = props.key
    this._client = new GoogleGenerativeAI(this._key)
    this.model = this._client.getGenerativeModel({ model: props.model })
    this.supportFunction = false
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

  async sendMessage (text, opt) {
    let history = await this.getHistory(opt.parentMessageId)
    let systemMessage = opt.system
    if (systemMessage) {
      history = history.reverse()
      history.push({
        role: 'model',
        parts: 'ok'
      })
      history.push({
        role: 'user',
        parts: systemMessage
      })
      history = history.reverse()
    }
    const idUser = crypto.randomUUID()
    const idModel = crypto.randomUUID()
    let responseText = ''
    try {
      const chat = this.model.startChat({
        history,
        //   [
        //   {
        //     role: 'user',
        //     parts: 'Hello, I have 2 dogs in my house.'
        //   },
        //   {
        //     role: 'model',
        //     parts: 'Great to meet you. What would you like to know?'
        //   }
        // ],
        generationConfig: {
          // todo configuration
          maxOutputTokens: 1000,
          temperature: 0.9,
          topP: 0.95,
          topK: 16
        },
        safetySettings: [
          // todo configuration
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
        ]
      })
      if (opt.stream && (typeof opt.onProgress === 'function')) {
        const result = await chat.sendMessageStream(text)
        responseText = ''
        for await (const chunk of result.stream) {
          const chunkText = chunk.text()
          responseText += chunkText
          await opt.onProgress(responseText)
        }
        return {
          text: responseText,
          conversationId: '',
          parentMessageId: idUser,
          id: idModel
        }
      }
      const result = await chat.sendMessage(text)
      const response = await result.response
      responseText = response.text()
      return {
        text: responseText,
        conversationId: '',
        parentMessageId: idUser,
        id: idModel
      }
    } finally {
      await this.upsertMessage({
        role: 'user',
        parts: text,
        id: idUser,
        parentMessageId: opt.parentMessageId || undefined
      })
      await this.upsertMessage({
        role: 'model',
        parts: responseText,
        id: idModel,
        parentMessageId: idUser
      })
    }
  }

  async destroyHistory (conversationId, opt = {}) {
    // todo clean history
  }
}
