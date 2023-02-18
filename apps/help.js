import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../config/index.js'

let helpData = [
  {
    group: '聊天',
    list: [
      {
        icon: 'chat',
        title: Config.toggleMode === 'at' ? '@我+聊天内容' : '#chat+聊天内容',
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
      }

    ]
  },
  {
    group: '管理',
    list: [
      {
        icon: 'list',
        title: '#chatgpt对话列表',
        desc: '查询当前哪些人正在与机器人聊天.目前API3模式下支持切换对话'
      },
      {
        icon: 'switch',
        title: '#chatgpt切换对话+对话id',
        desc: '目前仅API3模式下可用，切换到指定的对话中'
      },
      {
        icon: 'switch',
        title: '#chatgpt加入对话+@某人',
        desc: '目前仅API3模式下可用，加入到某人当前进行的对话中'
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
        icon: 'queue',
        title: '#清空chat队列',
        desc: '清空当前对话等待队列。仅建议前方卡死时使用。'
      },
      {
        icon: 'queue',
        title: '#移出chat队列首位',
        desc: '移出当前对话等待队列中的首位。若前方对话卡死可使用本命令。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt开启/关闭问题确认',
        desc: '开启或关闭机器人收到消息后的确认回复消息。'
      },
      {
        icon: 'switch',
        title: '#chatgpt切换浏览器/API/API2/API3/Bing',
        desc: '切换使用的后端为浏览器或OpenAI API/第三方API/反代官网API/Bing'
      },
      {
        icon: 'help',
        title: '#chatgpt设置（必应）token',
        desc: '设置ChatGPT或bing的Token'
      },
      {
        icon: 'help',
        title: '#OpenAI剩余额度',
        desc: '查询OpenAI Plus剩余试用额度'
      },
      {
        icon: 'help',
        title: '#chatgpt模式帮助',
        desc: '查看多种聊天模式的区别及当前使用的模式'
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
