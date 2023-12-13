import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import { Config, defaultOpenAIAPI } from '../utils/config.js'
import { v4 as uuid } from 'uuid'
import delay from 'delay'
import { ChatGPTAPI } from '../utils/openai/chatgpt-api.js'
import { BingAIClient } from '@waylaidwanderer/chatgpt-api'
import SydneyAIClient from '../utils/SydneyAIClient.js'
import { PoeClient } from '../utils/poe/index.js'
import AzureTTS from '../utils/tts/microsoft-azure.js'
import VoiceVoxTTS from '../utils/tts/voicevox.js'
import Version from '../utils/version.js'
import {
  completeJSON,
  extractContentFromFile,
  formatDate,
  formatDate2,
  generateAudio,
  getDefaultReplySetting,
  getImageOcrText,
  getImg,
  getMasterQQ,
  getMaxModelTokens,
  getMessageById,
  getUin,
  getUserData,
  getUserReplySetting,
  isCN,
  isImage,
  makeForwardMsg,
  randomString,
  render,
  renderUrl,
  upsertMessage
} from '../utils/common.js'
import { ChatGPTPuppeteer } from '../utils/browser.js'
import { KeyvFile } from 'keyv-file'
import { OfficialChatGPTClient } from '../utils/message.js'
import fetch from 'node-fetch'
import { deleteConversation, getConversations, getLatestMessageIdByConversationId } from '../utils/conversation.js'
import { convertSpeaker, speakers } from '../utils/tts.js'
import ChatGLMClient from '../utils/chatglm.js'
import { convertFaces } from '../utils/face.js'
import { SlackClaudeClient } from '../utils/slack/slackClient.js'
import { getPromptByName } from '../utils/prompts.js'
import BingDrawClient from '../utils/BingDraw.js'
import XinghuoClient from '../utils/xinghuo/xinghuo.js'
import Bard from '../utils/bard.js'
import { JinyanTool } from '../utils/tools/JinyanTool.js'
import { SendVideoTool } from '../utils/tools/SendBilibiliTool.js'
import { KickOutTool } from '../utils/tools/KickOutTool.js'
import { EditCardTool } from '../utils/tools/EditCardTool.js'
import { SearchVideoTool } from '../utils/tools/SearchBilibiliTool.js'
import { SearchMusicTool } from '../utils/tools/SearchMusicTool.js'
import { QueryStarRailTool } from '../utils/tools/QueryStarRailTool.js'
import { WebsiteTool } from '../utils/tools/WebsiteTool.js'
import { WeatherTool } from '../utils/tools/WeatherTool.js'
import { SerpTool } from '../utils/tools/SerpTool.js'
import { SerpIkechan8370Tool } from '../utils/tools/SerpIkechan8370Tool.js'
import { SendPictureTool } from '../utils/tools/SendPictureTool.js'
import { SerpImageTool } from '../utils/tools/SearchImageTool.js'
import { ImageCaptionTool } from '../utils/tools/ImageCaptionTool.js'
import { SendAudioMessageTool } from '../utils/tools/SendAudioMessageTool.js'
import { ProcessPictureTool } from '../utils/tools/ProcessPictureTool.js'
import { APTool } from '../utils/tools/APTool.js'
import { QueryGenshinTool } from '../utils/tools/QueryGenshinTool.js'
import { HandleMessageMsgTool } from '../utils/tools/HandleMessageMsgTool.js'
import { QueryUserinfoTool } from '../utils/tools/QueryUserinfoTool.js'
import { EliMovieTool } from '../utils/tools/EliMovieTool.js'
import { EliMusicTool } from '../utils/tools/EliMusicTool.js'
import { SendMusicTool } from '../utils/tools/SendMusicTool.js'
import { SendDiceTool } from '../utils/tools/SendDiceTool.js'
import { SendAvatarTool } from '../utils/tools/SendAvatarTool.js'
import { SendMessageToSpecificGroupOrUserTool } from '../utils/tools/SendMessageToSpecificGroupOrUserTool.js'
import { SetTitleTool } from '../utils/tools/SetTitleTool.js'
import { solveCaptchaOneShot } from '../utils/bingCaptcha.js'
import { ClaudeAIClient } from '../utils/claude.ai/index.js'
import { getProxy } from '../utils/proxy.js'
import { QwenApi } from '../utils/alibaba/qwen-api.js'
import { getChatHistoryGroup } from '../utils/chat.js'

try {
  await import('@azure/openai')
} catch (err) {
  logger.warn('【Azure-Openai】依赖@azure/openai未安装，Azure OpenAI不可用 请执行pnpm install @azure/openai安装')
}

try {
  await import('emoji-strip')
} catch (err) {
  logger.warn('【ChatGPT-Plugin】依赖emoji-strip未安装，会导致azure语音模式下朗读emoji的问题，建议执行pnpm install emoji-strip安装')
}
try {
  await import('keyv')
} catch (err) {
  logger.warn('【ChatGPT-Plugin】依赖keyv未安装，可能影响Sydney模式下Bing对话，建议执行pnpm install keyv安装')
}
let version = Config.version
let proxy = getProxy()

const originalValues  = ['星火', '通义千问', '克劳德', '克劳德2', '必应', 'api', 'API', 'api3', 'API3', 'glm', '巴德']
const correspondingValues = ['xh', 'qwen', 'claude', 'claude2', 'bing', 'api', 'api', 'api3', 'api3', 'chatglm', 'bard']
/**
 * 每个对话保留的时长。单个对话内ai是保留上下文的。超时后销毁对话，再次对话创建新的对话。
 * 单位：秒
 * @type {number}
 *
 * 这里使用动态数据获取，以便于锅巴动态更新数据
 */
