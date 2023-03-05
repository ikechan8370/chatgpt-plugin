import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { generateHello } from '../utils/randomMessage.js'
import { segment } from 'oicq'
import { generateAudio } from '../utils/tts.js'

export class Entertainment extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin娱乐小功能',
      dsc: 'ChatGPT-Plugin娱乐小功能',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#(chatgpt|ChatGPT)打招呼',
          fnc: 'sendMessage'
        }
      ]
    })
    this.task = [
      {
        // 每半小时
        cron: '*/30 * * * ?',
        name: 'ChatGPT主动随机说话',
        fnc: this.sendRandomMessage.bind(this)
      }
    ]
  }

  async sendMessage (e) {
    let groupId = e.msg.replace(/^#(chatgpt|ChatGPT)打招呼/, '')
    groupId = parseInt(groupId)
    if (!Bot.getGroupList().get(groupId)) {
      await e.reply('机器人不在这个群里！')
      return
    }
    let message = await generateHello()
    let sendable = message
    logger.info(`打招呼给群聊${groupId}：` + message)
    if (Config.defaultUseTTS) {
      let audio = await generateAudio(message, Config.defaultTTSRole)
      sendable = segment.record(audio)
    }
    if (!groupId) {
      await e.reply(sendable)
    } else {
      await Bot.sendGroupMsg(groupId, sendable)
      await e.reply('发送成功！')
    }
  }

  async sendRandomMessage () {
    logger.info('开始处理：ChatGPT随机打招呼。')
    let toSend = Config.initiativeChatGroups || []
    for (let i = 0; i < toSend.length; i++) {
      let groupId = parseInt(toSend[i])
      if (Bot.getGroupList().get(groupId)) {
        if (Math.floor(Math.random() * 100) < 10) {
          let message = await generateHello()
          logger.info(`打招呼给群聊${groupId}：` + message)
          if (Config.defaultUseTTS) {
            let audio = await generateAudio(message, Config.defaultTTSRole)
            await Bot.sendGroupMsg(groupId, segment.record(audio))
          } else {
            await Bot.sendGroupMsg(groupId, message)
          }
        } else {
          logger.info(`这次就不打招呼给群聊${groupId}了`)
        }
      } else {
        logger.warn('机器人不在要发送的群组里，忽略群' + groupId)
      }
    }
  }
}
