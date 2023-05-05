import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { generateHello } from '../utils/randomMessage.js'
import { generateAudio } from '../utils/tts.js'
import fs from 'fs'
import { emojiRegex, googleRequestUrl } from '../utils/emoj/index.js'
import fetch from 'node-fetch'
import { makeForwardMsg, mkdirs } from '../utils/common.js'
import uploadRecord from '../utils/uploadRecord.js'
import { makeWordcloud } from '../utils/wordcloud/wordcloud.js'
import Translate, { transMap } from '../utils/baiduTranslate.js'
import _ from 'lodash'
let useSilk = false
try {
  await import('node-silk')
  useSilk = true
} catch (e) {
  useSilk = false
}
export class Entertainment extends plugin {
  constructor(e) {
    super({
      name: 'ChatGPT-Plugin 娱乐小功能',
      dsc: '让你的聊天更有趣！现已支持主动打招呼、表情合成、群聊词云统计、文本翻译与图片ocr小功能！',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#chatgpt打招呼(帮助)?',
          fnc: 'sendMessage',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(查看|设置|删除)打招呼',
          fnc: 'handleSentMessage',
          permission: 'master'
        },
        {
          reg: `^(${emojiRegex()}){2}$`,
          fnc: 'combineEmoj'
        },
        {
          reg: '^#?(今日词云|群友在聊什么)$',
          fnc: 'wordcloud'
        },
        {
          reg: '^#((?:(寄批踢|gpt|GPT))翻.*|chatgpt翻译帮助)',
          fnc: 'translate'
        },
        {
          reg: '^#ocr',
          fnc: 'ocr'
        }
      ]
    })
    this.task = [
      {
        // 设置十分钟左右的浮动
        cron: '0 ' + Math.ceil(Math.random() * 10) + ' 7-23/' + Config.helloInterval + ' * * ?',
        // cron: '0 ' + '*/' + Config.helloInterval + ' * * * ?',
        name: 'ChatGPT主动随机说话',
        fnc: this.sendRandomMessage.bind(this)
      }
    ]
  }
  async ocr (e) {
    let replyMsg
    let imgOcrText = await getImageOcrText(e)
    logger.error(imgOcrText)
    if (!imgOcrText) {
      await this.reply('没有识别到文字', e.isGroup)
      return false
    }
    replyMsg = await makeForwardMsg(e, imgOcrText, 'OCR结果')
    await this.reply(replyMsg, e.isGroup)
  }
  async translate(e) {
    if (e.msg.trim() === '#chatgpt翻译帮助') {
      await this.reply('支持中、日、文(文言文)、英、俄、韩语言之间的文本翻译功能，"寄批踢"为可选前缀，' +
          '\n也可引用别人的消息翻译，默认翻译为中文，或引用消息使用“#翻中|英|日...”' +
          '\n示例：1. #寄批踢翻英 你好' +
          '\t2. #翻中 你好' +
          '\t3. #寄批踢翻文 hello'
      )
      return
    }
    if (_.isEmpty(Config.baiduTranslateAppId) || _.isEmpty(Config.baiduTranslateSecret)) {
      this.reply('先填写翻译配置吧~')
      return
    }
    const regExp = /^#(?:(寄批踢|gpt|GPT))翻(.)([\s\S]*)/
    const msg = e.msg.trim()
    const match = msg.match(regExp)
    let languageCode = match[2] === '译' ? '中' : match[2]
    let pendingText = match[3]
    const isImg = !!(await getImg(e))
    let result = ''
    if (!(languageCode in transMap)) {
      e.reply('输入格式有误或暂不支持该语言，' +
          '\n当前支持：中、日、文(文言文)、英、俄、韩。', e.isGroup
      )
      return false
    }
    // 引用回复
    if (e.source) {
      if (pendingText.length) {
        await this.reply('引用模式下不需要添加翻译文本，请直接使用“#翻中|英|日...”', e.isGroup)
        return false
      }
    } else {
      if (isImg && pendingText) {
        await this.reply('检测到图片输入，已自动忽略输入文本...', e.isGroup)
      }
      if (!pendingText && !isImg) {
        await this.reply('请输入有效文本', e.isGroup)
        return false
      }
    }
    if (isImg) {
      // 获取结果数组
      let imgOcrText = await getImageOcrText(e)
      function getChineseCharRatio (str) {
        const chineseCharReg = /[\u4e00-\u9fa5，。！？、；：“”‘’（）【】\n]/g
        const chineseCharCount = (str.match(chineseCharReg) || []).length
        return chineseCharCount / str.length
      }
      // 判断中文占比
      if (!!imgOcrText && getChineseCharRatio(imgOcrText.join()) > 0.5 && languageCode === '中') {
        await this.reply('给你一下信不信！(☄⊙ω⊙)☄', e.isGroup)
        return true
      }
      if (imgOcrText) {
        if (imgOcrText.length > 1) {
          await this.reply('一张一张来吧~|・ω・`）♪', e.isGroup)
          return true
        }
        // 只取第一张的结果
        pendingText = imgOcrText[0]
      } else {
        await this.reply('没有识别到有效文字(・-・*)', e.isGroup)
        return false
      }
    } else {
      if (e.source) {
        let previousMsg
        if (e.isGroup) {
          previousMsg = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message
        } else {
          previousMsg = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message
        }
        // logger.warn(previousMsg)
        if (previousMsg[0]?.type === 'text') {
          pendingText = previousMsg[0].text
        } else {
          await this.reply('这是什么怪东西!(⊙ˍ⊙)', e.isGroup)
          return false
        }
      }
    }
    try {
      const translate = new Translate({
        appid: Config.baiduTranslateAppId,
        secret: Config.baiduTranslateSecret
      })
      if (/\n/.test(pendingText)) {
        // 传入文本数组，处理直接传入多行文本会导致结果不完整的问题
        result = await translate(pendingText.split('\n').filter(item => item), languageCode)
      } else if (/\r/.test(pendingText)) { // 垃圾windows
        result = await translate(pendingText.split('\r').filter(item => item), languageCode)
      } else {
        result = await translate(pendingText, languageCode)
      }
    } catch (err) {
      result = err.message
    }
    const totalLength = Array.isArray(result)
      ? result.reduce((acc, cur) => acc + cur.length, 0)
      : result.length
    if (totalLength > 200) {
      result = Array.isArray(result)
        ? await makeForwardMsg(e, result.join('\n').split(), '翻译结果')
        : await makeForwardMsg(e, result.split(), '翻译结果')
      await this.reply(result, e.isGroup)
      return true
    }
    // 保持原格式输出
    result = Array.isArray(result) ? result.join('\n') : result
    await this.reply(result, e.isGroup)
  }

  async wordcloud(e) {
    if (e.isGroup) {
      let groupId = e.group_id
      let lock = await redis.get(`CHATGPT:WORDCLOUD:${groupId}`)
      if (lock) {
        await e.reply('别着急，上次统计还没完呢')
        return true
      }
      await e.reply('在统计啦，请稍等...')
      await redis.set(`CHATGPT:WORDCLOUD:${groupId}`, '1', {EX: 600})
      try {
        await makeWordcloud(e, e.group_id)
      } catch (err) {
        logger.error(err)
        await e.reply(err)
      }
      await redis.del(`CHATGPT:WORDCLOUD:${groupId}`)
    } else {
      await e.reply('请在群里发送此命令')
    }
  }

  async combineEmoj(e) {
    let left = e.msg.codePointAt(0).toString(16).toLowerCase()
    let right = e.msg.codePointAt(2).toString(16).toLowerCase()
    if (left === right) {
      return false
    }
    mkdirs('data/chatgpt/emoji')
    logger.info('combine ' + e.msg)
    let resultFileLoc = `data/chatgpt/emoji/${left}_${right}.jpg`
    if (fs.existsSync(resultFileLoc)) {
      let image = segment.image(fs.createReadStream(resultFileLoc))
      image.asface = true
      await e.reply(image, true)
      return true
    }
    const _path = process.cwd()
    const fullPath = fs.realpathSync(`${_path}/plugins/chatgpt-plugin/resources/emojiData.json`)
    const data = fs.readFileSync(fullPath)
    let emojDataJson = JSON.parse(data)
    logger.mark(`合成emoji：${left} ${right}`)
    let url
    if (emojDataJson[right]) {
      let find = emojDataJson[right].find(item => item.leftEmoji === left)
      if (find) {
        url = googleRequestUrl(find)
      }
    }
    if (!url && emojDataJson[left]) {
      let find = emojDataJson[left].find(item => item.leftEmoji === right)
      if (find) {
        url = googleRequestUrl(find)
      }
    }
    if (!url) {
      await e.reply('不支持合成', true)
      return false
    }
    let response = await fetch(url)
    const resultBlob = await response.blob()
    const resultArrayBuffer = await resultBlob.arrayBuffer()
    const resultBuffer = Buffer.from(resultArrayBuffer)
    await fs.writeFileSync(resultFileLoc, resultBuffer)
    let image = segment.image(fs.createReadStream(resultFileLoc))
    image.asface = true
    await e.reply(image, true)
    return true
  }

  async sendMessage(e) {
    if (e.msg.match(/^#chatgpt打招呼帮助/) !== null) {
      await this.reply('设置主动打招呼的群聊名单，群号之间以,隔开，参数之间空格隔开\n' +
          '#chatgpt打招呼+群号：立即在指定群聊发起打招呼' +
          '#chatgpt查看打招呼\n' +
          '#chatgpt删除打招呼：删除主动打招呼群聊，可指定若干个群号\n' +
          '#chatgpt设置打招呼：可指定1-3个参数，依次是更新打招呼列表、打招呼间隔时间和触发概率、更新打招呼所有配置项')
      return false
    }
    let groupId = e.msg.replace(/^#chatgpt打招呼/, '')
    logger.info(groupId)
    groupId = parseInt(groupId)
    if (groupId && !Bot.getGroupList().get(groupId)) {
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

  async sendRandomMessage() {
    if (Config.debug) {
      logger.info('开始处理：ChatGPT随机打招呼。')
    }
    let toSend = Config.initiativeChatGroups || []
    for (let i = 0; i < toSend.length; i++) {
      if (!toSend[i]) {
        continue
      }
      let groupId = parseInt(toSend[i])
      if (Bot.getGroupList().get(groupId)) {
        // 打招呼概率
        if (Math.floor(Math.random() * 100) < Config.helloProbability) {
          let message = await generateHello()
          logger.info(`打招呼给群聊${groupId}：` + message)
          if (Config.defaultUseTTS) {
            let audio = await generateAudio(message, Config.defaultTTSRole)
            if (useSilk) {
              await Bot.sendGroupMsg(groupId, await uploadRecord(audio))
            } else {
              await Bot.sendGroupMsg(groupId, segment.record(audio))
            }
          } else {
            await Bot.sendGroupMsg(groupId, message)
          }
        } else {
          logger.info(`时机未到，这次就不打招呼给群聊${groupId}了`)
        }
      } else {
        logger.warn('机器人不在要发送的群组里，忽略群。同时建议检查配置文件修改要打招呼的群号。' + groupId)
      }
    }
  }

  async handleSentMessage(e) {
    const addReg = /^#chatgpt设置打招呼[:：]?\s?(\S+)(?:\s+(\d+))?(?:\s+(\d+))?$/
    const delReg = /^#chatgpt删除打招呼[:：\s]?(\S+)/
    const checkReg = /^#chatgpt查看打招呼$/
    let replyMsg = ''
    Config.initiativeChatGroups = Config.initiativeChatGroups.filter(group => group.trim() !== '')
    if (e.msg.match(checkReg)) {
      if (Config.initiativeChatGroups.length === 0) {
        replyMsg = '当前没有需要打招呼的群聊'
      } else {
        replyMsg = `当前打招呼设置为：\n${!e.isGroup ? '群号：' + Config.initiativeChatGroups.join(', ') + '\n' : ''}间隔时间：${Config.helloInterval}小时\n触发概率：${Config.helloProbability}%`
      }
    } else if (e.msg.match(delReg)) {
      const groupsToDelete = e.msg.trim().match(delReg)[1].split(/[,，]\s?/).filter(group => group.trim() !== '')
      let deletedGroups = []

      for (const element of groupsToDelete) {
        if (!/^[1-9]\d{8,9}$/.test(element)) {
          await this.reply(`群号${element}不合法，请输入9-10位不以0开头的数字`, true)
          return false
        }
        if (!Config.initiativeChatGroups.includes(element)) {
          continue
        }
        Config.initiativeChatGroups.splice(Config.initiativeChatGroups.indexOf(element), 1)
        deletedGroups.push(element)
      }
      Config.initiativeChatGroups = Config.initiativeChatGroups.filter(group => group.trim() !== '')
      if (deletedGroups.length === 0) {
        replyMsg = '没有可删除的群号，请输入正确的群号\n'
      } else {
        replyMsg = `已删除打招呼群号：${deletedGroups.join(', ')}\n`
      }
      replyMsg += `当前打招呼设置为：\n${!e.isGroup ? '群号：' + Config.initiativeChatGroups.join(', ') + '\n' : ''}间隔时间：${Config.helloInterval}小时\n触发概率：${Config.helloProbability}%`
    } else if (e.msg.match(addReg)) {
      let paramArray = e.msg.match(addReg)
      if (typeof paramArray[3] === 'undefined' && typeof paramArray[2] !== 'undefined') {
        Config.helloInterval = Math.min(Math.max(parseInt(paramArray[1]), 1), 24)
        Config.helloProbability = Math.min(Math.max(parseInt(paramArray[2]), 0), 100)
        replyMsg = `已更新打招呼设置：\n${!e.isGroup ? '群号：' + Config.initiativeChatGroups.join(', ') + '\n' : ''}间隔时间：${Config.helloInterval}小时\n触发概率：${Config.helloProbability}%`
      } else {
        const validGroups = []
        const groups = paramArray ? paramArray[1].split(/[,，]\s?/) : []
        for (const element of groups) {
          if (!/^[1-9]\d{8,9}$/.test(element)) {
            await this.reply(`群号${element}不合法，请输入9-10位不以0开头的数字`, true)
            return false
          }
          if (Config.initiativeChatGroups.includes(element)) {
            continue
          }
          validGroups.push(element)
        }
        if (validGroups.length === 0) {
          await this.reply('没有可添加的群号，请输入新的群号')
          return false
        } else {
          Config.initiativeChatGroups = Config.initiativeChatGroups
              .filter(group => group.trim() !== '')
              .concat(validGroups)
        }
        if (typeof paramArray[2] === 'undefined' && typeof paramArray[3] === 'undefined') {
          replyMsg = `已更新打招呼设置：\n${!e.isGroup ? '群号：' + Config.initiativeChatGroups.join(', ') + '\n' : ''}间隔时间：${Config.helloInterval}小时\n触发概率：${Config.helloProbability}%`
        } else {
          Config.helloInterval = Math.min(Math.max(parseInt(paramArray[2]), 1), 24)
          Config.helloProbability = Math.min(Math.max(parseInt(paramArray[3]), 0), 100)
          replyMsg = `已更新打招呼设置：\n${!e.isGroup ? '群号：' + Config.initiativeChatGroups.join(', ') + '\n' : ''}间隔时间：${Config.helloInterval}小时\n触发概率：${Config.helloProbability}%`
        }
      }
    } else {
      replyMsg = '无效的打招呼设置，请输入正确的命令。\n可发送”#chatgpt打招呼帮助“获取打招呼指北。'
    }
    await this.reply(replyMsg)
    return false
  }
}
export async function getImg (e) {
  // 取消息中的图片、at的头像、回复的图片，放入e.img
  if (e.at && !e.source) {
    e.img = [`https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.at}`]
  }
  if (e.source) {
    let reply
    if (e.isGroup) {
      reply = (await e.group.getChatHistory(e.source.seq, 1)).pop()?.message
    } else {
      reply = (await e.friend.getChatHistory(e.source.time, 1)).pop()?.message
    }
    if (reply) {
      let i = []
      for (let val of reply) {
        if (val.type === 'image') {
          i.push(val.url)
        }
      }
      e.img = i
    }
  }
  return e.img
}
export async function getImageOcrText (e) {
  const img = await getImg(e)
  if (img) {
    try {
      let resultArr = []
      let eachImgRes = ''
      for (let i in img) {
        const imgOCR = await Bot.imageOcr(img[i])
        for (let text of imgOCR.wordslist) {
          eachImgRes += (`${text?.words}  \n`)
        }
        if (eachImgRes) resultArr.push(eachImgRes)
        eachImgRes = ''
      }
      logger.warn('resultArr', resultArr)
      return resultArr
    } catch (err) {
      return false
      // logger.error(err)
    }
  } else {
    return false
  }
}
