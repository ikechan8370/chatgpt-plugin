import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import { Config } from '../utils/config.js'
import { v4 as uuid } from 'uuid'
import delay from 'delay'
import { ChatGPTAPI } from 'chatgpt'
import { ChatGPTClient, BingAIClient } from '@waylaidwanderer/chatgpt-api'
import { render, getMessageById, makeForwardMsg, tryTimes, upsertMessage, randomString } from '../utils/common.js'
import { ChatGPTPuppeteer } from '../utils/browser.js'
import { KeyvFile } from 'keyv-file'
import { OfficialChatGPTClient } from '../utils/message.js'
import fetch from 'node-fetch'
import { deleteConversation, getConversations, getLatestMessageIdByConversationId } from '../utils/conversation.js'
let version = Config.version
let proxy
if (Config.proxy) {
  try {
    proxy = (await import('https-proxy-agent')).default
  } catch (e) {
    console.warn('未安装https-proxy-agent，请在插件目录下执行pnpm add https-proxy-agent')
  }
}

/**
 * 每个对话保留的时长。单个对话内ai是保留上下文的。超时后销毁对话，再次对话创建新的对话。
 * 单位：秒
 * @type {number}
 *
 * 这里使用动态数据获取，以便于锅巴动态更新数据
 */
// const CONVERSATION_PRESERVE_TIME = Config.conversationPreserveTime
const defaultPropmtPrefix = 'You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short.'
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
          fnc: 'getAllConversations',
          permission: 'master'
        },
        {
          reg: '^#结束对话([sS]*)',
          fnc: 'destroyConversations'
        },
        {
          reg: '^#结束全部对话$',
          fnc: 'endAllConversations'
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
          reg: '^#chatgpt加入对话',
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
    let use = await redis.get('CHATGPT:USE')
    if (ats.length === 0) {
      if (use === 'api3') {
        await redis.del(`CHATGPT:QQ_CONVERSATION:${e.sender.user_id}`)
        await this.reply('已退出当前对话，该对话仍然保留。请@我进行聊天以开启新的对话', true)
      } else {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
        if (!c) {
          await this.reply('当前没有开启对话', true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
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
      } else {
        let c = await redis.get(`CHATGPT:CONVERSATIONS:${qq}`)
        if (!c) {
          await this.reply(`当前${atUser}没有开启对话`, true)
        } else {
          await redis.del(`CHATGPT:CONVERSATIONS:${qq}`)
          await this.reply(`已结束${atUser}的对话，TA仍可以@我进行聊天以开启新的对话`, true)
        }
      }
    }
  }

  async endAllConversations (e) {
    let use = await redis.get('CHATGPT:USE') || 'api'
    let deleted = 0
    switch (use) {
      case 'bing':
      case 'api': {
        let cs = await redis.keys('CHATGPT:CONVERSATIONS:*')
        for (let i = 0; i < cs.length; i++) {
          await redis.del(cs[i])
          if (Config.debug) {
            logger.info('delete conversation of qq: ' + cs[i])
          }
          deleted++
        }
        break
      }
      case 'api3': {
        let qcs = await redis.keys('CHATGPT:CONVERSATIONS:*')
        for (let i = 0; i < qcs.length; i++) {
          await redis.del(qcs[i])
          if (Config.debug) {
            logger.info('delete conversation bind: ' + qcs[i])
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
    if (ats.length === 0 || (ats.length === 1 && e.atme)) {
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
    if (Config.imgOcr) {
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
          for (let val of reply) {
            if (val.type === 'image') {
              e.img = [val.url]
              break
            }
          }
        }
      }
      if (e.img) {
        try {
          let imgOcrText = ''
          for (let i in e.img) {
            const imgorc = await Bot.imageOcr(e.img[i])
            if (imgorc.language === 'zh' || imgorc.language === 'en') {
              for (let text of imgorc.wordslist) {
                imgOcrText += `${text.words}  \n`
              }
            }
          }
          prompt = imgOcrText + prompt
        } catch (err) {}
      }
    }
    // 检索是否有屏蔽词
    const promtBlockWord = Config.promptBlockWords.find(word => prompt.toLowerCase().includes(word.toLowerCase()))
    if (promtBlockWord) {
      await this.reply('主人不让我回答你这种问题，真是抱歉了呢', true)
      return false
    }
    const use = await redis.get('CHATGPT:USE') || 'api'
    if (use === 'api3') {
      let randomId = uuid()
      // 队列队尾插入，开始排队
      await redis.rPush('CHATGPT:CHAT_QUEUE', [randomId])
      let confirm = await redis.get('CHATGPT:CONFIRM')
      let confirmOn = (!confirm || confirm === 'on') && Config.thinkingTips
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
    }
    logger.info(`chatgpt prompt: ${prompt}`)
    // try {
    //   await this.chatGPTApi.init()
    // } catch (e) {
    //   await this.reply('chatgpt初始化出错：' + e.msg, true)
    // }
    let previousConversation
    let conversation = {}
    if (use === 'api3') {
      // api3 支持对话穿插，因此不按照qq号来进行判断了
      let conversationId = await redis.get(`CHATGPT:QQ_CONVERSATION:${e.sender.user_id}`)
      if (conversationId) {
        let lastMessageId = await redis.get(`CHATGPT:CONVERSATION_LAST_MESSAGE_ID:${conversationId}`)
        if (!lastMessageId) {
          lastMessageId = await getLatestMessageIdByConversationId(conversationId, newFetch)
        }
        //        let lastMessagePrompt = await redis.get(`CHATGPT:CONVERSATION_LAST_MESSAGE_PROMPT:${conversationId}`)
        //        let conversationCreateTime = await redis.get(`CHATGPT:CONVERSATION_CREATE_TIME:${conversationId}`)
        //        let conversationLength = await redis.get(`CHATGPT:CONVERSATION_LENGTH:${conversationId}`)
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
      previousConversation = await redis.get(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
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
    }

    try {
      if (Config.debug) {
        logger.mark(conversation)
      }
      let chatMessage = await this.sendMessage(prompt, conversation, use, e)
      if (use !== 'api3') {
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
        previousConversation.num = previousConversation.num + 1
        await redis.set(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`, JSON.stringify(previousConversation), Config.conversationPreserveTime > 0 ? { EX: Config.conversationPreserveTime } : {})
      }
      let response = chatMessage?.text
      // 检索是否有屏蔽词
      const blockWord = Config.blockWords.find(word => response.toLowerCase().includes(word.toLowerCase()))
      if (blockWord) {
        await this.reply('返回内容存在敏感词，我不想回答你', true)
        return false
      }
      let userSetting = await redis.get(`CHATGPT:USER:${e.sender.user_id}`)
      if (userSetting) {
        userSetting = JSON.parse(userSetting)
      } else {
        userSetting = {
          usePicture: Config.defaultUsePicture
        }
      }
      let quotemessage = []
      if (chatMessage?.quote) {
        chatMessage.quote.forEach(function (item, index) {
          if (item.trim() !== '') {
            quotemessage.push(item)
          }
        })
      }
      if (userSetting.usePicture || (Config.autoUsePicture && response.length > Config.autoUsePictureThreshold)) {
        // todo use next api of chatgpt to complete incomplete respoonse
        try {
          await this.renderImage(e, use !== 'bing' ? 'content/ChatGPT/index' : 'content/Bing/index', response, prompt, quotemessage, Config.showQRCode)
        } catch (err) {
          logger.warn('error happened while uploading content to the cache server. QR Code will not be showed in this picture.')
          logger.error(err)
          await this.renderImage(e, use !== 'bing' ? 'content/ChatGPT/index' : 'content/Bing/index', response, prompt)
        }
      } else {
        await this.reply(`${response}`, e.isGroup)
        if (quotemessage.length > 0) {
          this.reply(await makeForwardMsg(this.e, quotemessage))
        }
      }
      if (use !== 'bing') {
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
          await this.reply(`通信异常，请稍后重试：${err}`, true, { recallMsg: e.isGroup ? 10 : 0 })
        } else {
          // 这里是否还需要上传到缓存服务器呐？多半是代理服务器的问题，本地也修不了，应该不用吧。
          await this.renderImage(e, use !== 'bing' ? 'content/ChatGPT/index' : 'content/Bing/index', `通信异常,错误信息如下 ${err}`, prompt)
        }
      }
    }
  }

  async renderImage (e, template, content, prompt, quote = [], cache = false) {
    let cacheData = { file: '', cacheUrl: Config.cacheUrl }
    if (cache) {
      if (Config.cacheEntry) cacheData.file = randomString()
      const use = await redis.get('CHATGPT:USE')
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
            quote
          },
          bing: use === 'bing',
          entry: Config.cacheEntry ? cacheData.file : ''
        })
      }
      if (Config.cacheEntry) {
        fetch(`${Config.cacheUrl}/cache`, cacheresOption)
      } else {
        const cacheres = await fetch(`${Config.cacheUrl}/cache`, cacheresOption)
        if (cacheres.ok) {
          cacheData = Object.assign({}, cacheData, await cacheres.json())
        }
      }
    }
    await e.reply(await render(e, 'chatgpt-plugin', template, {
      content: new Buffer.from(content).toString('base64'),
      prompt: new Buffer.from(prompt).toString('base64'),
      senderName: e.sender.nickname,
      quote: quote.length > 0,
      quotes: quote,
      cache: cacheData,
      version
    }, { retType: Config.quoteReply ? 'base64' : '' }), e.isGroup && Config.quoteReply)
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
    switch (use) {
      case 'browser': {
        return await this.chatgptBrowserBased(prompt, conversation)
      }
      case 'bing': {
        let bingToken = await redis.get('CHATGPT:BING_TOKEN')
        if (!bingToken) {
          throw new Error('未绑定Bing Cookie，请使用#chatgpt设置必应token命令绑定Bing Cookie')
        }
        let cookie
        if (bingToken?.indexOf('=') > -1) {
          cookie = bingToken
        }
        const bingAIClient = new BingAIClient({
          userToken: bingToken, // "_U" cookie from bing.com
          cookie,
          debug: Config.debug,
          proxy: Config.proxy
        })
        let response
        let reply = ''
        try {
          let opt = _.cloneDeep(conversation) || {}
          opt.toneStyle = Config.toneStyle
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
            text: message === 'Timed out waiting for response. Try enabling debug mode to see more information.' ? (reply != '' ? `${reply}\n不行了，我的大脑过载了，处理不过来了!` : '必应的小脑瓜不好使了，不知道怎么回答！') : message
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
        await redis.set(`CHATGPT:QQ_CONVERSATION:${e.sender.user_id}`, sendMessageResult.conversationId)
        if (!conversation.conversationId) {
          // 如果是对话的创建者
          await redis.set(`CHATGPT:CONVERSATION_CREATER_ID:${sendMessageResult.conversationId}`, e.sender.user_id)
          await redis.set(`CHATGPT:CONVERSATION_CREATER_NICK_NAME:${sendMessageResult.conversationId}`, e.sender.card)
        }
        return sendMessageResult
      }
      default: {
        let completionParams = {}
        if (Config.model) {
          completionParams.model = Config.model
        }
        const currentDate = new Date().toISOString().split('T')[0]
        let promptPrefix = `You are ${Config.assistantLabel}, a large language model trained by OpenAI. ${Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
        this.chatGPTApi = new ChatGPTAPI({
          apiBaseUrl: Config.openAiBaseUrl,
          apiKey: Config.apiKey,
          debug: false,
          upsertMessage,
          getMessageById,
          systemMessage: promptPrefix,
          completionParams,
          assistantLabel: Config.assistantLabel,
          fetch: newFetch
        })
        let option = {
          timeoutMs: 120000,
          systemMessage: promptPrefix
        }
        if (conversation) {
          option = Object.assign(option, conversation)
        }
        return await tryTimes(async () => await this.chatGPTApi.sendMessage(prompt, option), 1)
      }
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
    if (!Config.apiKey) {
      this.reply('当前未配置OpenAI API key，请在锅巴面板或插件配置文件config/config.js中配置。若使用免费的API3则无需关心计费。')
      return false
    }
    // 查询OpenAI API剩余试用额度
    newFetch(`${Config.openAiBaseUrl}/dashboard/billing/credit_grants`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + Config.apiKey
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          // console.log(data.error)
          this.reply('获取失败：' + data.error.code)
          return false
        } else {
          let total_granted = data.total_granted.toFixed(2)
          let total_used = data.total_used.toFixed(2)
          let total_available = data.total_available.toFixed(2)
          let expires_at = new Date(data.grants.data[0].expires_at * 1000).toLocaleDateString().replace(/\//g, '-')
          this.reply('总额度：$' + total_granted + '\n已经使用额度：$' + total_used + '\n当前剩余额度：$' + total_available + '\n到期日期(UTC)：' + expires_at)
        }
      })
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
