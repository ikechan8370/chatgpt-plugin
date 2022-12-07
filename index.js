import plugin from '../../lib/plugins/plugin.js'
import { ChatGPTAPI } from 'chatgpt'
import _ from 'lodash'
const SESSION_TOKEN=''

export class example extends plugin {
  constructor () {
    super({
      /** 功能名称 */
      name: 'chatgpt',
      /** 功能描述 */
      dsc: 'chatgpt from openai',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 5000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#chatgpt([\s\S]*)',
          /** 执行方法 */
          fnc: 'chatgpt'
        }
      ]
    })
    const api = new ChatGPTAPI({ sessionToken: SESSION_TOKEN, markdown: false })
    this.chatGPTApi = api
  }
  /**
   * 调用chatgpt接口
   * @param e oicq传递的事件参数e
   */
  async chatgpt (e) {
    logger.info(e.msg)
    let question = _.trimStart(e.msg, "#chatgpt")
    question = question.trimStart()
    logger.info(`chatgpt question: ${question}`)
    await this.chatGPTApi.ensureAuth()
    // @todo conversation
    // const response = await this.chatGPTApi.sendMessage(question, { conversationId: '0c382256-d267-4dd4-90e3-a01dd22c20a2', onProgress: this.onProgress })
    const response = await this.chatGPTApi.sendMessage(question)
    /** 最后回复消息 */
    await this.reply(`${response}`, true)
  }
  
  onProgress(partialResponse) {
    console.log(partialResponse)
  }
}
