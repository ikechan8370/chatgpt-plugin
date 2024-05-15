import plugin from '../../../lib/plugins/plugin.js'
import common from '../../../lib/common/common.js'
import _ from 'lodash'
import { Config } from '../utils/config.js'
import { v4 as uuid } from 'uuid'
import AzureTTS from '../utils/tts/microsoft-azure.js'
import VoiceVoxTTS from '../utils/tts/voicevox.js'
import BingSunoClient from '../utils/BingSuno.js'
import {
  completeJSON,
  formatDate,
  formatDate2,
  generateAudio,
  getDefaultReplySetting,
  getImageOcrText,
  getImg,
  getUin,
  getUserData,
  getUserReplySetting,
  isImage,
  makeForwardMsg,
  randomString,
  render,
  renderUrl,
  extractMarkdownJson
} from '../utils/common.js'

import fetch from 'node-fetch'
import { deleteConversation, getConversations, getLatestMessageIdByConversationId } from '../utils/conversation.js'
import { convertSpeaker, speakers } from '../utils/tts.js'
import { convertFaces } from '../utils/face.js'
import { ConversationManager, originalValues } from '../model/conversation.js'
import XinghuoClient from '../utils/xinghuo/xinghuo.js'
import { getProxy } from '../utils/proxy.js'
import { generateSuggestedResponse } from '../utils/chat.js'
import Core from '../model/core.js'

let version = Config.version
let proxy = getProxy()

/**
 * 每个对话保留的时长。单个对话内ai是保留上下文的。超时后销毁对话，再次对话创建新的对话。
 * 单位：秒
 * @type {number}
 *
 * 这里使用动态数据获取，以便于锅巴动态更新数据
 */
// const CONVERSATION_PRESERVE_TIME = Config.conversationPreserveTime
const newFetch = (url, options = {}) => {
  const defaultOptions = Config.proxy
    ? {
        agent: proxy(Config.proxy)
      }
    : {}
  const mergedOptions = {
    ...defaultOptions,
    ...options
  }

  return fetch(url, mergedOptions)
}

