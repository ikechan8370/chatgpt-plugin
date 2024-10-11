import { BaseClient } from './BaseClient.js'

export class OpenAILikeClient extends BaseClient {
  constructor (props) {
    super(props)
    this.model = props.model
    this.key = props.key
    this.baseUrl = props.baseUrl
    this.debug = props.debug
  }

  async sendMessageRaw (text, opt = {}) {
    const messages = await this.getHistory(opt.parentMessageId, opt.conversationId)
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application-json',
        Authorization: `Bearer ${this.key}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        ...opt.completionParams || {}
      })
    })
    return await response.json()
  }
}
