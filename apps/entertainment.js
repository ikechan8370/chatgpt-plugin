import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { generateHello } from '../utils/randomMessage.js'
import { generateVitsAudio } from '../utils/tts.js'
import fs from 'fs'
import { emojiRegex, googleRequestUrl } from '../utils/emoj/index.js'
import { getImageOcrText, getImg, makeForwardMsg, mkdirs, renderUrl } from '../utils/common.js'
import uploadRecord from '../utils/uploadRecord.js'
import { makeWordcloud } from '../utils/wordcloud/wordcloud.js'
import { translate, translateLangSupports } from '../utils/translate.js'
import AzureTTS from '../utils/tts/microsoft-azure.js'
import VoiceVoxTTS from '../utils/tts/voicevox.js'
import { URL } from 'node:url'
import { getBots } from '../utils/bot.js'
import {CustomGoogleGeminiClient} from "../client/CustomGoogleGeminiClient.js";

let useSilk = false
try {
  await import('node-silk')
  useSilk = true
} catch (e) {
  useSilk = false
}
export class Entertainment extends plugin {
  constructor (e) {
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
          reg: '^#(|最新)词云(\\d{1,2}h{0,1}|)$',
          fnc: 'wordcloud_latest'
        },
        {
          reg: '^#(我的)?(本月|本周|今日)?词云$',
          fnc: 'wordcloud_new'
        },
        {
          reg: '^#((寄批踢|gpt|GPT)?翻[sS]*|chatgpt翻译帮助)',
          fnc: 'translate'
        },
        {
          reg: '^#(chatgpt)?(设置|修改)翻译来源(openai|gemini|星火|通义千问|xh|qwen)$',
          fnc: 'translateSource'
        },
        {
          reg: '^#ocr',
          fnc: 'ocr'
        },
        {
          reg: '^#url(：|:)',
          fnc: 'screenshotUrl'
        },
        {
          reg: '^#(识图|图片识别|VQA|vqa)',
          fnc: 'vqa'
        }
      ]
    })
    this.task = [
      {
        // 设置十分钟左右的浮动
        cron: '0 ' + Math.ceil(Math.random() * 10) + ' 7-23/' + Config.helloInterval + ' * * ?',
        // cron: '*/2 * * * *',
        name: 'ChatGPT主动随机说话',
        fnc: this.sendRandomMessage.bind(this)
      }
    ]
    this.reply = async (msg, quote, data) => {
      if (!Config.enableMd) {
        return e.reply(msg, quote, data)
      }
      let handler = e.runtime?.handler || {}
      const btns = await handler.call('chatgpt.button.post', this.e)
      const btnElement = {
        type: 'button',
        content: btns
      }
      if (Array.isArray(msg)) {
        msg.push(btnElement)
      } else {
        msg = [msg, btnElement]
      }
      return e.reply(msg, quote, data)
    }
  }

  async ocr (e) {
    let replyMsg
    let imgOcrText = await getImageOcrText(e)
    if (!imgOcrText) {
      await this.reply('没有识别到文字', e.isGroup)
      return false
    }
    replyMsg = await makeForwardMsg(e, imgOcrText, 'OCR结果')
    await this.reply(replyMsg, e.isGroup)
  }

  async translate (e) {
    const translateLangLabels = translateLangSupports.map(item => item.label).join('，')
    const translateLangLabelAbbrS = translateLangSupports.map(item => item.abbr).join('，')
    if (e.msg.trim() === '#chatgpt翻译帮助') {
      await this.reply(`支持以下语种的翻译：
${translateLangLabels}
在使用本工具时，请采用简写的方式描述目标语言。此外，可以引用消息或图片来进行翻译。
示例：
1. #gpt翻英 你好
2. #gpt翻中 你好
3. #gpt翻译 hello`)
      return true
    }
    const regExp = /^#(寄批踢|gpt|GPT)?翻(.)([\s\S]*)/
    const match = e.msg.trim().match(regExp)
    let languageCode = match[2] === '译' ? 'auto' : match[2]
    let pendingText = match[3]
    const isImg = !!(await getImg(e))?.length
    let result = []
    let multiText = false
    if (languageCode !== 'auto' && !translateLangLabelAbbrS.includes(languageCode)) {
      this.reply(`输入格式有误或暂不支持该语言，\n当前支持${translateLangLabels}`, e.isGroup)
      return false
    }
    // 引用回复
    if (e.source) {
      if (pendingText.length) {
        await this.reply('引用模式下不需要添加翻译文本，已自动忽略输入文本...((*・∀・）ゞ→→”', e.isGroup)
      }
    } else {
      if (isImg && pendingText) {
        await this.reply('检测到图片输入，已自动忽略输入文本...((*・∀・）ゞ→→', e.isGroup)
      }
      if (!pendingText && !isImg) {
        await this.reply('你让我翻译啥呢￣へ￣！', e.isGroup)
        return false
      }
    }
    if (isImg) {
      let imgOcrText = await getImageOcrText(e)
      multiText = Array.isArray(imgOcrText)
      if (imgOcrText) {
        pendingText = imgOcrText
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
        // logger.warn('previousMsg', previousMsg)
        if (previousMsg.find(msg => msg.type === 'text')?.text) {
          pendingText = previousMsg.find(msg => msg.type === 'text')?.text
        } else {
          await this.reply('这是什么怪东西!(⊙ˍ⊙)', e.isGroup)
          return false
        }
      }
    }
    try {
      if (multiText) {
        result = await Promise.all(pendingText.map(text => translate(text, languageCode)))
      } else {
        result = await translate(pendingText, languageCode)
      }
      // logger.warn(multiText, result)
    } catch (err) {
      await this.reply(err.message, e.isGroup)
      return false
    }
    // const totalLength = Array.isArray(result)
    //   ? result.reduce((acc, cur) => acc + cur.length, 0)
    //   : result.length
    if (multiText) {
      // 多条翻译结果
      if (Array.isArray(result)) {
        result = await makeForwardMsg(e, result, '翻译结果')
      } else {
        result = ('译文：\n' + result.trim()).split()
        result.unshift('原文：\n' + pendingText.trim())
        result = await makeForwardMsg(e, result, '翻译结果')
      }
      await this.reply(result, e.isGroup)
      return true
    }
    // 保持原格式输出
    result = Array.isArray(result) ? result.join('\n') : result
    await this.reply(result, e.isGroup)
    return true
  }

  translateSource (e) {
    let command = e.msg
    if (command.includes('openai')) {
      Config.translateSource = 'openai'
    } else if (command.includes('gemini')) {
      Config.translateSource = 'gemini'
    } else if (command.includes('星火')) {
      Config.translateSource = 'xh'
    } else if (command.includes('通义千问')) {
      Config.translateSource = 'qwen'
    } else if (command.includes('xh')) {
      Config.translateSource = 'xh'
    } else if (command.includes('qwen')) {
      Config.translateSource = 'qwen'
    } else {
      this.reply('暂不支持该翻译源')
    }
    this.reply('√成功设置翻译源为' + Config.translateSource)
  }

  async wordcloud (e) {
    if (e.isGroup) {
      let groupId = e.group_id
      let lock = await redis.get(`CHATGPT:WORDCLOUD:${groupId}`)
      if (lock) {
        await this.reply('别着急，上次统计还没完呢')
        return true
      }
      await this.reply('在统计啦，请稍等...')
      await redis.set(`CHATGPT:WORDCLOUD:${groupId}`, '1', { EX: 600 })
      try {
        let img = await makeWordcloud(e, e.group_id)
        this.reply(img, true)
      } catch (err) {
        logger.error(err)
        await this.reply(err)
      }
      await redis.del(`CHATGPT:WORDCLOUD:${groupId}`)
    } else {
      await this.reply('请在群里发送此命令')
    }
  }

  async wordcloud_latest (e) {
    if (e.isGroup) {
      let groupId = e.group_id
      let lock = await redis.get(`CHATGPT:WORDCLOUD:${groupId}`)
      if (lock) {
        await this.reply('别着急，上次统计还没完呢')
        return true
      }

      const regExp = /词云(\d{0,2})(|h)/
      const match = e.msg.trim().match(regExp)
      const duration = !match[1] ? 12 : parseInt(match[1]) // default 12h

      if (duration > 24) {
        await this.reply('最多只能统计24小时内的记录哦，你可以使用#本周词云和#本月词云获取更长时间的统计~')
        return false
      }
      await this.reply('在统计啦，请稍等...')

      await redis.set(`CHATGPT:WORDCLOUD:${groupId}`, '1', { EX: 600 })
      try {
        await makeWordcloud(e, e.group_id, duration)
      } catch (err) {
        logger.error(err)
        await this.reply(err)
      }
      await redis.del(`CHATGPT:WORDCLOUD:${groupId}`)
    } else {
      await this.reply('请在群里发送此命令')
    }
  }

  async wordcloud_new (e) {
    if (e.isGroup) {
      let groupId = e.group_id
      let userId
      if (e.msg.includes('我的')) {
        userId = e.sender.user_id
      }
      let at = e.message.find(m => m.type === 'at')
      if (at) {
        userId = at.qq
      }
      let lock = await redis.get(`CHATGPT:WORDCLOUD_NEW:${groupId}_${userId}`)
      if (lock) {
        await this.reply('别着急，上次统计还没完呢')
        return true
      }
      await this.reply('在统计啦，请稍等...')
      let duration = 24
      if (e.msg.includes('本周')) {
        const now = new Date() // Get the current date and time
        let day = now.getDay()
        let diff = now.getDate() - day + (day === 0 ? -6 : 1)
        const startOfWeek = new Date(new Date().setDate(diff))
        startOfWeek.setHours(0, 0, 0, 0) // Set the time to midnight (start of the day)
        duration = (now - startOfWeek) / 1000 / 60 / 60
      } else if (e.msg.includes('本月')) {
        const now = new Date() // Get the current date and time
        const startOfMonth = new Date(new Date().setDate(0))
        startOfMonth.setHours(0, 0, 0, 0) // Set the time to midnight (start of the day)
        duration = (now - startOfMonth) / 1000 / 60 / 60
      } else {
        // 默认今天
        const now = new Date()
        const startOfToday = new Date() // Get the current date and time
        startOfToday.setHours(0, 0, 0, 0) // Set the time to midnight (start of the day)
        duration = (now - startOfToday) / 1000 / 60 / 60
      }
      await redis.set(`CHATGPT:WORDCLOUD_NEW:${groupId}_${userId}`, '1', { EX: 600 })
      try {
        await makeWordcloud(e, e.group_id, duration, userId)
      } catch (err) {
        logger.error(err)
        await this.reply(err)
      }
      await redis.del(`CHATGPT:WORDCLOUD_NEW:${groupId}_${userId}`)
    } else {
      await this.reply('请在群里发送此命令')
    }
  }

  async combineEmoj (e) {
    let left = e.msg.codePointAt(0).toString(16).toLowerCase()
    let right = e.msg.codePointAt(2).toString(16).toLowerCase()
    if (left === right) {
      return false
    }
    mkdirs('data/chatgpt/emoji')
    logger.info('combine ' + e.msg)
    let resultFileLoc = `data/chatgpt/emoji/${left}_${right}.jpg`
    if (fs.existsSync(resultFileLoc)) {
      let image = segment.image(resultFileLoc)
      image.asface = true
      await this.reply(image, true)
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
      await this.reply('不支持合成', true)
      return false
    }
    // let response = await fetch(url)
    // const resultBlob = await response.blob()
    // const resultArrayBuffer = await resultBlob.arrayBuffer()
    // const resultBuffer = Buffer.from(resultArrayBuffer)
    // await fs.writeFileSync(resultFileLoc, resultBuffer)
    let image = segment.image(url)
    image.asface = true
    await this.reply(image, true)
    return true
  }

  async sendMessage (e) {
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
    if (groupId && !e.bot.gl.get(groupId)) {
      await this.reply('机器人不在这个群里！')
      return
    }
    let message = await generateHello()
    let sendable = message
    logger.info(`打招呼给群聊${groupId}：` + message)
    if (Config.defaultUseTTS) {
      let audio = await generateVitsAudio(message, Config.defaultTTSRole)
      sendable = segment.record(audio)
    }
    if (!groupId) {
      await this.reply(sendable)
    } else {
      await e.bot.sendGroupMsg(groupId, sendable)
      await this.reply('发送成功！')
    }
  }

  async sendRandomMessage () {
    if (Config.debug) {
      logger.info('开始处理：ChatGPT随机打招呼。')
    }
    let toSend = Config.initiativeChatGroups || []
    for (const element of toSend) {
      if (!element) {
        continue
      }
      let groupId = parseInt(element)
      let bots = this.e ? [this.e.bot] : getBots()
      for (let bot of bots) {
        if (bot.gl?.get(groupId)) {
          // 打招呼概率
          if (Math.floor(Math.random() * 100) < Config.helloProbability) {
            let message = await generateHello()
            logger.info(`打招呼给群聊${groupId}：` + message)
            if (Config.defaultUseTTS) {
              let audio
              const [defaultVitsTTSRole, defaultAzureTTSRole, defaultVoxTTSRole] = [Config.defaultTTSRole, Config.azureTTSSpeaker, Config.voicevoxTTSSpeaker]
              let ttsSupportKinds = []
              if (Config.azureTTSKey) ttsSupportKinds.push(1)
              if (Config.ttsSpace) ttsSupportKinds.push(2)
              if (Config.voicevoxSpace) ttsSupportKinds.push(3)
              if (!ttsSupportKinds.length) {
                logger.warn('没有配置任何语音服务！')
                return false
              }
              const randomIndex = Math.floor(Math.random() * ttsSupportKinds.length)
              switch (ttsSupportKinds[randomIndex]) {
                case 1 : {
                  const isEn = AzureTTS.supportConfigurations.find(config => config.code === defaultAzureTTSRole)?.language.includes('en')
                  if (isEn) {
                    message = (await translate(message, '英')).replace('\n', '')
                  }
                  audio = await AzureTTS.generateAudio(message, {
                    defaultAzureTTSRole
                  })
                  break
                }
                case 2 : {
                  if (Config.autoJapanese) {
                    try {
                      message = await translate(message, '日')
                    } catch (err) {
                      logger.error(err)
                    }
                  }
                  try {
                    audio = await generateVitsAudio(message, defaultVitsTTSRole, '中日混合（中文用[ZH][ZH]包裹起来，日文用[JA][JA]包裹起来）')
                  } catch (err) {
                    logger.error(err)
                  }
                  break
                }
                case 3 : {
                  message = (await translate(message, '日')).replace('\n', '')
                  try {
                    audio = await VoiceVoxTTS.generateAudio(message, {
                      speaker: defaultVoxTTSRole
                    })
                  } catch (err) {
                    logger.error(err)
                  }
                  break
                }
              }
              if (useSilk) {
                await this.e.bot.sendGroupMsg(groupId, await uploadRecord(audio))
              } else {
                await this.e.bot.sendGroupMsg(groupId, segment.record(audio))
              }
            } else {
              await this.e.bot.sendGroupMsg(groupId, message)
            }
          } else {
            logger.info(`时机未到，这次就不打招呼给群聊${groupId}了`)
          }
        } else {
          logger.warn('机器人不在要发送的群组里，忽略群。同时建议检查配置文件修改要打招呼的群号。' + groupId)
        }
      }
    }
  }

  async handleSentMessage (e) {
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

  async screenshotUrl (e) {
    let url = e.msg.replace(/^#url(：|:)/, '')
    if (url.length === 0) { return false }
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url
      }
      let urlLink = new URL(url)
      await this.reply(
        await renderUrl(
          e, urlLink.href,
          {
            retType: 'base64',
            Viewport: {
              width: Config.chatViewWidth,
              height: parseInt(Config.chatViewWidth * 0.56)
            },
            deviceScaleFactor: parseFloat(Config.cloudDPR)
          }
        ),
        e.isGroup && Config.quoteReply)
    } catch (err) {
      this.reply('无效url:' + url)
    }
    return true
  }

  async vqa (e) {
    if (!Config.geminiKey) {
      e.reply('需要配置Gemini密钥以使用识图')
      return
    }
    let img = await getImg(e)
    if (!img?.[0]) {
      await e.reply('请发送或引用一张图片', e.isGroup)
      return false
    }
    let client = new CustomGoogleGeminiClient({
      e,
      userId: e.sender.user_id,
      key: Config.geminiKey,
      model: 'gemini-1.5-flash-latest',
      baseUrl: Config.geminiBaseUrl,
      debug: Config.debug
    })
    const response = await fetch(img[0])
    const base64Image = Buffer.from(await response.arrayBuffer())
    let msg = e.msg.replace(/#(识图|图片识别|VQA|vqa)/, '') || 'describe this image in Simplified Chinese'
    try {
      let res = await client.sendMessage(msg, {
        image: base64Image.toString('base64')
      })
      await e.reply(res.text, true)
    } catch (err) {
      await e.reply('❌识图失败：' + err.message, true)
    }
    return true
  }
}
