import { Config } from '../config.js'
import slack from '@slack/bolt'
let proxy
if (Config.proxy) {
  try {
    proxy = (await import('https-proxy-agent')).default
  } catch (e) {
    console.warn('未安装https-proxy-agent，请在插件目录下执行pnpm add https-proxy-agent')
  }
}
export class SlackClaudeClient {
  constructor (props) {
    this.config = props
    if (Config.slackSigningSecret && Config.slackBotUserToken && Config.slackUserToken) {
      let option = {
        signingSecret: Config.slackSigningSecret,
        token: Config.slackBotUserToken,
        // socketMode: true,
        appToken: Config.slackUserToken
        // port: 45912
      }
      if (Config.proxy) {
        option.agent = proxy(Config.proxy)
      }
      this.app = new slack.App(option)
    } else {
      throw new Error('未配置Slack信息')
    }
  }

  async sendMessage (prompt) {
    let sendResponse = await this.app.client.chat.postMessage({
      as_user: true,
      text: `${prompt}`,
      token: this.config.slackUserToken,
      channel: this.config.slackChannelId
    })
    let ts = sendResponse.ts
    let response = '_Typing…_'
    while (response.trim().endsWith('_Typing…_')) {
      let replies = await this.app.client.conversations.history({
        token: this.config.slackUserToken,
        channel: this.config.slackChannelId,
        limit: 1,
        oldest: ts
      })
      if (replies.messages.length > 0) {
        response = replies.messages[0].text
        if (Config.debug) {
          let text = response.replace('_Typing…_', '')
          if (text) {
            logger.info(response.replace('_Typing…_', ''))
          }
        }
      }
    }
    return response
  }
}
