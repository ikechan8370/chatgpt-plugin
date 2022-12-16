import plugin from '../../../lib/plugins/plugin.js'

let helpData = [
  {
    group: '聊天',
    list: [
      {
        icon: 'chat',
        title: '@我+聊天内容',
        desc: '与机器人聊天'
      },
      {
        icon: 'chat-private',
        title: '私聊与我对话',
        desc: '与机器人聊天'
      },
      {
        icon: 'picture',
        title: '#chatgpt图片模式',
        desc: '机器人以图片形式回答'
      },
      {
        icon: 'text',
        title: '#chatgpt文本模式',
        desc: '机器人以文本形式回答，默认选项'
      },

    ]
  },
  {
    group: '管理',
    list: [
      {
        icon: 'list',
        title: '#chatgpt对话列表',
        desc: '查询当前哪些人正在与机器人聊天'
      },
      {
        icon: 'destroy',
        title: '#结束对话',
        desc: '结束自己当前对话，下次开启对话机器人将遗忘掉本次对话内容。'
      },
      {
        icon: 'destroy-other',
        title: '#结束对话 @某人',
        desc: '结束该用户当前对话，下次开启对话机器人将遗忘掉本次对话内容。'
      },
      {
        icon: 'help',
        title: '#chatgpt帮助',
        desc: '获取本帮助'
      }
    ]
  }
]

export class help extends plugin {
  constructor (e) {
    super({
      name: 'ChatGPT-Plugin帮助',
      dsc: 'ChatGPT-Plugin帮助',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '#(chatgpt|ChatGPT)(命令|帮助|菜单|help|说明|功能|指令|使用说明)',
          fnc: 'help'
        }
      ]
    })
  }

  async help (e) {
    await e.runtime.render('chatgpt-plugin', 'help/index', { helpData })
  }
}
