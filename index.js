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
          reg: '^#chatgpt.*$',
          /** 执行方法 */
          fnc: 'chatgpt'
        }
      ]
    })
  }
  /**
   * 调用chatgpt接口
   * @param e oicq传递的事件参数e
   */
  async chatgpt (e) {
    logger.info(e.msg)
    let question = _.trimStart(e.msg, "#chatgpt")
    logger.info(`chatgpt question: ${question}`)
    const api = new ChatGPTAPI({ sessionToken: SESSION_TOKEN, markdown: false })
    await api.ensureAuth()
    const response = await api.sendMessage(question)
    /** 最后回复消息 */
    await this.reply(`${response}`)
  }
}
