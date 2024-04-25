import plugin from '../../../lib/plugins/plugin.js'
import { Config } from '../utils/config.js'

export class ChatGPTMarkdownHandler extends plugin {
  constructor () {
    super({
      name: 'chatgptmd处理器',
      priority: -100,
      namespace: 'chatgpt-plugin',
      handler: [{
        key: 'chatgpt.markdown.convert',
        fn: 'mdHandler'
      }]
    })
  }

  async mdHandler (e, options, reject) {
    const { content, prompt, use } = options
    if (Config.enableMd) {
      let mode = transUse(use)
      return `> ${prompt}\n\n---\n${content}\n\n---\n*当前模式：${mode}*`
    } else {
      return content
    }
  }
}

function transUse (use) {
  let useMap = {
    api: Config.model,
    bing: '必应(Copilot) - ' + Config.toneStyle,
    gemini: Config.geminiModel,
    xh: '讯飞星火 ' + Config.xhmode,
    qwen: '通义千问 ' + Config.qwenModel,
    claude2: 'Claude 3 Sonnet',
    glm4: 'ChatGLM4',
    chat3: 'ChatGPT官网',
    claude: Config.claudeApiModel
  }
  return useMap[use] || use
}
