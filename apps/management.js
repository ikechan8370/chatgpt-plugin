import plugin from '../../../lib/plugins/plugin.js'

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
    // todo 未知bing token是什么样的，有号的可以加个校验在这
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
    await redis.set('CHATGPT:USE', 'api')
    await this.reply('已切换到基于OpenAI API的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useReversedAPIBasedSolution (e) {
    await redis.set('CHATGPT:USE', 'apiReverse')
    await this.reply('已切换到基于第三方Reversed API的解决方案，如果已经对话过建议执行`#结束对话`避免引起404错误')
  }

  async useReversedBingSolution (e) {
    await redis.set('CHATGPT:USE', 'bing')
    await this.reply('已切换到基于第三方Reversed API的解决方案，如果已经对话过务必执行`#结束对话`避免引起404错误')
  }

  async modeHelp () {
    let mode = await redis.get('CHATGPT:USE')
    const modeMap = {
      browser: '浏览器',
      apiReverse: 'API2',
      api: 'API',
      bing: '必应'
    }
    let modeText = modeMap[mode || 'api']
    let message = `    API模式和浏览器模式如何选择？

    // eslint-disable-next-line no-irregular-whitespace
    API模式会调用OpenAI官方提供的GPT-3 LLM API，只需要提供API Key。一般情况下，该种方式响应速度更快，可配置项多，且不会像chatGPT官网一样总出现不可用的现象，但其聊天效果明显较官网差。但注意GPT-3的API调用是收费的，新用户有18美元试用金可用于支付，价格为$0.0200/ 1K tokens.(问题和回答加起来算token)

    API2模式会调用第三方提供的基于OpenAI text-davinci-002-render模型（官网同款）的API，需要提供ChatGPT的Token。效果比单纯的GPT-3 API好很多，但同时将Token提供给了第三方API，其中风险自行承担。#chatgpt设置token

    浏览器模式通过在本地启动Chrome等浏览器模拟用户访问ChatGPT网站，使得获得和官方以及API2模式一模一样的回复质量，同时保证安全性。缺点是本方法对环境要求较高，需要提供桌面环境和一个可用的代理（能够访问ChatGPT的IP地址），且响应速度不如API，而且高峰期容易无法使用。

    必应（Bing）将调用微软新必应接口进行对话。需要在必应网页能够正常使用新必应且设置有效的Bing 登录Cookie方可使用。#chatgpt设置必应token

    您可以使用‘#chatgpt切换浏览器/API/API2/Bing’来切换到指定模式。

    当前为${modeText}模式。
`
    await this.reply(message)
  }
}
