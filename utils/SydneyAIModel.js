import SydneyAIClient from './SydneyAIClient.js'
import { Config } from './config.js'
import { BaseChatModel } from 'langchain/chat_models'

export class SydneyAIModel extends BaseChatModel {
  constructor (props) {
    super(props)
    const { userToken, cookies, cache, user, proxy } = props
    this.client = props.client || new SydneyAIClient({
      userToken, // "_U" cookie from bing.com
      cookies,
      debug: Config.debug,
      cache,
      user,
      proxy
    })
    this.props = props
  }

  async _generate (messages, stop) {
    const messagesMapped = messages.map(
      (message) => ({
        role: messageTypeToOpenAIRole(message._getType()),
        content: message.text
      })
    )
    let currentPrompt = messagesMapped[1]
    let realPrompt = messagesMapped[0]
    console.log({ currentPrompt })
    let result = await this.client.sendMessage(realPrompt.content, this.props, messagesMapped, currentPrompt.content)
    console.log(result.response)
    const generations = []
    generations.push({
      text: result.response
    })
    return {
      generations,
      llmOutput: result
    }
  }

  _llmType () {
    return 'sydney'
  }
}

function messageTypeToOpenAIRole (type) {
  switch (type) {
    case 'human': {
      return 'user'
    }
    case 'ai': {
      return 'bot'
    }
    default: {
      return 'user'
    }
  }
}
