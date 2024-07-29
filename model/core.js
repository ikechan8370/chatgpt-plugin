import { Config, defaultOpenAIAPI } from '../utils/config.js'
import {
  extractContentFromFile,
  formatDate,
  getImg,
  getMasterQQ, getMaxModelTokens,
  getOrDownloadFile,
  getUin,
  getUserData,
  isCN
} from '../utils/common.js'
import { KeyvFile } from 'keyv-file'
import SydneyAIClient from '../utils/SydneyAIClient.js'
import _ from 'lodash'
import { getChatHistoryGroup } from '../utils/chat.js'
import { APTool } from '../utils/tools/APTool.js'
import BingDrawClient from '../utils/BingDraw.js'
import BingSunoClient from '../utils/BingSuno.js'
import { solveCaptchaOneShot } from '../utils/bingCaptcha.js'
import { OfficialChatGPTClient } from '../utils/message.js'
import ChatGLMClient from '../utils/chatglm.js'
import { ClaudeAPIClient } from '../client/ClaudeAPIClient.js'
import { ClaudeAIClient } from '../utils/claude.ai/index.js'
import XinghuoClient from '../utils/xinghuo/xinghuo.js'
import { getMessageById, upsertMessage } from '../utils/history.js'
import { v4 as uuid } from 'uuid'
import fetch from 'node-fetch'
import { CustomGoogleGeminiClient } from '../client/CustomGoogleGeminiClient.js'
import { resizeAndCropImage } from '../utils/dalle.js'
import fs from 'fs'
import { QueryStarRailTool } from '../utils/tools/QueryStarRailTool.js'
import { WebsiteTool } from '../utils/tools/WebsiteTool.js'
import { SendPictureTool } from '../utils/tools/SendPictureTool.js'
import { SendVideoTool } from '../utils/tools/SendBilibiliTool.js'
import { SearchVideoTool } from '../utils/tools/SearchBilibiliTool.js'
import { SendAvatarTool } from '../utils/tools/SendAvatarTool.js'
import { SerpImageTool } from '../utils/tools/SearchImageTool.js'
import { SearchMusicTool } from '../utils/tools/SearchMusicTool.js'
import { SendMusicTool } from '../utils/tools/SendMusicTool.js'
import { SendAudioMessageTool } from '../utils/tools/SendAudioMessageTool.js'
import { SendMessageToSpecificGroupOrUserTool } from '../utils/tools/SendMessageToSpecificGroupOrUserTool.js'
import { QueryGenshinTool } from '../utils/tools/QueryGenshinTool.js'
import { WeatherTool } from '../utils/tools/WeatherTool.js'
import { QueryUserinfoTool } from '../utils/tools/QueryUserinfoTool.js'
import { EditCardTool } from '../utils/tools/EditCardTool.js'
import { JinyanTool } from '../utils/tools/JinyanTool.js'
import { KickOutTool } from '../utils/tools/KickOutTool.js'
import { SetTitleTool } from '../utils/tools/SetTitleTool.js'
import { SerpIkechan8370Tool } from '../utils/tools/SerpIkechan8370Tool.js'
import { SerpTool } from '../utils/tools/SerpTool.js'
import common from '../../../lib/common/common.js'
import { SendDiceTool } from '../utils/tools/SendDiceTool.js'
import { EliMovieTool } from '../utils/tools/EliMovieTool.js'
import { EliMusicTool } from '../utils/tools/EliMusicTool.js'
import { HandleMessageMsgTool } from '../utils/tools/HandleMessageMsgTool.js'
import { ProcessPictureTool } from '../utils/tools/ProcessPictureTool.js'
import { ImageCaptionTool } from '../utils/tools/ImageCaptionTool.js'
import { ChatGPTAPI } from '../utils/openai/chatgpt-api.js'
import { newFetch } from '../utils/proxy.js'
import { ChatGLM4Client } from '../client/ChatGLM4Client.js'
import { QwenApi } from '../utils/alibaba/qwen-api.js'

