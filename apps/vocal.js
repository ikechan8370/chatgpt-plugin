import plugin from '../../../lib/plugins/plugin.js'
import { SunoClient } from '../client/SunoClient.js'
import { Config } from '../utils/config.js'
import { maskEmail } from '../utils/common.js'
import common from '../../../lib/common/common.js'
import lodash from 'lodash'

export class Vocal extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin 音乐合成',
      dsc: '基于Suno等AI的饮月生成！',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#((创作)?歌曲|suno|Suno)',
          fnc: 'createSong',
          permission: 'master'
        }
      ]
    })
    // this.task = [
    //   {
    //     // 设置十分钟左右的浮动
    //     cron: '0/1 * * * ?',
    //     // cron: '*/2 * * * *',
    //     name: '保持suno心跳',
    //     fnc: this.heartbeat.bind(this)
    //   }
    // ]
  }

  async heartbeat (e) {
    let sessTokens = Config.sunoSessToken.split(',')
    let clientTokens = Config.sunoClientToken.split(',')
    for (let i = 0; i < sessTokens.length; i++) {
      let sessToken = sessTokens[i]
      let clientToken = clientTokens[i]
      if (sessToken && clientToken) {
        let client = new SunoClient({ sessToken, clientToken })
        await client.heartbeat()
      }
    }
  }

  async createSong (e) {
    if (!Config.sunoClientToken || !Config.sunoSessToken) {
      await e.reply('未配置Suno Token')
      return true
    }
    let description = e.msg.replace(/#((创作)?歌曲|suno|Suno)/, '')
    if (description === '额度' || description === 'credit' || description === '余额') {
      let sessTokens = Config.sunoSessToken.split(',')
      let clientTokens = Config.sunoClientToken.split(',')
      let msg = ''
      for (let i = 0; i < sessTokens.length; i++) {
        let sess = sessTokens[i]
        let clientToken = clientTokens[i]
        let client = new SunoClient({ sessToken: sess, clientToken })
        let { credit, email } = await client.queryCredit()
        logger.info({ credit, email })
        msg += `用户: ${maskEmail(email)} 余额：${credit}\n`
      }
      msg += '-------------------\n'
      msg += 'Notice：每首歌消耗5credit，每次生成2首歌'
      await e.reply(msg)
      return true
    }
    await e.reply('正在生成，请稍后')
    try {
      let sessTokens = Config.sunoSessToken.split(',')
      let clientTokens = Config.sunoClientToken.split(',')
      let tried = 0
      while (tried < sessTokens.length) {
        let index = tried
        let sess = sessTokens[index]
        let clientToken = clientTokens[index]
        let client = new SunoClient({ sessToken: sess, clientToken })
        let { credit, email } = await client.queryCredit()
        logger.info({ credit, email })
        if (credit < 10) {
          tried++
          logger.info(`账户${email}余额不足，尝试下一个账户`)
          continue
        }

        let songs = await client.createSong(description)
        if (!songs || songs.length === 0) {
          e.reply('生成失败，可能是提示词太长或者违规，请检查日志')
          return
        }
        let messages = ['提示词：' + description]
        for (let song of songs) {
          messages.push(`歌名：${song.title}\n风格: ${song.metadata.tags}\n长度: ${lodash.round(song.metadata.duration, 0)}秒\n歌词：\n${song.metadata.prompt}\n`)
          messages.push(`音频链接：${song.audio_url}\n视频链接：${song.video_url}\n封面链接：${song.image_url}\n`)
          messages.push(segment.image(song.image_url))
          // let videoPath = await downloadFile(song.video_url, `suno/${song.title}.mp4`, false, false, {
          //   'User-Agent': ''
          // })
          messages.push(segment.video(song.video_url))
        }
        await e.reply(common.makeForwardMsg(e, messages, '音乐合成结果'))
        return true
      }
      await e.reply('所有账户余额不足')
    } catch (err) {
      console.error(err)
      await e.reply('生成失败,请查看日志')
    }
  }
}
