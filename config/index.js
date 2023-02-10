const PROXY = ''
const API_KEY = ''

export const Config = {
  // 模型名称。如无特殊需求保持默认即可，会使用chatgpt-api库提供的当前可用的最适合的默认值。
  model: '',
  // 如果回答包括屏蔽词，就不返回。例如：'屏蔽词1,屏蔽词2,屏蔽词3'
  blockWords: '',
  apiKey: API_KEY,
  // 暂时不支持proxy
  proxy: PROXY,
  // 改为true后，全局默认以图片形式回复，并自动发出Continue命令补全回答
  defaultUsePicture: false,
  // 每个人发起的对话保留时长。超过这个时长没有进行对话，再进行对话将开启新的对话。单位：秒
  conversationPreserveTime: 0,
  // 触发方式 可选值：at 或 prefix 。at模式下只有at机器人才会回复。prefix模式下不需要at，但需要添加前缀#chat
  toggleMode: 'at',
  // 默认完整值：`You are ${this._assistantLabel}, a large language model trained by OpenAI. You answer as concisely as possible for each response (e.g. don’t be verbose). It is very important that you answer as concisely as possible, so please remember this. If you are generating a list, do not have too many items. Keep the number of items short. Current date: ${currentDate}\n\n
  // 此项配置会覆盖掉中间部分。保持为空将使用网友从对话中推测出的指令。
  // 你可以在这里写入你希望AI回答的风格，比如希望优先回答中文，回答长一点等
  promptPrefixOverride: '',
  // AI认为的自己的名字，当你问他你是谁是他会回答这里的名字。
  assistantLabel: 'ChatGPT'
}
