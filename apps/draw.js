import plugin from '../../../lib/plugins/plugin.js'
import { segment } from 'oicq'
import { createImage } from '../utils/dalle.js'
import { makeForwardMsg} from "../utils/common.js";
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
    await redis.set(`CHATGPT:DRAW:${e.sender.user_id}`, 'c', {EX: 30})
    let priceMap = {
      '1024x1024': 0.02,
      '512x512': 0.018,
      '256x256': 0.016
    }
    num = parseInt(num, 10)
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
}
