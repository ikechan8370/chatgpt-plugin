import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { BingAIClient } from '@waylaidwanderer/chatgpt-api'
import { exec } from 'child_process'
import {checkPnpm} from "../utils/common.js";

export class ChatgptManagement extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin管理',
      dsc: 'ChatGPT-Plugin管理',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '#chatgpt开启(问题)?(回复)?确认',
          fnc: 'turnOnConfirm',
          permission: 'master'
        },
        {
          reg: '#chatgpt关闭(问题)?(回复)?确认',
          fnc: 'turnOffConfirm',
          permission: 'master'
        },
        {
          reg: '#chatgpt设置token',
          fnc: 'setAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt设置必应token',
          fnc: 'setBingAccessToken',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换浏览器$',
          fnc: 'useBrowserBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换API$',
          fnc: 'useOpenAIAPIBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换API2$',
          fnc: 'useReversedAPIBasedSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换API3$',
          fnc: 'useReversedAPIBasedSolution2',
          permission: 'master'
        },
        {
          reg: '^#chatgpt切换(必应|Bing)$',
          fnc: 'useReversedBingSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt模式帮助$',
          fnc: 'modeHelp'
        },
        {
          reg: '^#chatgpt模式$',
          fnc: 'modeHelp'
        },
        {
          reg: '^#chatgpt(强制)?更新$',
          fnc: 'updateChatGPTPlugin'
        }
      ]
    })
  }

  async turnOnConfirm (e) {
    await redis.set('CHATGPT:CONFIRM', 'on')
    await this.reply('已开启消息确认', true)
    return false
  }

  async turnOffConfirm (e) {
    await redis.set('CHATGPT:CONFIRM', 'off')
    await this.reply('已关闭消息确认', true)
    return false
  }

  async setAccessToken (e) {
    this.setContext('saveToken')
    await this.reply('请发送ChatGPT AccessToken', true)
    return false
  }

  async setBingAccessToken (e) {
    this.setContext('saveBingToken')
    await this.reply('请发送Bing Cookie Token.("_U" cookie from bing.com)', true)
    return false
  }

  async saveBingToken () {
    if (!this.e.msg) return
    let token = this.e.msg
    if (token.length < 215) {
      await this.reply('Bing Token格式错误，请确定获取了有效的_U Cookie或完整的Cookie', true)
      this.finish('saveToken')
      return
    }
    let cookie
    if (token?.indexOf('=') > -1) {
      cookie = token
    }
    const bingAIClient = new BingAIClient({
      userToken: token, // "_U" cookie from bing.com
      cookie,
      debug: Config.debug
    })
    // 异步就好了，不卡着这个context了
    bingAIClient.createNewConversation().then(async res => {
      if (res.clientId) {
        logger.info('bing token 有效')
      } else {
        logger.error('bing token 无效', res)
        await this.reply(`经检测，Bing Token无效。来自Bing的错误提示：${res.result?.message}`)
      }
    })
    await redis.set('CHATGPT:BING_TOKEN', token)
    await this.reply('Bing Token设置成功', true)
    this.finish('saveBingToken')
  }

  async saveToken () {
    if (!this.e.msg) return
    let token = this.e.msg
    if (!token.startsWith('ey') || token.length < 20) {
      await this.reply('ChatGPT AccessToken格式错误', true)
      this.finish('saveToken')
      return
    }
    await redis.set('CHATGPT:TOKEN', token)
    await this.reply('ChatGPT AccessToken设置成功', true)
    this.finish('saveToken')
  }

  async useBrowserBasedSolution (e) {
    await redis.set('CHATGPT:USE', 'browser')
    await this.reply('已切换到基于浏览器的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useOpenAIAPIBasedSolution (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'api') {
      await redis.set('CHATGPT:USE', 'api')
      await this.reply('已切换到基于OpenAI API的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
    } else {
      await this.reply('当前已经是API模式了')
    }
  }

  async useReversedAPIBasedSolution (e) {
    await redis.set('CHATGPT:USE', 'apiReverse')
    await this.reply('【暂时不可用，请关注仓库更新和群公告】已切换到基于第三方Reversed CompletionAPI的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useReversedAPIBasedSolution2 (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'api3') {
      await redis.set('CHATGPT:USE', 'api3')
      await this.reply('已切换到基于第三方Reversed Conversastion API(API3)的解决方案')
    } else {
      await this.reply('当前已经是API3模式了')
    }
  }

  async useReversedBingSolution (e) {
    let use = await redis.get('CHATGPT:USE')
    if (use !== 'bing') {
      await redis.set('CHATGPT:USE', 'bing')
      // 结束所有人的对话
      const keys = await redis.keys('CHATGPT:CONVERSATIONS:*')
      if (keys.length) {
        const response = await redis.del(keys)
        if (Config.debug) {
          console.log('Deleted keys:', response)
        }
      } else {
        console.log('No keys matched the pattern')
      }
      await this.reply('已切换到基于微软新必应的解决方案，如果已经对话过务必执行`#结束对话`避免引起404错误')
    } else {
      await this.reply('当前已经是必应Bing模式了')
    }
  }

  async checkAuth (e) {
    if (!e.isMaster) {
      e.reply(`只有主人才能命令ChatGPT哦~
    (*/ω＼*)`)
      return false
    }
    return true
  }

  async updateChatGPTPlugin (e) {
    let timer
    if (!await this.checkAuth(e)) {
      return true
    }
    let isForce = e.msg.includes('强制')
    let command = 'git  pull'
    if (isForce) {
      command = 'git  checkout . && git  pull'
      e.reply('正在执行强制更新操作，请稍等')
    } else {
      e.reply('正在执行更新操作，请稍等')
    }
    const _path = process.cwd()
    exec(command, { cwd: `${_path}/plugins/chatgpt-plugin/` }, async function (error, stdout, stderr) {
      if (/(Already up[ -]to[ -]date|已经是最新的)/.test(stdout)) {
        e.reply('目前已经是最新版ChatGPT了~')
        return true
      }
      if (error) {
        e.reply('ChatGPT更新失败！\nError code: ' + error.code + '\n' + error.stack + '\n 请稍后重试。')
        return true
      }
      e.reply('ChatGPT更新成功，正在尝试重新启动Yunzai以应用更新...')
      timer && clearTimeout(timer)

      let data = JSON.stringify({
        isGroup: !!e.isGroup,
        id: e.isGroup ? e.group_id : e.user_id,
        time: new Date().getTime()
      })
      await redis.set('Yz:restart', data, { EX: 120 })
      let npm = await checkPnpm()
      timer = setTimeout(function () {
        let command = `${npm} start`
        if (process.argv[1].includes('pm2')) {
          command = `${npm} run restart`
        }
        exec(command, function (error, stdout, stderr) {
          if (error) {
            e.reply('自动重启失败，请手动重启以应用新版ChatGPT。\nError code: ' + error.code + '\n' + error.stack + '\n')
            Bot.logger.error(`重启失败\n${error.stack}`)
            return true
          } else if (stdout) {
            Bot.logger.mark('重启成功，运行已转为后台，查看日志请用命令：npm run log')
            Bot.logger.mark('停止后台运行命令：npm stop')
            process.exit()
          }
        })
      }, 1000)
    })
    return true
  }

  async modeHelp () {
    let mode = await redis.get('CHATGPT:USE')
    const modeMap = {
      browser: '浏览器',
      apiReverse: 'API2',
      api: 'API',
      bing: '必应',
      api3: 'API3'
    }
    let modeText = modeMap[mode || 'api']
    let message = `    API模式和浏览器模式如何选择？

    // eslint-disable-next-line no-irregular-whitespace
    API模式会调用OpenAI官方提供的GPT-3 LLM API，只需要提供API Key。一般情况下，该种方式响应速度更快，可配置项多，且不会像chatGPT官网一样总出现不可用的现象，但其聊天效果明显较官网差。但注意GPT-3的API调用是收费的，新用户有18美元试用金可用于支付，价格为$0.0200/ 1K tokens.(问题和回答加起来算token)

    【当前不可用】API2模式会调用第三方提供的基于OpenAI text-davinci-002-render模型（官网同款）的API，需要提供ChatGPT的Token。效果比单纯的GPT-3 API好很多，但同时将Token提供给了第三方API，其中风险自行承担。#chatgpt设置token

    API3模式会调用第三方提供的官网反代API，他会帮你绕过CF防护，需要提供ChatGPT的Token。效果与官网和浏览器一致，但稳定性不一定。设置token和API2方法一样。#chatgpt设置token

    浏览器模式通过在本地启动Chrome等浏览器模拟用户访问ChatGPT网站，使得获得和官方以及API2模式一模一样的回复质量，同时保证安全性。缺点是本方法对环境要求较高，需要提供桌面环境和一个可用的代理（能够访问ChatGPT的IP地址），且响应速度不如API，而且高峰期容易无法使用。

    必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing 登录Cookie方可使用。#chatgpt设置必应token

    您可以使用‘#chatgpt切换浏览器/API/API2/API3/Bing’来切换到指定模式。

    当前为${modeText}模式。
`
    await this.reply(message)
  }
}
