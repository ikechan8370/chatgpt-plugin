import { BaseClient } from './BaseClient.js'
import slack from '@slack/bolt'
// import { limitString } from '../utils/common.js'
// import common from '../../../lib/common/common.js'
import { getProxy } from '../utils/proxy.js'
const proxy = getProxy()
const common = {
  sleep: function (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

/**
 * 失败品
 */
export class SlackCozeClient {
  constructor (props) {
    this.config = props
    const {
      slackSigningSecret, slackBotUserToken, slackUserToken, proxy: proxyAddr, debug
    } = props
    if (slackSigningSecret && slackBotUserToken && slackUserToken) {
      let option = {
        signingSecret: slackSigningSecret,
        token: slackBotUserToken,
        // socketMode: true,
        appToken: slackUserToken
        // port: 45912
      }
      if (proxyAddr) {
        option.agent = proxy(proxyAddr)
      }
      option.logLevel = debug ? 'debug' : 'info'
      this.app = new slack.App(option)
    } else {
      throw new Error('未配置Slack信息')
    }
  }

  async sendMessage (prompt, e, t = 0) {
    if (t > 10) {
      return 'claude 未响应'
    }
    if (prompt.length > 3990) {
      logger.warn('消息长度大于slack限制，长度剪切至3990')
      function limitString (str, maxLength, addDots = true) {
        if (str.length <= maxLength) {
          return str
        } else {
          if (addDots) {
            return str.slice(0, maxLength) + '...'
          } else {
            return str.slice(0, maxLength)
          }
        }
      }
      prompt = limitString(prompt, 3990, false)
    }
    let channel
    let qq = e.sender.user_id
    if (this.config.slackCozeSpecifiedChannel) {
      channel = { id: this.config.slackCozeSpecifiedChannel }
    } else {
      let channels = await this.app.client.conversations.list({
        token: this.config.slackUserToken,
        types: 'public_channel,private_channel'
      })
      channel = channels.channels.filter(c => c.name === 'coze' + qq)
      if (!channel || channel.length === 0) {
        let createChannelResponse = await this.app.client.conversations.create({
          token: this.config.slackUserToken,
          name: 'coze' + qq,
          is_private: true
        })
        channel = createChannelResponse.channel
        await this.app.client.conversations.invite({
          token: this.config.slackUserToken,
          channel: channel.id,
          users: this.config.slackCozeUserId
        })
        await common.sleep(1000)
      } else {
        channel = channel[0]
      }
    }
    let conversationId = await redis.get(`CHATGPT:SLACK_COZE_CONVERSATION:${qq}`)
    let toSend = `<@${this.config.slackCozeUserId}> ${prompt}`
    if (!conversationId) {
      let sendResponse = await this.app.client.chat.postMessage({
        as_user: true,
        text: toSend,
        token: this.config.slackUserToken,
        channel: channel.id
      })
      let ts = sendResponse.ts
      let response = toSend
      let tryTimes = 0
      // 发完先等3喵
      await common.sleep(3000)
      while (response === toSend) {
        let replies = await this.app.client.conversations.replies({
          token: this.config.slackUserToken,
          channel: channel.id,
          limit: 1000,
          ts
        })
        await await redis.set(`CHATGPT:SLACK_COZE_CONVERSATION:${qq}`, `${ts}`)
        if (replies.messages.length > 0) {
          let formalMessages = replies.messages
          let reply = formalMessages[formalMessages.length - 1]
          if (!reply.text.startsWith(`<@${this.config.slackCozeUserId}>`)) {
            response = reply.text
            if (this.config.debug) {
              let text = response.replace('_Typing…_', '')
              if (text) {
                logger.info(response.replace('_Typing…_', ''))
              }
            }
          }
        }
        await common.sleep(2000)
        tryTimes++
        if (tryTimes > 30 && response === toSend) {
          // 过了60秒还没任何回复，就重新发一下试试
          logger.warn('claude没有响应，重试中')
          return await this.sendMessage(prompt, e, t + 1)
        }
      }
      return response
    } else {
      let toSend = `<@${this.config.slackCozeUserId}> ${prompt}`
      let postResponse = await this.app.client.chat.postMessage({
        as_user: true,
        text: toSend,
        token: this.config.slackUserToken,
        channel: channel.id,
        thread_ts: conversationId
      })
      let postTs = postResponse.ts
      let response = toSend
      let tryTimes = 0
      // 发完先等3喵
      await common.sleep(3000)
      while (response === toSend) {
        let replies = await this.app.client.conversations.replies({
          token: this.config.slackUserToken,
          channel: channel.id,
          limit: 1000,
          ts: conversationId,
          oldest: postTs
        })

        if (replies.messages.length > 0) {
          let formalMessages = replies.messages
          let reply = formalMessages[formalMessages.length - 1]
          if (!reply.text.startsWith(`<@${this.config.slackCozeUserId}>`)) {
            response = reply.text
            if (this.config.debug) {
              let text = response.replace('_Typing…_', '')
              if (text) {
                logger.info(response.replace('_Typing…_', ''))
              }
            }
          }
        }
        await common.sleep(2000)
        tryTimes++
        if (tryTimes > 30 && response === '_Typing…_') {
          // 过了60秒还没任何回复，就重新发一下试试
          logger.warn('claude没有响应，重试中')
          return await this.sendMessage(prompt, e, t + 1)
        }
      }
      return response
    }
  }
}

export class CozeSlackClient extends BaseClient {
  constructor (props) {
    super(props)
    this.supportFunction = false
    this.debug = props.debug
    this.slackCient = new SlackCozeClient()
  }

  /**
   *
   * @param text
   * @param {{conversationId: string?, stream: boolean?, onProgress: function?, image: string?}} opt
   * @returns {Promise<{conversationId: string?, parentMessageId: string?, text: string, id: string, image: string?}>}
   */
  async sendMessage (text, opt = {}) {

  }
}
