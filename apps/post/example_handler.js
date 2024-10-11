import plugin from '../../../../lib/plugins/plugin.js'

/**
 * 示例后处理器。你可以在example下面写一个新的。默认会调用所有此key的处理器
 */
export class ChatGPTResponsePostHandler extends plugin {
  constructor () {
    super({
      name: 'chatgpt文本回复后处理器',
      priority: 999999,
      namespace: 'chatgpt-plugin',
      handler: [{
        key: 'chatgpt.response.post', // key必须是chatgpt.response.post
        fn: 'postHandler'
      }]
    })
  }

  async postHandler (e, options, reject) {
    const { content, use, prompt } = options
    // 你可以在这里处理返回的文本，比如使用自定义的语音api来合成语音
    // const audio = customTTS(content)
    // e.reply(segment.audio(audio))
    // 返回值会被忽略
  }
}
