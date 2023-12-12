import plugin from '../../../lib/plugins/plugin.js'
import { createImage, editImage, imageVariation } from '../utils/dalle.js'
import { makeForwardMsg } from '../utils/common.js'
import _ from 'lodash'
import { Config } from '../utils/config.js'
import BingDrawClient from '../utils/BingDraw.js'

export class dalle extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin Dalle 绘图',
      dsc: 'ChatGPT-Plugin基于OpenAI Dalle的绘图插件',
      event: 'message',
      priority: 600,
      rule: [
        {
          reg: '^#(chatgpt|ChatGPT|dalle|Dalle)(绘图|画图)',
          fnc: 'draw'
        },
        {
          reg: '^#(chatgpt|ChatGPT|dalle|Dalle)(修图|图片变形|改图)$',
          fnc: 'variation'
        },
        {
          reg: '^#(搞|改)(她|他)头像',
          fnc: 'avatarVariation'
        },
        {
          reg: '^#(chatgpt|dalle)编辑图片',
          fnc: 'edit'
        },
        {
          reg: '^#bing(画图|绘图)',
          fnc: 'bingDraw'
        }
      ]
    })
  }

  async draw (e) {
    if (!Config.enableDraw) {
      this.reply('画图功能未开启')
      return false
    }
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
      logger.error(err.response?.data?.error?.message)
      this.reply(`绘图失败: ${err.response?.data?.error?.message}`, true)
      await redis.del(`CHATGPT:DRAW:${e.sender.user_id}`)
    }
  }

  async variation (e) {
    if (!Config.enableDraw) {
      this.reply('画图功能未开启')
      return false
    }
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
      console.log(err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {}))
      this.reply(`绘图失败: ${err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {})}`, true)
      await redis.del(`CHATGPT:VARIATION:${e.sender.user_id}`)
    }
  }

  async avatarVariation (e) {
    if (!Config.enableDraw) {
      this.reply('画图功能未开启')
      return false
    }
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
          console.log(err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {}))
          this.reply(`搞失败了: ${err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {})}`, true)
          await redis.del(`CHATGPT:VARIATION:${e.sender.user_id}`)
        }
      }
    }
  }

  async edit (e) {
    if (!Config.enableDraw) {
      this.reply('画图功能未开启')
      return false
    }
    let ttl = await redis.ttl(`CHATGPT:EDIT:${e.sender.user_id}`)
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
    await redis.set(`CHATGPT:EDIT:${e.sender.user_id}`, 'c', { EX: 30 })
    await this.reply('正在为您编辑图片，请稍候……')

    let command = _.trimStart(e.msg, '#chatgpt编辑图片')
    command = _.trimStart(command, '#dalle编辑图片')
    // command = 'A bird on it/100,100,300,200/2/512x512'
    let args = command.split('/')
    let [prompt = '', position = '', num = '1', size = '512x512'] = args.slice(0, 4)
    if (!prompt || !position) {
      this.reply('编辑图片必须填写prompt和涂抹位置.参考格式：A bird on it/100,100,300,200/2/512x512')
      return false
    }
    num = parseInt(num, 10)
    if (num > 5) {
      this.reply('太多啦！你要花光我的余额吗！')
      return false
    }
    try {
      let images = (await editImage(imgUrl, position.split(',').map(p => parseInt(p, 10)), prompt, num, size))
          .map(image => segment.image(`base64://${image}`))
      if (images.length > 1) {
        this.reply(await makeForwardMsg(e, images, prompt))
      } else {
        this.reply(images[0], true)
      }
    } catch (err) {
      logger.error(err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {}))
      this.reply(`图片编辑失败: ${err.response?.data?.error?.message || err.message || JSON.stringify(err.response || {})}`, true)
      await redis.del(`CHATGPT:EDIT:${e.sender.user_id}`)
    }
  }

  async bingDraw (e) {
    let ttl = await redis.ttl(`CHATGPT:DRAW:${e.sender.user_id}`)
    if (ttl > 0 && !e.isMaster) {
      this.reply(`冷却中，请${ttl}秒后再试`)
      return false
    }
    let prompt = e.msg.replace(/^#bing(画图|绘图)/, '')
    if (!prompt) {
      this.reply('请提供绘图prompt')
      return false
    }
    this.reply('在画了，请稍等……')
    let bingToken = ''
    if (await redis.exists('CHATGPT:BING_TOKENS') != 0) {
      let bingTokens = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
      const normal = bingTokens.filter(element => element.State === '正常')
      const restricted = bingTokens.filter(element => element.State === '受限')
      if (normal.length > 0) {
        const minElement = normal.reduce((min, current) => {
          return current.Usage < min.Usage ? current : min
        })
        bingToken = minElement.Token
      } else if (restricted.length > 0) {
        const minElement = restricted.reduce((min, current) => {
          return current.Usage < min.Usage ? current : min
        })
        bingToken = minElement.Token
      } else {
        throw new Error('全部Token均已失效，暂时无法使用')
      }
    }
    if (!bingToken) {
      throw new Error('未绑定Bing Cookie，请使用#chatgpt设置必应token命令绑定Bing Cookie')
    }
    // 记录token使用
    let bingTokens = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
    const index = bingTokens.findIndex(element => element.Token === bingToken)
    bingTokens[index].Usage += 1
    await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingTokens))

    let client = new BingDrawClient({
      baseUrl: Config.sydneyReverseProxy,
      userToken: bingToken
    })
    await redis.set(`CHATGPT:DRAW:${e.sender.user_id}`, 'c', { EX: 30 })
    try {
      await client.getImages(prompt, e)
    } catch (err) {
      await redis.del(`CHATGPT:DRAW:${e.sender.user_id}`)
      await e.reply('❌绘图失败：' + err)
    }
  }
}
