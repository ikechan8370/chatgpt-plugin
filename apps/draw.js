import plugin from '../../../lib/plugins/plugin.js'
import { segment } from 'oicq'
import { createImage, imageVariation } from '../utils/dalle.js'
import { makeForwardMsg } from '../utils/common.js'
import _ from 'lodash'

export class dalle extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin Dalle 绘图',
      dsc: 'ChatGPT-Plugin基于OpenAI Dalle的绘图插件',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '#(chatgpt|ChatGPT|dalle|Dalle)(绘图|画图)',
          fnc: 'draw'
        },
        {
          reg: '#(chatgpt|ChatGPT|dalle|Dalle)(修图|图片变形|改图)',
          fnc: 'variation'
        },
        {
          reg: '#(搞|改)(她|他)头像',
          fnc: 'avatarVariation'
        }
      ]
    })
  }

  async draw (e) {
    let ttl = await redis.ttl(`CHATGPT:DRAW:${e.sender.user_id}`)
    if (ttl > 0 && !e.isMaster) {
      this.reply(`冷却中，请${ttl}秒后再试`)
      return false
    }
    let splits = _.split(e.msg, '图', 2)
    if (splits.length < 2) {
      this.reply('请带上绘图要求')
      return false
    }
    let rules = _.split(splits[1], '/')
    let [prompt = '', num = '1', size = '512x512'] = rules.slice(0, 3)
    if (['256x256', '512x512', '1024x1024'].indexOf(size) === -1) {
      this.reply('大小不符合要求，必须是256x256/512x512/1024x1024中的一个')
      return false
    }
    await redis.set(`CHATGPT:DRAW:${e.sender.user_id}`, 'c', { EX: 30 })
    let priceMap = {
      '1024x1024': 0.02,
      '512x512': 0.018,
      '256x256': 0.016
    }
    num = parseInt(num, 10)
    if (num > 5) {
      this.reply('太多啦！你要花光我的余额吗！')
      return false
    }
    await this.reply(`正在为您绘制大小为${size}的${num}张图片，预计消耗${priceMap[size] * num}美元余额，请稍候……`)
    try {
      let images = (await createImage(prompt, num, size)).map(image => segment.image(`base64://${image}`))
      if (images.length > 1) {
        this.reply(await makeForwardMsg(e, images, prompt))
      } else {
        this.reply(images[0], true)
      }
    } catch (err) {
      logger.error(err)
      this.reply(`绘图失败: ${err}`, true)
      await redis.del(`CHATGPT:DRAW:${e.sender.user_id}`)
    }
  }

  async variation (e) {
    let ttl = await redis.ttl(`CHATGPT:VARIATION:${e.sender.user_id}`)
    if (ttl > 0 && !e.isMaster) {
      this.reply(`冷却中，请${ttl}秒后再试`)
      return false
    }
    let imgUrl
    if (e.source) {
      let reply
      if (e.isGroup) {
        reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message
      } else {
        reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message
      }
      if (reply) {
        for (let val of reply) {
          if (val.type === 'image') {
            console.log(val)
            imgUrl = val.url
            break
          }
        }
      }
    } else if (e.img) {
      console.log(e.img)
      imgUrl = e.img[0]
    }
    if (!imgUrl) {
      this.reply('图呢？')
      return false
    }
    await redis.set(`CHATGPT:VARIATION:${e.sender.user_id}`, 'c', { EX: 30 })
    await this.reply('正在为您生成图片变形，请稍候……')
    try {
      let images = (await imageVariation(imgUrl)).map(image => segment.image(`base64://${image}`))
      if (images.length > 1) {
        this.reply(await makeForwardMsg(e, images))
      } else {
        this.reply(images[0], true)
      }
    } catch (err) {
      console.log(err)
      this.reply(`绘图失败: ${err}`, true)
      await redis.del(`CHATGPT:VARIATION:${e.sender.user_id}`)
    }
  }

  async avatarVariation (e) {
    let ats = e.message.filter(m => m.type === 'at').filter(at => at.qq !== e.self_id)
    if (ats.length > 0) {
      for (let i = 0; i < ats.length; i++) {
        let qq = ats[i].qq
        let imgUrl = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${qq}`
        try {
          let images = (await imageVariation(imgUrl)).map(image => segment.image(`base64://${image}`))
          if (images.length > 1) {
            this.reply(await makeForwardMsg(e, images))
          } else {
            this.reply(images[0], true)
          }
        } catch (err) {
          console.log(err)
          this.reply(`搞失败了: ${err}`, true)
          await redis.del(`CHATGPT:VARIATION:${e.sender.user_id}`)
        }
      }
    }
  }
}
