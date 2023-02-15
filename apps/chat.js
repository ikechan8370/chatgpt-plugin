import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import { Config } from '../config/index.js'
import showdown from 'showdown'
import mjAPI from 'mathjax-node'
import { uuid } from 'oicq/lib/common.js'
import delay from 'delay'
import { ChatGPTAPI } from 'chatgpt'
import { ChatGPTClient, BingAIClient } from '@waylaidwanderer/chatgpt-api'
import { getMessageById, makeForwardMsg, tryTimes, upsertMessage, pTimeout } from '../utils/common.js'
import { ChatGPTPuppeteer } from '../utils/browser.js'
import { KeyvFile } from 'keyv-file'
import { OfficialChatGPTClient } from '../utils/message.js'
// import puppeteer from '../utils/browser.js'
// import showdownKatex from 'showdown-katex'
const blockWords = Config.blockWords
const converter = new showdown.Converter({
  extensions: [
    // showdownKatex({
    //   delimiters: [
    //     { left: '$$', right: '$$', display: false },
    //     { left: '$', right: '$', display: false, inline: true },
    //     { left: '\\(', right: '\\)', display: false },
    //     { left: '\\[', right: '\\]', display: true }
    //   ]
    // })
  ]
})
/**
 * 每个对话保留的时长。单个对话内ai是保留上下文的。超时后销毁对话，再次对话创建新的对话。
 * 单位：秒
 * @type {number}
 */
const CONVERSATION_PRESERVE_TIME = Config.conversationPreserveTime
const defaultPropmtPrefix = 'You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short.'
mjAPI.config({
  MathJax: {
    // traditional MathJax configuration
  }
})
mjAPI.start()

