import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'
import { render } from '../utils/common.js'
let version = Config.version
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
        icon: 'chat',
        title: '#chat1/#chat3/#chatglm/#bing/#claude/#xh',
        desc: '分别使用API/API3/ChatGLM/Bing/Claude/星火模式与机器人聊天，无论主人设定了何种全局模式'
      },
      {
        icon: 'chat-private',
        title: '私聊与我对话',
        desc: '与机器人聊天'
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
        title: '#chatgpt删除对话+对话id或@用户',
        desc: '删除指定对话，并清空与用户的关联信息。@用户时支持多个用户'
      },
      {
        icon: 'destroy',
        title: '#(结束|新开|摧毁|毁灭|完结)对话',
        desc: '结束自己当前对话，下次开启对话机器人将遗忘掉本次对话内容。'
      },
      {
        icon: 'destroy',
        title: '#(结束|新开|摧毁|毁灭|完结)全部对话',
        desc: '结束正在与本机器人进行对话的全部用户的对话。'
      },
      {
        icon: 'destroy-other',
        title: '#(结束|新开|摧毁|毁灭|完结)对话 @某人',
        desc: '结束该用户当前对话，下次开启对话机器人将遗忘掉本次对话内容。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt(导出)聊天记录',
        desc: '图片形式导出聊天记录，目前仅支持Bing下的Sydney和自定义'
      },
      {
        icon: 'smiley-wink',
        title: '#claude开启新对话+设定名',
        desc: '结束之前的对话，并开启一个新的Claude对话，如果设定名不为空的话，会使用这个设定。设定必须是设定列表中有的设定。'
      }
    ]
  },
  {
    group: '画图',
    list: [
      {
        icon: 'draw',
        title: '#chatgpt画图+prompt(/张数/图片大小)',
        desc: '调用OpenAI Dalle API进行绘图，需要有API key并消耗余额。图片大小只能是256x256/512x512/1024x1024中的一个.默认为1张、512x512'
      },
      {
        icon: 'draw',
        title: '#chatgpt改图',
        desc: '调用OpenAI Dalle API进行改图，需要有API key并消耗余额。可同时发送图片或回复图片'
      },
      {
        icon: 'switch',
        title: '#chatgpt开启/关闭画图',
        desc: '开启或关闭画图功能'
      }
    ]
  },
  {
    group: '管理',
    list: [
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
      {
        icon: 'sound',
        title: '#chatgpt语音模式',
        desc: '机器人以语音形式回答'
      },
      {
        icon: 'game',
        title: '#chatgpt设置语音角色',
        desc: '设置语音模式下回复的角色音色。优先级高于默认语音角色'
      },
      {
        icon: 'list',
        title: '#chatgpt对话列表',
        desc: '查询当前哪些人正在与机器人聊天.目前API3模式下支持切换对话'
      },
      {
        icon: 'blue',
        title: '#chatgpt(本群)?(群xxx)?闭嘴(x秒/分钟/小时)',
        desc: '让机器人在本群/某群闭嘴。不指定群时认为全局闭嘴。'
      },
      {
        icon: 'eye',
        title: '#chatgpt(本群)?(群xxx)?(张嘴|开口|说话|上班)',
        desc: '让机器人在本群/某群重新可以说话。不指定群时认为全局开口。'
      },
      {
        icon: 'list',
        title: '#chatgpt查看闭嘴',
        desc: '查看当前闭嘴情况。'
      },
      {
        icon: 'queue',
        title: '#清空chat队列',
        desc: '清空当前对话等待队列。仅建议前方卡死时使用。仅API3模式下可用'
      },
      {
        icon: 'queue',
        title: '#移出chat队列首位',
        desc: '移出当前对话等待队列中的首位。若前方对话卡死可使用本命令。仅API3模式下可用'
      },
      {
        icon: 'confirm',
        title: '#chatgpt开启/关闭问题确认',
        desc: '开启或关闭机器人收到消息后的确认回复消息。'
      },
      {
        icon: 'switch',
        title: '#chatgpt切换浏览器/API/API3/Bing/ChatGLM/Claude/Poe',
        desc: '切换使用的后端为浏览器或OpenAI API/反代官网API/Bing/自建ChatGLM/Slack Claude/Poe'
      },
      {
        icon: 'confirm',
        title: '#chatgpt必应切换(精准|均衡|创意|悉尼|自设定)',
        desc: '切换Bing风格。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt必应(开启|关闭)建议回复',
        desc: '开关Bing模式下的建议回复。'
      },
      {
        icon: 'list',
        title: '#(关闭|打开)群聊上下文',
        desc: '开启后将会发送近期群聊中的对话给机器人提供参考'
      },
      {
        icon: 'switch',
        title: '#chatgpt(允许|禁止|打开|关闭|同意)私聊',
        desc: '开启后将关闭本插件的私聊通道。(主人不影响)'
      },
      {
        icon: 'token',
        title: '#chatgpt(设置|添加)群聊[白黑]名单',
        desc: '白名单配置后只有白名单内的群可使用本插件，配置黑名单则会在对应群聊禁用本插件'
      }
    ]
  },
  {
    group: '设置',
    list: [
      {
        icon: 'token',
        title: '#chatgpt设置（必应）token',
        desc: '设置ChatGPT或bing的Token'
      },
      {
        icon: 'coin',
        title: '#OpenAI剩余额度',
        desc: '查询OpenAI API剩余试用额度'
      },
      {
        icon: 'key',
        title: '#chatgpt设置APIKey',
        desc: '设置APIKey'
      },
      {
        icon: 'key',
        title: '#chatgpt设置星火token',
        desc: '设置星火ssoSessionId（对话页面的ssoSessionId cookie值）'
      },
      {
        icon: 'eat',
        title: '#chatgpt设置(API|Sydney)设定',
        desc: '设置AI的默认风格设定'
      },
      {
        icon: 'eat',
        title: '#chatgpt查看(API|Sydney)设定',
        desc: '查看AI当前的风格设定，文本形式返回，设定太长可能发不出来'
      },
      {
        icon: 'token',
        title: '#chatgpt设置后台刷新token',
        desc: '用于查看API余额。注意和配置的key保持同一账号。'
      },
      {
        icon: 'token',
        title: '#chatgpt(开启|关闭)智能模式',
        desc: 'API模式下打开或关闭智能模式。'
      }
    ]
  },
  {
    group: '设定',
    list: [
      {
        icon: 'smiley-wink',
        title: '#chatgpt设定列表',
        desc: '查看所有设定列表，以转发消息形式'
      },
      {
        icon: 'eat',
        title: '#chatgpt查看设定【设定名】',
        desc: '查看指定名字的设定内容。其中API默认和Sydney默认为锅巴面板配置的设定'
      },
      {
        icon: 'coin',
        title: '#chatgpt添加设定',
        desc: '添加一个设定，分此输入设定名称和设定内容。如果名字已存在，则会覆盖（相当于修改）'
      },
      {
        icon: 'switch',
        title: '#chatgpt使用设定【设定名】',
        desc: '使用某个设定。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt(上传|分享|共享)设定',
        desc: '上传设定'
      },
      {
        icon: 'confirm',
        title: '#chatgpt(删除|取消|撤销)共享设定+设定名',
        desc: '从远端删除，只能删除自己上传的设定，根据机器人主人qq号判断。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt(在线)浏览设定(+关键词)(页码X)',
        desc: '搜索公开的设定。默认返回前十条，使用页码X可以翻页，使用关键词可以检索。页码从1开始。'
      },
      {
        icon: 'smiley-wink',
        title: '#chatgpt预览设定详情(+设定名)',
        desc: '根据设定名称预览云端设定的详情信息。'
      },
      {
        icon: 'confirm',
        title: '#chatgpt导入设定',
        desc: '导入其他人分享的设定。注意：相同名字的设定，会覆盖本地已有的设定'
      },
      // {
      //   icon: 'confirm',
      //   title: '#chatgpt开启/关闭洗脑',
      //   desc: '开启或关闭洗脑'
      // },
      // {
      //   icon: 'confirm',
      //   title: '#chatgpt设置洗脑强度+【强度】',
      //   desc: '设置洗脑强度'
      // },
      // {
      //   icon: 'confirm',
      //   title: '#chatgpt设置洗脑名称+【名称】',
      //   desc: '设置洗脑名称'
      // },
      {
        icon: 'help',
        title: '#chatgpt设定帮助',
        desc: '设定帮助'
      }
    ]
  },
  {
    group: '其他',
    list: [
      {
        icon: 'smiley-wink',
        title: '#chatgpt打招呼(群号|帮助)',
        desc: '让AI随机到某个群去打招呼'
      },
      {
        icon: 'help',
        title: '#chatgpt模式帮助',
        desc: '查看多种聊天模式的区别及当前使用的模式'
      },
      {
        icon: 'help',
        title: '#chatgpt全局回复帮助',
        desc: '获取配置全局回复模式和全局语音角色的命令帮助'
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
      name: 'ChatGPT-Plugin 帮助',
      dsc: 'ChatGPT-Plugin 帮助面板',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: '^#(chatgpt|ChatGPT)(命令|帮助|菜单|help|说明|功能|指令|使用说明)$',
          fnc: 'help'
        }
      ]
    })
  }

  async help (e) {
    await render(e, 'chatgpt-plugin', 'help/index', { helpData, version }) 
  }
}
