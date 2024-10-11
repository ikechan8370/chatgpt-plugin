/**
 * 示例后处理器。你可以在example下面写一个新的。默认会调用所有此key的处理器
 */
export class ChatGPTResponsePostHandler extends plugin {
  constructor () {
    super({
      name: 'chatgpt文本回复后处理器',
      priority: -100,
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

    // 返回值会被忽略
    // 以下是一个简单的例子
    // const response = await fetch('https://api.fish.audio/v1/tts', {
    //   method: 'POST',
    //   headers: {
    //     Authorization: 'Bearer  + key',
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     text: content,
    //     reference_id: '1aacaeb1b840436391b835fd5513f4c4',
    //     format: 'mp3',
    //     latency: 'normal'
    //   })
    // })
    //
    // if (!response.ok) {
    //   throw new Error(`无法从服务器获取音频数据：${response.statusText}`)
    // }
    //
    // const audio = await response.blob()
    // // to Buffer
    // const buffer = await audio.arrayBuffer()
    // e.reply(segment.record(Buffer.from(buffer)))
  }
}