export class chatgpt extends plugin {
  constructor () {
    let toggleMode = Config.toggleMode
    super({
      /** 功能名称 */
      name: 'chatgpt',
      /** 功能描述 */
      dsc: 'chatgpt from openai',
      /** https://oicqjs.github.io/oicq/#events */
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: 15000,
      rule: [
        {
          /** 命令正则匹配 */
          reg: toggleMode === 'at' ? '^[^#][sS]*' : '#chat[^gpt][sS]*',
          /** 执行方法 */
          fnc: 'chatgpt'
        },
        {
          reg: '#chatgpt对话列表',
          fnc: 'getConversations',
          permission: 'master'
        },
        {
          reg: '^#结束对话([sS]*)',
          fnc: 'destroyConversations'
        },
        // {
        //   reg: '#chatgpt帮助',
        //   fnc: 'help'
        // },
        {
          reg: '#chatgpt图片模式',
          fnc: 'switch2Picture'
        },
        {
          reg: '#chatgpt文本模式',
          fnc: 'switch2Text'
        },
        {
          reg: '#清空(chat)?队列',
          fnc: 'emptyQueue',
          permission: 'master'
        },
        {
          reg: '#移出(chat)?队列首位',
          fnc: 'removeQueueFirst',
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
    let ats = e.message.filter(m => m.type === 'at')
    if (ats.length === 0) {
      let c = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
      if (!c) {
        await this.reply('当前没有开启对话', true)
      } else {
        await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
        await this.reply('已结束当前对话，请@我进行聊天以开启新的对话', true)
      }
    } else {
      let at = ats[0]
      let qq = at.qq
      let atUser = _.trimStart(at.text, '@')
      let c = await redis.get(`CHATGPT:CONVERSATIONS:${qq}`)
      if (!c) {
        await this.reply(`当前${atUser}没有开启对话`, true)
      } else {
        await redis.del(`CHATGPT:CONVERSATIONS:${qq}`)
        await this.reply(`已结束${atUser}的对话，他仍可以@我进行聊天以开启新的对话`, true)
      }
    }
  }

  async help (e) {
    let response = 'chatgpt-plugin使用帮助文字版\n' +
        '@我+聊天内容: 发起对话与AI进行聊天\n' +
        '#chatgpt对话列表: 查看当前发起的对话\n' +
        '#结束对话: 结束自己或@用户的对话\n' +
        '#chatgpt帮助: 查看本帮助\n' +
        '源代码：https://github.com/ikechan8370/chatgpt-plugin'
    await this.reply(response)
  }

  async switch2Picture (e) {
    let userSetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
    if (!userSetting) {
      userSetting = { usePicture: true }
    } else {
      userSetting = JSON.parse(userSetting)
    }
    userSetting.usePicture = true
    await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
    await this.reply('ChatGPT回复已转换为图片模式')
  }

  async switch2Text (e) {
    let userSetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
    if (!userSetting) {
      userSetting = { usePicture: false }
    } else {
      userSetting = JSON.parse(userSetting)
    }
    userSetting.usePicture = false
    await redis.set(`CHATGPT:USER:${e.sender.user_id}`, JSON.stringify(userSetting))
    await this.reply('ChatGPT回复已转换为文字模式')
  }

  /**
   * #chatgpt
   * @param e oicq传递的事件参数e
   */
  async chatgpt (e) {
    let prompt
    if (this.toggleMode === 'at') {
      if (!e.msg || e.msg.startsWith('#')) {
        return false
      }
      if (e.isGroup && !e.atme) {
        return false
      }
      prompt = e.msg.trim()
    } else {
      prompt = _.trimStart(e.msg.trimStart(), '#chat').trim()
      if (prompt.length === 0) {
        return false
      }
    }
    const use = await redis.get('CHATGPT:USE')
    if (use != 'bing') {
      let randomId = uuid()
      // 队列队尾插入，开始排队
      await redis.rPush('CHATGPT:CHAT_QUEUE', [randomId])
      let confirm = await redis.get('CHATGPT:CONFIRM')
      let confirmOn = confirm === 'on'
      if (await redis.lIndex('CHATGPT:CHAT_QUEUE', 0) === randomId) {
        if (confirmOn) {
          await this.reply('我正在思考如何回复你，请稍等', true, { recallMsg: 8 })
        }
      } else {
        if (confirmOn) {
          let length = await redis.lLen('CHATGPT:CHAT_QUEUE') - 1
          await this.reply(`我正在思考如何回复你，请稍等，当前队列前方还有${length}个问题`, true, { recallMsg: 8 })
          logger.info(`chatgpt队列前方还有${length}个问题。管理员可通过#清空队列来强制清除所有等待的问题。`)
        }
        // 开始排队
        while (true) {
          if (await redis.lIndex('CHATGPT:CHAT_QUEUE', 0) === randomId) {
            break
          } else {
            await delay(1500)
          }
        }
      }
    }
    logger.info(`chatgpt prompt: ${prompt}`)
    // try {
    //   await this.chatGPTApi.init()
    // } catch (e) {
    //   await this.reply('chatgpt初始化出错：' + e.msg, true)
    // }
    let previousConversation = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
    let conversation = {}
    if (!previousConversation) {
      let ctime = new Date()
      previousConversation = {
        sender: e.sender,
        ctime,
        utime: ctime,
        num: 0
      }
      // await redis.set(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`, JSON.stringify(previousConversation), { EX: CONVERSATION_PRESERVE_TIME })
    } else {
      previousConversation = JSON.parse(previousConversation)
      conversation = {
        conversationId: previousConversation.conversation.conversationId,
        parentMessageId: previousConversation.conversation.parentMessageId,
        clientId: previousConversation.clientId,
        invocationId: previousConversation.invocationId,
        conversationSignature: previousConversation.conversationSignature
      }
    }
    try {
      if (Config.debug) {
        logger.mark(conversation)
      }
      let chatMessage = await this.sendMessage(prompt, conversation, use)
      previousConversation.conversation = {
        conversationId: chatMessage.conversationId
      }
      if (use === 'bing') {
        previousConversation.clientId = chatMessage.clientId
        previousConversation.invocationId = chatMessage.invocationId
        previousConversation.conversationSignature = chatMessage.conversationSignature
      } else {
        // 或许这样切换回来不会404？
        previousConversation.conversation.parentMessageId = chatMessage.id
      }
      console.log(chatMessage)
      let response = chatMessage?.text
      previousConversation.num = previousConversation.num + 1
      await redis.set(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`, JSON.stringify(previousConversation), CONVERSATION_PRESERVE_TIME > 0 ? { EX: CONVERSATION_PRESERVE_TIME } : {})
      // 检索是否有屏蔽词
      const blockWord = blockWords.find(word => response.toLowerCase().includes(word.toLowerCase()))
      if (blockWord) {
        await this.reply('返回内容存在敏感词，我不想回答你', true)
        return false
      }
      let userSetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
      if (userSetting) {
        userSetting = JSON.parse(userSetting)
      } else {
        userSetting = {
          usePicture: false
        }
      }
      if (userSetting.usePicture) {
        let endTokens = ['.', '。', '……', '!', '！', ']', ')', '）', '】', '?', '？', '~', '"', "'"]
        let maxTries = 3
        while (maxTries >= 0 && !endTokens.find(token => response.trimEnd().endsWith(token))) {
          maxTries--
          // while (!response.trimEnd().endsWith('.') && !response.trimEnd().endsWith('。') && !response.trimEnd().endsWith('……') &&
          //     !response.trimEnd().endsWith('！') && !response.trimEnd().endsWith('!') && !response.trimEnd().endsWith(']') && !response.trimEnd().endsWith('】')
          // ) {
          await this.reply('内容有点多，我正在奋笔疾书，请再等一会', true, { recallMsg: 5 })
          let responseAppend = await this.sendMessage('Continue', conversation, use)
          previousConversation.conversation = {
            conversationId: responseAppend.conversationId,
            parentMessageId: responseAppend.id
          }
          let responseAppendText = responseAppend?.text
          await redis.set(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`, JSON.stringify(previousConversation), CONVERSATION_PRESERVE_TIME > 0 ? { EX: CONVERSATION_PRESERVE_TIME } : {})
          // console.log(responseAppend)
          // 检索是否有屏蔽词
          const blockWord = blockWords.find(word => responseAppendText.toLowerCase().includes(word.toLowerCase()))
          if (blockWord) {
            await this.reply('返回内容存在敏感词，我不想回答你', true)
            return
          }
          if (responseAppendText.indexOf('conversation') > -1 || responseAppendText.startsWith("I'm sorry")) {
            logger.warn('chatgpt might forget what it had said')
            break
          }

          response = response + responseAppendText
        }
        // logger.info(response)
        // markdown转为html
        // todo部分数学公式可能还有问题
        let converted = converter.makeHtml(response)

        /** 最后回复消息 */
        await e.runtime.render('chatgpt-plugin', 'content/index', { content: converted, prompt, senderName: e.sender.nickname })
      } else {
        await this.reply(`${response}`, e.isGroup)
        if (chatMessage?.quote) {
          let quotemessage = []
          chatMessage.quote.forEach(function (item, index) {
            if (item != '') {
              quotemessage.push(`${item}\n`)
            }
          })
          if(quotemessage.length > 0)
          this.reply(await makeForwardMsg(this.e, quotemessage))
        }
      }
      if (use !== 'bing') {
        // 移除队列首位，释放锁
        await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
      }    
    } catch (e) {
      logger.error(e)
      if (use !== 'bing') {
        // 异常了也要腾地方（todo 大概率后面的也会异常，要不要一口气全杀了）
        await redis.lPop('CHATGPT:CHAT_QUEUE', 0)
      }
      await this.reply(`通信异常，请稍后重试：${e}`, true, { recallMsg: e.isGroup ? 10 : 0 })
    }
  }

  async sendMessage (prompt, conversation = {}, use) {
    if (!conversation) {
      conversation = {
        timeoutMs: Config.defaultTimeoutMs
      }
    }
    // console.log(use)
    if (use === 'browser') {
      return await this.chatgptBrowserBased(prompt, conversation)
    } else if (use === 'apiReverse') {
      const currentDate = new Date().toISOString().split('T')[0]
      let promptPrefix = `You are ${Config.assistantLabel}, a large language model trained by OpenAI. ${Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
      const clientOptions = {
        // (Optional) Support for a reverse proxy for the completions endpoint (private API server).
        // Warning: This will expose your `openaiApiKey` to a third-party. Consider the risks before using this.
        reverseProxyUrl: Config.reverseProxy || 'https://chatgpt.pawan.krd/api/completions',
        // (Optional) Parameters as described in https://platform.openai.com/docs/api-reference/completions
        modelOptions: {
          // You can override the model name and any other parameters here.
          model: Config.plus ? 'text-davinci-002-render-paid' : 'text-davinci-002-render'
        },
        // (Optional) Set custom instructions instead of "You are ChatGPT...".
        promptPrefix,
        // (Optional) Set a custom name for the user
        // userLabel: 'User',
        // (Optional) Set a custom name for ChatGPT
        chatGptLabel: Config.assistantLabel,
        // (Optional) Set to true to enable `console.debug()` logging
        debug: Config.debug
      }
      const cacheOptions = {
        // Options for the Keyv cache, see https://www.npmjs.com/package/keyv
        // This is used for storing conversations, and supports additional drivers (conversations are stored in memory by default)
        // For example, to use a JSON file (`npm i keyv-file`) as a database:
        store: new KeyvFile({ filename: 'cache.json' })
      }
      let accessToken = await redis.get('CHATGPT:TOKEN')
      if (!accessToken) {
        throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
      }
      // console.log(accessToken)
      this.chatGPTApi = new ChatGPTClient(accessToken, clientOptions, cacheOptions)
      let response = await tryTimes(async () => await this.chatGPTApi.sendMessage(prompt, conversation || {}), 1)
      return {
        text: response.response,
        conversationId: response.conversationId,
        id: response.messageId,
        parentMessageId: conversation?.parentMessageId
      }
    } else if (use === 'bing') {
      let bingToken = await redis.get('CHATGPT:BING_TOKEN')
      if (!bingToken) {
        throw new Error('未绑定Bing Cookie，请使用#chatgpt设置必应token命令绑定Bing Cookie')
      }
      const bingAIClient = new BingAIClient({
        userToken: bingToken, // "_U" cookie from bing.com
        debug: Config.debug
      })
      let response
      try {
        const responseP = new Promise(
          async (resolve, reject) => {
            let bingResponse = await bingAIClient.sendMessage(prompt, conversation || {},(token) => {
                console.debug(token);
            })
            return resolve(bingResponse)
          })
        response = await pTimeout(responseP, {
          milliseconds: Config.bingTimeoutMs,
          message: 'Bing timed out waiting for response'
        })
        if (response.details.adaptiveCards?.[0]?.body?.[0]?.text?.trim()) {
          response.response = response.response.replace(/\[\^[0-9]+\^\]/g, (str) => {
            return str.replace(/[/^]/g, '')
          })
          response.quote = response.details.adaptiveCards?.[0]?.body?.[0]?.text?.replace(/\[\^[0-9]+\^\]/g, '').replace(response.response, '').split('\n')
        }
      } catch (error) {
        const code = error?.data?.code || 503
        if (code === 503) {
          logger.error(error)
        }
        console.error(error)
        const message = error?.message || error?.data?.message || '与Bing通信时出错.'
        return {
          text: message
        }
      }
      return {
        text: response.response,
        quote: response.quote,
        conversationId: response.conversationId,
        clientId: response.clientId,
        invocationId: response.invocationId,
        conversationSignature: response.conversationSignature
      }
    } else if (use === 'api3') {
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
      return await this.chatGPTApi.sendMessage(prompt, conversation)
    } else {
      let completionParams = {}
      if (Config.model) {
        completionParams.model = Config.model
      }
      this.chatGPTApi = new ChatGPTAPI({
        apiKey: Config.apiKey,
        debug: false,
        upsertMessage,
        getMessageById,
        completionParams,
        assistantLabel: Config.assistantLabel
      })
      const currentDate = new Date().toISOString().split('T')[0]
      let promptPrefix = `You are ${Config.assistantLabel}, a large language model trained by OpenAI. ${Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
      let option = {
        timeoutMs: 120000,
        promptPrefix
      }
      if (conversation) {
        option = Object.assign(option, conversation)
      }
      return await tryTimes(async () => await this.chatGPTApi.sendMessage(prompt, option), 5)
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
