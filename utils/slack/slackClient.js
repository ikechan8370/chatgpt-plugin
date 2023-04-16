import { Config } from '../config.js'
import slack from '@slack/bolt'
import delay from 'delay'
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

  async sendMessage (prompt, e, t = 0) {
    if (t > 10) {
      return 'claude 未响应'
    }
    let qq = e.sender.user_id
    let channels = await this.app.client.conversations.list({
      token: this.config.slackUserToken,
      types: 'public_channel,private_channel'
    })
    let channel = channels.channels.filter(c => c.name === '' + qq)
    if (!channel || channel.length === 0) {
      let createChannelResponse = await this.app.client.conversations.create({
        token: this.config.slackUserToken,
        name: qq + '',
        is_private: true
      })
      channel = createChannelResponse.channel
      await this.app.client.conversations.invite({
        token: this.config.slackUserToken,
        channel: channel.id,
        users: Config.slackClaudeUserId
      })
      await delay(1000)
    } else {
      channel = channel[0]
    }
    let conversationId = await redis.get(`CHATGPT:SLACK_CONVERSATION:${qq}`)
    if (!conversationId) {
      let sendResponse = await this.app.client.chat.postMessage({
        as_user: true,
        text: `<@${Config.slackClaudeUserId}> ${prompt}`,
        token: this.config.slackUserToken,
        channel: channel.id
      })
      let ts = sendResponse.ts
      let response = '_Typing…_'
      let tryTimes = 0
      while (response.trim().endsWith('_Typing…_')) {
        let replies = await this.app.client.conversations.replies({
          token: this.config.slackUserToken,
          channel: channel.id,
          limit: 1000,
          ts: ts
        })
        await await redis.set(`CHATGPT:SLACK_CONVERSATION:${qq}`, `${ts}`)
        if (replies.messages.length > 0) {
          let formalMessages = replies.messages.filter(m => m.text.indexOf('Acceptable Use Policy') === -1)
          if (!formalMessages[formalMessages.length - 1].bot_profile) {
            // 问题的下一句不是bot回复的，这属于意料之外的问题，可能是多人同时问问题导致 再问一次吧
            return await this.sendMessage(prompt, e, t + 1)
          }
          let reply = formalMessages[formalMessages.length - 1]
          if (!reply.text.startsWith(`<@${Config.slackClaudeUserId}>`)) {
            response = reply.text
            if (Config.debug) {
              let text = response.replace('_Typing…_', '')
              if (text) {
                logger.info(response.replace('_Typing…_', ''))
              }
            }
          }
        }
        await delay(500)
        tryTimes++
        if (tryTimes > 10 && response === '_Typing…_') {
          // 过了5秒还没任何回复，就重新发一下试试
          logger.warn('claude没有响应，重试中')
          return await this.sendMessage(prompt, e, t + 1)
        }
      }
      return response
    } else {
      await this.app.client.chat.postMessage({
        as_user: true,
        text: `<@${Config.slackClaudeUserId}> ${prompt}`,
        token: this.config.slackUserToken,
        channel: channel.id,
        thread_ts: conversationId
      })
      let response = '_Typing…_'
      let tryTimes = 0
      while (response.trim().endsWith('_Typing…_')) {
        let replies = await this.app.client.conversations.replies({
          token: this.config.slackUserToken,
          channel: channel.id,
          limit: 1000,
          ts: conversationId
        })
        if (replies.messages.length > 0) {
          let formalMessages = replies.messages.filter(m => m.text.indexOf('Acceptable Use Policy') === -1)
          if (!formalMessages[formalMessages.length - 1].bot_profile) {
            // 问题的下一句不是bot回复的，这属于意料之外的问题，可能是多人同时问问题导致 再问一次吧
            return await this.sendMessage(prompt, e, t + 1)
          }
          let reply = formalMessages[formalMessages.length - 1]
          if (!reply.text.startsWith(`<@${Config.slackClaudeUserId}>`)) {
            response = reply.text
            if (Config.debug) {
              let text = response.replace('_Typing…_', '')
              if (text) {
                logger.info(response.replace('_Typing…_', ''))
              }
            }
          }
        }
        await delay(500)
        tryTimes++
        if (tryTimes > 10 && response === '_Typing…_') {
          // 过了5秒还没任何回复，就重新发一下试试
          logger.warn('claude没有响应，重试中')
          return await this.sendMessage(prompt, e, t + 1)
        }
      }
      return response
    }
  }
}
