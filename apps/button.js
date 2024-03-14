import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'

const PLUGIN_CHAT = 'ChatGpt 对话'
const PLUGIN_MANAGEMENT = 'ChatGPT-Plugin 管理'
const PLUGIN_ENTERTAINMENT = 'ChatGPT-Plugin 娱乐小功能'
const FUNCTION_CHAT = 'chatgpt'
const FUNCTION_CHAT3 = 'chatgpt3'
const FUNCTION_CHAT1 = 'chatgpt1'
const FUNCTION_BING = 'bing'
const FUNCTION_GEMINI = 'gemini'
const FUNCTION_XH = 'xh'
const FUNCTION_QWEN = 'qwen'
const FUNCTION_GLM4 = 'glm4'
const FUNCTION_CLAUDE2 = 'claude2'
const FUNCTION_CLAUDE = 'claude'

const FUNCTION_END = 'destroyConversations'
const FUNCTION_END_ALL = 'endAllConversations'

const FUNCTION_PIC = 'switch2Picture'
const FUNCTION_TEXT = 'switch2Text'
const FUNCTION_AUDIO = 'switch2Audio'

const FUNCTION_CONFIRM_ON = 'turnOnConfirm'
const FUNCTION_CONFIRM_OFF = 'turnOffConfirm'
const FUNCTION_VERSION = 'versionChatGPTPlugin'
const FUNCTION_SHUTUP = 'shutUp'
const FUNCTION_OPEN_MOUTH = 'openMouth'
const FUNCTION_QUERY_CONFIG = 'queryConfig'
const FUNCTION_ENABLE_CONTEXT = 'enableGroupContext'
const FUNCTION_MODELS = 'viewAPIModel'

const FUNCTION_SWITCH_BING = 'useBingSolution'

const FUNCTION_WORDCLOUD = 'wordcloud'
const FUNCTION_WORDCLOUD_LATEST = 'wordcloud_latest'
const FUNCTION_WORDCLOUD_NEW = 'wordcloud_new'
const FUNCTION_TRANSLATE = 'translate'
const FUNCTION_TRANSLATE_SOURCE = 'translateSource'
const FUNCTION_TRANSLATE_OCR = 'ocr'
const FUNCTION_TRANSLATE_SCREENSHOT = 'screenshotUrl'
export class ChatGPTButtonHandler extends plugin {
  constructor () {
    super({
      name: 'chatgpt按钮处理器',
      priority: -100,
      namespace: 'chatgpt-plugin',
      handler: [{
        key: 'chatgpt.button.post',
        fn: 'btnHandler'
      }]
    })
  }