// const CONVERSATION_PRESERVE_TIME = Config.conversationPreserveTime
const defaultPropmtPrefix = ', a large language model trained by OpenAI. You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short.'
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
  constructor () {
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
          reg: '^#claude开启新对话',
          fnc: 'newClaudeConversation'
        },
        {
          /** 命令正则匹配 */
          reg: '^#claude2[sS]*',
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
          reg: '^#qwen[sS]*',
          /** 执行方法 */
          fnc: 'qwen'
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
          reg: '^#(chatgpt|星火|通义千问|克劳德|克劳德2|必应|api|API|api3|API3|glm|巴德)?(结束|新开|摧毁|毁灭|完结)对话([sS]*)',
          fnc: 'destroyConversations'
        },
        {
          reg: '^#(chatgpt|星火|通义千问|克劳德|克劳德2|必应|api|API|api3|API3|glm|巴德)?(结束|新开|摧毁|毁灭|完结)全部对话$',
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
          reg: '^#(chatgpt)?清空(chat)?队列$',
          fnc: 'emptyQueue',
          permission: 'master'
        },
        {
          reg: '^#(chatgpt)?移出(chat)?队列首位$',
          fnc: 'removeQueueFirst',
          permission: 'master'
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
    const userData = await getUserData(e.user_id)
    const match = e.msg.trim().match('^#?(.*)(结束|新开|摧毁|毁灭|完结)对话')
    console.log(match[1])
    let use
    if (match[1] && match[1] != 'chatgpt') {
      use = correspondingValues[originalValues.indexOf(match[1])]
    } else {
      use = (userData.mode === 'default' ? null : userData.mode) || await redis.get('CHATGPT:USE')
    }
    console.log(use)
    await redis.del(`CHATGPT:WRONG_EMOTION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
    if (use === 'claude') {
      // let client = new SlackClaudeClient({
      //   slackUserToken: Config.slackUserToken,
      //   slackChannelId: Config.slackChannelId
      // })
      // await client.endConversation()
      await redis.del(`CHATGPT:SLACK_CONVERSATION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      await e.reply('claude对话已结束')
      return
    }
    if (use === 'claude2') {
      await redis.del(`CHATGPT:CLAUDE2_CONVERSATION:${e.sender.user_id}`)
      await e.reply('claude2对话已结束')
      return
    }
    if (use === 'xh') {
      await redis.del(`CHATGPT:CONVERSATIONS_XH:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      await e.reply('星火对话已结束')
      return
    }
    if (use === 'bard') {
      await redis.del(`CHATGPT:CONVERSATIONS_BARD:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
      await e.reply('Bard对话已结束')
      return
    }
    let ats = e.message.filter(m => m.type === 'at')
    const isAtMode = Config.toggleMode === 'at'
    if (isAtMode) ats = ats.filter(item => item.qq !== getUin(e))
    if (ats.length === 0) {
      if (use === 'api3') {
        await redis.del(`CHATGPT:QQ_CONVERSATION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'bing' && (Config.toneStyle === 'Sydney' || Config.toneStyle === 'Custom')) {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
          return
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`)
        }
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: Config.toneStyle
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`SydneyUser_${e.sender.user_id}`, await conversationsCache.get(`SydneyUser_${e.sender.user_id}`))
        await conversationsCache.delete(`SydneyUser_${e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'chatglm') {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: 'chatglm_6b'
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`ChatGLMUser_${e.sender.user_id}`, await conversationsCache.get(`ChatGLMUser_${e.sender.user_id}`))
        await conversationsCache.delete(`ChatGLMUser_${e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'api') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'qwen') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_QWEN:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_QWEN:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'bing') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      } else if (use === 'browser') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BROWSER:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BROWSER:${e.sender.user_id}`)
          await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
        }
      }
    } else {
      let at = ats[0]
      let qq = at.qq
      let atUser = _.trimStart(at.text, '@')
      if (use === 'api3') {
        await redis.del(`CHATGPT:QQ_CONVERSATION:${qq}`)
        await this.reply(`${atUser}已退出TA当前的对话，TA仍可以@我进行聊天以开启新的对话`, true)
      } else if (use === 'bing' && (Config.toneStyle === 'Sydney' || Config.toneStyle === 'Custom')) {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: Config.toneStyle
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        await conversationsCache.delete(`SydneyUser_${qq}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'chatglm') {
        const conversation = {
          store: new KeyvFile({ filename: 'cache.json' }),
          namespace: 'chatglm_6b'
        }
        let Keyv
        try {
          Keyv = (await import('keyv')).default
        } catch (err) {
          await this.reply('依赖keyv未安装，请执行pnpm install keyv', true)
        }
        const conversationsCache = new Keyv(conversation)
        logger.info(`ChatGLMUser_${e.sender.user_id}`, await conversationsCache.get(`ChatGLMUser_${e.sender.user_id}`))
        await conversationsCache.delete(`ChatGLMUser_${qq}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else if (use === 'api') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'qwen') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_QWEN:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_QWEN:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'bing') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BING:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      } else if (use === 'browser') {
        let c = await redis.get(`CHATGPT:CONVERSATIONS_BROWSER:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS_BROWSER:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      }
    }
  }

  async endAllConversations (e) {
    const match = e.msg.trim().match('^#?(.*)(结束|新开|摧毁|毁灭|完结)全部对话')
    console.log(match[1])
    let use
    if (match[1] && match[1] != 'chatgpt') {
      use = correspondingValues[originalValues.indexOf(match[1])]
    } else {
      use = await redis.get('CHATGPT:USE') || 'api'
    }
    console.log(use)
    let deleted = 0
    switch (use) {
      case 'claude': {
        let cs = await redis.keys('CHATGPT:SLACK_CONVERSATION:*')
        let we = await redis.keys('CHATGPT:WRONG_EMOTION:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete slack conversation of qq: ' + cs[i])
          }
          deleted++
        }
        for (const element of we) {
          await redis.del(element)
        }
        break
      }
      case 'xh': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_XH:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete xh conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'bard': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_BARD:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete bard conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'bing': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS_BING:*')
        let we = await redis.keys('CHATGPT:WRONG_EMOTION:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete bing conversation of qq: ' + cs[i])
          }
          deleted++
        }
        for (const element of we) {
          await redis.del(element)
        }
        break
      }
      case 'api': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete api conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'api3': {
        let qcs = await redis.keys('CHATGPT:QQ_CONVERSATION:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'chatglm': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_CHATGLM:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete chatglm conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
      case 'qwen': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS_QWEN:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          // todo clean last message id
          if (Config.debug) {
            logger.info('delete qwen conversation bind: ' + qcs[i])
          }
          deleted++
        }
        break
      }
    }
    await this.reply(`结束了${deleted}个用户的对话。`, true)
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
        await e.reply('请使用#chatgpt语音换源+数字进行换源。1为vits-uma-genshin-honkai，2为微软Azure，3为voicevox')
        return
      }
    }
    await e.reply('语音转换源已切换为' + Config.ttsMode)
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
    let msg = (Version.isTrss || e.adapter === 'shamrock') ? e.msg : e.raw_message
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
        if (e.isGroup && typeof this.e.group.getMemberMap === 'function') {
          let mm = await this.e.group.getMemberMap()
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
      prompt = _.replace(e.raw_message.trimStart(), '#chat', '').trim()
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
    let speaker
    if (Config.ttsMode === 'vits-uma-genshin-honkai') {
      speaker = convertSpeaker(userSetting.ttsRole || Config.defaultTTSRole)
    } else if (Config.ttsMode === 'azure') {
      speaker = userSetting.ttsRoleAzure || Config.azureTTSSpeaker
    } else if (Config.ttsMode === 'voicevox') {
      speaker = userSetting.ttsRoleVoiceVox || Config.voicevoxTTSSpeaker
    }
    // 每个回答可以指定
    let trySplit = prompt.split('回答：')
    if (trySplit.length > 1 && speakers.indexOf(convertSpeaker(trySplit[0])) > -1) {
      useTTS = true
      speaker = convertSpeaker(trySplit[0])
      prompt = trySplit[1]
    }
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
    if (use === 'api3') {
      let randomId = uuid()
      // 队列队尾插入，开始排队
      await redis.rPush('CHATGPT:CHAT_QUEUE', [randomId])
      let confirm = await redis.get('CHATGPT:CONFIRM')
      let confirmOn = (!confirm || confirm === 'on') // confirm默认开启
      if (await redis.lIndex('CHATGPT:CHAT_QUEUE', 0) === randomId) {
        // 添加超时设置
        await redis.pSetEx('CHATGPT:CHAT_QUEUE_TIMEOUT', Config.defaultTimeoutMs, randomId)
        if (confirmOn) {
          await this.reply('我正在思考如何回复你，请稍等', true, { recallMsg: 8 })
        }
      } else {
        let length = await redis.lLen('CHATGPT:CHAT_QUEUE') - 1
        if (confirmOn) {
          await this.reply(`我正在思考如何回复你，请稍等，当前队列前方还有${length}个问题`, true, { recallMsg: 8 })
        }
        logger.info(`chatgpt队列前方还有${length}个问题。管理员可通过#清空队列来强制清除所有等待的问题。`)
        // 开始排队
        while (true) {
          if (await redis.lIndex('CHATGPT:CHAT_QUEUE', 0) === randomId) {
            await redis.pSetEx('CHATGPT:CHAT_QUEUE_TIMEOUT', Config.defaultTimeoutMs, randomId)
            break
          } else {
            // 超时检查
            if (await redis.exists('CHATGPT:CHAT_QUEUE_TIMEOUT') === 0) {
              await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
              await redis.pSetEx('CHATGPT:CHAT_QUEUE_TIMEOUT', Config.defaultTimeoutMs, await redis.lIndex('CHATGPT:CHAT_QUEUE', 0))
              if (confirmOn) {
                let length = await redis.lLen('CHATGPT:CHAT_QUEUE') - 1
                await this.reply(`问题想不明白放弃了，开始思考下一个问题，当前队列前方还有${length}个问题`, true, { recallMsg: 8 })
                logger.info(`问题超时已弹出，chatgpt队列前方还有${length}个问题。管理员可通过#清空队列来强制清除所有等待的问题。`)
              }
            }
            await delay(1500)
          }
        }
      }
    } else {
      let confirm = await redis.get('CHATGPT:CONFIRM')
      let confirmOn = (!confirm || confirm === 'on') // confirm默认开启
      if (confirmOn) {
        await this.reply('我正在思考如何回复你，请稍等', true, { recallMsg: 8 })
      }
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
    } else if (use !== 'poe' && use !== 'claude') {
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
        case 'browser': {
          key = `CHATGPT:CONVERSATIONS_BROWSER:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
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
        case 'bard': {
          key = `CHATGPT:CONVERSATIONS_BARD:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`
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
      }
      let ctime = new Date()
      previousConversation = (key ? await redis.get(key) : null) || JSON.stringify({
        sender: e.sender,
        ctime,
        utime: ctime,
        num: 0,
        messages: [{ role: 'system', content: 'You are an AI assistant that helps people find information.' }],
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

    try {
      if (Config.debug) {
        logger.mark({ conversation })
      }
      let chatMessage = await this.sendMessage(prompt, conversation, use, e)
      if (chatMessage?.noMsg) {
        return false
      }
      // 处理星火和bard图片
      if ((use === 'bard' || use === 'xh') && chatMessage?.images) {
        chatMessage.images.forEach(async element => {
          await e.reply([element.tag, segment.image(element.url)])
        })
      }
      if (use === 'api' && !chatMessage) {
        // 字数超限直接返回
        return false
      }
      if (use !== 'api3' && use !== 'poe' && use !== 'claude') {
        previousConversation.conversation = {
          conversationId: chatMessage.conversationId
        }
        if (use === 'bing' && !chatMessage.error) {
          previousConversation.clientId = chatMessage.clientId
          previousConversation.invocationId = chatMessage.invocationId
          previousConversation.parentMessageId = chatMessage.parentMessageId
          previousConversation.conversationSignature = chatMessage.conversationSignature
          if (Config.toneStyle !== 'Sydney' && Config.toneStyle !== 'Custom') {
            previousConversation.bingToken = chatMessage.bingToken
          } else {
            previousConversation.bingToken = ''
          }
        } else if (chatMessage.id) {
          previousConversation.parentMessageId = chatMessage.id
        } else if (chatMessage.message) {
          if (previousConversation.messages.length > 10) {
            previousConversation.messages.shift()
          }
          previousConversation.messages.push(chatMessage.message)
        }
        if (use === 'bard' && !chatMessage.error) {
          previousConversation.parentMessageId = chatMessage.responseID
          previousConversation.clientId = chatMessage.choiceID
          previousConversation.invocationId = chatMessage._reqID
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
      let response = chatMessage?.text?.replace('\n\n\n', '\n')
      // 过滤无法正常显示的emoji
      if (use === 'claude') response = response.replace(/:[a-zA-Z_]+:/g, '')
      let mood = 'blandness'
      if (!response) {
        await e.reply('没有任何回复', true)
        return false
      } else if (response === 'Thanks for this conversation! I\'ve reached my limit, will you hit “New topic,” please?') {
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
      const regex = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/g
      let responseUrls = response.match(regex)
      let imgUrls = []
      if (responseUrls) {
        let images = await Promise.all(responseUrls.map(link => isImage(link)))
        imgUrls = responseUrls.filter((link, index) => images[index])
      }
      for (let quote of quotemessage) {
        if (quote.imageLink) imgUrls.push(quote.imageLink)
      }
      if (useTTS && response.length <= Config.autoUsePictureThreshold) {
        // 缓存数据
        this.cacheContent(e, use, response, prompt, quotemessage, mood, chatMessage.suggestedResponses, imgUrls)
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
          await this.reply(await convertFaces(response, Config.enableRobotAt, e), e.isGroup)
          if (quotemessage.length > 0) {
            this.reply(await makeForwardMsg(this.e, quotemessage.map(msg => `${msg.text} - ${msg.url}`)))
          }
          if (Config.enableSuggestedResponses && chatMessage.suggestedResponses) {
            this.reply(`建议的回复：\n${chatMessage.suggestedResponses}`)
          }
        }
        if(ttsResponse.length <= parseInt(Config.ttsAutoFallbackThreshold)) {
            const sendable = await generateAudio(this.e, ttsResponse, emotion, emotionDegree)
            if (sendable) {
            await this.reply(sendable)
            } else {
            await this.reply('合成语音发生错误~')
            }
        }
      } else if (userSetting.usePicture || (Config.autoUsePicture && response.length > Config.autoUsePictureThreshold)) {
        // todo use next api of chatgpt to complete incomplete respoonse
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
        await this.reply(await convertFaces(response, Config.enableRobotAt, e), e.isGroup)
        if (quotemessage.length > 0) {
          this.reply(await makeForwardMsg(this.e, quotemessage.map(msg => `${msg.text} - ${msg.url}`)))
        }
        if (Config.enableSuggestedResponses && chatMessage.suggestedResponses) {
          this.reply(`建议的回复：\n${chatMessage.suggestedResponses}`)
        }
      }
      if (use === 'api3') {
        // 移除队列首位，释放锁
        await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
      }
    } catch (err) {
      logger.error(err)
      if (use !== 'bing') {
        // 异常了也要腾地方（todo 大概率后面的也会异常，要不要一口气全杀了）
        await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
      }
      if (err === 'Error: {"detail":"Conversation not found"}') {
        await this.destroyConversations(err)
        await this.reply('当前对话异常，已经清除，请重试', true, { recallMsg: e.isGroup ? 10 : 0 })
      } else {
        if (err.length < 200) {
          await this.reply(`出现错误：${err}`, true, { recallMsg: e.isGroup ? 10 : 0 })
        } else {
          // 这里是否还需要上传到缓存服务器呐？多半是代理服务器的问题，本地也修不了，应该不用吧。
          await this.renderImage(e, use, `通信异常,错误信息如下 \n \`\`\`${err?.message || err?.data?.message || (typeof (err) === 'object' ? JSON.stringify(err) : err) || '未能确认错误类型！'}\`\`\``, prompt)
        }
      }
    }
  }

  async chatgpt1 (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#chat1')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#chat1', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'api')
    return true
  }

  async chatgpt3 (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#chat3')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#chat3', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'api3')
    return true
  }

  async chatglm (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#chatglm')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#chatglm', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'chatglm')
    return true
  }

  async bing (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#bing')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#bing', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'bing')
    return true
  }

  async claude2 (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#claude2')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#claude2', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'claude2')
    return true
  }

  async claude (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#claude')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#claude', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'claude')
    return true
  }

  async qwen (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#xh')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#qwen', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'qwen')
    return true
  }

  async xh (e) {
    if (!Config.allowOtherMode) {
      return false
    }
    let ats = e.message.filter(m => m.type === 'at')
    if (!(e.atme || e.atBot) && ats.length > 0) {
      if (Config.debug) {
        logger.mark('艾特别人了，没艾特我，忽略#xh')
      }
      return false
    }
    let prompt = _.replace(e.raw_message.trimStart(), '#xh', '').trim()
    if (prompt.length === 0) {
      return false
    }
    await this.abstractChat(e, prompt, 'xh')
    return true
  }

  async cacheContent (e, use, content, prompt, quote = [], mood = '', suggest = '', imgUrls = []) {
    let cacheData = { file: '', status: '' }
    cacheData.file = randomString()
    const cacheresOption = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          content: new Buffer.from(content).toString('base64'),
          prompt: new Buffer.from(prompt).toString('base64'),
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
    const template = use !== 'bing' ? 'content/ChatGPT/index' : 'content/Bing/index'
    if (cacheData.error || cacheData.status != 200) { await this.reply(`出现错误：${cacheData.error || 'server error ' + cacheData.status}`, true) } else { await e.reply(await renderUrl(e, (Config.viewHost ? `${Config.viewHost}/` : `http://127.0.0.1:${Config.serverPort || 3321}/`) + `page/${cacheData.file}?qr=${Config.showQRCode ? 'true' : 'false'}`, { retType: Config.quoteReply ? 'base64' : '', Viewport: { width: parseInt(Config.chatViewWidth), height: parseInt(parseInt(Config.chatViewWidth) * 0.56) }, func: (parseFloat(Config.live2d) && !Config.viewHost) ? 'window.Live2d == true' : '', deviceScaleFactor: parseFloat(Config.cloudDPR) }), e.isGroup && Config.quoteReply) }
  }

  async sendMessage (prompt, conversation = {}, use, e) {
    if (!conversation) {
      conversation = {
        timeoutMs: Config.defaultTimeoutMs
      }
    }
    if (Config.debug) {
      logger.mark(`using ${use} mode`)
    }
    const userData = await getUserData(e.user_id)
    const useCast = userData.cast || {}
    switch (use) {
      case 'browser': {
        return await this.chatgptBrowserBased(prompt, conversation)
      }
      case 'bing': {
        let throttledTokens = []
        let { bingToken, allThrottled } = await getAvailableBingToken(conversation, throttledTokens)
        let cookies
        if (bingToken?.indexOf('=') > -1) {
          cookies = bingToken
        }
        let bingAIClient
        const cacheOptions = {
          namespace: Config.toneStyle,
          store: new KeyvFile({ filename: 'cache.json' })
        }
        bingAIClient = new SydneyAIClient({
          userToken: bingToken, // "_U" cookie from bing.com
          cookies,
          debug: Config.debug,
          cache: cacheOptions,
          user: e.sender.user_id,
          proxy: Config.proxy
        })
        // Sydney不实现上下文传递，删除上下文索引
        delete conversation.clientId
        delete conversation.invocationId
        delete conversation.conversationSignature
        let response
        let reply = ''
        let retry = 3
        let errorMessage = ''

        do {
          try {
            let opt = _.cloneDeep(conversation) || {}
            opt.toneStyle = Config.toneStyle
            // 如果当前没有开启对话或者当前是Sydney模式、Custom模式，则本次对话携带拓展资料
            let c = await redis.get(`CHATGPT:CONVERSATIONS_BING:${e.sender.user_id}`)
            if (!c || Config.toneStyle === 'Sydney' || Config.toneStyle === 'Custom') {
              opt.context = useCast?.bing_resource || Config.sydneyContext
            }
            // 重新拿存储的token，因为可能之前有过期的被删了
            let abtrs = await getAvailableBingToken(conversation, throttledTokens)
            if (Config.toneStyle === 'Sydney' || Config.toneStyle === 'Custom') {
              bingToken = abtrs.bingToken
              // eslint-disable-next-line no-unused-vars
              allThrottled = abtrs.allThrottled
              if (bingToken?.indexOf('=') > -1) {
                cookies = bingToken
              }
              if (!bingAIClient.opts) {
                bingAIClient.opts = {}
              }
              bingAIClient.opts.userToken = bingToken
              bingAIClient.opts.cookies = cookies
              // opt.messageType = allThrottled ? 'Chat' : 'SearchQuery'
              if (Config.enableGroupContext && e.isGroup && typeof e.group.getMemberMap === 'function') {
                try {
                  opt.groupId = e.group_id
                  opt.qq = e.sender.user_id
                  opt.nickname = e.sender.card
                  opt.groupName = e.group.name || e.group_name
                  opt.botName = e.isGroup ? (e.group.pickMember(getUin(e)).card || e.group.pickMember(getUin(e)).nickname) : e.bot.nickname
                  let master = (await getMasterQQ())[0]
                  if (master && e.group) {
                    opt.masterName = e.group.pickMember(parseInt(master)).card || e.group.pickMember(parseInt(master)).nickname
                  }
                  if (master && !e.group) {
                    opt.masterName = e.bot.getFriendList().get(parseInt(master))?.nickname
                  }
                  opt.chats = await getChatHistoryGroup(e, Config.groupContextLength)
                } catch (err) {
                  logger.warn('获取群聊聊天记录失败，本次对话不携带聊天记录', err)
                }
              }
              let toSummaryFileContent
              try {
                if (e.source) {
                  let seq = e.isGroup ? e.source.seq : e.source.time
                  if (e.adapter === 'shamrock') {
                    seq = e.source.message_id
                  }
                  let msgs = e.isGroup ? await e.group.getChatHistory(seq, 1) : await e.friend.getChatHistory(seq, 1)
                  let sourceMsg = msgs[msgs.length - 1]
                  let fileMsgElem = sourceMsg.file || sourceMsg.message.find(msg => msg.type === 'file')
                  if (fileMsgElem) {
                    toSummaryFileContent = await extractContentFromFile(fileMsgElem, e)
                  }
                }
              } catch (err) {
                logger.warn('读取文件内容出错， 忽略文件内容', err)
              }
              opt.toSummaryFileContent = toSummaryFileContent
            } else {
              // 重新创建client，因为token可能换到别的了
              if (bingToken?.indexOf('=') > -1) {
                cookies = bingToken
              }
              let bingOption = {
                userToken: abtrs.bingToken, // "_U" cookie from bing.com
                cookies,
                debug: Config.debug,
                proxy: Config.proxy,
                host: Config.sydneyReverseProxy
              }
              if (Config.proxy && Config.sydneyReverseProxy && !Config.sydneyForceUseReverse) {
                delete bingOption.host
              }
              bingAIClient = new BingAIClient(bingOption)
            }
            // 写入图片数据
            if (Config.sydneyImageRecognition) {
              const image = await getImg(e)
              opt.imageUrl = image ? image[0] : undefined
            }
            if (Config.enableGenerateContents) {
              opt.onImageCreateRequest = prompt => {
                logger.mark(`开始生成内容：${prompt}`)
                if (Config.bingAPDraw) {
                  // 调用第三方API进行绘图
                  let apDraw = new APTool()
                  apDraw.func({
                    prompt
                  }, e)
                } else {
                  let client = new BingDrawClient({
                    baseUrl: Config.sydneyReverseProxy,
                    userToken: bingToken
                  })
                  redis.set(`CHATGPT:DRAW:${e.sender.user_id}`, 'c', { EX: 30 }).then(() => {
                    try {
                      client.getImages(prompt, e)
                    } catch (err) {
                      redis.del(`CHATGPT:DRAW:${e.sender.user_id}`)
                      e.reply('绘图失败：' + err)
                    }
                  })
                }
              }
            }
            response = await bingAIClient.sendMessage(prompt, opt, (token) => {
              reply += token
            })
            if (response.details.adaptiveCards?.[0]?.body?.[0]?.text?.trim()) {
              if (response.response === undefined) {
                response.response = response.details.adaptiveCards?.[0]?.body?.[0]?.text?.trim()
              }
              response.response = response.response.replace(/\[\^[0-9]+\^\]/g, (str) => {
                return str.replace(/[/^]/g, '')
              })
              // 有了新的引用属性
              // response.quote = response.details.adaptiveCards?.[0]?.body?.[0]?.text?.replace(/\[\^[0-9]+\^\]/g, '').replace(response.response, '').split('\n')
            }
            response.suggestedResponses = response.details.suggestedResponses?.map(s => s.text).join('\n')
            // 新引用属性读取数据
            if (response.details.sourceAttributions) {
              response.quote = []
              for (let quote of response.details.sourceAttributions) {
                response.quote.push({
                  text: quote.providerDisplayName || '',
                  url: quote.seeMoreUrl,
                  imageLink: quote.imageLink || ''
                })
              }
            }
            // 如果token曾经有异常，则清除异常
            let Tokens = JSON.parse((await redis.get('CHATGPT:BING_TOKENS')) || '[]')
            const TokenIndex = Tokens?.findIndex(element => element.Token === abtrs.bingToken)
            if (TokenIndex > 0 && Tokens[TokenIndex].exception) {
              delete Tokens[TokenIndex].exception
              await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(Tokens))
            }
            errorMessage = ''
            break
          } catch (error) {
            logger.error(error)
            const message = error?.message || error?.data?.message || error || '出错了'
            const { maxConv } = error
            if (message && typeof message === 'string' && message.indexOf('CaptchaChallenge') > -1) {
              if (bingToken) {
                if (maxConv >= 20 && Config.bingCaptchaOneShotUrl) {
                  // maxConv为30说明token有效，可以通过解验证码码服务过码
                  await e.reply('出现必应验证码，尝试解决中')
                  try {
                    let captchaResolveResult = await solveCaptchaOneShot(bingToken)
                    if (captchaResolveResult?.success) {
                      await e.reply('验证码已解决')
                    } else {
                      logger.error(captchaResolveResult)
                      errorMessage = message
                      await e.reply('验证码解决失败: ' + captchaResolveResult.error)
                      retry = 0
                    }
                  } catch (err) {
                    logger.error(err)
                    await e.reply('验证码解决失败: ' + err)
                    retry = 0
                  }
                } else {
                  // 未登录用户maxConv目前为5或10，出验证码没救
                  logger.warn(`token [${bingToken}] 出现必应验证码，请前往网页版或app手动解决`)
                  errorMessage = message
                  retry = 0
                }
              } else {
                retry = 0
              }
            } else
              if (message && typeof message === 'string' && message.indexOf('限流') > -1) {
                throttledTokens.push(bingToken)
                let bingTokens = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
                const badBingToken = bingTokens.findIndex(element => element.Token === bingToken)
                const now = new Date()
                const hours = now.getHours()
                now.setHours(hours + 6)
                bingTokens[badBingToken].State = '受限'
                bingTokens[badBingToken].DisactivationTime = now
                await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingTokens))
              // 不减次数
              } else if (message && typeof message === 'string' && message.indexOf('UnauthorizedRequest') > -1) {
              // token过期了
                let bingTokens = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
                const badBingToken = bingTokens.findIndex(element => element.Token === bingToken)
                if (badBingToken > 0) {
                  // 可能是微软抽风，给三次机会
                  if (bingTokens[badBingToken]?.exception) {
                    if (bingTokens[badBingToken].exception <= 3) {
                      bingTokens[badBingToken].exception += 1
                    } else {
                      bingTokens[badBingToken].exception = 0
                      bingTokens[badBingToken].State = '过期'
                    }
                  } else {
                    bingTokens[badBingToken].exception = 1
                  }
                  await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingTokens))
                } else {
                  retry = retry - 1
                }
                errorMessage = 'UnauthorizedRequest：必应token不正确或已过期'
              // logger.warn(`token${bingToken}疑似不存在或已过期，再试试`)
              // retry = retry - 1
              } else {
                retry--
                errorMessage = message === 'Timed out waiting for response. Try enabling debug mode to see more information.' ? (reply ? `${reply}\n不行了，我的大脑过载了，处理不过来了!` : '必应的小脑瓜不好使了，不知道怎么回答！') : message
              }
          }
        } while (retry > 0)
        if (errorMessage) {
          response = response || {}
          if (errorMessage.includes('CaptchaChallenge')) {
            if (bingToken) {
              errorMessage = '出现验证码，请使用当前账户前往https://www.bing.com/chat或Edge侧边栏或移动端APP手动解除验证码'
            } else {
              errorMessage = '未配置必应账户，请绑定必应账户再使用必应模式'
            }
          }
          return {
            text: errorMessage,
            error: true
          }
        } else if (response?.response) {
          return {
            text: response?.response,
            quote: response?.quote,
            suggestedResponses: response.suggestedResponses,
            conversationId: response.conversationId,
            clientId: response.clientId,
            invocationId: response.invocationId,
            conversationSignature: response.conversationSignature,
            parentMessageId: response.apology ? conversation.parentMessageId : response.messageId,
            bingToken
          }
        } else {
          logger.debug('no message')
          return {
            noMsg: true
          }
        }
      }
      case 'api3': {
        // official without cloudflare
        let accessToken = await redis.get('CHATGPT:TOKEN')
        if (!accessToken) {
          throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
        }
        this.chatGPTApi = new OfficialChatGPTClient({
          accessToken,
          apiReverseUrl: Config.api,
          timeoutMs: 120000
        })
        let sendMessageResult = await this.chatGPTApi.sendMessage(prompt, conversation)
        // 更新最后一条prompt
        await redis.set(`CHATGPT:CONVERSATION_LAST_MESSAGE_PROMPT:${sendMessageResult.conversationId}`, prompt)
        // 更新最后一条messageId
        await redis.set(`CHATGPT:CONVERSATION_LAST_MESSAGE_ID:${sendMessageResult.conversationId}`, sendMessageResult.id)
        await redis.set(`CHATGPT:QQ_CONVERSATION:${(e.isGroup && Config.groupMerge) ? e.group_id.toString() : e.sender.user_id}`, sendMessageResult.conversationId)
        if (!conversation.conversationId) {
          // 如果是对话的创建者
          await redis.set(`CHATGPT:CONVERSATION_CREATER_ID:${sendMessageResult.conversationId}`, e.sender.user_id)
          await redis.set(`CHATGPT:CONVERSATION_CREATER_NICK_NAME:${sendMessageResult.conversationId}`, e.sender.card)
        }
        return sendMessageResult
      }
      case 'chatglm': {
        const cacheOptions = {
          namespace: 'chatglm_6b',
          store: new KeyvFile({ filename: 'cache.json' })
        }
        this.chatGPTApi = new ChatGLMClient({
          user: e.sender.user_id,
          cache: cacheOptions
        })
        let sendMessageResult = await this.chatGPTApi.sendMessage(prompt, conversation)
        return sendMessageResult
      }
      case 'poe': {
        const cookie = await redis.get('CHATGPT:POE_TOKEN')
        if (!cookie) {
          throw new Error('未绑定Poe Cookie，请使用#chatgpt设置Poe token命令绑定cookie')
        }
        let client = new PoeClient({
          quora_cookie: cookie,
          proxy: Config.proxy
        })
        await client.setCredentials()
        await client.getChatId()
        let ai = 'a2' // todo
        await client.sendMsg(ai, prompt)
        const response = await client.getResponse(ai)
        return {
          text: response.data
        }
      }
      case 'claude': {
        let client = new SlackClaudeClient({
          slackUserToken: Config.slackUserToken,
          slackChannelId: Config.slackChannelId
        })
        let conversationId = await redis.get(`CHATGPT:SLACK_CONVERSATION:${e.sender.user_id}`)
        if (!conversationId) {
          // 如果是新对话
          if (Config.slackClaudeEnableGlobalPreset && (useCast?.slack || Config.slackClaudeGlobalPreset)) {
            // 先发送设定
            let prompt = (useCast?.slack || Config.slackClaudeGlobalPreset)
            let emotion = await AzureTTS.getEmotionPrompt(e)
            if (emotion) {
              prompt = prompt + '\n' + emotion
            }
            await client.sendMessage(prompt, e)
            logger.info('claudeFirst:', prompt)
          }
        }
        let text = await client.sendMessage(prompt, e)
        return {
          text
        }
      }
      case 'claude2': {
        let { conversationId } = conversation
        let client = new ClaudeAIClient({
          organizationId: Config.claudeAIOrganizationId,
          sessionKey: Config.claudeAISessionKey,
          debug: Config.debug,
          proxy: Config.proxy
        })
        let toSummaryFileContent
        try {
          if (e.source) {
            let msgs = e.isGroup ? await e.group.getChatHistory(e.source.seq, 1) : await e.friend.getChatHistory(e.source.time, 1)
            let sourceMsg = msgs[0]
            let fileMsgElem = sourceMsg.message.find(msg => msg.type === 'file')
            if (fileMsgElem) {
              toSummaryFileContent = await extractContentFromFile(fileMsgElem, e)
            }
          }
        } catch (err) {
          logger.warn('读取文件内容出错， 忽略文件内容', err)
        }

        let attachments = []
        if (toSummaryFileContent?.content) {
          attachments.push({
            extracted_content: toSummaryFileContent.content,
            file_name: toSummaryFileContent.name,
            file_type: 'pdf',
            file_size: 200312,
            totalPages: 20
          })
          logger.info(toSummaryFileContent.content)
        }
        if (conversationId) {
          return await client.sendMessage(prompt, conversationId, attachments)
        } else {
          let conv = await client.createConversation()
          return await client.sendMessage(prompt, conv.uuid, attachments)
        }
      }
      case 'xh': {
        const cacheOptions = {
          namespace: 'xh',
          store: new KeyvFile({ filename: 'cache.json' })
        }
        const ssoSessionId = Config.xinghuoToken
        if (!ssoSessionId) {
          // throw new Error('未绑定星火token，请使用#chatgpt设置星火token命令绑定token。（获取对话页面的ssoSessionId cookie值）')
          logger.warn('未绑定星火token，请使用#chatgpt设置星火token命令绑定token。（获取对话页面的ssoSessionId cookie值）')
        }
        let client = new XinghuoClient({
          ssoSessionId,
          cache: cacheOptions
        })
        // 获取图片资源
        const image = await getImg(e)
        let response = await client.sendMessage(prompt, {
          e,
          chatId: conversation?.conversationId,
          image: image ? image[0] : undefined
        })
        return response
      }
      case 'azure': {
        let azureModel
        try {
          azureModel = await import('@azure/openai')
        } catch (error) {
          throw new Error('未安装@azure/openai包，请执行pnpm install @azure/openai安装')
        }
        let OpenAIClient = azureModel.OpenAIClient
        let AzureKeyCredential = azureModel.AzureKeyCredential
        let msg = conversation.messages
        let content = { role: 'user', content: prompt }
        msg.push(content)
        const client = new OpenAIClient(Config.azureUrl, new AzureKeyCredential(Config.azApiKey))
        const deploymentName = Config.azureDeploymentName
        const { choices } = await client.getChatCompletions(deploymentName, msg)
        let completion = choices[0].message
        return { text: completion.content, message: completion }
      }
      case 'qwen': {
        let completionParams = {
          parameters: {
            top_p: Config.qwenTopP || 0.5,
            top_k: Config.qwenTopK || 50,
            seed: Config.qwenSeed > 0 ? Config.qwenSeed : Math.floor(Math.random() * 114514),
            temperature: Config.qwenTemperature || 1,
            enable_search: !!Config.qwenEnableSearch
          }
        }
        if (Config.qwenModel) {
          completionParams.model = Config.qwenModel
        }
        const currentDate = new Date().toISOString().split('T')[0]
        async function um (message) {
          return await upsertMessage(message, 'QWEN')
        }
        async function gm (id) {
          return await getMessageById(id, 'QWEN')
        }
        let opts = {
          apiKey: Config.qwenApiKey,
          debug: false,
          upsertMessage: um,
          getMessageById: gm,
          systemMessage: `You are ${Config.assistantLabel} ${useCast?.api || Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`,
          completionParams,
          assistantLabel: Config.assistantLabel,
          fetch: newFetch
        }
        this.qwenApi = new QwenApi(opts)
        let option = {
          timeoutMs: 600000,
          completionParams
        }
        if (conversation) {
          if (!conversation.conversationId) {
            conversation.conversationId = uuid()
          }
          option = Object.assign(option, conversation)
        }
        let msg
        try {
          msg = await this.qwenApi.sendMessage(prompt, option)
        } catch (err) {
          logger.error(err)
          throw new Error(err)
        }
        return msg
      }
      case 'bard': {
        // 处理cookie
        const matchesPSID = /__Secure-1PSID=([^;]+)/.exec(Config.bardPsid)
        const matchesPSIDTS = /__Secure-1PSIDTS=([^;]+)/.exec(Config.bardPsid)
        const cookie = {
          '__Secure-1PSID': matchesPSID[1],
          '__Secure-1PSIDTS': matchesPSIDTS[1]
        }
        if (!matchesPSID[1] || !matchesPSIDTS[1]) {
          throw new Error('未绑定bard')
        }
        // 处理图片
        const image = await getImg(e)
        let imageBuff
        if (image) {
          try {
            let imgResponse = await fetch(image[0])
            if (imgResponse.ok) {
              imageBuff = await imgResponse.arrayBuffer()
            }
          } catch (error) {
            logger.warn(`错误的图片链接${image[0]}`)
          }
        }
        // 发送数据
        let bot = new Bard(cookie, {
          fetch,
          bardURL: Config.bardForceUseReverse ? Config.bardReverseProxy : 'https://bard.google.com'
        })
        let chat = await bot.createChat(conversation?.conversationId
          ? {
              conversationID: conversation.conversationId,
              responseID: conversation.parentMessageId,
              choiceID: conversation.clientId,
              _reqID: conversation.invocationId
            }
          : {})
        let response = await chat.ask(prompt, {
          image: imageBuff,
          format: Bard.JSON
        })
        return {
          conversationId: response.ids.conversationID,
          responseID: response.ids.responseID,
          choiceID: response.ids.choiceID,
          _reqID: response.ids._reqID,
          text: response.content,
          images: response.images
        }
      }
      default: {
        // openai api
        let completionParams = {}
        if (Config.model) {
          completionParams.model = Config.model
        }
        const currentDate = new Date().toISOString().split('T')[0]
        let promptPrefix = `You are ${Config.assistantLabel} ${useCast?.api || Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
        let maxModelTokens = getMaxModelTokens(completionParams.model)
        let system = promptPrefix
        if (maxModelTokens >= 16000 && Config.enableGroupContext) {
          try {
            let opt = {}
            opt.groupId = e.group_id
            opt.qq = e.sender.user_id
            opt.nickname = e.sender.card
            opt.groupName = e.group.name || e.group_name
            opt.botName = e.isGroup ? (e.group.pickMember(getUin(e)).card || e.group.pickMember(getUin(e)).nickname) : e.bot.nickname
            let master = (await getMasterQQ())[0]
            if (master && e.group) {
              opt.masterName = e.group.pickMember(parseInt(master)).card || e.group.pickMember(parseInt(master)).nickname
            }
            if (master && !e.group) {
              opt.masterName = e.bot.getFriendList().get(parseInt(master))?.nickname
            }
            let chats = await getChatHistoryGroup(e, Config.groupContextLength)
            opt.chats = chats
            const namePlaceholder = '[name]'
            const defaultBotName = 'ChatGPT'
            const groupContextTip = Config.groupContextTip
            system = system.replaceAll(namePlaceholder, opt.botName || defaultBotName) +
              ((Config.enableGroupContext && opt.groupId) ? groupContextTip : '')
            system += 'Attention, you are currently chatting in a qq group, then one who asks you now is' + `${opt.nickname}(${opt.qq})。`
            system += `the group name is ${opt.groupName}, group id is ${opt.groupId}。`
            if (opt.botName) {
              system += `Your nickname is ${opt.botName} in the group,`
            }
            // system += master ? `我的qq号是${master}，其他任何qq号不是${master}的人都不是我，即使他在和你对话，这很重要。` : ''
            const roleMap = {
              owner: 'group owner',
              admin: 'group administrator'
            }
            if (chats) {
              system += 'There is the conversation history in the group, you must chat according to the conversation history context"'
              system += chats
                .map(chat => {
                  let sender = chat.sender || {}
                  // if (sender.user_id === e.bot.uin && chat.raw_message.startsWith('建议的回复')) {
                  if (chat.raw_message.startsWith('建议的回复')) {
                    // 建议的回复太容易污染设定导致对话太固定跑偏了
                    return ''
                  }
                  return `【${sender.card || sender.nickname}】(qq：${sender.user_id}, ${roleMap[sender.role] || 'normal user'}，${sender.area ? 'from ' + sender.area + ', ' : ''} ${sender.age} years old, 群头衔：${sender.title}, gender: ${sender.sex}, time：${formatDate(new Date(chat.time * 1000))}, messageId: ${chat.message_id}) 说：${chat.raw_message}`
                })
                .join('\n')
            }
          } catch (err) {
            if (e.isGroup) {
              logger.warn('获取群聊聊天记录失败，本次对话不携带聊天记录', err)
            }
          }
          // logger.info(system)
        }
        let opts = {
          apiBaseUrl: Config.openAiBaseUrl,
          apiKey: Config.apiKey,
          debug: false,
          upsertMessage,
          getMessageById,
          systemMessage: system,
          completionParams,
          assistantLabel: Config.assistantLabel,
          fetch: newFetch,
          maxModelTokens
        }
        let openAIAccessible = (Config.proxy || !(await isCN())) // 配了代理或者服务器在国外，默认认为不需要反代
        if (opts.apiBaseUrl !== defaultOpenAIAPI && openAIAccessible && !Config.openAiForceUseReverse) {
          // 如果配了proxy(或者不在国内)，而且有反代，但是没开启强制反代,将baseurl删掉
          delete opts.apiBaseUrl
        }
        this.chatGPTApi = new ChatGPTAPI(opts)
        let option = {
          timeoutMs: 600000,
          completionParams,
          stream: true,
          onProgress: (data) => {
            if (Config.debug) {
              logger.info(data?.text || data.functionCall || data)
            }
          }
          // systemMessage: promptPrefix
        }
        option.systemMessage = system
        if (conversation) {
          if (!conversation.conversationId) {
            conversation.conversationId = uuid()
          }
          option = Object.assign(option, conversation)
        }
        if (Config.smartMode) {
          let isAdmin = e.sender.role === 'admin' || e.sender.role === 'owner'
          let sender = e.sender.user_id
          let serpTool
          switch (Config.serpSource) {
            case 'ikechan8370': {
              serpTool = new SerpIkechan8370Tool()
              break
            }
            case 'azure': {
              if (!Config.azSerpKey) {
                logger.warn('未配置bing搜索密钥，转为使用ikechan8370搜索源')
                serpTool = new SerpIkechan8370Tool()
              } else {
                serpTool = new SerpTool()
              }
              break
            }
            default: {
              serpTool = new SerpIkechan8370Tool()
            }
          }
          let fullTools = [
            new EditCardTool(),
            new QueryStarRailTool(),
            new WebsiteTool(),
            new JinyanTool(),
            new KickOutTool(),
            new WeatherTool(),
            new SendPictureTool(),
            new SendVideoTool(),
            new ImageCaptionTool(),
            new SearchVideoTool(),
            new SendAvatarTool(),
            new SerpImageTool(),
            new SearchMusicTool(),
            new SendMusicTool(),
            new SerpIkechan8370Tool(),
            new SerpTool(),
            new SendAudioMessageTool(),
            new ProcessPictureTool(),
            new APTool(),
            new HandleMessageMsgTool(),
            new QueryUserinfoTool(),
            new EliMusicTool(),
            new EliMovieTool(),
            new SendMessageToSpecificGroupOrUserTool(),
            new SendDiceTool(),
            new QueryGenshinTool(),
            new SetTitleTool()
          ]
          // todo 3.0再重构tool的插拔和管理
          let tools = [
            new SendAvatarTool(),
            new SendDiceTool(),
            new SendMessageToSpecificGroupOrUserTool(),
            // new EditCardTool(),
            new QueryStarRailTool(),
            new QueryGenshinTool(),
            new ProcessPictureTool(),
            new WebsiteTool(),
            // new JinyanTool(),
            // new KickOutTool(),
            new WeatherTool(),
            new SendPictureTool(),
            new SendAudioMessageTool(),
            new APTool(),
            // new HandleMessageMsgTool(),
            serpTool,
            new QueryUserinfoTool()
          ]
          try {
            await import('../../avocado-plugin/apps/avocado.js')
            tools.push(...[new EliMusicTool(), new EliMovieTool()])
          } catch (err) {
            tools.push(...[new SendMusicTool(), new SearchMusicTool()])
            logger.mark(logger.green('【ChatGPT-Plugin】插件avocado-plugin未安装') + '，安装后可查看最近热映电影与体验可玩性更高的点歌工具。\n可前往 https://github.com/Qz-Sean/avocado-plugin 获取')
          }
          if (e.isGroup) {
            let botInfo = await e.bot.getGroupMemberInfo(e.group_id, getUin(e), true)
            if (botInfo.role !== 'member') {
              // 管理员才给这些工具
              tools.push(...[new EditCardTool(), new JinyanTool(), new KickOutTool(), new HandleMessageMsgTool(), new SetTitleTool()])
              // 用于撤回和加精的id
              if (e.source?.seq) {
                let source = (await e.group.getChatHistory(e.source?.seq, 1)).pop()
                option.systemMessage += `\nthe last message is replying to ${source.message_id}"\n`
              } else {
                option.systemMessage += `\nthe last message id is ${e.message_id}. `
              }
            }
          }
          let img = await getImg(e)
          if (img?.length > 0 && Config.extraUrl) {
            tools.push(new ImageCaptionTool())
            tools.push(new ProcessPictureTool())
            prompt += `\nthe url of the picture(s) above: ${img.join(', ')}`
          } else {
            tools.push(new SerpImageTool())
            tools.push(...[new SearchVideoTool(),
              new SendVideoTool()])
          }
          let funcMap = {}
          let fullFuncMap = {}
          tools.forEach(tool => {
            funcMap[tool.name] = {
              exec: tool.func,
              function: tool.function()
            }
          })
          fullTools.forEach(tool => {
            fullFuncMap[tool.name] = {
              exec: tool.func,
              function: tool.function()
            }
          })
          if (!option.completionParams) {
            option.completionParams = {}
          }
          option.completionParams.functions = Object.keys(funcMap).map(k => funcMap[k].function)
          let msg
          try {
            msg = await this.chatGPTApi.sendMessage(prompt, option)
            logger.info(msg)
            while (msg.functionCall) {
              if (msg.text) {
                await e.reply(msg.text.replace('\n\n\n', '\n'))
              }
              let { name, arguments: args } = msg.functionCall
              args = JSON.parse(args)
              // 感觉换成targetGroupIdOrUserQQNumber这种表意比较清楚的变量名，效果会好一丢丢
              if (!args.groupId) {
                args.groupId = e.group_id + '' || e.sender.user_id + ''
              }
              try {
                parseInt(args.groupId)
              } catch (err) {
                args.groupId = e.group_id + '' || e.sender.user_id + ''
              }
              let functionResult = await fullFuncMap[name.trim()].exec(Object.assign({ isAdmin, sender }, args), e)
              logger.mark(`function ${name} execution result: ${functionResult}`)
              option.parentMessageId = msg.id
              option.name = name
              // 不然普通用户可能会被openai限速
              await delay(300)
              msg = await this.chatGPTApi.sendMessage(functionResult, option, 'function')
              logger.info(msg)
            }
          } catch (err) {
            if (err.message?.indexOf('context_length_exceeded') > 0) {
              logger.warn(err)
              await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
              await redis.del(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
              await e.reply('字数超限啦，将为您自动结束本次对话。')
              return null
            } else {
              logger.error(err)
              throw new Error(err)
            }
          }
          return msg
        } else {
          let msg
          try {
            msg = await this.chatGPTApi.sendMessage(prompt, option)
          } catch (err) {
            if (err.message?.indexOf('context_length_exceeded') > 0) {
              logger.warn(err)
              await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
              await redis.del(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
              await e.reply('字数超限啦，将为您自动结束本次对话。')
              return null
            } else {
              logger.error(err)
              throw new Error(err)
            }
          }
          return msg
        }
      }
    }
  }

  async newClaudeConversation (e) {
    let presetName = e.msg.replace(/^#claude开启新对话/, '').trim()
    let client = new SlackClaudeClient({
      slackUserToken: Config.slackUserToken,
      slackChannelId: Config.slackChannelId
    })
    let response
    if (!presetName || presetName === '空' || presetName === '无设定') {
      let conversationId = await redis.get(`CHATGPT:SLACK_CONVERSATION:${e.sender.user_id}`)
      if (conversationId) {
        // 如果有对话进行中，先删除
        logger.info('开启Claude新对话，但旧对话未结束，自动结束上一次对话')
        await redis.del(`CHATGPT:SLACK_CONVERSATION:${e.sender.user_id}`)
        await redis.del(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
      }
      response = await client.sendMessage('', e)
      await e.reply(response, true)
    } else {
      let preset = getPromptByName(presetName)
      if (!preset) {
        await e.reply('没有这个设定', true)
      } else {
        let conversationId = await redis.get(`CHATGPT:SLACK_CONVERSATION:${e.sender.user_id}`)
        if (conversationId) {
          // 如果有对话进行中，先删除
          logger.info('开启Claude新对话，但旧对话未结束，自动结束上一次对话')
          await redis.del(`CHATGPT:SLACK_CONVERSATION:${e.sender.user_id}`)
          await redis.del(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
        }
        logger.info('send preset: ' + preset.content)
        response = await client.sendMessage(preset.content, e) +
          await client.sendMessage(await AzureTTS.getEmotionPrompt(e), e)
        await e.reply(response, true)
      }
    }
    return true
  }

  async newxhBotConversation (e) {
    let botId = e.msg.replace(/^#星火助手/, '').trim()
    if (Config.xhmode != 'web') {
      await e.reply('星火助手仅支持体验版使用', true)
      return true
    }
    if (!botId) {
      await e.reply('无效助手id', true)
    } else {
      const ssoSessionId = Config.xinghuoToken
      if (!ssoSessionId) {
        await e.reply('未绑定星火token，请使用#chatgpt设置星火token命令绑定token', true)
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
            await e.reply(`成功创建助手对话\n助手名称：${botInfo.data.bot_name}\n助手描述：${botInfo.data.bot_desc}`, true)
          } else {
            await e.reply(`创建助手对话失败,${botInfo.desc}`, true)
          }
        } else {
          await e.reply('创建助手对话失败,服务器异常', true)
        }
      } catch (error) {
        await e.reply(`创建助手对话失败 ${error}`, true)
      }
    }
    return true
  }

  async searchxhBot (e) {
    let searchBot = e.msg.replace(/^#星火(搜索|查找)助手/, '').trim()
    const ssoSessionId = Config.xinghuoToken
    if (!ssoSessionId) {
      await e.reply('未绑定星火token，请使用#chatgpt设置星火token命令绑定token', true)
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
        await e.reply('未查到相关助手', true)
      }
    } else {
      await e.reply('搜索助手失败', true)
    }
  }

  async emptyQueue (e) {
    await redis.lTrim('CHATGPT:CHAT_QUEUE', 1, 0)
    await this.reply('已清空当前等待队列')
  }

  async removeQueueFirst (e) {
    let uid = await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
    if (!uid) {
      await this.reply('当前等待队列为空')
    } else {
      await this.reply('已移出等待队列首位: ' + uid)
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
      await render(e, 'chatgpt-plugin', 'conversation/chatgpt', { conversations, version })
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
    let { hard_limit_usd: hardLimit, access_until: expiresAt } = subscription
    const { end, start } = getDates()
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
   * #chatgpt
   * @param prompt 问题
   * @param conversation 对话
   */
  async chatgptBrowserBased (prompt, conversation) {
    let option = { markdown: true }
    if (Config['2captchaToken']) {
      option.captchaToken = Config['2captchaToken']
    }
    // option.debug = true
    option.email = Config.username
    option.password = Config.password
    this.chatGPTApi = new ChatGPTPuppeteer(option)
    logger.info(`chatgpt prompt: ${prompt}`)
    let sendMessageOption = {
      timeoutMs: 120000
    }
    if (conversation) {
      sendMessageOption = Object.assign(sendMessageOption, conversation)
    }
    return await this.chatGPTApi.sendMessage(prompt, sendMessageOption)
  }
}

async function getAvailableBingToken (conversation, throttled = []) {
  let allThrottled = false
  if (!await redis.get('CHATGPT:BING_TOKENS')) {
    return {
      bingToken: null,
      allThrottled
    }
    // throw new Error('未绑定Bing Cookie，请使用#chatgpt设置必应token命令绑定Bing Cookie')
  }

  let bingToken = ''
  let bingTokens = JSON.parse(await redis.get('CHATGPT:BING_TOKENS'))
  const normal = bingTokens.filter(element => element.State === '正常')
  const restricted = bingTokens.filter(element => element.State === '受限')

  // 判断受限的token是否已经可以解除
  for (const restrictedToken of restricted) {
    const now = new Date()
    const tk = new Date(restrictedToken.DisactivationTime)
    if (tk <= now) {
      const index = bingTokens.findIndex(element => element.Token === restrictedToken.Token)
      bingTokens[index].Usage = 0
      bingTokens[index].State = '正常'
    }
  }
  if (normal.length > 0) {
    const minElement = normal.reduce((min, current) => {
      return current.Usage < min.Usage ? current : min
    })
    bingToken = minElement.Token
  } else if (restricted.length > 0 && restricted.some(x => throttled.includes(x.Token))) {
    allThrottled = true
    const minElement = restricted.reduce((min, current) => {
      return current.Usage < min.Usage ? current : min
    })
    bingToken = minElement.Token
  } else {
    // throw new Error('全部Token均已失效，暂时无法使用')
    return {
      bingToken: null,
      allThrottled
    }
  }
  if (Config.toneStyle != 'Sydney' && Config.toneStyle != 'Custom') {
    // bing 下，需要保证同一对话使用同一账号的token
    if (bingTokens.findIndex(element => element.Token === conversation.bingToken) > -1) {
      bingToken = conversation.bingToken
    }
  }
  // 记录使用情况
  const index = bingTokens.findIndex(element => element.Token === bingToken)
  bingTokens[index].Usage += 1
  await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingTokens))
  return {
    bingToken,
    allThrottled
  }
}
