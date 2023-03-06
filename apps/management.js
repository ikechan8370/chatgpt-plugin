import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { BingAIClient } from '@waylaidwanderer/chatgpt-api'
import { exec } from 'child_process'
import { checkPnpm, formatDuration, parseDuration } from '../utils/common.js'

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
          reg: '#chatgpt(设置|绑定)(token|Token)',
          fnc: 'setAccessToken',
          permission: 'master'
        },
        {
          reg: '#chatgpt(设置|绑定)(必应|Bing |bing )(token|Token)',
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
          fnc: 'useBingSolution',
          permission: 'master'
        },
        {
          reg: '^#chatgpt模式(帮助)?$',
          fnc: 'modeHelp'
        },
        {
          reg: '^#chatgpt(强制)?更新$',
          fnc: 'updateChatGPTPlugin'
        },
        {
          reg: '^#chatgpt(本群)?(群\\d+)?闭嘴',
          fnc: 'shutUp',
          permission: 'master'
        },
        {
          reg: '^#chatgpt(本群)?(群\\d+)?(张嘴|开口|说话|上班)',
          fnc: 'openMouth',
          permission: 'master'
        },
        {
          reg: '^#chatgpt查看闭嘴',
          fnc: 'listShutUp',
          permission: 'master'
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
    await this.reply('API2已废弃，处于不可用状态，不会为你切换')
    // await redis.set('CHATGPT:USE', 'apiReverse')
    // await this.reply('【暂时不可用，请关注仓库更新和群公告】已切换到基于第三方Reversed CompletionAPI的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
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

  async useBingSolution (e) {
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

  // modified from miao-plugin
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
      e.reply('更新日志：\n' + stdout)
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
    API模式会调用OpenAI官方提供的gpt-3.5-turbo API，只需要提供API Key。一般情况下，该种方式响应速度更快，不会像chatGPT官网一样总出现不可用的现象，但注意gpt-3.5-turbo的API调用是收费的，新用户有18美元试用金可用于支付，价格为$0.0020/ 1K tokens.(问题和回答加起来算token)
   
    API3模式会调用第三方提供的官网反代API，他会帮你绕过CF防护，需要提供ChatGPT的Token。效果与官网和浏览器一致，但稳定性不一定。设置token和API2方法一样。#chatgpt设置token

    浏览器模式通过在本地启动Chrome等浏览器模拟用户访问ChatGPT网站，使得获得和官方以及API2模式一模一样的回复质量，同时保证安全性。缺点是本方法对环境要求较高，需要提供桌面环境和一个可用的代理（能够访问ChatGPT的IP地址），且响应速度不如API，而且高峰期容易无法使用。

    必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing 登录Cookie方可使用。#chatgpt设置必应token

    您可以使用‘#chatgpt切换浏览器/API/API2/API3/Bing’来切换到指定模式。

    当前为${modeText}模式。
`
    await this.reply(message)
  }

  async shutUp (e) {
    let duration = e.msg.replace(/^#chatgpt(本群)?(群\d+)?闭嘴/, '')
    let scope
    let time = 3600000
    if (duration === '永久') {
      time = 0
    } else if (duration) {
      time = parseDuration(duration)
    }
    const match = e.msg.match(/#chatgpt群(\d+)闭嘴(.*)/)
    if (e.msg.indexOf('本群') > -1) {
      if (e.isGroup) {
        scope = e.group.group_id
        if (await redis.get(`CHATGPT:SHUT_UP:${scope}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${scope}`)
          await redis.set(`CHATGPT:SHUT_UP:${scope}`, '1', { EX: time })
          await e.reply(`好的，从现在开始我会在当前群聊闭嘴${formatDuration(time)}`)
        } else {
          await redis.set(`CHATGPT:SHUT_UP:${scope}`, '1', { EX: time })
          await e.reply(`好的，从现在开始我会在当前群聊闭嘴${formatDuration(time)}`)
        }
      } else {
        await e.reply('本群是指？你也没在群聊里让我闭嘴啊？')
        return false
      }
    } else if (match) {
      const groupId = parseInt(match[1], 10)
      if (Bot.getGroupList().get(groupId)) {
        if (await redis.get(`CHATGPT:SHUT_UP:${groupId}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${groupId}`)
          await redis.set(`CHATGPT:SHUT_UP:${groupId}`, '1', { EX: time })
          await e.reply(`好的，从现在开始我会在群聊${groupId}闭嘴${formatDuration(time)}`)
        } else {
          await redis.set(`CHATGPT:SHUT_UP:${groupId}`, '1', { EX: time })
          await e.reply(`好的，从现在开始我会在群聊${groupId}闭嘴${formatDuration(time)}`)
        }
      } else {
        await e.reply('这是什么群？')
        return false
      }
    } else {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await redis.del('CHATGPT:SHUT_UP:ALL')
        await redis.set('CHATGPT:SHUT_UP:ALL', '1', { EX: time })
        await e.reply(`好的，我会再闭嘴${formatDuration(time)}`)
      } else {
        await redis.set('CHATGPT:SHUT_UP:ALL', '1', { EX: time })
        await e.reply(`好的，我会闭嘴${formatDuration(time)}`)
      }
    }
  }

  async openMouth (e) {
    const match = e.msg.match(/^#chatgpt群(\d+)/)
    if (e.msg.indexOf('本群') > -1) {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await e.reply('主人，我现在全局闭嘴呢，你让我在这个群张嘴咱也不敢张啊')
        return false
      }
      if (e.isGroup) {
        let scope = e.group.group_id
        if (await redis.get(`CHATGPT:SHUT_UP:${scope}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${scope}`)
          await e.reply('好的主人，我终于又可以在本群说话了')
        } else {
          await e.reply('啊？我也没闭嘴啊？')
        }
      } else {
        await e.reply('本群是指？你也没在群聊里让我张嘴啊？')
        return false
      }
    } else if (match) {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await e.reply('主人，我现在全局闭嘴呢，你让我在那个群张嘴咱也不敢张啊')
        return false
      }
      const groupId = parseInt(match[1], 10)
      if (Bot.getGroupList().get(groupId)) {
        if (await redis.get(`CHATGPT:SHUT_UP:${groupId}`)) {
          await redis.del(`CHATGPT:SHUT_UP:${groupId}`)
          await e.reply(`好的主人，我终于又可以在群${groupId}说话了`)
        } else {
          await e.reply(`啊？我也没在群${groupId}闭嘴啊？`)
        }
      } else {
        await e.reply('这是什么群？')
        return false
      }
    } else {
      if (await redis.get('CHATGPT:SHUT_UP:ALL')) {
        await redis.del('CHATGPT:SHUT_UP:ALL')
        await e.reply('好的，我会结束全局闭嘴')
      } else {
        await e.reply('啊？我也没全局闭嘴啊？')
      }
    }
  }

  async listShutUp () {
    let keys = await redis.keys('CHATGPT:SHUT_UP:*')
    if (!keys || keys.length === 0) {
      await this.reply('我没有在任何群闭嘴', true)
    } else {
      let list = []
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let groupId = key.replace('CHATGPT:SHUT_UP:', '')
        let ttl = await redis.ttl(key)
        let ttlFormat = formatDuration(ttl)
        list.push({ groupId, ttlFormat })
      }
      await this.reply(list.map(item => item.groupId !== 'ALL' ? `群聊${item.groupId}: ${item.ttlFormat}` : `全局: ${item.ttlFormat}`).join('\n'))
    }
  }
}