  async btnHandler (e, options, reject) {
    // logger.mark('[chatgpt按钮处理器]')
    if (!Config.enableMd) {
      return null
    }
    const fnc = e.logFnc
    switch (fnc) {
      case `[${PLUGIN_CHAT}][${FUNCTION_CHAT3}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_CHAT1}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_BING}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_GEMINI}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_XH}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_QWEN}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_CLAUDE2}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_CLAUDE}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_GLM4}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_CHAT}]`: {
        return this.makeButtonChat(options?.btnData)
      }
      case `[${PLUGIN_CHAT}][${FUNCTION_END}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_END_ALL}]`: {
        return this.makeButtonEnd(options?.btnData)
      }
      case `[${PLUGIN_CHAT}][${FUNCTION_PIC}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_AUDIO}]`:
      case `[${PLUGIN_CHAT}][${FUNCTION_TEXT}]`: {
        return this.makeButtonMode(options?.btnData)
      }
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_VERSION}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_SHUTUP}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_OPEN_MOUTH}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_MODELS}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_QUERY_CONFIG}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_ENABLE_CONTEXT}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_CONFIRM_OFF}]`:
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_CONFIRM_ON}]`: {
        return this.makeButtonConfirm(options?.btnData)
      }
      case `[${PLUGIN_MANAGEMENT}][${FUNCTION_SWITCH_BING}]`: {
        return this.makeButtonBingMode(options?.btnData)
      }
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_WORDCLOUD}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_WORDCLOUD_LATEST}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_WORDCLOUD_NEW}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_TRANSLATE}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_TRANSLATE_SOURCE}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_TRANSLATE_OCR}]`:
      case `[${PLUGIN_ENTERTAINMENT}][${FUNCTION_TRANSLATE_SCREENSHOT}]`: {
        return this.makeButtonEntertainment(options?.btnData)
      }
      default:
    }
    return null
  }

  /**
   *
   * @param {{suggested: string?, use: string}?} options
   */
  async makeButtonChat (options) {
    let endCommand = '#摧毁对话'
    switch (options?.use) {
      case 'api': {
        endCommand = '#api结束对话'
        break
      }
      case 'api3': {
        endCommand = '#api3结束对话'
        break
      }
      case 'bing': {
        endCommand = '#必应结束对话'
        break
      }
      case 'claude2': {
        endCommand = '#克劳德结束对话'
        break
      }
      case 'gemini': {
        endCommand = '#双子星结束对话'
        break
      }
      case 'xh': {
        endCommand = '#星火结束对话'
        break
      }
      case 'qwen': {
        endCommand = '#通义千问结束对话'
        break
      }
      case 'chatglm4': {
        endCommand = '#智谱结束对话'
        break
      }
    }
    let rows = [
      {
        buttons: [
          createButtonBase('结束对话', '#毁灭对话'),
          createButtonBase('结束当前对话', endCommand),
          createButtonBase('at我对话', '', false)
        ]
      }
    ]
    let buttons = [[], []]
    if (Config.apiKey) {
      buttons[0].push(createButtonBase('OpenAI', '#chat1', false))
    }
    if (await redis.get('CHATGPT:TOKEN')) {
      buttons[0].push(createButtonBase('ChatGPT', '#chat3', false))
    }
    if (await redis.get('CHATGPT:BING_TOKENS')) {
      buttons[0].push(createButtonBase('Copilot', '#bing', false))
    }
    if (Config.geminiKey) {
      buttons[0].push(createButtonBase('Gemini', '#gemini', false))
    }
    if (Config.xhAPIKey) {
      buttons[buttons[0].length >= 4 ? 1 : 0].push(createButtonBase('讯飞星火', '#xh', false))
    }
    if (Config.qwenApiKey) {
      buttons[buttons[0].length >= 4 ? 1 : 0].push(createButtonBase('通义千问', '#qwen', false))
    }
    if (Config.chatglmRefreshToken) {
      buttons[buttons[0].length >= 4 ? 1 : 0].push(createButtonBase('ChatGLM4', '#glm4', false))
    }
    // 两个claude只显示一个 优先API
    if (Config.claudeApiKey) {
      buttons[buttons[0].length >= 4 ? 1 : 0].push(createButtonBase('Claude', '#claude', false))
    } else if (Config.claudeAISessionKey) {
      buttons[buttons[0].length >= 4 ? 1 : 0].push(createButtonBase('Claude.ai', '#claude.ai', false))
    }
    rows.push({
      buttons: buttons[0]
    })
    if (buttons[1].length > 0) {
      rows.push({
        buttons: buttons[1]
      })
    }
    if (options?.suggested) {
      rows.unshift({
        buttons: options.suggested.split('\n').map(s => {
          return createButtonBase(s, s)
        })
      })
    }
    return {
      appid: 1,
      rows
    }
  }

  makeButtonEnd (options) {
    return {
      appid: 1,
      rows: [
        {
          buttons: [
            createButtonBase('重新开始', '#摧毁对话'),
            createButtonBase('全部结束', '#摧毁全部对话'),
            createButtonBase('切换模式', '#chatgpt切换', false)
          ]
        }
      ]
    }
  }

  makeButtonMode (options) {
    return {
      appid: 1,
      rows: [
        {
          buttons: [
            createButtonBase('以文字回复', '#chatgpt文本模式'),
            createButtonBase('以图片回复', '#chatgpt图片模式'),
            createButtonBase('以语音回复', '#chatgpt语音模式')
          ]
        }
      ]
    }
  }

  makeButtonConfirm (options) {
    return {
      appid: 1,
      rows: [
        {
          buttons: [
            createButtonBase('开启确认', '#chatgpt开启确认'),
            createButtonBase('关闭确认', '#chatgpt关闭确认'),
            createButtonBase('暂停本群回复', '#chatgpt本群闭嘴', false)

          ]
        },
        {
          buttons: [
            createButtonBase('恢复本群回复', '#chatgpt本群张嘴', false),
            createButtonBase('开启上下文', '#打开群聊上下文'),
            createButtonBase('关闭上下文 ', '#关闭群聊上下文')

          ]
        },
        {
          buttons: [
            createButtonBase('查看指令表', '#chatgpt指令表', false),
            createButtonBase('查看帮助', '#chatgpt帮助'),
            createButtonBase('查看配置', '#chatgpt查看当前配置')

          ]
        },
        {
          buttons: [
            createButtonBase('查看配置', '#chatgpt查看当前配置'),
            createButtonBase('查看模型列表', '#chatgpt模型列表'),
            createButtonBase('版本信息', '#chatgpt版本信息')
          ]
        }
      ]
    }
  }

  makeButtonBingMode (options) {
    return {
      appid: 1,
      rows: [
        {
          buttons: [
            createButtonBase('创意模式', '#chatgpt必应切换创意'),
            createButtonBase('精准模式', '#chatgpt必应切换精准'),
            createButtonBase('使用设定', '#chatgpt使用设定', false)
          ]
        },
        {
          buttons: [
            createButtonBase('禁用搜索', '#chatgpt必应禁用搜索'),
            createButtonBase('开启搜索', '#chatgpt必应开启搜索'),
            createButtonBase('设定列表', '#chatgpt浏览设定', false)
          ]
        },
        {
          buttons: [
            createButtonBase('切换到API', '#chatgpt切换API'),
            createButtonBase('切换到Gemini', '#chatgpt切换gemini'),
            createButtonBase('切换到星火', '#chatgpt切换xh')
          ]
        }
      ]
    }
  }

  makeButtonEntertainment (options) {
    return {
      appid: 1,
      rows: [
        {
          buttons: [
            createButtonBase('今日词云', '#今日词云'),
            createButtonBase('最新词云', '#最新词云', false),
            createButtonBase('我的词云', '#我的今日词云')

          ]
        },
        {
          buttons: [
            createButtonBase('翻译', '#翻译', false),
            createButtonBase('OCR', '#ocr', false),
            createButtonBase('截图', '#url:', false)
          ]
        },
        {
          buttons: [
            createButtonBase('设置OPENAI翻译源', '#chatgpt设置翻译来源openai'),
            createButtonBase('设置gemini翻译源', '#chatgpt设置翻译来源gemini'),
            createButtonBase('设置星火翻译源', '#chatgpt设置翻译来源xh'),
            createButtonBase('设置通义千问翻译源', '#chatgpt设置翻译来源qwen')
          ]
        }
      ]
    }
  }
}

function createButtonBase (label, data, enter = true, style = 1) {
  return {
    id: '',
    render_data: {
      label,
      style,
      visited_label: label
    },
    action: {
      type: 2,
      permission: {
        type: 2
      },
      data,
      enter,
      unsupport_tips: ''
    }
  }
}
