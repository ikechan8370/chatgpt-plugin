import plugin from '../../../lib/plugins/plugin.js'
import cfg from '../../../lib/config/config.js'
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
    if (cfg.bot.global_md) {
      const { content, prompt, use } = options
      let md = `> ${prompt}\n\n---\n${content}\n\n---\n*当前模式：${use}*`
      return md
    }
  }
}