export class chatgpt extends plugin {
  constructor (e) {
    let toggleMode = Config.toggleMode
    super({
      /** 功能名称 */
      name: 'ChatGpt 对话',
      /** 功能描述 */
      dsc: '与人工智能对话，畅聊无限可能~',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 1144,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#chat3[sS]*',
          /** 执行方法 */
          fnc: 'chatgpt3'
        },
        {
          /** 命令正则匹配 */
          reg: '^#chat1[sS]*',
          /** 执行方法 */
          fnc: 'chatgpt1'
        },
        {
          /** 命令正则匹配 */
          reg: '^#chatglm[sS]*',
          /** 执行方法 */
          fnc: 'chatglm'
        },
        {
          /** 命令正则匹配 */
          reg: '^#bing[sS]*',
          /** 执行方法 */
          fnc: 'bing'
        },
        {
          /** 命令正则匹配 */
          reg: '^#claude(2|3|.ai)[sS]*',
          /** 执行方法 */
          fnc: 'claude2'
        },
        {
          /** 命令正则匹配 */
          reg: '^#claude[sS]*',
          /** 执行方法 */
          fnc: 'claude'
        },
        {
          /** 命令正则匹配 */
          reg: '^#xh[sS]*',
          /** 执行方法 */
          fnc: 'xh'
        },
        {
          reg: '^#星火助手',
          fnc: 'newxhBotConversation'
        },
        {
          reg: '^#星火(搜索|查找)助手',
          fnc: 'searchxhBot'
        },
        {
          /** 命令正则匹配 */
          reg: '^#glm4[sS]*',
          /** 执行方法 */
          fnc: 'glm4'
        },
        {
          /** 命令正则匹配 */
          reg: '^#qwen[sS]*',
          /** 执行方法 */
          fnc: 'qwen'
        },
        {
          /** 命令正则匹配 */
          reg: '^#gemini[sS]*',
          /** 执行方法 */
          fnc: 'gemini'
        },
        {
          /** 命令正则匹配 */
          reg: toggleMode === 'at' ? '^[^#][sS]*' : '^#chat[^gpt][sS]*',
          /** 执行方法 */
          fnc: 'chatgpt',
          log: false
        },
        {
          reg: '^#(chatgpt)?对话列表$',
          fnc: 'getAllConversations',
          permission: 'master'
        },
        {
          reg: `^#?(${originalValues.join('|')})?(结束|新开|摧毁|毁灭|完结)对话([sS]*)$`,
          fnc: 'destroyConversations'
        },
        {
          reg: `^#?(${originalValues.join('|')})?(结束|新开|摧毁|毁灭|完结)全部对话$`,
          fnc: 'endAllConversations',
          permission: 'master'
        },
        // {
        //   reg: '#chatgpt帮助',
        //   fnc: 'help'
        // },
        {
          reg: '^#chatgpt图片模式$',
          fnc: 'switch2Picture'
        },
        {
          reg: '^#chatgpt文本模式$',
          fnc: 'switch2Text'
        },
        {
          reg: '^#chatgpt语音模式$',
          fnc: 'switch2Audio'
        },
        {
          reg: '^#chatgpt语音换源',
          fnc: 'switchTTSSource'
        },
        {
          reg: '^#chatgpt设置(语音角色|角色语音|角色)',
          fnc: 'setDefaultRole'
        },
        {
          reg: '#(OpenAI|openai)(剩余)?(余额|额度)',
          fnc: 'totalAvailable',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换对话',
          fnc: 'attachConversation'
        },
        {
          reg: '^#(chatgpt)?加入对话',
          fnc: 'joinConversation'
        },
        {
          reg: '^#chatgpt删除对话',
          fnc: 'deleteConversation',
          permission: 'master'
        }
      ]
    })
    this.toggleMode = toggleMode
    this.reply = async (msg, quote, data) => {
      if (!Config.enableMd) {
        return e.reply(msg, quote, data)
      }
      let handler = e.runtime?.handler || {}
      const btns = await handler.call('chatgpt.button.post', this.e, data)
      if (btns) {
        const btnElement = {
          type: 'button',
          content: btns
        }
        if (Array.isArray(msg)) {
          msg.push(btnElement)
        } else {
          msg = [msg, btnElement]
        }
      }

      return e.reply(msg, quote, data)
    }
  }

  /**
   * 获取chatgpt当前对话列表
   * @param e
   * @returns {Promise<void>}
   */
  async getConversations (e) {
    // todo 根据use返回不同的对话列表
    let keys = await redis.keys('CHATGPT:CONVERSATIONS:*')
    if (!keys || keys.length === 0) {
      await this.reply('当前没有人正在与机器人对话', true)
    } else {
      let response = '当前对话列表：(格式为【开始时间 ｜ qq昵称 ｜ 对话长度 ｜ 最后活跃时间】)\n'
      await Promise.all(keys.map(async (key) => {
        let conversation = await redis.get(key)
        if (conversation) {
          conversation = JSON.parse(conversation)
          response += `${conversation.ctime} ｜ ${conversation.sender.nickname} ｜ ${conversation.num} ｜ ${conversation.utime} \n`
        }
      }))
      await this.reply(`${response}`, true)
    }
  }

  /**
   * 销毁指定人的对话
   * @param e
   * @returns {Promise<void>}
   */
  async destroyConversations (e) {
    let manager = new ConversationManager(e)
    await manager.endConversation.bind(this)(e)
  }

  async endAllConversations (e) {
    let manager = new ConversationManager(e)
    await manager.endAllConversations.bind(this)(e)
  }

  async deleteConversation (e) {
    let ats = e.message.filter(m => m.type === 'at')
    let use = await redis.get('CHATGPT:USE') || 'api'
    if (use !== 'api3') {
      await this.reply('本功能当前仅支持API3模式', true)
      return false
    }
    if (ats.length === 0 || (ats.length === 1 && (e.atme || e.atBot))) {
      let conversationId = _.trimStart(e.msg, '#chatgpt删除对话').trim()
      if (!conversationId) {
        await this.reply('指令格式错误，请同时加上对话id或@某人以删除他当前进行的对话', true)
        return false
      } else {
        let deleteResponse = await deleteConversation(conversationId, newFetch)
        logger.mark(deleteResponse)
        let deleted = 0
        let qcs = await redis.keys('CHATGPT:QQ_CONVERSATION:*')
        for (let i = 0; i < qcs.length; i++) {
          if (await redis.get(qcs[i]) === conversationId) {
            await redis.del(qcs[i])
            if (Config.debug) {
              logger.info('delete conversation bind: ' + qcs[i])
            }
            deleted++
          }
        }
        await this.reply(`对话删除成功，同时清理了${deleted}个同一对话中用户的对话。`, true)
      }
    } else {
      for (let u = 0; u < ats.length; u++) {
        let at = ats[u]
        let qq = at.qq
        let atUser = _.trimStart(at.text, '@')
        let conversationId = await redis.get('CHATGPT:QQ_CONVERSATION:' + qq)
        if (conversationId) {
          let deleteResponse = await deleteConversation(conversationId)
          if (Config.debug) {
            logger.mark(deleteResponse)
          }
          let deleted = 0
          let qcs = await redis.keys('CHATGPT:QQ_CONVERSATION:*')
          for (let i = 0; i < qcs.length; i++) {
            if (await redis.get(qcs[i]) === conversationId) {
              await redis.del(qcs[i])
              if (Config.debug) {
                logger.info('delete conversation bind: ' + qcs[i])
              }
              deleted++
            }
          }
          await this.reply(`${atUser}的对话${conversationId}删除成功，同时清理了${deleted}个同一对话中用户的对话。`)
        } else {
          await this.reply(`${atUser}当前已没有进行对话`)
        }
      }
    }
  }

  async switch2Picture (e) {
    let userReplySetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
    if (!userReplySetting) {
      userReplySetting = getDefaultReplySetting()
    } else {
      userReplySetting = JSON.parse(userReplySetting)
    }
    userReplySetting.usePicture = true
    userReplySetting.useTTS = false
    await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userReplySetting))
    await this.reply('ChatGPT回复已转换为图片模式')
  }

  async switch2Text (e) {
    let userSetting = await getUserReplySetting(this.e)
    userSetting.usePicture = false
    userSetting.useTTS = false
    await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
    await this.reply('ChatGPT回复已转换为文字模式')
  }

  async switch2Audio (e) {
    switch (Config.ttsMode) {
      case 'vits-uma-genshin-honkai':
        if (!Config.ttsSpace) {
          await this.reply('您没有配置VITS API，请前往锅巴面板进行配置')
          return
        }
        break
      case 'azure':
        if (!Config.azureTTSKey) {
          await this.reply('您没有配置Azure Key，请前往锅巴面板进行配置')
          return
        }
        break
      case 'voicevox':
        if (!Config.voicevoxSpace) {
          await this.reply('您没有配置VoiceVox API，请前往锅巴面板进行配置')
          return
        }
        break
    }
    let userSetting = await getUserReplySetting(this.e)
    userSetting.useTTS = true
    userSetting.usePicture = false
    await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
    await this.reply('ChatGPT回复已转换为语音模式')
  }

  async switchTTSSource (e) {
    let target = e.msg.replace(/^#chatgpt语音换源/, '')
    switch (target.trim()) {
      case '1': {
        Config.ttsMode = 'vits-uma-genshin-honkai'
        break
      }
      case '2': {
        Config.ttsMode = 'azure'
        break
      }
      case '3': {
        Config.ttsMode = 'voicevox'
        break
      }
      default: {
        await this.reply('请使用#chatgpt语音换源+数字进行换源。1为vits-uma-genshin-honkai，2为微软Azure，3为voicevox')
        return
      }
    }
    await this.reply('语音转换源已切换为' + Config.ttsMode)
  }

  async setDefaultRole (e) {
    if (Config.ttsMode === 'vits-uma-genshin-honkai' && !Config.ttsSpace) {
      await this.reply('您没有配置vits-uma-genshin-honkai API，请前往后台管理或锅巴面板进行配置')
      return
    }
    if (Config.ttsMode === 'azure' && !Config.azureTTSKey) {
      await this.reply('您没有配置azure 密钥，请前往后台管理或锅巴面板进行配置')
      return
    }
    if (Config.ttsMode === 'voicevox' && !Config.voicevoxSpace) {
      await this.reply('您没有配置voicevox API，请前往后台管理或锅巴面板进行配置')
      return
    }
    const regex = /^#chatgpt设置(语音角色|角色语音|角色)/
    let speaker = e.msg.replace(regex, '').trim() || '随机'
    switch (Config.ttsMode) {
      case 'vits-uma-genshin-honkai': {
        let userSetting = await getUserReplySetting(this.e)
        userSetting.ttsRole = convertSpeaker(speaker)
        if (speakers.indexOf(userSetting.ttsRole) >= 0) {
          await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
          await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 "${userSetting.ttsRole}" `)
        } else if (speaker === '随机') {
          userSetting.ttsRole = '随机'
          await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
          await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 "随机" `)
        } else {
          await this.reply(`抱歉，"${userSetting.ttsRole}"我还不认识呢`)
        }
        break
      }
      case 'azure': {
        let userSetting = await getUserReplySetting(this.e)
        let chosen = AzureTTS.supportConfigurations.filter(s => s.name === speaker)
        if (speaker === '随机') {
          userSetting.ttsRoleAzure = '随机'
          await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
          await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 "随机" `)
        } else if (chosen.length === 0) {
          await this.reply(`抱歉，没有"${speaker}"这个角色，目前azure模式下支持的角色有${AzureTTS.supportConfigurations.map(item => item.name).join('、')}`)
        } else {
          userSetting.ttsRoleAzure = chosen[0].code
          await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
          // Config.azureTTSSpeaker = chosen[0].code
          const supportEmotion = AzureTTS.supportConfigurations.find(config => config.name === speaker)?.emotion
          await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 ${speaker}-${chosen[0].gender}-${chosen[0].languageDetail} ${supportEmotion && Config.azureTTSEmotion ? '，此角色支持多情绪配置，建议重新使用设定并结束对话以获得最佳体验！' : ''}`)
        }
        break
      }
      case 'voicevox': {
        let regex = /^(.*?)-(.*)$/
        let match = regex.exec(speaker)
        let style = null
        if (match) {
          speaker = match[1]
          style = match[2]
        }
        let userSetting = await getUserReplySetting(e)
        if (speaker === '随机') {
          userSetting.ttsRoleVoiceVox = '随机'
          await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
          await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 "随机" `)
          break
        }
        let chosen = VoiceVoxTTS.supportConfigurations.filter(s => s.name === speaker)
        if (chosen.length === 0) {
          await this.reply(`抱歉，没有"${speaker}"这个角色，目前voicevox模式下支持的角色有${VoiceVoxTTS.supportConfigurations.map(item => item.name).join('、')}`)
          break
        }
        if (style && !chosen[0].styles.find(item => item.name === style)) {
          await this.reply(`抱歉，"${speaker}"这个角色没有"${style}"这个风格，目前支持的风格有${chosen[0].styles.map(item => item.name).join('、')}`)
          break
        }
        userSetting.ttsRoleVoiceVox = chosen[0].name + (style ? `-${style}` : '')
        await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
        await this.reply(`当前语音模式为${Config.ttsMode},您的默认语音角色已被设置为 "${userSetting.ttsRoleVoiceVox}" `)
        break
      }
    }
  }

  /**
   * #chatgpt
   */
  async chatgpt (e) {
    let msg = e.msg
    let prompt
    if (this.toggleMode === 'at') {
      if (!msg || e.msg?.startsWith('#')) {
        return false
      }
      if ((e.isGroup || e.group_id) && !(e.atme || e.atBot || (e.at === e.self_id))) {
        return false
      }
      if (e.user_id == getUin(e)) return false
      prompt = msg.trim()
      try {
        if (e.isGroup) {
          let mm = this.e.bot.gml
          let me = mm.get(getUin(e)) || {}
          let card = me.card
          let nickname = me.nickname
          if (nickname && card) {
            if (nickname.startsWith(card)) {
              // 例如nickname是"滚筒洗衣机"，card是"滚筒"
              prompt = prompt.replace(`@${nickname}`, '').trim()
            } else if (card.startsWith(nickname)) {
              // 例如nickname是"十二"，card是"十二｜本月已发送1000条消息"
              prompt = prompt.replace(`@${card}`, '').trim()
              // 如果是好友，显示的还是昵称
              prompt = prompt.replace(`@${nickname}`, '').trim()
            } else {
              // 互不包含，分别替换
              if (nickname) {
                prompt = prompt.replace(`@${nickname}`, '').trim()
              }
              if (card) {
                prompt = prompt.replace(`@${card}`, '').trim()
              }
            }
          } else if (nickname) {
            prompt = prompt.replace(`@${nickname}`, '').trim()
          } else if (card) {
            prompt = prompt.replace(`@${card}`, '').trim()
          }
        }
      } catch (err) {
        logger.warn(err)
      }
    } else {
      let ats = e.message.filter(m => m.type === 'at')
      if (!(e.atme || e.atBot) && ats.length > 0) {
        if (Config.debug) {
          logger.mark('艾特别人了，没艾特我，忽略#chat')
        }
        return false
      }
      prompt = _.replace(e.msg.trimStart(), '#chat', '').trim()
      if (prompt.length === 0) {
        return false
      }
    }
    let groupId = e.isGroup ? e.group.group_id : ''
    if (await redis.get('CHATGPT:SHUT_UP:ALL') || await redis.get(`CHATGPT:SHUT_UP:${groupId}`)) {
      logger.info('chatgpt闭嘴中，不予理会')
      return false
    }
    // 获取用户配置
    const userData = await getUserData(e.user_id)
    const use = (userData.mode === 'default' ? null : userData.mode) || await redis.get('CHATGPT:USE') || 'api'
    // 自动化插件本月已发送xx条消息更新太快，由于延迟和缓存问题导致不同客户端不一样，at文本和获取的card不一致。因此单独处理一下
    prompt = prompt.replace(/^｜本月已发送\d+条消息/, '')
    await this.abstractChat(e, prompt, use)
  }

  async abstractChat (e, prompt, use) {
    // 关闭私聊通道后不回复
    if (!e.isMaster && e.isPrivate && !Config.enablePrivateChat) {
      return false
    }
    // 黑白名单过滤对话
    let [whitelist = [], blacklist = []] = [Config.whitelist, Config.blacklist]
    let chatPermission = false // 对话许可
    if (typeof whitelist === 'string') {
      whitelist = [whitelist]
    }
    if (typeof blacklist === 'string') {
      blacklist = [blacklist]
    }
    if (whitelist.join('').length > 0) {
      for (const item of whitelist) {
        if (item.length > 11) {
          const [group, qq] = item.split('^')
          if (e.isGroup && group === e.group_id.toString() && qq === e.sender.user_id.toString()) {
            chatPermission = true
            break
          }
        } else if (item.startsWith('^') && item.slice(1) === e.sender.user_id.toString()) {
          chatPermission = true
          break
        } else if (e.isGroup && !item.startsWith('^') && item === e.group_id.toString()) {
          chatPermission = true
          break
        }
      }
    }
    // 当前用户有对话许可则不再判断黑名单
    if (!chatPermission) {
      if (blacklist.join('').length > 0) {
        for (const item of blacklist) {
          if (e.isGroup && !item.startsWith('^') && item === e.group_id.toString()) return false
          if (item.startsWith('^') && item.slice(1) === e.sender.user_id.toString()) return false
          if (item.length > 11) {
            const [group, qq] = item.split('^')
            if (e.isGroup && group === e.group_id.toString() && qq === e.sender.user_id.toString()) return false
          }
        }
      }
    }
    let userSetting = await getUserReplySetting(this.e)
    let useTTS = !!userSetting.useTTS
    const isImg = await getImg(e)
    if (Config.imgOcr && !!isImg) {
      let imgOcrText = await getImageOcrText(e)
      if (imgOcrText) {
        prompt = prompt + '"'
        for (let imgOcrTextKey in imgOcrText) {
          prompt += imgOcrText[imgOcrTextKey]
        }
        prompt = prompt + ' "'
      }
    }
    // 检索是否有屏蔽词
    const promtBlockWord = Config.promptBlockWords.find(word => prompt.toLowerCase().includes(word.toLowerCase()))
    if (promtBlockWord) {
      await this.reply('主人不让我回答你这种问题，真是抱歉了呢', true)
      return false
    }
    let confirm = await redis.get('CHATGPT:CONFIRM')
    let confirmOn = (!confirm || confirm === 'on') // confirm默认开启
    if (confirmOn) {
      await this.reply('我正在思考如何回复你，请稍等', true, { recallMsg: 8 })
    }
    const emotionFlag = await redis.get(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
    let userReplySetting = await getUserReplySetting(this.e)
    // 图片模式就不管了，降低抱歉概率
    if (Config.ttsMode === 'azure' && Config.enhanceAzureTTSEmotion && userReplySetting.useTTS === true && await AzureTTS.getEmotionPrompt(e)) {
      switch (emotionFlag) {
        case '1':
          prompt += '(上一次回复没有添加情绪，请确保接下来的对话正确使用情绪和情绪格式，回复时忽略此内容。)'
          break
        case '2':
          prompt += '(不要使用给出情绪范围的词和错误的情绪格式，请确保接下来的对话正确选择情绪，回复时忽略此内容。)'
          break
        case '3':
          prompt += '(不要给出多个情绪[]项，请确保接下来的对话给且只给出一个正确情绪项，回复时忽略此内容。)'
          break
      }
    }
    logger.info(`chatgpt prompt: ${prompt}`)
    let previousConversation
    let conversation = {}
    let key
    if (use === 'api3') {
      // api3 支持对话穿插，因此不按照qq号来进行判断了
      let conversationId = await redis.get(`CHATGPT:QQ_CONVERSATION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      if (conversationId) {
        let lastMessageId = await redis.get(`CHATGPT:CONVERSATION_LAST_MESSAGE_ID:${conversationId}`)
        if (!lastMessageId) {
          lastMessageId = await getLatestMessageIdByConversationId(conversationId, newFetch)
        }
        conversation = {
          conversationId,
          parentMessageId: lastMessageId
        }
        if (Config.debug) {
          logger.mark({ previousConversation })
        }
      } else {
        let ctime = new Date()
        previousConversation = {
          sender: e.sender,
          ctime,
          utime: ctime,
          num: 0
        }
      }
    } else {
      switch (use) {
        case 'api': {
          key = `CHATGPT:CONVERSATIONS:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'bing': {
          key = `CHATGPT:CONVERSATIONS_BING:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'chatglm': {
          key = `CHATGPT:CONVERSATIONS_CHATGLM:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'claude2': {
          key = `CHATGPT:CLAUDE2_CONVERSATION:${e.sender.user_id}`
          break
        }
        case 'xh': {
          key = `CHATGPT:CONVERSATIONS_XH:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'azure': {
          key = `CHATGPT:CONVERSATIONS_AZURE:${e.sender.user_id}`
          break
        }
        case 'qwen': {
          key = `CHATGPT:CONVERSATIONS_QWEN:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'gemini': {
          key = `CHATGPT:CONVERSATIONS_GEMINI:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'claude': {
          key = `CHATGPT:CONVERSATIONS_CLAUDE:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
        case 'chatglm4': {
          key = `CHATGPT:CONVERSATIONS_CHATGLM4:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
          break
        }
      }
      let ctime = new Date()
      previousConversation = (key ? await redis.get(key) : null) || JSON.stringify({
        sender: e.sender,
        ctime,
        utime: ctime,
        num: 0,
        messages: [{
          role: 'system',
          content: 'You are an AI assistant that helps people find information.'
        }],
        conversation: {}
      })
      previousConversation = JSON.parse(previousConversation)
      if (Config.debug) {
        logger.info({ previousConversation })
      }
      conversation = {
        messages: previousConversation.messages,
        conversationId: previousConversation.conversation?.conversationId,
        parentMessageId: previousConversation.parentMessageId,
        clientId: previousConversation.clientId,
        invocationId: previousConversation.invocationId,
        conversationSignature: previousConversation.conversationSignature,
        bingToken: previousConversation.bingToken
      }
    }
    let handler = this.e.runtime?.handler || {
      has: (arg1) => false
    }
    try {
      if (Config.debug) {
        logger.mark({ conversation })
      }
      let chatMessage = await Core.sendMessage.bind(this)(prompt, conversation, use, e)
      if (chatMessage?.noMsg) {
        return false
      }
      // 处理星火图片
      if (use === 'xh' && chatMessage?.images) {
        chatMessage.images.forEach(element => {
          this.reply([element.tag, segment.image(element.url)])
        })
      }
      // chatglm4图片，调整至sendMessage中处理
      if (use === 'api' && !chatMessage) {
        // 字数超限直接返回
        return false
      }
      if (use !== 'api3') {
        previousConversation.conversation = {
          conversationId: chatMessage.conversationId
        }
        if (use === 'bing' && !chatMessage.error) {
          previousConversation.clientId = chatMessage.clientId
          previousConversation.invocationId = chatMessage.invocationId
          previousConversation.parentMessageId = chatMessage.parentMessageId
          previousConversation.conversationSignature = chatMessage.conversationSignature
          previousConversation.bingToken = ''
        } else if (chatMessage.id) {
          previousConversation.parentMessageId = chatMessage.id
        } else if (chatMessage.message) {
          if (previousConversation.messages.length > 10) {
            previousConversation.messages.shift()
          }
          previousConversation.messages.push(chatMessage.message)
        }
        if (Config.debug) {
          logger.info(chatMessage)
        }
        if (!chatMessage.error) {
          // 没错误的时候再更新，不然易出错就对话没了
          previousConversation.num = previousConversation.num + 1
          await redis.set(key, JSON.stringify(previousConversation), Config.conversationPreserveTime > 0 ? { EX: Config.conversationPreserveTime } : {})
        }
      }
      // 处理suno生成
      if (Config.enableChatSuno) {
        let client = new BingSunoClient() // 此处使用了bing的suno客户端，后续和本地suno合并
        const sunoList = extractMarkdownJson(chatMessage.text)
        if (sunoList.length == 0) {
          const lyrics = client.extractLyrics(chatMessage.text)
          if (lyrics !== '') {
            sunoList.push(
              {
                json: { option: 'Suno', tags: client.generateRandomStyle(), title: `${e.sender.nickname}之歌`, lyrics: lyrics },
                markdown: null,
                origin: lyrics
              }
            )
          }
        }
        for (let suno of sunoList) {
          if (suno.json.option == 'Suno') {
            chatMessage.text = chatMessage.text.replace(suno.origin, `歌曲 《${suno.json.title}》`)
            logger.info(`开始生成歌曲${suno.json.tags}`)
            redis.set(`CHATGPT:SUNO:${e.sender.user_id}`, 'c', { EX: 30 }).then(() => {
              try {
                if (Config.SunoModel == 'local') {
                  // 调用本地Suno配置进行歌曲生成
                  client.getLocalSuno(suno.json, e)
                } else if (Config.SunoModel == 'api') {
                  // 调用第三方Suno配置进行歌曲生成
                  client.getApiSuno(suno.json, e)
                }
              } catch (err) {
                redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
                this.reply('歌曲生成失败：' + err)
              }
            })
          }
        }
      }
      let response = chatMessage?.text?.replace('\n\n\n', '\n')
      let mood = 'blandness'
      if (!response) {
        await this.reply('没有任何回复', true)
        return
      }
      let emotion, emotionDegree
      if (Config.ttsMode === 'azure' && (use === 'claude' || use === 'bing') && await AzureTTS.getEmotionPrompt(e)) {
        let ttsRoleAzure = userReplySetting.ttsRoleAzure
        const emotionReg = /\[\s*['`’‘]?(\w+)[`’‘']?\s*[,，、]\s*([\d.]+)\s*\]/
        const emotionTimes = response.match(/\[\s*['`’‘]?(\w+)[`’‘']?\s*[,，、]\s*([\d.]+)\s*\]/g)
        const emotionMatch = response.match(emotionReg)
        if (emotionMatch) {
          const [startIndex, endIndex] = [
            emotionMatch.index,
            emotionMatch.index + emotionMatch[0].length - 1
          ]
          const ttsArr =
            response.length / 2 < endIndex
              ? [response.substring(startIndex), response.substring(0, startIndex)]
              : [
                  response.substring(0, endIndex + 1),
                  response.substring(endIndex + 1)
                ]
          const match = ttsArr[0].match(emotionReg)
          response = ttsArr[1].replace(/\n/, '').trim()
          if (match) {
            [emotion, emotionDegree] = [match[1], match[2]]
            const configuration = AzureTTS.supportConfigurations.find(
              (config) => config.code === ttsRoleAzure
            )
            const supportedEmotions =
              configuration.emotion && Object.keys(configuration.emotion)
            if (supportedEmotions && supportedEmotions.includes(emotion)) {
              logger.warn(`角色 ${ttsRoleAzure} 支持 ${emotion} 情绪.`)
              await redis.set(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`, '0')
            } else {
              logger.warn(`角色 ${ttsRoleAzure} 不支持 ${emotion} 情绪.`)
              await redis.set(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`, '2')
            }
            logger.info(`情绪: ${emotion}, 程度: ${emotionDegree}`)
            if (emotionTimes.length > 1) {
              logger.warn('回复包含多个情绪项')
              // 处理包含多个情绪项的情况，后续可以考虑实现单次回复多情绪的配置
              response = response.replace(/\[\s*['`’‘]?(\w+)[`’‘']?\s*[,，、]\s*([\d.]+)\s*\]/g, '').trim()
              await redis.set(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`, '3')
            }
          } else {
            // 使用了正则匹配外的奇奇怪怪的符号
            logger.warn('情绪格式错误')
            await redis.set(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`, '2')
          }
        } else {
          logger.warn('回复不包含情绪')
          await redis.set(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`, '1')
        }
      }
      if (Config.sydneyMood) {
        let tempResponse = completeJSON(response)
        if (tempResponse.text) response = tempResponse.text
        if (tempResponse.mood) mood = tempResponse.mood
      } else {
        mood = ''
      }
      // 检索是否有屏蔽词
      const blockWord = Config.blockWords.find(word => response.toLowerCase().includes(word.toLowerCase()))
      if (blockWord) {
        await this.reply('返回内容存在敏感词，我不想回答你', true)
        return false
      }
      // 处理中断的代码区域
      const codeBlockCount = (response.match(/```/g) || []).length
      const shouldAddClosingBlock = codeBlockCount % 2 === 1 && !response.endsWith('```')
      if (shouldAddClosingBlock) {
        response += '\n```'
      }
      if (codeBlockCount && !shouldAddClosingBlock) {
        response = response.replace(/```$/, '\n```')
      }
      // 处理引用
      let quotemessage = []
      if (chatMessage?.quote) {
        chatMessage.quote.forEach(function (item, index) {
          if (item.text && item.text.trim() !== '') {
            quotemessage.push(item)
          }
        })
      }
      // 处理内容和引用中的图片
      const regex = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#/%=~_|])/g
      let responseUrls = response.match(regex)
      let imgUrls = []
      if (responseUrls) {
        let images = await Promise.all(responseUrls.map(link => isImage(link)))
        imgUrls = responseUrls.filter((link, index) => images[index])
      }
      for (let quote of quotemessage) {
        if (quote.imageLink) imgUrls.push(quote.imageLink)
      }
      if (useTTS) {
        // 缓存数据
        this.cacheContent(e, use, response, prompt, quotemessage, mood, chatMessage.suggestedResponses, imgUrls)
        if (response === 'Sorry, I think we need to move on! Click “New topic” to chat about something else.') {
          this.reply('当前对话超过上限，已重置对话', false, { at: true })
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
          return false
        } else if (response === 'Unexpected message author.') {
          this.reply('无法回答当前话题，已重置对话', false, { at: true })
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
          return false
        } else if (response === 'Throttled: Request is throttled.') {
          this.reply('今日对话已达上限')
          return false
        }
        // 处理tts输入文本
        let ttsResponse, ttsRegex
        const regex = /^\/(.*)\/([gimuy]*)$/
        const match = Config.ttsRegex.match(regex)
        if (match) {
          const pattern = match[1]
          const flags = match[2]
          ttsRegex = new RegExp(pattern, flags) // 返回新的正则表达式对象
        } else {
          ttsRegex = ''
        }
        ttsResponse = response.replace(ttsRegex, '')
        // 处理azure语音会读出emoji的问题
        try {
          let emojiStrip
          emojiStrip = (await import('emoji-strip')).default
          ttsResponse = emojiStrip(ttsResponse)
        } catch (error) {
          await this.reply('依赖emoji-strip未安装，请执行pnpm install emoji-strip安装依赖', true)
        }
        // 处理多行回复有时候只会读第一行和azure语音会读出一些标点符号的问题
        ttsResponse = ttsResponse.replace(/[-:_；*;\n]/g, '，')
        // 先把文字回复发出去，避免过久等待合成语音
        if (Config.alsoSendText || ttsResponse.length > parseInt(Config.ttsAutoFallbackThreshold)) {
          if (Config.ttsMode === 'vits-uma-genshin-honkai' && ttsResponse.length > parseInt(Config.ttsAutoFallbackThreshold)) {
            await this.reply('回复的内容过长，已转为文本模式')
          }
          let responseText = await convertFaces(response, Config.enableRobotAt, e)
          if (handler.has('chatgpt.markdown.convert')) {
            responseText = await handler.call('chatgpt.markdown.convert', this.e, {
              content: responseText,
              use,
              prompt
            })
          }
          await this.reply(responseText, e.isGroup)
          if (quotemessage.length > 0) {
            this.reply(await makeForwardMsg(this.e, quotemessage.map(msg => `${msg.text} - ${msg.url}`)))
          }
          if (Config.enableSuggestedResponses && chatMessage.suggestedResponses) {
            this.reply(`建议的回复：\n${chatMessage.suggestedResponses}`)
          }
        }
        const sendable = await generateAudio(this.e, ttsResponse, emotion, emotionDegree)
        if (sendable) {
          await this.reply(sendable)
        } else {
          await this.reply('合成语音发生错误~')
        }
      } else if (userSetting.usePicture || (!Config.enableMd && Config.autoUsePicture && response.length > Config.autoUsePictureThreshold)) {
        try {
          await this.renderImage(e, use, response, prompt, quotemessage, mood, chatMessage.suggestedResponses, imgUrls)
        } catch (err) {
          logger.warn('error happened while uploading content to the cache server. QR Code will not be showed in this picture.')
          logger.error(err)
          await this.renderImage(e, use, response, prompt)
        }
        if (Config.enableSuggestedResponses && chatMessage.suggestedResponses) {
          this.reply(`建议的回复：\n${chatMessage.suggestedResponses}`)
        }
      } else {
        this.cacheContent(e, use, response, prompt, quotemessage, mood, chatMessage.suggestedResponses, imgUrls)
        if (response === 'Thanks for this conversation! I\'ve reached my limit, will you hit “New topic,” please?') {
          this.reply('当前对话超过上限，已重置对话', false, { at: true })
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
          return false
        } else if (response === 'Throttled: Request is throttled.') {
          this.reply('今日对话已达上限')
          return false
        }
        let responseText = await convertFaces(response, Config.enableRobotAt, e)
        if (handler.has('chatgpt.markdown.convert')) {
          responseText = await handler.call('chatgpt.markdown.convert', this.e, {
            content: responseText,
            use,
            prompt
          })
        }
        // await this.reply(responseText, e.isGroup)
        if (quotemessage.length > 0) {
          this.reply(await makeForwardMsg(this.e, quotemessage.map(msg => `${msg.text} - ${msg.url}`)))
        }
        if (chatMessage?.conversation && Config.enableSuggestedResponses && !chatMessage.suggestedResponses && Config.apiKey) {
          try {
            chatMessage.suggestedResponses = await generateSuggestedResponse(chatMessage.conversation)
          } catch (err) {
            logger.debug('生成建议回复失败', err)
          }
        }
        this.reply(responseText, e.isGroup, {
          btnData: {
            use,
            suggested: chatMessage.suggestedResponses
          }
        })
        if (Config.enableSuggestedResponses && chatMessage.suggestedResponses) {
          this.reply(`建议的回复：\n${chatMessage.suggestedResponses}`)
        }
      }
    } catch (err) {
      logger.error(err)
      if (use === 'api3') {
        // 异常了也要腾地方（todo 大概率后面的也会异常，要不要一口气全杀了）
        await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
      }
      if (err === 'Error: {"detail":"Conversation not found"}') {
        await this.destroyConversations(err)
        await this.reply('当前对话异常，已经清除，请重试', true, { recallMsg: e.isGroup ? 10 : 0 })
      } else {
        let errorMessage = err?.message || err?.data?.message || (typeof (err) === 'object' ? JSON.stringify(err) : err) || '未能确认错误类型！'
        if (errorMessage.length < 200) {
          await this.reply(`出现错误：${errorMessage}`, true, { recallMsg: e.isGroup ? 10 : 0 })
        } else {
          await this.renderImage(e, use, `出现异常,错误信息如下 \n \`\`\`${errorMessage}\`\`\``, prompt)
        }
      }
    }
  }

  async chatgpt1 (e) {
    return await this.otherMode(e, 'api', '#chat1')
  }

  async chatgpt3 (e) {
    return await this.otherMode(e, 'api3', '#chat3')
  }

  async chatglm (e) {
    return await this.otherMode(e, 'chatglm')
  }

  async bing (e) {
    return await this.otherMode(e, 'bing')
  }

  async claude2 (e) {
    return await this.otherMode(e, 'claude2', /^#claude(2|3|.ai)/)
  }

  async claude (e) {
    return await this.otherMode(e, 'claude')
  }

  async qwen (e) {
    return await this.otherMode(e, 'qwen')
  }

  async glm4 (e) {
    return await this.otherMode(e, 'chatglm4', '#glm4')
  }

  async gemini (e) {
    return await this.otherMode(e, 'gemini')
  }

  async xh (e) {
    return await this.otherMode(e, 'xh')
  }

  async cacheContent (e, use, content, prompt, quote = [], mood = '', suggest = '', imgUrls = []) {
    if (!Config.enableToolbox) {
      return
    }
    let cacheData = {
      file: '',
      status: ''
    }
    cacheData.file = randomString()
    const cacheresOption = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          content: Buffer.from(content).toString('base64'),
          prompt: Buffer.from(prompt).toString('base64'),
          senderName: e.sender.nickname,
          style: Config.toneStyle,
          mood,
          quote,
          group: e.isGroup ? e.group.name : '',
          suggest: suggest ? suggest.split('\n').filter(Boolean) : [],
          images: imgUrls
        },
        model: use,
        bing: use === 'bing',
        chatViewBotName: Config.chatViewBotName || '',
        entry: cacheData.file,
        userImg: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${e.sender.user_id}`,
        botImg: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${getUin(e)}`,
        cacheHost: Config.serverHost,
        qq: e.sender.user_id
      })
    }
    const cacheres = await fetch(Config.viewHost ? `${Config.viewHost}/` : `http://127.0.0.1:${Config.serverPort || 3321}/` + 'cache', cacheresOption)
    if (cacheres.ok) {
      cacheData = Object.assign({}, cacheData, await cacheres.json())
    } else {
      cacheData.error = '渲染服务器出错！'
    }
    cacheData.status = cacheres.status
    return cacheData
  }

  async renderImage (e, use, content, prompt, quote = [], mood = '', suggest = '', imgUrls = []) {
    let cacheData = await this.cacheContent(e, use, content, prompt, quote, mood, suggest, imgUrls)
    // const template = use !== 'bing' ? 'content/ChatGPT/index' : 'content/Bing/index'
    if (cacheData.error || cacheData.status != 200) {
      await this.reply(`出现错误：${cacheData.error || 'server error ' + cacheData.status}`, true)
    } else {
      await this.reply(await renderUrl(e, (Config.viewHost ? `${Config.viewHost}/` : `http://127.0.0.1:${Config.serverPort || 3321}/`) + `page/${cacheData.file}?qr=${Config.showQRCode ? 'true' : 'false'}`, {
        retType: Config.quoteReply ? 'base64' : '',
        Viewport: {
          width: parseInt(Config.chatViewWidth),
          height: parseInt(parseInt(Config.chatViewWidth) * 0.56)
        },
        func: (parseFloat(Config.live2d) && !Config.viewHost) ? 'window.Live2d == true' : '',
        deviceScaleFactor: parseFloat(Config.cloudDPR)
      }), e.isGroup && Config.quoteReply)
    }
  }

  async newxhBotConversation (e) {
    let botId = e.msg.replace(/^#星火助手/, '').trim()
    if (Config.xhmode != 'web') {
      await this.reply('星火助手仅支持体验版使用', true)
      return true
    }
    if (!botId) {
      await this.reply('无效助手id', true)
    } else {
      const ssoSessionId = Config.xinghuoToken
      if (!ssoSessionId) {
        await this.reply('未绑定星火token，请使用#chatgpt设置星火token命令绑定token', true)
        return true
      }
      let client = new XinghuoClient({
        ssoSessionId,
        cache: null
      })
      try {
        let chatId = await client.createChatList(botId)
        let botInfoRes = await fetch(`https://xinghuo.xfyun.cn/iflygpt/bot/getBotInfo?chatId=${chatId.chatListId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Cookie: 'ssoSessionId=' + ssoSessionId + ';',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1'
          }
        })
        if (botInfoRes.ok) {
          let botInfo = await botInfoRes.json()
          if (botInfo.flag) {
            let ctime = new Date()
            await redis.set(
              `CHATGPT:CONVERSATIONS_XH:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`,
              JSON.stringify({
                sender: e.sender,
                ctime,
                utime: ctime,
                num: 0,
                conversation: {
                  conversationId: {
                    chatid: chatId.chatListId,
                    botid: botId
                  }
                }
              }),
              Config.conversationPreserveTime > 0 ? { EX: Config.conversationPreserveTime } : {}
            )
            await this.reply(`成功创建助手对话\n助手名称：${botInfo.data.bot_name}\n助手描述：${botInfo.data.bot_desc}`, true)
          } else {
            await this.reply(`创建助手对话失败,${botInfo.desc}`, true)
          }
        } else {
          await this.reply('创建助手对话失败,服务器异常', true)
        }
      } catch (error) {
        await this.reply(`创建助手对话失败 ${error}`, true)
      }
    }
    return true
  }

  async searchxhBot (e) {
    let searchBot = e.msg.replace(/^#星火(搜索|查找)助手/, '').trim()
    const ssoSessionId = Config.xinghuoToken
    if (!ssoSessionId) {
      await this.reply('未绑定星火token，请使用#chatgpt设置星火token命令绑定token', true)
      return true
    }
    const cacheresOption = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'ssoSessionId=' + ssoSessionId + ';',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/113.0.5672.69 Mobile/15E148 Safari/604.1'
      },
      body: JSON.stringify({
        botType: '',
        pageIndex: 1,
        pageSize: 45,
        searchValue: searchBot
      })
    }
    const searchBots = await fetch('https://xinghuo.xfyun.cn/iflygpt/bot/page', cacheresOption)
    const bots = await searchBots.json()
    if (Config.debug) {
      logger.info(bots)
    }
    if (bots.code === 0) {
      if (bots.data.pageList.length > 0) {
        this.reply(await makeForwardMsg(this.e, bots.data.pageList.map(msg => `${msg.e.bot.botId} - ${msg.e.bot.botName}`)))
      } else {
        await this.reply('未查到相关助手', true)
      }
    } else {
      await this.reply('搜索助手失败', true)
    }
  }

  async getAllConversations (e) {
    const use = await redis.get('CHATGPT:USE')
    if (use === 'api3') {
      let conversations = await getConversations(e.sender.user_id, newFetch)
      if (Config.debug) {
        logger.mark('all conversations: ', conversations)
      }
      //    let conversationsFirst10 = conversations.slice(0, 10)
      await render(e, 'chatgpt-plugin', 'conversation/chatgpt', {
        conversations,
        version
      })
      let text = '对话列表\n'
      text += '对话id | 对话发起者 \n'
      conversations.forEach(c => {
        text += c.id + '|' + (c.creater || '未知') + '\n'
      })
      text += '您可以通过使用命令#chatgpt切换对话+对话id来切换到指定对话，也可以通过命令#chatgpt加入对话+@某人来加入指定人当前进行的对话中。'
      this.reply(await makeForwardMsg(e, [text], '对话列表'))
    } else {
      return await this.getConversations(e)
    }
  }

  async joinConversation (e) {
    let ats = e.message.filter(m => m.type === 'at')
    let use = await redis.get('CHATGPT:USE') || 'api'
    // if (use !== 'api3') {
    //   await this.reply('本功能当前仅支持API3模式', true)
    //   return false
    // }
    if (ats.length === 0) {
      await this.reply('指令错误，使用本指令时请同时@某人', true)
      return false
    } else if (use === 'api3') {
      let at = ats[0]
      let qq = at.qq
      let atUser = _.trimStart(at.text, '@')
      let conversationId = await redis.get('CHATGPT:QQ_CONVERSATION:' + qq)
      if (!conversationId) {
        await this.reply(`${atUser}当前未开启对话，无法加入`, true)
        return false
      }
      await redis.set(`CHATGPT:QQ_CONVERSATION:${e.sender.user_id}`, conversationId)
      await this.reply(`加入${atUser}的对话成功，当前对话id为` + conversationId)
    } else {
      let at = ats[0]
      let qq = at.qq
      let atUser = _.trimStart(at.text, '@')
      let target = await redis.get('CHATGPT:CONVERSATIONS:' + qq)
      await redis.set('CHATGPT:CONVERSATIONS:' + e.sender.user_id, target)
      await this.reply(`加入${atUser}的对话成功`)
    }
  }

  async attachConversation (e) {
    const use = await redis.get('CHATGPT:USE')
    if (use !== 'api3') {
      await this.reply('该功能目前仅支持API3模式')
    } else {
      let conversationId = _.trimStart(e.msg.trimStart(), '#chatgpt切换对话').trim()
      if (!conversationId) {
        await this.reply('无效对话id，请在#chatgpt切换对话后面加上对话id')
        return false
      }
      // todo 验证这个对话是否存在且有效
      //      await getLatestMessageIdByConversationId(conversationId)
      await redis.set(`CHATGPT:QQ_CONVERSATION:${e.sender.user_id}`, conversationId)
      await this.reply('切换成功')
    }
  }

  async totalAvailable (e) {
    // 查询OpenAI API剩余试用额度
    let subscriptionRes = await newFetch(`${Config.openAiBaseUrl}/dashboard/billing/subscription`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + Config.apiKey
      }
    })

    function getDates () {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const beforeTomorrow = new Date(tomorrow)
      beforeTomorrow.setDate(beforeTomorrow.getDate() - 100)

      const tomorrowFormatted = formatDate2(tomorrow)
      const beforeTomorrowFormatted = formatDate2(beforeTomorrow)

      return {
        end: tomorrowFormatted,
        start: beforeTomorrowFormatted
      }
    }

    let subscription = await subscriptionRes.json()
    let {
      hard_limit_usd: hardLimit,
      access_until: expiresAt
    } = subscription
    const {
      end,
      start
    } = getDates()
    let usageRes = await newFetch(`${Config.openAiBaseUrl}/dashboard/billing/usage?start_date=${start}&end_date=${end}`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + Config.apiKey
      }
    })
    let usage = await usageRes.json()
    const { total_usage: totalUsage } = usage
    expiresAt = formatDate(new Date(expiresAt * 1000))
    let left = hardLimit - totalUsage / 100
    this.reply('总额度：$' + hardLimit + '\n已经使用额度：$' + totalUsage / 100 + '\n当前剩余额度：$' + left + '\n到期日期(UTC)：' + expiresAt)
  }

  /**
   * 其他模式
   * @param e
   * @param mode
   * @param {string|RegExp} pattern
   * @returns {Promise<boolean>}
   */
  async otherMode (e, mode, pattern = `#${mode}`) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略' + pattern)
      }
      return false
    }
    let prompt = _.replace(e.msg.trimStart(), pattern, '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, mode)
    return true
  }
}