const roleMap = {
  owner: 'group owner',
  admin: 'group administrator'
}

const defaultPropmtPrefix = ', a large language model trained by OpenAI. You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short.'

async function handleSystem (e, system) {
  if (Config.enableGroupContext) {
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
        ((opt.groupId) ? groupContextTip : '')
      system += 'Attention, you are currently chatting in a qq group, then one who asks you now is' + `${opt.nickname}(${opt.qq})。`
      system += `the group name is ${opt.groupName}, group id is ${opt.groupId}。`
      if (opt.botName) {
        system += `Your nickname is ${opt.botName} in the group,`
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
  }
  return system
}

class Core {
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
    if (use === 'bing') {
      let throttledTokens = []
      let {
        bingToken,
        allThrottled
      } = await getAvailableBingToken(conversation, throttledTokens)
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
          if (!c) {
            opt.context = useCast?.bing_resource || Config.sydneyContext
          }
          // 重新拿存储的token，因为可能之前有过期的被删了
          let abtrs = await getAvailableBingToken(conversation, throttledTokens)
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
          if (Config.enableGroupContext && e.isGroup) {
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
                    this.reply('绘图失败：' + err)
                  }
                })
              }
            }
            opt.onSunoCreateRequest = prompt => {
              logger.mark(`开始生成内容：Suno ${prompt.songtId || ''}`)
              let client = new BingSunoClient({
                cookies: cookies
              })
              redis.set(`CHATGPT:SUNO:${e.sender.user_id}`, 'c', { EX: 30 }).then(() => {
                try {
                  if (Config.bingSuno == 'local') {
                    // 调用本地Suno配置进行歌曲生成
                    client.getLocalSuno(prompt, e)
                  } else if (Config.bingSuno == 'api' && Config.bingSunoApi) {
                    // 调用第三方Suno配置进行歌曲生成
                    client.getApiSuno(prompt, e)
                  } else {
                    // 调用Bing Suno进行歌曲生成
                    client.getSuno(prompt, e)
                  }
                } catch (err) {
                  redis.del(`CHATGPT:SUNO:${e.sender.user_id}`)
                  this.reply('歌曲生成失败：' + err)
                }
              })
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
                await this.reply('出现必应验证码，尝试解决中')
                try {
                  let captchaResolveResult = await solveCaptchaOneShot(bingToken)
                  if (captchaResolveResult?.success) {
                    await this.reply('验证码已解决')
                  } else {
                    logger.error(captchaResolveResult)
                    errorMessage = message
                    await this.reply('验证码解决失败: ' + captchaResolveResult.error)
                    retry = 0
                  }
                } catch (err) {
                  logger.error(err)
                  await this.reply('验证码解决失败: ' + err)
                  retry = 0
                }
              } else {
                // 未登录用户maxConv目前为5或10，出验证码是ip或MUID问题
                logger.warn(`token [${bingToken}] 出现必应验证码，请前往网页版或app手动解决`)
                errorMessage = message
                retry = 0
              }
            } else {
              retry = 0
            }
          } else if (message && typeof message === 'string' && message.indexOf('限流') > -1) {
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
        if (errorMessage.includes('CaptchaChallenge')) {
          if (bingToken) {
            errorMessage = '出现验证码，请使用当前账户前往https://www.bing.com/chat或Edge侧边栏或移动端APP手动解除验证码'
          } else {
            errorMessage = '未配置必应账户，建议绑定必应账户再使用必应模式'
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
    } else if (use === 'api3') {
      // official without cloudflare
      let accessToken = await redis.get('CHATGPT:TOKEN')
      // if (!accessToken) {
      //   throw new Error('未绑定ChatGPT AccessToken，请使用#chatgpt设置token命令绑定token')
      // }
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
      (async () => {
        let audio = await this.chatGPTApi.synthesis(sendMessageResult)
        if (audio) {
          await e.reply(segment.record(audio))
        }
      })().catch(err => {
        logger.warn('发送语音失败', err)
      })
      return sendMessageResult
    } else if (use === 'chatglm') {
      const cacheOptions = {
        namespace: 'chatglm_6b',
        store: new KeyvFile({ filename: 'cache.json' })
      }
      this.chatGPTApi = new ChatGLMClient({
        user: e.sender.user_id,
        cache: cacheOptions
      })
      return await this.chatGPTApi.sendMessage(prompt, conversation)
    } else if (use === 'claude') {
      // slack已经不可用，移除
      let keys = Config.claudeApiKey?.split(/[,;]/).map(key => key.trim()).filter(key => key)
      let choiceIndex = Math.floor(Math.random() * keys.length)
      let key = keys[choiceIndex]
      logger.info(`使用API Key：${key}`)
      while (keys.length >= 0) {
        let errorMessage = ''
        const client = new ClaudeAPIClient({
          key,
          model: Config.claudeApiModel || 'claude-3-sonnet-20240229',
          debug: true,
          baseUrl: Config.claudeApiBaseUrl
          // temperature: Config.claudeApiTemperature || 0.5
        })
        let opt = {
          stream: false,
          parentMessageId: conversation.parentMessageId,
          conversationId: conversation.conversationId,
          system: Config.claudeSystemPrompt
        }
        let img = await getImg(e)
        if (img && img.length > 0) {
          const response = await fetch(img[0])
          const base64Image = Buffer.from(await response.arrayBuffer()).toString('base64')
          opt.image = base64Image
        }
        try {
          let rsp = await client.sendMessage(prompt, opt)
          return rsp
        } catch (err) {
          errorMessage = err.message
          switch (err.message) {
            case 'rate_limit_error': {
              // api没钱了或者当月/日/时/分额度耗尽
              // throw new Error('claude API额度耗尽或触发速率限制')
              break
            }
            case 'authentication_error': {
              // 无效的key
              // throw new Error('claude API key无效')
              break
            }
            default:
          }
          logger.warn(`claude api 错误：[${key}] ${errorMessage}`)
        }
        if (keys.length === 0) {
          throw new Error(errorMessage)
        }
        keys.splice(choiceIndex, 1)
        choiceIndex = Math.floor(Math.random() * keys.length)
        key = keys[choiceIndex]
        logger.info(`使用API Key：${key}`)
      }
    } else if (use === 'claude2') {
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
    } else if (use === 'xh') {
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
        image: image ? image[0] : undefined,
        system: Config.xhPrompt
      })
      return response
    } else if (use === 'azure') {
      let azureModel
      try {
        azureModel = await import('@azure/openai')
      } catch (error) {
        throw new Error('未安装@azure/openai包，请执行pnpm install @azure/openai安装')
      }
      let OpenAIClient = azureModel.OpenAIClient
      let AzureKeyCredential = azureModel.AzureKeyCredential
      let msg = conversation.messages
      let content = {
        role: 'user',
        content: prompt
      }
      msg.push(content)
      const client = new OpenAIClient(Config.azureUrl, new AzureKeyCredential(Config.azApiKey))
      const deploymentName = Config.azureDeploymentName
      const { choices } = await client.getChatCompletions(deploymentName, msg)
      let completion = choices[0].message
      return {
        text: completion.content,
        message: completion
      }
    } else if (use === 'qwen') {
      let completionParams = {
        parameters: {
          top_p: Config.qwenTopP || 0.5,
          top_k: Config.qwenTopK || 50,
          seed: Config.qwenSeed > 0 ? Config.qwenSeed : Math.floor(Math.random() * 114514),
          temperature: Config.qwenTemperature || 1,
          enable_search: !!Config.qwenEnableSearch,
          result_format: 'message'
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
        debug: Config.debug,
        upsertMessage: um,
        getMessageById: gm,
        systemMessage: `You are ${Config.assistantLabel} ${useCast?.api || Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`,
        completionParams,
        assistantLabel: Config.assistantLabel,
        fetch: newFetch
      }

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
      if (Config.smartMode) {
        let isAdmin = ['admin', 'owner'].includes(e.sender.role)
        let sender = e.sender.user_id
        const {
          funcMap,
          fullFuncMap,
          promptAddition,
          systemAddition
        } = await collectTools(e)
        if (!option.completionParams) {
          option.completionParams = {}
        }
        promptAddition && (prompt += promptAddition)
        option.systemMessage = await handleSystem(e, opts.systemMessage)
        if (Config.enableChatSuno) {
          option.systemMessage += '如果我要求你生成音乐或写歌，你需要回复适合Suno生成音乐的信息。请使用Verse、Chorus、Bridge、Outro和End等关键字对歌词进行分段，如[Verse 1]。音乐信息需要使用markdown包裹的JSON格式回复给我，结构为```json{"option": "Suno", "tags": "style", "title": "title of the song", "lyrics": "lyrics"}```。'
        }
        systemAddition && (option.systemMessage += systemAddition)
        opts.completionParams.parameters.tools = Object.keys(funcMap)
          .map(k => funcMap[k].function)
          .map(obj => {
            return {
              type: 'function',
              function: obj
            }
          })
        let msg
        try {
          this.qwenApi = new QwenApi(opts)
          msg = await this.qwenApi.sendMessage(prompt, option)
          logger.info(msg)
          while (msg.functionCall) {
            if (msg.text) {
              await this.reply(msg.text.replace('\n\n\n', '\n'))
            }
            let {
              name,
              arguments: args
            } = msg.functionCall
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
            let functionResult = await fullFuncMap[name.trim()].exec.bind(this)(Object.assign({
              isAdmin,
              sender
            }, args), e)
            logger.mark(`function ${name} execution result: ${functionResult}`)
            option.parentMessageId = msg.id
            option.name = name
            // 不然普通用户可能会被openai限速
            await common.sleep(300)
            msg = await this.qwenApi.sendMessage(functionResult, option, 'tool')
            logger.info(msg)
          }
        } catch (err) {
          logger.error(err)
          throw new Error(err)
        }
        return msg
      } else {
        let msg
        try {
          this.qwenApi = new QwenApi(opts)
          msg = await this.qwenApi.sendMessage(prompt, option)
        } catch (err) {
          logger.error(err)
          throw new Error(err)
        }
        return msg
      }
    } else if (use === 'gemini') {
      let client = new CustomGoogleGeminiClient({
        e,
        userId: e.sender.user_id,
        key: Config.geminiKey,
        model: Config.geminiModel,
        baseUrl: Config.geminiBaseUrl,
        debug: Config.debug
      })
      let option = {
        stream: false,
        onProgress: (data) => {
          if (Config.debug) {
            logger.info(data)
          }
        },
        parentMessageId: conversation.parentMessageId,
        conversationId: conversation.conversationId
      }
      const image = await getImg(e)
      let imageUrl = image ? image[0] : undefined
      if (imageUrl) {
        let md5 = imageUrl.split(/[/-]/).find(s => s.length === 32)?.toUpperCase()
        let imageLoc = await getOrDownloadFile(`ocr/${md5}.png`, imageUrl)
        let outputLoc = imageLoc.replace(`${md5}.png`, `${md5}_512.png`)
        await resizeAndCropImage(imageLoc, outputLoc, 512)
        let buffer = fs.readFileSync(outputLoc)
        option.image = buffer.toString('base64')
      }
      if (Config.smartMode) {
        /**
         * @type {AbstractTool[]}
         */
        let tools = [
          new QueryStarRailTool(),
          new WebsiteTool(),
          new SendPictureTool(),
          new SendVideoTool(),
          new SearchVideoTool(),
          new SendAvatarTool(),
          new SerpImageTool(),
          new SearchMusicTool(),
          new SendMusicTool(),
          new SendAudioMessageTool(),
          new APTool(),
          new SendMessageToSpecificGroupOrUserTool(),
          new QueryGenshinTool()
        ]
        if (Config.amapKey) {
          tools.push(new WeatherTool())
        }
        if (e.isGroup) {
          tools.push(new QueryUserinfoTool())
          if (e.group.is_admin || e.group.is_owner) {
            tools.push(new EditCardTool())
            tools.push(new JinyanTool())
            tools.push(new KickOutTool())
          }
          if (e.group.is_owner) {
            tools.push(new SetTitleTool())
          }
        }
        switch (Config.serpSource) {
          case 'ikechan8370': {
            tools.push(new SerpIkechan8370Tool())
            break
          }
          case 'azure': {
            if (!Config.azSerpKey) {
              logger.warn('未配置bing搜索密钥，转为使用ikechan8370搜索源')
              tools.push(new SerpIkechan8370Tool())
            } else {
              tools.push(new SerpTool())
            }
            break
          }
          default: {
            tools.push(new SerpIkechan8370Tool())
          }
        }
        client.addTools(tools)
      }
      let system = Config.geminiPrompt
      if (Config.enableGroupContext && e.isGroup) {
        let chats = await getChatHistoryGroup(e, Config.groupContextLength)
        const namePlaceholder = '[name]'
        const defaultBotName = 'GeminiPro'
        const groupContextTip = Config.groupContextTip
        let botName = e.isGroup ? (e.group.pickMember(getUin(e)).card || e.group.pickMember(getUin(e)).nickname) : e.bot.nickname
        system = system.replaceAll(namePlaceholder, botName || defaultBotName) +
          ((Config.enableGroupContext && e.group_id) ? groupContextTip : '')
        system += 'Attention, you are currently chatting in a qq group, then one who asks you now is' + `${e.sender.card || e.sender.nickname}(${e.sender.user_id}).`
        system += `the group name is ${e.group.name || e.group_name}, group id is ${e.group_id}.`
        system += `Your nickname is ${botName} in the group,`
        if (chats) {
          system += 'There is the conversation history in the group, you must chat according to the conversation history context"'
          system += chats
            .map(chat => {
              let sender = chat.sender || {}
              return `【${sender.card || sender.nickname}】(qq：${sender.user_id}, ${roleMap[sender.role] || 'normal user'}，${sender.area ? 'from ' + sender.area + ', ' : ''} ${sender.age} years old, 群头衔：${sender.title}, gender: ${sender.sex}, time：${formatDate(new Date(chat.time * 1000))}, messageId: ${chat.message_id}) 说：${chat.raw_message}`
            })
            .join('\n')
        }
      }
      if (Config.enableChatSuno) {
        system += 'If I ask you to generate music or write songs, you need to reply with information suitable for Suno to generate music. Please use keywords such as Verse, Chorus, Bridge, Outro, and End to segment the lyrics, such as [Verse 1], The returned message is in JSON format, with a structure of ```json{"option": "Suno", "tags": "style", "title": "title of the song", "lyrics": "lyrics"}```.'
      }
      option.system = system
      option.replyPureTextCallback = async (msg) => {
        if (msg) {
          await e.reply(msg, true)
        }
      }
      return await client.sendMessage(prompt, option)
    } else if (use === 'chatglm4') {
      const client = new ChatGLM4Client({
        refreshToken: Config.chatglmRefreshToken
      })
      let resp = await client.sendMessage(prompt, conversation)
      if (resp.image) {
        this.reply(segment.image(resp.image), true)
      }
      return resp
    } else {
      // openai api
      let completionParams = {}
      if (Config.model) {
        completionParams.model = Config.model
      }
      const currentDate = new Date().toISOString().split('T')[0]
      let promptPrefix = `You are ${Config.assistantLabel} ${useCast?.api || Config.promptPrefixOverride || defaultPropmtPrefix}
        Current date: ${currentDate}`
      let maxModelTokens = getMaxModelTokens(completionParams.model)
      // let system = promptPrefix
      let system = await handleSystem(e, promptPrefix, maxModelTokens)
      if (Config.enableChatSuno) {
        system += 'If I ask you to generate music or write songs, you need to reply with information suitable for Suno to generate music. Please use keywords such as Verse, Chorus, Bridge, Outro, and End to segment the lyrics, such as [Verse 1], The returned song information needs to be wrapped in JSON format and sent to me in Markdown format. The message structure is ` ` JSON {"option": "Suno", "tags": "style", "title": "title of The Song", "lyrics": "lyrics"} `.'
      }
      logger.debug(system)
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
        stream: Config.apiStream,
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
        let isAdmin = ['admin', 'owner'].includes(e.sender.role)
        let sender = e.sender.user_id
        const {
          funcMap,
          fullFuncMap,
          promptAddition,
          systemAddition
        } = await collectTools(e)
        if (!option.completionParams) {
          option.completionParams = {}
        }
        promptAddition && (prompt += promptAddition)
        systemAddition && (option.systemMessage += systemAddition)
        option.completionParams.functions = Object.keys(funcMap).map(k => funcMap[k].function)
        let msg
        try {
          msg = await this.chatGPTApi.sendMessage(prompt, option)
          logger.info(msg)
          while (msg.functionCall) {
            if (msg.text) {
              await this.reply(msg.text.replace('\n\n\n', '\n'))
            }
            let {
              name,
              arguments: args
            } = msg.functionCall
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
            let functionResult = await fullFuncMap[name.trim()].exec.bind(this)(Object.assign({
              isAdmin,
              sender
            }, args), e)
            logger.mark(`function ${name} execution result: ${functionResult}`)
            option.parentMessageId = msg.id
            option.name = name
            // 不然普通用户可能会被openai限速
            await common.sleep(300)
            msg = await this.chatGPTApi.sendMessage(functionResult, option, 'function')
            logger.info(msg)
          }
        } catch (err) {
          if (err.message?.indexOf('context_length_exceeded') > 0) {
            logger.warn(err)
            await redis.del(`CHATGPT:CONVERSATIONS:${e.sender.user_id}`)
            await redis.del(`CHATGPT:WRONG_EMOTION:${e.sender.user_id}`)
            await this.reply('字数超限啦，将为您自动结束本次对话。')
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
            await this.reply('字数超限啦，将为您自动结束本次对话。')
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

/**
 * 收集tools
 * @param e
 * @return {Promise<{systemAddition, funcMap: {}, promptAddition: string, fullFuncMap: {}}>}
 */
async function collectTools (e) {
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
    logger.debug(logger.green('【ChatGPT-Plugin】插件avocado-plugin未安装') + '，安装后可查看最近热映电影与体验可玩性更高的点歌工具。\n可前往 https://github.com/Qz-Sean/avocado-plugin 获取')
  }
  let systemAddition = ''
  if (e.isGroup) {
    let botInfo = await e.bot.getGroupMemberInfo(e.group_id, getUin(e), true)
    if (botInfo.role !== 'member') {
      // 管理员才给这些工具
      tools.push(...[new EditCardTool(), new JinyanTool(), new KickOutTool(), new HandleMessageMsgTool(), new SetTitleTool()])
      // 用于撤回和加精的id
      if (e.source?.seq) {
        let source = (await e.group.getChatHistory(e.source?.seq, 1)).pop()
        systemAddition += `\nthe last message is replying to ${source.message_id}"\n`
      } else {
        systemAddition += `\nthe last message id is ${e.message_id}. `
      }
    }
  }
  let promptAddition = ''
  let img = await getImg(e)
  if (img?.length > 0 && Config.extraUrl) {
    tools.push(new ImageCaptionTool())
    tools.push(new ProcessPictureTool())
    promptAddition += `\nthe url of the picture(s) above: ${img.join(', ')}`
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
  return {
    funcMap,
    fullFuncMap,
    systemAddition,
    promptAddition
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
  // 记录使用情况
  const index = bingTokens.findIndex(element => element.Token === bingToken)
  bingTokens[index].Usage += 1
  await redis.set('CHATGPT:BING_TOKENS', JSON.stringify(bingTokens))
  return {
    bingToken,
    allThrottled
  }
}

export default new Core()
